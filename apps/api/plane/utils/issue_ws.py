"""Utilities for broadcasting issue websocket events consistently across views."""

from __future__ import annotations

import json
from typing import Iterable, List

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import F, Func, OuterRef, Subquery

from plane.db.models import CycleIssue, FileAsset, Issue, IssueLink
from plane.utils.grouper import issue_queryset_grouper
from plane.utils.timezone_converter import user_timezone_converter


# Shared subset of issue fields expected by websocket consumers
ISSUE_WS_FIELDS = [
    "id",
    "name",
    "state_id",
    "state__group",
    "sort_order",
    "completed_at",
    "estimate_point",
    "priority",
    "start_date",
    "target_date",
    "sequence_id",
    "project_id",
    "parent_id",
    "cycle_id",
    "module_ids",
    "label_ids",
    "assignee_ids",
    "sub_issues_count",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
    "attachment_count",
    "link_count",
    "is_draft",
    "archived_at",
    "deleted_at",
]


def _safe_timezone(timezone_value: str | None) -> str:
    """Return a valid timezone string, defaulting to UTC when missing."""
    return timezone_value or "UTC"


def broadcast_issue_event(project_id: str, payload_type: str, payload: dict) -> None:
    """Send a websocket event to the project channel with JSON-safe payload."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        safe_payload = json.loads(json.dumps(payload, cls=DjangoJSONEncoder))
        async_to_sync(channel_layer.group_send)(
            f"project_{project_id}",
            {
                "type": "issue_update",
                "payload": {"type": payload_type, "data": safe_payload},
            },
        )
    except Exception:
        # Never break API flow due to websocket errors
        pass


def fetch_issue_ws_payloads(
    slug: str,
    project_id: str,
    issue_ids: Iterable[str],
    user_timezone: str | None,
) -> List[dict]:
    """
    Prepare issue payloads matching the websocket consumer expectation.

    Returns a list preserving the order of the queryset results. Missing IDs
    yield an empty list.
    """
    issue_ids = list({str(issue_id) for issue_id in issue_ids if issue_id})
    if not issue_ids:
        return []

    queryset = (
        Issue.issue_objects.filter(
            project_id=project_id,
            workspace__slug=slug,
            pk__in=issue_ids,
        )
        .select_related("workspace", "project", "state", "parent")
        .prefetch_related("assignees", "labels", "issue_module__module")
        .annotate(
            cycle_id=Subquery(
                CycleIssue.objects.filter(
                    issue=OuterRef("id"), deleted_at__isnull=True
                ).values("cycle_id")[:1]
            )
        )
        .annotate(
            link_count=IssueLink.objects.filter(issue=OuterRef("id"))
            .order_by()
            .annotate(count=Func(F("id"), function="Count"))
            .values("count")
        )
        .annotate(
            attachment_count=FileAsset.objects.filter(
                issue_id=OuterRef("id"),
                entity_type=FileAsset.EntityTypeContext.ISSUE_ATTACHMENT,
            )
            .order_by()
            .annotate(count=Func(F("id"), function="Count"))
            .values("count")
        )
        .annotate(
            sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("id"))
            .order_by()
            .annotate(count=Func(F("id"), function="Count"))
            .values("count")
        )
    )

    queryset = issue_queryset_grouper(queryset=queryset, group_by=None, sub_group_by=None)
    payloads = list(queryset.values(*ISSUE_WS_FIELDS))

    if not payloads:
        return []

    return user_timezone_converter(
        payloads, ["created_at", "updated_at"], _safe_timezone(user_timezone)
    )


def broadcast_issue_updates(
    slug: str,
    project_id: str,
    issue_ids: Iterable[str],
    user_timezone: str | None,
    payload_type: str = "issue.updated",
) -> None:
    """Fetch updated payloads and broadcast them to all project listeners."""
    payloads = fetch_issue_ws_payloads(slug, project_id, issue_ids, user_timezone)
    for payload in payloads:
        broadcast_issue_event(project_id, payload_type, payload)

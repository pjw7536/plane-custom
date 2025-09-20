"use client";

import { MutableRefObject, useMemo } from "react";
import { observer } from "mobx-react";
import { format } from "date-fns";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
// plane types
import { Tooltip } from "@plane/propel/tooltip";
import { IIssueDisplayProperties } from "@plane/types";
// plane ui
import { Avatar } from "@plane/ui";
// plane utils
import { cn } from "@plane/utils";
// components
import { WithDisplayPropertiesHOC } from "@/components/issues/issue-layouts/with-display-properties-HOC";
// helpers
import { queryParamGenerator } from "@/helpers/query-param-generator";
// hooks
import { usePublish } from "@/hooks/store/publish";
import { useIssueDetails } from "@/hooks/store/use-issue-details";
import { useMember } from "@/hooks/store/use-member";
//
import { IIssue } from "@/types/issue";
import { IssueProperties } from "../properties/all-properties";
import { getIssueBlockId } from "../utils";
import { BlockReactions } from "./block-reactions";

interface IssueBlockProps {
  issueId: string;
  groupId: string;
  subGroupId: string;
  displayProperties: IIssueDisplayProperties | undefined;
  scrollableContainerRef?: MutableRefObject<HTMLDivElement | null>;
}

interface IssueDetailsBlockProps {
  issue: IIssue;
  displayProperties: IIssueDisplayProperties | undefined;
}

const KanbanIssueDetailsBlock: React.FC<IssueDetailsBlockProps> = observer((props) => {
  const { issue, displayProperties } = props;
  const { anchor } = useParams();
  // hooks
  const { project_details } = usePublish(anchor.toString());
  const { getMemberById } = useMember();

  const formattedUpdatedAt = useMemo(() => {
    if (!issue.updated_at) return null;

    const parsedDate =
      typeof issue.updated_at === "string" ? new Date(issue.updated_at) : new Date(issue.updated_at.getTime());

    if (Number.isNaN(parsedDate.getTime())) return null;

    return format(parsedDate, "MM/dd hh:mm a").toUpperCase();
  }, [issue.updated_at]);

  const updatedByMember = issue.updated_by ? getMemberById(issue.updated_by) : undefined;
  const createdByMember = issue.created_by ? getMemberById(issue.created_by) : undefined;
  const lastChangeMember = updatedByMember ?? createdByMember;

  return (
    <div className="space-y-2 px-3 py-2">
      <WithDisplayPropertiesHOC displayProperties={displayProperties || {}} displayPropertyKey="key">
        <div className="relative">
          <div className="line-clamp-1 text-xs text-custom-text-300">
            {project_details?.identifier}-{issue.sequence_id}
          </div>
        </div>
      </WithDisplayPropertiesHOC>

      <div className="w-full mb-1.5">
        <Tooltip tooltipContent={issue.name}>
          <span className="block line-clamp-1 text-sm text-custom-text-100">{issue.name}</span>
        </Tooltip>
        {formattedUpdatedAt && (
          <div className="mt-1 flex w-full items-center justify-end gap-2 text-xs text-custom-text-300">
            {lastChangeMember && (
              <div className="flex-shrink-0">
                <Avatar size="md" name={lastChangeMember.member__display_name} src={lastChangeMember.member__avatar} />
              </div>
            )}
            <span>{formattedUpdatedAt}</span>
          </div>
        )}
      </div>

      <IssueProperties
        className="flex flex-wrap items-center gap-2 whitespace-nowrap text-custom-text-300 pt-1.5"
        issue={issue}
        displayProperties={displayProperties}
      />
    </div>
  );
});

export const KanbanIssueBlock: React.FC<IssueBlockProps> = observer((props) => {
  const { issueId, groupId, subGroupId, displayProperties } = props;
  const searchParams = useSearchParams();
  // query params
  const board = searchParams.get("board");
  // hooks
  const { setPeekId, getIsIssuePeeked, getIssueById } = useIssueDetails();

  const handleIssuePeekOverview = () => {
    setPeekId(issueId);
  };

  const { queryParam } = queryParamGenerator(board ? { board, peekId: issueId } : { peekId: issueId });

  const issue = getIssueById(issueId);

  if (!issue) return null;

  return (
    <div className={cn("group/kanban-block relative p-1.5")}>
      <div
        className={cn(
          "relative block rounded border-[1px] outline-[0.5px] outline-transparent w-full border-custom-border-200 bg-custom-background-100 text-sm transition-all hover:border-custom-border-400",
          { "border border-custom-primary-70 hover:border-custom-primary-70": getIsIssuePeeked(issue.id) }
        )}
      >
        <Link
          id={getIssueBlockId(issueId, groupId, subGroupId)}
          className="w-full"
          href={`?${queryParam}`}
          onClick={handleIssuePeekOverview}
        >
          <KanbanIssueDetailsBlock issue={issue} displayProperties={displayProperties} />
        </Link>
        <BlockReactions issueId={issueId} />
      </div>
    </div>
  );
});

KanbanIssueBlock.displayName = "KanbanIssueBlock";

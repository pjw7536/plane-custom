"use client";

import { useEffect, useContext } from "react";
import cloneDeep from "lodash/cloneDeep";
import ReconnectingWebSocket from "reconnecting-websocket";
import { StoreContext } from "@/lib/store-context";
import type { TIssue } from "@plane/types";

const normalizeModuleIds = (moduleIds: TIssue["module_ids"]) =>
  Array.isArray(moduleIds) ? moduleIds.filter((id): id is string => Boolean(id) && id !== "None") : [];

const normalizeCycleId = (cycleId: TIssue["cycle_id"] | string | undefined | null) =>
  typeof cycleId === "string" && cycleId !== "None" ? cycleId : undefined;

type IssueEventData = Partial<TIssue> & { id?: string; project_id?: string };

const isCompleteIssuePayload = (payload: IssueEventData): payload is TIssue =>
  Boolean(payload && payload.id && payload.project_id);

export const useIssueChannel = (projectId?: string) => {
  const root = useContext(StoreContext);

  useEffect(() => {
    if (!projectId || !root) return;

    // Determine WS origin
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let baseWsOrigin = `${wsProtocol}//${window.location.host}`;
    const envWs = process.env.NEXT_PUBLIC_API_WS_ORIGIN;
    const envHttp = process.env.NEXT_PUBLIC_API_ORIGIN || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (envWs && envWs.length > 0) {
      baseWsOrigin = envWs;
    } else if (envHttp && envHttp.length > 0) {
      // Derive ws origin from http origin
      baseWsOrigin = envHttp.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
    }
    const wsUrl = `${baseWsOrigin.replace(/\/$/, "")}/ws/projects/${projectId}/`;

    const socket = new ReconnectingWebSocket(wsUrl);

    socket.onopen = () => {
      // eslint-disable-next-line no-console
      console.log(`WebSocket connected for project: ${projectId}`);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type: string; data: IssueEventData };
        const { type, data } = payload;
        const issue = data;
        const workspaceSlug = root.router.workspaceSlug ?? undefined;

        switch (type) {
          case "issue.created": {
            // Add to main map and update grouped lists for current project contexts
            if (!isCompleteIssuePayload(issue)) break;

            if (issue.id) {
              root.issue.projectIssues.addIssue(issue, true);
              root.issue.projectViewIssues.addIssue(issue, true);
              const activeModuleId = root.issue.moduleId ?? undefined;
              const activeCycleId = normalizeCycleId(root.issue.cycleId);
              const activeWorkspaceViewId = root.issue.globalViewId ?? undefined;

              if (activeModuleId && normalizeModuleIds(issue.module_ids).includes(activeModuleId)) {
                root.issue.moduleIssues.addIssueToList(issue.id);
              }

              if (activeCycleId && normalizeCycleId(issue.cycle_id) === activeCycleId) {
                root.issue.cycleIssues.addIssue(issue, true);
              }

              if (activeWorkspaceViewId) {
                root.issue.workspaceIssues.addIssue(issue, true);
              }
            }
            break;
          }
          case "issue.updated": {
            // Important: update via projectIssues to also update grouped lists and counts
            // Do NOT update the main map first, as that loses previous state needed for re-grouping
            if (isCompleteIssuePayload(issue) && workspaceSlug) {
              const existingIssue = root.issue.issues.getIssueById(issue.id);
              const issueSnapshot = existingIssue ? cloneDeep(existingIssue) : undefined;

              const activeModuleId = root.issue.moduleId ?? undefined;
              const activeCycleId = normalizeCycleId(root.issue.cycleId);
              const activeViewId = root.issue.viewId ?? undefined;
              const activeWorkspaceViewId = root.issue.globalViewId ?? undefined;

              if (!issueSnapshot) {
                root.issue.issues.addIssue([issue]);

                root.issue.projectIssues.fetchIssuesWithExistingPagination(
                  workspaceSlug,
                  issue.project_id,
                  "mutation"
                );

                if (activeViewId) {
                  root.issue.projectViewIssues.fetchIssuesWithExistingPagination(
                    workspaceSlug,
                    issue.project_id,
                    activeViewId,
                    "mutation"
                  );
                }

                if (activeCycleId) {
                  root.issue.cycleIssues.fetchIssuesWithExistingPagination(
                    workspaceSlug,
                    issue.project_id,
                    "mutation",
                    activeCycleId
                  );
                }

                if (activeWorkspaceViewId) {
                  root.issue.workspaceIssues.fetchIssuesWithExistingPagination(
                    workspaceSlug,
                    activeWorkspaceViewId,
                    "mutation"
                  );
                }

                if (activeModuleId) {
                  const moduleIds = normalizeModuleIds(issue.module_ids);
                  if (moduleIds.includes(activeModuleId)) {
                    root.issue.moduleIssues.fetchIssuesWithExistingPagination(
                      workspaceSlug,
                      issue.project_id,
                      "mutation",
                      activeModuleId
                    );
                  }
                }
                break;
              }

              root.issue.issues.updateIssue(issue.id, issue);

              const updatedIssue = root.issue.issues.getIssueById(issue.id);

              if (updatedIssue) {
                root.issue.projectIssues.updateIssueList(updatedIssue, issueSnapshot);
                root.issue.projectViewIssues.updateIssueList(updatedIssue, issueSnapshot);
                if (activeWorkspaceViewId) {
                  root.issue.workspaceIssues.updateIssueList(updatedIssue, issueSnapshot);
                }

                if (activeCycleId) {
                  const beforeCycleId = normalizeCycleId(issueSnapshot.cycle_id);
                  const afterCycleId = normalizeCycleId(updatedIssue.cycle_id);
                  const wasInCycle = beforeCycleId === activeCycleId;
                  const isInCycle = afterCycleId === activeCycleId;

                  if (!wasInCycle && isInCycle) {
                    root.issue.cycleIssues.addIssueToList(updatedIssue.id);
                  } else if (wasInCycle && !isInCycle) {
                    root.issue.cycleIssues.removeIssueFromList(updatedIssue.id);
                  }

                  if (wasInCycle || isInCycle) {
                    root.issue.cycleIssues.updateIssueList(updatedIssue, issueSnapshot);
                  }
                }

                if (activeModuleId) {
                  const beforeModuleIds = normalizeModuleIds(issueSnapshot.module_ids);
                  const afterModuleIds = normalizeModuleIds(updatedIssue.module_ids);
                  const hadModule = beforeModuleIds.includes(activeModuleId);
                  const hasModule = afterModuleIds.includes(activeModuleId);

                  if (!hadModule && hasModule) {
                    root.issue.moduleIssues.addIssueToList(updatedIssue.id);
                  } else if (hadModule && !hasModule) {
                    root.issue.moduleIssues.removeIssueFromList(updatedIssue.id);
                  }

                  if (hadModule || hasModule) {
                    root.issue.moduleIssues.updateIssueList(updatedIssue, issueSnapshot);
                  }
                }
              }
            }
            break;
          }
          case "issue.deleted": {
            if (issue?.id) {
              // issue.deleted payload only guarantees the id, so rely on cached lists to purge entries
              // Remove from grouped lists first, then from main map
              root.issue.projectIssues.removeIssueFromList(issue.id);
              root.issue.projectViewIssues.removeIssueFromList(issue.id);
              const activeCycleId = normalizeCycleId(root.issue.cycleId);
              const activeWorkspaceViewId = root.issue.globalViewId ?? undefined;
              const activeModuleId = root.issue.moduleId ?? undefined;

              if (activeModuleId) {
                root.issue.moduleIssues.removeIssueFromList(issue.id);
              }

              if (activeCycleId) {
                root.issue.cycleIssues.removeIssueFromList(issue.id);
              }

              if (activeWorkspaceViewId) {
                root.issue.workspaceIssues.removeIssueFromList(issue.id);
              }

              root.issue.issues.removeIssue(issue.id);
            }
            break;
          }
          default:
            break;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    socket.onclose = () => {
      // eslint-disable-next-line no-console
      console.log(`WebSocket disconnected for project: ${projectId}`);
    };

    return () => {
      socket.close();
    };
  }, [projectId, root]);
};

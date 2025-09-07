"use client";

import { useEffect, useContext } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import { StoreContext } from "@/lib/store-context";
import type { TIssue } from "@plane/types";

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
        const payload = JSON.parse(event.data);
        const { type, data } = payload as { type: string; data: TIssue };
        const issue = data as TIssue;
        const workspaceSlug = root.router.workspaceSlug ?? undefined;

        switch (type) {
          case "issue.created": {
            // Add to main map and update grouped lists for current project contexts
            if (issue?.id) {
              root.issue.projectIssues.addIssue(issue, true);
              root.issue.projectViewIssues.addIssue(issue, true);
            }
            break;
          }
          case "issue.updated": {
            // Important: update via projectIssues to also update grouped lists and counts
            // Do NOT update the main map first, as that loses previous state needed for re-grouping
            if (issue?.id && issue?.project_id && workspaceSlug) {
              root.issue.projectIssues.updateIssue(workspaceSlug, issue.project_id, issue.id, issue, false);
              root.issue.projectViewIssues.updateIssue(workspaceSlug, issue.project_id, issue.id, issue, false);
            }
            break;
          }
          case "issue.deleted": {
            if (issue?.id) {
              // Remove from grouped lists first, then from main map
              root.issue.projectIssues.removeIssueFromList(issue.id);
              root.issue.projectViewIssues.removeIssueFromList(issue.id);
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

"use client";

import { ReactNode } from "react";
import { useParams } from "next/navigation";
// plane web layouts
import { ProjectAuthWrapper } from "@/plane-web/layouts/project-wrapper";
import { useIssueChannel } from "@/hooks/use-issue-channel";

const ProjectDetailLayout = ({ children }: { children: ReactNode }) => {
  // router
  const { workspaceSlug, projectId } = useParams();
  // connect websocket for live issue updates
  useIssueChannel(projectId?.toString());
  return (
    <ProjectAuthWrapper workspaceSlug={workspaceSlug?.toString()} projectId={projectId?.toString()}>
      {children}
    </ProjectAuthWrapper>
  );
};

export default ProjectDetailLayout;

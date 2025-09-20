"use client";

import { FC, ReactNode } from "react";
import { Network } from "lucide-react";
// plane imports
import { Tooltip } from "@plane/propel/tooltip";
import { Avatar } from "@plane/ui";
import { calculateTimeAgo, getFileURL, renderFormattedDate, renderFormattedTime } from "@plane/utils";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { usePlatformOS } from "@/hooks/use-platform-os";
// plane web imports
import { IssueCreatorDisplay } from "@/plane-web/components/issues/issue-details/issue-creator";
// local imports
import { IssueUser } from "../";

type TIssueActivityBlockComponent = {
  icon?: ReactNode;
  activityId: string;
  ends: "top" | "bottom" | undefined;
  children: ReactNode;
  customUserName?: string;
};

export const IssueActivityBlockComponent: FC<TIssueActivityBlockComponent> = (props) => {
  const { icon, activityId, ends, children, customUserName } = props;
  // hooks
  const {
    activity: { getActivityById },
  } = useIssueDetail();

  const activity = getActivityById(activityId);
  const { isMobile } = usePlatformOS();
  if (!activity) return <></>;

  const actorDisplayName = customUserName ?? activity.actor_detail?.display_name ?? "Plane";
  const actorAvatarSrc = activity.actor_detail?.avatar_url ? getFileURL(activity.actor_detail.avatar_url) : undefined;
  const isCreatorActivity = !activity?.field && activity?.verb === "created";

  return (
    <div
      className={`relative flex items-center gap-3 text-xs ${
        ends === "top" ? `pb-2` : ends === "bottom" ? `pt-2` : `py-2`
      }`}
    >
      <div className="absolute left-[13px] top-0 bottom-0 w-0.5 bg-custom-background-80" aria-hidden />
      <div className="flex-shrink-0 ring-6 w-7 h-7 rounded-full overflow-hidden flex justify-center items-center z-[4] bg-custom-background-80 text-custom-text-200">
        {icon ? icon : <Network className="w-3.5 h-3.5" />}
      </div>
      <div className="w-full truncate text-custom-text-200">
        <div className="flex items-start gap-2">
          <Avatar
            size="sm"
            name={actorDisplayName}
            src={actorAvatarSrc}
            showTooltip={false}
            className="flex-shrink-0"
          />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {isCreatorActivity ? (
              <IssueCreatorDisplay activityId={activityId} customUserName={customUserName} />
            ) : (
              <IssueUser activityId={activityId} customUserName={customUserName} />
            )}
            <span>{children}</span>
            <span>
              <Tooltip
                isMobile={isMobile}
                tooltipContent={`${renderFormattedDate(activity.created_at)}, ${renderFormattedTime(activity.created_at)}`}
              >
                <span className="ml-1 whitespace-nowrap text-custom-text-350">{calculateTimeAgo(activity.created_at)}</span>
              </Tooltip>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

"use client";
import { FC } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { observer } from "mobx-react";
import { EUserPermissionsLevel, IWorkspaceSidebarNavigationItem } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { SidebarNavItem } from "@/components/sidebar/sidebar-navigation";
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { useUserPermissions } from "@/hooks/store/user";
import { FileIcon } from "lucide-react";
import { joinUrlPath } from "@plane/utils";

type Props = {
  item: IWorkspaceSidebarNavigationItem;
};

// Renders a sidebar item that links to an absolute path (no workspaceSlug prefix)
export const GlobalSidebarItem: FC<Props> = observer(({ item }) => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { workspaceSlug } = useParams();
  const { allowPermissions } = useUserPermissions();
  const { toggleSidebar, isExtendedSidebarOpened, toggleExtendedSidebar } = useAppTheme();

  const slug = workspaceSlug?.toString() || "";
  if (!allowPermissions(item.access, EUserPermissionsLevel.WORKSPACE, slug)) return null;

  const href = joinUrlPath(slug, item.href); // workspace-prefixed path
  const isActive = item.highlight(pathname, href);

  const handleLinkClick = () => {
    if (window.innerWidth < 768) toggleSidebar();
    if (isExtendedSidebarOpened) toggleExtendedSidebar(false);
  };

  return (
    <Link href={href} onClick={handleLinkClick}>
      <SidebarNavItem isActive={isActive}>
        <div className="flex items-center gap-1.5 py-[1px]">
          <FileIcon className="size-4 flex-shrink-0" />
          <p className="text-sm leading-5 font-medium">{t(item.labelTranslationKey)}</p>
        </div>
      </SidebarNavItem>
    </Link>
  );
});

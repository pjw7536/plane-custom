"use client";
import React, { useEffect } from "react";
// layouts
import DefaultLayout from "@/layouts/default-layout";
// auth + workspace hooks
import { useUser, useUserProfile, useUserSettings } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
// shared app root
import { NewAppRoot } from "@/apps/newapp/root";

const NewAppPublicEntry = () => {
  const router = useAppRouter();
  const { data: currentUser } = useUser();
  const { data: currentUserProfile } = useUserProfile();
  const { data: currentUserSettings, fetchCurrentUserSettings } = useUserSettings();

  // Prefer last workspace slug; fallback to fallback slug
  const preferredWorkspaceSlug =
    currentUserSettings?.workspace?.last_workspace_slug || currentUserSettings?.workspace?.fallback_workspace_slug;

  // Ensure user settings are loaded once user is known
  useEffect(() => {
    if (currentUser?.id && !preferredWorkspaceSlug) fetchCurrentUserSettings().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // If logged-in and onboarded, redirect to workspace-scoped Apps route to keep sidebar
  useEffect(() => {
    const isUserOnboard =
      currentUserProfile?.is_onboarded ||
      Boolean(
        currentUserProfile?.onboarding_step?.profile_complete &&
          currentUserProfile?.onboarding_step?.workspace_create &&
          currentUserProfile?.onboarding_step?.workspace_invite &&
          currentUserProfile?.onboarding_step?.workspace_join
      );

    if (currentUser?.id && isUserOnboard && preferredWorkspaceSlug) {
      router.replace(`/${preferredWorkspaceSlug}/apps/newapp/`);
    }
  }, [router, currentUser?.id, currentUserProfile, preferredWorkspaceSlug]);

  return (
    <DefaultLayout>
      <div className="flex h-full w-full items-center justify-center">
        <NewAppRoot />
      </div>
    </DefaultLayout>
  );
};

export default NewAppPublicEntry;

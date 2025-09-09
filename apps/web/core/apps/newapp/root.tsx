"use client";
import React from "react";

export const NewAppRoot: React.FC = () => {
  return (
    <div className="max-w-xl w-full p-6 rounded-lg border border-custom-border-200 bg-custom-background-100 text-custom-text-200">
      <h1 className="text-2xl font-semibold mb-2">New App</h1>
      <p className="text-sm text-custom-text-300 mb-4">
        This is a shared app UI component used by both public and workspace-scoped routes.
      </p>
      <ul className="list-disc list-inside text-sm text-custom-text-300 space-y-1">
        <li>No workspace or project coupling in this component.</li>
        <li>Use it from /apps/newapp and /:workspaceSlug/apps/newapp.</li>
        <li>You can freely expand this into a complex app (routes, state, etc.).</li>
      </ul>
    </div>
  );
};


"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { SavedItemsManagerProps } from "@/components/settings/saved-items-manager";

// We need to import the types, but we'll dynamic import the component
// Note: SavedItemsManager is a named export, so we use .then(m => m.SavedItemsManager)

const SavedItemsManager = dynamic(
  () => import("@/components/settings/saved-items-manager").then((m) => m.SavedItemsManager),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false,
  }
);

export function SavedItemsManagerWrapper(props: SavedItemsManagerProps) {
  return <SavedItemsManager {...props} />;
}

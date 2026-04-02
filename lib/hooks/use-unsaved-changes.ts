"use client";

import { useEffect, useRef } from "react";

/**
 * Warns the user before leaving the page when there are unsaved changes.
 *
 * Usage:
 *   const markDirty = useUnsavedChanges(isDirty);
 *
 * Pass `isDirty` as a boolean that is true whenever there are pending
 * changes. The hook attaches a beforeunload listener that prompts the
 * user if they try to close the tab or navigate away.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      // Modern browsers ignore the custom message but require returnValue to be set
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
}

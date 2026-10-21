"use client";

/**
 * Blob → object-URL lifecycle hook. Creates one URL per blob and revokes
 * the previous batch whenever the blobs change or the component unmounts.
 * Prevents leaks when previews are regenerated repeatedly.
 */

import { useEffect, useMemo } from "react";

export function useObjectUrls(blobs: Blob[]): string[] {
  // Create URLs synchronously from the blobs; revoke in an effect cleanup.
  const urls = useMemo(
    () => blobs.map((b) => URL.createObjectURL(b)),
    // Recreate only when blob identities change.
     
    [blobs],
  );
  useEffect(() => {
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [urls]);
  return urls;
}

"use client";

import { WifiOff, Wifi } from "lucide-react";
import { useOffline } from "next/offline";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function OfflineIndicator() {
  const offline = useOffline();
  const toastId = useRef<string | number | undefined>(undefined);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (offline) {
      toastId.current = toast.error("You're offline — reconnecting…", {
        duration: Infinity,
        icon: <WifiOff className="size-4" />,
      });
    } else if (toastId.current !== undefined) {
      toast.dismiss(toastId.current);
      toastId.current = undefined;
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [offline]);

  if (!offline && !showReconnected) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur"
      role="status"
      aria-live="polite"
    >
      {offline ? (
        <span className="flex items-center gap-1.5 text-destructive">
          <WifiOff className="size-3.5" />
          Offline
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-success">
          <Wifi className="size-3.5" />
          Back online
        </span>
      )}
    </div>
  );
}

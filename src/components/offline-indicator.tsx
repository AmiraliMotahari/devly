"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useOffline } from "next/offline";
import { useEffect, useRef, useState } from "react";

export function OfflineIndicator() {
  const offline = useOffline();
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (offline) {
      wasOffline.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowReconnected(false);
    } else if (wasOffline.current) {
      wasOffline.current = false;
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

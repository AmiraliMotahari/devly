"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "devly:install-dismissed";
const INSTALLED_KEY = "devly:installed";

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ((navigator as { standalone?: boolean }).standalone === true) return true;
  return false;
}

export function InstallPrompt() {
  const [isInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem(INSTALLED_KEY) === "1" || isStandaloneMode()
    );
  });
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(DISMISSED_KEY) === "1";
  });
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS] = useState(() => {
    if (typeof window === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
  });

  useEffect(() => {
    if (isInstalled) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "1");
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isInstalled]);

  if (isInstalled || isStandaloneMode()) return null;
  if (dismissed) return null;

  if (isIOS) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
        <span>
          Tap{" "}
          <span aria-label="share icon" role="img">
            ⎋
          </span>{" "}
          then &quot;Add to Home Screen&quot;{" "}
          <span aria-label="plus icon" role="img">
            ➕
          </span>{" "}
          to install Devly.
        </span>
        <button
          type="button"
          aria-label="Dismiss"
          className="ml-1 rounded p-0.5 hover:bg-accent"
          onClick={() => {
            localStorage.setItem(DISMISSED_KEY, "1");
            setDismissed(true);
          }}
        >
          <X className="size-3" />
        </button>
      </div>
    );
  }

  if (!deferred) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          await deferred.prompt();
          const { outcome } = await deferred.userChoice;
          if (outcome === "accepted") {
            localStorage.setItem(INSTALLED_KEY, "1");
            setDeferred(null);
          } else {
            localStorage.setItem(DISMISSED_KEY, "1");
            setDismissed(true);
          }
        }}
      >
        <Download data-icon="inline-start" className="size-3.5" />
        Install Devly
      </Button>
      <button
        type="button"
        aria-label="Dismiss"
        className="rounded p-0.5 text-muted-foreground hover:bg-accent"
        onClick={() => {
          localStorage.setItem(DISMISSED_KEY, "1");
          setDismissed(true);
        }}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

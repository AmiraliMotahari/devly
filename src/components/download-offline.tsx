"use client";

import { useState } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DownloadOffline() {
  const [status, setStatus] = useState<"idle" | "downloading" | "done">(() => {
    if (typeof window === "undefined") return "idle";
    return localStorage.getItem("devly:offline-downloaded") === "1" ? "done" : "idle";
  });
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
      toast.error("Offline download requires a production build (pnpm build && pnpm start).");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    setStatus("downloading");
    setProgress(0);

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "precache-progress") {
        setProgress(event.data.percent ?? 0);
      }
      if (event.data?.type === "precache-done") {
        setStatus("done");
        setProgress(100);
        localStorage.setItem("devly:offline-downloaded", "1");
        navigator.serviceWorker.removeEventListener("message", onMessage);
        toast.success("Devly is ready for offline use.");
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    // Fetch the precache manifest and send URLs to the SW.
    try {
      const res = await fetch("/precache-manifest.json");
      if (!res.ok) throw new Error("Manifest not found");
      const manifest = (await res.json()) as { urls: string[] };
      reg.active?.postMessage({ type: "cache-urls", urls: manifest.urls });
    } catch {
      // Fallback: precache just the shell + current page.
      reg.active?.postMessage({
        type: "cache-urls",
        urls: [location.href, "/", "/manifest.webmanifest", "/offline"],
      });
    }
  };

  if (status === "done") {
    return (
      <Button size="sm" variant="ghost" disabled title="Available offline">
        <Check data-icon="inline-start" className="size-3.5" />
        Offline ready
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleDownload}
      disabled={status === "downloading"}
      title="Download for offline use"
    >
      {status === "downloading" ? (
        <>
          <Loader2 data-icon="inline-start" className="size-3.5 animate-spin" />
          {progress}%
        </>
      ) : (
        <>
          <Download data-icon="inline-start" className="size-3.5" />
          <span className="hidden sm:inline">Offline</span>
        </>
      )}
    </Button>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WifiOff, RefreshCw } from "lucide-react";
import { appName } from "@/lib/constants";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <WifiOff className="size-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">You&apos;re offline</h1>
          <p className="text-sm text-muted-foreground">
            {appName} needs a connection to load this page. Your previously
            visited tools are still available offline.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            <RefreshCw data-icon="inline-start" className="size-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

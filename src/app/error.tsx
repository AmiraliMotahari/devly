"use client";

import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 py-12 text-center md:gap-8 md:px-8 md:py-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="w-fit rounded-full bg-destructive/10 p-4 mx-auto">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <CardTitle>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Something went wrong!
            </h1>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            We apologize for the inconvenience. Our team has been notified and
            is working to fix the issue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {process.env.NODE_ENV === "development" ? (
              <div className="mx-auto max-w-200 overflow-auto rounded-lg bg-muted p-4 text-left">
                <pre className="text-sm">{error.message}</pre>
              </div>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button onClick={() => reset()} className="flex-1">
            <RefreshCcw className="mr-2 size-4" />
            Try Again
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href={"/"}>
              <Home className="mr-2 size-4" />
              Return Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

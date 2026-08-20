"use client";

import Link from "next/link";
import { ArrowLeft, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 py-12 text-center md:gap-8 md:px-8 md:py-24">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold text-foreground">
            <h1 className="text-6xl font-bold tracking-tighter text-primary">
              404
            </h1>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Page Not Found
            </h2>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist. It might have
            been moved, deleted, or you entered the wrong URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
          <div className="flex gap-3">
            <Button
              asChild
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Link href="/">
                <Home className="h-4 w-4" />
                Return Home
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 bg-transparent"
            >
              <Link href="/help">
                <Search className="h-4 w-4" />
                Help
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

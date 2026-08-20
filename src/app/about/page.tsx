import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appName } from "@/lib/constants";
import { toolDefinitions } from "@/tools";
import { ArrowRight, Heart, ShieldCheck, Sparkles, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: `Learn about ${appName} — your everyday file and web toolkit. Fast, private, and free.`,
};

export default function AboutPage() {
  const values = [
    {
      icon: ShieldCheck,
      title: "Privacy first",
      description:
        "Most tools run entirely in your browser. Your files never leave your device, and we never store them on a server.",
    },
    {
      icon: Zap,
      title: "Instant and free",
      description:
        "No sign-up, no waiting, no paywalls. Every tool is free to use and processes your files instantly.",
    },
    {
      icon: Sparkles,
      title: "Always growing",
      description: `We currently offer ${toolDefinitions.filter((t) => t.available).length} tools and are constantly adding more based on what you need.`,
    },
  ];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">About {appName}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          {appName} brings together the file, media, developer, and text
          utilities you use every day into one clean, fast, and private place.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {values.map((v) => (
          <Card key={v.title}>
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {v.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-border bg-muted/30 p-8">
        <h2 className="text-xl font-semibold">How it works</h2>
        <p className="mt-3 text-muted-foreground">
          Most of our tools run entirely client-side in your browser using
          modern web technologies like WebAssembly, Canvas, and the File API.
          This means your files are processed locally and never uploaded to a
          server. For tools that require server-side processing, we clearly
          indicate this so you always know where your data goes.
        </p>
      </div>

      <div className="mt-12 text-center">
        <p className="mb-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          Built with <Heart className="h-4 w-4 text-red-500" /> for a faster,
          more private web.
        </p>
        <Button asChild>
          <Link href="/">
            Explore all tools <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

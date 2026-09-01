import { Card, CardContent } from "@/components/ui/card";
import { appName } from "@/lib/constants";
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${appName} handles your data. Short version: we do not collect, store, or track anything.`,
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <div className="mb-8">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-center">
          Privacy Policy
        </h1>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">The short version</h2>
            <p className="mt-2 text-muted-foreground">
              {appName} does not collect, store, or track your data. Most tools
              run entirely in your browser, meaning your files never leave your
              device. We do not use cookies for tracking, and we do not have
              user accounts.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">File processing</h2>
            <p className="mt-2 text-muted-foreground">
              When you use a tool marked as &ldquo;Local processing,&rdquo; your
              files are processed directly in your browser using JavaScript and
              WebAssembly. They are never uploaded to any server. Files exist
              only in your browser&apos;s memory and are discarded the moment
              you close the page or click &ldquo;Process another.&rdquo;
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Analytics</h2>
            <p className="mt-2 text-muted-foreground">
              {appName} does not use any third-party analytics, advertising, or
              tracking scripts. We do not collect IP addresses, browser
              fingerprints, or usage statistics.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Cookies</h2>
            <p className="mt-2 text-muted-foreground">
              The only cookie we use is to remember your light/dark theme
              preference. No tracking cookies, no advertising cookies, no
              third-party cookies.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Contact</h2>
            <p className="mt-2 text-muted-foreground">
              If you have any questions about this privacy policy, feel free to
              reach out. This page may be updated from time to time, but our
              core commitment to your privacy will never change.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

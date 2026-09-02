import { Card, CardContent } from "@/components/ui/card";
import { appName } from "@/lib/constants";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy information for ${appName}. This application is a development project and should not be relied upon as a definitive statement of privacy practices.`,
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-12">
      <div className="mb-8">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-8" />
        </div>

        <h1 className="text-center text-4xl font-bold tracking-tight">
          Privacy Policy
        </h1>
      </div>

      <div className="flex flex-col gap-6">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />

              <div>
                <h2 className="text-lg font-semibold">
                  Development project disclaimer
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {appName} is a personal development project provided for
                  testing, experimentation, and demonstration purposes. It is
                  not a commercial service or a substitute for professional
                  legal, security, privacy, or compliance advice. Information on
                  this page describes the application&apos;s intended behavior
                  and may change as the project develops. You should not rely on
                  this website or this policy as a guarantee of security,
                  privacy, availability, or data handling.
                </p>

                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Do not use the application to process sensitive, confidential,
                  regulated, or mission-critical information. Use it at your own
                  discretion and risk.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">The short version</h2>

            <p className="mt-2 text-muted-foreground">
              {appName} does not intentionally collect, store, or track your
              data. Most tools run entirely in your browser, meaning your files
              are intended to remain on your device. We do not use cookies for
              tracking, and we do not require user accounts.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">File processing</h2>

            <p className="mt-2 text-muted-foreground">
              When you use a tool marked as &ldquo;Local processing,&rdquo; your
              files are processed directly in your browser using JavaScript and
              WebAssembly. They are intended not to be uploaded to any server.
              Files exist only in your browser&apos;s memory and are normally
              discarded when you close the page or select &ldquo;Process
              another.&rdquo;
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Analytics</h2>

            <p className="mt-2 text-muted-foreground">
              {appName} does not intentionally use third-party analytics,
              advertising, or tracking scripts. We do not intentionally collect
              IP addresses, browser fingerprints, or usage statistics for
              analytics purposes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Cookies</h2>

            <p className="mt-2 text-muted-foreground">
              The application may use a cookie or similar browser storage
              mechanism to remember your light/dark theme preference. We do not
              intentionally use tracking or advertising cookies.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Contact</h2>

            <p className="mt-2 text-muted-foreground">
              If you have questions about this page or how the application
              currently operates, you may reach out using the available contact
              information. Because {appName} is an active development project,
              this page may be revised as the application changes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

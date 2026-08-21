import { ThemeProvider } from "@/components/providers/theme.provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { appName, siteUrl } from "@/lib/constants";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { OfflineIndicator } from "@/components/offline-indicator";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: `${appName} — Your everyday file & web toolkit`,
    template: `%s | ${appName}`,
  },
  description:
    "A single place for file, media, developer, data, text, PDF and general-purpose utilities. Fast, private, and free. Most tools run entirely in your browser.",
  keywords: [
    "file converter",
    "image converter",
    "pdf tools",
    "json formatter",
    "base64",
    "qr code",
    "unit converter",
    "web utilities",
  ],
  authors: [{ name: appName }],
  openGraph: {
    type: "website",
    title: `${appName} — Your everyday file & web toolkit`,
    description:
      "A single place for file, media, developer, data, text, PDF and general-purpose utilities. Fast, private, and free.",
    siteName: appName,
  },
  twitter: {
    card: "summary_large_image",
    title: `${appName} — Your everyday file & web toolkit`,
    description:
      "A single place for file, media, developer, data, text, PDF and general-purpose utilities. Fast, private, and free.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Suspense>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <OfflineIndicator />
            <TooltipProvider>
              <div className="flex min-h-screen flex-col">
                <Suspense>
                  <SiteHeader />
                </Suspense>
                <main className="flex-1">{children}</main>
                <Suspense>
                  <SiteFooter />
                </Suspense>
              </div>
              <Toaster richColors />
            </TooltipProvider>
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  );
}

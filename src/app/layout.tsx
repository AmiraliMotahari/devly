import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme.provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { appName, siteUrl } from "@/lib/constants";

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
    description: `A single place for file, media, developer, data, text, PDF and general-purpose utilities. Fast, private, and free.",
    siteName: "${appName}`,
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <Toaster richColors />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

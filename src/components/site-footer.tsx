import Link from "next/link";
import { Sparkles, ShieldCheck, Zap, Heart } from "lucide-react";
import { TOOL_CATEGORIES, CATEGORY_META } from "@/tools";
import { appName } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg">{appName}</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Your everyday file &amp; web toolkit. Fast, private, and free.
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Files processed locally
              </span>
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                No sign-up required
              </span>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="mb-3 text-sm font-semibold">Categories</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TOOL_CATEGORIES.map((cat) => (
                <Link
                  key={cat}
                  href={`/category/${cat}`}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {CATEGORY_META[cat].label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">About</h3>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/about"
                  className="transition-colors hover:text-foreground"
                >
                  About {appName}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="transition-colors hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-1.5">
            Built with <Heart className="h-3.5 w-3.5 text-red-500" /> for a
            faster, more private web.
          </p>
        </div>
      </div>
    </footer>
  );
}

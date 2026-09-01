"use client";

import { CommandPalette } from "@/components/command-palette";
import { ModeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger
} from "@/components/ui/sheet";
import { useIsApple } from "@/hooks/use-isApple";
import { useIsMobile } from "@/hooks/use-mobile";
import { appName } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Menu, SearchIcon, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import GitHubIcon from "./github.icon";
import Logo from "./logo";
import { githubProfileUrl } from "@/lib/constants";
import { Kbd, KbdGroup } from "./ui/kbd";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/category/images", label: "Images" },
  { href: "/category/pdf", label: "PDF" },
  { href: "/category/files", label: "Files" },
  { href: "/category/developer", label: "Developer" },
  { href: "/category/text", label: "Text" },
  { href: "/category/web", label: "Web" },
  { href: "/category/converters", label: "Converters" },
];

const MobileNav = () => {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isMobile) setOpen(false);

    return () => setOpen(false);
  }, [isMobile]);

  if (!isMobile) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size={"icon"}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </SheetTrigger>
      <SheetContent className="pt-14 px-3">
        <nav className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <SheetClose key={link.href} asChild>
              <Link
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  pathname === link.href && "bg-accent text-foreground",
                )}
              >
                {link.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export function SiteHeader() {
  const isApple = useIsApple();
  const pathname = usePathname();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Logo />
              <span className="text-lg tracking-tight">{appName}</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    pathname === link.href && "text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="hidden h-9 w-64 justify-start gap-2 text-muted-foreground sm:flex"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <SearchIcon className="size-4" />
              <span className="flex-1 text-left text-sm font-normal">
                Search...
              </span>
              <KbdGroup>
                {isApple ? <Kbd>⌘</Kbd> : <Kbd>Ctrl</Kbd>}
                <Kbd>K</Kbd>
              </KbdGroup>
            </Button>
            <ModeToggle />
            {githubProfileUrl && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="hidden sm:flex"
              >
                <Link href={githubProfileUrl} aria-label="GitHub">
                  <GitHubIcon />
                </Link>
              </Button>
            )}
            <MobileNav />
          </div>
        </div>
      </header>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </>
  );
}

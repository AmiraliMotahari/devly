"use client";

import { CommandPalette } from "@/components/command-palette";
import { ModeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { appName } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Menu, SearchIcon, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import GitHubIcon from "./github.icon";
import Logo from "./logo";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText
} from "./ui/input-group";
import { Kbd } from "./ui/kbd";

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

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

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
            <InputGroup
              onClick={() => {
                const event = new KeyboardEvent("keydown", {
                  key: "k",
                  metaKey: true,
                  bubbles: true,
                });
                document.dispatchEvent(event);
              }}
            >
              <InputGroupText className="min-w-25">Search...</InputGroupText>
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </InputGroupAddon>
            </InputGroup>
            <ModeToggle />
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="hidden sm:flex"
            >
              <Link href="https://github.com" aria-label="GitHub">
                <GitHubIcon />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Menu"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    pathname === link.href && "bg-accent text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
      <CommandPalette />
    </>
  );
}

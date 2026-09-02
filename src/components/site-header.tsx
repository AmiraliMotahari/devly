"use client";

import { CommandPalette } from "@/components/command-palette";
import { ModeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CATEGORY_META } from "@/tools/categories";
import { useIsApple } from "@/hooks/use-isApple";
import { useIsMobile } from "@/hooks/use-mobile";
import { appName, githubProfileUrl } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ChevronDown, Menu, SearchIcon, Wrench, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import GitHubIconSvg from "./github.icon";
import Logo from "./logo";
import { Kbd, KbdGroup } from "./ui/kbd";

const CATEGORY_LINKS = (
  Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[]
).map((cat) => ({ href: `/category/${cat}`, label: CATEGORY_META[cat].label }));

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

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
        <Button variant="outline" size="icon" aria-label="Open menu">
          {open ? <X /> : <Menu />}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 pt-14">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <nav className="flex flex-col gap-1 px-2" aria-label="Main">
          <SheetClose asChild>
            <Link
              href="/"
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground",
                isActive(pathname, "/") && "bg-accent text-foreground",
              )}
            >
              Home
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link
              href="/tools"
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground",
                isActive(pathname, "/tools") && "bg-accent text-foreground",
              )}
            >
              All tools
            </Link>
          </SheetClose>
          <p className="px-3 pt-4 pb-1 text-xs font-medium text-muted-foreground">
            Categories
          </p>
          {CATEGORY_LINKS.map((link) => (
            <SheetClose key={link.href} asChild>
              <Link
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground",
                  isActive(pathname, link.href) && "bg-accent text-foreground",
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
  const [dropdownMenuOpen, setDropdownMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-12">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={`${appName} home`}
          >
            <Logo />
            <span className="text-base font-semibold tracking-tight">
              {appName}
            </span>
          </Link>

          <div className="mx-1 hidden h-5 w-px bg-border md:block" />

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            <Button asChild variant={"ghost"}>
              <Link href="/">Home</Link>
            </Button>
            <DropdownMenu
              open={dropdownMenuOpen}
              onOpenChange={setDropdownMenuOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button type="button" variant={"ghost"}>
                  Categories
                  <ChevronDown
                    data-icon="inline-end"
                    className={cn(
                      "transition-all duration-150",
                      dropdownMenuOpen && "-rotate-180",
                    )}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel className="sr-only">
                  Categories
                </DropdownMenuLabel>
                {CATEGORY_LINKS.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link
                      href={link.href}
                      className={cn(
                        isActive(pathname, link.href) &&
                          "bg-accent text-foreground",
                      )}
                    >
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/category">
                    <Wrench data-icon="inline-start" />
                    All categories
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild variant={"ghost"}>
              <Link href="/tools">Tools</Link>
            </Button>
          </nav>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="hidden h-8 w-52 justify-start gap-2 text-muted-foreground lg:flex"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <SearchIcon data-icon="inline-start" />
              <span className="flex-1 text-left text-sm font-normal">
                Search tools…
              </span>
              <KbdGroup>
                {isApple ? <Kbd>⌘</Kbd> : <Kbd>Ctrl</Kbd>}
                <Kbd>K</Kbd>
              </KbdGroup>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Search tools"
            >
              <SearchIcon />
            </Button>
            <ModeToggle />
            {githubProfileUrl && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="hidden sm:inline-flex"
              >
                <Link href={githubProfileUrl} aria-label="GitHub profile">
                  <GitHubIconSvg />
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

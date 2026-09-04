"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/modules/auth/LogoutButton";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/resources", label: "Resources" },
  { href: "/profile", label: "Profile" },
];

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const NavLink = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      onClick={() => setMenuOpen(false)}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive(href)
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="text-lg font-semibold text-primary"
          >
            CareerForge
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} />
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LogoutButton />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile backdrop + menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 top-16 z-40 bg-black/50 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <nav
        className={cn(
          "fixed inset-x-0 top-16 z-50 border-t bg-background px-4 py-2 transition-all duration-200 md:hidden",
          menuOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1">
          {navLinks.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} />
          ))}
        </div>
      </nav>
    </header>
  );
}

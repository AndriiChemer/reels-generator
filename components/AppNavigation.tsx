"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", label: "Проєкт" },
  { href: "/characters", label: "Персонажі" },
  { href: "/reels/new", label: "Новий Reel" },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Основна навігація" className="flex flex-wrap gap-2">
      {navigationItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "rounded-md border border-[var(--accent)] bg-teal-50 px-3 py-2 text-sm font-semibold text-[var(--accent-strong)] transition"
                : "rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
            }
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}


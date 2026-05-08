"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "대시보드", exact: true },
  { href: "/admin/users", label: "회원 관리" },
  { href: "/admin/breweries", label: "양조장 관리" },
  { href: "/admin/analytics", label: "통계" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-brew-border bg-brew-surface px-3 py-6">
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-brew-dark text-brew-text-light"
                  : "text-brew-muted hover:bg-brew-surface-dark hover:text-brew-text"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

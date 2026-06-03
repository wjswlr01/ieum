"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "대시보드", exact: true },
  { href: "/admin/users", label: "회원 관리" },
  { href: "/admin/breweries", label: "양조장 관리" },
  { href: "/admin/breweries-directory", label: "양조장 연결" },
  { href: "/admin/analytics", label: "통계" },
];

function isActive(
  item: { href: string; exact?: boolean },
  pathname: string,
): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-brew-border bg-brew-surface px-3 py-6">
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(item, pathname);
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

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-brew-dark border-t border-brew-dark-border pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-5">
          {NAV.map((item) => {
            const active = isActive(item, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center justify-center py-3 text-[11px] transition-colors ${
                    active
                      ? "text-brew-accent"
                      : "text-[#B0A080] hover:text-brew-text-light"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

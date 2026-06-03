"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Tab = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  match?: (p: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/dashboard",
    label: "홈",
    exact: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/recipes",
    label: "레시피",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/batches",
    label: "술빚기",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M6 6h12l-1 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 6z" />
        <path d="M8 14h8" />
      </svg>
    ),
  },
  {
    href: "/map",
    label: "지도",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
];

const MORE_LINKS = [
  { href: "/dashboard/inventory", label: "재고" },
  { href: "/dashboard/calendar", label: "캘린더" },
  { href: "/dashboard/settings", label: "계정 설정" },
];

const MORE_PATHS = MORE_LINKS.map((l) => l.href);

export default function MobileBottomNav({
  isAdmin = false,
  hasBrewery = false,
}: {
  isAdmin?: boolean;
  hasBrewery?: boolean;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function onClick(e: MouseEvent) {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [moreOpen]);

  const moreActive = MORE_PATHS.some((p) => pathname.startsWith(p));

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-brew-dark border-t border-brew-dark-border pb-[env(safe-area-inset-bottom)]"
        data-onboarding-step="2"
      >
        <ul className="grid grid-cols-5">
          {TABS.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            const onboardStep =
              tab.href === "/dashboard/recipes" ? "3"
              : tab.href === "/dashboard/batches" ? "4"
              : undefined;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  {...(onboardStep ? { "data-onboarding-step": onboardStep } : {})}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                    active
                      ? "text-brew-accent"
                      : "text-[#B0A080] hover:text-brew-text-light"
                  }`}
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  <span className="text-[10px] leading-none">{tab.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={`w-full flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                moreActive || moreOpen
                  ? "text-brew-accent"
                  : "text-[#B0A080] hover:text-brew-text-light"
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              <span className="text-[10px] leading-none">더보기</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40">
          <div
            ref={sheetRef}
            className="absolute bottom-0 inset-x-0 bg-brew-dark border-t border-brew-dark-border rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex justify-center pt-2 pb-3">
              <div className="h-1 w-10 rounded-full bg-[#5A5246]" />
            </div>
            <ul className="px-2 pb-2">
              {hasBrewery && (
                <li>
                  <Link
                    href="/dashboard/my-brewery"
                    onClick={() => setMoreOpen(false)}
                    className={`block rounded-lg px-4 py-3 text-sm transition-colors ${
                      pathname.startsWith("/dashboard/my-brewery")
                        ? "bg-white/5 text-brew-accent"
                        : "text-[#B0A080] hover:bg-white/5"
                    }`}
                  >
                    내 양조장 관리
                  </Link>
                </li>
              )}
              {MORE_LINKS.map((l) => {
                const onboardStep =
                  l.href === "/dashboard/inventory" ? "6" : undefined;
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setMoreOpen(false)}
                      {...(onboardStep ? { "data-onboarding-step": onboardStep } : {})}
                      className={`block rounded-lg px-4 py-3 text-sm transition-colors ${
                        pathname.startsWith(l.href)
                          ? "bg-white/5 text-brew-accent"
                          : "text-[#B0A080] hover:bg-white/5"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
              {isAdmin && (
                <li>
                  <Link
                    href="/admin"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center justify-between rounded-lg px-4 py-3 text-sm text-[#B0A080] hover:bg-white/5 transition-colors"
                  >
                    관리자 페이지
                    <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">ADMIN</span>
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

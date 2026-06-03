"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function UserMenu({
  userName,
  userEmail,
  isAdmin = false,
  hasBrewery = false,
}: {
  userName: string;
  userEmail: string;
  isAdmin?: boolean;
  hasBrewery?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initial = (userName || userEmail || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-[#B0A080] hover:text-brew-text-light transition-colors max-w-[12rem]"
      >
        <span
          aria-hidden="true"
          className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brew-accent/20 text-sm font-semibold text-brew-accent"
        >
          {initial}
        </span>
        <span className="hidden md:block lg:hidden truncate max-w-[6ch]">
          {userName}
        </span>
        <span className="hidden lg:block truncate max-w-[10rem]">
          {userName}
        </span>
        <span className="hidden md:block text-[10px] opacity-70">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-brew-dark-border bg-[#2D2A22] shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-brew-dark-border">
            <p className="text-sm font-semibold text-brew-text-light truncate">{userName}</p>
            <p className="text-xs text-[#B0A080] truncate mt-0.5">{userEmail}</p>
          </div>
          <div className="py-1">
            {hasBrewery && (
              <Link
                href="/dashboard/my-brewery"
                onClick={() => setOpen(false)}
                className="flex items-center px-4 py-2.5 text-sm text-[#B0A080] hover:text-brew-text-light hover:bg-white/5 transition-colors"
              >
                내 양조장 관리
              </Link>
            )}
            <Link
              href="/dashboard/calendar"
              onClick={() => setOpen(false)}
              className="hidden md:flex items-center px-4 py-2.5 text-sm text-[#B0A080] hover:text-brew-text-light hover:bg-white/5 transition-colors"
            >
              캘린더
            </Link>
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm text-[#B0A080] hover:text-brew-text-light hover:bg-white/5 transition-colors"
            >
              계정 설정
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 text-sm text-[#B0A080] hover:text-brew-text-light hover:bg-white/5 transition-colors"
              >
                관리자 페이지
                <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  ADMIN
                </span>
              </Link>
            )}
          </div>
          <div className="border-t border-brew-dark-border py-1">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-left px-4 py-2.5 text-sm text-[#B0A080] hover:text-brew-text-light hover:bg-white/5 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

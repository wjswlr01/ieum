"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

type Props = {
  userName: string;
  userEmail: string;
};

export function UserAvatar({ userName, userEmail }: Props) {
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
        aria-label="사용자 메뉴"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-brew-border bg-white text-sm font-semibold text-brew-text transition-colors hover:bg-brew-surface-dark"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-brew-border bg-white shadow-lg">
          <div className="border-b border-brew-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-brew-text">{userName || "—"}</p>
            <p className="mt-0.5 truncate text-xs text-brew-muted">{userEmail}</p>
          </div>
          <div className="py-1">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-brew-text transition-colors hover:bg-brew-surface-dark"
            >
              대시보드
            </Link>
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-brew-text transition-colors hover:bg-brew-surface-dark"
            >
              계정 설정
            </Link>
          </div>
          <div className="border-t border-brew-border py-1">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full px-4 py-2.5 text-left text-sm text-brew-text transition-colors hover:bg-brew-surface-dark"
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

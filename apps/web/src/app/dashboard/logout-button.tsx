"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm text-[#B0A080] hover:text-brew-text-light transition-colors"
    >
      로그아웃
    </button>
  );
}

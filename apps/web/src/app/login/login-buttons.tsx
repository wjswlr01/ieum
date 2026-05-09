"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";

type Enabled = { google: boolean; kakao: boolean; naver: boolean };

export default function LoginButtons({ enabled }: { enabled: Enabled }) {
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }

  function handleClick(provider: "google" | "kakao" | "naver", label: string) {
    if (!enabled[provider]) {
      showToast(`${label} 로그인은 준비 중입니다.`);
      return;
    }
    void signIn(provider, { callbackUrl: "/dashboard" });
  }

  return (
    <div className="flex flex-col gap-3 relative">
      <button
        type="button"
        onClick={() => handleClick("kakao", "카카오")}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#FEE500", color: "#191919" }}
      >
        <KakaoIcon />
        카카오로 시작하기
      </button>

      <button
        type="button"
        onClick={() => handleClick("naver", "네이버")}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#03C75A", color: "#FFFFFF" }}
      >
        <NaverIcon />
        네이버로 시작하기
      </button>

      <button
        type="button"
        onClick={() => handleClick("google", "Google")}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors hover:bg-[#F8F9FA]"
        style={{ backgroundColor: "#FFFFFF", color: "#3C4043", borderColor: "#DADCE0" }}
      >
        <GoogleIcon />
        Google로 시작하기
      </button>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 rounded-lg bg-brew-dark px-4 py-2 text-xs font-medium text-brew-text-light shadow-lg whitespace-nowrap"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// ── 인라인 SVG 아이콘 (외부 파일 의존 없음) ──────────────────────

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3C6.48 3 2 6.55 2 10.93c0 2.79 1.85 5.24 4.66 6.65l-1.18 4.32c-.1.36.3.65.62.45l5.18-3.42c.24.02.48.03.72.03 5.52 0 10-3.55 10-7.93C22 6.55 17.52 3 12 3z"
        fill="#191919"
      />
    </svg>
  );
}

function NaverIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.273 12.845 7.376 0H0v24h7.726V11.155L16.624 24H24V0h-7.727v12.845z" fill="#FFFFFF" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

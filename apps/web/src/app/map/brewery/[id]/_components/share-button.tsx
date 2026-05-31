"use client";

import { useState } from "react";

type Props = {
  breweryId: string;
  breweryName: string;
};

export default function ShareButton({ breweryId, breweryName }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/map/brewery/${breweryId}`;
    const shareData = {
      title: breweryName,
      text: `${breweryName} — 이음에서 확인해보세요`,
      url,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // 사용자 취소 또는 미지원 — 클립보드 폴백으로 진행
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드도 실패 — 무시
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="공유하기"
      className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brew-border bg-white transition-colors hover:bg-brew-surface"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {copied && (
        <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-brew-text px-2 py-1 text-[11px] font-medium text-white shadow">
          링크 복사됨
        </span>
      )}
    </button>
  );
}

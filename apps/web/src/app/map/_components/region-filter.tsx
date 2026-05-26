"use client";

import { useEffect, useRef, useState } from "react";

const REGIONS = [
  "전국",
  "서울",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "기타",
];

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function RegionFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const displayValue = value || "전국";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 whitespace-nowrap rounded-full bg-brew-accent-light px-3 py-1.5 text-xs font-medium text-brew-accent-light-text"
      >
        <span>{displayValue}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 max-h-[60vh] min-w-[140px] overflow-y-auto rounded-lg border border-brew-border bg-white py-2 shadow-lg">
          {REGIONS.map((region) => {
            const isActive = displayValue === region;
            return (
              <button
                key={region}
                type="button"
                onClick={() => {
                  onChange(region === "전국" ? "" : region);
                  setOpen(false);
                }}
                className={`block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-brew-surface-dark ${
                  isActive ? "font-medium text-brew-accent-light-text" : "text-brew-text"
                }`}
              >
                {region}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

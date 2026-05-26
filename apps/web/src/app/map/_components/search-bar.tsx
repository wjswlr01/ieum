"use client";

import { useEffect, useState } from "react";

type Props = {
  initialValue: string;
  onSubmit: (value: string) => void;
  placeholder?: string;
};

export function SearchBar({ initialValue, onSubmit, placeholder }: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (value === initialValue) return;
    const timeout = setTimeout(() => onSubmit(value), 500);
    return () => clearTimeout(timeout);
    // onSubmit는 부모에서 매 렌더 새 함수일 수 있으므로 deps에서 제외.
    // 의도: value 또는 initialValue 변화 시에만 디바운스.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, initialValue]);

  function clear() {
    setValue("");
    onSubmit("");
  }

  return (
    <div className="relative">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brew-muted"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-brew-border bg-white py-2.5 pl-10 pr-10 text-sm text-brew-text placeholder:text-brew-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brew-accent-light"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="검색어 지우기"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brew-muted transition-colors hover:text-brew-text"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

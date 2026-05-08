"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const DOMAINS = [
  "gmail.com",
  "naver.com",
  "daum.net",
  "kakao.com",
  "hanmail.net",
  "nate.com",
  "icloud.com",
  "outlook.com",
];

interface EmailInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}

export default function EmailInput({
  id,
  value,
  onChange,
  className,
  placeholder = "you@example.com",
  required,
  autoComplete = "email",
}: EmailInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const computeSuggestions = useCallback((val: string) => {
    const atIdx = val.indexOf("@");
    if (atIdx === -1) return [];
    const domainPart = val.slice(atIdx + 1).toLowerCase();
    return DOMAINS.filter((d) =>
      domainPart === "" ? true : d.startsWith(domainPart)
    );
  }, []);

  useEffect(() => {
    const next = computeSuggestions(value);
    setSuggestions(next);
    setActiveIndex(-1);
  }, [value, computeSuggestions]);

  const selectDomain = (domain: string) => {
    const atIdx = value.indexOf("@");
    const local = atIdx === -1 ? value : value.slice(0, atIdx);
    onChange(`${local}@${domain}`);
    setSuggestions([]);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const chosen = suggestions[activeIndex];
      if (chosen) selectDomain(chosen);
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setSuggestions([]);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="email"
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={className}
        placeholder={placeholder}
      />

      {suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-brew-border bg-brew-surface shadow-md"
        >
          {suggestions.map((domain, i) => {
            const atIdx = value.indexOf("@");
            const local = atIdx === -1 ? value : value.slice(0, atIdx);
            const full = `${local}@${domain}`;
            return (
              <li
                key={domain}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (domain) selectDomain(domain);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`cursor-pointer px-4 py-2 text-sm text-brew-text transition-colors ${
                  i === activeIndex
                    ? "bg-brew-surface-dark"
                    : "hover:bg-brew-surface-dark"
                }`}
              >
                {full}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

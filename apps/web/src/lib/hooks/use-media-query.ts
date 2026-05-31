"use client";

import { useEffect, useState } from "react";

/**
 * matchMedia 기반 viewport 감지 훅.
 * SSR/CSR mismatch 방지를 위해 `mounted` 플래그를 함께 반환한다.
 * 첫 렌더는 `mounted=false`로 두고, useEffect 후 실제 viewport 결정.
 */
export function useMediaQuery(query: string): { matches: boolean; mounted: boolean } {
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    setMounted(true);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return { matches, mounted };
}

/** Tailwind `md` breakpoint (≥768px) 기준. */
export function useIsDesktop(): { isDesktop: boolean; mounted: boolean } {
  const { matches, mounted } = useMediaQuery("(min-width: 768px)");
  return { isDesktop: matches, mounted };
}

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── MakLog 디자인 시스템 토큰 ──────────────────────────────
        primary: "#2D2A22",
        accent: "#C8B32A",
        background: "#FAF7F2",
        surface: "#F0EBE0",
        "surface-dark": "#E6DFD1",
        "text-primary": "#1A1A1A",
        "text-secondary": "#6B6560",
        "text-light": "#FAF7F2",
        success: "#3A7D4A",
        info: "#2A6090",
        warning: "#D4A017",
        danger: "#C0392B",

        // ── brew-* 토큰 (CSS 변수 기반 → 다크모드 자동 반영) ─────
        brew: {
          bg: "var(--brew-bg)",
          surface: "var(--brew-surface)",
          "surface-dark": "var(--brew-surface-dark)",
          // border는 opacity modifier(/50 등) 지원을 위해 RGB 채널 방식 사용
          border: "rgb(var(--brew-border-rgb) / <alpha-value>)",
          "border-hover": "var(--brew-border-hover)",
          // 고정값 (다크/라이트 공통)
          dark: "#2D2A22",
          "dark-border": "#3D3830",
          accent: "#C8B32A",
          "accent-hover": "#B4A020",
          success: "#3A7D4A",
          fermenting: "#E0EEFA",
          conditioning: "#FFF4E0",
          text: "var(--brew-text)",
          "text-light": "#FAF7F2",
          muted: "var(--brew-muted)",
          subtle: "var(--brew-subtle)",
          faint: "var(--brew-faint)",

          // ── Stitch 시안 매핑용 신규 토큰 (CSS 변수 기반) ──
          cream: "var(--brew-cream)",
          "cream-ink": "var(--brew-cream-ink)",
          "green-soft": "var(--brew-green-soft)",
          danger: "var(--brew-danger)",
          "danger-soft": "var(--brew-danger-soft)",

          // ── 양조장 지도 (Phase 3) — 활성 칩 강조 ──
          "accent-light": "#F8E155",
          "accent-light-text": "#706300",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "Wanted Sans",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          "var(--font-nanum-myeongjo)",
          "Noto Serif KR",
          "Georgia",
          "serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

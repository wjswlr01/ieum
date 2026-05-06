import type { Config } from "tailwindcss";

const config: Config = {
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

        // ── brew-* 레거시 토큰 (하위 호환) ───────────────────────
        brew: {
          bg: "#FAF7F2",
          surface: "#F0EBE0",
          "surface-dark": "#E6DFD1",
          border: "#E0D8CC",
          "border-hover": "#C8BCA8",
          dark: "#2D2A22",
          "dark-border": "#3D3830",
          accent: "#C8B32A",
          "accent-hover": "#B4A020",
          success: "#3A7D4A",
          fermenting: "#E0EEFA",
          conditioning: "#FFF4E0",
          text: "#1A1A1A",
          "text-light": "#FAF7F2",
          muted: "#6B6560",
          subtle: "#8B7B6B",
          faint: "#A09080",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        serif: ["var(--font-nanum-myeongjo)", "Georgia", "serif"],
        mono: ["var(--font-dm-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

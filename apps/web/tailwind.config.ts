import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brew: {
          bg: "#FAF7F2",
          surface: "#F0EBE0",
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
          muted: "#6B5F52",
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

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.css",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./styles/**/*.css",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 18px 45px rgba(0, 0, 0, 0.22)",
        glow: "0 16px 38px rgba(34, 211, 238, 0.14)",
        "love-glow": "0 0 40px rgba(244, 63, 116, 0.25)",
        "love-glow-lavender": "0 0 60px rgba(167, 139, 250, 0.25)",
        "love-card": "0 8px 30px rgba(0, 0, 0, 0.35)"
      },
      backgroundImage: {
        "love-card-glass":
          "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        "love-gradient":
          "radial-gradient(ellipse at top, rgba(167,139,250,0.18), transparent 60%), radial-gradient(ellipse at bottom right, rgba(244,63,116,0.18), transparent 55%), linear-gradient(180deg, #0e0526 0%, #1a0b3d 50%, #2c1a5c 100%)"
      },
      colors: {
        chap: {
          bg: "#101014",
          panel: "#18171d",
          soft: "#211f27",
          line: "rgba(255,255,255,0.08)"
        },
        midnight: {
          50: "#f4f1fb",
          100: "#e7def6",
          200: "#cdbcec",
          300: "#a98fdd",
          400: "#8666cd",
          500: "#6a47bf",
          600: "#55359e",
          700: "#42287c",
          800: "#2c1a5c",
          900: "#1a0b3d",
          950: "#0e0526"
        },
        lavender: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c4a5f7",
          500: "#a78bfa",
          600: "#8b5cf6",
          700: "#7c3aed",
          800: "#6b21a8",
          900: "#581c87"
        },
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706"
        },
        "love-rose": {
          50: "#fff1f5",
          100: "#ffe4ec",
          200: "#fecdd9",
          300: "#fda4bc",
          400: "#fb7299",
          500: "#f43f74",
          600: "#e11d57",
          700: "#be1246",
          800: "#9d123e",
          900: "#83143b"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"]
      }
    }
  },
  plugins: []
};

export default config;

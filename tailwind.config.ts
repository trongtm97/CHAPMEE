import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 18px 45px rgba(0, 0, 0, 0.22)",
        glow: "0 16px 38px rgba(34, 211, 238, 0.14)"
      },
      colors: {
        chap: {
          bg: "#101014",
          panel: "#18171d",
          soft: "#211f27",
          line: "rgba(255,255,255,0.08)"
        }
      }
    }
  },
  plugins: []
};

export default config;

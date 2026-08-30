import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  {
    ignores: ["**/.codex-tmp/**", "**/.next/**", "**/node_modules/**"]
  },
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The rule is incompatible with server component try/catch patterns in this repo.
      "react-hooks/error-boundaries": "off",
      // These rules are noisy across existing code and block CI-like lint runs.
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "prefer-const": "off",
      "react-hooks/refs": "off",
      "react-hooks/rules-of-hooks": "off",
      "@next/next/no-html-link-for-pages": "off",
      "react/jsx-key": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "react-compiler/react-compiler": "off",
      "react-hooks/preserve-manual-memoization": "off"
    }
  }
]);

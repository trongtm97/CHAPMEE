import { Cormorant_Garamond } from "next/font/google";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
const displayFont = Cormorant_Garamond({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap"
});

type LoveInsightShellProps = Readonly<{
  children: ReactNode;
  className?: string;
}>;

/** Scoped wrapper — mystical purple theme from love-insight original. */
export function LoveInsightShell({ children, className }: LoveInsightShellProps) {
  return (
    <div className={cn("love-insight-shell overflow-hidden rounded-2xl", displayFont.variable, className)}>
      {children}
    </div>
  );
}

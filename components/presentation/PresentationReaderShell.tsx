"use client";

import type { ReactNode } from "react";
import { useReaderPreferencesOptional } from "@/components/reader/ReaderPreferencesProvider";
import type {
  ReaderFontFamily,
  ReaderFontSize,
  ReaderLineHeight,
  ReaderTheme
} from "@/lib/reader/reading-preferences";

const fontSizeClass: Record<ReaderFontSize, string> = {
  small: "text-base sm:text-[1.0625rem]",
  medium: "text-[1.125rem] sm:text-[1.1875rem]",
  large: "text-[1.25rem] sm:text-[1.3125rem]",
  xlarge: "text-[1.375rem] sm:text-[1.4375rem]"
};

const lineHeightClass: Record<ReaderLineHeight, string> = {
  compact: "leading-[1.72]",
  normal: "leading-[1.82]",
  relaxed: "leading-[1.92]"
};

const fontFamilyClass: Record<ReaderFontFamily, string> = {
  default: "font-[family-name:var(--font-sans)]",
  serif: "font-serif",
  sans: "font-sans"
};

const themeClass: Record<ReaderTheme, string> = {
  dark: "text-zinc-100/95",
  light: "text-zinc-900",
  paper: "text-[#3d3428]"
};

const themeSurfaceClass: Record<ReaderTheme, string> = {
  dark: "",
  light: "rounded-xl bg-zinc-50/95 px-1",
  paper: "rounded-xl bg-[#f4ecd8] px-1"
};

type PresentationReaderShellProps = {
  children: ReactNode;
  className?: string;
};

export function PresentationReaderShell({
  children,
  className = ""
}: PresentationReaderShellProps) {
  const { preferences } = useReaderPreferencesOptional();

  return (
    <article
      className={`reader-content presentation-content mx-auto w-full max-w-[42rem] ${themeSurfaceClass[preferences.theme]} ${themeClass[preferences.theme]} ${fontSizeClass[preferences.fontSize]} ${lineHeightClass[preferences.lineHeight]} ${fontFamilyClass[preferences.fontFamily]} ${className}`}
      data-reader-content="true"
    >
      <div className="break-words px-1 py-1 sm:px-2">{children}</div>
    </article>
  );
}

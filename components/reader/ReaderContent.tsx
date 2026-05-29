"use client";

import { ChapterContentView } from "@/components/editor/ChapterContentView";
import { useReaderPreferences } from "@/components/reader/ReaderPreferencesProvider";
import type {
  ReaderFontFamily,
  ReaderFontSize,
  ReaderLineHeight,
  ReaderTheme
} from "@/lib/reader/reading-preferences";

type ReaderContentProps = {
  content: string;
};

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

export function ReaderContent({ content }: ReaderContentProps) {
  const { preferences } = useReaderPreferences();

  return (
    <article
      className={`reader-content mx-auto w-full max-w-[42rem] ${themeSurfaceClass[preferences.theme]} ${themeClass[preferences.theme]} ${fontSizeClass[preferences.fontSize]} ${lineHeightClass[preferences.lineHeight]} ${fontFamilyClass[preferences.fontFamily]}`}
      data-reader-content="true"
    >
      <div className="break-words px-1 py-1 sm:px-2">
        <ChapterContentView
          content={content}
          emptyClassName="text-zinc-500"
          paragraphClassName="mb-[1.15em] last:mb-0"
        />
      </div>
    </article>
  );
}

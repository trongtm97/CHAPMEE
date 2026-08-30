"use client";

import { ReaderSheet } from "@/components/reader/ReaderSheet";
import { useReaderPreferences } from "@/components/reader/ReaderPreferencesProvider";
import {
  resetReadingPreferences,
  type ReaderContentWidth,
  type ReaderFontFamily,
  type ReaderFontSize,
  type ReaderLineHeight,
  type ReaderTheme
} from "@/lib/reader/reading-preferences";

type ReaderSettingsSheetProps = {
  open: boolean;
  onClose: () => void;
};

function OptionRow<T extends string>({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            className={`tap-highlight min-h-10 rounded-full px-3.5 text-sm font-semibold transition ${
              value === option.value
                ? "bg-cyan-300 text-zinc-950"
                : "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.08]"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

const fontSizeOptions: { value: ReaderFontSize; label: string }[] = [
  { value: "small", label: "Nhỏ" },
  { value: "medium", label: "Vừa" },
  { value: "large", label: "Lớn" },
  { value: "xlarge", label: "Rất lớn" }
];

const themeOptions: { value: ReaderTheme; label: string }[] = [
  { value: "dark", label: "Tối" },
  { value: "black", label: "Đen" },
  { value: "light", label: "Sáng" },
  { value: "paper", label: "Giấy" }
];

const contentWidthOptions: { value: ReaderContentWidth; label: string }[] = [
  { value: "narrow", label: "Hẹp" },
  { value: "default", label: "Vừa" },
  { value: "wide", label: "Rộng" }
];

const fontFamilyOptions: { value: ReaderFontFamily; label: string }[] = [
  { value: "default", label: "Mặc định" },
  { value: "serif", label: "Serif" },
  { value: "sans", label: "Sans" }
];

const lineHeightOptions: { value: ReaderLineHeight; label: string }[] = [
  { value: "compact", label: "Gọn" },
  { value: "normal", label: "Vừa" },
  { value: "relaxed", label: "Rộng" }
];

export function ReaderSettingsSheet({ onClose, open }: ReaderSettingsSheetProps) {
  const { preferences, setPreferences } = useReaderPreferences();

  return (
    <ReaderSheet onClose={onClose} open={open} title="Cài đặt đọc">
      <div className="space-y-5">
        <OptionRow
          label="Cỡ chữ"
          onChange={(fontSize) => setPreferences({ fontSize })}
          options={fontSizeOptions}
          value={preferences.fontSize}
        />
        <OptionRow
          label="Giao diện"
          onChange={(theme) => setPreferences({ theme })}
          options={themeOptions}
          value={preferences.theme}
        />
        <OptionRow
          label="Font"
          onChange={(fontFamily) => setPreferences({ fontFamily })}
          options={fontFamilyOptions}
          value={preferences.fontFamily}
        />
        <OptionRow
          label="Giãn dòng"
          onChange={(lineHeight) => setPreferences({ lineHeight })}
          options={lineHeightOptions}
          value={preferences.lineHeight}
        />
        <OptionRow
          label="Độ rộng"
          onChange={(contentWidth) => setPreferences({ contentWidth })}
          options={contentWidthOptions}
          value={preferences.contentWidth}
        />
        <button
          className="tap-highlight min-h-10 w-full rounded-full border border-white/[0.08] text-sm font-semibold text-zinc-400 hover:bg-white/[0.04]"
          onClick={() => setPreferences(resetReadingPreferences())}
          type="button"
        >
          Đặt lại mặc định
        </button>
      </div>
    </ReaderSheet>
  );
}

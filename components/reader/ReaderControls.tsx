"use client";

type ReaderControlsProps = {
  fontSize: "small" | "medium" | "large";
  setFontSize: (fontSize: "small" | "medium" | "large") => void;
  theme: "dark" | "light" | "paper";
  setTheme: (theme: "dark" | "light" | "paper") => void;
};

const fontSizes = ["small", "medium", "large"] as const;
const themes = ["dark", "light", "paper"] as const;

export function ReaderControls({
  fontSize,
  setFontSize,
  setTheme,
  theme
}: ReaderControlsProps) {
  return (
    <section className="space-y-3 chap-card p-3 sm:p-4">
      <p className="px-1 text-sm font-black text-white">Reading settings</p>
      <div className="grid grid-cols-3 gap-2">
        {fontSizes.map((size) => (
          <button
            className={`tap-highlight min-h-11 rounded-full text-[0.92rem] font-bold transition ${
              fontSize === size
                ? "bg-cyan-300 text-zinc-950"
                : "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.08]"
            }`}
            key={size}
            onClick={() => setFontSize(size)}
            type="button"
          >
            {size}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {themes.map((themeOption) => (
          <button
            className={`tap-highlight min-h-11 rounded-full text-[0.92rem] font-bold transition ${
              theme === themeOption
                ? "bg-cyan-300 text-zinc-950"
                : "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.08]"
            }`}
            key={themeOption}
            onClick={() => setTheme(themeOption)}
            type="button"
          >
            {themeOption}
          </button>
        ))}
      </div>
    </section>
  );
}

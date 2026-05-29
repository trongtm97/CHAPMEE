"use client";

type BackgroundOption = {
  id: string;
  label: string;
  url: string | null;
};

type SwipeBackgroundPickerProps = {
  options: BackgroundOption[];
  value: string | null;
  onChange: (url: string | null, optionId: string) => void;
};

export function SwipeBackgroundPicker({
  options,
  onChange,
  value
}: SwipeBackgroundPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-zinc-100">Hình nền</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const selected = value === option.url && option.id !== "gradient";

          return (
            <button
              className={`relative overflow-hidden rounded-xl border p-1 text-left transition ${
                selected || (option.id === "gradient" && !value)
                  ? "border-cyan-300 ring-1 ring-cyan-300/40"
                  : "border-white/10 hover:border-white/20"
              }`}
              key={option.id}
              onClick={() =>
                onChange(option.id === "gradient" ? null : option.url, option.id)
              }
              type="button"
            >
              <div
                className="h-20 w-full rounded-lg bg-cover bg-center"
                style={
                  option.url
                    ? { backgroundImage: `url(${option.url})` }
                    : {
                        backgroundImage:
                          "linear-gradient(145deg, rgba(8,47,73,0.96), rgba(4,7,12,0.98))"
                      }
                }
              />
              <span className="mt-2 block px-1 pb-1 text-xs font-medium text-zinc-300">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

type FeatureFlagSwitchProps = {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

export function FeatureFlagSwitch({
  checked,
  description,
  disabled,
  label,
  onChange
}: FeatureFlagSwitchProps) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs leading-5 text-zinc-400">{description}</p>
      </div>
      <button
        aria-checked={checked}
        className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
          checked
            ? "border-cyan-300/60 bg-cyan-300/20"
            : "border-white/15 bg-zinc-800"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}

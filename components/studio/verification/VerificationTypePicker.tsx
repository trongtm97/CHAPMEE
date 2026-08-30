"use client";

import {
  STUDIO_VERIFICATION_PICKER_TYPES,
  STUDIO_VERIFICATION_TYPE_CONFIG,
  type StudioVerificationType
} from "@/lib/verification/config";

type VerificationTypePickerProps = {
  value: StudioVerificationType;
  disabled?: boolean;
  onChange: (value: StudioVerificationType) => void;
};

export function VerificationTypePicker({ disabled, onChange, value }: VerificationTypePickerProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-white">Bước 1 · Chọn loại xác thực</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {STUDIO_VERIFICATION_PICKER_TYPES.map((type) => {
          const config = STUDIO_VERIFICATION_TYPE_CONFIG[type];
          const active = value === type;
          return (
            <label
              className={`cursor-pointer rounded-2xl border p-4 transition ${
                active
                  ? "border-cyan-300/50 bg-cyan-300/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              } ${disabled ? "pointer-events-none opacity-60" : ""}`}
              key={type}
            >
              <input
                checked={active}
                className="sr-only"
                disabled={disabled}
                name="verification-type"
                onChange={() => onChange(type)}
                type="radio"
                value={type}
              />
              <p className="font-semibold text-white">{config.label}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-400">{config.description}</p>
            </label>
          );
        })}
      </div>
    </div>
  );
}

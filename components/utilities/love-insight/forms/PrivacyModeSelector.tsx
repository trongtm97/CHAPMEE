"use client";

import type { PrivacyMode } from "@/lib/love-insight/shared";

interface Option {
  value: PrivacyMode;
  label: string;
  description: string;
}

const OPTIONS: Option[] = [
  {
    value: "FULL_NAMES",
    label: "Hiện tên đầy đủ",
    description: "Hai tên sẽ hiển thị rõ ràng trong bản kết quả và trang chia sẻ."
  },
  {
    value: "INITIALS",
    label: "Chỉ chữ cái đầu (khuyên dùng)",
    description: 'Vd: hiển thị "M ❤️ L". Người khác nhìn link chia sẻ sẽ chỉ thấy chữ cái đầu.'
  },
  {
    value: "HIDDEN",
    label: "Ẩn hoàn toàn",
    description: 'Hiện "Một kết nối bí mật ❤️". Phù hợp khi bạn muốn share mà không muốn ai đoán ra tên.'
  }
];

interface PrivacyModeSelectorProps {
  value: PrivacyMode;
  onChange: (value: PrivacyMode) => void;
  name?: string;
  legend?: string;
}

export function PrivacyModeSelector({
  value,
  onChange,
  name = "privacyMode",
  legend = "Chế độ chia sẻ"
}: PrivacyModeSelectorProps) {
  return (
    <fieldset>
      <legend className="label-mystic">{legend}</legend>
      <div className="space-y-2">
        {OPTIONS.map((opt) => {
          const checked = value === opt.value;
          return (
            <label
              className={`block cursor-pointer rounded-xl border p-3 transition ${
                checked
                  ? "border-love-rose-400 bg-love-rose-500/10 ring-1 ring-love-rose-400/40"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
              key={opt.value}
            >
              <input
                checked={checked}
                className="sr-only"
                name={name}
                onChange={() => onChange(opt.value)}
                type="radio"
                value={opt.value}
              />
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                    checked ? "border-love-rose-400 bg-love-rose-400" : "border-white/30"
                  }`}
                />
                <span className="font-medium text-white">{opt.label}</span>
              </div>
              <p className="mt-1 pl-6 text-sm text-lavender-300">{opt.description}</p>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

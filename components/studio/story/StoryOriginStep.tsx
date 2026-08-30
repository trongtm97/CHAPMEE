"use client";

import type { ContentOrigin } from "@/lib/content-origin/content-origin-types";

type StoryOriginStepProps = {
  disabled?: boolean;
  value: ContentOrigin | "";
  onChange: (value: ContentOrigin) => void;
};

const OPTIONS: Array<{
  value: ContentOrigin;
  title: string;
  description: string;
}> = [
  {
    value: "original",
    title: "Truyện Sáng Tác",
    description:
      "Tác phẩm do bạn tự sáng tác hoặc bạn có đầy đủ quyền khai thác. Không đăng tác phẩm đồi trụy, vi phạm pháp luật Việt Nam."
  },
  {
    value: "translation",
    title: "Truyện Dịch",
    description:
      "Tác phẩm được dịch/chuyển ngữ từ nguồn/tác phẩm khác. Hãy dịch đúng tinh thần, trau chuốt câu văn, phù hợp người Việt và không copy 100%. Mặc định miễn phí đọc 100% và không được bán chương/bộ."
  }
];

export function StoryOriginStep({ disabled, value, onChange }: StoryOriginStepProps) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-zinc-100">
          Loại nội dung<span className="text-red-300"> *</span>
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Bắt buộc chọn trước khi tiếp tục.
        </p>
      </div>
      <input name="content_origin" type="hidden" value={value} />
      <div className="grid gap-3 md:grid-cols-2">
        {OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <button
              className={`rounded-xl border p-4 text-left transition ${
                active
                  ? "border-cyan-300 bg-cyan-400/10"
                  : "border-white/10 bg-zinc-950/60 hover:border-white/20"
              }`}
              disabled={disabled}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              <p className="font-semibold text-white">{option.title}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{option.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

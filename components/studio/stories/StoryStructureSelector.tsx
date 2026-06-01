"use client";

import type { StoryStructureType } from "@/types/story-structure";

type StoryStructureSelectorProps = {
  value: StoryStructureType;
  onChange: (value: StoryStructureType) => void;
  disabled?: boolean;
  allowChange?: boolean;
};

export function StoryStructureSelector({
  allowChange = true,
  disabled = false,
  onChange,
  value
}: StoryStructureSelectorProps) {
  const locked = disabled || !allowChange;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-bold text-white">Cấu trúc nội dung</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Chọn kiểu truyện phù hợp — có thể đổi khi còn nháp và chưa có nội dung.
        </p>
      </div>
      <input name="structure_type" type="hidden" value={value} />
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className={`rounded-2xl border p-4 text-left transition ${
            value === "chaptered"
              ? "border-cyan-300/60 bg-cyan-400/10"
              : "border-white/10 bg-white/5 hover:border-white/20"
          } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
          disabled={locked}
          onClick={() => !locked && onChange("chaptered")}
          type="button"
        >
          <p className="font-bold text-white">Truyện nhiều chương</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Tiểu thuyết dài, series, truyện ra chương, trả phí theo chương.
          </p>
        </button>
        <button
          className={`rounded-2xl border p-4 text-left transition ${
            value === "standalone"
              ? "border-cyan-300/60 bg-cyan-400/10"
              : "border-white/10 bg-white/5 hover:border-white/20"
          } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
          disabled={locked}
          onClick={() => !locked && onChange("standalone")}
          type="button"
        >
          <p className="font-bold text-white">Truyện một phần</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Truyện ngắn, đoạn văn, case file, chat story, nội dung đọc nhanh.
          </p>
        </button>
      </div>
    </div>
  );
}

export function StoryStructureBadge({
  structureType
}: {
  structureType: StoryStructureType;
}) {
  const label =
    structureType === "standalone" ? "Truyện một phần" : "Truyện nhiều chương";

  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-200">
      {label}
    </span>
  );
}

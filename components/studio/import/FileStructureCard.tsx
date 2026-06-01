"use client";

const RULES = [
  "Không sửa id nếu muốn cập nhật dữ liệu cũ.",
  "Để trống id nếu muốn tạo mới.",
  "Cột action: create, update, hide, delete, schedule.",
  "Không xóa dòng header.",
  "File CSV phải dùng UTF-8 để không lỗi tiếng Việt.",
  "Nhập chương: bắt buộc có story_id hoặc story_title.",
  "Update chương: ưu tiên chapter_id; nếu không có thì dùng story_id + chapter_number.",
  "Xóa/ẩn hàng loạt cần xác nhận lần 2 trước khi lưu."
];

export function FileStructureCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <h3 className="text-base font-semibold text-white">Cấu trúc file nhập/xuất</h3>
      <ul className="mt-3 space-y-2 text-sm text-zinc-400">
        {RULES.map((rule) => (
          <li className="flex gap-2" key={rule}>
            <span className="text-cyan-300">•</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
      <details className="mt-4 rounded-xl border border-white/10 bg-zinc-950/60">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-cyan-200">
          Xem cột header chuẩn
        </summary>
        <pre className="overflow-x-auto px-4 pb-4 text-xs text-zinc-300">
          story_id, story_title, story_status, story_genre, chapter_id, chapter_number,
          chapter_title, chapter_status, chapter_content, scheduled_at, reel_id, reel_title,
          reel_text, reel_status, action
        </pre>
      </details>
    </div>
  );
}

import { Card, Input } from "@/components/ui";
import type { PollStatus } from "@/types/poll";

type PollEditorProps = {
  defaultQuestion?: string | null;
  defaultOptions?: string[];
  defaultStatus?: PollStatus;
};

export function PollEditor({
  defaultOptions = [],
  defaultQuestion = "",
  defaultStatus = "active"
}: PollEditorProps) {
  const options = Array.from({ length: 4 }, (_, index) => defaultOptions[index] ?? "");

  return (
    <Card className="space-y-4 border-white/10 bg-white/[0.03] p-4">
      <div className="space-y-1">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">
          Story Poll
        </p>
        <h3 className="text-base font-black text-white">Tạo poll cuối chap</h3>
        <p className="text-sm leading-6 text-zinc-400">
          Để trống nếu chưa muốn thêm poll. Có thể dùng 2-4 lựa chọn.
        </p>
      </div>

      <Input
        defaultValue={defaultQuestion ?? ""}
        label="Câu hỏi poll"
        name="poll_question"
        placeholder="Bạn muốn nữ chính làm gì tiếp theo?"
      />

      <div className="grid gap-3">
        {options.map((option, index) => (
          <Input
            key={index}
            defaultValue={option}
            label={`Lựa chọn ${index + 1}`}
            name={`poll_option_${index + 1}`}
            placeholder={index === 0 ? "Tha thứ" : "Nhập lựa chọn"}
          />
        ))}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-zinc-200" htmlFor="poll_status">
          Trạng thái
        </label>
        <select
          className="min-h-12 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300"
          defaultValue={defaultStatus}
          id="poll_status"
          name="poll_status"
        >
          <option value="active">active</option>
          <option value="closed">closed</option>
        </select>
        <p className="text-xs leading-5 text-zinc-500">
          Poll active sẽ cho vote. Poll closed vẫn hiển thị kết quả.
        </p>
      </div>
    </Card>
  );
}

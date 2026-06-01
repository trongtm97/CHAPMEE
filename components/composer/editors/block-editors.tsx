"use client";

import {
  ComposerArrayEditor,
  ComposerFieldGroup,
  ComposerSelect,
  ComposerTextarea
} from "@/components/composer/shared/ComposerFields";
import { ComposerImageUpload } from "@/components/composer/shared/ComposerImageUpload";
import { Input } from "@/components/ui";
import type { ComposerBlockUnion } from "@/lib/composer/types";

export type ComposerImageUploadContext = {
  draftId?: string | null;
  episodeId?: string | null;
  storyId: string;
};

type BlockEditorProps<T extends ComposerBlockUnion["type"]> = {
  block: Extract<ComposerBlockUnion, { type: T }>;
  disabled?: boolean;
  onChange: (block: ComposerBlockUnion) => void;
};

function patchBlock<T extends ComposerBlockUnion["type"]>(
  block: Extract<ComposerBlockUnion, { type: T }>,
  data: Partial<Extract<ComposerBlockUnion, { type: T }>["data"]>,
  onChange: (block: ComposerBlockUnion) => void
) {
  onChange({ ...block, data: { ...block.data, ...data } } as ComposerBlockUnion);
}

export function HeadingBlockEditor({ block, disabled, onChange }: BlockEditorProps<"heading">) {
  return (
    <ComposerFieldGroup title="Tiêu đề nhỏ">
      <ComposerSelect
        disabled={disabled}
        label="Cấp"
        onChange={(level) =>
          patchBlock(block, { level: Number(level) as 1 | 2 | 3 | 4 | 5 | 6 }, onChange)
        }
        options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `H${n}` }))}
        value={String(block.data.level)}
      />
      <Input
        disabled={disabled}
        label="Nội dung"
        onChange={(e) => patchBlock(block, { text: e.target.value }, onChange)}
        value={block.data.text}
      />
    </ComposerFieldGroup>
  );
}

export function ProseBlockEditor({ block, disabled, onChange }: BlockEditorProps<"prose">) {
  return (
    <ComposerTextarea
      disabled={disabled}
      label="Đoạn văn"
      onChange={(text) => patchBlock(block, { text }, onChange)}
      rows={8}
      value={block.data.text}
    />
  );
}

export function QuoteBlockEditor({ block, disabled, onChange }: BlockEditorProps<"quote">) {
  return (
    <ComposerFieldGroup title="Trích dẫn">
      <ComposerTextarea
        disabled={disabled}
        label="Nội dung"
        onChange={(text) => patchBlock(block, { text }, onChange)}
        value={block.data.text}
      />
      <Input
        disabled={disabled}
        label="Nguồn (tuỳ chọn)"
        onChange={(e) => patchBlock(block, { source: e.target.value }, onChange)}
        value={block.data.source}
      />
    </ComposerFieldGroup>
  );
}

export function DividerBlockEditor({ block, disabled, onChange }: BlockEditorProps<"divider">) {
  return (
    <ComposerSelect
      disabled={disabled}
      label="Kiểu ngăn cách"
      onChange={(style) =>
        patchBlock(block, { style: style as "line" | "dots" | "space" }, onChange)
      }
      options={[
        { value: "line", label: "Đường kẻ" },
        { value: "dots", label: "Chấm" },
        { value: "space", label: "Khoảng trống" }
      ]}
      value={block.data.style}
    />
  );
}

export function ImageBlockEditor({
  block,
  disabled,
  imageUpload,
  onChange
}: BlockEditorProps<"image"> & { imageUpload?: ComposerImageUploadContext }) {
  if (imageUpload) {
    return (
      <ComposerFieldGroup title="Hình ảnh nội bộ">
        <ComposerImageUpload
          alt={block.data.alt}
          caption={block.data.caption}
          disabled={disabled}
          draftId={imageUpload.draftId}
          episodeId={imageUpload.episodeId}
          mediaId={block.data.media_id}
          onChange={(patch) => patchBlock(block, patch, onChange)}
          storyId={imageUpload.storyId}
        />
      </ComposerFieldGroup>
    );
  }

  return (
    <ComposerFieldGroup title="Hình ảnh nội bộ">
      <p className="text-xs text-amber-200/90">
        Lưu nháp trước để tải ảnh, hoặc nhập media_id nội bộ (không URL ngoài).
      </p>
      <Input
        disabled={disabled}
        label="Media ID"
        onChange={(e) => patchBlock(block, { media_id: e.target.value.trim() }, onChange)}
        placeholder="vd. img_abc123"
        value={block.data.media_id}
      />
      <Input
        disabled={disabled}
        label="Chú thích"
        onChange={(e) => patchBlock(block, { caption: e.target.value }, onChange)}
        value={block.data.caption}
      />
      <Input
        disabled={disabled}
        label="Alt text"
        onChange={(e) => patchBlock(block, { alt: e.target.value }, onChange)}
        value={block.data.alt}
      />
    </ComposerFieldGroup>
  );
}

export function ChatMessageBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"chat_message">) {
  return (
    <ComposerFieldGroup title="Tin nhắn">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          disabled={disabled}
          label="Tên nhân vật"
          onChange={(e) => patchBlock(block, { character_name: e.target.value }, onChange)}
          value={block.data.character_name}
        />
        <Input
          disabled={disabled}
          label="ID nhân vật"
          onChange={(e) => patchBlock(block, { character_id: e.target.value }, onChange)}
          value={block.data.character_id}
        />
      </div>
      <ComposerSelect
        disabled={disabled}
        label="Vị trí"
        onChange={(side) => patchBlock(block, { side: side as "left" | "right" }, onChange)}
        options={[
          { value: "left", label: "Trái" },
          { value: "right", label: "Phải" }
        ]}
        value={block.data.side}
      />
      <ComposerTextarea
        disabled={disabled}
        label="Nội dung"
        onChange={(text) => patchBlock(block, { text }, onChange)}
        value={block.data.text}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          disabled={disabled}
          label="Giờ"
          onChange={(e) => patchBlock(block, { time: e.target.value }, onChange)}
          placeholder="00:03"
          value={block.data.time}
        />
        <ComposerSelect
          disabled={disabled}
          label="Trạng thái"
          onChange={(status) =>
            patchBlock(block, { status: status as "sent" | "delivered" | "seen" }, onChange)
          }
          options={[
            { value: "sent", label: "Đã gửi" },
            { value: "delivered", label: "Đã nhận" },
            { value: "seen", label: "Đã xem" }
          ]}
          value={block.data.status}
        />
      </div>
    </ComposerFieldGroup>
  );
}

export function ChatSystemBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"chat_system">) {
  return (
    <ComposerTextarea
      disabled={disabled}
      label="Tin hệ thống"
      onChange={(text) => patchBlock(block, { text }, onChange)}
      value={block.data.text}
    />
  );
}

export function ChatMissedCallBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"chat_missed_call">) {
  return (
    <ComposerFieldGroup title="Cuộc gọi nhỡ">
      <Input
        disabled={disabled}
        label="Nhân vật"
        onChange={(e) => patchBlock(block, { character_name: e.target.value }, onChange)}
        value={block.data.character_name}
      />
      <ComposerSelect
        disabled={disabled}
        label="Loại"
        onChange={(call_type) =>
          patchBlock(block, { call_type: call_type as "voice" | "video" }, onChange)
        }
        options={[
          { value: "voice", label: "Thoại" },
          { value: "video", label: "Video" }
        ]}
        value={block.data.call_type}
      />
      <ComposerSelect
        disabled={disabled}
        label="Trạng thái"
        onChange={(status) =>
          patchBlock(
            block,
            { status: status as "missed" | "ended" | "declined" },
            onChange
          )
        }
        options={[
          { value: "missed", label: "Nhỡ" },
          { value: "ended", label: "Kết thúc" },
          { value: "declined", label: "Từ chối" }
        ]}
        value={block.data.status}
      />
      <Input
        disabled={disabled}
        label="Giờ"
        onChange={(e) => patchBlock(block, { time: e.target.value }, onChange)}
        value={block.data.time}
      />
    </ComposerFieldGroup>
  );
}

export function ChatVoiceNoteBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"chat_voice_note">) {
  return (
    <ComposerFieldGroup title="Voice note (giả lập)">
      <Input
        disabled={disabled}
        label="Nhân vật"
        onChange={(e) => patchBlock(block, { character_name: e.target.value }, onChange)}
        value={block.data.character_name}
      />
      <ComposerSelect
        disabled={disabled}
        label="Vị trí"
        onChange={(side) => patchBlock(block, { side: side as "left" | "right" }, onChange)}
        options={[
          { value: "left", label: "Trái" },
          { value: "right", label: "Phải" }
        ]}
        value={block.data.side}
      />
      <Input
        disabled={disabled}
        label="Thời lượng (giây)"
        min={1}
        onChange={(e) =>
          patchBlock(block, { duration_seconds: Number(e.target.value) || 0 }, onChange)
        }
        type="number"
        value={block.data.duration_seconds}
      />
      <ComposerTextarea
        disabled={disabled}
        label="Transcript"
        onChange={(transcript) => patchBlock(block, { transcript }, onChange)}
        value={block.data.transcript}
      />
    </ComposerFieldGroup>
  );
}

export function CaseSummaryBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"case_summary">) {
  return (
    <ComposerFieldGroup title="Tóm tắt hồ sơ">
      <Input
        disabled={disabled}
        label="Mã vụ"
        onChange={(e) => patchBlock(block, { case_code: e.target.value }, onChange)}
        value={block.data.case_code}
      />
      <Input
        disabled={disabled}
        label="Tiêu đề"
        onChange={(e) => patchBlock(block, { title: e.target.value }, onChange)}
        value={block.data.title}
      />
      <Input
        disabled={disabled}
        label="Trạng thái"
        onChange={(e) => patchBlock(block, { status: e.target.value }, onChange)}
        value={block.data.status}
      />
      <ComposerTextarea
        disabled={disabled}
        label="Tóm tắt"
        onChange={(summary) => patchBlock(block, { summary }, onChange)}
        value={block.data.summary}
      />
    </ComposerFieldGroup>
  );
}

export function CaseTimelineBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"case_timeline">) {
  return (
    <ComposerFieldGroup title="Dòng thời gian">
      <Input
        disabled={disabled}
        label="Tiêu đề section"
        onChange={(e) => patchBlock(block, { title: e.target.value }, onChange)}
        value={block.data.title}
      />
      <ComposerArrayEditor
        createItem={() => ({ time: "", content: "" })}
        disabled={disabled}
        items={block.data.items}
        label="Sự kiện"
        onChange={(items) => patchBlock(block, { items }, onChange)}
        renderItem={(item, _i, update) => (
          <>
            <Input
              disabled={disabled}
              label="Thời gian"
              onChange={(e) => update({ time: e.target.value })}
              value={item.time}
            />
            <ComposerTextarea
              disabled={disabled}
              label="Nội dung"
              onChange={(content) => update({ content })}
              value={item.content}
            />
          </>
        )}
      />
    </ComposerFieldGroup>
  );
}

export function CaseEvidenceBlockEditor({
  block,
  disabled,
  imageUpload,
  onChange
}: BlockEditorProps<"case_evidence"> & { imageUpload?: ComposerImageUploadContext }) {
  return (
    <ComposerFieldGroup title="Bằng chứng">
      <Input
        disabled={disabled}
        label="Tiêu đề section"
        onChange={(e) => patchBlock(block, { title: e.target.value }, onChange)}
        value={block.data.title}
      />
      <ComposerArrayEditor
        createItem={() => ({ label: "", content: "", media_id: null })}
        disabled={disabled}
        items={block.data.items}
        label="Mục bằng chứng"
        onChange={(items) => patchBlock(block, { items }, onChange)}
        renderItem={(item, _i, update) => (
          <>
            <Input
              disabled={disabled}
              label="Nhãn"
              onChange={(e) => update({ label: e.target.value })}
              value={item.label}
            />
            <ComposerTextarea
              disabled={disabled}
              label="Mô tả"
              onChange={(content) => update({ content })}
              value={item.content}
            />
            {imageUpload ? (
              <ComposerImageUpload
                alt={item.label}
                caption=""
                disabled={disabled}
                draftId={imageUpload.draftId}
                episodeId={imageUpload.episodeId}
                mediaId={item.media_id ?? ""}
                onChange={(patch) =>
                  update({ media_id: patch.media_id?.trim() ? patch.media_id : null })
                }
                storyId={imageUpload.storyId}
              />
            ) : (
              <Input
                disabled={disabled}
                label="Media ID (tuỳ chọn)"
                onChange={(e) => update({ media_id: e.target.value || null })}
                value={item.media_id ?? ""}
              />
            )}
          </>
        )}
      />
    </ComposerFieldGroup>
  );
}

export function CaseSuspectBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"case_suspect">) {
  return (
    <ComposerFieldGroup title="Nghi phạm">
      <Input
        disabled={disabled}
        label="Tên"
        onChange={(e) => patchBlock(block, { name: e.target.value }, onChange)}
        value={block.data.name}
      />
      <Input
        disabled={disabled}
        label="Vai trò"
        onChange={(e) => patchBlock(block, { role: e.target.value }, onChange)}
        value={block.data.role}
      />
      <Input
        disabled={disabled}
        label="Động cơ"
        onChange={(e) => patchBlock(block, { motive: e.target.value }, onChange)}
        value={block.data.motive}
      />
      <ComposerTextarea
        disabled={disabled}
        label="Ghi chú"
        onChange={(note) => patchBlock(block, { note }, onChange)}
        value={block.data.note}
      />
    </ComposerFieldGroup>
  );
}

export function CaseNoteBlockEditor({ block, disabled, onChange }: BlockEditorProps<"case_note">) {
  return (
    <ComposerFieldGroup title="Ghi chú điều tra">
      <Input
        disabled={disabled}
        label="Tiêu đề"
        onChange={(e) => patchBlock(block, { title: e.target.value }, onChange)}
        value={block.data.title}
      />
      <ComposerTextarea
        disabled={disabled}
        label="Nội dung"
        onChange={(content) => patchBlock(block, { content }, onChange)}
        value={block.data.content}
      />
    </ComposerFieldGroup>
  );
}

export function DiaryEntryBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"diary_entry">) {
  return (
    <ComposerFieldGroup title="Nhật ký">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          disabled={disabled}
          label="Ngày"
          onChange={(e) => patchBlock(block, { date: e.target.value }, onChange)}
          value={block.data.date}
        />
        <Input
          disabled={disabled}
          label="Địa điểm"
          onChange={(e) => patchBlock(block, { location: e.target.value }, onChange)}
          value={block.data.location}
        />
      </div>
      <Input
        disabled={disabled}
        label="Tâm trạng"
        onChange={(e) => patchBlock(block, { mood: e.target.value }, onChange)}
        value={block.data.mood}
      />
      <Input
        disabled={disabled}
        label="Tiêu đề"
        onChange={(e) => patchBlock(block, { title: e.target.value }, onChange)}
        value={block.data.title}
      />
      <ComposerTextarea
        disabled={disabled}
        label="Nội dung"
        onChange={(content) => patchBlock(block, { content }, onChange)}
        rows={8}
        value={block.data.content}
      />
    </ComposerFieldGroup>
  );
}

export function SystemNoticeBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"system_notice">) {
  return (
    <ComposerFieldGroup title="Thông báo hệ thống">
      <Input
        disabled={disabled}
        label="Tiêu đề"
        onChange={(e) => patchBlock(block, { title: e.target.value }, onChange)}
        value={block.data.title}
      />
      <ComposerTextarea
        disabled={disabled}
        label="Nội dung"
        onChange={(content) => patchBlock(block, { content }, onChange)}
        value={block.data.content}
      />
      <ComposerSelect
        disabled={disabled}
        label="Tone"
        onChange={(tone) =>
          patchBlock(
            block,
            { tone: tone as "neutral" | "success" | "warning" | "danger" },
            onChange
          )
        }
        options={[
          { value: "neutral", label: "Trung tính" },
          { value: "success", label: "Thành công" },
          { value: "warning", label: "Cảnh báo" },
          { value: "danger", label: "Nguy hiểm" }
        ]}
        value={block.data.tone}
      />
    </ComposerFieldGroup>
  );
}

export function SystemStatsBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"system_stats">) {
  return (
    <ComposerFieldGroup title="Chỉ số">
      <Input
        disabled={disabled}
        label="Tiêu đề"
        onChange={(e) => patchBlock(block, { title: e.target.value }, onChange)}
        value={block.data.title}
      />
      <ComposerArrayEditor
        createItem={() => ({ label: "", value: "" })}
        disabled={disabled}
        items={block.data.items}
        label="Chỉ số"
        onChange={(items) => patchBlock(block, { items }, onChange)}
        renderItem={(item, _i, update) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              disabled={disabled}
              label="Nhãn"
              onChange={(e) => update({ label: e.target.value })}
              value={item.label}
            />
            <Input
              disabled={disabled}
              label="Giá trị"
              onChange={(e) => update({ value: e.target.value })}
              value={item.value}
            />
          </div>
        )}
      />
    </ComposerFieldGroup>
  );
}

export function SystemQuestBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"system_quest">) {
  return (
    <ComposerFieldGroup title="Nhiệm vụ">
      <Input
        disabled={disabled}
        label="Tiêu đề"
        onChange={(e) => patchBlock(block, { title: e.target.value }, onChange)}
        value={block.data.title}
      />
      <ComposerTextarea
        disabled={disabled}
        label="Mục tiêu"
        onChange={(objective) => patchBlock(block, { objective }, onChange)}
        value={block.data.objective}
      />
      <Input
        disabled={disabled}
        label="Độ khó"
        onChange={(e) => patchBlock(block, { difficulty: e.target.value }, onChange)}
        value={block.data.difficulty}
      />
      <Input
        disabled={disabled}
        label="Trạng thái"
        onChange={(e) => patchBlock(block, { status: e.target.value }, onChange)}
        value={block.data.status}
      />
    </ComposerFieldGroup>
  );
}

export function SystemRewardBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"system_reward">) {
  return (
    <ComposerFieldGroup title="Phần thưởng">
      <Input
        disabled={disabled}
        label="Tiêu đề"
        onChange={(e) => patchBlock(block, { title: e.target.value }, onChange)}
        value={block.data.title}
      />
      <ComposerArrayEditor
        createItem={() => ({ text: "" })}
        disabled={disabled}
        items={block.data.items.map((text) => ({ text }))}
        label="Phần thưởng"
        onChange={(rows) => patchBlock(block, { items: rows.map((r) => r.text) }, onChange)}
        renderItem={(item, _i, update) => (
          <Input
            disabled={disabled}
            label="Mục"
            onChange={(e) => update({ text: e.target.value })}
            value={item.text}
          />
        )}
      />
    </ComposerFieldGroup>
  );
}

export function ScriptDialogueBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"script_dialogue">) {
  return (
    <ComposerFieldGroup title="Lời thoại">
      <Input
        disabled={disabled}
        label="Nhân vật"
        onChange={(e) => patchBlock(block, { character_name: e.target.value }, onChange)}
        value={block.data.character_name}
      />
      <ComposerTextarea
        disabled={disabled}
        label="Thoại"
        onChange={(dialogue) => patchBlock(block, { dialogue }, onChange)}
        value={block.data.dialogue}
      />
    </ComposerFieldGroup>
  );
}

export function SocialPostBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"social_post">) {
  return (
    <ComposerFieldGroup title="Bài đăng">
      <Input
        disabled={disabled}
        label="Tác giả"
        onChange={(e) => patchBlock(block, { author_name: e.target.value }, onChange)}
        value={block.data.author_name}
      />
      <ComposerTextarea
        disabled={disabled}
        label="Nội dung"
        onChange={(body) => patchBlock(block, { body }, onChange)}
        value={block.data.body}
      />
      <Input
        disabled={disabled}
        label="Thời gian"
        onChange={(e) => patchBlock(block, { timestamp: e.target.value }, onChange)}
        value={block.data.timestamp}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          disabled={disabled}
          label="Lượt thích (hiển thị)"
          onChange={(e) => patchBlock(block, { fake_like_count: e.target.value }, onChange)}
          value={block.data.fake_like_count}
        />
        <Input
          disabled={disabled}
          label="Bình luận (hiển thị)"
          onChange={(e) => patchBlock(block, { fake_comment_count: e.target.value }, onChange)}
          value={block.data.fake_comment_count}
        />
      </div>
    </ComposerFieldGroup>
  );
}

export function SocialCommentBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"social_comment">) {
  return (
    <ComposerFieldGroup title="Bình luận">
      <Input
        disabled={disabled}
        label="Tác giả"
        onChange={(e) => patchBlock(block, { author_name: e.target.value }, onChange)}
        value={block.data.author_name}
      />
      <ComposerTextarea
        disabled={disabled}
        label="Nội dung"
        onChange={(body) => patchBlock(block, { body }, onChange)}
        value={block.data.body}
      />
      <Input
        disabled={disabled}
        label="Cấp lồng"
        min={0}
        onChange={(e) => patchBlock(block, { level: Number(e.target.value) || 0 }, onChange)}
        type="number"
        value={block.data.level}
      />
    </ComposerFieldGroup>
  );
}

export function SocialReactionBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"social_reaction">) {
  return (
    <ComposerFieldGroup title="Cảm xúc">
      <Input
        disabled={disabled}
        label="Loại"
        onChange={(e) => patchBlock(block, { reaction: e.target.value }, onChange)}
        value={block.data.reaction}
      />
      <Input
        disabled={disabled}
        label="Số lượng (text)"
        onChange={(e) => patchBlock(block, { count_text: e.target.value }, onChange)}
        value={block.data.count_text}
      />
    </ComposerFieldGroup>
  );
}

export function ChoiceNodeBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"choice_node">) {
  return (
    <ComposerFieldGroup title="Nút lựa chọn">
      <Input
        disabled={disabled}
        label="Node ID"
        onChange={(e) => patchBlock(block, { node_id: e.target.value }, onChange)}
        value={block.data.node_id}
      />
      <Input
        disabled={disabled}
        label="Tiêu đề"
        onChange={(e) => patchBlock(block, { title: e.target.value }, onChange)}
        value={block.data.title}
      />
      <ComposerTextarea
        disabled={disabled}
        label="Nội dung"
        onChange={(content) => patchBlock(block, { content }, onChange)}
        value={block.data.content}
      />
      <p className="text-xs text-zinc-500">
        Truyện nhánh chưa hỗ trợ đọc tương tác công khai — dùng để soạn trước.
      </p>
    </ComposerFieldGroup>
  );
}

export function ChoiceOptionBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"choice_option">) {
  return (
    <ComposerFieldGroup title="Lựa chọn">
      <Input
        disabled={disabled}
        label="Nhãn hiển thị"
        onChange={(e) => patchBlock(block, { label: e.target.value }, onChange)}
        value={block.data.label}
      />
      <Input
        disabled={disabled}
        label="Node đích"
        onChange={(e) => patchBlock(block, { target_node_id: e.target.value }, onChange)}
        placeholder="node_id"
        value={block.data.target_node_id}
      />
    </ComposerFieldGroup>
  );
}

export function ScriptActionBlockEditor({
  block,
  disabled,
  onChange
}: BlockEditorProps<"script_action">) {
  return (
    <ComposerTextarea
      disabled={disabled}
      label="Hành động / bối cảnh"
      onChange={(action) => patchBlock(block, { action }, onChange)}
      value={block.data.action}
    />
  );
}

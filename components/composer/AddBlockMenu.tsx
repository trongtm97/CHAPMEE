"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { BLOCK_TYPE_DESCRIPTIONS } from "@/lib/composer/blocks";
import { getAllowedBlocksForMode } from "@/lib/composer/modes";
import type { ComposerBlockType, ComposerMode } from "@/lib/composer/types";

const BLOCK_MENU_LABELS: Partial<Record<ComposerBlockType, string>> = {
  heading: "Tiêu đề nhỏ",
  prose: "Đoạn văn",
  quote: "Trích dẫn",
  divider: "Ngăn cách",
  image: "Hình ảnh",
  chat_message: "Tin nhắn",
  chat_system: "Tin hệ thống",
  chat_missed_call: "Cuộc gọi nhỡ",
  chat_voice_note: "Voice note giả lập",
  case_summary: "Tóm tắt hồ sơ",
  case_timeline: "Dòng thời gian",
  case_evidence: "Bằng chứng",
  case_suspect: "Nghi phạm",
  case_note: "Ghi chú điều tra",
  diary_entry: "Nhật ký",
  system_notice: "Thông báo hệ thống",
  system_stats: "Chỉ số",
  system_quest: "Nhiệm vụ",
  system_reward: "Phần thưởng",
  script_dialogue: "Lời thoại",
  script_action: "Hành động/bối cảnh",
  social_post: "Bài đăng",
  social_comment: "Bình luận",
  social_reaction: "Cảm xúc"
};

const BLOCK_ICONS: Partial<Record<ComposerBlockType, string>> = {
  heading: "H",
  prose: "¶",
  quote: "❝",
  divider: "—",
  image: "🖼",
  chat_message: "💬",
  chat_system: "⚙",
  chat_missed_call: "📵",
  chat_voice_note: "🎙",
  case_summary: "📋",
  case_timeline: "🕐",
  case_evidence: "🔍",
  case_suspect: "👤",
  case_note: "📝",
  diary_entry: "📔",
  system_notice: "🔔",
  system_stats: "📊",
  system_quest: "🎯",
  system_reward: "🎁",
  script_dialogue: "🗣",
  script_action: "🎬",
  social_post: "📱",
  social_comment: "💭",
  social_reaction: "👍"
};

type AddBlockMenuProps = {
  mode: ComposerMode;
  onSelect: (blockType: ComposerBlockType) => void;
  onClose: () => void;
  open: boolean;
};

export function AddBlockMenu({ mode, onClose, onSelect, open }: AddBlockMenuProps) {
  const [query, setQuery] = useState("");
  const [runtimeAllowed, setRuntimeAllowed] = useState<ComposerBlockType[] | null>(null);
  const allowed = runtimeAllowed ?? getAllowedBlocksForMode(mode);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/composer/settings", {
          method: "GET",
          cache: "no-store"
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          blockTypes?: Array<{
            block_type: ComposerBlockType;
            modes: ComposerMode[];
            is_active: boolean;
            is_creator_selectable: boolean;
          }>;
        };
        if (!mounted || !Array.isArray(data.blockTypes)) return;
        const next = data.blockTypes
          .filter(
            (row) =>
              row.is_active &&
              row.is_creator_selectable &&
              Array.isArray(row.modes) &&
              row.modes.includes(mode)
          )
          .map((row) => row.block_type);
        setRuntimeAllowed(next.length > 0 ? next : getAllowedBlocksForMode(mode));
      } catch {
        setRuntimeAllowed(getAllowedBlocksForMode(mode));
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [mode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allowed.filter((type) => {
      const label = (BLOCK_MENU_LABELS[type] ?? type).toLowerCase();
      const desc = BLOCK_TYPE_DESCRIPTIONS[type].toLowerCase();
      return !q || label.includes(q) || desc.includes(q) || type.includes(q);
    });
  }, [allowed, query]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-bold text-white">Thêm block</h3>
          <button
            className="text-sm text-zinc-400 hover:text-white"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>
        <div className="border-b border-white/10 px-4 py-2">
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm block..."
            value={query}
          />
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {filtered.map((type) => (
            <li key={type}>
              <button
                className="flex w-full gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/10"
                onClick={() => {
                  onSelect(type);
                  onClose();
                  setQuery("");
                }}
                type="button"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-sm font-bold text-cyan-200">
                  {BLOCK_ICONS[type] ?? "+"}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">
                    {BLOCK_MENU_LABELS[type] ?? type}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {BLOCK_TYPE_DESCRIPTIONS[type]}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">Không có block phù hợp.</p>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

export function AddBlockButton({
  mode,
  onSelect
}: {
  mode: ComposerMode;
  onSelect: (blockType: ComposerBlockType) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button" variant="secondary">
        + Thêm block
      </Button>
      <AddBlockMenu
        mode={mode}
        onClose={() => setOpen(false)}
        onSelect={onSelect}
        open={open}
      />
    </>
  );
}

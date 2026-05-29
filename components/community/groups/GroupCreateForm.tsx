"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { submitGroupSuggestion } from "@/lib/community/create-group-suggestion";
import type { SuggestedGroupType } from "@/types/community-group";

type StoryOption = {
  id: string;
  title: string;
  slug: string;
};

const groupTypeOptions: { value: SuggestedGroupType; label: string }[] = [
  { value: "fan_theory", label: "Fan theory" },
  { value: "review", label: "Review" },
  { value: "spoiler", label: "Spoiler" },
  { value: "ask_author", label: "Hỏi tác giả" }
];

type GroupCreateFormProps = {
  stories: StoryOption[];
};

export function GroupCreateForm({ stories }: GroupCreateFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storyId, setStoryId] = useState(stories[0]?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupType, setGroupType] = useState<SuggestedGroupType>("fan_theory");
  const [hasSpoiler, setHasSpoiler] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await submitGroupSuggestion({
        storyId,
        name,
        description,
        groupType,
        hasSpoiler,
        isDefaultGroup: false
      });

      if (result.ok) {
        setMessage(result.message);
        setTimeout(() => router.push("/community/groups"), 1200);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block space-y-1.5">
        <span className="text-xs font-bold text-zinc-300">Truyện liên quan</span>
        <select
          className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300/50"
          onChange={(event) => setStoryId(event.target.value)}
          required
          value={storyId}
        >
          {stories.length === 0 ? (
            <option value="">Chưa có truyện public</option>
          ) : (
            stories.map((story) => (
              <option key={story.id} value={story.id}>
                {story.title}
              </option>
            ))
          )}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-bold text-zinc-300">Tên nhóm</span>
        <input
          className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300/50"
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          placeholder="VD: Fan theory chương 10"
          required
          value={name}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-bold text-zinc-300">Mô tả ngắn</span>
        <textarea
          className="min-h-[88px] w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-300/50"
          maxLength={280}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Mô tả mục đích nhóm..."
          value={description}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-bold text-zinc-300">Loại nhóm</span>
        <select
          className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300/50"
          onChange={(event) => setGroupType(event.target.value as SuggestedGroupType)}
          value={groupType}
        >
          {groupTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-zinc-500">
          Nhóm truyện chính được tạo tự động cho mỗi truyện public. Chỉ đề xuất nhóm phụ.
        </p>
      </label>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          checked={hasSpoiler}
          className="size-4 rounded border-white/20"
          onChange={(event) => setHasSpoiler(event.target.checked)}
          type="checkbox"
        />
        Có spoiler
      </label>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-cyan-200">{message}</p> : null}

      <button
        className="flex h-11 w-full items-center justify-center rounded-lg border border-cyan-300/40 bg-cyan-300/15 text-sm font-bold text-cyan-100 disabled:opacity-60"
        disabled={pending || stories.length === 0}
        type="submit"
      >
        {pending ? "Đang gửi..." : "Gửi đề xuất"}
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import {
  createCommunityPostAction,
  type CommunityPostFormState
} from "@/lib/community/createCommunityPost";
import type { CommunityStoryOption } from "@/lib/community/getStoriesForCommunityPost";

type CommunityPostFormProps = {
  stories: CommunityStoryOption[];
  defaultType?: string;
};

const initialState: CommunityPostFormState = {
  error: null,
  success: null
};

const types = [
  { label: "Thảo luận", value: "discussion" },
  { label: "Review ngắn", value: "review" },
  { label: "Bình chọn", value: "poll_placeholder" },
  { label: "Thử thách", value: "challenge" }
];

const composerTypeMap: Record<string, string> = {
  discussion: "discussion",
  review: "review",
  poll: "poll_placeholder",
  challenge: "challenge"
};

export function CommunityPostForm({ defaultType, stories }: CommunityPostFormProps) {
  const initialType = composerTypeMap[defaultType ?? ""] ?? "";
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createCommunityPostAction,
    initialState
  );
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.push("/community");
      router.refresh();
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [router, state.success]);

  return (
    <Card>
      <form action={formAction} className="space-y-5">
        <label className="space-y-2">
          <span className="block text-sm font-medium text-zinc-200">
            Loại bài
          </span>
          <select
            className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            defaultValue={initialType}
            disabled={pending}
            name="type"
            required
          >
            <option value="">Chọn loại bài</option>
            {types.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <Input
          disabled={pending}
          label="Tiêu đề"
          maxLength={160}
          name="title"
          placeholder="Một chủ đề ngắn gọn, rõ ý"
          required
        />

        <Textarea
          disabled={pending}
          label="Nội dung"
          maxLength={2000}
          name="content"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Viết nội dung text-only. Không upload ảnh/video trong MVP."
          required
          rows={8}
          value={content}
        />
        <p className="text-right text-xs text-zinc-500">
          {content.length}/2000 ký tự
        </p>

        <label className="space-y-2">
          <span className="block text-sm font-medium text-zinc-200">
            Truyện liên quan
          </span>
          <select
            className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            name="story_id"
          >
            <option value="">Không gắn truyện</option>
            {stories.map((story) => (
              <option key={story.id} value={story.id}>
                {story.title}
              </option>
            ))}
          </select>
        </label>

        {state.error ? (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <div className="space-y-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
            <p>{state.success}</p>
            <p>Bạn sẽ được chuyển về Cộng đồng trong giây lát.</p>
            <Link className="font-semibold text-emerald-50" href="/community">
              Quay về Cộng đồng
            </Link>
          </div>
        ) : null}

        <Button className="w-full" loading={pending} type="submit">
          Gửi chờ duyệt
        </Button>
      </form>
    </Card>
  );
}

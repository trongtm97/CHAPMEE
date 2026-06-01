"use client";

import { Button, Input } from "@/components/ui";
import { DEFAULT_SOCIAL_FEED_TEMPLATE } from "@/lib/presentation/default-templates";
import type { SocialFeedStructuredContent } from "@/types/presentation";
import { useCallback, useMemo } from "react";

type SocialFeedBlockEditorProps = {
  valueJson: string;
  onChange: (json: string) => void;
  disabled?: boolean;
};

function parseOrDefault(json: string): SocialFeedStructuredContent {
  try {
    const parsed = JSON.parse(json) as SocialFeedStructuredContent;
    if (Array.isArray(parsed.posts)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_SOCIAL_FEED_TEMPLATE;
}

export function SocialFeedBlockEditor({
  disabled = false,
  onChange,
  valueJson
}: SocialFeedBlockEditorProps) {
  const data = useMemo(() => parseOrDefault(valueJson), [valueJson]);

  const sync = useCallback(
    (next: SocialFeedStructuredContent) => {
      onChange(JSON.stringify(next, null, 2));
    },
    [onChange]
  );

  const updatePost = (
    index: number,
    patch: Partial<SocialFeedStructuredContent["posts"][number]>
  ) => {
    const posts = [...data.posts];
    posts[index] = { ...posts[index], ...patch };
    sync({ ...data, posts });
  };

  const addPost = () => {
    sync({
      ...data,
      posts: [
        ...data.posts,
        {
          author: "Tác giả",
          handle: "@user",
          time: "vừa xong",
          text: "",
          likes: 0,
          comments_count: 0
        }
      ]
    });
  };

  const removePost = (index: number) => {
    sync({ ...data, posts: data.posts.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/50 p-4">
      <Input
        disabled={disabled}
        label="Tên nền tảng (hiển thị)"
        onChange={(e) => sync({ ...data, platform: e.target.value })}
        value={data.platform ?? ""}
      />
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-200">Bài đăng</p>
        <Button disabled={disabled} onClick={addPost} type="button" variant="secondary">
          + Bài đăng
        </Button>
      </div>
      {data.posts.map((post, index) => (
        <div
          className="space-y-2 rounded-lg border border-white/10 bg-zinc-900/50 p-3"
          key={index}
        >
          <div className="flex justify-end">
            <button
              className="text-xs text-red-300"
              disabled={disabled}
              onClick={() => removePost(index)}
              type="button"
            >
              Xóa
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              disabled={disabled}
              label="Tên"
              onChange={(e) => updatePost(index, { author: e.target.value })}
              value={post.author}
            />
            <Input
              disabled={disabled}
              label="Handle"
              onChange={(e) => updatePost(index, { handle: e.target.value })}
              value={post.handle ?? ""}
            />
            <Input
              disabled={disabled}
              label="Thời gian"
              onChange={(e) => updatePost(index, { time: e.target.value })}
              value={post.time ?? ""}
            />
            <Input
              disabled={disabled}
              label="Lượt thích"
              onChange={(e) =>
                updatePost(index, { likes: Number(e.target.value) || 0 })
              }
              type="number"
              value={String(post.likes ?? 0)}
            />
          </div>
          <textarea
            className="min-h-[4rem] w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
            disabled={disabled}
            onChange={(e) => updatePost(index, { text: e.target.value })}
            placeholder="Nội dung bài đăng..."
            value={post.text}
          />
        </div>
      ))}
    </div>
  );
}

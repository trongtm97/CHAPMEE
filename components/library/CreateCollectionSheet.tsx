"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import type { CollectionVisibility } from "@/types/collection";

type CreateCollectionSheetProps = {
  onClose: () => void;
  onCreated?: (collectionId: string) => void;
};

export function CreateCollectionSheet({ onClose, onCreated }: CreateCollectionSheetProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<CollectionVisibility>("private");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Vui lòng nhập tên tủ.");
      return;
    }
    if (trimmed.length > 60) {
      setError("Tên tủ tối đa 60 ký tự.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          description: description.trim(),
          visibility
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Không thể tạo tủ truyện.");
      }
      onCreated?.(data.id);
      onClose();
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể tạo tủ truyện."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-3 backdrop-blur-sm">
      <div
        className="w-full max-h-[75dvh] space-y-4 overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0f141c] p-4"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Tạo tủ truyện</h2>
          <button
            className="text-sm text-zinc-400"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>

        <Input
          label="Tên tủ"
          maxLength={60}
          name="collection_title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Truyện kinh dị đêm khuya"
          value={title}
        />
        <Input
          label="Mô tả (tuỳ chọn)"
          name="collection_description"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Gom truyện theo gu đọc"
          value={description}
        />

        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-400">Quyền riêng tư</p>
          {visibility === "public" ? (
            <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs leading-5 text-amber-100/90">
              Tủ công khai sẽ hiển thị với mọi người trên hồ sơ của bạn.
            </p>
          ) : null}
          <div className="flex gap-2">
            {(["private", "public"] as CollectionVisibility[]).map((option) => (
              <button
                className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold ${
                  visibility === option
                    ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                    : "border-white/8 text-zinc-400"
                }`}
                key={option}
                onClick={() => setVisibility(option)}
                type="button"
              >
                {option === "public" ? "Công khai" : "Riêng tư"}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="text-xs text-red-300">{error}</p> : null}

        <Button loading={loading} onClick={() => void handleSubmit()} type="button">
          Tạo tủ
        </Button>
      </div>
    </div>
  );
}

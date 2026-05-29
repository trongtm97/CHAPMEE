"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { createCollectionAction, updateCollectionAction } from "@/lib/actions/collections";
import type { CollectionDetail, CollectionFormValues } from "@/types/collection";

type CollectionEditorProps = {
  collection?: CollectionDetail | null;
  mode: "create" | "edit";
};

export function CollectionEditor({ collection, mode }: CollectionEditorProps) {
  const [title, setTitle] = useState(collection?.title ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [visibility, setVisibility] = useState(collection?.visibility ?? "private");
  const [loading, setLoading] = useState(false);

  return (
    <Card className="space-y-4 p-4">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">Collection</p>
        <h2 className="text-xl font-black text-white">{mode === "create" ? "Tạo tủ truyện" : "Chỉnh sửa tủ truyện"}</h2>
      </div>
      <Input label="Tên collection" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Truyện drama tôi thấy cuốn nhất" />
      <Input label="Mô tả" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Một list theo mood đọc" />
      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-200">Hiển thị</label>
        <select className="min-h-12 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white outline-none" value={visibility} onChange={(e) => setVisibility(e.target.value as CollectionFormValues["visibility"])}>
          <option value="public">Công khai</option>
          <option value="private">Riêng tư</option>
        </select>
      </div>
      <Button
        loading={loading}
        onClick={async () => {
          setLoading(true);
          try {
            const payload = { title, description, visibility };
            if (mode === "create") {
              await createCollectionAction(payload);
            } else if (collection) {
              await updateCollectionAction(collection.id, payload);
            }
          } finally {
            setLoading(false);
          }
        }}
        type="button"
      >
        {mode === "create" ? "Tạo collection" : "Lưu thay đổi"}
      </Button>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import type { StudioFilmsPageData } from "@/lib/studio/get-studio-films-page";
import type { FilmAdaptationRow } from "@/src/lib/film-adaptations/film-adaptations";
import { studioPath } from "@/lib/studio/constants";
import { FilmAdaptationForm } from "@/components/studio/films/FilmAdaptationForm";
import { FilmAdaptationList } from "@/components/studio/films/FilmAdaptationList";

type StudioFilmWorkspaceProps = {
  data: StudioFilmsPageData;
};

export function StudioFilmWorkspace({ data }: StudioFilmWorkspaceProps) {
  const { story, items, totalCount, capabilities, adsDisabledReason, creativeDisclaimerText } =
    data;
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<FilmAdaptationRow | null>(null);

  const creationDisabled = !capabilities.enabled || !capabilities.canCreate;

  const resetForm = () => {
    setEditingItem(null);
    setShowForm(false);
  };

  const openCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const openEdit = (item: FilmAdaptationRow) => {
    setEditingItem(item);
    setShowForm(true);
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <nav className="text-sm text-zinc-500">
          <Link className="hover:text-zinc-300" href={studioPath("/media")}>
            Media
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-400">Video · {story.title}</span>
        </nav>
        <h1 className="text-2xl font-bold text-white">Phim chuyển thể</h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-300">
          Phim/video chuyển thể hoặc lấy cảm hứng từ truyện. Chỉ hỗ trợ YouTube. Phim liên kết ở cấp
          truyện, không theo từng chương.
        </p>
        <p className="text-sm text-zinc-400">
          Truyện: <span className="font-semibold text-zinc-100">{story.title}</span> ·{" "}
          {totalCount} phim
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={studioPath("/media")}
          className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 font-semibold text-cyan-100 hover:bg-cyan-400/15"
        >
          ← Tất cả media
        </Link>
        <Link
          href={studioPath(`/stories/${story.id}/chapters`)}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-200 hover:bg-white/5"
        >
          Quản lý chương
        </Link>
        <Link
          href={story.href}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-200 hover:bg-white/5"
        >
          Xem truyện public
        </Link>
      </div>

      {data.error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
          {data.error}
        </p>
      ) : null}

      {creationDisabled ? (
        <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
          {!capabilities.enabled
            ? "Tính năng phim chuyển thể đang tắt bởi admin."
            : "Không thể thêm phim: truyện cần được xuất bản hoặc bạn chưa có quyền creator."}
        </p>
      ) : null}

      {adsDisabledReason ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-400">
          {adsDisabledReason}
        </p>
      ) : null}

      {!showForm && !creationDisabled ? (
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-300"
        >
          Thêm phim chuyển thể
        </button>
      ) : null}

      {showForm && !creationDisabled ? (
        <FilmAdaptationForm
          storyId={story.id}
          storyTitle={story.title}
          storyHref={story.href}
          capabilities={capabilities}
          creativeDisclaimerText={creativeDisclaimerText}
          editingItem={editingItem}
          onCancel={resetForm}
          onSaved={resetForm}
        />
      ) : null}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Danh sách phim</h2>
        <FilmAdaptationList storyId={story.id} items={items} onEdit={openEdit} />
      </div>
    </section>
  );
}

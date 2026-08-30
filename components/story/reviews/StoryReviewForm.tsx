"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RatingRow } from "@/components/story/reviews/review-ui-utils";
import { Button } from "@/components/ui";
import {
  deleteMyStoryReviewAction,
  upsertStoryReviewAction
} from "@/lib/reviews/story-review-actions";
import {
  STORY_REVIEW_BODY_MAX,
  STORY_REVIEW_TITLE_MAX
} from "@/lib/reviews/story-review-config";
import type { StoryReviewView } from "@/types/story-review";

type StoryReviewFormProps = {
  storyId: string;
  returnTo: string;
  loggedIn: boolean;
  isAuthor: boolean;
  myReview: StoryReviewView | null;
};

const DEFAULT_SCORES = {
  overallRating: 5,
  plotScore: 5,
  characterScore: 5,
  writingStyleScore: 5,
  worldbuildingScore: 5
};

export function StoryReviewForm({
  isAuthor,
  loggedIn,
  myReview,
  returnTo,
  storyId
}: StoryReviewFormProps) {
  const router = useRouter();
  const [overallRating, setOverallRating] = useState(
    myReview?.overallRating ?? DEFAULT_SCORES.overallRating
  );
  const [plotScore, setPlotScore] = useState(myReview?.plotScore ?? DEFAULT_SCORES.plotScore);
  const [characterScore, setCharacterScore] = useState(
    myReview?.characterScore ?? DEFAULT_SCORES.characterScore
  );
  const [writingStyleScore, setWritingStyleScore] = useState(
    myReview?.writingStyleScore ?? DEFAULT_SCORES.writingStyleScore
  );
  const [worldbuildingScore, setWorldbuildingScore] = useState(
    myReview?.worldbuildingScore ?? DEFAULT_SCORES.worldbuildingScore
  );
  const [title, setTitle] = useState(myReview?.title ?? "");
  const [body, setBody] = useState(myReview?.body ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!loggedIn) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <p className="text-sm text-zinc-300">Đăng nhập để viết đánh giá có cấu trúc.</p>
        <Link
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-bold text-zinc-950"
          href={`/login?next=${encodeURIComponent(returnTo)}`}
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (isAuthor) {
    return (
      <p className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
        Bạn không thể đánh giá truyện của chính mình.
      </p>
    );
  }

  const handleSubmit = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await upsertStoryReviewAction(
        storyId,
        {
          overallRating,
          plotScore,
          characterScore,
          writingStyleScore,
          worldbuildingScore,
          title: title.trim() || null,
          body: body.trim() || null
        },
        returnTo
      );

      if (result.loginRequired) {
        window.location.href = `/login?next=${encodeURIComponent(returnTo)}`;
        return;
      }

      if (!result.ok) {
        setErrorMessage(result.error ?? "Không thể lưu đánh giá.");
        return;
      }

      setSuccessMessage(myReview ? "Đã cập nhật đánh giá." : "Đã gửi đánh giá.");
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!myReview) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await deleteMyStoryReviewAction(myReview.id, returnTo);
      if (!result.ok) {
        setErrorMessage(result.error ?? "Không thể xóa đánh giá.");
        return;
      }
      setSuccessMessage("Đã xóa đánh giá.");
      setTitle("");
      setBody("");
      router.refresh();
    });
  };

  return (
    <form
      className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <div>
        <h3 className="text-sm font-bold text-zinc-100">
          {myReview ? "Chỉnh sửa đánh giá của bạn" : "Viết đánh giá"}
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Mỗi tiêu chí từ 1–5 sao. Bạn chỉ có một đánh giá chính cho mỗi truyện.
        </p>
      </div>

      <RatingRow
        disabled={isPending}
        label="Tổng thể"
        name="overall"
        onChange={setOverallRating}
        value={overallRating}
      />
      <RatingRow
        disabled={isPending}
        label="Cốt truyện"
        name="plot"
        onChange={setPlotScore}
        value={plotScore}
      />
      <RatingRow
        disabled={isPending}
        label="Tuyến nhân vật"
        name="character"
        onChange={setCharacterScore}
        value={characterScore}
      />
      <RatingRow
        disabled={isPending}
        label="Văn phong"
        name="writing"
        onChange={setWritingStyleScore}
        value={writingStyleScore}
      />
      <RatingRow
        disabled={isPending}
        label="Bối cảnh thế giới"
        name="world"
        onChange={setWorldbuildingScore}
        value={worldbuildingScore}
      />

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-zinc-200">Tiêu đề (tuỳ chọn)</span>
        <input
          className="w-full rounded-xl border border-white/[0.08] bg-[#0b1016] px-3 py-2.5 text-sm text-white"
          disabled={isPending}
          maxLength={STORY_REVIEW_TITLE_MAX}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Tóm tắt cảm nhận của bạn"
          value={title}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-zinc-200">Nội dung (tuỳ chọn)</span>
        <textarea
          className="min-h-28 w-full rounded-xl border border-white/[0.08] bg-[#0b1016] px-3 py-2.5 text-sm text-white"
          disabled={isPending}
          maxLength={STORY_REVIEW_BODY_MAX}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Chia sẻ chi tiết về truyện mà không spoil quá nhiều..."
          value={body}
        />
      </label>

      {errorMessage ? (
        <p className="text-sm text-rose-300" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-emerald-300" role="status">
          {successMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={isPending} type="submit">
          {isPending ? "Đang lưu…" : myReview ? "Cập nhật đánh giá" : "Gửi đánh giá"}
        </Button>
        {myReview ? (
          <Button disabled={isPending} onClick={handleDelete} type="button" variant="ghost">
            Xóa đánh giá
          </Button>
        ) : null}
      </div>
    </form>
  );
}

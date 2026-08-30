"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  PublishGuidelinesNotice,
  useGuidelinesSubmitGuard
} from "@/components/creator/GuidelinesSubmitAcknowledgement";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { WordCount } from "@/components/creator/episodes/WordCount";
import { PollEditor } from "@/components/polls/PollEditor";
import { ChapterMonetizationSettings } from "@/components/creator/ChapterMonetizationSettings";
import { EarlyAccessSettings } from "@/components/creator/EarlyAccessSettings";
import type { EpisodeFormActionState } from "@/lib/creator/createEpisode";
import type { CreatorEpisodeFormData } from "@/lib/creator/getCreatorEpisodeById";

type EpisodeFormProps = {
  action: (
    previousState: EpisodeFormActionState,
    formData: FormData
  ) => Promise<EpisodeFormActionState>;
  episode?: CreatorEpisodeFormData["episode"];
  previewHref?: string;
  storyId: string;
  defaultEpisodeNumber: number;
  returnBasePath?: string;
  monetization?: {
    canMonetize: boolean;
    freeChaptersRequired: number;
    defaultCoinPrice: number;
    minCoinPrice: number;
    maxCoinPrice: number;
    allowCustomPrice: boolean;
    defaultFreePreviewPercent: number;
    initialIsPaid: boolean;
    initialCoinPrice: number | null;
    initialFreePreviewEnabled: boolean;
    initialFreePreviewPercent: number | null;
    initialFreePreviewChars: number | null;
  };
  earlyAccess?: {
    canMonetize: boolean;
    allowCustomPrice: boolean;
    defaultCoinPrice: number;
    minCoinPrice: number;
    maxCoinPrice: number;
    maxEarlyAccessDays: number;
    defaultFreeAfterHours: number;
    initialEnabled: boolean;
    initialCoinPrice: number | null;
    initialFreeAt: string | null;
  };
};

const initialState: EpisodeFormActionState = {
  error: null
};

export function EpisodeForm({
  action,
  defaultEpisodeNumber,
  episode,
  previewHref,
  returnBasePath = "/studio",
  storyId,
  monetization,
  earlyAccess
}: EpisodeFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [content, setContent] = useState(episode?.content ?? "");
  const { setPendingIntent } = useGuidelinesSubmitGuard();

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <p className="text-base font-semibold text-white">Gợi ý viết chap</p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-400">
          <li>Hook mạnh ở đầu.</li>
          <li>Một biến cố chính.</li>
          <li>Kết thúc có cliffhanger.</li>
        </ul>
        <p className="text-sm text-zinc-500">
          Phân loại độ tuổi gắn với truyện — chỉnh tại form truyện.{" "}
          <Link className="text-cyan-300 hover:text-cyan-200" href="/community-guidelines" target="_blank">
            Quy định cộng đồng
          </Link>
        </p>
      </Card>

      <Card>
        <form action={formAction} className="space-y-5">
          <input name="story_id" type="hidden" value={storyId} />
          <input
            name="return_base_path"
            type="hidden"
            value={returnBasePath}
          />
          {episode ? (
            <input name="episode_id" type="hidden" value={episode.id} />
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <Input
              defaultValue={episode?.episode_number ?? defaultEpisodeNumber}
              disabled={pending}
              label="Số chap"
              min={1}
              name="episode_number"
              required
              type="number"
            />
            <Input
              defaultValue={episode?.title ?? ""}
              disabled={pending}
              label="Tiêu đề"
              name="title"
              placeholder="Tên chap"
              required
            />
          </div>

          <Textarea
            defaultValue={episode?.excerpt ?? ""}
            disabled={pending}
            label="Excerpt"
            name="excerpt"
            placeholder="Để trống để tự lấy từ phần đầu nội dung."
            rows={3}
          />

          <div className="space-y-2">
            <Textarea
              className="min-h-[420px] text-base leading-7"
              disabled={pending}
              label="Nội dung"
              name="content"
              onChange={(event) => setContent(event.target.value)}
              placeholder="Viết nội dung chap tại đây..."
              required
              rows={18}
              value={content}
            />
            <WordCount content={content} />
          </div>

          <PollEditor
            defaultOptions={episode?.poll?.optionTexts ?? []}
            defaultQuestion={episode?.poll?.question ?? ""}
            defaultStatus={episode?.poll?.status ?? "active"}
          />

          {monetization ? (
            <ChapterMonetizationSettings
              allowCustomPrice={monetization.allowCustomPrice}
              canMonetize={monetization.canMonetize}
              defaultCoinPrice={monetization.defaultCoinPrice}
              defaultFreePreviewPercent={monetization.defaultFreePreviewPercent}
              episodeNumber={episode?.episode_number ?? defaultEpisodeNumber}
              freeChaptersRequired={monetization.freeChaptersRequired}
              initialCoinPrice={monetization.initialCoinPrice}
              initialFreePreviewChars={monetization.initialFreePreviewChars}
              initialFreePreviewEnabled={monetization.initialFreePreviewEnabled}
              initialFreePreviewPercent={monetization.initialFreePreviewPercent}
              initialIsPaid={monetization.initialIsPaid}
              maxCoinPrice={monetization.maxCoinPrice}
              minCoinPrice={monetization.minCoinPrice}
            />
          ) : null}

          {earlyAccess ? (
            <EarlyAccessSettings
              allowCustomPrice={earlyAccess.allowCustomPrice}
              canMonetize={earlyAccess.canMonetize}
              defaultCoinPrice={earlyAccess.defaultCoinPrice}
              defaultFreeAfterHours={earlyAccess.defaultFreeAfterHours}
              initialCoinPrice={earlyAccess.initialCoinPrice}
              initialEnabled={earlyAccess.initialEnabled}
              initialFreeAt={earlyAccess.initialFreeAt}
              maxCoinPrice={earlyAccess.maxCoinPrice}
              maxEarlyAccessDays={earlyAccess.maxEarlyAccessDays}
              minCoinPrice={earlyAccess.minCoinPrice}
            />
          ) : null}

          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-zinc-200"
              htmlFor="status"
            >
              Status
            </label>
            <select
              className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              defaultValue={episode?.status ?? "draft"}
              disabled
              id="status"
            >
              <option value="draft">draft</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="published">published</option>
              <option value="rejected">rejected</option>
              <option value="archived">archived</option>
            </select>
            <p className="text-xs leading-5 text-zinc-500">
              Save Draft sẽ lưu draft. Submit for Review sẽ chuyển sang pending.
            </p>
          </div>

          {state.error ? (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
              {state.error}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              loading={pending}
              name="intent"
              onClick={() => setPendingIntent("draft")}
              type="submit"
              value="draft"
              variant="secondary"
            >
              Lưu nháp
            </Button>
            <div className="space-y-2 sm:col-span-2">
              <PublishGuidelinesNotice bare variant="episode" />
              <Button
                className="w-full"
                loading={pending}
                name="intent"
                onClick={() => setPendingIntent("review")}
                type="submit"
                value="review"
              >
                Gửi duyệt
              </Button>
            </div>
            {previewHref ? (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
                href={previewHref}
              >
                Preview
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-500">
                Save draft to preview
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button, Card, Input } from "@/components/ui";
import { IpDealForm } from "@/components/admin/originals/IpDealForm";
import { adminUpsertStoryOriginalStatusAction } from "@/lib/monetization/originals";
import type { IpDealFinancialRow, IpDealRow, StoryOriginalStatus, StoryOriginalsStatusRow } from "@/types/originals";

type OriginalsDashboardProps = {
  storyStatuses: StoryOriginalsStatusRow[];
  deals: IpDealRow[];
  candidateRecommendations: Array<{
    storyId: string;
    storyTitle: string;
    storySlug: string;
    creatorUserId: string | null;
    score: number;
  }>;
  dealFinancialsByDeal: Record<string, IpDealFinancialRow[]>;
};

const STATUS_OPTIONS: StoryOriginalStatus[] = [
  "none",
  "candidate",
  "under_review",
  "original",
  "declined",
  "ended"
];

export function OriginalsDashboard({
  storyStatuses,
  deals,
  candidateRecommendations,
  dealFinancialsByDeal
}: OriginalsDashboardProps) {
  const [pending, startTransition] = useTransition();
  const [storyId, setStoryId] = useState("");
  const [creatorUserId, setCreatorUserId] = useState("");
  const [status, setStatus] = useState<StoryOriginalStatus>("candidate");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateStatus() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await adminUpsertStoryOriginalStatusAction({
        storyId,
        creatorUserId,
        status,
        note
      });
      if (!result.ok) {
        setError(result.error ?? "Không thể cập nhật originals status.");
        return;
      }
      setSuccess("Đã cập nhật Originals status.");
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h3 className="text-base font-black text-white">Cập nhật Originals status</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Story ID" onChange={(event) => setStoryId(event.currentTarget.value)} value={storyId} />
          <Input label="Creator user ID" onChange={(event) => setCreatorUserId(event.currentTarget.value)} value={creatorUserId} />
          <label className="space-y-1 text-sm">
            <span className="text-zinc-200">Status</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
              onChange={(event) => setStatus(event.currentTarget.value as StoryOriginalStatus)}
              value={status}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <Input label="Note" onChange={(event) => setNote(event.currentTarget.value)} value={note} />
        </div>
        <Button loading={pending} onClick={updateStatus} type="button">
          Lưu status
        </Button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
      </Card>

      <Card className="space-y-3">
        <h3 className="text-base font-black text-white">Tạo IP deal thủ công</h3>
        <IpDealForm />
      </Card>

      <Card className="space-y-3">
        <h3 className="text-base font-black text-white">Candidate recommendations</h3>
        {candidateRecommendations.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa có gợi ý candidate.</p>
        ) : (
          candidateRecommendations.map((item) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
              key={item.storyId}
            >
              <span className="text-zinc-300">{item.storyTitle}</span>
              <span className="text-zinc-300">score {item.score.toFixed(2)}</span>
              <span className="text-zinc-400">{item.storyId.slice(0, 8)}</span>
            </div>
          ))
        )}
      </Card>

      <Card className="space-y-3">
        <h3 className="text-base font-black text-white">Story Originals statuses</h3>
        {storyStatuses.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa có story originals status.</p>
        ) : (
          storyStatuses.map((item) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
              key={item.id}
            >
              <span className="text-zinc-400">{item.story_id.slice(0, 8)}</span>
              <span className="text-zinc-300">{item.creator_user_id.slice(0, 8)}</span>
              <span className="font-semibold text-zinc-100">{item.status}</span>
              <span className="text-zinc-400">{item.note ?? "-"}</span>
            </div>
          ))
        )}
      </Card>

      <Card className="space-y-3">
        <h3 className="text-base font-black text-white">IP Deals</h3>
        {deals.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa có IP deal.</p>
        ) : (
          deals.map((deal) => (
            <div className="space-y-2 rounded-xl border border-white/10 p-3" key={deal.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-zinc-300">{deal.story_id.slice(0, 8)}</span>
                <span className="text-zinc-300">{deal.deal_type}</span>
                <span className="text-zinc-300">{deal.status}</span>
                <span className="text-zinc-100">{deal.advance_amount_vnd?.toLocaleString("vi-VN") ?? 0} VND</span>
              </div>
              <p className="rounded-lg bg-black/20 p-2 text-xs text-zinc-400">
                rights: {JSON.stringify(deal.rights ?? {})}
              </p>
              <div className="space-y-1">
                {(dealFinancialsByDeal[deal.id] ?? []).map((row) => (
                  <div className="flex items-center justify-between text-xs text-zinc-400" key={row.id}>
                    <span>{row.type}</span>
                    <span>{row.amount_vnd.toLocaleString("vi-VN")} VND</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

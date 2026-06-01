"use client";

import type { CampaignFormInput } from "@/types/campaign";
import type { CampaignPlacement } from "@/types/campaign";

type CampaignPreviewProps = {
  form: Partial<CampaignFormInput> & {
    sponsorName?: string;
    sponsorLogoUrl?: string | null;
  };
  placement?: CampaignPlacement | null;
};

function DisclosureBadge({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
      {text || "Được tài trợ"}
    </span>
  );
}

function DiscoverBannerPreview({ form }: CampaignPreviewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/80 to-zinc-900 p-3">
      <div className="flex items-center justify-between gap-2">
        <DisclosureBadge text={form.disclosureText ?? "Được tài trợ"} />
        <span className="text-[10px] text-zinc-500">Discover</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{form.name || "Tên campaign"}</p>
      <p className="mt-1 text-xs text-zinc-400">{form.sponsorName ?? "Sponsor"}</p>
      {form.ctaText ? (
        <span className="mt-2 inline-block rounded-full bg-cyan-300 px-3 py-1 text-[10px] font-bold text-zinc-950">
          {form.ctaText}
        </span>
      ) : null}
    </div>
  );
}

function ChallengeCardPreview({ form }: CampaignPreviewProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/80 p-3">
      <div className="flex items-center justify-between">
        <DisclosureBadge text={form.disclosureText ?? "Được tài trợ"} />
        <span className="text-[10px] text-zinc-500">Community</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{form.name || "Challenge có tài trợ"}</p>
      <p className="text-xs text-zinc-400">bởi {form.sponsorName ?? "Sponsor"}</p>
      <button className="mt-2 rounded-full bg-cyan-300 px-3 py-1 text-[10px] font-bold text-zinc-950" type="button">
        {form.ctaText || "Tham gia"}
      </button>
    </div>
  );
}

function NativeCardPreview({ form }: CampaignPreviewProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950 p-3">
      <div className="flex gap-2">
        <div className="h-12 w-12 shrink-0 rounded-lg bg-zinc-800" />
        <div className="min-w-0 flex-1">
          <DisclosureBadge text={form.disclosureText ?? "Được tài trợ"} />
          <p className="mt-1 truncate text-sm font-medium text-white">{form.name || "Native card"}</p>
          <p className="truncate text-xs text-zinc-500">{form.description || form.sponsorName}</p>
        </div>
      </div>
    </div>
  );
}

function StoryBadgePreview({ form }: CampaignPreviewProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-3">
      <p className="text-xs text-zinc-500">Trang truyện</p>
      <div className="mt-2 flex items-center gap-2">
        <DisclosureBadge text={form.disclosureText ?? "Được tài trợ"} />
        <span className="text-xs text-zinc-300">{form.sponsorName ?? "Sponsor"}</span>
      </div>
    </div>
  );
}

function ChapterEndPreview({ form }: CampaignPreviewProps) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-zinc-950/80 p-3 text-center">
      <p className="text-xs text-zinc-500">Cuối chương</p>
      <DisclosureBadge text={form.disclosureText ?? "Được tài trợ"} />
      <p className="mt-2 text-sm text-zinc-200">{form.name || "CTA tài trợ"}</p>
      <button className="mt-2 rounded-full bg-cyan-300 px-4 py-1.5 text-xs font-bold text-zinc-950" type="button">
        {form.ctaText || "Tìm hiểu thêm"}
      </button>
    </div>
  );
}

function CreatorStudioPreview({ form }: CampaignPreviewProps) {
  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-950/30 p-3">
      <p className="text-[10px] uppercase tracking-wide text-violet-300">Creator Studio</p>
      <p className="mt-1 text-sm font-semibold text-white">{form.name || "Cơ hội chiến dịch"}</p>
      <p className="text-xs text-zinc-400">{form.sponsorName ?? "Sponsor"}</p>
    </div>
  );
}

export function CampaignPreview({ form, placement }: CampaignPreviewProps) {
  const resolvedPlacement = placement ?? form.placement ?? "discover_banner";

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Live preview</p>
      <div className="mx-auto max-w-[280px]">
        {resolvedPlacement === "discover_banner" && <DiscoverBannerPreview form={form} />}
        {resolvedPlacement === "community_sponsored_challenge" && (
          <ChallengeCardPreview form={form} />
        )}
        {resolvedPlacement === "reels_native_card" && <NativeCardPreview form={form} />}
        {resolvedPlacement === "story_sponsor_badge" && <StoryBadgePreview form={form} />}
        {resolvedPlacement === "chapter_end_cta" && <ChapterEndPreview form={form} />}
        {resolvedPlacement === "creator_studio_opportunity" && (
          <CreatorStudioPreview form={form} />
        )}
        {resolvedPlacement === "search_ranking_promoted" && (
          <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-center text-xs text-zinc-500">
            Vị trí Search/Ranking — coming soon
          </div>
        )}
      </div>
    </div>
  );
}

export function PlacementMiniPreview({ placementId }: { placementId: CampaignPlacement }) {
  return (
    <CampaignPreview
      form={{
        name: "Ví dụ campaign",
        disclosureText: "Được tài trợ",
        ctaText: "Tham gia",
        sponsorName: "Sponsor mẫu"
      }}
      placement={placementId}
    />
  );
}

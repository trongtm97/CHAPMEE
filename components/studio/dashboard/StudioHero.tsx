import Link from "next/link";
import { Card } from "@/components/ui";
import {
  studioPrimaryBtn,
  studioSecondaryBtn
} from "@/components/studio/dashboard/shared/styles";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { studioPath } from "@/lib/studio/constants";
import type { StudioAccountStatus, StudioHeroSummaryLine } from "@/types/creator";

type StudioHeroProps = {
  creatorProfile: CreatorProfile;
  accountStatus: StudioAccountStatus;
  heroSummary: StudioHeroSummaryLine[];
  writeChapterHref: string;
  writeActionLabel: string;
};

type StatusVariant = "success" | "warning" | "danger" | "default" | "cyan";

const statusTileClass: Record<StatusVariant, string> = {
  cyan: "border-cyan-300/25 bg-cyan-300/[0.06] text-cyan-200",
  danger: "border-red-400/25 bg-red-400/[0.06] text-red-300",
  default: "border-white/10 bg-white/[0.03] text-zinc-300",
  success: "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-300",
  warning: "border-amber-400/25 bg-amber-400/[0.06] text-amber-300"
};

function statusBadgeVariant(
  label: StudioAccountStatus["statusLabel"]
): StatusVariant {
  switch (label) {
    case "active":
      return "success";
    case "pending":
      return "warning";
    case "suspended":
      return "danger";
    case "limited":
      return "warning";
    default:
      return "default";
  }
}

function verificationBadgeVariant(
  label: StudioAccountStatus["verificationLabel"]
): StatusVariant {
  switch (label) {
    case "verified":
    case "blue_tick":
      return "success";
    case "pending":
      return "warning";
    default:
      return "default";
  }
}

function StatusTile({ label, variant }: { label: string; variant: StatusVariant }) {
  return (
    <div
      className={`flex items-center justify-center rounded-md border px-1.5 py-1 text-center text-[0.65rem] font-medium leading-tight ${statusTileClass[variant]}`}
    >
      <span className="line-clamp-1">{label}</span>
    </div>
  );
}

function SummaryTile({ line }: { line: StudioHeroSummaryLine }) {
  const inner = (
    <div className="flex items-center justify-between gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 transition hover:border-cyan-300/25 hover:bg-white/[0.04]">
      <span className="min-w-0 truncate text-[0.65rem] text-zinc-400">{line.label}</span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
        {line.value}
      </span>
    </div>
  );

  if (line.href) {
    return (
      <Link className="block" href={line.href}>
        {inner}
      </Link>
    );
  }

  return inner;
}

function HeroMetaBlock({ summaryItems, statusItems }: {
  statusItems: Array<{ id: string; label: string; variant: StatusVariant }>;
  summaryItems: StudioHeroSummaryLine[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1">
        {statusItems.map((item) => (
          <StatusTile key={item.id} label={item.label} variant={item.variant} />
        ))}
      </div>

      {summaryItems.length > 0 ? (
        <>
          <div aria-hidden className="border-t border-dashed border-white/10" />
          <div className="grid grid-cols-2 gap-1">
            {summaryItems.map((line) => (
              <SummaryTile key={line.id} line={line} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function StudioHero({
  accountStatus,
  creatorProfile,
  heroSummary,
  writeActionLabel,
  writeChapterHref
}: StudioHeroProps) {
  const monetizationLabel = accountStatus.monetizationEnabled
    ? "Kiếm tiền bật"
    : accountStatus.monetizationDisplay?.includes("chờ")
      ? "Kiếm tiền chờ duyệt"
      : "Chưa bật kiếm tiền";

  const statusItems: Array<{ id: string; label: string; variant: StatusVariant }> = [
    {
      id: "status",
      label: accountStatus.statusDisplay,
      variant: statusBadgeVariant(accountStatus.statusLabel)
    },
    {
      id: "verification",
      label: accountStatus.verificationDisplay,
      variant: verificationBadgeVariant(accountStatus.verificationLabel)
    },
    {
      id: "monetization",
      label: monetizationLabel,
      variant: "cyan"
    },
    {
      id: "quality",
      label: accountStatus.qualityDisplay,
      variant: accountStatus.qualityHasWarning ? "warning" : "success"
    }
  ];

  const summaryItems = heroSummary.slice(0, 4);

  return (
    <Card className="p-2.5 sm:p-4">
      {/* Mobile — lưới 2×2 đều nhau */}
      <div className="space-y-2 lg:hidden">
        <div className="grid grid-cols-2 gap-2">
          <Link className={`${studioPrimaryBtn} w-full`} href={writeChapterHref}>
            {writeActionLabel}
          </Link>
          <Link
            className={`${studioSecondaryBtn} w-full`}
            href={studioPath("/stories/new")}
          >
            Tạo truyện
          </Link>
        </div>

        <HeroMetaBlock statusItems={statusItems} summaryItems={summaryItems} />
      </div>

      {/* Desktop */}
      <div className="hidden flex-row items-center gap-6 lg:flex">
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h1 className="text-xl font-bold text-white">{creatorProfile.display_name}</h1>
            <p className="mt-0.5 text-sm text-zinc-400">
              Bàn làm việc Studio — viết, quản lý và theo dõi truyện.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link className={studioPrimaryBtn} href={writeChapterHref}>
              {writeActionLabel}
            </Link>
            <Link className={studioSecondaryBtn} href={studioPath("/stories/new")}>
              Tạo truyện
            </Link>
            <Link className={studioSecondaryBtn} href="/">
              Quay lại ChapMee
            </Link>
          </div>
        </div>

        <div className="w-[19.5rem] shrink-0 border-l border-white/10 pl-5">
          <HeroMetaBlock statusItems={statusItems} summaryItems={summaryItems} />
        </div>
      </div>
    </Card>
  );
}

type MedalTier = 1 | 2 | 3;

const MEDAL_CONFIG: Record<
  MedalTier,
  { label: string; ring: string; fill: string; glow?: string }
> = {
  1: {
    label: "Huy chương vàng, hạng 1",
    ring: "text-yellow-300",
    fill: "from-yellow-400/25 to-amber-500/10",
    glow: "shadow-[0_0_24px_rgba(250,204,21,0.22)]"
  },
  2: {
    label: "Huy chương bạc, hạng 2",
    ring: "text-zinc-200",
    fill: "from-zinc-300/20 to-zinc-500/10"
  },
  3: {
    label: "Huy chương đồng, hạng 3",
    ring: "text-orange-300",
    fill: "from-orange-400/20 to-amber-700/10"
  }
};

type MedalBadgeProps = {
  rank: MedalTier;
  className?: string;
  size?: "sm" | "md";
};

export function MedalBadge({ rank, className = "", size = "md" }: MedalBadgeProps) {
  const config = MEDAL_CONFIG[rank];
  const sizeClass = size === "sm" ? "size-7" : "size-9";

  return (
    <span
      aria-label={config.label}
      className={`inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br ${config.fill} ${config.glow ?? ""} ${className}`}
      role="img"
      title={config.label}
    >
      <svg
        aria-hidden="true"
        className={`${size === "sm" ? "size-4" : "size-5"} ${config.ring}`}
        viewBox="0 0 24 24"
      >
        <path
          d="M12 2.5 14.2 8.6 20.5 9.2 15.8 13.4 17.1 19.6 12 16.5 6.9 19.6 8.2 13.4 3.5 9.2 9.8 8.6 12 2.5Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function RankingRankMedal({
  rank,
  className = "",
  size = "md"
}: {
  rank: number;
  className?: string;
  size?: "sm" | "md";
}) {
  if (rank >= 1 && rank <= 3) {
    return <MedalBadge className={className} rank={rank as MedalTier} size={size} />;
  }

  const sizeClass = size === "sm" ? "size-7 text-xs" : "size-9 text-sm";

  return (
    <span
      aria-label={`Huy hiệu hạng ${rank}`}
      className={`inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 font-black text-cyan-100 ${className}`}
      role="img"
      title={`Hạng ${rank}`}
    >
      #{rank}
    </span>
  );
}

export function getMedalTierStyles(tier: "gold" | "silver" | "bronze" | "standard") {
  switch (tier) {
    case "gold":
      return {
        frame: "border-yellow-400/35 bg-gradient-to-br from-yellow-500/16 via-amber-500/8 to-transparent",
        accent: "text-yellow-200"
      };
    case "silver":
      return {
        frame: "border-zinc-300/25 bg-gradient-to-br from-zinc-300/12 via-zinc-400/6 to-transparent",
        accent: "text-zinc-200"
      };
    case "bronze":
      return {
        frame: "border-orange-400/30 bg-gradient-to-br from-orange-500/12 via-amber-700/6 to-transparent",
        accent: "text-orange-200"
      };
    default:
      return {
        frame: "border-cyan-300/20 bg-gradient-to-br from-cyan-400/10 via-sky-500/5 to-transparent",
        accent: "text-cyan-100"
      };
  }
}

export function getPodiumCardStyles(rank: MedalTier) {
  switch (rank) {
    case 1:
      return {
        wrapper:
          "border-yellow-400/40 bg-gradient-to-b from-yellow-500/12 via-amber-500/6 to-transparent shadow-[0_0_32px_rgba(250,204,21,0.12)]",
        rankText: "text-yellow-200"
      };
    case 2:
      return {
        wrapper:
          "border-zinc-300/25 bg-gradient-to-b from-zinc-300/10 via-zinc-400/5 to-transparent",
        rankText: "text-zinc-200"
      };
    case 3:
      return {
        wrapper:
          "border-orange-400/30 bg-gradient-to-b from-orange-500/10 via-amber-700/5 to-transparent",
        rankText: "text-orange-200"
      };
  }
}

/** Alias for unified rank medal component. */
export { RankingRankMedal as RankMedalIcon };

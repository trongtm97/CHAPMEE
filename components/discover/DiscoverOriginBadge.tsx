type DiscoverOriginBadgeProps = {
  contentOrigin?: "original" | "translation";
  rightsStatus?: string | null;
};

export function DiscoverOriginBadge({
  contentOrigin,
  rightsStatus
}: DiscoverOriginBadgeProps) {
  if (contentOrigin === "translation") {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          rightsStatus === "verified"
            ? "bg-emerald-400/15 text-emerald-100"
            : "bg-amber-400/15 text-amber-100"
        }`}
      >
        {rightsStatus === "verified" ? "Dịch có phép" : "Dịch · Miễn phí"}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-orange-400/15 px-2 py-0.5 text-[10px] font-semibold text-orange-100">
      Truyện sáng tác
    </span>
  );
}

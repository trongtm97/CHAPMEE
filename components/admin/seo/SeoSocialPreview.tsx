"use client";

type SeoSocialPreviewProps = {
  siteName?: string;
  url?: string | null;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
};

export function SeoSocialPreview({
  siteName = "ChapMee",
  url,
  title,
  description,
  imageUrl
}: SeoSocialPreviewProps) {
  const displayTitle = title?.trim() || "OG title";
  const displayDescription =
    description?.trim() || "OG description sẽ hiển thị khi share link.";
  const displayUrl = url?.trim() || "chapmee.vn";

  let hostname = displayUrl;
  try {
    hostname = new URL(displayUrl.startsWith("http") ? displayUrl : `https://${displayUrl}`)
      .hostname;
  } catch {
    hostname = displayUrl.replace(/^https?:\/\//, "").split("/")[0] ?? "chapmee.vn";
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-200">Social preview (Open Graph)</h3>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#18191a]">
        <div className="aspect-[1.91/1] bg-zinc-900">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-full w-full object-cover" src={imageUrl} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Chưa chọn OG image (media_assets)
            </div>
          )}
        </div>
        <div className="space-y-1 border-t border-white/10 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">{hostname}</p>
          <p className="line-clamp-2 text-base font-semibold text-zinc-100">{displayTitle}</p>
          <p className="line-clamp-2 text-sm text-zinc-400">{displayDescription}</p>
          <p className="text-[11px] text-zinc-600">{siteName}</p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { StoryImageThumb } from "@/components/common/StoryImageView";
import { contentCard, contentCardPad, contentCtaGhost } from "@/components/ui/content-card-styles";
import type { StoryWithImages } from "@/types/story-images";

type StoryRowCardProps = {
  href: string;
  story: StoryWithImages;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  footer?: ReactNode;
  ctaLabel?: string;
};

export function StoryRowCard({
  badge,
  ctaLabel = "Đọc ngay",
  footer,
  href,
  story,
  subtitle,
  title
}: StoryRowCardProps) {
  return (
    <Link className={`tap-highlight block ${contentCard} ${contentCardPad}`} href={href}>
      <div className="flex gap-2.5">
        <StoryImageThumb
          className="relative h-[3.1rem] w-[2.2rem] shrink-0 overflow-hidden rounded-md border border-white/8 bg-white/5"
          story={story}
          usage="catalogRow"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {subtitle ? (
                <p className="line-clamp-1 text-[0.62rem] font-medium text-zinc-500">
                  {subtitle}
                </p>
              ) : null}
              <h3
                className={`line-clamp-2 text-sm font-bold leading-snug text-white ${subtitle ? "mt-0.5" : ""}`}
              >
                {title}
              </h3>
            </div>
            {badge}
          </div>
          {footer ? <div className="mt-2">{footer}</div> : (
            <span className={`${contentCtaGhost} mt-2`}>{ctaLabel}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

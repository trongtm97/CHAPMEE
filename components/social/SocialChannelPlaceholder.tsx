import Link from "next/link";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import { PageHeading } from "@/components/seo/PageHeading";
import {
  getChapmeeSocialLink,
  getSocialPlaceholderCopy,
  type ChapmeeSocialPlatform
} from "@/lib/chapmee-social-links";

type SocialChannelPlaceholderProps = {
  platform: ChapmeeSocialPlatform;
};

export function SocialChannelPlaceholder({ platform }: SocialChannelPlaceholderProps) {
  const { title, description } = getSocialPlaceholderCopy(platform);
  const link = getChapmeeSocialLink(platform);

  return (
    <ResponsivePageContainer className="py-8">
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <header className="space-y-3">
          <p className="page-kicker">ChapMee</p>
          <PageHeading className="page-title">{title}</PageHeading>
          <p className="page-copy">{description}</p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-400">
          Kênh mạng xã hội đang được cập nhật. Bạn có thể liên hệ ChapMee qua trang Liên hệ trong
          lúc chờ đổi cấu hình URL chính thức cho {link.label}.
        </section>

        <nav className="flex flex-wrap justify-center gap-3 text-sm">
          <Link className="text-cyan-300 hover:text-cyan-200" href="/contact">
            Liên hệ
          </Link>
          <Link className="text-cyan-300 hover:text-cyan-200" href="/">
            Trang chủ
          </Link>
        </nav>
      </div>
    </ResponsivePageContainer>
  );
}

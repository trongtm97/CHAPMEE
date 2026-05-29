import { MonetizationOverviewCards } from "@/components/studio/MonetizationOverviewCards";
import { MonetizationStatusSection } from "@/components/studio/MonetizationStatusSection";
import { StoryMonetizationSettings } from "@/components/studio/StoryMonetizationSettings";
import { TipSettingsSection } from "@/components/studio/TipSettingsSection";
import Link from "next/link";
import { EmptyState, ErrorState } from "@/components/ui";
import type { StudioMonetizationPageData } from "@/types/studio-monetization";

type StudioMonetizationPageProps = {
  data: StudioMonetizationPageData;
};

export function StudioMonetizationPage({ data }: StudioMonetizationPageProps) {
  if (data.error) {
    return <ErrorState message={data.error} title="Không tải được kiếm tiền" />;
  }

  if (data.gateStatus === "disabled") {
    return (
      <EmptyState
        description="Liên hệ quản trị viên nếu bạn cần bật tính năng này cho tài khoản tác giả."
        title="ChapMee chưa bật tính năng kiếm tiền cho tài khoản của bạn."
      />
    );
  }

  return (
    <div className="space-y-8">
      <MonetizationOverviewCards config={data.config} overview={data.overview} />

      <MonetizationStatusSection
        eligibility={data.eligibility}
        gateStatus={data.gateStatus}
        profile={data.profile}
      />

      <section className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 sm:p-5">
        <h2 className="text-base font-bold text-sky-100">Doanh thu & rút tiền</h2>
        <p className="mt-2 text-sm text-sky-100/90">
          Xem số dư, lịch sử giao dịch, sổ cái và yêu cầu rút tiền tại trang Tài chính.
        </p>
        <Link
          className="mt-3 inline-block text-sm font-semibold text-sky-300 hover:text-sky-200"
          href="/studio/finance"
        >
          Mở Tài chính →
        </Link>
      </section>

      <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 sm:p-5">
        <h2 className="text-base font-bold text-amber-100">Lưu ý về kiếm tiền</h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-amber-100/90 whitespace-pre-line">
          {data.config.policyText}
        </div>
      </section>

      {data.canConfigure ? (
        <>
          <StoryMonetizationSettings
            canConfigure={data.canConfigure}
            config={data.config}
            stories={data.stories}
          />

          <TipSettingsSection
            canConfigure={data.canConfigure}
            profile={data.profile}
            tipsEnabled={data.config.tipsEnabled}
          />

          {data.config.payoutsEnabled ? (
            <p className="text-sm text-zinc-400">
              Rút tiền và mã PIN tại{" "}
              <Link className="font-semibold text-sky-300" href="/studio/finance">
                Tài chính
              </Link>
              .
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-zinc-500">
          Sau khi được duyệt kiếm tiền, bạn có thể cấu hình trả phí theo truyện và gửi yêu
          cầu rút tiền tại đây.
        </p>
      )}
    </div>
  );
}


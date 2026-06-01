import { getCreatorFeePolicyForStudio } from "@/lib/finance/resolve-creator-fee-policy";

type CreatorRevenuePolicyBoxProps = {
  creatorUserId: string;
};

export async function CreatorRevenuePolicyBox({ creatorUserId }: CreatorRevenuePolicyBoxProps) {
  const view = await getCreatorFeePolicyForStudio(creatorUserId);

  if (!view.hasOverride) {
    return (
      <section className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 sm:p-5">
        <h2 className="text-base font-bold text-sky-100">Chính sách doanh thu của bạn</h2>
        <p className="mt-2 text-sm leading-relaxed text-sky-100/90">{view.genericMessage}</p>
      </section>
    );
  }

  if (!view.showDetails) {
    return (
      <section className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 sm:p-5">
        <h2 className="text-base font-bold text-sky-100">Chính sách doanh thu của bạn</h2>
        <p className="mt-2 text-sm leading-relaxed text-sky-100/90">{view.genericMessage}</p>
      </section>
    );
  }

  const { resolved } = view;

  return (
    <section className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 sm:p-5">
      <h2 className="text-base font-bold text-sky-100">Chính sách doanh thu của bạn</h2>
      <p className="mt-1 text-xs text-sky-200/70">
        Thỏa thuận riêng với ChapMee — áp dụng cho giao dịch mới trong thời gian hiệu lực.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-sky-100/90">
        {resolved.policyName ? (
          <li>
            Chính sách: <span className="font-semibold text-white">{resolved.policyName}</span>
          </li>
        ) : null}
        <li>
          Bạn nhận{" "}
          <span className="font-semibold text-white">
            {resolved.creatorRevenueSharePercent}%
          </span>{" "}
          trên doanh thu gộp mỗi giao dịch.
        </li>
        <li>
          ChapMee giữ{" "}
          <span className="font-semibold text-white">{resolved.platformFeePercent}%</span>
          {" "}(hai tỉ lệ cộng lại = 100%).
        </li>
        {resolved.publicNote ? (
          <li className="list-none pl-0">
            <p className="mt-2 whitespace-pre-line rounded-lg border border-sky-400/20 bg-sky-950/40 px-3 py-2 text-xs text-sky-100/80">
              {resolved.publicNote}
            </p>
          </li>
        ) : null}
      </ul>
      <p className="mt-3 text-xs text-sky-200/60">
        Không còn phí ẩn — chỉ tỉ lệ ăn chia. Giao dịch cũ giữ nguyên tỷ lệ đã ghi nhận.
      </p>
    </section>
  );
}

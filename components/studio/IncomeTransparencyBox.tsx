import type { CreatorFinanceConfigView } from "@/types/finance";

type IncomeTransparencyBoxProps = {
  config: CreatorFinanceConfigView;
};

export function IncomeTransparencyBox({ config }: IncomeTransparencyBoxProps) {
  return (
    <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 sm:p-5">
      <h2 className="text-base font-bold text-emerald-100">Cách tính thu nhập</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-emerald-100/90">
        <li>
          Người đọc thanh toán bằng {config.coinDisplayName} theo giá bạn đặt trên truyện/chương
          hoặc qua tip.
        </li>
        <li>
          ChapMee quy đổi {config.coinDisplayName} sang VND theo tỷ lệ{" "}
          {config.coinToVndRate.toLocaleString("vi-VN")} ₫ / 1 {config.coinDisplayName} (do admin
          cấu hình).
        </li>
        <li>
          Nền tảng trừ phí {config.platformFeePercent}% (hoặc theo loại giao dịch); phần còn lại
          ghi nhận doanh thu tác giả khoảng {config.creatorRevenueSharePercent}% trên giao dịch
          trả phí.
        </li>
        <li>
          Số dư có thể rút = tiền NET đã trừ phí từng giao dịch, trừ các khoản đang giữ cho yêu
          cầu rút tiền. ChapMee không trừ lại phí nền tảng khi bạn gửi yêu cầu rút.
        </li>
        <li>
          Yêu cầu rút tiền
          {config.withdrawalReviewRequired
            ? " cần được kiểm tra"
            : " được ghi nhận"}
          ; ChapMee không tự chuyển tiền thật — admin xác nhận thanh toán thủ công.
        </li>
        {config.payoutProcessingDaysLabel ? (
          <li>Thời gian xử lý tham khảo: {config.payoutProcessingDaysLabel} làm việc.</li>
        ) : null}
      </ul>
      {config.policyNote ? (
        <p className="mt-3 text-xs text-emerald-200/70 whitespace-pre-line">{config.policyNote}</p>
      ) : null}
    </section>
  );
}

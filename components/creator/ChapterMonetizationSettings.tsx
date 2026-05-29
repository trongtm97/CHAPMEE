type ChapterMonetizationSettingsProps = {
  canMonetize: boolean;
  freeChaptersRequired: number;
  episodeNumber: number;
  defaultCoinPrice: number;
  minCoinPrice: number;
  maxCoinPrice: number;
  allowCustomPrice: boolean;
  defaultFreePreviewPercent: number;
  initialIsPaid: boolean;
  initialCoinPrice: number | null;
  initialFreePreviewEnabled: boolean;
  initialFreePreviewPercent: number | null;
  initialFreePreviewChars: number | null;
};

export function ChapterMonetizationSettings({
  canMonetize,
  freeChaptersRequired,
  episodeNumber,
  defaultCoinPrice,
  minCoinPrice,
  maxCoinPrice,
  allowCustomPrice,
  defaultFreePreviewPercent,
  initialIsPaid,
  initialCoinPrice,
  initialFreePreviewEnabled,
  initialFreePreviewPercent,
  initialFreePreviewChars
}: ChapterMonetizationSettingsProps) {
  const blockedByFreeRule = episodeNumber <= freeChaptersRequired;
  const disabled = !canMonetize || blockedByFreeRule;

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-sm font-semibold text-white">Monetization chương</p>
      {!canMonetize ? (
        <p className="text-sm text-amber-200">
          Bạn cần được duyệt kiếm tiền để bật chương trả phí.
        </p>
      ) : null}
      {blockedByFreeRule ? (
        <p className="text-sm text-zinc-300">
          {`Theo cấu hình admin, ${freeChaptersRequired} chương đầu phải miễn phí.`}
        </p>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-zinc-100">
        <input
          defaultChecked={initialIsPaid}
          disabled={disabled}
          name="is_paid"
          type="checkbox"
          value="true"
        />
        Bật chương trả phí
      </label>

      <label className="block text-sm text-zinc-300">
        Giá coin (để trống sẽ dùng mặc định: {defaultCoinPrice})
      </label>
      <input
        className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
        defaultValue={initialCoinPrice ?? ""}
        disabled={disabled || !allowCustomPrice}
        max={maxCoinPrice}
        min={minCoinPrice}
        name="coin_price"
        placeholder={String(defaultCoinPrice)}
        step={1}
        type="number"
      />

      <label className="flex items-center gap-2 text-sm text-zinc-100">
        <input
          defaultChecked={initialFreePreviewEnabled}
          disabled={disabled}
          name="free_preview_enabled"
          type="checkbox"
          value="true"
        />
        Bật đọc thử
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-zinc-300">
            % đọc thử (mặc định {defaultFreePreviewPercent}%)
          </label>
          <input
            className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
            defaultValue={initialFreePreviewPercent ?? ""}
            disabled={disabled}
            max={100}
            min={1}
            name="free_preview_percent"
            placeholder={String(defaultFreePreviewPercent)}
            step={1}
            type="number"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-300">Ký tự đọc thử tối thiểu</label>
          <input
            className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
            defaultValue={initialFreePreviewChars ?? ""}
            disabled={disabled}
            min={0}
            name="free_preview_chars"
            placeholder="300"
            step={10}
            type="number"
          />
        </div>
      </div>
    </div>
  );
}

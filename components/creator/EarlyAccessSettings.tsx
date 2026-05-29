type EarlyAccessSettingsProps = {
  canMonetize: boolean;
  allowCustomPrice: boolean;
  defaultCoinPrice: number;
  minCoinPrice: number;
  maxCoinPrice: number;
  maxEarlyAccessDays: number;
  defaultFreeAfterHours: number;
  initialEnabled: boolean;
  initialCoinPrice: number | null;
  initialFreeAt: string | null;
};

export function EarlyAccessSettings({
  canMonetize,
  allowCustomPrice,
  defaultCoinPrice,
  minCoinPrice,
  maxCoinPrice,
  maxEarlyAccessDays,
  defaultFreeAfterHours,
  initialEnabled,
  initialCoinPrice,
  initialFreeAt
}: EarlyAccessSettingsProps) {
  const defaultDateTime = initialFreeAt
    ? new Date(initialFreeAt).toISOString().slice(0, 16)
    : "";

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-sm font-semibold text-white">Early Access</p>
      {!canMonetize ? (
        <p className="text-sm text-amber-200">
          Bạn cần được duyệt kiếm tiền để bật đọc sớm.
        </p>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-zinc-100">
        <input
          defaultChecked={initialEnabled}
          disabled={!canMonetize}
          name="early_access_enabled"
          type="checkbox"
          value="true"
        />
        Bật Đọc sớm cho chapter này
      </label>

      <label className="block text-sm text-zinc-300">
        Giá coin (để trống sẽ dùng mặc định: {defaultCoinPrice})
      </label>
      <input
        className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
        defaultValue={initialCoinPrice ?? ""}
        disabled={!canMonetize || !allowCustomPrice}
        max={maxCoinPrice}
        min={minCoinPrice}
        name="early_access_coin_price"
        placeholder={String(defaultCoinPrice)}
        step={1}
        type="number"
      />

      <label className="block text-sm text-zinc-300">Thời điểm miễn phí (free_at)</label>
      <input
        className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
        defaultValue={defaultDateTime}
        disabled={!canMonetize}
        name="early_access_free_at"
        type="datetime-local"
      />

      <label className="block text-sm text-zinc-300">
        Hoặc số giờ miễn phí sau publish (mặc định {defaultFreeAfterHours}h)
      </label>
      <input
        className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
        disabled={!canMonetize}
        max={maxEarlyAccessDays * 24}
        min={1}
        name="early_access_free_after_hours"
        placeholder={String(defaultFreeAfterHours)}
        step={1}
        type="number"
      />
    </div>
  );
}

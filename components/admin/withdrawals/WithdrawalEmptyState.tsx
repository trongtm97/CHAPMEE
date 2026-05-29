export function WithdrawalEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
      <p className="text-lg font-semibold text-white">Chưa có yêu cầu rút tiền.</p>
      <p className="mt-2 text-sm text-zinc-400">
        Khi tác giả gửi yêu cầu rút tiền, yêu cầu sẽ xuất hiện tại đây.
      </p>
    </div>
  );
}

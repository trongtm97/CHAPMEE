export function RefundEmptyState({ onCreateManual }: { onCreateManual?: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl">
        ↩
      </div>
      <p className="text-lg font-semibold text-white">Chưa có yêu cầu hoàn tiền.</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
        Khi người dùng yêu cầu hoàn coin hoặc admin tạo hoàn thủ công, danh sách sẽ xuất hiện tại
        đây.
      </p>
      {onCreateManual ? (
        <button
          className="mt-6 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
          onClick={onCreateManual}
          type="button"
        >
          Tạo hoàn tiền thủ công
        </button>
      ) : null}
    </div>
  );
}

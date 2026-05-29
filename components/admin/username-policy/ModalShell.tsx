"use client";

export function ModalShell({
  title,
  children,
  onClose,
  wide
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button className="text-sm text-zinc-400 hover:text-white" onClick={onClose} type="button">
            Đóng
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

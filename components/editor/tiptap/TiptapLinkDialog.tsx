"use client";

type LinkDialogState = {
  url: string;
  label: string;
  newTab: boolean;
  nofollow: boolean;
};

type Props = {
  linkDialog: LinkDialogState;
  onCancel: () => void;
  onChange: (next: LinkDialogState) => void;
  onConfirm: () => void;
  showLabelField?: boolean;
};

export function TiptapLinkDialog({
  linkDialog,
  onCancel,
  onChange,
  onConfirm,
  showLabelField = false
}: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
      <p className="mb-3 text-sm font-medium text-white">Chèn link</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs text-zinc-400">URL</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(event) => onChange({ ...linkDialog, url: event.target.value })}
            placeholder="https:// hoặc /duong-dan-noi-bo"
            value={linkDialog.url}
          />
        </label>
        {showLabelField ? (
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs text-zinc-400">Nhãn hiển thị</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(event) => onChange({ ...linkDialog, label: event.target.value })}
              value={linkDialog.label}
            />
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            checked={linkDialog.newTab}
            onChange={(event) => onChange({ ...linkDialog, newTab: event.target.checked })}
            type="checkbox"
          />
          Mở tab mới
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            checked={linkDialog.nofollow}
            onChange={(event) => onChange({ ...linkDialog, nofollow: event.target.checked })}
            type="checkbox"
          />
          nofollow
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-zinc-950"
          onClick={onConfirm}
          type="button"
        >
          Chèn
        </button>
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300"
          onClick={onCancel}
          type="button"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

export type { LinkDialogState };

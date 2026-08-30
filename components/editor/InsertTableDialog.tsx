"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number, headerRow: boolean) => void;
};

const MAX_ROWS = 8;
const MAX_COLS = 8;

export function InsertTableDialog({ open, onClose, onInsert }: Props) {
  const [hover, setHover] = useState({ rows: 0, cols: 0 });
  const [headerRow, setHeaderRow] = useState(true);

  if (!open) {
    return null;
  }

  const preview =
    hover.rows > 0 && hover.cols > 0 ? `${hover.rows} hàng × ${hover.cols} cột` : "Di chuột để chọn kích thước";

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white">Chèn bảng</p>
        <button
          className="text-xs text-zinc-400 hover:text-zinc-200"
          onClick={onClose}
          type="button"
        >
          Đóng
        </button>
      </div>

      <p className="mb-3 text-xs text-zinc-400">{preview}</p>

      <div
        className="inline-grid gap-1 rounded-lg border border-white/10 bg-zinc-950 p-2"
        onMouseLeave={() => setHover({ rows: 0, cols: 0 })}
        style={{ gridTemplateColumns: `repeat(${MAX_COLS}, minmax(0, 1.25rem))` }}
      >
        {Array.from({ length: MAX_ROWS * MAX_COLS }, (_, index) => {
          const row = Math.floor(index / MAX_COLS) + 1;
          const col = (index % MAX_COLS) + 1;
          const active = row <= hover.rows && col <= hover.cols;

          return (
            <button
              aria-label={`${row} hàng ${col} cột`}
              className={`h-5 w-5 rounded-sm border transition ${
                active
                  ? "border-cyan-400/70 bg-cyan-500/30"
                  : "border-white/15 bg-white/5 hover:border-white/30"
              }`}
              onClick={() => {
                onInsert(row, col, headerRow);
                onClose();
              }}
              onMouseEnter={() => setHover({ rows: row, cols: col })}
              type="button"
            />
          );
        })}
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
        <input
          checked={headerRow}
          className="h-4 w-4 rounded border-white/20"
          onChange={(event) => setHeaderRow(event.target.checked)}
          type="checkbox"
        />
        Hàng đầu là tiêu đề cột
      </label>
    </div>
  );
}

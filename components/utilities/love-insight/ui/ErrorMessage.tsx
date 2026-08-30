interface ErrorMessageProps {
  message?: string | null;
  title?: string;
  className?: string;
}

/**
 * Box hiển thị lỗi tiếng Việt với tone đỏ/hồng nhẹ.
 * Nếu `message` rỗng / null / undefined → không render gì.
 */
export function ErrorMessage({ message, title, className }: ErrorMessageProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={`rounded-xl border border-love-rose-400/40 bg-love-rose-500/10 px-4 py-3 text-sm text-love-rose-100 ${className ?? ""}`.trim()}
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <p>{message}</p>
    </div>
  );
}

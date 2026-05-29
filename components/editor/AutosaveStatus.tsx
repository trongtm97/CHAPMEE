import type { AutosaveStatus } from "@/hooks/useAutosave";

type AutosaveStatusProps = {
  status: AutosaveStatus;
  lastSavedAt: string | null;
  errorMessage?: string | null;
};

function formatSavedAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
}

export function AutosaveStatusBar({
  errorMessage,
  lastSavedAt,
  status
}: AutosaveStatusProps) {
  let label = "Chưa có thay đổi";
  let tone = "text-zinc-500";

  switch (status) {
    case "saving":
      label = "Đang lưu...";
      tone = "text-amber-200";
      break;
    case "saved": {
      const savedLabel = formatSavedAt(lastSavedAt);
      label = savedLabel ? `Đã lưu lúc ${savedLabel}` : "Đã lưu";
      tone = "text-emerald-300";
      break;
    }
    case "error":
      label = errorMessage ?? "Lưu thất bại";
      tone = "text-rose-300";
      break;
    case "dirty":
      label = "Có thay đổi chưa lưu";
      tone = "text-amber-200";
      break;
    default:
      break;
  }

  return (
    <p
      aria-live="polite"
      className={`text-sm font-medium ${tone}`}
      role="status"
    >
      {label}
    </p>
  );
}

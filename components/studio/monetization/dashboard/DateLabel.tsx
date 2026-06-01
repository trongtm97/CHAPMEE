type DateLabelProps = {
  iso: string;
  variant?: "short" | "datetime";
};

export function DateLabel({ iso, variant = "short" }: DateLabelProps) {
  try {
    const formatted = new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...(variant === "datetime"
        ? { hour: "2-digit", minute: "2-digit" as const }
        : {})
    }).format(new Date(iso));
    return <time dateTime={iso}>{formatted}</time>;
  } catch {
    return <span>{iso}</span>;
  }
}

import Link from "next/link";

type AdminMetricCardProps = {
  label: string;
  value: number | null;
  sublabel?: string;
  href?: string;
  unavailable?: boolean;
};

function formatValue(value: number | null, unavailable?: boolean) {
  if (unavailable || value == null) {
    return "—";
  }
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function AdminMetricCard({
  label,
  value,
  sublabel,
  href,
  unavailable
}: AdminMetricCardProps) {
  const content = (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-4 transition hover:border-white/15 hover:bg-zinc-900/60">
      <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
        {formatValue(value, unavailable)}
      </p>
      <p className="mt-1 text-sm font-medium text-zinc-200">{label}</p>
      {sublabel ? <p className="mt-0.5 text-xs text-zinc-500">{sublabel}</p> : null}
      {unavailable ? (
        <p className="mt-1 text-xs text-zinc-500">Chưa có dữ liệu</p>
      ) : null}
    </div>
  );

  if (href && !unavailable) {
    return (
      <Link className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" href={href}>
        {content}
      </Link>
    );
  }

  return content;
}

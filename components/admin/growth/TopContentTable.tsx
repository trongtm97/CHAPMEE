import { Card } from "@/components/ui";

type TopContentTableProps = {
  title: string;
  subtitle: string;
  rows: Array<{ id: string; label: string; subLabel?: string | null; value: number }>;
  valueLabel?: string;
};

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

export function TopContentTable({
  title,
  subtitle,
  rows,
  valueLabel = "Value"
}: TopContentTableProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-base font-black text-white">{title}</p>
        <p className="text-sm text-zinc-400">{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-zinc-500">Chua co du lieu.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead className="bg-white/[0.02] text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Detail</th>
                <th className="px-4 py-3 font-semibold">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-t border-white/5" key={row.id}>
                  <td className="px-4 py-3 text-zinc-100">{row.label}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.subLabel ?? "-"}</td>
                  <td className="px-4 py-3 text-white">{formatNumber(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

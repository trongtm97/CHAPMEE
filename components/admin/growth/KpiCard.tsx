import { Card } from "@/components/ui";

type KpiCardProps = {
  label: string;
  value: number;
  helper?: string;
};

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

export function KpiCard({ label, value, helper }: KpiCardProps) {
  return (
    <Card className="space-y-1 p-4">
      <p className="text-2xl font-black text-white">{formatNumber(value)}</p>
      <p className="text-sm text-zinc-300">{label}</p>
      {helper ? <p className="text-xs text-zinc-500">{helper}</p> : null}
    </Card>
  );
}

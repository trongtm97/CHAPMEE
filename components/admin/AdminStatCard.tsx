import { Card } from "@/components/ui";

type AdminStatCardProps = {
  label: string;
  value: number;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function AdminStatCard({ label, value }: AdminStatCardProps) {
  return (
    <Card className="space-y-1">
      <p className="text-3xl font-bold text-white">{formatNumber(value)}</p>
      <p className="text-sm leading-6 text-zinc-400">{label}</p>
    </Card>
  );
}

import { Card } from "@/components/ui";

type StudioStatCardProps = {
  label: string;
  value: number | string;
  description?: string;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function StudioStatCard({
  description,
  label,
  value
}: StudioStatCardProps) {
  return (
    <Card className="space-y-2">
      <p className="text-2xl font-black tracking-normal text-white">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      <div>
        <p className="text-sm font-semibold text-zinc-200">{label}</p>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p>
        ) : null}
      </div>
    </Card>
  );
}

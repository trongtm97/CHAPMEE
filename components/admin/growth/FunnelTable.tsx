import { Card } from "@/components/ui";
import type { GrowthFunnelStep } from "@/types/growth";

type FunnelTableProps = {
  title: string;
  subtitle: string;
  steps: GrowthFunnelStep[];
};

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

export function FunnelTable({ title, subtitle, steps }: FunnelTableProps) {
  const firstStep = steps[0]?.value ?? 0;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-base font-black text-white">{title}</p>
        <p className="text-sm text-zinc-400">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="bg-white/[0.02] text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Step</th>
              <th className="px-4 py-3 font-semibold">Users</th>
              <th className="px-4 py-3 font-semibold">Drop from start</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step) => {
              const drop = firstStep > 0 ? (1 - step.value / firstStep) * 100 : 0;
              return (
                <tr className="border-t border-white/5" key={step.key}>
                  <td className="px-4 py-3 text-zinc-200">{step.label}</td>
                  <td className="px-4 py-3 text-white">{formatNumber(step.value)}</td>
                  <td className="px-4 py-3 text-zinc-300">{drop.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

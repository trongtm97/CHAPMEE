import { Card } from "@/components/ui";

type RiskDashboardProps = {
  openCount: number;
  highCriticalCount: number;
  payoutBlockedCount: number;
  suspiciousTransactions: number;
};

export function RiskDashboard({
  openCount,
  highCriticalCount,
  payoutBlockedCount,
  suspiciousTransactions
}: RiskDashboardProps) {
  const items = [
    { label: "Open risk events", value: openCount },
    { label: "High/Critical", value: highCriticalCount },
    { label: "Payout blocked creators", value: payoutBlockedCount },
    { label: "Suspicious transactions", value: suspiciousTransactions }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card className="space-y-1" key={item.label}>
          <p className="text-xs uppercase tracking-wide text-zinc-400">{item.label}</p>
          <p className="text-2xl font-black text-white">{item.value}</p>
        </Card>
      ))}
    </div>
  );
}

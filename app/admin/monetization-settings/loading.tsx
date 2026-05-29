import { Card } from "@/components/ui";

export default function MonetizationSettingsLoading() {
  return (
    <section className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded-lg bg-white/10" />
      <div className="h-4 w-96 max-w-full rounded bg-white/5" />
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-48 bg-white/[0.02]">
            <span className="sr-only">Đang tải…</span>
          </Card>
        ))}
      </div>
    </section>
  );
}

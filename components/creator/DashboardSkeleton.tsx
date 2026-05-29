import { Card } from "@/components/ui";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse" role="status">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-white/8" />
        <div className="h-8 w-56 rounded bg-white/8" />
        <div className="h-4 w-72 rounded bg-white/8" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="space-y-2">
            <div className="h-3 w-12 rounded bg-white/8" />
            <div className="h-8 w-20 rounded bg-white/8" />
            <div className="h-3 w-16 rounded bg-white/8" />
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <div className="h-5 w-40 rounded bg-white/8" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="space-y-3">
              <div className="h-5 w-3/4 rounded bg-white/8" />
              <div className="flex gap-4">
                <div className="h-4 w-16 rounded bg-white/8" />
                <div className="h-4 w-16 rounded bg-white/8" />
                <div className="h-4 w-16 rounded bg-white/8" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <span className="sr-only">Đang tải dashboard...</span>
    </div>
  );
}

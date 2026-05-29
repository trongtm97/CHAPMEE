import { RankingSkeleton } from "@/components/rankings/RankingSkeleton";

export default function RankingsLoading() {
  return (
    <section className="page-stack space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
      <RankingSkeleton count={8} />
    </section>
  );
}

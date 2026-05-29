export default function AdminCommunityLoading() {
  return (
    <section className="mx-auto max-w-[1320px] space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded bg-zinc-800/80" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="h-20 animate-pulse rounded-xl bg-zinc-900/60" key={i} />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-zinc-900/40" />
    </section>
  );
}

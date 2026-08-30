function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} />;
}

export function ReaderPageSkeleton() {
  return (
    <main className="reader-page mx-auto w-full max-w-[90rem] px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:px-6 lg:pb-10">
      <div className="mx-auto w-full max-w-[42rem] space-y-6 py-4">
        <div className="space-y-3 border-b border-white/[0.06] pb-5">
          <Pulse className="h-4 w-28" />
          <Pulse className="h-8 w-4/5" />
          <Pulse className="h-4 w-56" />
        </div>
        <article className="space-y-4" aria-label="Dang tai chuong">
          {Array.from({ length: 10 }).map((_, index) => (
            <div className="space-y-2" key={index}>
              <Pulse className="h-4 w-full" />
              <Pulse className="h-4 w-[92%]" />
              <Pulse className="h-4 w-[78%]" />
            </div>
          ))}
        </article>
        <div className="grid gap-2 sm:grid-cols-2">
          <Pulse className="h-11 rounded-full" />
          <Pulse className="h-11 rounded-full" />
        </div>
      </div>
    </main>
  );
}

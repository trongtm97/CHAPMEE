import { CommunityPostCardSkeleton } from "@/components/community/CommunityPostCardSkeleton";

function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} />;
}

export function DiscoverPageSkeleton() {
  return (
    <section className="page-stack space-y-4 pb-2 md:hidden">
      <Pulse className="h-11 w-full rounded-full" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <Pulse className="h-9 w-24 shrink-0 rounded-full" key={index} />
        ))}
      </div>
      <div className="space-y-2">
        <Pulse className="h-4 w-28" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <Pulse className="h-44 w-32 shrink-0 rounded-2xl" key={index} />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Pulse className="h-4 w-36" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Pulse className="h-20 w-full rounded-2xl" key={index} />
        ))}
      </div>
    </section>
  );
}

export function ReelsPageSkeleton() {
  return (
    <section className="relative flex h-[calc(100dvh-6.5rem)] min-h-[24rem] flex-col overflow-hidden bg-[#06090d] md:h-[calc(100dvh-4rem)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.16),transparent_24%)]"
      />
      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <Pulse className="aspect-[3/4] w-full max-w-sm rounded-[1.75rem]" />
        <div className="flex w-full max-w-sm gap-3">
          <Pulse className="h-11 flex-1 rounded-full" />
          <Pulse className="h-11 w-11 rounded-full" />
          <Pulse className="h-11 w-11 rounded-full" />
        </div>
      </div>
    </section>
  );
}

export function MePageSkeleton() {
  return (
    <section className="page-stack space-y-4 pb-4 md:hidden">
      <div className="flex items-center gap-4">
        <Pulse className="h-16 w-16 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Pulse className="h-5 w-40" />
          <Pulse className="h-4 w-28" />
          <Pulse className="h-3 w-full max-w-xs" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Pulse className="h-14 rounded-xl" key={index} />
        ))}
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <Pulse className="h-9 w-20 shrink-0 rounded-full" key={index} />
        ))}
      </div>
      <div className="space-y-3">
        <Pulse className="h-4 w-32" />
        <Pulse className="h-28 w-full rounded-2xl" />
        <Pulse className="h-28 w-full rounded-2xl" />
      </div>
    </section>
  );
}

export function TruyenPageSkeleton() {
  return (
    <section className="page-stack space-y-4">
      <Pulse className="h-8 w-48" />
      <Pulse className="h-11 w-full max-w-md rounded-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Pulse className="h-36 rounded-2xl" key={index} />
        ))}
      </div>
    </section>
  );
}

export function CommunityTabSkeleton() {
  return (
    <div className="space-y-2">
      <CommunityPostCardSkeleton />
      <CommunityPostCardSkeleton />
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[1320px] space-y-5 p-4 lg:p-6">
      <div className="space-y-2 border-b border-white/10 pb-5">
        <Pulse className="h-4 w-28" />
        <Pulse className="h-8 w-64" />
        <Pulse className="h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Pulse className="h-24 rounded-xl" key={index} />
        ))}
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <Pulse className="h-10 w-32 shrink-0 rounded-full" key={index} />
        ))}
      </div>
      <Pulse className="h-80 rounded-xl" />
    </section>
  );
}

export function StudioPageSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[1280px] space-y-5 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Pulse className="h-7 w-56" />
          <Pulse className="h-4 w-full max-w-xl" />
        </div>
        <Pulse className="h-10 w-28 rounded-full" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Pulse className="h-28 rounded-xl" key={index} />
        ))}
      </div>
      <Pulse className="h-72 rounded-xl" />
    </section>
  );
}

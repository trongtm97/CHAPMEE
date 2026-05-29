import { Badge } from "@/components/ui";
import type { ShareCardPayload } from "@/types/share";

export function ShareProfileCard({ payload }: { payload: ShareCardPayload }) {
  const stats = payload.stats ?? [];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--surface)] shadow-[0_24px_50px_rgba(0,0,0,0.32)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.18),transparent_24%),linear-gradient(180deg,#0a1220,#05070d)] sm:aspect-[9/16]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_30%)]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(8,12,18,0.55),transparent)]" />
        <div className="relative flex h-full flex-col justify-between p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <Badge className="bg-black/25 text-[0.62rem] text-white backdrop-blur-md">ChapMee</Badge>
            <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[0.64rem] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              {payload.kind === "profile" ? "Profile share" : "Achievement share"}
            </span>
          </div>

          <div className="space-y-4 rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,10,15,0.24),rgba(7,10,15,0.82))] p-4 backdrop-blur-md sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/[0.06] sm:h-16 sm:w-16">
                {payload.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="h-full w-full object-cover" src={payload.avatarUrl} />
                ) : (
                  <span className="text-lg font-black text-cyan-200 sm:text-xl">C</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-cyan-200 sm:text-[0.72rem]">
                  {payload.kind === "profile" ? "Reader / Author profile" : "Achievement"}
                </p>
                <h2 className="mt-1 text-balance text-[1.55rem] font-black leading-[1.04] text-white sm:text-[1.9rem]">
                  {payload.title}
                </h2>
              </div>
            </div>

            {payload.bio ? (
              <p className="line-clamp-3 text-[0.92rem] leading-7 text-zinc-100 sm:text-[0.96rem]">{payload.bio}</p>
            ) : null}
            {payload.text ? (
              <p className="line-clamp-4 text-[0.92rem] leading-7 text-zinc-200 sm:text-[0.96rem]">{payload.text}</p>
            ) : null}

            {stats.length ? (
              <div className="grid grid-cols-2 gap-2">
                {stats.slice(0, 4).map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                    <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-zinc-400 sm:text-[0.62rem]">{stat.label}</p>
                    <p className="mt-1 break-words text-base font-black leading-tight text-white sm:text-lg">{stat.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-sm font-semibold text-zinc-200">
                {payload.ctaLabel ?? (payload.kind === "profile" ? "Xem gu đọc / hồ sơ" : "Theo dõi thành tích")}
              </span>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">ChapMee</span>
            </div>
          </div>

          <p className="text-center text-[0.62rem] font-bold uppercase tracking-[0.24em] text-zinc-500 sm:text-[0.65rem]">Made with ChapMee</p>
        </div>
      </div>
    </div>
  );
}

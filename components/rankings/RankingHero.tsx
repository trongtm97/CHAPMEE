import { formatRankingSnapshotTime } from "@/lib/ranking/ranking-ui-utils";



type RankingHeroProps = {

  snapshotAt?: string | null;

  totalCount?: number;

};



export function RankingHero({ snapshotAt, totalCount = 0 }: RankingHeroProps) {

  return (

    <section className="relative overflow-hidden rounded-2xl border border-yellow-400/15 bg-[var(--surface)] px-4 py-5 sm:px-6 sm:py-6">

      <div

        aria-hidden="true"

        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(250,204,21,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(34,211,238,0.08),transparent_50%)]"

      />

      <div className="relative space-y-3">

        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-yellow-200/90">

          Vinh danh

        </p>

        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">

          Bảng xếp hạng

        </h1>

        <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-[0.95rem]">

          Những truyện, tác giả và nội dung đang được cộng đồng ChapMee yêu thích.

        </p>



        {(snapshotAt || totalCount > 0) && (

          <div className="flex flex-wrap gap-2 pt-1">

            {snapshotAt ? (

              <MiniStat label="Cập nhật gần nhất" value={formatRankingSnapshotTime(snapshotAt)} />

            ) : null}

            {totalCount > 0 ? (

              <MiniStat label="Tác phẩm được ghi nhận" value={String(totalCount)} />

            ) : null}

          </div>

        )}

      </div>

    </section>

  );

}



function MiniStat({ label, value }: { label: string; value: string }) {

  return (

    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">

      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">

        {label}

      </p>

      <p className="mt-0.5 text-sm font-bold text-zinc-100">{value}</p>

    </div>

  );

}



import Link from "next/link";



type RecommendedRankingEmptyStateProps = {

  boostFeatureEnabled?: boolean;

};



export function RecommendedRankingEmptyState({

  boostFeatureEnabled = true

}: RecommendedRankingEmptyStateProps) {

  if (!boostFeatureEnabled) {

    return (

      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 sm:px-8">

        <div className="mx-auto max-w-md text-center">

          <h2 className="text-lg font-black text-white">Tính năng đề cử chưa mở</h2>

          <p className="mt-2 text-sm leading-6 text-zinc-400">

            Bảng xếp hạng sẽ hiển thị khi Phiếu đề cử được bật trên môi trường này.

          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">

            <Link

              className="inline-flex min-h-11 items-center justify-center rounded-full bg-amber-300 px-5 text-sm font-bold text-zinc-950"

              href="/bang-xep-hang"

            >

              Bảng xếp hạng khác

            </Link>

            <Link

              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-bold text-zinc-100"

              href="/truyen"

            >

              Khám phá truyện

            </Link>

          </div>

        </div>

      </div>

    );

  }



  return (

    <div className="rounded-2xl border border-dashed border-amber-400/20 bg-gradient-to-b from-amber-500/[0.06] to-transparent px-5 py-8 sm:px-8">

      <div className="mx-auto max-w-md text-center">

        <div

          aria-hidden="true"

          className="mx-auto flex size-12 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/10 text-amber-200"

        >

          <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">

            <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />

          </svg>

        </div>

        <h2 className="mt-4 text-lg font-black text-white">Chưa có truyện nào được đề cử</h2>

        <p className="mt-2 text-sm leading-6 text-zinc-400">

          Hãy dùng Phiếu đề cử để ủng hộ truyện bạn yêu thích. Bạn có thể nhận Phiếu đề cử khi

          nạp Coin, đọc truyện hoặc tham gia các hoạt động trên ChapMee.

        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">

          <Link

            className="inline-flex min-h-11 items-center justify-center rounded-full bg-amber-300 px-5 text-sm font-bold text-zinc-950 transition hover:bg-amber-200"

            href="/truyen"

          >

            Khám phá truyện

          </Link>

          <Link

            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-5 text-sm font-bold text-zinc-100 transition hover:border-white/25"

            href="/reels"

          >

            Lướt Reels

          </Link>

          <Link

            className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-400/30 px-5 text-sm font-bold text-amber-200"

            href="/coin/checkout"

          >

            Nạp Coin nhận thêm phiếu

          </Link>

        </div>

      </div>

    </div>

  );

}



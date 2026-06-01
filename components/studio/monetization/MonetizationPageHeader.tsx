"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

type MonetizationPageHeaderProps = {
  canConfigure: boolean;
};

export function MonetizationPageHeader({ canConfigure }: MonetizationPageHeaderProps) {
  return (
    <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-950 to-cyan-950/20 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300/80">
            Studio · Kiếm tiền
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Kiếm tiền</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Quản lý doanh thu, giá truyện, giá chương và yêu cầu rút tiền.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link className="w-full sm:w-auto" href="/studio/finance">
            <Button
              className="!min-h-11 w-full !normal-case sm:w-auto"
              type="button"
              variant="primary"
            >
              Mở tài chính
            </Button>
          </Link>
          <Link className="w-full sm:w-auto" href="/studio/finance">
            <Button
              className="!min-h-11 w-full border-sky-400/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15 sm:w-auto"
              type="button"
              variant="secondary"
            >
              Lịch sử giao dịch
            </Button>
          </Link>
          {canConfigure ? (
            <a className="w-full sm:w-auto" href="#monetization-workspace">
              <Button
                className="!min-h-11 w-full !normal-case sm:w-auto"
                type="button"
                variant="ghost"
              >
                Cài đặt trả phí
              </Button>
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui";
import { COIN_ADMIN_COPY } from "@/components/admin/coin-form-copy";

type AdminCoinsPageHeaderProps = {
  canExport: boolean;
  onExport?: () => void;
  exporting?: boolean;
};

export function AdminCoinsPageHeader({
  canExport,
  onExport,
  exporting
}: AdminCoinsPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-white">Quản lý coin</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          {COIN_ADMIN_COPY.pageSubtitle}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canExport ? (
          <Button disabled={exporting} onClick={onExport} type="button" variant="ghost">
            {exporting ? "Đang xuất…" : "Xuất lịch sử coin"}
          </Button>
        ) : null}
        <Link href="/admin/monetization">
          <Button type="button" variant="ghost">
            Xem cấu hình coin
          </Button>
        </Link>
        <Link href="/admin/audit?action=coin_grant">
          <Button type="button" variant="ghost">
            Nhật ký audit
          </Button>
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { MonetizationSettingsDashboard } from "@/components/admin/MonetizationSettingsDashboard";
import { AdMonetizationSettingsHub } from "@/components/admin/monetization/AdMonetizationSettingsHub";
import type { CreatorFeeOverrideStats } from "@/lib/admin/get-creator-fee-override-stats";
import type { MonetizationAuditLogEntry } from "@/lib/admin/get-monetization-audit-logs";
import type { MonetizationSettingsPermissions } from "@/lib/auth/monetization-settings-permissions";
import type { AdMonetizationOverview, CreatorAdPolicyAuditLog } from "@/types/admin-ad-monetization-settings";
import type { CoinTopupPackage } from "@/types/topup-package";
import type { MonetizationSettingsMap } from "@/types/monetization";
import type { PaymentProviderSetting } from "@/types/payment";

type MonetizationSettingsShellProps = {
  initialSettings: MonetizationSettingsMap;
  updatedAt: string | null;
  auditLogs: MonetizationAuditLogEntry[];
  overrideStats: CreatorFeeOverrideStats;
  topupPackages: CoinTopupPackage[];
  permissions: MonetizationSettingsPermissions;
  adOverview: AdMonetizationOverview;
  adAuditLogs: CreatorAdPolicyAuditLog[];
  sepaySetting: PaymentProviderSetting | null;
};

type MainTab = "coin" | "ads";

export function MonetizationSettingsShell(props: MonetizationSettingsShellProps) {
  const [mainTab, setMainTab] = useState<MainTab>("coin");

  const {
    initialSettings,
    updatedAt,
    auditLogs,
    overrideStats,
    topupPackages,
    permissions,
    adOverview,
    adAuditLogs,
    sepaySetting
  } = props;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Cấu hình kiếm tiền</h1>
        <p className="text-sm text-zinc-400">
          Xu, thanh toán, chia doanh thu, rút tiền và quảng cáo — một trang quản trị tập trung.
        </p>
      </header>

      <nav
        aria-label="Khu cấu hình kiếm tiền"
        className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-1.5"
      >
        <button
          className={`flex-1 min-w-[140px] rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            mainTab === "coin"
              ? "bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-400/35"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          onClick={() => setMainTab("coin")}
          type="button"
        >
          Xu & nền tảng
        </button>
        <button
          className={`flex-1 min-w-[140px] rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            mainTab === "ads"
              ? "bg-violet-400/15 text-violet-100 ring-1 ring-violet-400/35"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          onClick={() => setMainTab("ads")}
          type="button"
        >
          Quảng cáo & chia sẻ
        </button>
      </nav>

      {mainTab === "coin" ? (
        <MonetizationSettingsDashboard
          auditLogs={auditLogs}
          initialSettings={initialSettings}
          overrideStats={overrideStats}
          permissions={permissions}
          sepaySetting={sepaySetting}
          topupPackages={topupPackages}
          updatedAt={updatedAt}
        />
      ) : (
        <AdMonetizationSettingsHub
          auditLogs={adAuditLogs}
          initialOverview={adOverview}
          permissions={permissions}
        />
      )}
    </div>
  );
}

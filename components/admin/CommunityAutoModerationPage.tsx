"use client";

import Link from "next/link";
import { AutoModerationDecisionLog } from "@/components/admin/AutoModerationDecisionLog";
import { AutoModerationSettingsForm } from "@/components/admin/AutoModerationSettingsForm";
import { ModerationKeywordRulesTable } from "@/components/admin/ModerationKeywordRulesTable";
import { reasonCodeLabel } from "@/lib/community/auto-moderation-labels";
import type { AutoModerationPageData } from "@/types/community-auto-moderation";

type CommunityAutoModerationPageProps = {
  data: AutoModerationPageData;
  canEdit: boolean;
};

export function CommunityAutoModerationPage({
  data,
  canEdit
}: CommunityAutoModerationPageProps) {
  const { stats } = data;

  return (
    <section className="mx-auto max-w-[1320px] space-y-8">
      <div>
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin/community"
        >
          ← Quản trị cộng đồng
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Duyệt tự động</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Rule engine minh bạch, không dùng AI. User uy tín được tự duyệt; nội dung
          rủi ro vào hàng đợi hoặc bị chặn.
        </p>
      </div>

      {data.error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {data.error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-2xl font-bold text-white">{stats.autoApproved24h}</p>
          <p className="text-xs text-zinc-400">Tự động duyệt (24h)</p>
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-2xl font-bold text-white">{stats.needsReview24h}</p>
          <p className="text-xs text-zinc-400">Vào hàng đợi (24h)</p>
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-2xl font-bold text-white">{stats.autoRejected24h}</p>
          <p className="text-xs text-zinc-400">Tự động từ chối/ẩn (24h)</p>
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-2xl font-bold text-white">{stats.rateLimited24h}</p>
          <p className="text-xs text-zinc-400">Bị giới hạn đăng (24h)</p>
        </div>
      </div>

      {stats.topReasons.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold text-zinc-300">Lý do vào queue (24h)</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {stats.topReasons.map((r) => (
              <li
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400"
                key={r.code}
              >
                {reasonCodeLabel(r.code)} ({r.count})
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AutoModerationSettingsForm canEdit={canEdit} initial={data.settings} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Từ khóa</h2>
        <p className="text-xs text-zinc-500">
          Block = từ chối/ẩn ngay. Review = chờ duyệt. Allow = miễn trừ domain/từ
          trong allowlist.
        </p>
        <ModerationKeywordRulesTable canEdit={canEdit} rules={data.keywordRules} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Log quyết định gần đây</h2>
        <AutoModerationDecisionLog items={data.recentDecisions} />
      </section>
    </section>
  );
}

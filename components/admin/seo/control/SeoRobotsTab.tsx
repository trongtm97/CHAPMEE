"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRobotsPreviewAction } from "@/lib/admin/seo-control-data";

export function SeoRobotsTab() {
  const [preview, setPreview] = useState<string>("Đang tải preview…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getRobotsPreviewAction()
      .then(setPreview)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Không tải được robots preview.");
      });
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Preview robots.txt</h2>
          <Link
            className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            href="/robots.txt"
            rel="noopener noreferrer"
            target="_blank"
          >
            Mở file →
          </Link>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-300">{error}</p>
        ) : (
          <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-zinc-950 p-4 text-xs text-zinc-300">
            {preview}
          </pre>
        )}

        <p className="mt-4 text-sm text-zinc-400">
          Mặc định chặn: /admin, /studio, /settings, /me, /messages, /notifications, /wallet, /coin,
          /api, /login, /register. Không chặn /reels, /discover, /truyen, /@username, /bai-viet.
        </p>
      </section>

      <section className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5">
        <h3 className="font-semibold text-amber-100">Cảnh báo</h3>
        <p className="mt-2 text-sm text-zinc-300">
          Nếu robots disallow trùng với route indexable, tab Audit SEO sẽ báo lỗi. Chỉnh rule trong tab
          Quy tắc SEO hoặc cập nhật robots config khi có editor đầy đủ.
        </p>
      </section>
    </div>
  );
}

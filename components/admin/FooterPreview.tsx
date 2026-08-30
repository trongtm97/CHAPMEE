"use client";

import { FooterView } from "@/components/layout/footer-view";
import type { FooterConfig } from "@/lib/settings/footer-config";

type FooterPreviewProps = {
  config: FooterConfig;
};

export function FooterPreview({ config }: FooterPreviewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#06090d]">
      <p className="border-b border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Xem trước
      </p>
      <FooterView className="!border-0" config={config} preview />
    </div>
  );
}

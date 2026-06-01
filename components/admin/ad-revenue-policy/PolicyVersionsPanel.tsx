"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { CreatorAdPolicyVersion } from "@/types/creator-ad-policy-version";
import { CREATOR_AD_POLICY_STATUS_LABELS } from "@/types/creator-ad-revenue-policy";

type PolicyVersionsPanelProps = {
  versions: CreatorAdPolicyVersion[];
  readOnly: boolean;
  onRestored: (policyText: string, version: string) => void;
  onVersionsChange: (versions: CreatorAdPolicyVersion[]) => void;
};

export function PolicyVersionsPanel({
  versions,
  readOnly,
  onRestored,
  onVersionsChange
}: PolicyVersionsPanelProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    const res = await fetch("/api/admin/ad-revenue-policy/versions");
    const json = (await res.json()) as { versions?: CreatorAdPolicyVersion[] };
    if (json.versions) onVersionsChange(json.versions);
  };

  const saveDraft = async () => {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ad-revenue-policy/versions", { method: "POST" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(json.error ?? "Lưu bản nháp thất bại.");
        return;
      }
      setMessage("Đã lưu snapshot bản nháp.");
      await refresh();
    } finally {
      setPending(false);
    }
  };

  const restore = async (id: string) => {
    if (!confirm("Khôi phục nội dung chính sách từ phiên bản này? Trạng thái sẽ về nháp.")) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/ad-revenue-policy/versions/${id}/restore`, {
        method: "POST"
      });
      const json = (await res.json()) as {
        policy?: { policy_text?: string; policy_version?: string };
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error ?? "Khôi phục thất bại.");
        return;
      }
      if (json.policy?.policy_text) {
        onRestored(json.policy.policy_text, json.policy.policy_version ?? "1.0");
      }
      setMessage("Đã khôi phục nội dung từ phiên bản.");
      await refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Lịch sử phiên bản</h3>
        <div className="flex gap-2">
          <Button disabled={readOnly || pending} onClick={() => void saveDraft()} type="button" variant="secondary">
            Lưu snapshot nháp
          </Button>
          <Button disabled={pending} onClick={() => void refresh()} type="button" variant="secondary">
            Làm mới
          </Button>
        </div>
      </div>
      {message ? <p className="text-xs text-zinc-400">{message}</p> : null}
      <div className="max-h-48 overflow-y-auto space-y-2">
        {versions.map((v) => (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
            key={v.id}
          >
            <div>
              <span className="font-mono text-cyan-300">v{v.version}</span>
              <span className="mx-2 text-zinc-600">·</span>
              <span className="text-zinc-400">
                {CREATOR_AD_POLICY_STATUS_LABELS[v.status] ?? v.status}
              </span>
              {v.published_at ? (
                <span className="ml-2 text-xs text-zinc-500">
                  {new Date(v.published_at).toLocaleString("vi-VN")}
                </span>
              ) : null}
            </div>
            {!readOnly ? (
              <Button disabled={pending} onClick={() => void restore(v.id)} type="button" variant="secondary">
                Khôi phục
              </Button>
            ) : null}
          </div>
        ))}
        {versions.length === 0 ? (
          <p className="text-xs text-zinc-500">Chưa có phiên bản lưu — xuất bản hoặc lưu snapshot để tạo.</p>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { CreatorFeePolicyPreview } from "@/components/admin/creator-fee-policies/CreatorFeePolicyPreview";
import { createCreatorFeePolicyAction } from "@/lib/admin/create-creator-fee-policy";
import { updateCreatorFeePolicyAction } from "@/lib/admin/update-creator-fee-policy";
import {
  CREATOR_FEE_CREATOR_TYPE_LABELS,
  CREATOR_FEE_REVENUE_SOURCES
} from "@/lib/admin/creator-fee-policies/constants";
import type {
  CreatorFeePolicyCreatorType,
  CreatorFeePolicyRow,
  CreatorFeeSourceRates
} from "@/types/creator-fee-policy";

type Props = {
  creatorId: string;
  editing?: CreatorFeePolicyRow | null;
  defaultRates: CreatorFeeSourceRates;
  onSuccess: () => void;
  onCancel?: () => void;
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreatorFeePolicyEditor({
  creatorId,
  editing,
  defaultRates,
  onSuccess,
  onCancel
}: Props) {
  const [policyName, setPolicyName] = useState(editing?.policy_name ?? "");
  const [creatorType, setCreatorType] = useState<CreatorFeePolicyCreatorType | "">(
    editing?.creator_type ?? ""
  );
  const [contractRef, setContractRef] = useState(editing?.contract_ref ?? "");
  const [startsAt, setStartsAt] = useState(
    toDatetimeLocal(editing?.starts_at) || toDatetimeLocal(new Date().toISOString())
  );
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(editing?.ends_at));
  const [note, setNote] = useState(editing?.note ?? "");
  const [publicNote, setPublicNote] = useState(editing?.public_note ?? "");
  const [showDetails, setShowDetails] = useState(editing?.show_details_to_creator !== false);
  const [sourceRates, setSourceRates] = useState<CreatorFeeSourceRates>(() => {
    if (editing?.source_rates) return { ...editing.source_rates };
    if (editing?.creator_revenue_share_percent != null) {
      return {
        paid_chapter: {
          author_percent: editing.creator_revenue_share_percent,
          platform_percent:
            editing.platform_fee_percent ??
            Math.max(0, 100 - editing.creator_revenue_share_percent)
        }
      };
    }
    return {};
  });
  const [bulkAuthor, setBulkAuthor] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOverlap, setConfirmOverlap] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dirty = useMemo(() => {
    return Boolean(policyName || note || Object.keys(sourceRates).length);
  }, [policyName, note, sourceRates]);

  function setRate(sourceId: string, field: "author_percent" | "platform_percent", value: string) {
    const n = value.trim() === "" ? NaN : Number(value);
    setSourceRates((prev) => {
      const current = prev[sourceId as keyof CreatorFeeSourceRates] ?? {
        author_percent: 0,
        platform_percent: 0
      };
      const next = { ...current, [field]: n };
      if (field === "author_percent" && Number.isFinite(n)) {
        next.platform_percent = Math.max(0, 100 - n);
      }
      if (field === "platform_percent" && Number.isFinite(n)) {
        next.author_percent = Math.max(0, 100 - n);
      }
      return { ...prev, [sourceId]: next };
    });
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[sourceId];
      return copy;
    });
  }

  function useDefault(sourceId: string) {
    const def = defaultRates[sourceId as keyof CreatorFeeSourceRates];
    if (!def) return;
    setSourceRates((prev) => ({ ...prev, [sourceId]: { ...def } }));
  }

  function clearSource(sourceId: string) {
    setSourceRates((prev) => {
      const copy = { ...prev };
      delete copy[sourceId as keyof CreatorFeeSourceRates];
      return copy;
    });
  }

  function applyBulkRate() {
    const author = Number(bulkAuthor);
    if (!Number.isFinite(author) || author < 0 || author > 100) return;
    const platform = Math.max(0, 100 - author);
    const next: CreatorFeeSourceRates = {};
    for (const s of CREATOR_FEE_REVENUE_SOURCES) {
      next[s.id] = { author_percent: author, platform_percent: platform };
    }
    setSourceRates(next);
  }

  function validateLocal(): boolean {
    const errors: Record<string, string> = {};
    for (const [key, rate] of Object.entries(sourceRates)) {
      if (!rate) continue;
      if (Math.abs(rate.author_percent + rate.platform_percent - 100) > 0.01) {
        errors[key] = "Tác giả + nền tảng phải bằng 100.";
      }
      if (rate.author_percent > 90) {
        errors[key] = errors[key] ?? "Tỷ lệ tác giả cao bất thường (>90%).";
      }
      const def = defaultRates[key as keyof CreatorFeeSourceRates];
      if (def && rate.author_percent < def.author_percent) {
        errors[key] = errors[key] ?? "Tỷ lệ tác giả thấp hơn mặc định.";
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function submit(forceConfirm = false) {
    if (!validateLocal()) return;
    if (!note.trim()) {
      setMessage("Ghi chú nội bộ là bắt buộc.");
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const payload = {
        creatorId,
        policyName,
        sourceRates,
        creatorType: creatorType || null,
        contractRef,
        note,
        publicNote,
        showDetailsToCreator: showDetails,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        confirmOverlap: forceConfirm || confirmOverlap
      };

      const result = editing
        ? await updateCreatorFeePolicyAction({ ...payload, policyId: editing.id })
        : await createCreatorFeePolicyAction(payload);

      if (!result.ok) {
        if ("needsConfirm" in result && result.needsConfirm) {
          setConfirmOverlap(true);
        }
        setMessage(result.error ?? "Không thể lưu chính sách.");
        return;
      }

      setMessage(editing ? "Đã cập nhật chính sách." : "Đã tạo chính sách mới.");
      onSuccess();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs text-zinc-400">Tên chính sách *</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setPolicyName(e.target.value)}
            value={policyName}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Loại tác giả</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setCreatorType(e.target.value as CreatorFeePolicyCreatorType | "")}
            value={creatorType}
          >
            <option value="">— Chọn —</option>
            {Object.entries(CREATOR_FEE_CREATOR_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Mã hợp đồng</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setContractRef(e.target.value)}
            value={contractRef}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Bắt đầu hiệu lực *</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setStartsAt(e.target.value)}
            type="datetime-local"
            value={startsAt}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Kết thúc (tuỳ chọn)</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setEndsAt(e.target.value)}
            type="datetime-local"
            value={endsAt}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-white/10 p-3">
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Áp dụng cùng tỷ lệ (% tác giả)</span>
          <input
            className="w-24 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            inputMode="decimal"
            onChange={(e) => setBulkAuthor(e.target.value)}
            placeholder="80"
            value={bulkAuthor}
          />
        </label>
        <Button onClick={applyBulkRate} type="button" variant="secondary">
          Áp dụng tất cả nguồn
        </Button>
      </div>

      <div className="space-y-3">
        {CREATOR_FEE_REVENUE_SOURCES.map((source) => {
          const rate = sourceRates[source.id];
          const def = defaultRates[source.id];
          return (
            <div className="rounded-lg border border-white/10 p-3" key={source.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-white">{source.label}</p>
                <div className="flex gap-2">
                  <button
                    className="text-xs text-cyan-300 hover:underline"
                    onClick={() => useDefault(source.id)}
                    type="button"
                  >
                    Dùng mặc định ({def?.author_percent ?? "—"}%)
                  </button>
                  {rate ? (
                    <button
                      className="text-xs text-zinc-400 hover:underline"
                      onClick={() => clearSource(source.id)}
                      type="button"
                    >
                      Xóa override
                    </button>
                  ) : null}
                </div>
              </div>
              {rate ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-xs text-zinc-400">Tác giả %</span>
                    <input
                      className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
                      inputMode="decimal"
                      onChange={(e) => setRate(source.id, "author_percent", e.target.value)}
                      value={rate.author_percent}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-zinc-400">Nền tảng %</span>
                    <input
                      className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
                      inputMode="decimal"
                      onChange={(e) => setRate(source.id, "platform_percent", e.target.value)}
                      value={rate.platform_percent}
                    />
                  </label>
                </div>
              ) : (
                <p className="mt-1 text-xs text-zinc-500">Fallback về tỷ lệ mặc định hệ thống</p>
              )}
              {fieldErrors[source.id] ? (
                <p className="mt-1 text-xs text-amber-300">{fieldErrors[source.id]}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-zinc-400">Ghi chú nội bộ *</span>
        <textarea
          className="min-h-[72px] w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(e) => setNote(e.target.value)}
          value={note}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-zinc-400">Ghi chú công khai (tuỳ chọn)</span>
        <textarea
          className="min-h-[56px] w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(e) => setPublicNote(e.target.value)}
          value={publicNote}
        />
      </label>
      <label className="flex items-center gap-2">
        <input checked={showDetails} onChange={(e) => setShowDetails(e.target.checked)} type="checkbox" />
        <span className="text-sm text-zinc-300">Cho tác giả xem chi tiết trên Studio</span>
      </label>

      <CreatorFeePolicyPreview
        creatorId={creatorId}
        policyId={editing?.id}
        sourceRates={sourceRates}
      />

      {confirmOverlap ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Policy mới chồng thời gian với policy hiện có. Giao dịch cũ giữ nguyên snapshot; chỉ giao
          dịch sau effective_from dùng policy mới.
          <Button className="mt-2" onClick={() => submit(true)} type="button" variant="secondary">
            Xác nhận thay thế
          </Button>
        </div>
      ) : null}

      {message ? (
        <p className={`text-sm ${message.includes("Đã") ? "text-emerald-300" : "text-amber-300"}`}>
          {message}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button disabled={isPending || !dirty} onClick={() => submit()} type="button">
          {isPending ? "Đang lưu…" : editing ? "Cập nhật policy" : "Lưu policy"}
        </Button>
        {onCancel ? (
          <Button onClick={onCancel} type="button" variant="secondary">
            Huỷ
          </Button>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatCountdown, formatVnd, formatXu } from "@/lib/format/money";
import type { CheckoutSession, CheckoutSessionStatus } from "@/types/payment";

type SePayCheckoutPanelProps = {
  initialSession: CheckoutSession;
  bankCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

type CopyFieldRowProps = {
  copied: boolean;
  label: string;
  onCopy: () => void;
  value: string;
};

const TERMINAL_STATUSES: CheckoutSessionStatus[] = [
  "paid",
  "expired",
  "manual_review",
  "failed",
  "cancelled"
];

const STATUS_LABELS: Record<CheckoutSessionStatus, string> = {
  created: "Đang tạo giao dịch",
  pending: "Đang chờ xác nhận",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
  expired: "Hết hạn",
  cancelled: "Đã hủy",
  manual_review: "Cần kiểm tra"
};

const STATUS_CLASSES: Record<CheckoutSessionStatus, string> = {
  created: "border-sky-400/20 bg-sky-400/10 text-sky-100",
  pending: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  paid: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  failed: "border-rose-400/20 bg-rose-400/10 text-rose-100",
  expired: "border-rose-400/20 bg-rose-400/10 text-rose-100",
  cancelled: "border-zinc-500/20 bg-zinc-500/10 text-zinc-200",
  manual_review: "border-violet-400/20 bg-violet-400/10 text-violet-100"
};

function getRemainingSeconds(expiresAt: string | null) {
  if (!expiresAt) return null;
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.floor(remainingMs / 1000));
}

function formatRemaining(expiresAt: string | null) {
  if (!expiresAt) return "Không giới hạn";
  const remainingSeconds = getRemainingSeconds(expiresAt);
  if (!remainingSeconds) return "Đã hết hạn";
  return formatCountdown(remainingSeconds);
}

function PaymentStatusBadge({ status }: { status: CheckoutSessionStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function CopyFieldRow({ copied, label, onCopy, value }: CopyFieldRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-950/40 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 break-all text-sm font-semibold text-slate-100">{value}</p>
      </div>

      <button
        className={`inline-flex min-h-8 shrink-0 items-center justify-center rounded-full border px-3 text-[0.72rem] font-semibold transition ${
          copied
            ? "border-emerald-400/35 bg-emerald-400/15 text-emerald-100"
            : "border-slate-600 bg-slate-900/80 text-slate-200 hover:border-sky-400/40 hover:text-white"
        }`}
        onClick={onCopy}
        type="button"
      >
        {copied ? "Đã sao chép" : "Sao chép"}
      </button>
    </div>
  );
}

export function SePayCheckoutPanel({
  bankAccountName,
  bankAccountNumber,
  bankCode,
  initialSession
}: SePayCheckoutPanelProps) {
  const [session, setSession] = useState(initialSession);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const terminal = useMemo(() => TERMINAL_STATUSES.includes(session.status), [session.status]);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/checkout/${session.id}/status`, { cache: "no-store" });
      const payload = (await response.json()) as { ok: boolean; data?: CheckoutSession };
      if (payload.ok && payload.data) setSession(payload.data);
    } finally {
      setLoading(false);
    }
  }, [session.id]);

  useEffect(() => {
    if (terminal) return;
    const timer = setInterval(() => {
      void refreshStatus();
    }, 2500);
    return () => clearInterval(timer);
  }, [refreshStatus, terminal]);

  const amountLabel = formatVnd(session.gross_amount_vnd);
  const xuLabel = formatXu(session.total_coin_amount || session.base_coin_amount);
  const remainingLabel = formatRemaining(session.expires_at);
  const nearExpiry = (getRemainingSeconds(session.expires_at) ?? 999999) <= 300;

  const transferFields = [
    { id: "bank", label: "Ngân hàng", value: bankCode || "-" },
    { id: "account", label: "Số tài khoản", value: bankAccountNumber || "-" },
    { id: "holder", label: "Chủ tài khoản", value: bankAccountName || "-" },
    { id: "amount", label: "Số tiền", value: amountLabel },
    { id: "content", label: "Nội dung chuyển khoản", value: session.transfer_content || "-" }
  ];

  const copyText = useCallback(async (key: string, value: string) => {
    if (!value || value === "-") return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1800);
    } catch {
      setCopiedKey(null);
    }
  }, []);

  const copyAll = useCallback(async () => {
    const quickCopy = [
      `Ngân hàng: ${bankCode || "-"}`,
      `Số tài khoản: ${bankAccountNumber || "-"}`,
      `Chủ tài khoản: ${bankAccountName || "-"}`,
      `Số tiền: ${amountLabel}`,
      `Nội dung chuyển khoản: ${session.transfer_content || "-"}`
    ].join("\n");

    await copyText("all", quickCopy);
  }, [amountLabel, bankAccountName, bankAccountNumber, bankCode, copyText, session.transfer_content]);

  return (
    <div className="space-y-3">
      <section className="rounded-[1.5rem] border border-sky-400/15 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.84))] p-4 shadow-[0_24px_60px_rgba(2,6,23,0.42)] sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)] xl:items-start">
          <div className="rounded-[1.35rem] border border-slate-700/70 bg-slate-950/45 p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sky-300">
              Mã QR thanh toán
            </p>
            <h2 className="mt-1.5 text-lg font-black text-white">Quét mã để thanh toán</h2>
            <p className="mt-1 text-sm text-slate-400">Dùng app ngân hàng để quét mã.</p>

            {session.qr_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Mã QR thanh toán SePay"
                className="mx-auto mt-3 aspect-square w-full max-w-[14rem] rounded-2xl border border-slate-700 bg-white p-3 shadow-[0_16px_36px_rgba(0,0,0,0.22)]"
                src={session.qr_url}
              />
            ) : (
              <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                Mã QR chưa sẵn sàng. Bạn vẫn có thể sao chép thông tin bên dưới.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sky-300">
                  Thanh toán SePay / VietQR
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Quét QR trước. Nếu không quét, hãy sao chép thông tin chuyển khoản.
                </p>
              </div>
              <PaymentStatusBadge status={session.status} />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-slate-700/70 bg-slate-950/45 p-3">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Số tiền
                </p>
                <p className="mt-1 text-base font-black text-white sm:text-lg">{amountLabel}</p>
              </div>
              <div className="rounded-xl border border-slate-700/70 bg-slate-950/45 p-3">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Nhận
                </p>
                <p className="mt-1 text-base font-black text-sky-100 sm:text-lg">{xuLabel}</p>
              </div>
              <div className="rounded-xl border border-slate-700/70 bg-slate-950/45 p-3">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Trạng thái
                </p>
                <p className="mt-1 text-sm font-bold text-slate-100">{STATUS_LABELS[session.status]}</p>
              </div>
              <div
                className={`rounded-xl border p-3 ${
                  nearExpiry
                    ? "border-amber-400/30 bg-amber-400/10"
                    : "border-slate-700/70 bg-slate-950/45"
                }`}
              >
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Còn lại
                </p>
                <p className={`mt-1 text-sm font-bold ${nearExpiry ? "text-amber-100" : "text-slate-100"}`}>
                  {remainingLabel}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-sky-300 px-5 py-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 shadow-[0_14px_30px_rgba(56,189,248,0.26)] transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
                disabled={loading}
                onClick={() => void refreshStatus()}
                type="button"
              >
                {loading ? "Đang kiểm tra..." : "Tôi đã chuyển khoản"}
              </button>

              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
                href="/coin/checkout"
              >
                Quay lại nạp Xu
              </Link>
            </div>

            <p className="text-sm text-slate-500">
              {terminal
                ? "Phiên này đã có trạng thái cuối cùng."
                : "Hệ thống sẽ tự kiểm tra lại giao dịch."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-slate-800 bg-[rgba(15,23,42,0.82)] p-4 shadow-[0_18px_42px_rgba(2,6,23,0.3)]">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h3 className="text-sm font-black text-white sm:text-base">Thông tin chuyển khoản</h3>
            <p className="mt-0.5 text-sm text-slate-400">
              Dành cho trường hợp bạn không quét QR.
            </p>
          </div>

          <button
            className={`inline-flex min-h-9 items-center justify-center rounded-full border px-4 text-sm font-semibold transition ${
              copiedKey === "all"
                ? "border-emerald-400/35 bg-emerald-400/15 text-emerald-100"
                : "border-sky-400/25 bg-sky-400/10 text-sky-100 hover:border-sky-300/40 hover:bg-sky-400/15"
            }`}
            onClick={() => void copyAll()}
            type="button"
          >
            {copiedKey === "all" ? "Đã sao chép nhanh" : "Sao chép nhanh"}
          </button>
        </div>

        <div className="mt-3 grid gap-2">
          {transferFields.map((field) => (
            <CopyFieldRow
              copied={copiedKey === field.id}
              key={field.id}
              label={field.label}
              onCopy={() => void copyText(field.id, field.value)}
              value={field.value}
            />
          ))}
        </div>
      </section>

      <div className="rounded-xl border border-slate-800 bg-slate-950/45 px-3.5 py-2.5 text-sm text-slate-400">
        Chuyển đúng số tiền và đúng nội dung để hệ thống tự động xác nhận.
      </div>
    </div>
  );
}

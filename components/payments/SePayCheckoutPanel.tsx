"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import type { CheckoutSession } from "@/types/payment";

function formatRemaining(expiresAt: string | null) {
  if (!expiresAt) return "Khong gioi han";
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return "Da het han";
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function SePayCheckoutPanel({ initialSession }: { initialSession: CheckoutSession }) {
  const [session, setSession] = useState(initialSession);
  const [loading, setLoading] = useState(false);
  const terminal = useMemo(
    () => ["paid", "expired", "manual_review", "failed", "cancelled"].includes(session.status),
    [session.status]
  );

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
  }, [terminal, refreshStatus]);

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-black text-white">Thanh toan SePay/VietQR</h2>
      <p className="text-sm text-zinc-300">
        Vui long chuyen dung so tien va dung noi dung. He thong se tu dong xac nhan sau khi nhan giao dich.
      </p>

      {session.qr_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="SePay QR"
          className="mx-auto w-full max-w-sm rounded-xl border border-white/10 lg:max-w-md"
          src={session.qr_url}
        />
      ) : (
        <p className="text-sm text-amber-300">QR tam thoi chua san sang, vui long thu refresh.</p>
      )}

      <div className="space-y-1 text-sm text-zinc-200">
        <p>So tien: {session.gross_amount_vnd.toLocaleString("vi-VN")} VND</p>
        <p>Noi dung: {session.transfer_content ?? "-"}</p>
        <p>Trang thai: {session.status}</p>
        <p>Con lai: {formatRemaining(session.expires_at)}</p>
      </div>

      <Button loading={loading} onClick={refreshStatus} type="button" variant="secondary">
        Toi da chuyen khoan (chi refresh trang thai)
      </Button>
    </Card>
  );
}

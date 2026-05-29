"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CoinDangerConfirmModal,
  type CoinDangerConfirmPayload
} from "@/components/admin/CoinDangerConfirmModal";
import { ADMIN_COIN_REASON_OPTIONS } from "@/lib/admin/coin-reasons";
import { requiresDangerConfirm } from "@/lib/admin/coin-danger";
import {
  ADMIN_COIN_DANGER_CONFIRM_TEXT,
  adjustCoinAction
} from "@/lib/admin/coin-wallet-actions";
import { COIN_ADMIN_COPY } from "@/components/admin/coin-form-copy";
import { Button, Card } from "@/components/ui";
import type {
  AdminCoinAdjustmentDirection,
  AdminCoinReasonCode,
  CoinAdminUserRow,
  UserCoinWalletDetail
} from "@/types/coins";

type CoinAdjustmentFormProps = {
  user: CoinAdminUserRow;
  wallet: UserCoinWalletDetail | null;
  initialDirection?: AdminCoinAdjustmentDirection;
  limits: {
    maxPerUserPerAction: number;
    highAmountWarning: number;
  };
  onSuccess?: () => void;
};

type PreviewState = {
  direction: AdminCoinAdjustmentDirection;
  coinType: "paid" | "bonus";
  amount: number;
  reasonCode: AdminCoinReasonCode;
  reasonLabel: string;
  adminNote: string;
  referenceId: string;
  balanceAfter: number;
};

export function CoinAdjustmentForm({
  user,
  wallet,
  initialDirection = "credit",
  limits,
  onSuccess
}: CoinAdjustmentFormProps) {
  const [direction, setDirection] = useState<AdminCoinAdjustmentDirection>(initialDirection);
  const [coinType, setCoinType] = useState<"paid" | "bonus">("bonus");
  const [amount, setAmount] = useState("100");
  const [reasonCode, setReasonCode] = useState<AdminCoinReasonCode>("thuong_su_kien");
  const [adminNote, setAdminNote] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [confirmedUser, setConfirmedUser] = useState(false);
  const [checked, setChecked] = useState<PreviewState | null>(null);
  const [dangerModal, setDangerModal] = useState<CoinDangerConfirmPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDirection(initialDirection);
    setChecked(null);
  }, [initialDirection, user.id]);

  const amountNum = Number(amount);
  const showHighWarning =
    Number.isFinite(amountNum) && amountNum > limits.highAmountWarning;
  const paidNoteRequired = coinType === "paid";

  const reasonLabel = useMemo(
    () => ADMIN_COIN_REASON_OPTIONS.find((item) => item.code === reasonCode)?.label ?? "",
    [reasonCode]
  );

  function runCheck(): PreviewState | null {
    if (!Number.isInteger(amountNum) || amountNum <= 0) {
      setMessage("Số coin phải là số nguyên dương.");
      return null;
    }
    if (amountNum > limits.maxPerUserPerAction) {
      setMessage(
        `Vượt ${limits.maxPerUserPerAction.toLocaleString("vi-VN")} coin/lần. Chia nhỏ hoặc dùng quyền cao hơn.`
      );
      return null;
    }
    if (paidNoteRequired && !adminNote.trim()) {
      setMessage("Coin nạp bắt buộc có ghi chú chi tiết.");
      return null;
    }
    if (reasonCode === "khac" && adminNote.trim().length < 20) {
      setMessage("Lý do Khác cần ghi chú tối thiểu 20 ký tự.");
      return null;
    }
    if (showHighWarning && !adminNote.trim()) {
      setMessage(
        `Trên ${limits.highAmountWarning.toLocaleString("vi-VN")} coin cần ghi chú nội bộ.`
      );
      return null;
    }
    if (!confirmedUser) {
      setMessage("Cần tick xác nhận đã kiểm tra đúng user.");
      return null;
    }

    const available = coinType === "paid" ? user.paidCoin : user.bonusCoin;
    if (direction === "debit" && amountNum > available) {
      setMessage("Không thể trừ — số dư không đủ.");
      return null;
    }

    const balanceAfter =
      direction === "credit"
        ? available + amountNum
        : Math.max(0, available - amountNum);

    const built: PreviewState = {
      direction,
      coinType,
      amount: amountNum,
      reasonCode,
      reasonLabel,
      adminNote: adminNote.trim(),
      referenceId: referenceId.trim(),
      balanceAfter
    };
    setChecked(built);
    setMessage(null);
    return built;
  }

  function openConfirmModal(preview: PreviewState) {
    const reason =
      preview.reasonCode === "khac" && preview.adminNote
        ? `${preview.reasonLabel}: ${preview.adminNote}`
        : preview.reasonLabel;

    setDangerModal({
      title: preview.direction === "credit" ? "Xác nhận cộng coin" : "Xác nhận trừ coin",
      userLabel: `${user.display_name ?? user.username} (@${user.username ?? user.id.slice(0, 8)})`,
      coinType: preview.coinType,
      direction: preview.direction,
      amount: preview.amount,
      reason,
      note: preview.adminNote || undefined,
      impact: `${preview.coinType === "paid" ? COIN_ADMIN_COPY.paidLabel : COIN_ADMIN_COPY.bonusLabel} sau xử lý: ${preview.balanceAfter.toLocaleString("vi-VN")} coin`
    });
  }

  function handleCheck() {
    runCheck();
  }

  function handleConfirmClick() {
    const preview = checked ?? runCheck();
    if (!preview) return;

    if (
      requiresDangerConfirm({
        coinType: preview.coinType,
        amount: preview.amount,
        highAmountThreshold: limits.highAmountWarning
      })
    ) {
      openConfirmModal(preview);
      return;
    }

    executeAdjust(preview, null);
  }

  function executeAdjust(preview: PreviewState, dangerToken: string | null) {
    const reason =
      preview.reasonCode === "khac" && preview.adminNote
        ? `${preview.reasonLabel}: ${preview.adminNote}`
        : preview.reasonLabel;

    startTransition(async () => {
      const result = await adjustCoinAction({
        userId: user.id,
        direction: preview.direction,
        amount: preview.amount,
        coinType: preview.coinType,
        reasonCode: preview.reasonCode,
        reason,
        adminNote: preview.adminNote || null,
        referenceId: preview.referenceId || null,
        confirmedUser: true,
        dangerConfirmToken: dangerToken
      });

      if (result.ok) {
        setMessage(
          preview.direction === "credit" ? "Đã cộng coin thành công." : "Đã trừ coin thành công."
        );
        setChecked(null);
        setConfirmedUser(false);
        setDangerModal(null);
        onSuccess?.();
      } else {
        setMessage(result.error ?? "Không thể điều chỉnh coin.");
      }
    });
  }

  const borderTone =
    direction === "debit" ? "border-red-400/25 bg-red-400/5" : "border-cyan-300/20 bg-cyan-300/5";

  return (
    <>
      <Card className={`space-y-3 ${borderTone}`}>
        <p className="text-sm font-semibold text-white">Điều chỉnh coin</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-zinc-400">Loại thao tác</span>
            <select
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              onChange={(event) => {
                setDirection(event.target.value as AdminCoinAdjustmentDirection);
                setChecked(null);
              }}
              value={direction}
            >
              <option value="credit">Cộng coin</option>
              <option value="debit">Trừ coin</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-400">Loại coin</span>
            <select
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              onChange={(event) => {
                setCoinType(event.target.value as "paid" | "bonus");
                setChecked(null);
              }}
              value={coinType}
            >
              <option value="paid">{COIN_ADMIN_COPY.paidLabel}</option>
              <option value="bonus">{COIN_ADMIN_COPY.bonusLabel}</option>
            </select>
          </label>
        </div>

        {coinType === "paid" ? (
          <p className="rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
            {COIN_ADMIN_COPY.paidWarning}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-zinc-400">Số lượng coin</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              min={1}
              onChange={(event) => {
                setAmount(event.target.value);
                setChecked(null);
              }}
              type="number"
              value={amount}
            />
            {showHighWarning ? (
              <span className="text-xs text-amber-300">Cần ghi chú khi trên 5.000 coin.</span>
            ) : null}
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-400">Lý do chuẩn hóa</span>
            <select
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              onChange={(event) => {
                setReasonCode(event.target.value as AdminCoinReasonCode);
                setChecked(null);
              }}
              value={reasonCode}
            >
              {ADMIN_COIN_REASON_OPTIONS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">
            Ghi chú chi tiết
            {paidNoteRequired || reasonCode === "khac" || showHighWarning
              ? " (bắt buộc)"
              : ""}
          </span>
          <textarea
            className="min-h-16 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(event) => {
              setAdminNote(event.target.value);
              setChecked(null);
            }}
            value={adminNote}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Mã tham chiếu nội bộ</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(event) => setReferenceId(event.target.value)}
            placeholder="ticket, order, campaign…"
            value={referenceId}
          />
        </label>

        <label className="flex items-start gap-2 text-sm text-zinc-300">
          <input
            checked={confirmedUser}
            className="mt-1"
            onChange={(event) => {
              setConfirmedUser(event.target.checked);
              setChecked(null);
            }}
            type="checkbox"
          />
          <span>{COIN_ADMIN_COPY.userConfirm}</span>
        </label>

        {checked ? (
          <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-200">
            <p className="font-medium text-white">{COIN_ADMIN_COPY.previewTitle}</p>
            <p>
              {checked.direction === "credit" ? "Cộng" : "Trừ"} {checked.amount.toLocaleString("vi-VN")}{" "}
              {checked.coinType === "paid" ? COIN_ADMIN_COPY.paidLabel : COIN_ADMIN_COPY.bonusLabel} →
              còn {checked.balanceAfter.toLocaleString("vi-VN")}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCheck} type="button" variant="secondary">
            Kiểm tra
          </Button>
          <Button
            disabled={isPending || !checked}
            onClick={handleConfirmClick}
            type="button"
            variant={direction === "debit" ? "danger" : "primary"}
          >
            {isPending ? "Đang xử lý…" : "Xác nhận"}
          </Button>
        </div>

        {message ? (
          <p
            className={`text-sm ${message.includes("thành công") ? "text-emerald-300" : "text-amber-200"}`}
          >
            {message}
          </p>
        ) : null}
      </Card>

      <CoinDangerConfirmModal
        onClose={() => setDangerModal(null)}
        onConfirmed={() => {
          const preview = checked;
          if (preview) executeAdjust(preview, ADMIN_COIN_DANGER_CONFIRM_TEXT);
        }}
        open={Boolean(dangerModal)}
        payload={dangerModal}
        pending={isPending}
      />
    </>
  );
}

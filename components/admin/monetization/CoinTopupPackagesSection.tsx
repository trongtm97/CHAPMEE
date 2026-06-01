"use client";

import { useMemo, useState, useTransition } from "react";
import { ConfirmActionModal } from "@/components/admin/campaigns/ConfirmActionModal";
import { MoneySettingCard } from "@/components/admin/MoneySettingCard";
import { Button, Input } from "@/components/ui";
import {
  deleteTopupPackageAction,
  duplicateTopupPackageAction,
  reorderTopupPackagesAction,
  saveTopupPackageAction,
  toggleTopupPackageAction
} from "@/lib/admin/topup-package-actions";
import { calculateTopupCoin } from "@/lib/topup-packages/calculate";
import {
  TOPUP_BONUS_RECOMMENDED_MAX,
  TOPUP_MAX_RECOMMENDED_PACKAGES
} from "@/lib/topup-packages/constants";
import { validateTopupPackageForm } from "@/lib/topup-packages/validation";
import type { CoinTopupPackage, CoinTopupPackageFilter } from "@/types/topup-package";

type CoinTopupPackagesSectionProps = {
  packages: CoinTopupPackage[];
  exchangeRateVnd: number;
  canEdit: boolean;
};

type FormState = {
  id?: string;
  name: string;
  amountVnd: string;
  bonusPercent: string;
  badgeText: string;
  description: string;
  isRecommended: boolean;
  isActive: boolean;
  sortOrder: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  amountVnd: "",
  bonusPercent: "0",
  badgeText: "",
  description: "",
  isRecommended: false,
  isActive: true,
  sortOrder: "0"
};

const FILTER_OPTIONS: { id: CoinTopupPackageFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "active", label: "Đang bật" },
  { id: "inactive", label: "Đang tắt" },
  { id: "recommended", label: "Gói đề xuất" }
];

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function TopupPackageFormModal({
  open,
  form,
  exchangeRateVnd,
  packages,
  canEdit,
  pending,
  onChange,
  onClose,
  onSubmit,
  confirmHighBonus,
  onConfirmHighBonus
}: {
  open: boolean;
  form: FormState;
  exchangeRateVnd: number;
  packages: CoinTopupPackage[];
  canEdit: boolean;
  pending: boolean;
  onChange: (next: FormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  confirmHighBonus: boolean;
  onConfirmHighBonus: (value: boolean) => void;
}) {
  const amountVnd = Number(form.amountVnd);
  const bonusPercent = Number(form.bonusPercent);
  const preview = useMemo(
    () =>
      calculateTopupCoin(
        Number.isFinite(amountVnd) ? amountVnd : 0,
        Number.isFinite(bonusPercent) ? bonusPercent : 0,
        exchangeRateVnd
      ),
    [amountVnd, bonusPercent, exchangeRateVnd]
  );

  const validation = useMemo(
    () =>
      validateTopupPackageForm({
        amountVnd: Number.isFinite(amountVnd) ? amountVnd : 0,
        bonusPercent: Number.isFinite(bonusPercent) ? bonusPercent : 0,
        isActive: form.isActive,
        isRecommended: form.isRecommended,
        excludeId: form.id,
        existingPackages: packages,
        confirmHighBonus
      }),
    [
      amountVnd,
      bonusPercent,
      form.isActive,
      form.isRecommended,
      form.id,
      packages,
      confirmHighBonus
    ]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        aria-label="Đóng"
        className="absolute inset-0 bg-black/65"
        onClick={onClose}
        type="button"
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">
          {form.id ? "Sửa gói nạp" : "Thêm gói nạp"}
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Tỷ giá hiện tại: {exchangeRateVnd.toLocaleString("vi-VN")} ₫/coin
        </p>

        <div className="mt-4 space-y-3">
          <Input
            disabled={!canEdit || pending}
            label="Tên gói"
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            required
            value={form.name}
          />
          <Input
            disabled={!canEdit || pending}
            label="Số tiền VND"
            min={1000}
            onChange={(e) => onChange({ ...form, amountVnd: e.target.value })}
            required
            step={1000}
            type="number"
            value={form.amountVnd}
          />
          <Input
            disabled={!canEdit || pending}
            label="% thưởng"
            min={0}
            onChange={(e) => {
              onConfirmHighBonus(false);
              onChange({ ...form, bonusPercent: e.target.value });
            }}
            step={0.1}
            type="number"
            value={form.bonusPercent}
          />
          <Input
            disabled={!canEdit || pending}
            label="Nhãn gói"
            onChange={(e) => onChange({ ...form, badgeText: e.target.value })}
            placeholder="Phổ biến, Tiết kiệm nhất..."
            value={form.badgeText}
          />
          <label className="block text-sm">
            <span className="text-zinc-400">Mô tả ngắn</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              disabled={!canEdit || pending}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
              rows={2}
              value={form.description}
            />
          </label>
          <Input
            disabled={!canEdit || pending}
            label="Thứ tự hiển thị"
            min={0}
            onChange={(e) => onChange({ ...form, sortOrder: e.target.value })}
            type="number"
            value={form.sortOrder}
          />
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={form.isRecommended}
              disabled={!canEdit || pending}
              onChange={(e) => onChange({ ...form, isRecommended: e.target.checked })}
              type="checkbox"
            />
            Đánh dấu gói đề xuất
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={form.isActive}
              disabled={!canEdit || pending}
              onChange={(e) => onChange({ ...form, isActive: e.target.checked })}
              type="checkbox"
            />
            Bật gói nạp
          </label>
        </div>

        <dl className="mt-4 grid gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-400">Coin gốc</dt>
            <dd className="text-white">{preview.baseCoin.toLocaleString("vi-VN")}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-400">Coin thưởng</dt>
            <dd className="text-amber-200">{preview.bonusCoin.toLocaleString("vi-VN")}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-400">Tổng coin nhận</dt>
            <dd className="font-semibold text-cyan-300">
              {preview.totalCoin.toLocaleString("vi-VN")}
            </dd>
          </div>
        </dl>

        {validation.errors.map((msg) => (
          <p className="mt-2 text-xs text-red-400" key={msg}>
            {msg}
          </p>
        ))}
        {validation.warnings.map((msg) => (
          <p className="mt-2 text-xs text-amber-300" key={msg}>
            {msg}
          </p>
        ))}
        {validation.requiresHighBonusConfirm && !confirmHighBonus ? (
          <label className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
            <input
              checked={confirmHighBonus}
              className="mt-0.5"
              disabled={!canEdit || pending}
              onChange={(e) => onConfirmHighBonus(e.target.checked)}
              type="checkbox"
            />
            Bonus Coin vượt mức khuyến nghị ({TOPUP_BONUS_RECOMMENDED_MAX}%). Điều này có thể
            làm giảm doanh thu thực nhận của nền tảng. Tôi xác nhận muốn lưu.
          </label>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            disabled={!canEdit || !validation.ok || pending}
            loading={pending}
            onClick={onSubmit}
            type="button"
          >
            Lưu gói
          </Button>
          <Button disabled={pending} onClick={onClose} type="button" variant="secondary">
            Hủy
          </Button>
        </div>
      </div>
    </div>
  );
}

function UserPreviewPanel({ packages }: { packages: CoinTopupPackage[] }) {
  const active = packages.filter((pkg) => pkg.is_active);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Xem trước (người dùng)
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Chỉ hiển thị gói đang bật — người dùng không thể nhập số tiền tùy ý.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {active.length === 0 ? (
          <p className="text-sm text-zinc-500 sm:col-span-2 lg:col-span-3">
            Chưa có gói nạp đang bật.
          </p>
        ) : (
          active.map((pkg) => (
            <div
              className={`relative rounded-xl border p-3 ${
                pkg.is_recommended
                  ? "border-cyan-400/40 bg-cyan-400/5"
                  : "border-white/10 bg-zinc-950/40"
              }`}
              key={pkg.id}
            >
              {pkg.badge_text ? (
                <span className="absolute right-2 top-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                  {pkg.badge_text}
                </span>
              ) : null}
              {pkg.is_recommended ? (
                <span className="mb-1 inline-block rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] text-cyan-200">
                  Đề xuất
                </span>
              ) : null}
              <p className="text-sm font-semibold text-white">{pkg.name}</p>
              <p className="mt-1 text-lg font-bold text-cyan-300">
                {formatVnd(pkg.amount_vnd)}
              </p>
              <p className="mt-1 text-sm text-white">
                Nhận{" "}
                <span className="font-bold text-cyan-200">
                  {pkg.total_coin_amount.toLocaleString("vi-VN")} coin
                </span>
              </p>
              {pkg.bonus_coin_amount > 0 ? (
                <p className="mt-0.5 text-xs text-amber-300">
                  +{pkg.bonus_coin_amount.toLocaleString("vi-VN")} thưởng (
                  {pkg.bonus_percent}%)
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CoinTopupPackagesSection({
  packages: initialPackages,
  exchangeRateVnd,
  canEdit
}: CoinTopupPackagesSectionProps) {
  const [packages, setPackages] = useState(initialPackages);
  const [filter, setFilter] = useState<CoinTopupPackageFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmHighBonus, setConfirmHighBonus] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<CoinTopupPackage | null>(null);

  const filtered = useMemo(() => {
    switch (filter) {
      case "active":
        return packages.filter((pkg) => pkg.is_active);
      case "inactive":
        return packages.filter((pkg) => !pkg.is_active);
      case "recommended":
        return packages.filter((pkg) => pkg.is_recommended);
      default:
        return packages;
    }
  }, [filter, packages]);

  const recommendedCount = packages.filter((pkg) => pkg.is_recommended).length;

  function openCreate() {
    const maxSort = packages.reduce((max, pkg) => Math.max(max, pkg.sort_order), 0);
    setForm({ ...EMPTY_FORM, sortOrder: String(maxSort + 1) });
    setConfirmHighBonus(false);
    setFormOpen(true);
  }

  function openEdit(pkg: CoinTopupPackage) {
    setForm({
      id: pkg.id,
      name: pkg.name,
      amountVnd: String(pkg.amount_vnd),
      bonusPercent: String(pkg.bonus_percent),
      badgeText: pkg.badge_text ?? "",
      description: pkg.description ?? "",
      isRecommended: pkg.is_recommended,
      isActive: pkg.is_active,
      sortOrder: String(pkg.sort_order)
    });
    setConfirmHighBonus(false);
    setFormOpen(true);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveTopupPackageAction({
        id: form.id,
        name: form.name.trim(),
        amountVnd: Number(form.amountVnd),
        bonusPercent: Number(form.bonusPercent),
        badgeText: form.badgeText.trim() || null,
        description: form.description.trim() || null,
        isRecommended: form.isRecommended,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
        confirmHighBonus
      });

      if (!result.ok) {
        if (result.requiresHighBonusConfirm) {
          setToast({
            type: "err",
            text: "Vui lòng xác nhận bonus vượt mức khuyến nghị trước khi lưu."
          });
          return;
        }
        setToast({ type: "err", text: result.error ?? "Không lưu được." });
        return;
      }

      if (result.data) {
        setPackages((prev) => {
          const next = prev.filter((item) => item.id !== result.data!.id);
          return [...next, result.data!].sort(
            (a, b) => a.sort_order - b.sort_order || a.amount_vnd - b.amount_vnd
          );
        });
      }
      setFormOpen(false);
      setToast({ type: "ok", text: "Đã lưu gói nạp coin." });
    });
  }

  function handleToggle(pkg: CoinTopupPackage) {
    startTransition(async () => {
      const result = await toggleTopupPackageAction(pkg.id, !pkg.is_active);
      if (!result.ok || !result.data) {
        setToast({ type: "err", text: result.error ?? "Không cập nhật được." });
        return;
      }
      setPackages((prev) =>
        prev.map((item) => (item.id === result.data!.id ? result.data! : item))
      );
      setToast({
        type: "ok",
        text: result.data.is_active ? "Đã bật gói nạp." : "Đã tắt gói nạp."
      });
    });
  }

  function handleDuplicate(pkg: CoinTopupPackage) {
    startTransition(async () => {
      const result = await duplicateTopupPackageAction(pkg.id);
      if (!result.ok || !result.data) {
        setToast({ type: "err", text: result.error ?? "Không nhân bản được." });
        return;
      }
      setPackages((prev) =>
        [...prev, result.data!].sort(
          (a, b) => a.sort_order - b.sort_order || a.amount_vnd - b.amount_vnd
        )
      );
      setToast({ type: "ok", text: "Đã nhân bản gói (đang tắt)." });
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteTopupPackageAction(deleteTarget.id);
      setDeleteTarget(null);
      if (!result.ok) {
        setToast({ type: "err", text: result.error ?? "Không xóa được." });
        return;
      }
      setPackages((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setToast({ type: "ok", text: "Đã xóa gói nạp." });
    });
  }

  function movePackage(pkg: CoinTopupPackage, direction: -1 | 1) {
    const sorted = [...packages].sort((a, b) => a.sort_order - b.sort_order);
    const index = sorted.findIndex((item) => item.id === pkg.id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;

    const reordered = [...sorted];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];

    startTransition(async () => {
      const result = await reorderTopupPackagesAction(reordered.map((item) => item.id));
      if (!result.ok) {
        setToast({ type: "err", text: result.error ?? "Không đổi thứ tự được." });
        return;
      }
      setPackages(
        reordered.map((item, idx) => ({ ...item, sort_order: idx + 1 }))
      );
      setToast({ type: "ok", text: "Đã cập nhật thứ tự gói." });
    });
  }

  return (
    <MoneySettingCard
      className="lg:col-span-2"
      description="Quản lý các mốc nạp tiền, số Coin nhận được và bonus từng mốc."
      id="coin-topup-packages"
      title="Gói nạp Coin"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          {packages.length} gói · {packages.filter((p) => p.is_active).length} đang bật · tối đa{" "}
          {TOPUP_MAX_RECOMMENDED_PACKAGES} gói đề xuất ({recommendedCount} hiện tại)
        </p>
        {canEdit ? (
          <Button onClick={openCreate} type="button">
            Thêm gói nạp
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === option.id
                ? "bg-cyan-400/20 text-cyan-200"
                : "border border-white/10 text-zinc-400 hover:text-zinc-200"
            }`}
            key={option.id}
            onClick={() => setFilter(option.id)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {toast ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            toast.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {toast.text}
        </p>
      ) : null}

      <div className="max-h-[420px] overflow-auto rounded-xl border border-white/10">
        <table className="min-w-[960px] w-full text-sm">
          <thead className="sticky top-0 bg-zinc-900/95 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Tên gói</th>
              <th className="px-3 py-2">Số tiền</th>
              <th className="px-3 py-2">Coin gốc</th>
              <th className="px-3 py-2">Bonus %</th>
              <th className="px-3 py-2">Coin bonus</th>
              <th className="px-3 py-2">Tổng coin</th>
              <th className="px-3 py-2">Nhãn</th>
              <th className="px-3 py-2">Đề xuất</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="px-3 py-2">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pkg) => (
              <tr className="border-t border-white/5 hover:bg-white/[0.02]" key={pkg.id}>
                <td className="px-3 py-2 text-zinc-400">
                  <div className="flex items-center gap-1">
                    <span>{pkg.sort_order}</span>
                    {canEdit ? (
                      <span className="flex flex-col">
                        <button
                          className="text-[10px] text-zinc-500 hover:text-cyan-300"
                          disabled={pending}
                          onClick={() => movePackage(pkg, -1)}
                          type="button"
                        >
                          ▲
                        </button>
                        <button
                          className="text-[10px] text-zinc-500 hover:text-cyan-300"
                          disabled={pending}
                          onClick={() => movePackage(pkg, 1)}
                          type="button"
                        >
                          ▼
                        </button>
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-white">{pkg.name}</td>
                <td className="px-3 py-2 text-zinc-300">{formatVnd(pkg.amount_vnd)}</td>
                <td className="px-3 py-2 text-zinc-300">
                  {pkg.base_coin_amount.toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2 text-amber-200">{pkg.bonus_percent}%</td>
                <td className="px-3 py-2 text-amber-200">
                  {pkg.bonus_coin_amount.toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2 font-semibold text-cyan-300">
                  {pkg.total_coin_amount.toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2 text-xs text-amber-200">{pkg.badge_text ?? "—"}</td>
                <td className="px-3 py-2">
                  {pkg.is_recommended ? (
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-200">
                      Có
                    </span>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      pkg.is_active
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-zinc-600/30 text-zinc-400"
                    }`}
                  >
                    {pkg.is_active ? "Bật" : "Tắt"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <div className="flex flex-wrap gap-1">
                      <button
                        className="rounded px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10"
                        disabled={pending}
                        onClick={() => openEdit(pkg)}
                        type="button"
                      >
                        Sửa
                      </button>
                      <button
                        className="rounded px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10"
                        disabled={pending}
                        onClick={() => handleDuplicate(pkg)}
                        type="button"
                      >
                        Nhân bản
                      </button>
                      <button
                        className="rounded px-2 py-1 text-xs text-zinc-300 hover:bg-white/5"
                        disabled={pending}
                        onClick={() => handleToggle(pkg)}
                        type="button"
                      >
                        {pkg.is_active ? "Tắt" : "Bật"}
                      </button>
                      <button
                        className="rounded px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                        disabled={pending}
                        onClick={() => setDeleteTarget(pkg)}
                        type="button"
                      >
                        Xóa
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500">Chỉ xem</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-zinc-500" colSpan={11}>
                  Không có gói nạp phù hợp bộ lọc.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <UserPreviewPanel packages={packages} />

      <TopupPackageFormModal
        canEdit={canEdit}
        confirmHighBonus={confirmHighBonus}
        exchangeRateVnd={exchangeRateVnd}
        form={form}
        onChange={setForm}
        onClose={() => setFormOpen(false)}
        onConfirmHighBonus={setConfirmHighBonus}
        onSubmit={handleSave}
        open={formOpen}
        packages={packages}
        pending={pending}
      />

      <ConfirmActionModal
        confirmLabel="Xóa gói"
        description="Gói nạp sẽ bị xóa vĩnh viễn. Nếu đã có giao dịch, hệ thống sẽ từ chối."
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        open={Boolean(deleteTarget)}
        pending={pending}
        title="Xóa gói nạp?"
        variant="danger"
      />
    </MoneySettingCard>
  );
}

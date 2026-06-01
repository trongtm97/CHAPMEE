"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { resolveMonetizationSettingsPermissions } from "@/lib/auth/monetization-settings-permissions";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { TOPUP_PACKAGE_AUDIT_ACTIONS } from "@/lib/topup-packages/constants";
import { validateTopupPackageForm } from "@/lib/topup-packages/validation";
import { insertCoinTopupPackageAuditLog } from "@/lib/supabase/coin-topup-package-audit";
import {
  deleteTopupPackage,
  duplicateTopupPackage,
  getCoinPacksForAdmin,
  reorderTopupPackages,
  saveTopupPackage,
  snapshotPackage,
  toggleTopupPackageActive
} from "@/lib/supabase/coin-packs";
import type { TopupPackageFormInput } from "@/types/topup-package";

const REVALIDATE_PATHS = ["/admin/monetization-settings", "/wallet", "/coin/checkout"];

function revalidateTopupPaths() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

async function assertCanEditTopupPackages() {
  const ctx = await getCurrentAuthContext();
  if (!ctx) {
    return { ok: false as const, error: "Bạn cần đăng nhập.", ctx: null };
  }

  const permissions = resolveMonetizationSettingsPermissions(ctx);
  if (!permissions.canUpdateCoin) {
    return {
      ok: false as const,
      error: "Bạn không có quyền chỉnh gói nạp coin.",
      ctx: null
    };
  }

  return { ok: true as const, error: null, ctx };
}

function isElevated(ctx: NonNullable<Awaited<ReturnType<typeof getCurrentAuthContext>>>) {
  return ctx.roles.includes("owner") || ctx.roles.includes("super_admin");
}

async function auditTopupChange(input: {
  actorId: string;
  action: string;
  packageId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}) {
  await Promise.all([
    insertCoinTopupPackageAuditLog({
      packageId: input.packageId,
      actorId: input.actorId,
      action: input.action,
      oldValue: input.oldValue,
      newValue: input.newValue
    }),
    logAdminAction({
      actorId: input.actorId,
      action: `coin_topup_package.${input.action}`,
      targetType: "coin_topup_package",
      targetId: input.packageId ?? undefined,
      metadata: { old_value: input.oldValue, new_value: input.newValue }
    })
  ]);
}

async function getExchangeRateVnd() {
  const config = await getMonetizationConfig({ includePrivate: true, useCache: false });
  const rate = Number(config.settings["coin.exchange_rate_vnd"]);
  return Number.isFinite(rate) && rate > 0 ? rate : 1000;
}

export async function saveTopupPackageAction(input: TopupPackageFormInput) {
  const auth = await assertCanEditTopupPackages();
  if (!auth.ok || !auth.ctx) {
    return { ok: false, error: auth.error };
  }

  const [allPackages, exchangeRateVnd] = await Promise.all([
    getCoinPacksForAdmin(),
    getExchangeRateVnd()
  ]);

  const validation = validateTopupPackageForm({
    amountVnd: input.amountVnd,
    bonusPercent: input.bonusPercent,
    isActive: input.isActive,
    isRecommended: input.isRecommended,
    excludeId: input.id,
    existingPackages: allPackages.data,
    confirmHighBonus: input.confirmHighBonus,
    isElevatedAdmin: isElevated(auth.ctx)
  });

  if (!validation.ok) {
    return {
      ok: false,
      error: validation.errors[0] ?? "Dữ liệu không hợp lệ.",
      warnings: validation.warnings,
      requiresHighBonusConfirm: validation.requiresHighBonusConfirm
    };
  }

  const previous = input.id
    ? allPackages.data.find((pkg) => pkg.id === input.id) ?? null
    : null;

  const result = await saveTopupPackage({
    ...input,
    exchangeRateVnd,
    actorId: auth.ctx.userId
  });

  if (!result.data) {
    return { ok: false, error: result.error ?? "Không lưu được gói nạp." };
  }

  await auditTopupChange({
    actorId: auth.ctx.userId,
    action: input.id
      ? TOPUP_PACKAGE_AUDIT_ACTIONS.update
      : TOPUP_PACKAGE_AUDIT_ACTIONS.create,
    packageId: result.data.id,
    oldValue: snapshotPackage(previous),
    newValue: snapshotPackage(result.data)
  });

  revalidateTopupPaths();
  return { ok: true, error: null, data: result.data, warnings: validation.warnings };
}

export async function toggleTopupPackageAction(packId: string, isActive: boolean) {
  const auth = await assertCanEditTopupPackages();
  if (!auth.ok || !auth.ctx) {
    return { ok: false, error: auth.error };
  }

  if (isActive) {
    const allPackages = await getCoinPacksForAdmin();
    const target = allPackages.data.find((pkg) => pkg.id === packId);
    if (target) {
      const validation = validateTopupPackageForm({
        amountVnd: target.amount_vnd,
        bonusPercent: target.bonus_percent,
        isActive: true,
        isRecommended: target.is_recommended,
        excludeId: packId,
        existingPackages: allPackages.data,
        isElevatedAdmin: isElevated(auth.ctx)
      });
      if (!validation.ok) {
        return { ok: false, error: validation.errors[0] ?? "Không thể bật gói." };
      }
    }
  }

  const result = await toggleTopupPackageActive(packId, isActive, auth.ctx.userId);
  if (!result.data) {
    return { ok: false, error: result.error ?? "Không cập nhật được trạng thái." };
  }

  await auditTopupChange({
    actorId: auth.ctx.userId,
    action: TOPUP_PACKAGE_AUDIT_ACTIONS.toggle,
    packageId: packId,
    oldValue: snapshotPackage(result.previous),
    newValue: snapshotPackage(result.data)
  });

  revalidateTopupPaths();
  return { ok: true, error: null, data: result.data };
}

export async function deleteTopupPackageAction(packId: string) {
  const auth = await assertCanEditTopupPackages();
  if (!auth.ok || !auth.ctx) {
    return { ok: false, error: auth.error };
  }

  const result = await deleteTopupPackage(packId);
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Không xóa được gói." };
  }

  await auditTopupChange({
    actorId: auth.ctx.userId,
    action: TOPUP_PACKAGE_AUDIT_ACTIONS.delete,
    packageId: packId,
    oldValue: snapshotPackage(result.previous),
    newValue: null
  });

  revalidateTopupPaths();
  return { ok: true, error: null };
}

export async function duplicateTopupPackageAction(packId: string) {
  const auth = await assertCanEditTopupPackages();
  if (!auth.ok || !auth.ctx) {
    return { ok: false, error: auth.error };
  }

  const exchangeRateVnd = await getExchangeRateVnd();
  const result = await duplicateTopupPackage(packId, auth.ctx.userId, exchangeRateVnd);
  if (!result.data) {
    return { ok: false, error: result.error ?? "Không nhân bản được gói." };
  }

  await auditTopupChange({
    actorId: auth.ctx.userId,
    action: TOPUP_PACKAGE_AUDIT_ACTIONS.duplicate,
    packageId: result.data.id,
    oldValue: { source_id: packId },
    newValue: snapshotPackage(result.data)
  });

  revalidateTopupPaths();
  return { ok: true, error: null, data: result.data };
}

export async function reorderTopupPackagesAction(orderedIds: string[]) {
  const auth = await assertCanEditTopupPackages();
  if (!auth.ok || !auth.ctx) {
    return { ok: false, error: auth.error };
  }

  const before = await getCoinPacksForAdmin();
  const result = await reorderTopupPackages(orderedIds, auth.ctx.userId);
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Không đổi thứ tự được." };
  }

  await auditTopupChange({
    actorId: auth.ctx.userId,
    action: TOPUP_PACKAGE_AUDIT_ACTIONS.reorder,
    packageId: null,
    oldValue: {
      order: before.data.map((pkg) => ({ id: pkg.id, sort_order: pkg.sort_order }))
    },
    newValue: { order: orderedIds.map((id, index) => ({ id, sort_order: index + 1 })) }
  });

  revalidateTopupPaths();
  return { ok: true, error: null };
}

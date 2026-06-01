"use server";

import { redirect } from "next/navigation";
import { requireWalletAdjustAccess } from "@/lib/auth/finance-guards";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createCheckoutSession, simulateMockCheckoutPaidAction } from "@/lib/payments/create-checkout";
import { createTopupIntent } from "@/lib/payments/create-topup-intent";
import {
  FORBIDDEN_TOPUP_CLIENT_FIELDS,
  rejectForbiddenTopupClientFields
} from "@/lib/topup-packages/validate-payment";
import type { PaymentProviderKey } from "@/types/payment";

function readForbiddenFieldsFromFormData(formData: FormData) {
  const payload: Record<string, unknown> = {};
  for (const key of FORBIDDEN_TOPUP_CLIENT_FIELDS) {
    payload[key] = formData.get(key);
  }
  return rejectForbiddenTopupClientFields(payload);
}

export async function createTopupIntentAction(input: {
  packageId: string;
  paymentMethod?: PaymentProviderKey;
}) {
  const { user } = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để nạp coin." };
  }

  const provider = input.paymentMethod ?? "sepay";
  if (provider !== "sepay") {
    return { ok: false, error: "MVP hiện tại chỉ hỗ trợ SePay trên Web/PWA." };
  }

  return createTopupIntent({
    userId: user.id,
    packageId: input.packageId,
    provider
  });
}

export async function createCheckoutForCurrentUserAction(formData: FormData) {
  const forbidden = readForbiddenFieldsFromFormData(formData);
  if (!forbidden.ok) {
    return { ok: false, error: forbidden.error };
  }

  const { user } = await getCurrentUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập để nạp coin." };

  const packageId = String(formData.get("package_id") ?? formData.get("coin_pack_id") ?? "");
  const provider = String(formData.get("provider") ?? formData.get("payment_method") ?? "sepay") as PaymentProviderKey;

  if (provider !== "sepay") {
    return { ok: false, error: "MVP hiện tại chỉ hỗ trợ SePay trên Web/PWA." };
  }

  const result = await createCheckoutSession(user.id, packageId, provider);

  if (!result.data) {
    return { ok: false, error: result.error ?? "Không tạo được checkout session." };
  }

  if (result.next?.redirectUrl) {
    redirect(result.next.redirectUrl);
  }

  if (provider === "sepay") {
    redirect(`/checkout/${result.data.id}`);
  }

  return {
    ok: true,
    error: null,
    checkoutSessionId: result.data.id,
    instruction: result.next?.instruction ?? null
  };
}

export async function simulateCheckoutPaidByAdminAction(formData: FormData) {
  const auth = await requireWalletAdjustAccess();
  if (!auth.ok) return { ok: false, error: auth.error };

  const sessionId = String(formData.get("checkout_session_id") ?? "");
  if (!sessionId) return { ok: false, error: "Thiếu checkout session id." };
  return simulateMockCheckoutPaidAction(sessionId);
}

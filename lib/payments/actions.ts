"use server";

import { redirect } from "next/navigation";
import { requireWalletAdjustAccess } from "@/lib/auth/finance-guards";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createCheckoutSession, simulateMockCheckoutPaidAction } from "@/lib/payments/create-checkout";
import type { PaymentProviderKey } from "@/types/payment";

export async function createCheckoutForCurrentUserAction(formData: FormData) {
  const { user } = await getCurrentUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập để nạp coin." };

  const coinPackId = String(formData.get("coin_pack_id") ?? "");
  const provider = String(formData.get("provider") ?? "") as PaymentProviderKey;
  if (provider !== "sepay") {
    return { ok: false, error: "MVP hien tai chi ho tro SePay tren Web/PWA." };
  }
  const result = await createCheckoutSession(user.id, coinPackId, provider);

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

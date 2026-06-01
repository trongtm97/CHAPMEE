import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createTopupIntent } from "@/lib/payments/create-topup-intent";
import {
  rejectForbiddenTopupClientFields
} from "@/lib/topup-packages/validate-payment";
import type { PaymentProviderKey } from "@/types/payment";

export const dynamic = "force-dynamic";

type TopupIntentBody = {
  package_id?: string;
  payment_method?: string;
  amount_vnd?: unknown;
  total_coin?: unknown;
};

const ALLOWED_PAYMENT_METHODS = new Set<PaymentProviderKey>(["sepay"]);

/** Create pending top-up checkout — accepts package_id only (server reads amount/coin from DB). */
export async function POST(request: Request) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Bạn cần đăng nhập để nạp coin." }, { status: 401 });
  }

  let body: TopupIntentBody;
  try {
    body = (await request.json()) as TopupIntentBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const forbidden = rejectForbiddenTopupClientFields(body as Record<string, unknown>);
  if (!forbidden.ok) {
    return NextResponse.json({ ok: false, error: forbidden.error }, { status: 400 });
  }

  const packageId = String(body.package_id ?? "").trim();
  if (!packageId) {
    return NextResponse.json({ ok: false, error: "Thiếu package_id." }, { status: 400 });
  }

  const paymentMethod = (body.payment_method ?? "sepay") as PaymentProviderKey;
  if (!ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
    return NextResponse.json(
      { ok: false, error: "Payment method không được hỗ trợ." },
      { status: 400 }
    );
  }

  const result = await createTopupIntent({
    userId: user.id,
    packageId,
    provider: paymentMethod
  });

  if (!result.ok) {
    const status =
      result.error?.includes("tồn tại") || result.error?.includes("tắt") ? 404 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    checkout_session_id: result.checkoutSessionId,
    redirect_url: result.redirectUrl,
    instruction: result.instruction
  });
}

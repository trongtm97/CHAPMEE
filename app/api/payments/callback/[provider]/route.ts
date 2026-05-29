import { NextResponse } from "next/server";
import { handlePaymentCallback } from "@/lib/payments/create-checkout";
import type { PaymentProviderKey } from "@/types/payment";

type CallbackRouteProps = {
  params: Promise<{ provider: string }>;
};

export async function POST(request: Request, { params }: CallbackRouteProps) {
  const { provider } = await params;
  const payload = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const result = await handlePaymentCallback(
    provider as PaymentProviderKey,
    payload
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Callback failed." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, sessionId: result.sessionId });
}

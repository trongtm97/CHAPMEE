import { NextResponse } from "next/server";
import { handlePaymentRefundCallback } from "@/lib/monetization/provider-callbacks";

type Props = {
  params: Promise<{ provider: string }>;
};

export async function POST(request: Request, { params }: Props) {
  const { provider } = await params;
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await handlePaymentRefundCallback(provider, payload);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error ?? "Refund callback failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

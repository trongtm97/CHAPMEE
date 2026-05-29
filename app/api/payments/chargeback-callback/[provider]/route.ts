import { NextResponse } from "next/server";
import { handleChargebackCallback } from "@/lib/monetization/provider-callbacks";

type Props = {
  params: Promise<{ provider: string }>;
};

export async function POST(request: Request, { params }: Props) {
  const { provider } = await params;
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await handleChargebackCallback(provider, payload);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error ?? "Chargeback callback failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

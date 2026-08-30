import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCheckoutSessionById, updateCheckoutSessionStatus } from "@/lib/data/checkout-sessions";

type StatusRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: StatusRouteProps) {
  const { id } = await params;
  const [{ profile }, session] = await Promise.all([getCurrentUser(), getCheckoutSessionById(id)]);
  if (!session.data) {
    return NextResponse.json({ ok: false, error: session.error ?? "Checkout not found." }, { status: 404 });
  }

  const isOwner = profile?.id === session.data.user_id;
  const isAdmin = profile?.role === "admin" || profile?.role === "founder";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  if (
    session.data.status === "pending" &&
    session.data.expires_at &&
    new Date(session.data.expires_at).getTime() < Date.now()
  ) {
    const expired = await updateCheckoutSessionStatus({
      sessionId: session.data.id,
      status: "expired"
    });
    return NextResponse.json({ ok: true, data: expired.data ?? session.data });
  }

  return NextResponse.json({ ok: true, data: session.data });
}

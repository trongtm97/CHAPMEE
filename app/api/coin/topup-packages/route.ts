import { NextResponse } from "next/server";
import { getActiveTopupPackages } from "@/lib/topup-packages/read";

export const dynamic = "force-dynamic";

/** Public read-only list of active coin top-up packages (admin DB is source of truth). */
export async function GET() {
  const result = await getActiveTopupPackages();

  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error, packages: [] }, { status: 500 });
  }

  return NextResponse.json({ ok: true, packages: result.data });
}

import { NextResponse } from "next/server";
import { resolveMobileTopBarConfig } from "@/lib/layout/mobile-top-bar-config";
import { getMonetizationConfig } from "@/lib/monetization/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { settings } = await getMonetizationConfig();
    return NextResponse.json(resolveMobileTopBarConfig(settings));
  } catch {
    return NextResponse.json({
      enableCoinWallet: true,
      streakDays: null
    } satisfies ReturnType<typeof resolveMobileTopBarConfig>);
  }
}

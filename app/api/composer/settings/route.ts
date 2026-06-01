import { NextResponse } from "next/server";
import { getComposerAdminSettings } from "@/lib/composer/composer-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getComposerAdminSettings();
  return NextResponse.json({
    modes: settings.modes,
    blockTypes: settings.blockTypes
  });
}

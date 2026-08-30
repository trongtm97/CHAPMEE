import { headers } from "next/headers";
import { logSeo404Hit } from "@/lib/seo/404-log-service";

export async function logSeo404OnNotFound(): Promise<void> {
  try {
    const headerList = await headers();
    const path =
      headerList.get("x-seo-pathname") ??
      headerList.get("x-invoke-path") ??
      headerList.get("next-url") ??
      "/";

    await logSeo404Hit({
      path,
      referrer: headerList.get("referer"),
      userAgent: headerList.get("user-agent")
    });
  } catch {
    return;
  }
}

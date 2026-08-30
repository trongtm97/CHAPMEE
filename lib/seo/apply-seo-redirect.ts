import { NextResponse, type NextRequest } from "next/server";
import {
  lookupCachedSeoRedirect,
  shouldRecordRedirectHit
} from "@/lib/seo/redirect-cache";
import { recordSeoRedirectHit } from "@/lib/seo/redirect-service";

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const SKIP_PREFIXES = [
  "/api/",
  "/_next/",
  "/admin",
  "/favicon",
  "/robots.txt",
  "/sitemap",
  "/manifest"
];

function hasStaticAssetExtension(pathname: string): boolean {
  return /\.[a-zA-Z0-9]{2,8}$/.test(pathname);
}

export function shouldSkipSeoRedirect(pathname: string): boolean {
  if (hasStaticAssetExtension(pathname)) {
    return true;
  }

  return SKIP_PREFIXES.some(
    (prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix)
  );
}

export async function applySeoRedirect(
  request: NextRequest
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  if (shouldSkipSeoRedirect(pathname)) {
    return null;
  }

  let redirect;
  try {
    redirect = await lookupCachedSeoRedirect(pathname);
  } catch (error) {
    console.error("[seo_redirects] lookup failed", error);
    return null;
  }

  if (!redirect) {
    return null;
  }

  let destination: URL;
  if (ABSOLUTE_URL_REGEX.test(redirect.destinationPath)) {
    destination = new URL(redirect.destinationPath);
    if (redirect.preserveQuery) {
      request.nextUrl.searchParams.forEach((value, key) => {
        if (!destination.searchParams.has(key)) {
          destination.searchParams.set(key, value);
        }
      });
    }
  } else {
    destination = request.nextUrl.clone();
    destination.pathname = redirect.destinationPath;
    if (!redirect.preserveQuery) {
      destination.search = "";
    }
  }

  if (shouldRecordRedirectHit(redirect.id)) {
    void recordSeoRedirectHit(redirect.id).catch((error) => {
      console.error("[seo_redirects] hit record failed", error);
    });
  }

  return NextResponse.redirect(destination, redirect.statusCode);
}

import { NextResponse, type NextRequest } from "next/server";
import { createDatabaseClient } from "@/lib/db/postgrest/create-client";
import { applySeoRedirect } from "@/lib/seo/apply-seo-redirect";
import { getSiteLaunchSettings } from "@/lib/settings/get-site-launch-settings";
import { isComingSoonAllowlistedPath } from "@/lib/site-launch/coming-soon-paths";
import { USERNAME_PATH_REGEX } from "@/lib/username/normalize-username";

const ADMIN_PREFIX = "/admin";
const ADMIN_PROFILE_ROLES = new Set(["admin", "moderator", "founder"]);

/** Only ever index https://chapmee.com — redirect www / http variants (no duplicate hosts). */
const CANONICAL_HOST = "chapmee.com";

function enforceCanonicalHost(request: NextRequest) {
  const rawHost = (request.headers.get("host") ?? "").toLowerCase();
  if (!rawHost) {
    return null;
  }

  const hostname = rawHost.split(":")[0];
  const isWww = hostname === `www.${CANONICAL_HOST}`;

  // Only act on the production apex/www domain — leave localhost, internal
  // health checks (127.0.0.1) and preview hosts untouched.
  if (hostname !== CANONICAL_HOST && !isWww) {
    return null;
  }

  const forwardedProto = (request.headers.get("x-forwarded-proto") ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  // Only force https when the proxy explicitly reports http, so a missing
  // header can never cause a redirect loop.
  const isHttp = forwardedProto === "http";

  if (!isWww && !isHttp) {
    return null;
  }

  const target = request.nextUrl.clone();
  target.protocol = "https:";
  target.host = CANONICAL_HOST;
  target.port = "";
  return NextResponse.redirect(target, 301);
}

const AT_PROFILE_PATH = new RegExp(
  `^/@(${USERNAME_PATH_REGEX})(/.*)?$`,
  "i"
);

function nextWithPathHeader(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-seo-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

async function userCanBypassComingSoon(
  db: ReturnType<typeof createDatabaseClient>,
  userId: string
): Promise<boolean> {
  const [{ data: canAccessAdmin }, { data: staffFallback }] = await Promise.all([
    db.rpc("user_has_any_permission", {
      input_user_id: userId,
      permission_codes: [
        "admin.dashboard.view",
        "admin.settings.view",
        "admin.settings.update",
        "report.review",
        "admin.user.view"
      ]
    }),
    db.rpc("is_staff_moderator", { input_user_id: userId })
  ]);

  const isStaffModerator =
    typeof staffFallback === "object" &&
    staffFallback !== null &&
    "data" in staffFallback &&
    (staffFallback as { data: boolean | null }).data === true;

  return canAccessAdmin === true || isStaffModerator;
}

async function applyComingSoonGate(request: NextRequest, pathname: string) {
  const launch = await getSiteLaunchSettings();
  if (!launch.coming_soon_enabled) {
    return null;
  }

  if (pathname === "/coming-soon" || isComingSoonAllowlistedPath(pathname)) {
    return null;
  }

  const db = createDatabaseClient();
  const {
    data: { user }
  } = await db.auth.getUser();

  if (user && (await userCanBypassComingSoon(db, user.id))) {
    return null;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/coming-soon";
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const canonicalHostRedirect = enforceCanonicalHost(request);
  if (canonicalHostRedirect) {
    return canonicalHostRedirect;
  }

  const seoRedirect = await applySeoRedirect(request);
  if (seoRedirect) {
    return seoRedirect;
  }

  const comingSoonRedirect = await applyComingSoonGate(request, pathname);
  if (comingSoonRedirect) {
    return comingSoonRedirect;
  }

  // `/@democreator` is one URL segment (`@democreator`), not `/@` + `democreator`.
  // Match with regex; Next `matcher` cannot express this path shape reliably.
  const atProfileMatch = pathname.match(AT_PROFILE_PATH);
  if (atProfileMatch) {
    const username = atProfileMatch[1].toLowerCase();
    const suffix = atProfileMatch[2] ?? "";
    const rewriteUrl = request.nextUrl.clone();
    if (suffix.startsWith("/collections/")) {
      rewriteUrl.pathname = `/me/${username}${suffix}`;
    } else {
      rewriteUrl.pathname = `/u/${username}${suffix || ""}`;
    }
    return NextResponse.rewrite(rewriteUrl);
  }

  if (!pathname.startsWith(ADMIN_PREFIX)) {
    return nextWithPathHeader(request, pathname);
  }

  const db = createDatabaseClient();
  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await db
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  const profileRole = typeof profile?.role === "string" ? profile.role.toLowerCase() : null;
  if (profileRole && ADMIN_PROFILE_ROLES.has(profileRole)) {
    return nextWithPathHeader(request, pathname);
  }

  const financePrefixes = [
    "/admin/finance",
    "/admin/transactions",
    "/admin/payments",
    "/admin/refunds",
    "/admin/payouts",
    "/admin/withdrawals",
    "/admin/risk",
    "/admin/bonus-pools"
  ];
  const isFinanceRoute = financePrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  const [{ data: canAccessAdmin }, { data: canAccessFinance }, { data: isFinanceStaff }] =
    await Promise.all([
      db.rpc("user_has_any_permission", {
        input_user_id: user.id,
        permission_codes: [
          "admin.dashboard.view",
          "report.review",
          "admin.user.view",
          "admin.audit.view"
        ]
      }),
      db.rpc("user_has_permission", {
        input_user_id: user.id,
        permission_code: "finance.dashboard.view"
      }),
      db.rpc("is_finance_staff", { input_user_id: user.id })
    ]);

  const staffFallback = await db.rpc("is_staff_moderator", {
    input_user_id: user.id
  });

  const hasStaffAccess =
    canAccessAdmin === true ||
    canAccessFinance === true ||
    staffFallback.data === true;

  if (!hasStaffAccess) {
    const deniedUrl = request.nextUrl.clone();
    deniedUrl.pathname = "/";
    deniedUrl.searchParams.set("error", "admin_forbidden");
    return NextResponse.redirect(deniedUrl);
  }

  if (isFinanceRoute && isFinanceStaff !== true) {
    const deniedUrl = request.nextUrl.clone();
    deniedUrl.pathname = "/admin";
    deniedUrl.searchParams.set("error", "finance_forbidden");
    return NextResponse.redirect(deniedUrl);
  }

  return nextWithPathHeader(request, pathname);
}

export const config = {
  matcher: [
    /*
     * Run on app routes (skip static files). Allow /robots.txt and /sitemap/* through
     * (they are metadata routes, not public-folder static assets).
     */
    "/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap|.*\\.[\\w]+$).*)"
  ]
};

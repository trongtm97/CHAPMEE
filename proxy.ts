import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_PREFIX = "/admin";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(ADMIN_PREFIX)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers }
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
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
      supabase.rpc("user_has_any_permission", {
        input_user_id: user.id,
        permission_codes: [
          "admin.dashboard.view",
          "report.review",
          "admin.user.view",
          "admin.audit.view"
        ]
      }),
      supabase.rpc("user_has_permission", {
        input_user_id: user.id,
        permission_code: "finance.dashboard.view"
      }),
      supabase.rpc("is_finance_staff", { input_user_id: user.id })
    ]);

  const staffFallback = await supabase.rpc("is_staff_moderator", {
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

  return response;
}

export const config = {
  matcher: ["/admin/:path*"]
};

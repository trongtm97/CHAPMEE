import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthEntryPageShell } from "@/components/auth/AuthEntryPageShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { sanitizeAuthRedirect } from "@/lib/auth/safe-auth-redirect";
import { STUDIO_NOINDEX_ROBOTS } from "@/lib/seo/should-index";

export const metadata: Metadata = {
  title: "Đăng nhập | ChapMee",
  robots: STUDIO_NOINDEX_ROBOTS
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const nextValue =
    typeof params.next === "string"
      ? params.next
      : typeof params.returnUrl === "string"
        ? params.returnUrl
        : typeof params.callbackUrl === "string"
          ? params.callbackUrl
          : undefined;
  const redirectPath = sanitizeAuthRedirect(nextValue, "/me");
  const user = await getSessionUser();

  if (user) {
    redirect(redirectPath);
  }

  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return (
    <AuthEntryPageShell variant="login">
      <Suspense fallback={null}>
        <LoginForm googleEnabled={googleEnabled} />
      </Suspense>
    </AuthEntryPageShell>
  );
}

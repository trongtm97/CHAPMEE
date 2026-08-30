"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { authClient } from "@/lib/auth/browser-auth";
import { sanitizeAuthRedirect } from "@/lib/auth/safe-auth-redirect";

type GoogleSignInButtonProps = {
  enabled: boolean;
  nextParamName?: string;
  fallbackPath?: string;
  compact?: boolean;
};

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
      <path
        d="M21.8 12.23c0-.72-.06-1.25-.19-1.81H12v3.42h5.64c-.11.85-.73 2.14-2.11 3l-.02.11 3.01 2.28.21.02c1.93-1.75 3.06-4.31 3.06-7.02Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.07-.89 6.76-2.41l-3.22-2.41c-.86.59-2.01 1-3.54 1-2.7 0-4.98-1.75-5.8-4.17l-.11.01-3.13 2.36-.04.1C4.59 19.75 8.02 22 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.2 14.01A5.85 5.85 0 0 1 5.86 12c0-.7.12-1.37.33-2.01l-.01-.13-3.17-2.4-.1.05A9.83 9.83 0 0 0 2 12c0 1.58.38 3.08 1.05 4.49l3.15-2.48Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.82c1.93 0 3.24.82 3.98 1.5l2.9-2.77C17.06 2.89 14.76 2 12 2 8.02 2 4.59 4.25 2.91 7.51l3.28 2.48c.82-2.42 3.1-4.17 5.81-4.17Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  enabled,
  nextParamName = "next",
  fallbackPath = "/me",
  compact = false
}: GoogleSignInButtonProps) {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const callbackPath = useMemo(
    () => sanitizeAuthRedirect(searchParams.get(nextParamName), fallbackPath),
    [fallbackPath, nextParamName, searchParams]
  );

  async function handleGoogleSignIn() {
    if (!enabled || loading) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { data, error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackPath,
        newUserCallbackURL: callbackPath,
        errorCallbackURL: `/login?error=google_oauth_failed&next=${encodeURIComponent(callbackPath)}`
      });

      if (error) {
        setLoading(false);
        setError(
          error.message ?? "Không thể đăng nhập bằng Google. Vui lòng thử lại."
        );
        return;
      }

      if (data?.url && data.redirect === false) {
        window.location.href = data.url;
        return;
      }
    } catch (caughtError) {
      setLoading(false);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể đăng nhập bằng Google. Vui lòng thử lại."
      );
    }
  }

  if (!enabled) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        className={
          compact
            ? "min-h-10 w-full gap-2.5 rounded-lg border-slate-200/10 bg-white text-sm font-semibold normal-case tracking-normal text-slate-950 shadow-none hover:bg-slate-100"
            : "min-h-12 w-full gap-3 rounded-[1rem] border-slate-200/10 bg-white text-slate-950 shadow-[0_18px_45px_rgba(255,255,255,0.08)] hover:bg-slate-100"
        }
        disabled={loading}
        loading={loading}
        onClick={handleGoogleSignIn}
        type="button"
        variant="secondary"
      >
        {!loading ? <GoogleIcon /> : null}
        <span>
          {loading ? "Đang chuyển tới Google..." : "Tiếp tục với Google"}
        </span>
      </Button>
      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}

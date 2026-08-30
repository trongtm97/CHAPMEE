"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLoginConsentNotice } from "@/components/legal/ImplicitConsentNotice";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button, Input } from "@/components/ui";
import {
  buildAuthErrorMessage,
  sanitizeAuthRedirect
} from "@/lib/auth/safe-auth-redirect";
import { createClient } from "@/lib/data/client";

const inputClassName =
  "min-h-10 rounded-xl border-white/10 bg-white/[0.03] px-3.5 text-sm";

async function ensureProfile() {
  const response = await fetch("/api/auth/ensure-profile", {
    method: "POST",
    credentials: "include"
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? "Không thể khởi tạo hồ sơ.");
  }
}

export function LoginForm({
  googleEnabled = false
}: {
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeAuthRedirect(searchParams.get("next"), "/me");
  const resetSuccess = searchParams.get("reset") === "success";
  const oauthError = buildAuthErrorMessage(searchParams.get("error"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Vui lòng nhập email của bạn.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Email chưa đúng định dạng.");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    setLoading(true);

    try {
      const db = createClient();
      const { data, error: loginError } = await db.auth.signInWithPassword({
        email: trimmedEmail,
        password,
        rememberMe: true
      });

      if (loginError) {
        const message = loginError.message.toLowerCase();
        setError(
          message.includes("invalid") || message.includes("credentials")
            ? "Email hoặc mật khẩu chưa đúng."
            : message.includes("not found")
              ? "Tài khoản chưa tồn tại."
              : "Không thể kết nối máy chủ, vui lòng thử lại."
        );
        return;
      }

      if (data.user) {
        await ensureProfile();
      }

      router.refresh();
      router.push(nextPath);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message === "Failed to fetch" ||
            caughtError.message === "Load failed"
            ? "Không thể kết nối máy chủ, vui lòng thử lại."
            : caughtError.message
          : "Không đăng nhập được. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-[-0.02em] text-white sm:text-[1.375rem]">
          Đăng nhập
        </h2>
        <p className="text-sm text-slate-400">
          Tiếp tục với Google hoặc email của bạn.
        </p>
      </div>

      <div className="space-y-3">
        <GoogleSignInButton
          compact
          enabled={googleEnabled}
          fallbackPath={nextPath}
        />
        {googleEnabled ? (
          <AuthLoginConsentNotice className="text-center text-[0.6875rem] leading-relaxed text-slate-500" />
        ) : null}
        {googleEnabled ? (
          <div className="flex items-center gap-2.5 text-xs text-slate-500">
            <span className="h-px flex-1 bg-white/10" />
            <span>Hoặc dùng email</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
        ) : null}
      </div>

      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <Input
          autoComplete="email"
          className={inputClassName}
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ban@example.com"
          required
          type="email"
          value={email}
        />
        <Input
          autoComplete="current-password"
          className={inputClassName}
          label="Mật khẩu"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mật khẩu của bạn"
          required
          type={showPassword ? "text" : "password"}
          value={password}
        />

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs sm:text-sm">
          <button
            className="font-medium text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          </button>
          <span className="text-slate-500">Giữ phiên đăng nhập</span>
        </div>

        <div className="flex justify-end">
          <Link
            className="text-xs font-semibold text-sky-300 hover:text-sky-200 hover:underline sm:text-sm"
            href="/forgot-password"
          >
            Quên mật khẩu?
          </Link>
        </div>

        {resetSuccess ? (
          <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
            Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.
          </p>
        ) : null}
        {oauthError ? (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            {oauthError}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <AuthLoginConsentNotice className="text-center text-xs leading-relaxed text-slate-500" />
        <Button
          className="min-h-10 w-full rounded-lg bg-sky-400 text-sm font-semibold normal-case tracking-normal text-slate-950 hover:bg-sky-300"
          loading={loading}
          type="submit"
        >
          Đăng nhập
        </Button>

        <p className="text-center text-xs text-slate-400 sm:text-sm">
          Chưa có tài khoản?{" "}
          <Link
            className="font-semibold text-sky-300 hover:text-sky-200"
            href="/register"
          >
            Đăng ký
          </Link>
        </p>
      </form>
    </div>
  );
}

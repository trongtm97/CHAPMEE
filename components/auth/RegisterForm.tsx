"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthRegisterConsentNotice } from "@/components/legal/ImplicitConsentNotice";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button, EmailDeliveryNotice, Input } from "@/components/ui";
import { sanitizeAuthRedirect } from "@/lib/auth/safe-auth-redirect";
import { createClient } from "@/lib/data/client";
import { validateDisplayName as validateDisplayNameFormat } from "@/lib/profile/validateProfile";
import { checkDisplayNamePolicyAction } from "@/lib/username/policy-actions";

const inputClassName =
  "min-h-10 rounded-xl border-white/10 bg-white/[0.03] px-3.5 text-sm";

export function RegisterForm({
  googleEnabled = false
}: {
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackPath = sanitizeAuthRedirect(searchParams.get("next"), "/me");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const displayNameFormatError = validateDisplayNameFormat(displayName);
    if (displayNameFormatError) {
      setError(displayNameFormatError);
      setLoading(false);
      return;
    }

    const displayNamePolicy = await checkDisplayNamePolicyAction(displayName);
    if (!displayNamePolicy.valid) {
      setError(displayNamePolicy.message ?? "Tên hiển thị không hợp lệ.");
      setLoading(false);
      return;
    }

    try {
      const db = createClient();
      const { data, error: registerError } = await db.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      });

      if (registerError) {
        setError(registerError.message);
        return;
      }

      if (data.user && data.session) {
        router.refresh();
        router.push(callbackPath);
        return;
      }

      setMessage("Đã tạo tài khoản. Vui lòng đăng nhập.");
    } catch (caughtError) {
      const msg = caughtError instanceof Error ? caughtError.message : "";
      setError(
        msg === "Failed to fetch" || msg === "Load failed"
          ? "Không kết nối được máy chủ đăng ký. Vui lòng tải lại trang hoặc thử lại sau."
          : msg || "Không tạo được tài khoản. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-[-0.02em] text-white sm:text-[1.375rem]">
          Đăng ký
        </h2>
        <p className="text-sm text-slate-400">
          Tiếp tục với Google hoặc tạo tài khoản bằng email.
        </p>
      </div>

      <div className="rounded-lg border border-amber-300/15 bg-amber-300/8 px-3 py-2.5">
        <EmailDeliveryNotice className="text-xs text-amber-100/90" compact />
      </div>

      <div className="space-y-3">
        <GoogleSignInButton
          compact
          enabled={googleEnabled}
          fallbackPath={callbackPath}
        />
        {googleEnabled ? (
          <AuthRegisterConsentNotice className="text-center text-[0.6875rem] leading-relaxed text-slate-500" />
        ) : null}
        {googleEnabled ? (
          <div className="flex items-center gap-2.5 text-xs text-slate-500">
            <span className="h-px flex-1 bg-white/10" />
            <span>Hoặc tạo bằng email</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
        ) : null}
      </div>

      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <Input
          autoComplete="name"
          className={inputClassName}
          label="Tên hiển thị"
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Tên trên ChapMee"
          required
          type="text"
          value={displayName}
        />
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
          autoComplete="new-password"
          className={inputClassName}
          label="Mật khẩu"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Ít nhất 8 ký tự"
          required
          type="password"
          value={password}
        />
        <p className="text-xs leading-relaxed text-slate-500">
          Bằng việc đăng ký, bạn dùng cùng tài khoản cho thư viện, ví Xu, bình
          luận và cộng đồng ChapMee.
        </p>
        {error ? (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
            {message}
          </p>
        ) : null}
        <AuthRegisterConsentNotice className="text-center text-xs leading-relaxed text-slate-500" />
        <Button
          className="min-h-10 w-full rounded-lg bg-sky-400 text-sm font-semibold normal-case tracking-normal text-slate-950 hover:bg-sky-300"
          loading={loading}
          type="submit"
        >
          Đăng ký
        </Button>
        <p className="text-center text-xs text-slate-400 sm:text-sm">
          Đã có tài khoản?{" "}
          <Link
            className="font-semibold text-sky-300 hover:text-sky-200"
            href="/login"
          >
            Đăng nhập
          </Link>
        </p>
      </form>
    </div>
  );
}

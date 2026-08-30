"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Card, EmailDeliveryNotice, Input } from "@/components/ui";
import { authClient } from "@/lib/auth/browser-auth";
import { withEmailSentSuccessHint } from "@/lib/email/email-delivery-copy";

function getResetPasswordRedirectUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}/reset-password`;
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const { error: resetError } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: getResetPasswordRedirectUrl()
      });

      if (resetError) {
        setError(
          resetError.message ?? "Không gửi được yêu cầu đặt lại mật khẩu."
        );
        return;
      }

      setMessage(
        withEmailSentSuccessHint(
          "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu."
        )
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không gửi được yêu cầu. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-6 rounded-[1.6rem] border-white/10 bg-transparent p-4 shadow-none sm:p-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-200/80">
          Gửi link đặt lại
        </p>
        <h2 className="text-2xl font-black tracking-[-0.03em] text-white">
          Lấy lại quyền truy cập tài khoản
        </h2>
        <p className="text-sm leading-7 text-slate-300">
          Nhập email đăng ký để ChapMee gửi cho bạn đường dẫn đổi mật khẩu an
          toàn.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3">
        <EmailDeliveryNotice className="text-amber-100/95" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          autoComplete="email"
          className="rounded-2xl border-white/10 bg-white/[0.03] px-4"
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ban@example.com"
          required
          type="email"
          value={email}
        />
        {error ? (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
            {message}
          </p>
        ) : null}
        <Button
          className="min-h-12 w-full rounded-[1rem] bg-sky-300 text-slate-950 normal-case tracking-normal hover:bg-sky-200"
          loading={loading}
          type="submit"
        >
          Gửi link đặt lại mật khẩu
        </Button>
        <p className="text-center text-sm text-slate-400">
          <Link
            className="font-semibold text-sky-300 hover:text-sky-200"
            href="/login"
          >
            Quay lại đăng nhập
          </Link>
        </p>
      </form>
    </Card>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, EmailDeliveryNotice, Input } from "@/components/ui";
import { authClient } from "@/lib/auth/browser-auth";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const queryError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tokenInvalid =
    queryError === "INVALID_TOKEN" || queryError === "invalid_token" || !token;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      return;
    }

    if (password.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token
      });

      if (resetError) {
        setError(resetError.message ?? "Không đặt lại được mật khẩu.");
        return;
      }

      router.refresh();
      router.push("/login?reset=success");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không đặt lại được mật khẩu. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }

  if (tokenInvalid) {
    return (
      <Card className="space-y-4 rounded-[1.6rem] border-white/10 bg-transparent p-4 shadow-none sm:p-5">
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu
          link mới.
        </p>
        <EmailDeliveryNotice compact />
        <Link
          className="tap-highlight inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.08]"
          href="/forgot-password"
        >
          Yêu cầu link mới
        </Link>
        <p className="text-center text-sm text-zinc-400">
          <Link className="font-semibold text-cyan-300" href="/login">
            Quay lại đăng nhập
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-6 rounded-[1.6rem] border-white/10 bg-transparent p-4 shadow-none sm:p-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200/80">
          Tạo mật khẩu mới
        </p>
        <h2 className="text-2xl font-black tracking-[-0.03em] text-white">
          Bảo vệ lại tài khoản ChapMee
        </h2>
        <p className="text-sm leading-7 text-slate-300">
          Chọn mật khẩu mới đủ mạnh để tiếp tục đăng nhập an toàn trên mọi thiết
          bị.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          autoComplete="new-password"
          className="rounded-2xl border-white/10 bg-white/[0.03] px-4"
          label="Mật khẩu mới"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Ít nhất 8 ký tự"
          required
          type={showPassword ? "text" : "password"}
          value={password}
        />
        <Input
          autoComplete="new-password"
          className="rounded-2xl border-white/10 bg-white/[0.03] px-4"
          label="Xác nhận mật khẩu"
          minLength={8}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Nhập lại mật khẩu"
          required
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
        />
        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            className="font-medium text-zinc-300 transition hover:text-white"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          </button>
          <span className="text-slate-500">
            Mật khẩu mới phải từ 8 ký tự trở lên
          </span>
        </div>
        {error ? (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        <Button
          className="min-h-12 w-full rounded-[1rem] bg-sky-300 text-slate-950 normal-case tracking-normal hover:bg-sky-200"
          loading={loading}
          type="submit"
        >
          Đặt mật khẩu mới
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

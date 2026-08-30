"use client";

import { useState, useTransition, type ReactNode } from "react";
import { MoneySettingCard } from "@/components/admin/MoneySettingCard";
import { Button, Input } from "@/components/ui";
import { saveSepaySettingsAction } from "@/lib/admin/sepay-settings-actions";
import type { PaymentProviderSetting } from "@/types/payment";

type Props = {
  setting: PaymentProviderSetting | null;
};

function cfg(setting: PaymentProviderSetting | null) {
  return (setting?.public_config ?? {}) as Record<string, unknown>;
}

function value(config: Record<string, unknown>, key: string, fallback = "") {
  const item = config[key];
  return typeof item === "string" ? item : fallback;
}

function checked(config: Record<string, unknown>, key: string, fallback = true) {
  const item = config[key];
  return typeof item === "boolean" ? item : fallback;
}

function FieldGroup({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function SepaySettingsSection({ setting }: Props) {
  const config = cfg(setting);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function action(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveSepaySettingsAction(formData);
      setMessage(
        result.ok ? "Đã lưu cấu hình SePay." : result.error ?? "Không lưu được cấu hình SePay."
      );
    });
  }

  return (
    <MoneySettingCard
      className="lg:col-span-2"
      description="Chuyển khoản / VietQR qua SePay. Webhook: POST /api/webhooks/sepay"
      id="sepay-payment"
      title="Thanh toán SePay"
    >
      <form action={action} className="space-y-4">
        <FieldGroup title="Bật & môi trường">
          <label className="flex items-center gap-2 text-sm text-zinc-200 sm:col-span-2">
            <input
              defaultChecked={setting?.enabled ?? false}
              name="enable_sepay_topup"
              type="checkbox"
            />
            Bật nạp Xu bằng SePay
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Môi trường</span>
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              defaultValue={setting?.test_mode === false ? "live" : "test"}
              name="sepay_environment"
            >
              <option value="test">Thử nghiệm</option>
              <option value="live">Chính thức</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Tên hiển thị</span>
            <Input
              defaultValue={value(config, "sepay_display_name", "Chuyển khoản ngân hàng")}
              name="sepay_display_name"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Hết hạn đơn nạp (phút)</span>
            <Input
              defaultValue={String(config.topup_order_expire_minutes ?? 30)}
              min={5}
              name="topup_order_expire_minutes"
              type="number"
            />
          </label>
        </FieldGroup>

        <FieldGroup title="Tài khoản nhận tiền">
          <label className="block text-sm">
            <span className="text-zinc-400">Mã ngân hàng (VietQR)</span>
            <Input defaultValue={value(config, "bank_code")} name="bank_code" required />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Số tài khoản</span>
            <Input
              defaultValue={value(config, "bank_account_number")}
              name="bank_account_number"
              required
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-zinc-400">Chủ tài khoản</span>
            <Input
              defaultValue={value(config, "bank_account_name")}
              name="bank_account_name"
              required
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-zinc-400">URL sinh mã QR</span>
            <Input
              defaultValue={value(config, "qr_base_url", "https://qr.sepay.vn/img")}
              name="qr_base_url"
            />
          </label>
        </FieldGroup>

        <FieldGroup title="Webhook & bảo mật">
          <label className="block text-sm">
            <span className="text-zinc-400">Xác thực webhook</span>
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              defaultValue={value(config, "sepay_auth_method", "hmac_sha256")}
              name="sepay_auth_method"
            >
              <option value="hmac_sha256">HMAC SHA-256</option>
              <option value="api_key">Khóa API</option>
              <option value="none">Không (chỉ thử nghiệm)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Loại giao dịch chấp nhận</span>
            <Input
              defaultValue={value(config, "allowed_transfer_type", "in")}
              name="allowed_transfer_type"
              placeholder="in"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Webhook secret (để trống nếu không đổi)</span>
            <Input
              autoComplete="new-password"
              name="sepay_webhook_secret"
              type="password"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">API key (để trống nếu không đổi)</span>
            <Input autoComplete="new-password" name="sepay_api_key" type="password" />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-zinc-400">STK hợp lệ (phân cách bằng dấu phẩy)</span>
            <Input
              defaultValue={
                Array.isArray(config.allowed_account_numbers)
                  ? config.allowed_account_numbers.join(",")
                  : ""
              }
              name="allowed_account_numbers"
            />
          </label>
        </FieldGroup>

        <FieldGroup title="Hiển thị & kênh">
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              defaultChecked={checked(config, "require_exact_amount", true)}
              name="require_exact_amount"
              type="checkbox"
            />
            Bắt buộc đúng số tiền
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              defaultChecked={checked(config, "qr_template_enabled", true)}
              name="qr_template_enabled"
              type="checkbox"
            />
            Hiển thị mã QR
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              defaultChecked={checked(config, "manual_bank_transfer_enabled", true)}
              name="manual_bank_transfer_enabled"
              type="checkbox"
            />
            Hiển thị thông tin CK thủ công
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              defaultChecked={checked(config, "enable_sepay_on_web", true)}
              name="enable_sepay_on_web"
              type="checkbox"
            />
            Bật trên web
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-200 sm:col-span-2">
            <input
              defaultChecked={checked(config, "enable_sepay_on_pwa", true)}
              name="enable_sepay_on_pwa"
              type="checkbox"
            />
            Bật trên PWA
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-zinc-400">Hướng dẫn cho người dùng</span>
            <textarea
              className="mt-1 min-h-20 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              defaultValue={value(config, "topup_payment_instruction")}
              name="topup_payment_instruction"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-zinc-400">Ghi chú hỗ trợ khi chuyển sai</span>
            <textarea
              className="mt-1 min-h-16 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              defaultValue={value(config, "topup_support_note")}
              name="topup_support_note"
            />
          </label>
        </FieldGroup>

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={pending} loading={pending} type="submit">
            Lưu SePay
          </Button>
          <code className="text-xs text-zinc-500">/api/webhooks/sepay</code>
          {message ? <span className="text-sm text-cyan-200">{message}</span> : null}
        </div>
      </form>
    </MoneySettingCard>
  );
}

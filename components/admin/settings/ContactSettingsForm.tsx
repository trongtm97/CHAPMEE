"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  ContactChannelCard,
  ContactResetConfirmModal,
  ContactStatusBadge
} from "@/components/admin/settings/ContactChannelCard";
import { ContactSettingsPreview } from "@/components/admin/settings/ContactSettingsPreview";
import { RecentFeedbackPanel } from "@/components/admin/settings/RecentFeedbackPanel";
import {
  resetContactSettingsAction,
  updateContactSettingsAction
} from "@/lib/admin/contact-settings-actions";
import { INITIAL_CONTACT_SETTINGS_ACTION_STATE } from "@/lib/admin/contact-settings-state";
import {
  ALL_FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABELS
} from "@/lib/feedback/constants";
import {
  getContactModuleStatus,
  toContactSettingsDb
} from "@/lib/settings/contact-settings-mapper";
import {
  hasValidationErrors,
  validateContactSettings
} from "@/lib/settings/validate-contact-settings";
import { Button, Card, Input, Textarea } from "@/components/ui";
import type { AdminFeedbackListItem, ContactSettings, FeedbackType } from "@/types/contact-settings";

type ContactSettingsFormProps = {
  initialSettings: ContactSettings;
  updatedAt: string | null;
  recentFeedback: AdminFeedbackListItem[];
};

export function ContactSettingsForm({
  initialSettings,
  updatedAt,
  recentFeedback
}: ContactSettingsFormProps) {
  const [values, setValues] = useState<ContactSettings>(initialSettings);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const initialPayloadRef = useRef(JSON.stringify(toContactSettingsDb(initialSettings)));

  const [saveState, saveAction, savePending] = useActionState(
    updateContactSettingsAction,
    { ...INITIAL_CONTACT_SETTINGS_ACTION_STATE, settings: initialSettings }
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetContactSettingsAction,
    INITIAL_CONTACT_SETTINGS_ACTION_STATE
  );

  useEffect(() => {
    if (saveState.ok && saveState.settings) {
      setValues(saveState.settings);
      initialPayloadRef.current = JSON.stringify(
        toContactSettingsDb(saveState.settings)
      );
    }
  }, [saveState.ok, saveState.settings]);

  useEffect(() => {
    if (resetState.ok && resetState.settings) {
      setValues(resetState.settings);
      initialPayloadRef.current = JSON.stringify(
        toContactSettingsDb(resetState.settings)
      );
      setResetConfirmOpen(false);
    }
  }, [resetState.ok, resetState.settings]);

  const clientErrors = useMemo(() => validateContactSettings(values), [values]);
  const fieldErrors = { ...clientErrors, ...(saveState.fieldErrors ?? {}) };
  const moduleStatus = getContactModuleStatus(values, fieldErrors);
  const payload = JSON.stringify(toContactSettingsDb(values));
  const isDirty = payload !== initialPayloadRef.current;
  const canSave = !hasValidationErrors(clientErrors) && !savePending && !resetPending;

  const latestMessage = resetState.message ?? saveState.message;
  const latestOk = resetState.message ? resetState.ok : saveState.ok;
  const effectiveUpdatedAt =
    resetState.updatedAt ?? saveState.updatedAt ?? updatedAt;
  const isPending = savePending || resetPending;

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function updateValue<K extends keyof ContactSettings>(
    key: K,
    value: ContactSettings[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleFeedbackType(type: FeedbackType) {
    setValues((prev) => {
      const exists = prev.allowedFeedbackTypes.includes(type);
      const next = exists
        ? prev.allowedFeedbackTypes.filter((item) => item !== type)
        : [...prev.allowedFeedbackTypes, type];
      return { ...prev, allowedFeedbackTypes: next };
    });
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-white">Liên hệ & Góp ý</h2>
              <ContactStatusBadge status={moduleStatus} />
            </div>
            <p className="max-w-2xl text-sm leading-6 text-zinc-400">
              Quản lý các kênh người dùng có thể liên hệ với ChapMee và gửi góp ý
              trong app.
            </p>
            <p className="text-xs text-zinc-500">
              Cập nhật lần cuối:{" "}
              {effectiveUpdatedAt
                ? new Date(effectiveUpdatedAt).toLocaleString("vi-VN")
                : "Chưa có"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-9 items-center rounded-xl border border-white/10 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/5"
              href="/me#lien-he"
              target="_blank"
            >
              Xem preview ngoài app
            </Link>
            <Link
              className="inline-flex min-h-9 items-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/15"
              href="/admin/feedback"
            >
              Xem feedback đã gửi
            </Link>
          </div>
        </div>

        {latestMessage ? (
          <p
            className={`rounded-xl border px-3 py-2 text-sm ${
              latestOk
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                : "border-red-400/30 bg-red-400/10 text-red-100"
            }`}
          >
            {latestMessage}
          </p>
        ) : null}

        {fieldErrors.form ? (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            {fieldErrors.form}
          </p>
        ) : null}

        {isDirty ? (
          <p className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-100">
            Bạn có thay đổi chưa lưu.
          </p>
        ) : null}

        <ContactSettingsPreview settings={values} />

        <form action={saveAction} className="space-y-5">
          <input name="settingsPayload" type="hidden" value={payload} />

          <div className="grid gap-4 lg:grid-cols-2">
            <ContactChannelCard
              description="Hiển thị nút Email trên trang Tôi."
              enabled={values.enableSupportEmail}
              showEnabledState
              onToggle={(checked) => updateValue("enableSupportEmail", checked)}
              title="Email hỗ trợ"
            >
              <Input
                disabled={!values.enableSupportEmail}
                error={fieldErrors.supportEmail}
                label="Email hỗ trợ"
                onChange={(event) => updateValue("supportEmail", event.target.value)}
                placeholder="support@chapmee.vn"
                type="email"
                value={values.supportEmail}
              />
              <Input
                disabled={!values.enableSupportEmail}
                label="Nhãn nút"
                onChange={(event) => updateValue("emailLabel", event.target.value)}
                placeholder="Gửi email"
                value={values.emailLabel}
              />
            </ContactChannelCard>

            <ContactChannelCard
              description="Hiển thị nút Fanpage/Facebook."
              enabled={values.enableFacebook}
              showEnabledState
              onToggle={(checked) => updateValue("enableFacebook", checked)}
              title="Fanpage/Facebook"
            >
              <Input
                disabled={!values.enableFacebook}
                error={fieldErrors.facebookUrl}
                label="URL Fanpage"
                onChange={(event) => updateValue("facebookUrl", event.target.value)}
                placeholder="https://facebook.com/chapmee"
                type="url"
                value={values.facebookUrl}
              />
              <Input
                disabled={!values.enableFacebook}
                label="Nhãn nút"
                onChange={(event) => updateValue("fanpageLabel", event.target.value)}
                placeholder="Fanpage"
                value={values.fanpageLabel}
              />
            </ContactChannelCard>

            <ContactChannelCard
              description="Hiển thị nút Telegram."
              enabled={values.enableTelegram}
              showEnabledState
              onToggle={(checked) => updateValue("enableTelegram", checked)}
              title="Telegram"
            >
              <Input
                disabled={!values.enableTelegram}
                error={fieldErrors.telegramUrl}
                label="URL Telegram"
                onChange={(event) => updateValue("telegramUrl", event.target.value)}
                placeholder="https://t.me/chapmee"
                type="url"
                value={values.telegramUrl}
              />
              <Input
                disabled={!values.enableTelegram}
                label="Nhãn nút"
                onChange={(event) => updateValue("telegramLabel", event.target.value)}
                placeholder="Telegram"
                value={values.telegramLabel}
              />
            </ContactChannelCard>

            <ContactChannelCard
              description="Cho phép gửi góp ý, báo lỗi trong app."
              enabled={values.enableFeedbackForm}
              showEnabledState
              onToggle={(checked) => updateValue("enableFeedbackForm", checked)}
              title="Form góp ý"
            >
              <Input
                disabled={!values.enableFeedbackForm}
                error={fieldErrors.contactTitle}
                label="Tiêu đề hiển thị"
                maxLength={60}
                onChange={(event) => updateValue("contactTitle", event.target.value)}
                placeholder="Liên hệ & Góp ý"
                value={values.contactTitle}
              />
              <Textarea
                disabled={!values.enableFeedbackForm}
                error={fieldErrors.contactDescription}
                label="Mô tả hiển thị"
                maxLength={160}
                onChange={(event) =>
                  updateValue("contactDescription", event.target.value)
                }
                placeholder="Báo lỗi, góp ý hoặc liên hệ với ChapMee."
                rows={3}
                value={values.contactDescription}
              />

              <div className="space-y-2">
                <p className="text-sm font-semibold text-zinc-200">Loại góp ý được phép</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_FEEDBACK_TYPES.map((type) => {
                    const checked = values.allowedFeedbackTypes.includes(type);
                    return (
                      <label
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          checked
                            ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                            : "border-white/10 bg-white/[0.03] text-zinc-400"
                        } ${!values.enableFeedbackForm ? "pointer-events-none" : ""}`}
                        key={type}
                      >
                        <input
                          checked={checked}
                          className="sr-only"
                          disabled={!values.enableFeedbackForm}
                          onChange={() => toggleFeedbackType(type)}
                          type="checkbox"
                        />
                        {FEEDBACK_TYPE_LABELS[type]}
                      </label>
                    );
                  })}
                </div>
                {fieldErrors.allowedFeedbackTypes ? (
                  <p className="text-xs text-red-300">{fieldErrors.allowedFeedbackTypes}</p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    checked={values.requireLogin}
                    disabled={!values.enableFeedbackForm}
                    onChange={(event) => updateValue("requireLogin", event.target.checked)}
                    type="checkbox"
                  />
                  Bắt buộc đăng nhập
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    checked={values.requireContactEmail}
                    disabled={!values.enableFeedbackForm}
                    onChange={(event) =>
                      updateValue("requireContactEmail", event.target.checked)
                    }
                    type="checkbox"
                  />
                  Bắt buộc email liên hệ
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    checked={values.requireScreenshot}
                    disabled={!values.enableFeedbackForm}
                    onChange={(event) =>
                      updateValue("requireScreenshot", event.target.checked)
                    }
                    type="checkbox"
                  />
                  Bắt buộc ảnh chụp màn hình
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  disabled={!values.enableFeedbackForm}
                  error={fieldErrors.dailyLimitPerUser}
                  label="Giới hạn gửi / user / ngày"
                  min={1}
                  max={50}
                  onChange={(event) =>
                    updateValue("dailyLimitPerUser", Number(event.target.value) || 1)
                  }
                  type="number"
                  value={values.dailyLimitPerUser}
                />
                <Input
                  disabled={!values.enableFeedbackForm}
                  error={fieldErrors.cooldownSeconds}
                  label="Chặn gửi quá nhanh (giây)"
                  min={10}
                  max={3600}
                  onChange={(event) =>
                    updateValue("cooldownSeconds", Number(event.target.value) || 60)
                  }
                  type="number"
                  value={values.cooldownSeconds}
                />
              </div>
            </ContactChannelCard>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button disabled={!canSave || isPending} type="submit">
              {savePending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
            <Button
              disabled={isPending}
              onClick={() => setResetConfirmOpen(true)}
              type="button"
              variant="secondary"
            >
              Khôi phục mặc định
            </Button>
          </div>
        </form>
      </Card>

      <RecentFeedbackPanel items={recentFeedback} />

      <ContactResetConfirmModal
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          const form = document.getElementById("reset-contact-form") as HTMLFormElement | null;
          form?.requestSubmit();
        }}
        open={resetConfirmOpen}
        pending={resetPending}
      />

      <form action={resetAction} className="hidden" id="reset-contact-form" />
    </div>
  );
}

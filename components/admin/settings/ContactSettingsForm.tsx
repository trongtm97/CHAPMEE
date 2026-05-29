"use client";

import { useActionState, useEffect, useState } from "react";
import { FeatureFlagSwitch } from "@/components/admin/monetization/FeatureFlagSwitch";
import { ContactSettingsPreview } from "@/components/admin/settings/ContactSettingsPreview";
import {
  resetContactSettingsAction,
  updateContactSettingsAction
} from "@/lib/admin/contact-settings-actions";
import { INITIAL_CONTACT_SETTINGS_ACTION_STATE } from "@/lib/admin/contact-settings-state";
import { toContactSettingsDb } from "@/lib/settings/contact-settings-mapper";
import { Button, Card, Input, SectionHeader, Textarea } from "@/components/ui";
import type { ContactSettings } from "@/types/contact-settings";

type ContactSettingsFormProps = {
  initialSettings: ContactSettings;
  updatedAt: string | null;
};

export function ContactSettingsForm({
  initialSettings,
  updatedAt
}: ContactSettingsFormProps) {
  const [values, setValues] = useState<ContactSettings>(initialSettings);
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
    }
  }, [saveState.ok, saveState.settings]);

  useEffect(() => {
    if (resetState.ok && resetState.settings) {
      setValues(resetState.settings);
    }
  }, [resetState.ok, resetState.settings]);

  const latestMessage = resetState.message ?? saveState.message;
  const latestOk = resetState.message ? resetState.ok : saveState.ok;
  const fieldErrors = saveState.fieldErrors ?? {};
  const effectiveUpdatedAt =
    resetState.updatedAt ?? saveState.updatedAt ?? updatedAt;
  const isPending = savePending || resetPending;

  function updateValue<K extends keyof ContactSettings>(
    key: K,
    value: ContactSettings[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const payload = JSON.stringify(toContactSettingsDb(values));

  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <SectionHeader
          subtitle="Quản lý các kênh người dùng có thể liên hệ với ChapMee."
          title="Liên hệ & Góp ý"
        />
        <p className="text-xs text-zinc-400">
          Cập nhật lần cuối:{" "}
          {effectiveUpdatedAt
            ? new Date(effectiveUpdatedAt).toLocaleString("vi-VN")
            : "Chưa có"}
        </p>

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

        <ContactSettingsPreview settings={values} />

        <form action={saveAction} className="space-y-5">
          <input name="settingsPayload" type="hidden" value={payload} />

          <FeatureFlagSwitch
            checked={values.enableSupportEmail}
            description="Hiển thị nút Email trên trang Tôi."
            label="Bật Email"
            onChange={(checked) => updateValue("enableSupportEmail", checked)}
          />
          <Input
            disabled={!values.enableSupportEmail}
            error={fieldErrors.supportEmail}
            label="Email hỗ trợ"
            onChange={(event) => updateValue("supportEmail", event.target.value)}
            placeholder="support@chapmee.vn"
            type="email"
            value={values.supportEmail}
          />

          <FeatureFlagSwitch
            checked={values.enableFacebook}
            description="Hiển thị nút Fanpage/Facebook."
            label="Bật Fanpage"
            onChange={(checked) => updateValue("enableFacebook", checked)}
          />
          <Input
            disabled={!values.enableFacebook}
            error={fieldErrors.facebookUrl}
            label="Link Fanpage"
            onChange={(event) => updateValue("facebookUrl", event.target.value)}
            placeholder="https://facebook.com/chapmee"
            type="url"
            value={values.facebookUrl}
          />

          <FeatureFlagSwitch
            checked={values.enableTelegram}
            description="Hiển thị nút Telegram."
            label="Bật Telegram"
            onChange={(checked) => updateValue("enableTelegram", checked)}
          />
          <Input
            disabled={!values.enableTelegram}
            error={fieldErrors.telegramUrl}
            label="Link Telegram"
            onChange={(event) => updateValue("telegramUrl", event.target.value)}
            placeholder="https://t.me/chapmee"
            type="url"
            value={values.telegramUrl}
          />

          <FeatureFlagSwitch
            checked={values.enableFeedbackForm}
            description="Cho phép gửi góp ý, báo lỗi, đề xuất tính năng trong app."
            label="Bật form góp ý"
            onChange={(checked) => updateValue("enableFeedbackForm", checked)}
          />

          <Input
            error={fieldErrors.contactTitle}
            label="Tiêu đề hiển thị"
            maxLength={60}
            onChange={(event) => updateValue("contactTitle", event.target.value)}
            placeholder="Liên hệ & Góp ý"
            value={values.contactTitle}
          />
          <Textarea
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

          <div className="flex flex-wrap gap-3">
            <Button disabled={isPending} type="submit">
              {savePending ? "Đang lưu..." : "Lưu cài đặt"}
            </Button>
          </div>
        </form>

        <form action={resetAction}>
          <Button disabled={isPending} type="submit" variant="secondary">
            {resetPending ? "Đang khôi phục..." : "Khôi phục mặc định"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

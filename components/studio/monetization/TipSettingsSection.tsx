"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import {
  TIP_THANK_YOU_EXTERNAL_CONTACT_ERROR,
  validateTipThankYouMessage
} from "@/lib/studio/validate-chapter-coin-price";
import { studioUpdateTipSettingsAction } from "@/lib/studio/studio-monetization-actions";
import type { CreatorMonetizationProfile } from "@/types/creator-monetization";

type TipSettingsSectionProps = {
  tipsEnabled: boolean;
  canConfigure: boolean;
  profile: CreatorMonetizationProfile | null;
  embedded?: boolean;
};

export function TipSettingsSection({
  tipsEnabled,
  canConfigure,
  profile,
  embedded = false
}: TipSettingsSectionProps) {
  const [tipsAccepted, setTipsAccepted] = useState(Boolean(profile?.tips_accepted));
  const [thankYouMessage, setThankYouMessage] = useState(
    profile?.tip_thank_you_message ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const liveValidation = useMemo(() => {
    if (!tipsAccepted || !thankYouMessage.trim()) {
      return null;
    }
    return validateTipThankYouMessage(thankYouMessage);
  }, [thankYouMessage, tipsAccepted]);

  if (!tipsEnabled) {
    return null;
  }

  function handleSave() {
    setError(null);
    setSuccess(null);

    if (tipsAccepted && thankYouMessage.trim()) {
      const validated = validateTipThankYouMessage(thankYouMessage);
      if (!validated.ok) {
        setError(validated.error);
        return;
      }
    }

    startTransition(async () => {
      const result = await studioUpdateTipSettingsAction({
        tipsAccepted,
        thankYouMessage
      });

      if (!result.ok) {
        setError(result.error ?? "Không lưu được cài đặt tip.");
        return;
      }

      setSuccess("Đã lưu cài đặt tip.");
    });
  }

  return (
    <div className={embedded ? "space-y-4" : "space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5"}>
      {!embedded ? (
        <div>
          <h2 className="text-base font-bold text-white">Tip / ủng hộ</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Nhận tip trong nền tảng ChapMee. Lời cảm ơn không được chứa liên hệ hay liên kết ngoài.
          </p>
        </div>
      ) : (
        <p className="text-sm text-zinc-400">
          Lời cảm ơn hiển thị sau khi độc giả tip — không dùng link hoặc liên hệ ngoài nền tảng.
        </p>
      )}

      <label className="flex items-center gap-2 text-sm text-zinc-100">
        <input
          checked={tipsAccepted}
          disabled={!canConfigure || isPending}
          onChange={(event) => setTipsAccepted(event.target.checked)}
          type="checkbox"
        />
        Cho phép độc giả tip tôi
      </label>

      <Textarea
        disabled={!canConfigure || isPending || !tipsAccepted}
        onChange={(event) => {
          setThankYouMessage(event.target.value);
          setError(null);
        }}
        placeholder="Cảm ơn bạn đã ủng hộ — mình sẽ cố gắng ra chương đều hơn!"
        rows={3}
        value={thankYouMessage}
      />

      {liveValidation && !liveValidation.ok ? (
        <p className="text-sm text-rose-300">{TIP_THANK_YOU_EXTERNAL_CONTACT_ERROR}</p>
      ) : null}

      {tipsAccepted && thankYouMessage.trim() && liveValidation?.ok ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Xem trước</p>
          <p className="mt-1 text-sm text-zinc-200">{thankYouMessage.trim()}</p>
        </div>
      ) : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

      <Button disabled={!canConfigure || isPending} onClick={handleSave} type="button">
        {isPending ? "Đang lưu…" : "Lưu cài đặt tip"}
      </Button>
    </div>
  );
}

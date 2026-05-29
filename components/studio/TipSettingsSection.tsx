"use client";

import { useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { studioUpdateTipSettingsAction } from "@/lib/studio/studio-monetization-actions";
import type { CreatorMonetizationProfile } from "@/types/creator-monetization";

type TipSettingsSectionProps = {
  tipsEnabled: boolean;
  canConfigure: boolean;
  profile: CreatorMonetizationProfile | null;
};

export function TipSettingsSection({
  tipsEnabled,
  canConfigure,
  profile
}: TipSettingsSectionProps) {
  const [tipsAccepted, setTipsAccepted] = useState(Boolean(profile?.tips_accepted));
  const [thankYouMessage, setThankYouMessage] = useState(
    profile?.tip_thank_you_message ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!tipsEnabled) {
    return null;
  }

  function handleSave() {
    setError(null);
    setSuccess(null);

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
    <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-bold text-white">Tip / ủng hộ</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Bật nhận tip và lời cảm ơn ngắn (không chứa link spam).
        </p>
      </div>

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
        onChange={(event) => setThankYouMessage(event.target.value)}
        placeholder="Cảm ơn bạn đã ủng hộ — mình sẽ cố gắng ra chương đều hơn!"
        rows={3}
        value={thankYouMessage}
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

      <Button disabled={!canConfigure || isPending} onClick={handleSave} type="button">
        {isPending ? "Đang lưu..." : "Lưu cài đặt tip"}
      </Button>
    </section>
  );
}

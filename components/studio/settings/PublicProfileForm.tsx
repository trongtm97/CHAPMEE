"use client";

import { useState, useTransition } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { validateNoExternalContact } from "@/lib/profile/validate-no-external-contact";
import { BIO_MAX, DISPLAY_NAME_MAX, DISPLAY_NAME_MIN } from "@/lib/studio/settings-constants";
import { checkUsernameAvailabilityAction } from "@/lib/studio/update-studio-settings";
import {
  generateUsernameFromDisplayName,
  sanitizeUsernameInput
} from "@/lib/username/normalize-username";
import { StudioAvatarUploader } from "@/components/studio/settings/StudioAvatarUploader";
import type { StudioSettingsFormValues, UsernameCheckStatus } from "@/types/studio-settings";

type PublicProfileFormProps = {
  values: StudioSettingsFormValues;
  fieldErrors: Partial<Record<string, string>>;
  disabled?: boolean;
  avatarUploadError?: string | null;
  onChange: (patch: Partial<StudioSettingsFormValues>) => void;
  onAvatarChange: (url: string) => void;
  onAvatarError?: (message: string) => void;
};

export function PublicProfileForm({
  avatarUploadError,
  disabled,
  fieldErrors,
  onAvatarChange,
  onAvatarError,
  onChange,
  values
}: PublicProfileFormProps) {
  const [usernameStatus, setUsernameStatus] = useState<UsernameCheckStatus>("idle");
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [bioContactError, setBioContactError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();

  function resetUsernameCheck() {
    setUsernameStatus("idle");
    setUsernameMessage(null);
  }

  function handleDisplayNameChange(nextDisplayName: string) {
    const patch: Partial<StudioSettingsFormValues> = { displayName: nextDisplayName };

    if (!values.usernameManuallyEdited) {
      patch.username = generateUsernameFromDisplayName(nextDisplayName);
      resetUsernameCheck();
    }

    onChange(patch);
  }

  function handleUsernameChange(raw: string) {
    resetUsernameCheck();
    onChange({
      username: sanitizeUsernameInput(raw),
      usernameManuallyEdited: true
    });
  }

  function handleBioChange(nextBio: string) {
    onChange({ bio: nextBio });

    if (!nextBio.trim()) {
      setBioContactError(null);
      return;
    }

    const contactCheck = validateNoExternalContact(nextBio);
    setBioContactError(contactCheck.ok ? null : contactCheck.error);
  }

  function handleCheckUsername() {
    startCheck(async () => {
      setUsernameStatus("checking");
      const result = await checkUsernameAvailabilityAction(values.username);
      setUsernameStatus(result.status);
      setUsernameMessage(result.message);
    });
  }

  const bioError = fieldErrors.bio ?? bioContactError;

  return (
    <section className="space-y-4" id="settings-profile">
      <div>
        <h2 className="text-lg font-bold text-white">Hồ sơ công khai</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Thông tin hiển thị trên trang tác giả trong ChapMee.
        </p>
      </div>

      <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
        <StudioAvatarUploader
          avatarUrl={values.avatarUrl}
          disabled={disabled}
          displayName={values.displayName}
          onAvatarChange={onAvatarChange}
          onError={onAvatarError}
        />
        {avatarUploadError ? <p className="text-xs text-rose-300">{avatarUploadError}</p> : null}

        <div>
          <Input
            disabled={disabled}
            label="Tên hiển thị"
            maxLength={DISPLAY_NAME_MAX}
            onChange={(event) => handleDisplayNameChange(event.target.value)}
            required
            value={values.displayName}
          />
          <p className="mt-1 text-xs text-zinc-500">
            {values.displayName.length}/{DISPLAY_NAME_MAX} · Tên này hiện ở truyện, bình luận và trang tác giả.
          </p>
          {values.displayName.trim().length > 0 &&
          values.displayName.trim().length < DISPLAY_NAME_MIN ? (
            <p className="mt-1 text-xs text-amber-300">
              Tên hiển thị cần ít nhất {DISPLAY_NAME_MIN} ký tự.
            </p>
          ) : null}
          {fieldErrors.displayName ? (
            <p className="mt-1 text-xs text-rose-300">{fieldErrors.displayName}</p>
          ) : null}
        </div>

        <div>
          <Input
            disabled={disabled}
            label="Username công khai"
            onChange={(event) => handleUsernameChange(event.target.value)}
            placeholder="banhcuonnho"
            value={values.username}
          />
          <p className="mt-1 text-xs text-zinc-500">
            chapmee.vn/@{values.username.trim() || "username"}
          </p>
          {!values.usernameManuallyEdited && values.username ? (
            <p className="mt-1 text-xs text-cyan-300/90">
              Gợi ý tự động từ tên hiển thị (chữ, số, dấu chấm) — bạn có thể chỉnh username bất cứ lúc nào.
            </p>
          ) : null}
          <div className="mt-2">
            <Button
              disabled={disabled || checking || !values.username.trim()}
              loading={checking}
              onClick={handleCheckUsername}
              type="button"
              variant="secondary"
            >
              Kiểm tra username
            </Button>
          </div>
          {usernameMessage ? (
            <p
              className={`mt-2 text-xs ${
                usernameStatus === "valid"
                  ? "text-emerald-300"
                  : usernameStatus === "taken"
                    ? "text-amber-300"
                    : "text-rose-300"
              }`}
            >
              {usernameMessage}
            </p>
          ) : null}
          {fieldErrors.username ? <p className="mt-1 text-xs text-rose-300">{fieldErrors.username}</p> : null}
        </div>

        <div>
          <Textarea
            disabled={disabled}
            label="Giới thiệu ngắn"
            maxLength={BIO_MAX}
            onChange={(event) => handleBioChange(event.target.value)}
            rows={5}
            value={values.bio}
          />
          <p className="mt-1 text-xs text-zinc-500">
            {values.bio.length}/{BIO_MAX} · Không đưa số điện thoại, email hoặc liên kết ngoài ChapMee.
          </p>
          {bioError ? <p className="mt-1 text-xs text-rose-300">{bioError}</p> : null}
        </div>
      </div>
    </section>
  );
}

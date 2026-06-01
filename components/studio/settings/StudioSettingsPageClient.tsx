"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CreatorVerificationCard } from "@/components/studio/settings/CreatorVerificationCard";
import { ProfileCompletionChecklist } from "@/components/studio/settings/ProfileCompletionChecklist";
import { PublicProfileForm } from "@/components/studio/settings/PublicProfileForm";
import { PublicProfilePreview } from "@/components/studio/settings/PublicProfilePreview";
import { Button } from "@/components/ui";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";
import { validateNoExternalContact } from "@/lib/profile/validate-no-external-contact";
import { studioPath } from "@/lib/studio/constants";
import { validateStudioSettingsForm } from "@/lib/studio/settings-validation";
import { updateStudioSettingsAction } from "@/lib/studio/update-studio-settings";
import type { StudioSettingsFormValues, StudioSettingsPageData } from "@/types/studio-settings";

type StudioSettingsPageClientProps = StudioSettingsPageData;

type MobilePanel = "edit" | "preview";

function serializeValues(values: StudioSettingsFormValues): string {
  return JSON.stringify(values);
}

function resolveSaveLabel(isDirty: boolean, pending: boolean, justSaved: boolean): string {
  if (pending) {
    return "Đang lưu...";
  }
  if (isDirty) {
    return "Có thay đổi chưa lưu";
  }
  if (justSaved) {
    return "Đã lưu";
  }
  return "Đã lưu";
}

export function StudioSettingsPageClient({
  accountCreatedAt,
  email,
  followerCount,
  initialValues,
  profilePath,
  publicStoriesCount,
  userId,
  verification
}: StudioSettingsPageClientProps) {
  const [baseline, setBaseline] = useState(initialValues);
  const [values, setValues] = useState(initialValues);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("edit");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const isDirty = useMemo(
    () => serializeValues(values) !== serializeValues(baseline),
    [baseline, values]
  );

  const clientValidation = useMemo(() => validateStudioSettingsForm(values), [values]);

  const canSave =
    isDirty &&
    !pending &&
    !avatarUploadError &&
    clientValidation.ok &&
    validateNoExternalContact(values.bio).ok;

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const isVerified = Boolean(verification.publicBadge);
  const saveStatusLabel = resolveSaveLabel(isDirty, pending, justSaved);

  function patchValues(patch: Partial<StudioSettingsFormValues>) {
    setJustSaved(false);
    setValues((current) => ({
      ...current,
      ...patch,
      privacy: patch.privacy ? { ...current.privacy, ...patch.privacy } : current.privacy
    }));
  }

  function handleAvatarChange(url: string) {
    setAvatarUploadError(null);
    setValues((current) => ({ ...current, avatarUrl: url }));
    setBaseline((current) => ({ ...current, avatarUrl: url }));
  }

  function handleSave() {
    setFieldErrors({});
    startTransition(async () => {
      const result = await updateStudioSettingsAction(values);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      if (result.error) {
        setToast({ message: result.error, type: "error" });
        return;
      }

      const savedValues = {
        ...values,
        usernameManuallyEdited: Boolean(values.username.trim()) || values.usernameManuallyEdited
      };
      setBaseline(savedValues);
      setValues(savedValues);
      setJustSaved(true);
      setToast({ message: "Đã lưu cài đặt Studio.", type: "success" });
    });
  }

  function handleReset() {
    setValues(baseline);
    setFieldErrors({});
    setAvatarUploadError(null);
    setToast({ message: "Đã khôi phục thay đổi.", type: "success" });
  }

  const previewBlock = (
    <>
      <PublicProfilePreview
        followerCount={followerCount}
        profilePath={
          values.username.trim()
            ? getProfileUrlOrFallback(values.username.trim())
            : profilePath
        }
        publicStoriesCount={publicStoriesCount}
        userId={userId}
        values={values}
        verification={verification}
      />
      <ProfileCompletionChecklist
        publicStoriesCount={publicStoriesCount}
        values={values}
        verification={verification}
      />
    </>
  );

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <header className="space-y-4">
        <p className="text-sm text-zinc-500">
          <Link className="text-cyan-300 hover:text-cyan-200" href={studioPath("")}>
            Studio
          </Link>{" "}
          / Cài đặt
        </p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">Cài đặt Studio</h1>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                Đang hoạt động
              </span>
              {isVerified ? (
                <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-200">
                  Đã xác minh
                </span>
              ) : (
                <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
                  Chưa xác minh
                </span>
              )}
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  pending
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                    : isDirty
                      ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                      : "border-zinc-500/40 bg-zinc-500/10 text-zinc-300"
                }`}
              >
                {saveStatusLabel}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
              Quản lý hồ sơ tác giả, ảnh đại diện và đường dẫn công khai của bạn.
            </p>
          </div>
          <div className="hidden flex-wrap gap-2 lg:flex">
            <Button className="min-h-10" disabled={!canSave} loading={pending} onClick={handleSave} type="button">
              Lưu thay đổi
            </Button>
            <Button
              className="min-h-10"
              disabled={!isDirty || pending}
              onClick={handleReset}
              type="button"
              variant="secondary"
            >
              Khôi phục thay đổi
            </Button>
          </div>
        </div>
      </header>

      <div className="flex gap-2 lg:hidden">
        <button
          className={`min-h-10 flex-1 rounded-full px-3 text-sm font-semibold ${
            mobilePanel === "edit" ? "bg-cyan-300 text-zinc-950" : "border border-white/10 text-zinc-400"
          }`}
          onClick={() => setMobilePanel("edit")}
          type="button"
        >
          Chỉnh sửa
        </button>
        <button
          className={`min-h-10 flex-1 rounded-full px-3 text-sm font-semibold ${
            mobilePanel === "preview" ? "bg-cyan-300 text-zinc-950" : "border border-white/10 text-zinc-400"
          }`}
          onClick={() => setMobilePanel("preview")}
          type="button"
        >
          Xem trước
        </button>
      </div>

      {toast ? (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border-rose-400/30 bg-rose-400/10 text-rose-100"
          }`}
        >
          {toast.message}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className={`min-w-0 space-y-8 ${mobilePanel === "preview" ? "hidden xl:block" : ""}`}>
          <PublicProfileForm
            avatarUploadError={avatarUploadError}
            disabled={pending}
            fieldErrors={fieldErrors}
            onAvatarChange={handleAvatarChange}
            onAvatarError={setAvatarUploadError}
            onChange={patchValues}
            values={values}
          />
          <CreatorVerificationCard accountCreatedAt={accountCreatedAt} email={email} verification={verification} />

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="font-semibold text-white">Trung tâm hỗ trợ</p>
            <p className="mt-1 text-sm text-zinc-400">Hướng dẫn đăng truyện, quy định và FAQ trong ChapMee.</p>
            <Link className="mt-3 inline-flex text-sm font-semibold text-cyan-300" href={studioPath("/help")}>
              Mở Trung tâm hỗ trợ →
            </Link>
          </div>
        </div>

        <aside className={`space-y-4 xl:sticky xl:top-6 xl:self-start ${mobilePanel === "edit" ? "hidden xl:block" : ""}`}>
          {previewBlock}
        </aside>
      </div>

      {isDirty ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/95 p-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-lg gap-2">
            <Button className="min-h-10 flex-1" disabled={!canSave} loading={pending} onClick={handleSave} type="button">
              Lưu thay đổi
            </Button>
            <Button
              className="min-h-10 flex-1"
              disabled={pending}
              onClick={handleReset}
              type="button"
              variant="secondary"
            >
              Khôi phục
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

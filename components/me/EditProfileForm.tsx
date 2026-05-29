"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { ProfileAvatarUploader } from "@/components/me/ProfileAvatarUploader";
import { buildProfileHandle } from "@/lib/profile/buildProfileHandle";
import {
  updateProfileAction,
  type UpdateProfileActionState
} from "@/lib/profile/updateProfile";
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  validateBioField,
  validateDisplayName,
  validateUsernameField
} from "@/lib/profile/validateProfile";

type EditProfileFormProps = {
  avatarUrl: string | null;
  bio: string;
  displayName: string;
  email: string | null;
  userId: string;
  username: string;
};

const initialState: UpdateProfileActionState = {
  error: null,
  success: false
};

function FormToast({ message }: { message: string }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-50 mx-auto max-w-sm rounded-full border border-white/10 bg-[#121820]/95 px-4 py-2.5 text-center text-xs font-medium text-zinc-100 shadow-lg backdrop-blur-md"
      role="status"
    >
      {message}
    </div>
  );
}

export function EditProfileForm({
  avatarUrl,
  bio: initialBio,
  displayName: initialDisplayName,
  email,
  userId,
  username: initialUsername
}: EditProfileFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  const baselineRef = useRef({
    displayName: initialDisplayName.trim(),
    username: initialUsername.trim(),
    bio: initialBio.trim()
  });
  const [baselineVersion, setBaselineVersion] = useState(0);

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    username?: string;
    bio?: string;
  }>({});
  const [toast, setToast] = useState<string | null>(null);

  const handlePreview = useMemo(
    () =>
      buildProfileHandle({
        username: username.trim() || null,
        displayName: displayName.trim(),
        userId
      }),
    [displayName, userId, username]
  );

  const isDirty = useMemo(() => {
    const baseline = baselineRef.current;
    return (
      displayName.trim() !== baseline.displayName ||
      username.trim() !== baseline.username ||
      bio.trim() !== baseline.bio
    );
  }, [baselineVersion, bio, displayName, username]);

  const bioLength = bio.trim().length;

  useEffect(() => {
    if (!state.success || !state.savedAt) {
      return;
    }

    baselineRef.current = {
      displayName: displayName.trim(),
      username: username.trim(),
      bio: bio.trim()
    };
    setBaselineVersion((value) => value + 1);
    setToast("Đã lưu hồ sơ.");
    router.refresh();

    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [bio, displayName, router, state.savedAt, state.success, username]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function validateClientFields() {
    const nextErrors: typeof fieldErrors = {};
    const displayNameError = validateDisplayName(displayName);
    const usernameError = validateUsernameField(username);
    const bioError = validateBioField(bio);

    if (displayNameError) {
      nextErrors.displayName = displayNameError;
    }
    if (usernameError) {
      nextErrors.username = usernameError;
    }
    if (bioError) {
      nextErrors.bio = bioError;
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!validateClientFields()) {
      event.preventDefault();
    }
  }

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="px-4 pt-4">
          <ProfileAvatarUploader
            avatarUrl={avatarUrl}
            displayName={displayName.trim() || handlePreview}
            onToast={showToast}
          />
        </div>

        <form
          action={formAction}
          className="space-y-4 px-4 pb-28"
          id="edit-profile-form"
          onSubmit={handleSubmit}
        >
          <Input
            autoComplete="name"
            disabled={pending}
            error={fieldErrors.displayName}
            label="Tên hiển thị"
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            name="display_name"
            onChange={(event) => {
              setDisplayName(event.target.value);
              if (fieldErrors.displayName) {
                setFieldErrors((current) => ({ ...current, displayName: undefined }));
              }
            }}
            placeholder="Tên bạn muốn mọi người thấy"
            required
            value={displayName}
          />

          <div className="space-y-2">
            <Input
              autoComplete="username"
              disabled={pending}
              error={fieldErrors.username}
              label="Username"
              maxLength={USERNAME_MAX_LENGTH}
              name="username"
              onChange={(event) => {
                setUsername(event.target.value.toLowerCase().replace(/\s+/g, ""));
                if (fieldErrors.username) {
                  setFieldErrors((current) => ({ ...current, username: undefined }));
                }
              }}
              placeholder="trongtm97"
              value={username}
            />
            <p className="text-xs leading-5 text-zinc-500">
              Hiển thị công khai: {handlePreview}. Chỉ dùng chữ thường, số và dấu gạch dưới.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-bold text-zinc-200" htmlFor="profile-bio">
                Bio
              </label>
              <span className="text-[0.65rem] font-medium text-zinc-500">
                {bioLength}/{BIO_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              disabled={pending}
              error={fieldErrors.bio}
              id="profile-bio"
              maxLength={BIO_MAX_LENGTH}
              name="bio"
              onChange={(event) => {
                setBio(event.target.value);
                if (fieldErrors.bio) {
                  setFieldErrors((current) => ({ ...current, bio: undefined }));
                }
              }}
              placeholder="Một dòng giới thiệu về gu đọc của bạn."
              rows={3}
              value={bio}
            />
          </div>

          {email ? (
            <div className="rounded-2xl border border-white/8 bg-zinc-900/40 px-4 py-3">
              <p className="text-xs font-semibold text-zinc-400">Email tài khoản</p>
              <p className="mt-1 break-all text-sm font-medium text-zinc-200">{email}</p>
              <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                Email dùng để đăng nhập, không hiển thị công khai.
              </p>
            </div>
          ) : null}

          {state.error ? (
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
              {state.error}
            </p>
          ) : null}
        </form>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-[#0b1016]/96 px-4 py-3 backdrop-blur-xl pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:static lg:mt-4 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <Button
          className="w-full"
          disabled={!isDirty || pending}
          form="edit-profile-form"
          loading={pending}
          type="submit"
        >
          {pending ? "Đang lưu..." : "Lưu hồ sơ"}
        </Button>
      </div>

      {toast ? <FormToast message={toast} /> : null}
    </>
  );
}

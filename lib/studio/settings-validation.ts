import { validateUsername } from "@/lib/profile/buildProfileHandle";

import { validateNoExternalContact } from "@/lib/profile/validate-no-external-contact";

import { BIO_MAX, DISPLAY_NAME_MAX, DISPLAY_NAME_MIN } from "@/lib/studio/settings-constants";

import type { StudioSettingsFormValues } from "@/types/studio-settings";



export function validateStudioSettingsForm(values: StudioSettingsFormValues): {

  ok: boolean;

  fieldErrors: Partial<Record<string, string>>;

  error: string | null;

} {

  const fieldErrors: Partial<Record<string, string>> = {};



  const displayName = values.displayName.trim();

  if (!displayName) {

    fieldErrors.displayName = "Vui lòng nhập tên hiển thị.";

  } else if (displayName.length < DISPLAY_NAME_MIN) {

    fieldErrors.displayName = `Tên hiển thị cần ít nhất ${DISPLAY_NAME_MIN} ký tự.`;

  } else if (displayName.length > DISPLAY_NAME_MAX) {

    fieldErrors.displayName = `Tên hiển thị tối đa ${DISPLAY_NAME_MAX} ký tự.`;

  }



  if (values.bio.trim().length > BIO_MAX) {

    fieldErrors.bio = `Giới thiệu ngắn tối đa ${BIO_MAX} ký tự.`;

  } else if (values.bio.trim()) {

    const contactCheck = validateNoExternalContact(values.bio);

    if (!contactCheck.ok && contactCheck.error) {

      fieldErrors.bio = contactCheck.error;

    }

  }



  if (values.username.trim()) {

    const usernameCheck = validateUsername(values.username.trim());

    if (usernameCheck.error) {

      fieldErrors.username = usernameCheck.error;

    }

  }



  const ok = Object.keys(fieldErrors).length === 0;

  return {

    error: ok ? null : "Vui lòng sửa các lỗi trước khi lưu.",

    fieldErrors,

    ok

  };

}


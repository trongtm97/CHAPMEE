const DEFAULT_AUTH_REDIRECT = "/me";

export function sanitizeAuthRedirect(
  input: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT
) {
  if (!input) {
    return fallback;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return fallback;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000";

  try {
    const baseUrl = new URL(appUrl);
    const candidate = new URL(trimmed, baseUrl);

    if (candidate.origin !== baseUrl.origin) {
      return fallback;
    }

    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return fallback;
  }
}

export function buildAuthErrorMessage(errorCode: string | null | undefined) {
  switch (errorCode) {
    case "access_denied":
      return "Bạn đã hủy đăng nhập bằng Google.";
    case "invalid_callback_url":
    case "invalid_origin":
      return "Liên kết đăng nhập không hợp lệ. Vui lòng thử lại từ ChapMee.";
    case "google_oauth_failed":
      return "Không thể đăng nhập bằng Google. Vui lòng thử lại.";
    default:
      return errorCode ? "Không thể đăng nhập bằng Google. Vui lòng thử lại." : null;
  }
}

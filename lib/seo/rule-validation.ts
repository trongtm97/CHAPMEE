export function validateSeoRoutePattern(pattern: string): string | null {
  const trimmed = pattern.trim();

  if (!trimmed) {
    return "Route pattern không được để trống.";
  }

  if (!trimmed.startsWith("/")) {
    return "Route pattern phải bắt đầu bằng /.";
  }

  if (/\s/.test(trimmed)) {
    return "Route pattern không được chứa khoảng trắng.";
  }

  if (!/^[/a-z0-9*[\]_-]+$/i.test(trimmed)) {
    return "Route pattern chỉ được chứa /, chữ, số, *, -, [, ].";
  }

  if (trimmed.includes("**")) {
    return "Không dùng ** liên tiếp trong route pattern.";
  }

  return null;
}

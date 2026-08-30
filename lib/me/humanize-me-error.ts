/** Chuẩn hóa lỗi kỹ thuật trước khi hiển thị trên /me. */
export function humanizeMeError(message: string | null | undefined): string | null {
  if (!message?.trim()) {
    return null;
  }

  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes("not authorized") ||
    normalized.includes("unauthorized") ||
    normalized.includes("jwt") ||
    normalized.includes("permission denied")
  ) {
    return "Không thể đồng bộ một phần dữ liệu. Đang hiển thị thông tin đã lưu gần nhất.";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "Mất kết nối tạm thời. Đang hiển thị dữ liệu gần nhất.";
  }

  return message.trim();
}

/** Hiển thị badge: 1–99, 99+, ẩn nếu 0 */
export function formatUnreadBadge(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  if (count > 99) {
    return "99+";
  }
  return String(count);
}

export function sumInboxUnread(
  items: { unreadCount: number; isMuted: boolean }[],
  options?: { includeMuted?: boolean }
): number {
  const includeMuted = options?.includeMuted ?? false;
  return items.reduce((sum, item) => {
    if (!includeMuted && item.isMuted) {
      return sum;
    }
    return sum + item.unreadCount;
  }, 0);
}

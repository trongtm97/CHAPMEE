/** Calendar day key (YYYY-MM-DD) for daily-activity idempotency — Vietnam time. */
export function getActivityDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

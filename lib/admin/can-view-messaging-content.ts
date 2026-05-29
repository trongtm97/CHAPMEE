/** Moderator/admin: xem tin bị report + ngữ cảnh giới hạn. Support chỉ metadata. */
export function canViewMessagingMessageContent(context: {
  permissions: string[];
}): boolean {
  return context.permissions.includes("moderation.action.create");
}

export function canViewMessagingCaseMetadata(context: {
  permissions: string[];
}): boolean {
  return (
    context.permissions.includes("report.review") ||
    context.permissions.includes("moderation.action.create")
  );
}

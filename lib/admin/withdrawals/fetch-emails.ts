export async function fetchEmailsForUsers(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!userIds.length) return map;
  try {
    const { createAdminClient } = await import("@/lib/data/admin");
    const admin = createAdminClient();
    await Promise.all(
      userIds.slice(0, 80).map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        if (data.user?.email) map.set(id, data.user.email);
      })
    );
  } catch {
    /* admin client optional in dev */
  }
  return map;
}

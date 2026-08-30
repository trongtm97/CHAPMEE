import { GlobalFeedbackFab } from "@/components/feedback/GlobalFeedbackFab";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getContactSettings } from "@/lib/settings/get-contact-settings";

export async function GlobalFeedbackLauncher() {
  const [{ settings }, { user }] = await Promise.all([
    getContactSettings({ useCache: true }),
    getCurrentUser()
  ]);

  return <GlobalFeedbackFab settings={settings} userEmail={user?.email ?? null} />;
}

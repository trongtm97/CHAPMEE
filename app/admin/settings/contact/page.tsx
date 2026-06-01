import Link from "next/link";
import { ContactSettingsForm } from "@/components/admin/settings/ContactSettingsForm";
import { ErrorState } from "@/components/ui";
import { getRecentFeedback } from "@/lib/admin/get-feedback-list";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { getContactSettings } from "@/lib/settings/get-contact-settings";

export const dynamic = "force-dynamic";

export default async function AdminContactSettingsPage() {
  const guard = await requireAdminSettingsAccess("/admin/settings/contact");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal">
            Không có quyền truy cập
          </h1>
        </div>
        <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />
      </section>
    );
  }

  const [{ settings, updatedAt }, recentFeedback] = await Promise.all([
    getContactSettings({ useCache: false }),
    getRecentFeedback(8)
  ]);

  return (
    <section className="space-y-5">
      <div>
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin"
        >
          ← Admin
        </Link>
        <p className="mt-4 text-sm font-medium uppercase tracking-wide text-cyan-300">
          Admin · Cài đặt
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-normal sm:text-3xl">
          Liên hệ & Góp ý
        </h1>
      </div>

      <ContactSettingsForm
        initialSettings={settings}
        recentFeedback={recentFeedback}
        updatedAt={updatedAt}
      />
    </section>
  );
}

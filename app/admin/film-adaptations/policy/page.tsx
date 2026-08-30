import Link from "next/link";
import { FilmPolicyForm } from "@/components/admin/films/FilmPolicyForm";
import { ErrorState } from "@/components/ui";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { getFilmAdaptationPolicySettings } from "@/lib/settings/film-adaptation-settings";

export const dynamic = "force-dynamic";

export default async function AdminFilmAdaptationsPolicyPage() {
  const guard = await requireAdminSettingsAccess("/admin/film-adaptations/policy");
  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />;
  }
  const settings = await getFilmAdaptationPolicySettings();

  return (
    <section className="space-y-5">
      <div>
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin/film-adaptations"
        >
          ← Film Center
        </Link>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Film policy</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Cấu hình engine phim chuyển thể (`film_adaptation_policy_settings`).
        </p>
      </div>
      <FilmPolicyForm settings={settings} />
    </section>
  );
}

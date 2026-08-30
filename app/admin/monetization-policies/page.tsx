import Link from "next/link";
import { ErrorState } from "@/components/ui";
import { requirePermission } from "@/lib/auth/require-permission";
import { getContentOriginPolicySettings } from "@/lib/settings/content-origin-policy-settings";
import { updateContentOriginPolicySettingsAction } from "@/app/admin/translations/actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function AdminMonetizationPoliciesPage({ searchParams }: PageProps) {
  const guard = await requirePermission("admin.settings.view", {
    returnTo: "/admin/monetization-policies"
  });
  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" />;
  }

  const settings = await getContentOriginPolicySettings();
  const qs = await searchParams;

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-white">Translation Monetization Policies</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Khóa cứng paid chapters/bundle/coin unlock cho Truyện Dịch. Ads/Tips theo rights verification.
        </p>
      </div>

      {qs.error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100">
          {qs.error}
        </p>
      ) : null}
      {qs.success ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
          Đã cập nhật policy settings.
        </p>
      ) : null}

      <form action={updateContentOriginPolicySettingsAction} className="space-y-4 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
        <LockedSetting label="translation_paid_chapters_allowed" value={false} />
        <LockedSetting label="translation_story_bundle_allowed" value={false} />
        <LockedSetting label="translation_coin_unlock_allowed" value={false} />

        <Toggle
          defaultChecked={settings.translation_ads_requires_verified_rights}
          label="translation_ads_requires_verified_rights"
          name="translation_ads_requires_verified_rights"
        />
        <Toggle
          defaultChecked={settings.translation_tips_requires_verified_rights}
          label="translation_tips_requires_verified_rights"
          name="translation_tips_requires_verified_rights"
        />
        <Toggle
          defaultChecked={settings.translation_boost_requires_verified_rights}
          label="translation_boost_requires_verified_rights"
          name="translation_boost_requires_verified_rights"
        />
        <Toggle
          defaultChecked={settings.original_full_monetization_enabled}
          label="original_full_monetization_enabled"
          name="original_full_monetization_enabled"
        />

        <label className="block text-sm text-zinc-300">
          default_translation_rights_status
          <select
            className="mt-1 w-full max-w-sm rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            defaultValue={settings.default_translation_rights_status}
            name="default_translation_rights_status"
          >
            <option value="pending_review">pending_review</option>
            <option value="unverified">unverified</option>
          </select>
        </label>

        <label className="block text-sm text-zinc-300">
          default_translation_monetization_policy
          <select
            className="mt-1 w-full max-w-sm rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            defaultValue={settings.default_translation_monetization_policy}
            name="default_translation_monetization_policy"
          >
            <option value="free_only">free_only</option>
            <option value="no_monetization">no_monetization</option>
          </select>
        </label>

        <button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950" type="submit">
          Lưu policy settings
        </button>
      </form>
    </section>
  );
}

function Toggle({
  label,
  name,
  defaultChecked
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-zinc-200">
      <input className="size-4" defaultChecked={defaultChecked} name={name} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

function LockedSetting({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
      <p className="text-sm text-amber-100">
        {label}: <strong>{String(value)}</strong> (locked)
      </p>
      <p className="mt-1 text-xs text-amber-200/80">
        Không cho phép bật paid chapters/bundle/coin unlock cho Truyện Dịch trong project này.
      </p>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import { buildSeoMetadata } from "@/lib/platform-content";
import { listPolicyPages } from "@/lib/policies/policy-pages";
import { getPolicyUrl } from "@/lib/seo/canonical";
import {
  POLICY_TYPE_GROUPS,
  POLICY_TYPE_LABELS,
  type PolicyPage,
  type PolicyType
} from "@/types/policy-pages";

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    pathname: "/chinh-sach",
    pageType: "policy_catalog",
    title: "Chính sách ChapMee",
    description: "Điều khoản, quyền riêng tư và các chính sách vận hành của ChapMee."
  });
}

function groupPolicies(items: PolicyPage[]) {
  const groups = new Map<PolicyType, PolicyPage[]>();
  for (const group of POLICY_TYPE_GROUPS) {
    groups.set(group.type, []);
  }
  for (const item of items) {
    const list = groups.get(item.policy_type) ?? [];
    list.push(item);
    groups.set(item.policy_type, list);
  }
  return POLICY_TYPE_GROUPS.filter((group) => (groups.get(group.type)?.length ?? 0) > 0).map(
    (group) => ({
      ...group,
      items: groups.get(group.type) ?? []
    })
  );
}

export default async function PoliciesIndexPage() {
  const { items, error } = await listPolicyPages({ publicOnly: true, pageSize: 100 });
  const grouped = groupPolicies(items);

  return (
    <ResponsivePageContainer className="py-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Chính sách ChapMee</h1>
          <p className="text-muted-foreground">
            Điều khoản, quyền riêng tư và quy định vận hành nền tảng.
          </p>
        </header>

        {error ? (
          <p className="text-sm text-red-300">Không thể tải danh sách chính sách.</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có chính sách công khai.</p>
        ) : (
          grouped.map((group) => (
            <section className="space-y-4" key={group.type}>
              <h2 className="text-lg font-bold text-foreground">{group.label}</h2>
              <ul className="space-y-3">
                {group.items.map((item) => {
                  const href =
                    item.public_code != null
                      ? getPolicyUrl({ slug: item.slug, public_code: item.public_code })
                      : `/chinh-sach/${item.slug}`;
                  return (
                    <li key={item.id}>
                      <Link
                        className="block rounded-xl border border-border p-4 transition hover:border-cyan-300/30 hover:bg-muted/20"
                        href={href}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground">{item.title}</h3>
                            {item.summary ? (
                              <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
                            ) : null}
                          </div>
                          <span className="text-xs text-muted-foreground">v{item.version}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{POLICY_TYPE_LABELS[item.policy_type]}</span>
                          {item.effective_date ? (
                            <span>
                              Hiệu lực{" "}
                              {new Date(item.effective_date).toLocaleDateString("vi-VN")}
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </ResponsivePageContainer>
  );
}

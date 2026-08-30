import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminPoliciesEditRedirect({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const suffix = query.tab ? `?tab=${encodeURIComponent(query.tab)}` : "";
  redirect(`/admin/pages/${id}/edit${suffix}`);
}

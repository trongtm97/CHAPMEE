import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPoliciesRedirect({ searchParams }: PageProps) {
  const query = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      value.forEach((part) => params.append(key, part));
    } else {
      params.set(key, value);
    }
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  redirect(`/admin/pages${suffix}`);
}

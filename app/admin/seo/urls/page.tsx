import { redirect } from "next/navigation";

export default function AdminSeoUrlsLegacyPage() {
  redirect("/admin/seo/redirects?tab=slug");
}

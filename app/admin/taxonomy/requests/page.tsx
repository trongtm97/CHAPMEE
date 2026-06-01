import { redirect } from "next/navigation";

export default function AdminTaxonomyRequestsRoute() {
  redirect("/admin/taxonomy?tab=requests");
}

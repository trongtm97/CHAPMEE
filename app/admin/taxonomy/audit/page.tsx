import { redirect } from "next/navigation";

export default function AdminTaxonomyAuditRoute() {
  redirect("/admin/taxonomy?tab=audit");
}

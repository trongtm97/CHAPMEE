import { redirect } from "next/navigation";

export default function AdminTaxonomyTemplatesRoute() {
  redirect("/admin/taxonomy?tab=templates");
}

import { redirect } from "next/navigation";

export default function AdminTaxonomyImportExportRoute() {
  redirect("/admin/taxonomy?tab=import_export");
}

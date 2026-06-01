import { redirect } from "next/navigation";

export default function AdminSeoAuditRedirect() {
  redirect("/admin/seo?tab=audit");
}

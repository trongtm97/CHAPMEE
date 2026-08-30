import { redirect } from "next/navigation";

export default function AdminSeoRulesRedirect() {
  redirect("/admin/seo/control?tab=rules");
}

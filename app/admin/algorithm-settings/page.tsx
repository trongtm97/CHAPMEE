import { redirect } from "next/navigation";

export default function AdminAlgorithmSettingsRedirectPage() {
  redirect("/admin/algorithm?tab=overview");
}

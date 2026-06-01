import { redirect } from "next/navigation";

export default function AdminAlgorithmSettingsRedirect() {
  redirect("/admin/algorithm?tab=overview");
}

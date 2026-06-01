import { redirect } from "next/navigation";

export default function AdminRecommendationSettingsRedirectPage() {
  redirect("/admin/algorithm?tab=overview");
}

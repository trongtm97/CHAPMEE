import { redirect } from "next/navigation";

export default function AdminBoostLegacyRedirect() {
  redirect("/admin/engagement/boosts");
}

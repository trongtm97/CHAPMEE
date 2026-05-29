import { redirect } from "next/navigation";
import { AccountStatusView } from "@/components/moderation/AccountStatusView";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getAccountStatus } from "@/lib/moderation/get-account-status";

export const dynamic = "force-dynamic";

export default async function AccountStatusPage() {
  const { user } = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/me/account-status");
  }

  const status = await getAccountStatus(user.id);

  return <AccountStatusView status={status} />;
}

import { createClient } from "@/lib/supabase/server";
import { getUserVerificationSummary } from "@/lib/verification/get-user-verification";
import type { FinanceIdentityStatus } from "@/types/finance";

const VERIFICATION_HREF = "/studio/settings/verification";

export async function getFinanceIdentityStatus(userId: string): Promise<FinanceIdentityStatus> {
  const [summary, supabase] = await Promise.all([
    getUserVerificationSummary(userId),
    createClient()
  ]);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_verified")
    .eq("id", userId)
    .maybeSingle();

  const isVerified = Boolean(profile?.is_verified);
  const verifiedName = isVerified ? (profile?.display_name as string | null)?.trim() || null : null;

  if (isVerified) {
    return {
      status: "verified",
      verifiedName,
      canWithdraw: true,
      ctaLabel: "Đã xác thực",
      ctaHref: VERIFICATION_HREF,
      description: "Danh tính đã được xác thực. Bạn có thể rút tiền khi đủ điều kiện khác."
    };
  }

  if (summary.latestPending) {
    return {
      status: "pending",
      verifiedName: null,
      canWithdraw: false,
      ctaLabel: "Xem trạng thái xác thực",
      ctaHref: VERIFICATION_HREF,
      description: "Hồ sơ xác thực đang chờ duyệt."
    };
  }

  if (summary.latestRejected) {
    return {
      status: "rejected",
      verifiedName: null,
      canWithdraw: false,
      ctaLabel: "Cập nhật hồ sơ xác thực",
      ctaHref: VERIFICATION_HREF,
      description: "Hồ sơ xác thực bị từ chối. Vui lòng cập nhật tại trung tâm xác thực."
    };
  }

  return {
    status: "unverified",
    verifiedName: null,
    canWithdraw: false,
    ctaLabel: "Đi tới xác thực",
    ctaHref: VERIFICATION_HREF,
    description: "Xác thực giúp bảo vệ tài khoản và là điều kiện để rút tiền về ngân hàng."
  };
}

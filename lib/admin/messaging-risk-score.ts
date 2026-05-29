import type { RiskyMessageUser } from "@/types/admin-messaging";

const REQUEST_SPIKE_THRESHOLD = 8;

export function computeMessagingRiskScore(input: {
  openReports: number;
  safetyBlocked: number;
  safetyWarnings: number;
  requests24h: number;
  duplicateSpamCount: number;
  blocksReceived: number;
  accountAgeHours: number;
  hasOpenReportWhileNew: boolean;
}): number {
  let score = 0;
  score += input.openReports * 5;
  score += input.safetyBlocked * 3;
  score += input.safetyWarnings * 1;
  score += input.duplicateSpamCount * 2;
  score += input.blocksReceived * 3;

  if (input.requests24h >= REQUEST_SPIKE_THRESHOLD) {
    score += 4;
  }

  if (input.accountAgeHours < 24 && input.hasOpenReportWhileNew) {
    score += 5;
  }

  return score;
}

export function sortRiskyUsers(users: RiskyMessageUser[]): RiskyMessageUser[] {
  return [...users].sort((a, b) => {
    if (b.riskScore !== a.riskScore) {
      return b.riskScore - a.riskScore;
    }
    return b.openReports7d - a.openReports7d;
  });
}

export function restrictionLabel(type: string | null): string | null {
  if (!type) return null;
  const labels: Record<string, string> = {
    message_block_24h: "Hạn chế nhắn tin 24h",
    message_block_7d: "Hạn chế nhắn tin 7 ngày",
    message_block_30d: "Hạn chế nhắn tin 30 ngày",
    message_banned: "Cấm nhắn tin",
    account_suspended: "Tạm khóa tài khoản"
  };
  return labels[type] ?? type;
}

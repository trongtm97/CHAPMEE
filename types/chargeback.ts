export type ChargebackStatus =
  | "opened"
  | "under_review"
  | "won"
  | "lost"
  | "accepted"
  | "closed";

export type ChargebackRecord = {
  id: string;
  originalTransactionId: string;
  userId: string | null;
  amountVnd: number;
  provider: string;
  providerReference: string | null;
  status: ChargebackStatus;
  receivedAt: string;
  resolvedAt: string | null;
  metadata: Record<string, unknown> | null;
};

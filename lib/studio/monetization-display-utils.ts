export type MonetizationTxKind = "chapter" | "bundle" | "tip" | "refund" | "other";

export function resolveTransactionKind(type: string, source: string): MonetizationTxKind {
  if (type === "story_unlock") return "bundle";
  if (type === "chapter_unlock" || source === "unlock") return "chapter";
  if (type === "author_tip" || type === "virtual_gift" || source === "tip") return "tip";
  if (type === "reversal" || type === "refund") return "refund";
  return "other";
}

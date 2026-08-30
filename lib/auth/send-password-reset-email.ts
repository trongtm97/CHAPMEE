import { enqueuePasswordResetEmail } from "@/lib/email/email-integrations";

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
  displayName?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  await enqueuePasswordResetEmail(input);
  return { ok: true };
}

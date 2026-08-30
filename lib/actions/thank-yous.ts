"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createThankYou } from "@/lib/data/thank-yous";
import { createClient } from "@/lib/data/server";
import type { ThankYouRecipientGroupType } from "@/types/thank-you";

async function getUser() {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  return data.user ?? null;
}

export async function createThankYouAction(formData: FormData) {
  const user = await getUser();
  const returnTo = String(formData.get("returnTo") ?? "/creator");
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const authorId = String(formData.get("authorId") ?? "");
  const storyId = String(formData.get("storyId") ?? "").trim() || null;
  const recipientGroupType = String(formData.get("recipientGroupType") ?? "top_fans") as ThankYouRecipientGroupType;
  const message = String(formData.get("message") ?? "").trim();

  if (!authorId || !message) {
    throw new Error("Thiếu dữ liệu lời cảm ơn.");
  }

  await createThankYou({
    authorId,
    message,
    recipientGroupType,
    storyId
  });

  revalidatePath("/creator");
  revalidatePath("/me");
  redirect(returnTo);
}

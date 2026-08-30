"use server";

import { revalidatePath } from "next/cache";
import { assertCollectionOwner } from "@/lib/actions/collections";
import { deleteCollection } from "@/lib/data/collections";

export async function deleteCollectionFromLibraryAction(collectionId: string) {
  await assertCollectionOwner(collectionId, "save.delete.own");
  await deleteCollection(collectionId);
  revalidatePath("/me/library");
  revalidatePath("/me");
  return { ok: true };
}

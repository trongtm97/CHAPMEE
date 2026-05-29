"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import {
  addStoryToCollection,
  createCollection,
  deleteCollection,
  removeStoryFromCollection,
  updateCollection,
  getCollectionById
} from "@/lib/supabase/collections";
import type { CollectionFormValues } from "@/types/collection";
import { createClient } from "@/lib/supabase/server";

async function getCurrentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function guardCollectionMutation(permission: "save.create" | "save.delete.own") {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Vui lòng đăng nhập.");
  }

  try {
    await assertActionAccess(permission);
  } catch (error) {
    if (error instanceof ActionAccessError) {
      throw new Error(error.message);
    }
    throw error;
  }

  return userId;
}

export async function assertCollectionOwner(
  collectionId: string,
  permission: "save.create" | "save.delete.own" = "save.create"
) {
  await guardCollectionMutation(permission);
  const collection = await getCollectionById(collectionId);
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Vui lòng đăng nhập.");
  }
  if (!collection || !collection.isOwner) {
    throw new Error("Bạn không có quyền chỉnh sửa collection này.");
  }
  return collection;
}

export async function createCollectionAction(values: CollectionFormValues) {
  await guardCollectionMutation("save.create");
  const id = await createCollection(values);
  revalidatePath("/me");
  revalidatePath("/me/library");
  redirect(`/collections/${id}/manage`);
}

export async function updateCollectionAction(collectionId: string, values: CollectionFormValues) {
  await assertCollectionOwner(collectionId);
  await updateCollection(collectionId, values);
  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/collections/${collectionId}/manage`);
  revalidatePath("/me");
}

export async function deleteCollectionAction(collectionId: string) {
  await assertCollectionOwner(collectionId, "save.delete.own");
  await deleteCollection(collectionId);
  revalidatePath("/me");
  revalidatePath("/me/library");
  redirect("/me/library?tab=collections");
}

export async function addStoryToCollectionAction(collectionId: string, storyId: string) {
  await assertCollectionOwner(collectionId);
  await addStoryToCollection(collectionId, storyId);
  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/collections/${collectionId}/manage`);
}

export async function removeStoryFromCollectionAction(collectionId: string, storyId: string) {
  await assertCollectionOwner(collectionId, "save.delete.own");
  await removeStoryFromCollection(collectionId, storyId);
  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/collections/${collectionId}/manage`);
}

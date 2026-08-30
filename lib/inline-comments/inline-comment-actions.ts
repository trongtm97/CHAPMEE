"use server";

import { revalidatePath } from "next/cache";
import {
  createInlineComment,
  createInlineCommentThread,
  deleteMyInlineComment,
  getInlineCommentCounts,
  getInlineComments,
  getInlineThreadDetail,
  getInlineThreadsForBlock,
  getInlineThreadsForChapter,
  replyToInlineThread
} from "@/lib/inline-comments/inline-comments";
import type { CreateInlineCommentInput } from "@/types/inline-comment";

export async function createInlineCommentAction(
  input: CreateInlineCommentInput,
  returnTo?: string
) {
  const result = await createInlineComment(input);
  if (result.ok && returnTo) {
    revalidatePath(returnTo);
  }
  return result;
}

export async function createInlineCommentThreadAction(
  input: CreateInlineCommentInput,
  returnTo?: string
) {
  const result = await createInlineCommentThread(input);
  if (result.ok && returnTo) {
    revalidatePath(returnTo);
  }
  return result;
}

export async function replyToInlineThreadAction(
  threadId: string,
  body: string,
  parentId: string | null,
  returnTo?: string
) {
  const result = await replyToInlineThread(threadId, body, parentId);
  if (result.ok && returnTo) {
    revalidatePath(returnTo);
  }
  return result;
}

export async function addInlineCommentReplyAction(
  threadId: string,
  body: string,
  parentCommentId: string | null,
  returnTo?: string
) {
  return replyToInlineThreadAction(threadId, body, parentCommentId, returnTo);
}

export async function deleteMyInlineCommentAction(commentId: string, returnTo?: string) {
  const result = await deleteMyInlineComment(commentId);
  if (result.ok && returnTo) {
    revalidatePath(returnTo);
  }
  return result;
}

export async function getInlineCommentCountsAction(chapterId: string) {
  return getInlineCommentCounts(chapterId);
}

export async function getInlineThreadsForBlockAction(chapterId: string, blockId: string) {
  return getInlineThreadsForBlock(chapterId, blockId);
}

export async function getInlineCommentsAction(threadId: string, page = 1) {
  return getInlineComments(threadId, page);
}

export async function loadInlineThreadDetailAction(threadId: string) {
  return getInlineThreadDetail(threadId);
}

export async function loadInlineThreadsPageAction(input: {
  chapterId: string;
  page: number;
}) {
  return getInlineThreadsForChapter(input.chapterId, { page: input.page });
}

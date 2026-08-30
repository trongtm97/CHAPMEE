"use server";



import { revalidatePath } from "next/cache";

import { adminListMeta, parseAdminListParams } from "@/lib/admin/admin-list-params";

import { logAdminAction } from "@/lib/audit/log-admin-action";

import {

  getAdminInlineThreadsPaged,

  setInlineCommentModerationStatus,

  setInlineThreadModerationStatus

} from "@/lib/inline-comments/inline-comments";

import { requireAnyPermission } from "@/lib/auth/require-permission";



export type AdminInlineCommentListFilters = {

  status?: string;

  orphaned?: string;

  reported?: string;

  q?: string;

  page?: string;

  pageSize?: string;

};



function parseThreadStatus(value?: string): "visible" | "hidden" | "all" {

  if (value === "visible" || value === "hidden") {

    return value;

  }

  return "all";

}



export async function getAdminInlineCommentsAction(

  filters: AdminInlineCommentListFilters = {}

) {

  const guard = await requireAnyPermission(["report.review", "moderation.action.create"], {

    returnTo: "/admin/engagement/inline-comments"

  });

  if (!guard.ok) {

    return {

      ok: false as const,

      error: guard.error,

      items: [],

      total: 0,

      page: 1,

      pageSize: 20,

      totalPages: 1

    };

  }



  const { page, pageSize } = parseAdminListParams(filters);

  const { items, total } = await getAdminInlineThreadsPaged({

    status: parseThreadStatus(filters.status),

    orphanedOnly: filters.orphaned === "1",

    reportedOnly: filters.reported === "1",

    chapterQ: filters.q,

    page,

    pageSize

  });



  const meta = adminListMeta(total, page, pageSize);



  return {

    ok: true as const,

    error: null,

    items,

    ...meta

  };

}



export async function moderateInlineCommentAction(formData: FormData) {

  const guard = await requireAnyPermission(["report.review", "moderation.action.create"], {

    returnTo: "/admin/engagement/inline-comments"

  });

  if (!guard.ok) {

    return { ok: false as const, message: guard.error };

  }



  const threadId = String(formData.get("threadId") ?? formData.get("commentId") ?? "").trim();

  const action = String(formData.get("action") ?? formData.get("status") ?? "").trim();



  if (!threadId) {

    return { ok: false as const, message: "Thiếu thread id." };

  }



  if (action === "hide" || action === "hidden") {

    const result = await setInlineThreadModerationStatus(threadId, "hide");

    if (!result.ok) {

      return { ok: false as const, message: result.error ?? "Không thể cập nhật." };

    }

    await logAdminAction({

      action: "reported_content_hidden",

      actorId: guard.context.userId,

      targetType: "inline_comment_thread",

      targetId: threadId,

      metadata: { action: "hide" }

    });

    revalidatePath("/admin/engagement/inline-comments");

    revalidatePath("/admin/engagement");

    return { ok: true as const, message: "Đã ẩn luồng bình luận." };

  }



  if (action === "resolve") {

    const result = await setInlineThreadModerationStatus(threadId, "resolve");

    if (!result.ok) {

      return { ok: false as const, message: result.error ?? "Không thể cập nhật." };

    }

    await logAdminAction({

      action: "reported_content_hidden",

      actorId: guard.context.userId,

      targetType: "inline_comment_thread",

      targetId: threadId,

      metadata: { action: "resolve" }

    });

    revalidatePath("/admin/engagement/inline-comments");

    revalidatePath("/admin/engagement");

    return { ok: true as const, message: "Đã xử lý luồng (ẩn + suppress anchor)." };

  }



  if (action === "restore" || action === "visible") {

    const result = await setInlineThreadModerationStatus(threadId, "restore");

    if (!result.ok) {

      return { ok: false as const, message: result.error ?? "Không thể cập nhật." };

    }

    await logAdminAction({

      action: "reported_content_restored",

      actorId: guard.context.userId,

      targetType: "inline_comment_thread",

      targetId: threadId,

      metadata: { action: "restore" }

    });

    revalidatePath("/admin/engagement/inline-comments");

    revalidatePath("/admin/engagement");

    return { ok: true as const, message: "Đã khôi phục luồng." };

  }



  const commentId = threadId;

  const nextStatus = action;

  if (nextStatus !== "visible" && nextStatus !== "hidden") {

    return { ok: false as const, message: "Dữ liệu không hợp lệ." };

  }



  const result = await setInlineCommentModerationStatus(

    commentId,

    nextStatus as "visible" | "hidden"

  );



  if (!result.ok) {

    return { ok: false as const, message: result.error ?? "Không thể cập nhật." };

  }



  await logAdminAction({

    action: nextStatus === "hidden" ? "reported_content_hidden" : "reported_content_restored",

    actorId: guard.context.userId,

    targetType: "inline_comment",

    targetId: commentId,

    metadata: { status: nextStatus }

  });



  revalidatePath("/admin/engagement/inline-comments");

  return {

    ok: true as const,

    message: nextStatus === "hidden" ? "Đã ẩn bình luận." : "Đã hiện lại bình luận."

  };

}



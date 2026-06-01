"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CommentCard } from "@/components/studio/comments/CommentCard";
import { CommentReplyBox } from "@/components/studio/comments/CommentReplyBox";
import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";
import {
  studioHideCommentAction,
  studioPinCommentAction,
  studioReportCommentAction,
  studioUnhideCommentAction
} from "@/lib/studio/studio-comments-actions";
import {
  commentsBtnCompactPrimary,
  commentsBtnCompactSecondary
} from "@/components/studio/comments/shared/styles";
import type { StudioCommentInboxItem } from "@/types/comments";

type CommentDetailPanelProps = {
  item: StudioCommentInboxItem;
  onClose?: () => void;
};

export function CommentDetailPanel({ item, onClose }: CommentDetailPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  const menuItems = [
    {
      type: "link" as const,
      label: "Mở ngữ cảnh",
      href: item.contextHref
    },
    {
      type: "action" as const,
      label: item.isPinned ? "Bỏ ghim" : "Ghim",
      onAction: () => studioPinCommentAction(item.id, !item.isPinned)
    },
    ...(item.isHidden
      ? [
          {
            type: "action" as const,
            label: "Bỏ ẩn",
            onAction: () => studioUnhideCommentAction(item.id)
          }
        ]
      : [
          {
            type: "action" as const,
            label: "Ẩn",
            destructive: true,
            confirmMessage: "Ẩn bình luận này? Độc giả sẽ không thấy trên trang công khai.",
            onAction: () => studioHideCommentAction(item.id)
          }
        ]),
    ...(item.hasOpenReport
      ? []
      : [
          {
            type: "action" as const,
            label: "Báo cáo",
            confirmMessage: "Gửi báo cáo vi phạm nặng tới đội moder ChapMee?",
            onAction: () => studioReportCommentAction(item.id, "other")
          }
        ])
  ];

  return (
    <div className="flex h-full flex-col">
      {onClose ? (
        <button
          className="mb-3 inline-flex min-h-10 items-center text-sm font-semibold text-cyan-300 lg:hidden"
          onClick={onClose}
          type="button"
        >
          ← Quay lại danh sách
        </button>
      ) : null}

      <CommentCard
        item={item}
        menu={<StudioRowActionMenu ariaLabel="Tùy chọn bình luận" items={menuItems} />}
      />

      {item.replyCount > 0 ? (
        <p className="mt-3 text-xs text-zinc-500">
          Có {item.replyCount} phản hồi trong luồng — mở ngữ cảnh để xem đầy đủ.
        </p>
      ) : null}

      {item.isHidden ? (
        <div className="mt-4 rounded-xl border border-zinc-600/40 bg-zinc-800/40 px-3 py-2.5 text-sm text-zinc-400">
          Bình luận đã ẩn — độc giả không thấy trên trang công khai. Bạn có thể bỏ ẩn nếu
          cần.
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          className={commentsBtnCompactSecondary}
          href={item.contextHref}
          target="_blank"
        >
          Mở ngữ cảnh
        </Link>
        <button
          className={commentsBtnCompactSecondary}
          disabled={isPending}
          onClick={() => runAction(() => studioPinCommentAction(item.id, !item.isPinned))}
          type="button"
        >
          {item.isPinned ? "Bỏ ghim" : "Ghim"}
        </button>
        {item.isHidden ? (
          <button
            className={commentsBtnCompactSecondary}
            disabled={isPending}
            onClick={() => runAction(() => studioUnhideCommentAction(item.id))}
            type="button"
          >
            Bỏ ẩn
          </button>
        ) : (
          <button
            className={commentsBtnCompactSecondary}
            disabled={isPending}
            onClick={() => runAction(() => studioHideCommentAction(item.id))}
            type="button"
          >
            Ẩn
          </button>
        )}
        <button
          className={commentsBtnCompactSecondary}
          disabled
          title="Trả lời bình luận để tự động đánh dấu đã trả lời"
          type="button"
        >
          Đánh dấu đã trả lời
        </button>
        {item.hasOpenReport ? (
          <span className="inline-flex min-h-10 items-center rounded-lg border border-red-400/30 bg-red-400/10 px-3 text-xs font-semibold text-red-200">
            Đang có báo cáo mở
          </span>
        ) : (
          <button
            className={commentsBtnCompactSecondary}
            disabled={isPending}
            onClick={() => runAction(() => studioReportCommentAction(item.id, "other"))}
            type="button"
          >
            Báo cáo
          </button>
        )}
      </div>

      {!item.isHidden ? (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Phản hồi
          </p>
          <CommentReplyBox commentId={item.id} onReplied={() => router.refresh()} />
        </div>
      ) : (
        <button
          className={`${commentsBtnCompactPrimary} mt-4`}
          disabled={isPending}
          onClick={() => runAction(() => studioUnhideCommentAction(item.id))}
          type="button"
        >
          Bỏ ẩn để trả lời
        </button>
      )}
    </div>
  );
}

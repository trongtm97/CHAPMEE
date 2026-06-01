"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  archiveConversationAction,
  blockUserInChatAction,
  hideConversationAction,
  toggleMuteAction,
  unblockUserInChatAction
} from "@/lib/actions/messages";
import {
  ConversationActionSheet,
  ConversationProfileSheetRow,
  type ConversationSheetAction
} from "@/components/messages/ConversationActionSheet";
import { MessageToast } from "@/components/messages/MessageToast";
import { ReportMessageDialog } from "@/components/messages/ReportMessageDialog";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";

type ConversationActionMenuProps = {
  conversationId: string;
  otherUserId: string;
  username: string | null;
  isMuted: boolean;
  blockState: "none" | "blocked_by_me" | "blocked_by_other";
};

const BLOCK_CONFIRM =
  "Bạn có chắc muốn chặn người dùng này? Họ sẽ không thể nhắn tin cho bạn.";
const UNBLOCK_CONFIRM =
  "Bạn có chắc muốn bỏ chặn người dùng này? Họ có thể nhắn tin lại theo quy tắc quyền riêng tư của bạn.";
const HIDE_CONFIRM =
  "Xóa khỏi hộp thư của bạn? Cuộc trò chuyện sẽ ẩn với bạn; tin nhắn mới từ họ có thể hiện lại trong hộp thư.";

export function ConversationActionMenu({
  conversationId,
  otherUserId,
  username,
  isMuted,
  blockState
}: ConversationActionMenuProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runAction(
    action: () => Promise<{ ok: boolean } | { ok?: boolean }>,
    successToast: string,
    after?: () => void
  ) {
    setBusy(true);
    try {
      const result = await action();
      if (result.ok !== false) {
        setToast(successToast);
        after?.();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const sheetActions = useMemo((): ConversationSheetAction[] => {
    const items: ConversationSheetAction[] = [
      {
        key: "mute",
        title: isMuted ? "Bật thông báo" : "Tắt thông báo",
        subtitle: isMuted
          ? "Nhận thông báo khi có tin nhắn mới trong cuộc trò chuyện này."
          : "Tắt thông báo in-app; tin nhắn vẫn hiện trong hộp thư.",
        icon: <BellIcon muted={isMuted} />,
        onClick: () => {
          void runAction(
            () => toggleMuteAction(conversationId, !isMuted),
            isMuted
              ? "Đã bật thông báo cuộc trò chuyện."
              : "Đã tắt thông báo cuộc trò chuyện."
          );
        }
      },
      {
        key: "archive",
        title: "Lưu trữ hội thoại",
        subtitle: "Ẩn khỏi hộp thư chính; có tin mới sẽ hiện lại.",
        icon: <ArchiveIcon />,
        onClick: () => {
          void runAction(
            () => archiveConversationAction(conversationId),
            "Đã lưu trữ hội thoại.",
            () => router.push("/messages")
          );
        }
      },
      {
        key: "hide",
        title: "Xóa khỏi hộp thư của tôi",
        subtitle: "Chỉ ẩn với bạn; không xóa tin nhắn của người kia.",
        icon: <TrashIcon />,
        onClick: () => {
          if (!confirm(HIDE_CONFIRM)) {
            return;
          }
          void runAction(
            () => hideConversationAction(conversationId),
            "Đã xóa khỏi hộp thư của bạn.",
            () => router.push("/messages")
          );
        }
      }
    ];

    if (blockState === "blocked_by_me") {
      items.push({
        key: "unblock",
        title: "Bỏ chặn",
        subtitle: "Cho phép họ nhắn lại theo quy tắc quyền riêng tư.",
        icon: <BlockIcon />,
        onClick: () => {
          if (!confirm(UNBLOCK_CONFIRM)) {
            return;
          }
          void runAction(
            () => unblockUserInChatAction(otherUserId, conversationId),
            "Đã bỏ chặn."
          );
        }
      });
    } else if (blockState !== "blocked_by_other") {
      items.push({
        key: "block",
        title: "Chặn người dùng",
        subtitle: "Họ không thể nhắn tin cho bạn.",
        icon: <BlockIcon />,
        danger: true,
        onClick: () => {
          if (!confirm(BLOCK_CONFIRM)) {
            return;
          }
          void runAction(
            () => blockUserInChatAction(otherUserId, conversationId),
            "Đã chặn người dùng."
          );
        }
      });
    }

    items.push({
      key: "report",
      title: "Báo cáo cuộc trò chuyện",
      subtitle: "Gửi báo cáo cho đội ngũ kiểm duyệt ChapMee.",
      icon: <FlagIcon />,
      danger: true,
      onClick: () => setReportOpen(true)
    });

    return items;
  }, [
    blockState,
    conversationId,
    isMuted,
    otherUserId,
    router
  ]);

  return (
    <>
      <button
        aria-expanded={sheetOpen}
        aria-haspopup="dialog"
        aria-label="Tuỳ chọn cuộc trò chuyện"
        className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/5 active:bg-white/10"
        disabled={busy}
        onClick={() => setSheetOpen(true)}
        type="button"
      >
        <MoreIcon />
      </button>

      <ConversationActionSheet
        actions={sheetActions}
        headerSlot={
          username ? (
            <ConversationProfileSheetRow
              href={getProfileUrlOrFallback(username)}
              icon={<ProfileIcon />}
              onClose={() => setSheetOpen(false)}
              subtitle="Xem trang cá nhân công khai."
              title="Xem hồ sơ"
            />
          ) : null
        }
        onClose={() => setSheetOpen(false)}
        open={sheetOpen}
      />

      {reportOpen ? (
        <ReportMessageDialog
          conversationId={conversationId}
          onClose={() => setReportOpen(false)}
          reportedUserId={otherUserId}
          variant="conversation"
        />
      ) : null}
      <MessageToast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden className="size-5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function BellIcon({ muted }: { muted: boolean }) {
  return (
    <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24">
      {muted ? (
        <>
          <path
            d="M5.5 9.5a6.5 6.5 0 0113 0v4.5l1.5 2.5H4l1.5-2.5V9.5z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M9.5 18a2.5 2.5 0 005 0" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4 4l16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        </>
      ) : (
        <>
          <path
            d="M5.5 9.5a6.5 6.5 0 0113 0v4.5l1.5 2.5H4l1.5-2.5V9.5z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M9.5 18a2.5 2.5 0 005 0" stroke="currentColor" strokeWidth="1.6" />
        </>
      )}
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7.5h16M6 7.5V19h12V7.5M9 11h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 7h14M9 7V5h6v2M8 11v7M12 11v7M16 11v7M7 11l1 9h8l1-9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 7l10 10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M6 5v15M6 6h9l-2 3 2 3H6"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 19c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

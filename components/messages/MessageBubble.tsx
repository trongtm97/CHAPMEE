import { formatBubbleTime } from "@/lib/messages/format-message-time";
import type { MessageGroupMeta } from "@/lib/messages/group-message-bubbles";
import { MessageBubbleMenu } from "@/components/messages/MessageBubbleMenu";
import type { ConversationMessage } from "@/types/messages";

type MessageBubbleProps = {
  message: ConversationMessage;
  conversationId: string;
  otherUserId: string;
  group?: MessageGroupMeta;
  showSeen?: boolean;
  onRetryFailed?: () => void;
};

const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

function renderBody(text: string) {
  const parts = text.split(URL_PATTERN);
  return parts.map((part, index) => {
    if (!part.match(URL_PATTERN)) {
      return <span key={index}>{part}</span>;
    }
    const href = part.startsWith("http") ? part : `https://${part}`;
    return (
      <a
        className="break-all underline decoration-cyan-400/40 underline-offset-2"
        href={href}
        key={index}
        rel="noopener noreferrer"
        target="_blank"
      >
        {part}
      </a>
    );
  });
}

function displayText(message: ConversationMessage) {
  if (message.displayState === "removed_by_moderator") {
    return "Tin nhắn đã bị gỡ do vi phạm.";
  }
  if (message.displayState === "deleted") {
    return "Tin nhắn đã bị xóa";
  }
  if (message.displayState === "review") {
    return "Tin nhắn đang được xem xét";
  }
  return message.body;
}

function bubbleRadius(isOwn: boolean, group?: MessageGroupMeta) {
  const prev = group?.groupedWithPrevious;
  const next = group?.groupedWithNext;

  if (isOwn) {
    if (prev && next) return "rounded-2xl rounded-br-lg";
    if (prev) return "rounded-2xl rounded-tr-lg rounded-br-md";
    if (next) return "rounded-2xl rounded-br-lg rounded-bl-2xl";
    return "rounded-2xl rounded-br-md";
  }

  if (prev && next) return "rounded-2xl rounded-bl-lg";
  if (prev) return "rounded-2xl rounded-tl-lg rounded-bl-md";
  if (next) return "rounded-2xl rounded-bl-lg rounded-br-2xl";
  return "rounded-2xl rounded-bl-md";
}

function DeliveryMeta({
  message,
  showSeen,
  onRetryFailed
}: {
  message: ConversationMessage;
  showSeen?: boolean;
  onRetryFailed?: () => void;
}) {
  if (message.deliveryStatus === "sending") {
    return <span className="text-cyan-200/40">Đang gửi…</span>;
  }
  if (message.deliveryStatus === "failed") {
    return (
      <span className="flex flex-wrap items-center gap-1 text-red-400">
        Không gửi được
        {onRetryFailed ? (
          <button
            className="min-h-6 underline decoration-red-400/50 underline-offset-2"
            onClick={onRetryFailed}
            type="button"
          >
            Thử lại
          </button>
        ) : null}
      </span>
    );
  }
  if (showSeen) {
    return <span className="text-cyan-200/55">Đã xem</span>;
  }
  return null;
}

export function MessageBubble({
  message,
  conversationId,
  otherUserId,
  group,
  showSeen = false,
  onRetryFailed
}: MessageBubbleProps) {
  const isOwn = message.isOwn;
  const isPlaceholder = message.displayState !== "normal";
  const isSending = message.deliveryStatus === "sending";
  const showTimestamp = group?.showTimestamp !== false;
  const tightTop = group?.groupedWithPrevious;

  const showReportMenu =
    !isOwn && message.displayState === "normal" && !isPlaceholder;

  return (
    <div
      className={`flex items-end gap-1 ${tightTop ? "mt-0.5" : "mt-2"} ${
        isOwn ? "justify-end" : "justify-start"
      }`}
    >
      {!isOwn ? (
        showReportMenu ? (
          <MessageBubbleMenu
            conversationId={conversationId}
            messageId={message.id}
            reportedUserId={otherUserId}
          />
        ) : (
          <span className="w-7 shrink-0" aria-hidden />
        )
      ) : null}
      <div
        className={`max-w-[78%] px-3.5 py-2 text-sm leading-relaxed ${bubbleRadius(isOwn, group)} ${
          isOwn
            ? "bg-cyan-500/20 text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            : "border border-white/[0.08] bg-white/[0.05] text-zinc-100"
        } ${isPlaceholder ? "italic text-zinc-500" : ""} ${isSending ? "opacity-75" : ""}`}
      >
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {isPlaceholder ? displayText(message) : renderBody(message.body)}
        </p>
        {showTimestamp ? (
          <p
            className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] tabular-nums ${
              isOwn ? "text-cyan-200/50" : "text-zinc-600"
            }`}
          >
            <span>{formatBubbleTime(message.createdAt)}</span>
            {isOwn ? (
              <DeliveryMeta
                message={message}
                onRetryFailed={onRetryFailed}
                showSeen={showSeen}
              />
            ) : null}
          </p>
        ) : isOwn && (message.deliveryStatus === "failed" || message.deliveryStatus === "sending") ? (
          <p className="mt-1 text-[10px]">
            <DeliveryMeta message={message} onRetryFailed={onRetryFailed} />
          </p>
        ) : null}
      </div>
    </div>
  );
}

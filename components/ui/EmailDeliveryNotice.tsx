import {
  EMAIL_DELIVERY_NOTICE_BODY,
  EMAIL_DELIVERY_NOTICE_TITLE
} from "@/lib/email/email-delivery-copy";

type EmailDeliveryNoticeProps = {
  className?: string;
  compact?: boolean;
};

export function EmailDeliveryNotice({ className = "", compact = false }: EmailDeliveryNoticeProps) {
  if (compact) {
    return (
      <p className={`text-xs leading-relaxed text-amber-200/90 ${className}`}>
        {EMAIL_DELIVERY_NOTICE_BODY}
      </p>
    );
  }

  return (
    <div
      className={`rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm leading-relaxed text-amber-100 ${className}`}
      role="note"
    >
      <p className="font-semibold text-amber-50">{EMAIL_DELIVERY_NOTICE_TITLE}</p>
      <p className="mt-1 text-amber-100/95">{EMAIL_DELIVERY_NOTICE_BODY}</p>
    </div>
  );
}

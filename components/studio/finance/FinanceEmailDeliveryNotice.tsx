import { FinanceAlert } from "@/components/studio/finance/finance-ui";
import {
  EMAIL_DELIVERY_NOTICE_BODY,
  EMAIL_DELIVERY_NOTICE_TITLE
} from "@/lib/email/email-delivery-copy";

type FinanceEmailDeliveryNoticeProps = {
  className?: string;
};

export function FinanceEmailDeliveryNotice({ className = "" }: FinanceEmailDeliveryNoticeProps) {
  return (
    <div className={className}>
      <FinanceAlert tone="amber">
        <p className="font-semibold">{EMAIL_DELIVERY_NOTICE_TITLE}</p>
        <p className="mt-1">{EMAIL_DELIVERY_NOTICE_BODY}</p>
      </FinanceAlert>
    </div>
  );
}

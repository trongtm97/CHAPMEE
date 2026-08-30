export type EmailType =
  | "auth.verify_email"
  | "auth.reset_password"
  | "auth.login_alert"
  | "system.notice"
  | "payment.coin_topup_success"
  | "payment.withdrawal_notice"
  | "moderation.warning";

export type EmailJobStatus =
  | "pending"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

export type EmailTemplateVariables = {
  "auth.verify_email": {
    displayName: string;
    verifyUrl: string;
  };
  "auth.reset_password": {
    displayName: string;
    resetUrl: string;
  };
  "auth.login_alert": {
    displayName: string;
    ip: string;
    time: string;
    location: string;
  };
  "system.notice": {
    title: string;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
  };
  "payment.coin_topup_success": {
    displayName: string;
    amountVnd: string;
    coinAmount: string;
    transactionCode: string;
  };
  "payment.withdrawal_notice": {
    displayName: string;
    amountVnd: string;
    status: string;
    transactionCode: string;
  };
  "moderation.warning": {
    displayName: string;
    reason: string;
    actionUrl?: string;
  };
};

export type EnqueueEmailInput<T extends EmailType = EmailType> = {
  type: T;
  toEmail: string;
  variables: EmailTemplateVariables[T];
  scheduledAt?: Date;
  maxRetries?: number;
};

export type SendEmailNowInput = {
  toEmail: string;
  subject: string;
  html: string;
  text: string;
};

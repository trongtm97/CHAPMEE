export type MessageActionState = {
  error: string | null;
  warning: string | null;
  ok?: boolean;
  messageId?: string;
};

export const messageActionEmptyState: MessageActionState = {
  error: null,
  warning: null
};

import type { MessagingRestrictionType } from "@/types/messaging-safety";

export type ActiveMessagingRestriction = {
  id: string;
  restrictionType: MessagingRestrictionType;
  reasonCode: string;
  endsAt: string | null;
};

const MUTE_TYPES: MessagingRestrictionType[] = [
  "mute_24h",
  "mute_7d",
  "mute_30d",
  "permanent_messaging_ban"
];

export function hasMuteRestriction(restrictions: ActiveMessagingRestriction[]) {
  return restrictions.some((r) => MUTE_TYPES.includes(r.restrictionType));
}

export function hasLinkBlockOnly(restrictions: ActiveMessagingRestriction[]) {
  return restrictions.some((r) => r.restrictionType === "link_block_only");
}

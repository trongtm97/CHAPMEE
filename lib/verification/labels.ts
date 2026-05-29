import {
  VERIFICATION_TYPE_LABELS,
  type VerificationType
} from "@/types/verification";

export function resolveVerificationLabel(
  type: VerificationType,
  publicLabel?: string | null
) {
  const custom = publicLabel?.trim();
  return custom || VERIFICATION_TYPE_LABELS[type];
}

export {
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_SOURCE_LABELS,
  VERIFICATION_TYPE_LABELS
} from "@/types/verification";

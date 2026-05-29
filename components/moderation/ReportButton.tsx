"use client";

import { ReportModal } from "@/components/moderation/ReportModal";
import type { ReportTargetType } from "@/types/moderation";

type ReportButtonProps = {
  targetId: string;
  targetType: ReportTargetType;
  returnTo: string;
};

export function ReportButton({ targetId, targetType, returnTo }: ReportButtonProps) {
  return (
    <ReportModal returnTo={returnTo} targetId={targetId} targetType={targetType} />
  );
}

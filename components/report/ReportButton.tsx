import { ReportModal } from "@/components/moderation";
import type { ReportTargetType } from "@/lib/reports/createReport";

type ReportButtonProps = {
  targetId: string;
  targetType: ReportTargetType;
  returnTo: string;
};

export function ReportButton(props: ReportButtonProps) {
  return <ReportModal {...props} />;
}

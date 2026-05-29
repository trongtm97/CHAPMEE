"use server";

import { getMessageReportCase } from "@/lib/admin/get-message-report-case";

export async function loadMessageReportCaseAction(
  reportId: string,
  includeMessageContent: boolean
) {
  return getMessageReportCase(reportId, { includeMessageContent });
}

"use client";

import { LoveInsightShell } from "@/components/utilities/love-insight/LoveInsightShell";
import { ResultPageView } from "@/components/utilities/love-insight/result/ResultPageView";
import type { LoveReadingResult } from "@/lib/love-insight/shared";

type LoveResultViewProps = {
  result: LoveReadingResult & { id?: string; shareId?: string };
};

export function LoveResultView({ result }: LoveResultViewProps) {
  return (
    <LoveInsightShell className="-mx-1 rounded-none sm:mx-0 sm:rounded-2xl">
      <ResultPageView adBottom={null} adMiddle={null} adTop={null} result={result} />
    </LoveInsightShell>
  );
}

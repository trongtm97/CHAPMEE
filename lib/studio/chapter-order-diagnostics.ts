export type ChapterOrderDiagnostics = {
  duplicateNumbers: number[];
  missingNumbers: number[];
  hasIssues: boolean;
};

export function diagnoseChapterOrder(episodeNumbers: number[]): ChapterOrderDiagnostics {
  const sorted = [...new Set(episodeNumbers.filter((n) => Number.isInteger(n) && n > 0))].sort(
    (a, b) => a - b
  );

  if (sorted.length === 0) {
    return { duplicateNumbers: [], hasIssues: false, missingNumbers: [] };
  }

  const counts = new Map<number, number>();
  for (const number of episodeNumbers) {
    counts.set(number, (counts.get(number) ?? 0) + 1);
  }

  const duplicateNumbers = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([number]) => number)
    .sort((a, b) => a - b);

  const missingNumbers: number[] = [];
  const max = sorted[sorted.length - 1]!;

  for (let index = 1; index <= max; index += 1) {
    if (!sorted.includes(index)) {
      missingNumbers.push(index);
    }
  }

  return {
    duplicateNumbers,
    hasIssues: duplicateNumbers.length > 0 || missingNumbers.length > 0,
    missingNumbers
  };
}

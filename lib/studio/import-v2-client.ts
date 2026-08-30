type ImportV2Result = {
  error?: string | null;
  created: number;
  updated: number;
  errors: Array<{ rowIndex: number; message: string }>;
};

export async function postImportV2Csv(
  endpoint: "/api/studio/import/chapters-v2" | "/api/studio/import/stories-v2",
  csvText: string
): Promise<ImportV2Result> {
  const response = await fetch(endpoint, {
    body: csvText,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    method: "POST"
  });

  const body = (await response.json().catch(() => null)) as ImportV2Result | null;
  if (!response.ok || !body) {
    return {
      created: 0,
      error: body?.error ?? `Không import được (HTTP ${response.status}).`,
      errors: body?.errors ?? [],
      updated: 0
    };
  }

  return body;
}

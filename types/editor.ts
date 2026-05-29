export type EditorViewMode = "write" | "preview";

export type EditorContentFormat = "plain" | "markdown";

export type EditorStats = {
  wordCount: number;
  characterCount: number;
  readTimeMinutes: number;
};

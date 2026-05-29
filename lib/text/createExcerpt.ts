export function createExcerpt(content: string, minWords = 80, maxWords = 220) {
  const words = content
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (words.length <= maxWords) {
    return words.join(" ");
  }

  const targetLength = Math.max(minWords, Math.min(maxWords, words.length));
  return `${words.slice(0, targetLength).join(" ")}...`;
}

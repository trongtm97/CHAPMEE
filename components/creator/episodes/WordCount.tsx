"use client";

import { countWords } from "@/lib/text/countWords";

type WordCountProps = {
  content: string;
};

export function WordCount({ content }: WordCountProps) {
  const words = countWords(content);

  return (
    <p className="text-sm text-zinc-400">
      {words} từ · {content.trim().length} ký tự
    </p>
  );
}

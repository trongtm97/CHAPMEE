"use client";

import { PresentationReaderShell } from "@/components/presentation/PresentationReaderShell";
import { sanitizeDisplayText } from "@/lib/presentation/sanitize-display-text";
import type { ChatStoryStructuredContent } from "@/types/presentation";

type ChatStoryRendererProps = {
  data: ChatStoryStructuredContent;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function ChatStoryRenderer({ data }: ChatStoryRendererProps) {
  const characterMap = new Map(
    data.characters.map((character) => [character.id, character])
  );

  return (
    <PresentationReaderShell className="space-y-3">
      <div className="space-y-3" role="log" aria-label="Cuộc trò chuyện">
        {data.messages.map((message, index) => {
          if (message.type === "system") {
            return (
              <p
                className="text-center text-xs text-zinc-400"
                key={`system-${index}`}
              >
                {sanitizeDisplayText(message.text)}
              </p>
            );
          }

          const character = characterMap.get(message.character_id);
          const side = character?.side === "right" ? "right" : "left";
          const isRight = side === "right";
          const name = character?.name ?? "???";

          return (
            <div
              className={`flex gap-2 ${isRight ? "flex-row-reverse" : "flex-row"}`}
              key={`msg-${index}`}
            >
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-700/80 text-[0.65rem] font-bold text-zinc-100"
                aria-hidden
              >
                {initials(name)}
              </div>
              <div
                className={`max-w-[min(85%,20rem)] ${isRight ? "items-end" : "items-start"} flex flex-col`}
              >
                <span className="mb-0.5 text-[0.65rem] font-semibold text-zinc-400">
                  {sanitizeDisplayText(name)}
                </span>
                <div
                  className={`rounded-2xl px-3 py-2 text-[0.95em] ${
                    isRight
                      ? "rounded-tr-md bg-cyan-600/35 text-zinc-50"
                      : "rounded-tl-md bg-zinc-800/90 text-zinc-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {sanitizeDisplayText(message.text)}
                  </p>
                </div>
                {message.time ? (
                  <span className="mt-0.5 text-[0.6rem] text-zinc-500">
                    {sanitizeDisplayText(message.time)}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </PresentationReaderShell>
  );
}

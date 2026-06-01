"use client";

import { Button, Input } from "@/components/ui";
import { DEFAULT_CHAT_STORY_TEMPLATE } from "@/lib/presentation/default-templates";
import type { ChatStoryStructuredContent } from "@/types/presentation";
import { useCallback, useMemo } from "react";

type ChatStoryBlockEditorProps = {
  valueJson: string;
  onChange: (json: string) => void;
  disabled?: boolean;
};

function parseOrDefault(json: string): ChatStoryStructuredContent {
  try {
    const parsed = JSON.parse(json) as ChatStoryStructuredContent;
    if (parsed?.messages && Array.isArray(parsed.messages)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_CHAT_STORY_TEMPLATE;
}

export function ChatStoryBlockEditor({
  disabled = false,
  onChange,
  valueJson
}: ChatStoryBlockEditorProps) {
  const data = useMemo(() => parseOrDefault(valueJson), [valueJson]);

  const sync = useCallback(
    (next: ChatStoryStructuredContent) => {
      onChange(JSON.stringify(next, null, 2));
    },
    [onChange]
  );

  const updateCharacter = (
    id: string,
    patch: Partial<ChatStoryStructuredContent["characters"][number]>
  ) => {
    sync({
      ...data,
      characters: data.characters.map((character) =>
        character.id === id ? { ...character, ...patch } : character
      )
    });
  };

  const addCharacter = () => {
    const id = `c${data.characters.length + 1}`;
    sync({
      ...data,
      characters: [
        ...data.characters,
        { id, name: `Nhân vật ${data.characters.length + 1}`, avatar_url: null, side: "left" }
      ]
    });
  };

  const addMessage = (characterId: string) => {
    sync({
      ...data,
      messages: [
        ...data.messages,
        {
          type: "message",
          character_id: characterId,
          text: "",
          time: ""
        }
      ]
    });
  };

  const addSystemMessage = () => {
    sync({
      ...data,
      messages: [...data.messages, { type: "system", text: "" }]
    });
  };

  const updateMessage = (index: number, text: string) => {
    const messages = [...data.messages];
    const current = messages[index];
    if (!current) {
      return;
    }
    if (current.type === "system") {
      messages[index] = { type: "system", text };
    } else {
      messages[index] = { ...current, text };
    }
    sync({ ...data, messages });
  };

  const removeMessage = (index: number) => {
    sync({
      ...data,
      messages: data.messages.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-zinc-950/50 p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-200">Nhân vật</p>
          <Button disabled={disabled} onClick={addCharacter} type="button" variant="secondary">
            + Nhân vật
          </Button>
        </div>
        <div className="space-y-2">
          {data.characters.map((character) => (
            <div
              className="grid gap-2 rounded-lg border border-white/10 p-2 sm:grid-cols-[1fr_6rem_6rem]"
              key={character.id}
            >
              <Input
                disabled={disabled}
                label="Tên"
                onChange={(event) =>
                  updateCharacter(character.id, { name: event.target.value })
                }
                value={character.name}
              />
              <label className="block space-y-1 text-xs">
                <span className="text-zinc-400">Vị trí</span>
                <select
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-2 text-sm"
                  disabled={disabled}
                  onChange={(event) =>
                    updateCharacter(character.id, {
                      side: event.target.value === "right" ? "right" : "left"
                    })
                  }
                  value={character.side}
                >
                  <option value="left">Trái</option>
                  <option value="right">Phải</option>
                </select>
              </label>
              <p className="self-end text-[0.65rem] text-zinc-500">ID: {character.id}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-zinc-200">Tin nhắn</p>
          {data.characters[0] ? (
            <Button
              disabled={disabled}
              onClick={() => addMessage(data.characters[0].id)}
              type="button"
              variant="secondary"
            >
              + Tin nhắn
            </Button>
          ) : null}
          <Button
            disabled={disabled}
            onClick={addSystemMessage}
            type="button"
            variant="secondary"
          >
            + System
          </Button>
        </div>

        <div className="space-y-2">
          {data.messages.map((message, index) => (
            <div
              className="rounded-lg border border-white/10 bg-zinc-900/60 p-2"
              key={index}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[0.65rem] font-semibold uppercase text-zinc-500">
                  {message.type === "system"
                    ? "System"
                    : data.characters.find((c) => c.id === message.character_id)?.name ??
                      message.character_id}
                </span>
                <button
                  className="text-xs text-red-300 hover:text-red-200"
                  disabled={disabled}
                  onClick={() => removeMessage(index)}
                  type="button"
                >
                  Xóa
                </button>
              </div>
              <textarea
                className="min-h-[4rem] w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                disabled={disabled}
                onChange={(event) => updateMessage(index, event.target.value)}
                placeholder="Nội dung tin nhắn..."
                value={message.text}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

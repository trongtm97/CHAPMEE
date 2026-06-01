"use client";

import { CaseFileBlockEditor } from "@/components/studio/presentation/CaseFileBlockEditor";
import { ChatStoryBlockEditor } from "@/components/studio/presentation/ChatStoryBlockEditor";
import { DiaryBlockEditor } from "@/components/studio/presentation/DiaryBlockEditor";
import { MixedMediaBlockEditor } from "@/components/studio/presentation/MixedMediaBlockEditor";
import { ScriptBlockEditor } from "@/components/studio/presentation/ScriptBlockEditor";
import { SocialFeedBlockEditor } from "@/components/studio/presentation/SocialFeedBlockEditor";
import { SystemGameBlockEditor } from "@/components/studio/presentation/SystemGameBlockEditor";
import { PRESENTATION_SCHEMA_HINTS } from "@/lib/presentation/schema-hints";
import type { PresentationMode } from "@/types/presentation";

type StructuredModeEditorProps = {
  mode: PresentationMode;
  valueJson: string;
  onChange: (json: string) => void;
  disabled?: boolean;
};

export function StructuredModeEditor({
  disabled = false,
  mode,
  onChange,
  valueJson
}: StructuredModeEditorProps) {
  const hint = PRESENTATION_SCHEMA_HINTS[mode];

  return (
    <div className="space-y-2">
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
      {mode === "chat_story" ? (
        <ChatStoryBlockEditor disabled={disabled} onChange={onChange} valueJson={valueJson} />
      ) : mode === "social_feed" ? (
        <SocialFeedBlockEditor disabled={disabled} onChange={onChange} valueJson={valueJson} />
      ) : mode === "case_file" ? (
        <CaseFileBlockEditor disabled={disabled} onChange={onChange} valueJson={valueJson} />
      ) : mode === "diary" ? (
        <DiaryBlockEditor disabled={disabled} onChange={onChange} valueJson={valueJson} />
      ) : mode === "system_game" ? (
        <SystemGameBlockEditor disabled={disabled} onChange={onChange} valueJson={valueJson} />
      ) : mode === "script" ? (
        <ScriptBlockEditor disabled={disabled} onChange={onChange} valueJson={valueJson} />
      ) : mode === "mixed_media" ? (
        <MixedMediaBlockEditor disabled={disabled} onChange={onChange} valueJson={valueJson} />
      ) : (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-zinc-300">JSON cấu trúc</label>
          <textarea
            className="min-h-[16rem] w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Dán hoặc chỉnh JSON..."
            spellCheck={false}
            value={valueJson}
          />
        </div>
      )}
    </div>
  );
}

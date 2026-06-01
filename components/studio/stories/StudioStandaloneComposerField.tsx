"use client";

import { useCallback, useMemo, useState } from "react";
import { ChapMeeStudioComposer } from "@/components/composer/ChapMeeStudioComposer";
import { presentationModeToComposerMode } from "@/lib/composer/modes";
import { createEmptyStructuredContent } from "@/lib/composer/serializer";
import { tryParseStoredComposerDocument } from "@/lib/composer/serializer";
import { hasStandaloneContent } from "@/lib/stories/story-structure";
import type { ComposerStructuredContent } from "@/lib/composer/types";
import type { PresentationMode } from "@/types/presentation";

type StudioStandaloneComposerFieldProps = {
  presentationMode: PresentationMode;
  initialStructuredContent?: unknown | null;
  initialPlainText?: string | null;
  disabled?: boolean;
  onChange?: (payload: {
    structuredContent: ComposerStructuredContent;
    plainText: string;
    hasContent: boolean;
  }) => void;
};

export function StudioStandaloneComposerField({
  disabled = false,
  initialPlainText = "",
  initialStructuredContent = null,
  onChange,
  presentationMode
}: StudioStandaloneComposerFieldProps) {
  const composerMode = presentationModeToComposerMode(presentationMode);

  const initialValue = useMemo(() => {
    if (initialStructuredContent) {
      const parsed = tryParseStoredComposerDocument(initialStructuredContent);
      if (parsed.ok) {
        return parsed.data;
      }
    }
    const empty = createEmptyStructuredContent(composerMode);
    if (initialPlainText?.trim()) {
      return empty;
    }
    return empty;
  }, [composerMode, initialPlainText, initialStructuredContent]);

  const [value, setValue] = useState<ComposerStructuredContent>(initialValue);
  const [plainText, setPlainText] = useState(initialPlainText ?? "");

  const handleChange = useCallback(
    (next: ComposerStructuredContent) => {
      setValue(next);
      onChange?.({
        structuredContent: next,
        plainText,
        hasContent: hasStandaloneContent({
          standaloneContentJson: next,
          standalonePlainText: plainText
        })
      });
    },
    [onChange, plainText]
  );

  return (
    <div className="space-y-4">
      <ChapMeeStudioComposer
        fallbackContent={plainText}
        mode={composerMode}
        onChange={handleChange}
        readonly={disabled}
        value={value}
      />
      <input name="standalone_content" type="hidden" value={plainText} />
      <input name="standalone_content_format" type="hidden" value="structured_blocks" />
      <input name="standalone_presentation_mode" type="hidden" value={presentationMode} />
      <input
        name="standalone_structured_content_json"
        type="hidden"
        value={JSON.stringify(value)}
      />
    </div>
  );
}

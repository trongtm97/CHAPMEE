"use client";

import {
  contentToEditorHtml,
  serializeEditorHtml
} from "@/lib/content-posts/content-post-editor-html";
import { TiptapRichTextEditor } from "@/components/editor/tiptap/TiptapRichTextEditor";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  name?: string;
  placeholder?: string;
  minHeightClass?: string;
};

const visualSurfaceClass =
  "story-description-body w-full max-h-[60vh] overflow-y-auto rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm leading-7 text-zinc-100 outline-none focus-within:ring-2 focus-within:ring-cyan-400/40 [&_.ProseMirror]:min-h-[inherit] [&_.ProseMirror]:outline-none [&_a]:text-cyan-400 [&_a]:underline [&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-600 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_table]:my-3 [&_table]:w-full [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-white/10 [&_th]:bg-white/5 [&_th]:px-2 [&_th]:py-1.5 [&_ul]:list-disc [&_ul]:pl-5";

export function StoryDescriptionEditor({
  value,
  onChange,
  disabled,
  label,
  name,
  placeholder = "Bối cảnh, nhân vật, điểm nổi bật…",
  minHeightClass = "min-h-[200px]"
}: Props) {
  return (
    <TiptapRichTextEditor
      disabled={disabled}
      htmlToValue={serializeEditorHtml}
      label={label}
      minHeightClass={minHeightClass}
      name={name}
      onChange={onChange}
      placeholder={placeholder}
      profile="story"
      surfaceClass={visualSurfaceClass}
      value={value}
      valueToHtml={contentToEditorHtml}
    />
  );
}

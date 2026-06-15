"use client";

import { forwardRef } from "react";
import { TiptapRichTextEditor, type TiptapEditorHandle } from "@/components/editor/tiptap/TiptapRichTextEditor";
import {
  chapterPlainToEditorHtml,
  editorHtmlToChapterPlain
} from "@/lib/editor/chapter-prose-html";

export type EditorCanvasHandle = TiptapEditorHandle;

type ChapterWysiwygCanvasProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

const visualSurfaceClass =
  "chapter-wysiwyg-body min-h-[min(70vh,42rem)] max-h-[75vh] overflow-y-auto w-full resize-y bg-transparent px-4 py-4 text-base leading-8 text-zinc-100 outline-none disabled:opacity-60 sm:px-5 sm:py-5 [&_.ProseMirror]:min-h-[inherit] [&_.ProseMirror]:outline-none [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-400/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_em]:italic [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-bold [&_p]:my-2 [&_strong]:font-bold [&_u]:underline";

export const ChapterWysiwygCanvas = forwardRef<EditorCanvasHandle, ChapterWysiwygCanvasProps>(
  function ChapterWysiwygCanvas(
    { disabled, onChange, placeholder = "Viết nội dung chương tại đây...", value },
    ref
  ) {
    return (
      <TiptapRichTextEditor
        disabled={disabled}
        htmlToValue={editorHtmlToChapterPlain}
        onChange={onChange}
        placeholder={placeholder}
        profile="chapter"
        ref={ref}
        surfaceClass={visualSurfaceClass}
        value={value}
        valueToHtml={chapterPlainToEditorHtml}
      />
    );
  }
);

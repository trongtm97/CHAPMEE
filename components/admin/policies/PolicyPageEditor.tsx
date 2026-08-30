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
};

const visualSurfaceClass =
  "policy-page-body min-h-[480px] max-h-[75vh] overflow-y-auto w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none focus-within:ring-2 focus-within:ring-cyan-400/40 [&_.ProseMirror]:min-h-[inherit] [&_.ProseMirror]:outline-none [&_a]:text-cyan-400 [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-600 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mb-3 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:mt-3 [&_h4]:text-base [&_h4]:font-semibold [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-white/10 [&_th]:bg-white/5 [&_th]:px-3 [&_th]:py-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5";

export function PolicyPageEditor({ value, onChange, disabled }: Props) {
  return (
    <TiptapRichTextEditor
      disabled={disabled}
      htmlToValue={serializeEditorHtml}
      onChange={onChange}
      placeholder="Viết nội dung trang (tiêu đề, đoạn, danh sách, bảng…)…"
      profile="content-post"
      surfaceClass={visualSurfaceClass}
      toolbarHint="Trực quan · HTML · nội dung cũ dạng Markdown vẫn hiển thị đúng khi mở"
      value={value}
      valueToHtml={contentToEditorHtml}
    />
  );
}

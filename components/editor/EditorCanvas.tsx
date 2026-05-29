"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export type EditorCanvasHandle = {
  focus: () => void;
  getTextarea: () => HTMLTextAreaElement | null;
};

type EditorCanvasProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(
  function EditorCanvas(
    { disabled, onChange, placeholder = "Viết nội dung chương tại đây...", value },
    ref
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      getTextarea: () => textareaRef.current
    }));

    return (
      <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/50">
        <label className="sr-only" htmlFor="chapter-content">
          Nội dung chương
        </label>
        <textarea
          className="min-h-[min(70vh,42rem)] w-full resize-y bg-transparent px-4 py-4 text-base leading-8 text-zinc-100 outline-none placeholder:text-zinc-600 disabled:opacity-60 sm:px-5 sm:py-5"
          disabled={disabled}
          id="chapter-content"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          ref={textareaRef}
          spellCheck
          value={value}
        />
      </div>
    );
  }
);

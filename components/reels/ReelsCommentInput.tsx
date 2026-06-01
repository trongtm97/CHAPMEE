"use client";

type ReelsCommentInputProps = {
  disabled?: boolean;
  onSubmit: (content: string) => void;
  placeholder: string;
  submitLabel?: string;
};

export function ReelsCommentInput({
  disabled = false,
  onSubmit,
  placeholder,
  submitLabel = "Gửi"
}: ReelsCommentInputProps) {
  return (
    <form
      className="flex items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const input = form.elements.namedItem("content");

        if (!(input instanceof HTMLTextAreaElement)) {
          return;
        }

        const value = input.value.trim();

        if (!value) {
          return;
        }

        onSubmit(value);
        form.reset();
      }}
    >
      <textarea
        className="min-h-[3.25rem] max-h-32 flex-1 resize-none rounded-[1.35rem] bg-[#eef2f7] px-4 py-3 text-[0.95rem] leading-6 text-[#111827] outline-none placeholder:text-[#6b7280]"
        disabled={disabled}
        maxLength={500}
        name="content"
        placeholder={placeholder}
      />
      <button
        className="tap-highlight inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#111827] px-4 text-sm font-semibold text-white disabled:opacity-60"
        disabled={disabled}
        type="submit"
      >
        {submitLabel}
      </button>
    </form>
  );
}

type ModerationNoteFormProps = {
  name?: string;
  placeholder?: string;
};

export function ModerationNoteForm({
  name = "moderation_note",
  placeholder = "Internal note cho moderation case."
}: ModerationNoteFormProps) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-zinc-200">
        Internal note
      </span>
      <textarea
        className="min-h-20 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300"
        maxLength={1000}
        name={name}
        placeholder={placeholder}
      />
    </label>
  );
}

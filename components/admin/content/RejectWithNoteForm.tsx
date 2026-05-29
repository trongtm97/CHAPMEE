import { RejectButton } from "@/components/admin/content/RejectButton";

type RejectWithNoteFormProps = {
  action: (formData: FormData) => Promise<void>;
  idFieldName: string;
  idValue: string;
};

export function RejectWithNoteForm({
  action,
  idFieldName,
  idValue
}: RejectWithNoteFormProps) {
  return (
    <form action={action} className="space-y-3">
      <input name={idFieldName} type="hidden" value={idValue} />
      <label className="space-y-2">
        <span className="block text-sm font-medium text-zinc-200">
          Lý do reject / internal note
        </span>
        <textarea
          className="min-h-28 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300"
          maxLength={1000}
          name="moderation_note"
          placeholder="Ghi lý do ngắn gọn để creator/admin khác hiểu quyết định này."
        />
      </label>
      <RejectButton />
    </form>
  );
}

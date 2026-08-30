"use client";

type ExternalAudioFormProps = {
  url: string;
  onUrlChange: (value: string) => void;
  onValidate?: () => void;
  validationMessage?: string | null;
  validationOk?: boolean | null;
};

export function ExternalAudioForm({
  url,
  onUrlChange,
  onValidate,
  validationMessage,
  validationOk
}: ExternalAudioFormProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-200">
        Link audio ngoài
        <input
          type="url"
          name="external_audio_url"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://example.com/audio/part-1.mp3"
          className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
          required
        />
      </label>
      {onValidate ? (
        <button
          type="button"
          onClick={onValidate}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
        >
          Kiểm tra link
        </button>
      ) : null}
      {validationMessage ? (
        <p className={`text-xs ${validationOk ? "text-emerald-300" : "text-rose-300"}`}>
          {validationMessage}
        </p>
      ) : null}
      <p className="text-xs text-zinc-500">
        External audio có thể được phát liên tục theo thứ tự Phần audio (nếu trình duyệt hỗ trợ
        nghe nền).
      </p>
    </div>
  );
}

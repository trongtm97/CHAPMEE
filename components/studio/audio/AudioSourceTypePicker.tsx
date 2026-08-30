"use client";

export type StudioAudioSourceType = "external_audio_url" | "youtube_embed";

type AudioSourceTypePickerProps = {
  value: StudioAudioSourceType;
  onChange: (value: StudioAudioSourceType) => void;
  externalEnabled: boolean;
  youtubeEnabled: boolean;
  externalDisabledReason?: string | null;
  youtubeDisabledReason?: string | null;
};

export function AudioSourceTypePicker({
  value,
  onChange,
  externalEnabled,
  youtubeEnabled,
  externalDisabledReason,
  youtubeDisabledReason
}: AudioSourceTypePickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-200">Nguồn audio</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={!externalEnabled}
          onClick={() => onChange("external_audio_url")}
          className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
            value === "external_audio_url"
              ? "border-cyan-400/60 bg-cyan-400/10 text-white"
              : "border-white/10 bg-white/[0.02] text-zinc-300 hover:bg-white/[0.05]"
          } ${!externalEnabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <span className="font-semibold">Link audio ngoài</span>
          <p className="mt-1 text-xs text-zinc-400">MP3/M4A và link trực tiếp được phép.</p>
        </button>
        <button
          type="button"
          disabled={!youtubeEnabled}
          onClick={() => onChange("youtube_embed")}
          className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
            value === "youtube_embed"
              ? "border-cyan-400/60 bg-cyan-400/10 text-white"
              : "border-white/10 bg-white/[0.02] text-zinc-300 hover:bg-white/[0.05]"
          } ${!youtubeEnabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <span className="font-semibold">YouTube của tôi</span>
          <p className="mt-1 text-xs text-zinc-400">Chỉ nhúng iframe chính thức.</p>
        </button>
      </div>
      {!externalEnabled && externalDisabledReason ? (
        <p className="text-xs text-amber-200">{externalDisabledReason}</p>
      ) : null}
      {!youtubeEnabled && youtubeDisabledReason ? (
        <p className="text-xs text-amber-200">{youtubeDisabledReason}</p>
      ) : null}
    </div>
  );
}

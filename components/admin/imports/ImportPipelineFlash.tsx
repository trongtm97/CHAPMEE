type ImportPipelineFlashProps = {
  success?: string | null;
  error?: string | null;
  info?: string | null;
};

export function ImportPipelineFlash({ success, error, info }: ImportPipelineFlashProps) {
  if (!success && !error && !info) {
    return null;
  }

  return (
    <div className="space-y-2">
      {success ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {success}
        </p>
      ) : null}
      {info ? (
        <p className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
          {info}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}

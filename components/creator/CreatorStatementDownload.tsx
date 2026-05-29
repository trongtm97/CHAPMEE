type CreatorStatementDownloadProps = {
  creatorUserId: string;
};

export function CreatorStatementDownload({
  creatorUserId
}: CreatorStatementDownloadProps) {
  const href = `/api/creator/finance/statement?creatorUserId=${encodeURIComponent(
    creatorUserId
  )}`;

  return (
    <a
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-100"
      href={href}
    >
      Tải báo cáo doanh thu
    </a>
  );
}

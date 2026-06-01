type PresentationFallbackNoticeProps = {
  message?: string;
};

export function PresentationFallbackNotice({
  message = "Không đọc được định dạng cấu trúc — hiển thị bản văn xuôi."
}: PresentationFallbackNoticeProps) {
  return (
    <p
      className="mb-4 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90"
      role="status"
    >
      {message}
    </p>
  );
}

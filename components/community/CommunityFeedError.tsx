type CommunityFeedErrorProps = {
  message?: string;
  onRetry: () => void;
};

export function CommunityFeedError({
  message = "Không tải được bài viết.",
  onRetry
}: CommunityFeedErrorProps) {
  return (
    <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-center">
      <p className="text-xs text-red-200">{message}</p>
      <button
        className="tap-highlight mt-2 text-xs font-bold text-cyan-300 hover:text-cyan-200"
        onClick={onRetry}
        type="button"
      >
        Thử lại
      </button>
    </div>
  );
}

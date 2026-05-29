import Link from "next/link";

type CommunityFeedEndProps = {
  onWriteClick?: () => void;
};

export function CommunityFeedEnd({ onWriteClick }: CommunityFeedEndProps) {
  return (
    <div className="py-4 text-center">
      <p className="text-xs text-zinc-500">Bạn đã xem hết bài hiện có.</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {onWriteClick ? (
          <button
            className="text-xs font-bold text-cyan-300 hover:text-cyan-200"
            onClick={onWriteClick}
            type="button"
          >
            Tạo bài mới
          </button>
        ) : (
          <Link
            className="text-xs font-bold text-cyan-300 hover:text-cyan-200"
            href="/community/new?type=discussion"
          >
            Tạo bài mới
          </Link>
        )}
        <span className="text-zinc-600">·</span>
        <Link
          className="text-xs font-bold text-zinc-400 hover:text-zinc-200"
          href="/community/groups"
        >
          Khám phá nhóm truyện
        </Link>
      </div>
    </div>
  );
}

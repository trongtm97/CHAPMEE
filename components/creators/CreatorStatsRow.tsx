import { formatReelsCount } from "@/lib/reels/formatCount";

type CreatorStatsRowProps = {
  followerCount: number;
  followingCount: number;
  storiesCount: number;
  totalLikes: number;
};

export function CreatorStatsRow({
  followerCount,
  followingCount,
  storiesCount,
  totalLikes
}: CreatorStatsRowProps) {
  const stats = [
    { label: "Followers", value: followerCount },
    { label: "Following", value: followingCount },
    { label: "Truyện", value: storiesCount },
    { label: "Lượt thích", value: totalLikes }
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat) => (
        <div
          className="rounded-[1.15rem] border border-white/10 bg-white/[0.045] px-2 py-3 text-center"
          key={stat.label}
        >
          <p className="text-[1.02rem] font-black text-white">
            {formatReelsCount(stat.value)}
          </p>
          <p className="mt-1 text-[0.68rem] font-medium text-zinc-400">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

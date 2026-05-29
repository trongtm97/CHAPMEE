import { FanClubCard } from "@/components/fanclub/FanClubCard";
import type { FanClubMembership, FanClubPlan } from "@/types/fan-club";
import type { TopFanHighlight, TopFanPerson } from "@/types/fan";
import type { SupporterRankingItem } from "@/types/tip";

type TopFanItem = TopFanPerson | TopFanHighlight;

type StoryFanTabProps = {
  topFans: TopFanItem[];
  supporters: SupporterRankingItem[];
  earlyFanCount: number;
  isEarlyFan: boolean;
  storyTitle: string;
  fanClubEnabled: boolean;
  fanClubPlans: FanClubPlan[];
  fanClubMembership: FanClubMembership | null;
};

function isPersonItem(item: TopFanItem): item is TopFanPerson {
  return "displayName" in item;
}

export function StoryFanTab({
  earlyFanCount,
  fanClubEnabled,
  fanClubMembership,
  fanClubPlans,
  isEarlyFan,
  storyTitle,
  supporters,
  topFans
}: StoryFanTabProps) {
  return (
    <div className="space-y-5">
      {isEarlyFan || earlyFanCount > 0 ? (
        <section className="space-y-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-3.5">
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">Fan đời đầu</p>
          {isEarlyFan ? (
            <p className="text-sm text-cyan-50">
              Bạn là fan đời đầu của <span className="font-bold">{storyTitle}</span>.
            </p>
          ) : (
            <p className="text-sm text-zinc-400">
              {earlyFanCount} độc giả phát hiện truyện từ sớm.
            </p>
          )}
        </section>
      ) : null}

      {topFans.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-black text-white">Fan nổi bật</h3>
          <ul className="space-y-2">
            {topFans.slice(0, 5).map((item, index) =>
              isPersonItem(item) ? (
                <li
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5"
                  key={item.id}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-500">#{item.rank}</span>
                    <span className="text-sm font-semibold text-zinc-100">
                      {item.displayName}
                    </span>
                    {item.isCurrentUser ? (
                      <span className="rounded-full bg-cyan-300/15 px-2 py-0.5 text-[0.65rem] font-bold text-cyan-100">
                        Bạn
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-zinc-500">{item.score} điểm</span>
                </li>
              ) : (
                <li
                  className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-300"
                  key={item.id}
                >
                  {item.title}
                </li>
              )
            )}
          </ul>
        </section>
      ) : null}

      {supporters.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-black text-white">Người ủng hộ</h3>
          <ul className="space-y-2">
            {supporters.map((item, index) => (
              <li
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5"
                key={`${item.user_id}-${index}`}
              >
                <div>
                  <p className="text-sm font-semibold text-white">{item.display_name}</p>
                  <p className="text-xs text-zinc-500">{item.tip_count} lượt ủng hộ</p>
                </div>
                <p className="text-sm font-bold text-cyan-200">{item.total_coin} coin</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {fanClubEnabled && fanClubPlans.length > 0 ? (
        <FanClubCard
          enabled={fanClubEnabled}
          membership={fanClubMembership}
          plans={fanClubPlans}
        />
      ) : null}
    </div>
  );
}

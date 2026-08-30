import { TopFanBadge } from "@/components/fans/TopFanBadge";
import type { TopFanPerson } from "@/types/fan";

type ProfileTopFansProps = {
  items: TopFanPerson[];
};

export function ProfileTopFans({ items }: ProfileTopFansProps) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-bold text-white">Top Fan</h2>
        <p className="mt-1 text-sm text-zinc-400">Người đọc ủng hộ tích cực nhất.</p>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <TopFanBadge item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}

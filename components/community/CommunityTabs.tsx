const tabs = ["Thảo luận", "Review", "Thử thách", "Bình chọn"];

export function CommunityTabs() {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => (
          <span
            className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-bold text-zinc-300"
            key={tab}
          >
            {tab}
          </span>
        ))}
      </div>
    </div>
  );
}

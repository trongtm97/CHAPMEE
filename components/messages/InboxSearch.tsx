"use client";

type InboxSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function InboxSearch({ value, onChange }: InboxSearchProps) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
      <input
        aria-label="Tìm hội thoại"
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400/35 focus:outline-none focus:ring-1 focus:ring-cyan-400/15"
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tìm tên hoặc @username"
        type="search"
        value={value}
      />
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3-3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function filterInboxItems<T extends {
  otherUser: { displayName: string; username: string | null };
  lastMessagePreview: string | null;
}>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const name = item.otherUser.displayName.toLowerCase();
    const username = item.otherUser.username?.toLowerCase() ?? "";
    const preview = item.lastMessagePreview?.toLowerCase() ?? "";
    return name.includes(q) || username.includes(q) || preview.includes(q);
  });
}

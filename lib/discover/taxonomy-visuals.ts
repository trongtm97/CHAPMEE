/** Visual tokens for discover taxonomy cards — no images required. */
export type TaxonomyVisual = {
  emoji: string;
  gradient: string;
  ring: string;
};

const SECTION_DEFAULTS: Record<string, TaxonomyVisual> = {
  genres: {
    emoji: "📚",
    gradient: "from-cyan-500/30 via-cyan-900/20 to-[#0a1018]",
    ring: "group-hover:border-cyan-300/40"
  },
  experiences: {
    emoji: "✨",
    gradient: "from-violet-500/28 via-fuchsia-900/15 to-[#0a1018]",
    ring: "group-hover:border-violet-300/40"
  },
  settings: {
    emoji: "🏯",
    gradient: "from-amber-500/25 via-orange-900/15 to-[#0a1018]",
    ring: "group-hover:border-amber-300/40"
  },
  presentations: {
    emoji: "📱",
    gradient: "from-emerald-500/25 via-teal-900/15 to-[#0a1018]",
    ring: "group-hover:border-emerald-300/40"
  }
};

const SLUG_VISUALS: Record<string, Partial<TaxonomyVisual>> = {
  "ngon-tinh": { emoji: "💕", gradient: "from-rose-500/35 via-pink-900/25 to-[#120810]" },
  "dam-my": { emoji: "🌈", gradient: "from-sky-500/30 via-indigo-900/20 to-[#0a1020]" },
  "bach-hop": { emoji: "🌸", gradient: "from-pink-500/30 via-rose-900/20 to-[#140a10]" },
  "xuyen-khong": { emoji: "🌀", gradient: "from-violet-500/32 via-purple-900/22 to-[#100818]" },
  "trong-sinh": { emoji: "♻️", gradient: "from-lime-500/25 via-emerald-900/18 to-[#081210]" },
  "tien-hiep": { emoji: "⚔️", gradient: "from-slate-400/25 via-slate-900/30 to-[#0a0e14]" },
  "kiem-hiep": { emoji: "🗡️", gradient: "from-zinc-400/22 via-zinc-900/28 to-[#0a0c10]" },
  "huyen-huyen": { emoji: "🔮", gradient: "from-indigo-500/30 via-violet-900/22 to-[#0c0818]" },
  "tu-tien": { emoji: "☁️", gradient: "from-cyan-400/28 via-blue-900/22 to-[#081018]" },
  "khoa-hoc-vien-tuong": { emoji: "🚀", gradient: "from-blue-500/28 via-slate-900/25 to-[#080c14]" },
  "do-thi": { emoji: "🏙️", gradient: "from-zinc-500/22 via-zinc-900/25 to-[#0a0a0c]" },
  fanfiction: { emoji: "📖", gradient: "from-amber-400/28 via-orange-900/18 to-[#100c08]" },
  "hai-huoc": { emoji: "😄", gradient: "from-yellow-400/25 via-amber-900/15 to-[#100e08]" },
  "kinh-di": { emoji: "👻", gradient: "from-stone-600/30 via-black/40 to-[#050505]" },
  "trinh-tham": { emoji: "🔍", gradient: "from-neutral-500/25 via-stone-900/30 to-[#0a0908]" },
  "co-dai": { emoji: "🏮", gradient: "from-red-500/28 via-rose-950/25 to-[#140808]" },
  "vong-du": { emoji: "🎮", gradient: "from-green-500/28 via-emerald-900/20 to-[#081210]" },
  "game-he-thong": { emoji: "🧩", gradient: "from-teal-500/28 via-cyan-900/20 to-[#081018]" },
  "kich-tinh": { emoji: "⚡", gradient: "from-orange-500/30 via-red-900/20 to-[#140808]" },
  "chua-lanh": { emoji: "🌿", gradient: "from-emerald-400/25 via-green-900/18 to-[#081210]" },
  "hoi-hop": { emoji: "💓", gradient: "from-red-400/25 via-rose-900/20 to-[#120808]" },
  "cung-dinh": { emoji: "👑", gradient: "from-yellow-500/28 via-amber-950/22 to-[#100c06]" },
  "hao-mon": { emoji: "💎", gradient: "from-amber-300/22 via-yellow-900/18 to-[#100e06]" },
  "chat-story": { emoji: "💬", gradient: "from-sky-500/25 via-blue-900/18 to-[#081018]" }
};

function hashSlug(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const FALLBACK_EMOJIS = ["📘", "🌟", "🎭", "🌙", "🔥", "💫", "🎯", "🪄", "🎪", "🧭"];

export function getTaxonomyVisual(sectionKey: string, slug: string): TaxonomyVisual {
  const base = SECTION_DEFAULTS[sectionKey] ?? SECTION_DEFAULTS.genres;
  const override = SLUG_VISUALS[slug];
  if (override) {
    return { ...base, ...override };
  }
  const emoji = FALLBACK_EMOJIS[hashSlug(slug) % FALLBACK_EMOJIS.length];
  return { ...base, emoji };
}

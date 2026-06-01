const FAVORITES_KEY = "chapmee-studio-template-favorites";
const RECENT_KEY = "chapmee-studio-template-recent";
const USAGE_KEY = "chapmee-studio-template-usage";

export type TemplateRecentEntry = {
  templateId: string;
  usedAt: string;
  action: "use" | "view";
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

export function getTemplateFavoriteIds(): string[] {
  return readJson<string[]>(FAVORITES_KEY, []);
}

export function isTemplateFavorite(templateId: string) {
  return getTemplateFavoriteIds().includes(templateId);
}

export function toggleTemplateFavorite(templateId: string) {
  const current = getTemplateFavoriteIds();
  const next = current.includes(templateId)
    ? current.filter((id) => id !== templateId)
    : [...current, templateId];

  writeJson(FAVORITES_KEY, next);

  return next.includes(templateId);
}

export function getTemplateRecent(): TemplateRecentEntry[] {
  return readJson<TemplateRecentEntry[]>(RECENT_KEY, []);
}

export function pushTemplateRecent(
  templateId: string,
  action: TemplateRecentEntry["action"]
) {
  const current = getTemplateRecent().filter((entry) => entry.templateId !== templateId);
  const next: TemplateRecentEntry[] = [
    { action, templateId, usedAt: new Date().toISOString() },
    ...current
  ].slice(0, 20);

  writeJson(RECENT_KEY, next);
}

export function getTemplateUsageCounts(): Record<string, number> {
  return readJson<Record<string, number>>(USAGE_KEY, {});
}

export function incrementTemplateUsage(templateId: string) {
  const counts = getTemplateUsageCounts();
  counts[templateId] = (counts[templateId] ?? 0) + 1;
  writeJson(USAGE_KEY, counts);
}

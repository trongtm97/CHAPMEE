export type MediaTabId = "audio" | "video";

export function parseMediaTab(value: string | undefined): MediaTabId {
  return value === "video" ? "video" : "audio";
}

export function mediaTabHref(tab: MediaTabId, params?: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  search.set("tab", tab);
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val != null && val !== "") {
        search.set(key, val);
      }
    }
  }
  const qs = search.toString();
  return qs ? `/media?${qs}` : "/media";
}

export function readSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

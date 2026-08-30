type InstalledRelatedApp = {
  id?: string;
  platform?: string;
  url?: string;
};

declare global {
  interface Window {
    __chapmeeRequestInstalledRelatedApps?: () => Promise<InstalledRelatedApp[]>;
  }
}

/** Call only from an explicit user action (e.g. button click) when a feature needs related apps. */
export async function requestInstalledRelatedApps(): Promise<InstalledRelatedApp[]> {
  if (typeof window === "undefined") {
    return [];
  }

  const request = window.__chapmeeRequestInstalledRelatedApps;
  if (typeof request !== "function") {
    return [];
  }

  return request();
}

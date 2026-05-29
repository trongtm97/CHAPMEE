"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { STORAGE_KEYS } from "@/lib/brand/storage";
import { readSessionCache, writeSessionCache } from "@/lib/client/session-cache";
import type { PersonalActivityItem } from "@/types/me-page";

const ACTIVITIES_CACHE_KEY = STORAGE_KEYS.meActivities;
const ACTIVITIES_CACHE_KEY_LEGACY = "chapchap:me-activities";
const ACTIVITIES_CACHE_TTL_MS = 90_000;

type MeActivitiesContextValue = {
  activities: PersonalActivityItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const MeActivitiesContext = createContext<MeActivitiesContextValue | null>(null);

export function useMeActivities() {
  const context = useContext(MeActivitiesContext);
  if (!context) {
    throw new Error("useMeActivities must be used within MeActivitiesProvider");
  }
  return context;
}

export function MeActivitiesProvider({ children }: { children: React.ReactNode }) {
  const initialCache = readSessionCache<PersonalActivityItem[]>(
    ACTIVITIES_CACHE_KEY,
    ACTIVITIES_CACHE_TTL_MS,
    ACTIVITIES_CACHE_KEY_LEGACY
  );
  const [activities, setActivities] = useState<PersonalActivityItem[]>(initialCache ?? []);
  const [loading, setLoading] = useState(initialCache === null);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const hasCachedDataRef = useRef(initialCache !== null && initialCache.length > 0);

  const refresh = useCallback(async () => {
    const fetchId = fetchIdRef.current + 1;
    fetchIdRef.current = fetchId;

    if (!hasCachedDataRef.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch("/api/me/activities", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Không tải được hoạt động.");
      }

      const payload = (await response.json()) as {
        activities?: PersonalActivityItem[];
        error?: string;
      };

      if (fetchId !== fetchIdRef.current) {
        return;
      }

      if (payload.error) {
        throw new Error(payload.error);
      }

      const next = payload.activities ?? [];
      writeSessionCache(ACTIVITIES_CACHE_KEY, next, ACTIVITIES_CACHE_KEY_LEGACY);
      hasCachedDataRef.current = next.length > 0;
      setActivities(next);
    } catch (fetchError) {
      if (fetchId !== fetchIdRef.current) {
        return;
      }

      setError(
        fetchError instanceof Error ? fetchError.message : "Không tải được hoạt động."
      );
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ activities, loading, error, refresh }),
    [activities, error, loading, refresh]
  );

  return (
    <MeActivitiesContext.Provider value={value}>{children}</MeActivitiesContext.Provider>
  );
}

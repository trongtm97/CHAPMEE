"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  DEFAULT_READING_PREFERENCES,
  loadReadingPreferences,
  saveReadingPreferences,
  type ReadingPreferences
} from "@/lib/reader/reading-preferences";

type ReaderPreferencesContextValue = {
  preferences: ReadingPreferences;
  setPreferences: (next: Partial<ReadingPreferences>) => void;
  ready: boolean;
};

const ReaderPreferencesContext = createContext<ReaderPreferencesContextValue | null>(
  null
);

export function ReaderPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferencesState] = useState<ReadingPreferences>(
    DEFAULT_READING_PREFERENCES
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPreferencesState(loadReadingPreferences());
    setReady(true);
  }, []);

  const setPreferences = useCallback((next: Partial<ReadingPreferences>) => {
    setPreferencesState((current) => {
      const merged = { ...current, ...next };
      saveReadingPreferences(merged);
      return merged;
    });
  }, []);

  const value = useMemo(
    () => ({ preferences, setPreferences, ready }),
    [preferences, ready, setPreferences]
  );

  const surfaceClass =
    preferences.theme === "light"
      ? "reader-theme-light"
      : preferences.theme === "paper"
        ? "reader-theme-paper"
        : "reader-theme-dark";

  return (
    <ReaderPreferencesContext.Provider value={value}>
      <div className={surfaceClass}>{children}</div>
    </ReaderPreferencesContext.Provider>
  );
}

export function useReaderPreferences() {
  const context = useContext(ReaderPreferencesContext);
  if (!context) {
    throw new Error("useReaderPreferences must be used within ReaderPreferencesProvider");
  }
  return context;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode
} from "react";

type AdSlotBudgetContextValue = {
  tryConsumeSlot: (placementKey: string, maxPerPage: number) => boolean;
};

const AdSlotBudgetContext = createContext<AdSlotBudgetContextValue | null>(null);

export function AdSlotBudgetProvider({ children }: { children: ReactNode }) {
  const renderedRef = useRef<Set<string>>(new Set());
  const countRef = useRef(0);

  const tryConsumeSlot = useCallback((placementKey: string, maxPerPage: number) => {
    if (renderedRef.current.has(placementKey)) {
      return true;
    }
    if (countRef.current >= maxPerPage) {
      return false;
    }
    renderedRef.current.add(placementKey);
    countRef.current += 1;
    return true;
  }, []);

  const value = useMemo(() => ({ tryConsumeSlot }), [tryConsumeSlot]);

  return (
    <AdSlotBudgetContext.Provider value={value}>{children}</AdSlotBudgetContext.Provider>
  );
}

export function useAdSlotBudget() {
  return useContext(AdSlotBudgetContext);
}

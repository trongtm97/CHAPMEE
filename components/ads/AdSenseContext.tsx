"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";

type AdSenseContextValue = {
  /** Register a production AdSense slot; returns unregister. */
  registerProductionSlot: (clientId: string) => () => void;
  activeClientId: string | null;
  activeSlotCount: number;
  scriptReady: boolean;
  setScriptReady: (ready: boolean) => void;
};

const AdSenseContext = createContext<AdSenseContextValue | null>(null);

export function AdSenseProvider({ children }: { children: ReactNode }) {
  const [registrations, setRegistrations] = useState(0);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const registerProductionSlot = useCallback((clientId: string) => {
    const normalized = clientId.trim();
    if (!normalized) {
      return () => undefined;
    }

    setRegistrations((count) => count + 1);
    setActiveClientId((current) => current ?? normalized);

    return () => {
      setRegistrations((count) => {
        const next = Math.max(0, count - 1);
        if (next === 0) {
          setActiveClientId(null);
        }
        return next;
      });
    };
  }, []);

  const value = useMemo(
    () => ({
      registerProductionSlot,
      activeClientId,
      activeSlotCount: registrations,
      scriptReady,
      setScriptReady
    }),
    [registerProductionSlot, activeClientId, registrations, scriptReady]
  );

  return <AdSenseContext.Provider value={value}>{children}</AdSenseContext.Provider>;
}

export function useAdSenseContext(): AdSenseContextValue {
  const ctx = useContext(AdSenseContext);
  if (!ctx) {
    return {
      registerProductionSlot: () => () => undefined,
      activeClientId: null,
      activeSlotCount: 0,
      scriptReady: false,
      setScriptReady: () => undefined
    };
  }
  return ctx;
}

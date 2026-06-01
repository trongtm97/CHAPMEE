"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

export function isAbortError(error: unknown) {
  return (
    error instanceof DOMException && error.name === "AbortError"
  ) || (error instanceof Error && error.name === "AbortError");
}

export function useLatestRequestGuard() {
  const latestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      latestIdRef.current += 1;
    };
  }, []);

  const nextRequestId = useCallback(() => {
    latestIdRef.current += 1;
    return latestIdRef.current;
  }, []);

  const onlyLatest = useCallback((requestId: number) => {
    return mountedRef.current && latestIdRef.current === requestId;
  }, []);

  const cancelPending = useCallback(() => {
    latestIdRef.current += 1;
  }, []);

  return useMemo(
    () => ({ cancelPending, nextRequestId, onlyLatest }),
    [cancelPending, nextRequestId, onlyLatest]
  );
}

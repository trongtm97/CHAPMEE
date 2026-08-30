"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode, useEffect } from "react";

const CHUNK_RELOAD_KEY = "chapmee-chunk-reload";

function LayoutFallback() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải giao diện"
      className="min-h-dvh bg-[#0b1016]"
    />
  );
}

const AppShell = dynamic(
  () => import("@/components/layout/AppShell").then((mod) => mod.AppShell),
  { loading: LayoutFallback }
);

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "ChunkLoadError" ||
    /Loading chunk|ChunkLoadError|failed to fetch dynamically imported module/i.test(
      error.message
    )
  );
}

function tryReloadOnce() {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
}

class ChunkLoadRecovery extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(error: Error) {
    if (!isChunkLoadError(error)) {
      throw error;
    }
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      tryReloadOnce();
    }
  }

  render() {
    if (this.state.failed) {
      return <LayoutFallback />;
    }
    return this.props.children;
  }
}

type AppShellRootProps = Readonly<{
  children: React.ReactNode;
  footer: React.ReactNode;
  feedback?: React.ReactNode;
}>;

export function AppShellRoot({ children, footer, feedback }: AppShellRootProps) {
  useEffect(() => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);

    function onUnhandled(event: PromiseRejectionEvent) {
      if (!isChunkLoadError(event.reason)) return;
      event.preventDefault();
      tryReloadOnce();
    }

    window.addEventListener("unhandledrejection", onUnhandled);
    return () => window.removeEventListener("unhandledrejection", onUnhandled);
  }, []);

  return (
    <>
      <ChunkLoadRecovery>
        <AppShell footer={footer}>{children}</AppShell>
      </ChunkLoadRecovery>
      {feedback}
    </>
  );
}

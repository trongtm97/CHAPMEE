"use client";

import type { ReactNode } from "react";
import { MeActivitiesProvider } from "@/components/me/me-activities-context";

type MePageShellProps = {
  children: ReactNode;
};

export function MePageShell({ children }: MePageShellProps) {
  return <MeActivitiesProvider>{children}</MeActivitiesProvider>;
}

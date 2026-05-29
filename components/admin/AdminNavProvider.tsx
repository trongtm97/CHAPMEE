"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ClientPermissionFlags } from "@/types/permissions";

const AdminNavContext = createContext<ClientPermissionFlags | undefined>(undefined);

export function AdminNavProvider({
  children,
  flags
}: {
  children: ReactNode;
  flags?: ClientPermissionFlags;
}) {
  return (
    <AdminNavContext.Provider value={flags}>{children}</AdminNavContext.Provider>
  );
}

export function useAdminNavFlags() {
  return useContext(AdminNavContext);
}

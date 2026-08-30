"use client";

import { createBrowserDatabaseClient } from "@/lib/db/browser-client";

export function createClient() {
  return createBrowserDatabaseClient();
}

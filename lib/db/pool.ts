import { loadLocalEnv } from "@/lib/env/load-local-env";
import { Pool, type PoolConfig } from "pg";

loadLocalEnv();

let pool: Pool | null = null;
const LOCAL_DEFAULT_DATABASE_URL =
  "postgresql://chapmee:chapmee_local_password@127.0.0.1:5432/chapmee_local";

function getPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL ?? LOCAL_DEFAULT_DATABASE_URL;
  if (
    !process.env.DATABASE_URL &&
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    console.warn(
      "[db] DATABASE_URL not set during next build — DB queries should be skipped via isNextBuildPhase()."
    );
  }
  if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
    console.warn(
      "[db] DATABASE_URL not set — using local default. Copy .env.example to .env.local for explicit config."
    );
  }

  return {
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 10_000),
    // Ensure Vietnamese text round-trips correctly regardless of server defaults.
    options: "-c client_encoding=UTF8"
  };
}

export function getPgPool(): Pool {
  if (!pool) {
    pool = new Pool(getPoolConfig());
  }
  return pool;
}

export async function closePgPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

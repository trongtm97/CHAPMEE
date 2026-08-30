#!/usr/bin/env node
/**
 * Drops and recreates chapmee_local (destructive). Use when legacy migrations fail mid-way.
 */
import pg from "pg";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://chapmee:chapmee_local_password@127.0.0.1:5432/chapmee_local";

async function main() {
  const client = new pg.Client({
    connectionString: databaseUrl.replace(/\/chapmee_local.*$/, "/postgres")
  });
  await client.connect();
  await client.query(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'chapmee_local' AND pid <> pg_backend_pid()"
  );
  await client.query("DROP DATABASE IF EXISTS chapmee_local");
  await client.query("CREATE DATABASE chapmee_local OWNER chapmee");
  await client.end();
  console.log("Database chapmee_local recreated. Run: npm run db:migrate && npm run db:legacy");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

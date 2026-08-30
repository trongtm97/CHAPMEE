import { readFileSync } from "node:fs";
import type pg from "pg";

export async function runSqlFile(client: pg.Client, filePath: string) {
  const sql = readFileSync(filePath, "utf8");
  await client.query(sql);
}

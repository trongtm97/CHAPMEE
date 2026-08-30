import { drizzle } from "drizzle-orm/node-postgres";
import { getPgPool } from "@/lib/db/pool";
import * as schema from "@/lib/db/schema";

export const db = drizzle(getPgPool(), { schema });

export { getPgPool, closePgPool } from "@/lib/db/pool";
export * from "@/lib/db/schema";

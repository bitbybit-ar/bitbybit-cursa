import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export function getDb() {
  if (!db) db = createDb();
  return db;
}

export type Db = ReturnType<typeof getDb>;

export * from "./schema";

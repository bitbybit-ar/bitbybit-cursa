// IMPORTANT: every test file that imports from this module must
// declare `@vitest-environment node` in a top-of-file docblock. The
// global vitest environment is jsdom (for component tests), but
// @neondatabase/serverless detects `window` and prints a browser-SQL
// warning if loaded under jsdom.
import { config } from "dotenv";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";

// Load .env.test before anything else.
config({ path: resolve(__dirname, "../../.env.test") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL not set in .env.test. Copy .env.test.example to .env.test and point it at a Neon test branch."
  );
}

const sqlClient = neon(databaseUrl);
export const testDb = drizzle(sqlClient, { schema });

/**
 * Truncate every table in the public schema. Call in beforeEach to
 * guarantee a clean slate. RESTART IDENTITY resets sequences;
 * CASCADE handles any FK links from later schema additions without
 * requiring this list to be kept in dependency order.
 */
export async function cleanDb() {
  await testDb.execute(
    sql`TRUNCATE TABLE admin_audit_log, orders, offerings, settings RESTART IDENTITY CASCADE`
  );
}

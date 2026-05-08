import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import { merchants, offerings } from "@/lib/db/schema";

// Same dotenv precedence as scripts/migrate.ts so a single
// MIGRATE_ENV_FILE/.env.local/.env file drives both commands.
const envFile = process.env.MIGRATE_ENV_FILE;
if (envFile) config({ path: envFile });
config({ path: ".env.local" });
config({ path: ".env" });

// Marketplace pivot (ADR 0012): every offering belongs to a
// merchant. The seed inserts a single example merchant under a
// well-known pubkey (all-zeros) and attaches the sample offerings
// to it. Fresh installs can browse the discovery home before any
// real merchant has signed up.
const SEED_MERCHANT_PUBKEY =
  "0000000000000000000000000000000000000000000000000000000000000000";

const SEED_MERCHANT = {
  pubkey: SEED_MERCHANT_PUBKEY,
  slug: "demo",
  display_name: "Profe Demo",
  bio:
    "Cuenta de ejemplo. Sirve para probar el catálogo de Cursá " +
    "antes de que profesores reales publiquen sus clases.",
  // Wapu-routable destination. The mock client accepts any string;
  // a real Wapu account would be required in production.
  alias: "demo.cursa.ar",
  cbu: null,
  active: true,
};

const SAMPLE_OFFERINGS = [
  {
    slug: "clase-particular-matematica",
    type: "code" as const,
    title: "Clase particular de matemática",
    description:
      "Una hora de clase 1-a-1 con un profesor de matemática del " +
      "secundario. Coordinás el horario por mensaje y recibís un " +
      "código de canje al pagar. Ideal para repasar antes de un " +
      "examen o desbloquear un tema puntual.",
    price_ars: 8000,
    image_url: null,
  },
  {
    slug: "taller-introduccion-bitcoin",
    type: "code" as const,
    title: "Taller: introducción a Bitcoin",
    description:
      "Taller grupal de 90 minutos sobre los fundamentos de " +
      "Bitcoin y Lightning. Online, los miércoles 19hs. Tu código " +
      "de canje te da acceso al próximo cupo disponible.",
    price_ars: 5000,
    image_url: null,
  },
  {
    slug: "guia-pdf-finanzas-personales",
    type: "download" as const,
    title: "Guía PDF: finanzas personales para profesores",
    description:
      "Cuadernillo de 32 páginas con planillas, ejemplos y un " +
      "checklist para ordenar tus ingresos y gastos como docente. " +
      "Descarga inmediata después de pagar.",
    price_ars: 2500,
    image_url: null,
    download_url: "https://example.com/guia-finanzas.pdf",
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  // Ensure the seed merchant exists. Idempotent — re-runs of the
  // seed script will skip if the row is already there.
  const [existingMerchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.pubkey, SEED_MERCHANT.pubkey))
    .limit(1);
  let merchant = existingMerchant;
  if (!merchant) {
    const [inserted] = await db
      .insert(merchants)
      .values(SEED_MERCHANT)
      .returning();
    merchant = inserted;
    console.log(`Seed merchant inserted: slug=${merchant.slug}`);
  } else {
    console.log(`Seed merchant present: slug=${merchant.slug}`);
  }

  let inserted = 0;
  let skipped = 0;
  for (const row of SAMPLE_OFFERINGS) {
    // Slug is unique per (merchant_id, slug); check the pair before
    // inserting so the script stays idempotent.
    const [existing] = await db
      .select({ id: offerings.id })
      .from(offerings)
      .where(
        and(
          eq(offerings.merchant_id, merchant.id),
          eq(offerings.slug, row.slug)
        )
      )
      .limit(1);
    if (existing) {
      skipped += 1;
      continue;
    }
    await db
      .insert(offerings)
      .values({ ...row, merchant_id: merchant.id });
    inserted += 1;
  }
  console.log(
    `Seed complete: ${inserted} offering(s) inserted, ${skipped} already present`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

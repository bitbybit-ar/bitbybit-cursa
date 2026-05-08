import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { offerings } from "@/lib/db/schema";

// Same dotenv precedence as scripts/migrate.ts so a single
// MIGRATE_ENV_FILE/.env.local/.env file drives both commands.
const envFile = process.env.MIGRATE_ENV_FILE;
if (envFile) config({ path: envFile });
config({ path: ".env.local" });
config({ path: ".env" });

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

  let inserted = 0;
  let skipped = 0;
  for (const row of SAMPLE_OFFERINGS) {
    const result = await db
      .insert(offerings)
      .values(row)
      .onConflictDoNothing({ target: offerings.slug })
      .returning({ id: offerings.id });
    if (result.length > 0) inserted += 1;
    else skipped += 1;
  }
  console.log(
    `Seed complete: ${inserted} inserted, ${skipped} already present`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

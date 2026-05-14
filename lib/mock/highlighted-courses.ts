import type { Offering, OfferingWithSeller } from "@/lib/offerings";

const NOW = new Date("2026-05-08T12:00:00Z");

export const highlightedCourses: OfferingWithSeller[] = [
  {
    offering: {
      id: "00000000-0000-0000-0000-000000000001",
      user_id: "10000000-0000-0000-0000-000000000001",
      slug: "intro-a-bitcoin",
      type: "download",
      title: "Introducción a Bitcoin",
      description:
        "Un curso de cinco clases para entender cómo funciona Bitcoin desde cero, sin matemática avanzada.\n\nVas a aprender qué es una wallet, cómo se firma una transacción, por qué la red es resistente a la censura y cómo encaja Lightning encima de la cadena base.\n\nIncluye un PDF con ejercicios y enlaces a recursos en español para seguir profundizando después de la última clase.",
      price_amount: 12000,
      price_currency: "ars",
      image_url:
        "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=720&q=80",
      code_pool: [],
      download_url: null,
      archived_at: null,
      created_at: NOW,
      updated_at: NOW,
    },
    seller: {
      id: "10000000-0000-0000-0000-000000000001",
      slug: "satoshi-aula",
      display_name: "Satoshi Aula",
      avatar_url: "https://github.com/lacrypta.png?size=128",
      banner_url:
        "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=1600&q=80",
      bio: "Profe de economía y entusiasta de Bitcoin desde 2017. Doy clases en escuelas técnicas y armé estos cursos para que cualquiera pueda entender la red sin asustarse de la jerga.",
    },
  },
  {
    offering: {
      id: "00000000-0000-0000-0000-000000000002",
      user_id: "10000000-0000-0000-0000-000000000002",
      slug: "guitarra-folklore-argentino",
      type: "download",
      title: "Guitarra: folklore argentino",
      description:
        "Aprendé a tocar zambas, chacareras y vidalas en guitarra criolla. Material descargable y partituras incluidas.\n\nDoce videos progresivos, desde afinación y postura hasta el rasguido de chacarera doble. Pensado para principiantes con ganas de tocar antes que estudiar teoría.\n\nAl pagar recibís un ZIP con los videos en alta calidad, partituras en PDF y pistas de acompañamiento para practicar.",
      price_amount: 9500,
      price_currency: "ars",
      image_url:
        "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=720&q=80",
      code_pool: [],
      download_url: null,
      archived_at: null,
      created_at: NOW,
      updated_at: NOW,
    },
    seller: {
      id: "10000000-0000-0000-0000-000000000002",
      slug: "carla-luthier",
      display_name: "Carla Luthier",
      avatar_url: "https://github.com/lawalletio.png?size=128",
      banner_url:
        "https://images.unsplash.com/photo-1551847812-f33a3e4f8f60?w=1600&q=80",
      bio: "Guitarrista, luthier y docente de música. Toco folklore desde los doce años y enseño guitarra criolla a distancia desde 2019.",
    },
  },
  {
    offering: {
      id: "00000000-0000-0000-0000-000000000003",
      user_id: "10000000-0000-0000-0000-000000000003",
      slug: "pintura-acrilica-paisajes",
      type: "code",
      title: "Pintura acrílica: paisajes",
      description:
        "Workshop online de cuatro encuentros para principiantes. Recibís un código de acceso y materiales en PDF.\n\nVamos a pintar un paisaje distinto en cada clase, trabajando capas, mezclas y composición. No hace falta experiencia previa, solo ganas y los materiales básicos.\n\nLos encuentros son los sábados por Zoom y quedan grabados por una semana. El código que recibís al pagar te habilita el acceso a las clases y al canal de consultas.",
      price_amount: 18000,
      price_currency: "ars",
      image_url:
        "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=720&q=80",
      code_pool: [],
      download_url: null,
      archived_at: null,
      created_at: NOW,
      updated_at: NOW,
    },
    seller: {
      id: "10000000-0000-0000-0000-000000000003",
      slug: "atelier-norte",
      display_name: "Atelier Norte",
      avatar_url: "https://github.com/bitbybit-ar.png?size=128",
      banner_url:
        "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1600&q=80",
      bio: "Taller de arte en Salta. Damos cursos presenciales y online de pintura, dibujo e ilustración para todas las edades.",
    },
  },
];

/**
 * Returns the mock offering matching `userSlug`/`offeringSlug`, or
 * `null`. Used as a fallback so the demo URLs surfaced from the
 * landing's highlighted-courses grid render a real page while the
 * production catalog is still empty.
 */
export function findMockOfferingByUserAndSlug(
  userSlug: string,
  offeringSlug: string
): OfferingWithSeller | null {
  return (
    highlightedCourses.find(
      (entry) =>
        entry.seller.slug === userSlug &&
        entry.offering.slug === offeringSlug
    ) ?? null
  );
}

/**
 * Returns the mock storefront for `userSlug` (seller card + their
 * offerings), or `null`. Mirrors `listOfferingsForUserSlug` so the
 * landing's seller links resolve to a page during the demo.
 */
export function findMockStorefront(userSlug: string): {
  seller: OfferingWithSeller["seller"];
  offerings: Offering[];
} | null {
  const entries = highlightedCourses.filter(
    (entry) => entry.seller.slug === userSlug
  );
  if (entries.length === 0) return null;
  return {
    seller: entries[0].seller,
    offerings: entries.map((entry) => entry.offering),
  };
}

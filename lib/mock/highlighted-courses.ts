import type { OfferingWithSeller } from "@/lib/offerings";

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
        "Un curso de cinco clases para entender cómo funciona Bitcoin desde cero, sin matemática avanzada.",
      price_ars: 12000,
      price_sats: null,
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
        "Aprendé a tocar zambas, chacareras y vidalas en guitarra criolla. Material descargable y partituras incluidas.",
      price_ars: 9500,
      price_sats: null,
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
        "Workshop online de cuatro encuentros para principiantes. Recibís un código de acceso y materiales en PDF.",
      price_ars: 18000,
      price_sats: null,
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
    },
  },
];

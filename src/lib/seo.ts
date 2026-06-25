// Socle SEO centralisé : constantes du site + générateurs de données structurées
// (JSON-LD Schema.org). Tout passe par ici pour rester cohérent sur l'ensemble
// des pages et éviter de dupliquer le balisage.

export const SITE = {
  url: "https://www.chateaudelahuberdiere.com",
  name: "Château de la Huberdière",
  legalName: "Château de la Huberdière",
  description:
    "Demeure du XVIᵉ siècle au cœur des Châteaux de la Loire (Touraine, près d'Amboise). Mariages, chambres d'hôtes, séminaires, retraites et événements privés, à deux heures de Paris.",
  phone: "+33247575292",
  email: "contact@chateaudelahuberdiere.com",
  address: {
    streetAddress: "Vallée de Vaugadeland",
    addressLocality: "Nazelles-Négron",
    postalCode: "37530",
    addressRegion: "Indre-et-Loire",
    addressCountry: "FR",
  },
  geo: { latitude: 47.44645, longitude: 0.93489 },
  // Note d'avis : désormais pilotée par src/data/reviews.json (l'aggregateRating
  // n'est émis QUE si des avis réels sont affichés sur la home, cf. lodgingBusinessSchema).
  rating: { value: "9.5", best: "10", count: "42" },
  priceRange: "€€€",
  ogImage: "/og/og-default.jpg",
  // Réseaux sociaux (renforce le graphe d'entité et le SEO local). La fiche Google
  // est rattachée via geo/hasMap. Récupérés du Wix (2026-06-25).
  sameAs: [
    "https://www.instagram.com/chateaudelahuberdiere",
    "https://www.facebook.com/people/Chateau-de-la-Huberdière/100093953672278/",
  ] as string[],
};

const abs = (path: string) => (path.startsWith("http") ? path : `${SITE.url}${path}`);

/** Organisation / entité émettrice du site (présent sur toutes les pages). */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: abs("/favicon.png"),
    image: abs(SITE.ogImage),
    email: SITE.email,
    telephone: `+${SITE.phone.replace(/\D/g, "")}`,
    ...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
  };
}

/** Le site lui-même + boîte de recherche potentielle (sitelinks searchbox). */
export function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    inLanguage: "fr-FR",
    publisher: { "@id": `${SITE.url}/#organization` },
  };
}

/** Un avis client (Schema.org Review). */
export interface ReviewInput {
  author: string;
  rating?: number | string;
  text: string;
  date?: string;
}
function reviewSchema(r: ReviewInput, bestRating: string) {
  return {
    "@type": "Review",
    author: { "@type": "Person", name: r.author },
    ...(r.rating ? { reviewRating: { "@type": "Rating", ratingValue: String(r.rating), bestRating } } : {}),
    reviewBody: r.text,
    ...(r.date ? { datePublished: r.date } : {}),
  };
}

/** Établissement d'hébergement complet : à mettre sur la page d'accueil.
 * L'aggregateRating et les Review ne sont émis QUE si de vrais avis sont
 * fournis et affichés sur la page (sinon, risque de pénalité « rich results »). */
export function lodgingBusinessSchema(opts?: {
  images?: string[];
  amenities?: string[];
  reviews?: ReviewInput[];
  rating?: { value: string; best: string; count: string };
}) {
  const hasReviews = (opts?.reviews?.length ?? 0) > 0;
  const best = opts?.rating?.best ?? "10";
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${SITE.url}/#lodging`,
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    telephone: `+${SITE.phone.replace(/\D/g, "")}`,
    email: SITE.email,
    priceRange: SITE.priceRange,
    image: (opts?.images ?? [SITE.ogImage]).map(abs),
    address: { "@type": "PostalAddress", ...SITE.address },
    geo: { "@type": "GeoCoordinates", latitude: SITE.geo.latitude, longitude: SITE.geo.longitude },
    hasMap: `https://www.google.com/maps?q=${SITE.geo.latitude},${SITE.geo.longitude}`,
    ...(hasReviews && opts?.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: opts.rating.value,
            bestRating: opts.rating.best,
            reviewCount: opts.rating.count,
          },
        }
      : {}),
    ...(hasReviews ? { review: opts!.reviews!.map((r) => reviewSchema(r, best)) } : {}),
    ...(opts?.amenities?.length
      ? {
          amenityFeature: opts.amenities.map((a) => ({
            "@type": "LocationFeatureSpecification",
            name: a,
            value: true,
          })),
        }
      : {}),
  };
}

/** Fil d'Ariane structuré. items = [{ name, path }] (path relatif, sans domaine). */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

/** Prestation (mariage, séminaire, séjour…) rattachée au château. */
export function serviceSchema(opts: { name: string; description: string; path: string; serviceType?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    ...(opts.serviceType ? { serviceType: opts.serviceType } : {}),
    url: abs(opts.path),
    provider: { "@id": `${SITE.url}/#lodging` },
    areaServed: [
      { "@type": "AdministrativeArea", name: "Indre-et-Loire" },
      { "@type": "AdministrativeArea", name: "Touraine" },
      { "@type": "Place", name: "Vallée de la Loire" },
    ],
  };
}

/** FAQ : moteur de citabilité (AI Overviews, ChatGPT, Perplexity) + rich results. */
export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

/** Fabrique les schemas d'une page activité (fil d'Ariane + service + FAQ).
 *  Centralisé pour rester cohérent sur les routes FR/EN/IT. */
export function activitySchemas(opts: { m: any; slug: string; lang: "fr" | "en" | "it" }) {
  const { m, slug, lang } = opts;
  const prefix = lang === "fr" ? "" : `/${lang}`;
  const home = lang === "fr" ? "Accueil" : "Home";
  const pageName = String(m.title).split(/[—|]/)[0].trim();
  const out: object[] = [
    breadcrumbSchema([
      { name: home, path: `${prefix}/` },
      { name: pageName, path: `${prefix}/${slug}` },
    ]),
    serviceSchema({ name: pageName, description: m.description, path: `${prefix}/${slug}` }),
  ];
  if (Array.isArray(m.faq) && m.faq.length) {
    out.push(faqSchema(m.faq.map((f: any) => ({ question: f.q, answer: f.a }))));
  }
  return out;
}

/** Article de blog (E-E-A-T : auteur identifié, dates, image). */
export function articleSchema(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: { name: string; role?: string; image?: string };
  section?: string;
}) {
  const author = opts.author
    ? {
        "@type": "Person",
        name: opts.author.name,
        ...(opts.author.role ? { jobTitle: opts.author.role } : {}),
        ...(opts.author.image ? { image: abs(opts.author.image) } : {}),
        worksFor: { "@id": `${SITE.url}/#organization` },
      }
    : { "@type": "Organization", name: SITE.name };
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: opts.title,
    description: opts.description,
    url: abs(opts.path),
    mainEntityOfPage: abs(opts.path),
    image: abs(opts.image ?? SITE.ogImage),
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    dateModified: opts.dateModified ?? opts.datePublished,
    ...(opts.section ? { articleSection: opts.section } : {}),
    author,
    publisher: { "@id": `${SITE.url}/#organization` },
  };
}

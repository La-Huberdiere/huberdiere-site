// Socle SEO centralisé : constantes du site + générateurs de données structurées
// (JSON-LD Schema.org). Tout passe par ici pour rester cohérent sur l'ensemble
// des pages et éviter de dupliquer le balisage.
import { localizePath } from "./routes";

export const SITE = {
  url: "https://www.chateaudelahuberdiere.com",
  name: "Château de la Huberdière",
  legalName: "Château de la Huberdière",
  description:
    "Hôtel de charme 3 étoiles dans une demeure du XVIᵉ siècle au cœur des Châteaux de la Loire (Touraine, près d'Amboise). Mariages, séjours, séminaires, retraites et événements privés, à 2 h 20 de Paris.",
  phone: "+33247575292",
  email: "contact@chateaudelahuberdiere.com",
  address: {
    streetAddress: "10 La Huberdière",
    addressLocality: "Nazelles-Négron",
    postalCode: "37530",
    addressRegion: "Indre-et-Loire",
    addressCountry: "FR",
  },
  geo: { latitude: 47.44645, longitude: 0.93489 },
  // Note d'avis : pilotée par src/data/reviews.json (l'aggregateRating n'est émis
  // QUE si des avis réels sont affichés sur la home, cf. lodgingBusinessSchema).
  // Classement officiel Atout France (revendiqué par le client).
  starRating: "3",
  // 10 chambres (chiffre canonique), horaires standard hôtellerie.
  numberOfRooms: 10,
  checkinTime: "16:00",
  checkoutTime: "11:00",
  priceRange: "€€€",
  ogImage: "/og/og-default.jpg",
  // Réseaux sociaux + profils tiers (renforce le graphe d'entité et le SEO/GEO local).
  // Instagram/Facebook récupérés du Wix (2026-06-25) ; fiche Google = URL Maps stable par
  // cid (2026-06-28) ; Booking + TripAdvisor + Wikidata (entité Q83716022, 2026-07-06).
  sameAs: [
    "https://www.instagram.com/chateaudelahuberdiere",
    "https://www.facebook.com/people/Chateau-de-la-Huberdière/100093953672278/",
    "https://www.google.com/maps?cid=5728274181919890705",
    "https://www.booking.com/hotel/fr/chateau-de-la-huberdiere-nazelles-negron.html",
    "https://www.tripadvisor.com/Hotel_Review-g315796-d26858423-Reviews-Chateau_de_la_Huberdiere-Nazelles_Negron_Amboise_Indre_et_Loire_Centre_Val_de_Loire.html",
    "https://www.wikidata.org/wiki/Q83716022",
  ] as string[],
};

const abs = (path: string) => (path.startsWith("http") ? path : `${SITE.url}${path}`);

/** Photos réelles du domaine pour le schema LodgingBusiness (extérieur, salon,
 *  chambre, table). De vraies images valent mieux que l'OG générique pour Google
 *  et les moteurs IA. Chemins publics servis tels quels. */
export const LODGING_IMAGES = [
  "/images/bibliotheque/chateau-exterieur/chateau-exterieur-05.jpg",
  "/images/bibliotheque/salons-interieurs/salons-interieurs-01.jpg",
  "/images/bibliotheque/chambres/chambre-01.jpg",
  "/images/bibliotheque/restauration/restauration-01.jpg",
];

/** Langue de contenu → étiquette BCP 47 (pour inLanguage). */
export type Lang = "fr" | "en" | "it";
const LANG_TAG: Record<Lang, string> = { fr: "fr-FR", en: "en-GB", it: "it-IT" };
const langTag = (l: Lang = "fr") => LANG_TAG[l] ?? "fr-FR";

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
export function webSiteSchema(lang: Lang = "fr") {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    inLanguage: langTag(lang),
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
  lang?: Lang;
  description?: string;
}) {
  const hasReviews = (opts?.reviews?.length ?? 0) > 0;
  const best = opts?.rating?.best ?? "10";
  // On ne balise en Review individuel que les avis portant une note (un Review
  // sans reviewRating est incomplet pour Google → avertissement Search Console).
  const ratedReviews = (opts?.reviews ?? []).filter((r) => r.rating != null && r.rating !== "");
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${SITE.url}/#lodging`,
    name: SITE.name,
    description: opts?.description ?? SITE.description,
    url: SITE.url,
    inLanguage: langTag(opts?.lang ?? "fr"),
    telephone: `+${SITE.phone.replace(/\D/g, "")}`,
    email: SITE.email,
    priceRange: SITE.priceRange,
    starRating: { "@type": "Rating", ratingValue: SITE.starRating, bestRating: "5" },
    numberOfRooms: SITE.numberOfRooms,
    checkinTime: SITE.checkinTime,
    checkoutTime: SITE.checkoutTime,
    currenciesAccepted: "EUR",
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
    ...(ratedReviews.length ? { review: ratedReviews.map((r) => reviewSchema(r, best)) } : {}),
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
  // `slug` = id canonique (FR) ; on construit l'URL localisée (slug traduit + préfixe).
  const homePath = localizePath("/", lang);
  const pagePath = localizePath(`/${slug}`, lang);
  const home = lang === "fr" ? "Accueil" : "Home";
  // Libellé court pour le fil d'Ariane et le Service : on part du <title> SEO et on
  // en retire le suffixe de marque puis les qualificatifs après séparateur. NB : le
  // remplacement du tiret cadratin par « · » avait cassé l'ancien split sur [—|],
  // qui laissait passer le title complet (marque dupliquée) dans le breadcrumb.
  const pageName =
    m.shortName ||
    String(m.title)
      .replace(/\s*[|·—]\s*(Château de la Huberdière|La Huberdière).*$/i, "")
      .replace(/,\s*Château de la Huberdière.*$/i, "")
      .split(/\s*[|·—]\s*/)[0]
      .trim();
  const out: object[] = [
    breadcrumbSchema([
      { name: home, path: homePath },
      { name: pageName, path: pagePath },
    ]),
    serviceSchema({ name: pageName, description: m.description, path: pagePath }),
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
  keywords?: string[];
  wordCount?: number;
  lang?: Lang;
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
    ...(opts.keywords && opts.keywords.length ? { keywords: opts.keywords.join(", ") } : {}),
    ...(opts.wordCount ? { wordCount: opts.wordCount } : {}),
    inLanguage: langTag(opts.lang ?? "fr"),
    isPartOf: { "@id": `${SITE.url}/#website` },
    author,
    publisher: { "@id": `${SITE.url}/#organization` },
  };
}

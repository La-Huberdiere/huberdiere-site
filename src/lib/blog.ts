// Helpers blog : libellés de catégories (FR/EN/IT) + temps de lecture + i18n.

export type Lang = "fr" | "en" | "it";

const CATEGORIES_BY_LANG: Record<Lang, Record<string, string>> = {
  fr: {
    mariage: "Mariage",
    sejour: "Séjour & tourisme",
    seminaire: "Séminaire",
    famille: "Famille & groupes",
    retraite: "Retraites & bien-être",
    "art-de-vivre": "Art de vivre",
  },
  en: {
    mariage: "Weddings",
    sejour: "Stay & sightseeing",
    seminaire: "Seminars",
    famille: "Family & groups",
    retraite: "Retreats & wellness",
    "art-de-vivre": "Art of living",
  },
  it: {
    mariage: "Matrimoni",
    sejour: "Soggiorno e turismo",
    seminaire: "Seminari",
    famille: "Famiglia e gruppi",
    retraite: "Ritiri e benessere",
    "art-de-vivre": "Arte di vivere",
  },
};

// FR par défaut pour rester rétro-compatible avec les appels existants.
export const CATEGORIES = CATEGORIES_BY_LANG.fr;
export const categoryLabel = (id?: string | null, lang: Lang = "fr") =>
  CATEGORIES_BY_LANG[lang][id ?? ""] ?? CATEGORIES_BY_LANG[lang]["art-de-vivre"];

// Ordre de référence des catégories (pour les filtres).
export const CATEGORY_ORDER = Object.keys(CATEGORIES_BY_LANG.fr);

/** Préfixe une URL interne selon la langue (FR sans préfixe). */
export const lp = (lang: Lang, path: string) =>
  lang === "fr" ? path : `/${lang}${path}`;

/** Libellés d'interface du blog, par langue. */
export const BLOG_UI: Record<Lang, Record<string, string>> = {
  fr: {
    home: "Accueil",
    journal: "Journal",
    metaTitle: "Journal du château — conseils mariage, séjour & art de vivre en Val de Loire",
    metaDesc:
      "Le journal du Château de la Huberdière : conseils et inspirations pour vos mariages, séjours, séminaires et retraites en Touraine, au cœur des Châteaux de la Loire.",
    eyebrow: "Le journal",
    h1: "Conseils & inspirations du château",
    intro:
      "Nos conseils pour organiser un mariage, un séjour ou un séminaire au château, et nos inspirations pour découvrir la Touraine et les Châteaux de la Loire.",
    searchPlaceholder: "Rechercher un sujet, un mot-clé…",
    searchAria: "Rechercher un article",
    filterAria: "Filtrer par thème",
    all: "Tout",
    flag: "À la une",
    readArticle: "Lire l'article →",
    empty: "Aucun article ne correspond à votre recherche.",
    none: "Aucun article pour le moment.",
    more: "Voir plus d'articles",
    by: "Par",
    readingTime: "min de lecture",
    toc: "Sommaire",
    faqTitle: "Questions fréquentes",
    ctaTitle: "Envie de vivre le château ?",
    ctaText:
      "Mariage, séjour, séminaire ou réunion de famille : recevez une proposition personnalisée.",
    ctaBtn: "Recevoir une proposition",
    related: "À lire aussi",
    back: "← Tous les articles",
    updated: "Mis à jour le",
    railKicker: "Séjourner au château",
    railText: "Vérifiez les disponibilités ou demandez une proposition sur mesure.",
    railBtn: "Réserver un séjour",
    railLink: "Recevoir une proposition →",
    nlTitle: "La lettre du château",
    nlLead: "Saisons, événements et inspirations, quelques fois par an.",
    nlPlaceholder: "Votre email",
    nlBtn: "S'inscrire",
    nlOk: "Merci, votre inscription est confirmée.",
    nlErr: "Une erreur est survenue. Réessayez.",
  },
  en: {
    home: "Home",
    journal: "Journal",
    metaTitle: "Château journal — wedding, stay & art-of-living tips in the Loire Valley",
    metaDesc:
      "The journal of Château de la Huberdière: tips and inspiration for your weddings, stays, seminars and retreats in Touraine, at the heart of the Loire châteaux.",
    eyebrow: "The journal",
    h1: "Tips & inspiration from the château",
    intro:
      "Our advice for planning a wedding, a stay or a seminar at the château, and our inspiration for discovering Touraine and the Loire châteaux.",
    searchPlaceholder: "Search a topic, a keyword…",
    searchAria: "Search an article",
    filterAria: "Filter by theme",
    all: "All",
    flag: "Featured",
    readArticle: "Read the article →",
    empty: "No article matches your search.",
    none: "No article yet.",
    more: "Show more articles",
    by: "By",
    readingTime: "min read",
    toc: "Contents",
    faqTitle: "Frequently asked questions",
    ctaTitle: "Want to experience the château?",
    ctaText:
      "Wedding, stay, seminar or family gathering: receive a tailored proposal.",
    ctaBtn: "Request a proposal",
    related: "Read also",
    back: "← All articles",
    updated: "Updated on",
    railKicker: "Stay at the château",
    railText: "Check availability or request a tailored proposal.",
    railBtn: "Book a stay",
    railLink: "Request a proposal →",
    nlTitle: "The château newsletter",
    nlLead: "Seasons, events and inspiration, a few times a year.",
    nlPlaceholder: "Your email",
    nlBtn: "Subscribe",
    nlOk: "Thank you, your subscription is confirmed.",
    nlErr: "Something went wrong. Please try again.",
  },
  it: {
    home: "Home",
    journal: "Diario",
    metaTitle: "Diario del castello — matrimoni, soggiorni e arte di vivere nella Valle della Loira",
    metaDesc:
      "Il diario del Château de la Huberdière: consigli e ispirazioni per matrimoni, soggiorni, seminari e ritiri in Turenna, nel cuore dei castelli della Loira.",
    eyebrow: "Il diario",
    h1: "Consigli e ispirazioni del castello",
    intro:
      "I nostri consigli per organizzare un matrimonio, un soggiorno o un seminario al castello, e le nostre ispirazioni per scoprire la Turenna e i castelli della Loira.",
    searchPlaceholder: "Cerca un argomento, una parola chiave…",
    searchAria: "Cerca un articolo",
    filterAria: "Filtra per tema",
    all: "Tutti",
    flag: "In evidenza",
    readArticle: "Leggi l'articolo →",
    empty: "Nessun articolo corrisponde alla tua ricerca.",
    none: "Ancora nessun articolo.",
    more: "Mostra altri articoli",
    by: "Di",
    readingTime: "min di lettura",
    toc: "Sommario",
    faqTitle: "Domande frequenti",
    ctaTitle: "Voglia di vivere il castello?",
    ctaText:
      "Matrimonio, soggiorno, seminario o riunione di famiglia: ricevi una proposta su misura.",
    ctaBtn: "Richiedi una proposta",
    related: "Da leggere anche",
    back: "← Tutti gli articoli",
    updated: "Aggiornato il",
    railKicker: "Soggiornare al castello",
    railText: "Verifica la disponibilità o richiedi una proposta su misura.",
    railBtn: "Prenota un soggiorno",
    railLink: "Richiedi una proposta →",
    nlTitle: "La newsletter del castello",
    nlLead: "Stagioni, eventi e ispirazioni, qualche volta l'anno.",
    nlPlaceholder: "La tua email",
    nlBtn: "Iscriviti",
    nlOk: "Grazie, la tua iscrizione è confermata.",
    nlErr: "Si è verificato un errore. Riprova.",
  },
};

/** Temps de lecture estimé (≈ 200 mots/min) à partir du HTML rendu. */
export function readingTime(html: string): number {
  const words = (html.replace(/<[^>]+>/g, " ").match(/\S+/g) || []).length;
  return Math.max(1, Math.round(words / 200));
}

const LOCALE: Record<Lang, string> = { fr: "fr-FR", en: "en-GB", it: "it-IT" };
export const formatDate = (d?: string | null, lang: Lang = "fr") =>
  d ? new Date(d).toLocaleDateString(LOCALE[lang], { day: "numeric", month: "long", year: "numeric" }) : "";

/** Nombre de mots du corps rendu (pour BlogPosting.wordCount). */
export function wordCount(html: string): number {
  return (html.replace(/<[^>]+>/g, " ").match(/\S+/g) || []).length;
}

/** Slug d'ancre stable à partir d'un texte de titre. */
export function slugifyHeading(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "section";
}

export interface TocItem { id: string; text: string; level: number }

/**
 * Injecte des id d'ancre sur les h2/h3 du HTML rendu et renvoie la table des
 * matières (h2 + h3). Sert le sommaire cliquable + le scroll-spy de l'article.
 */
export function withToc(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const out = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g, (_m, lvl, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    let id = slugifyHeading(text);
    const base = id;
    let n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    toc.push({ id, text, level: Number(lvl) });
    const hasId = /\sid=/.test(attrs);
    return `<h${lvl}${hasId ? attrs : `${attrs} id="${id}"`}>${inner}</h${lvl}>`;
  });
  return { html: out, toc };
}

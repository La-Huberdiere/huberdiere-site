// Slugs localisés EN/IT — table de correspondance centrale.
//
// Le FR reste la référence (URL sans préfixe, slug = id canonique). EN et IT
// portent un slug dans leur langue, calé sur le mot-clé cible de la page. Tout le
// routing, les hreflang, les canonical et les liens internes passent par ce module,
// de sorte qu'un changement de slug se fait ici, en un seul endroit.
//
// Un id absent d'une table retombe proprement sur l'id FR préfixé (`/en/<id>`),
// donc une nouvelle page/article sans entrée ne casse rien : il garde juste le slug FR.

export type Lang = "fr" | "en" | "it";

// Pages à segment unique (pages argent + transverses). fr = id canonique.
export const PAGE_SLUGS: Record<string, Record<Lang, string>> = {
  mariage: { fr: "mariage", en: "chateau-wedding-loire", it: "matrimonio-castello-loira" },
  sejour: { fr: "sejour", en: "boutique-hotel-amboise", it: "hotel-di-charme-amboise" },
  seminaire: { fr: "seminaire", en: "chateau-seminar-loire", it: "seminario-aziendale-castello" },
  famille: { fr: "famille", en: "chateau-hire-large-group", it: "affittare-castello-gruppo" },
  retraite: { fr: "retraite", en: "yoga-retreat-venue", it: "ritiro-yoga-castello" },
  restauration: { fr: "restauration", en: "chateau-dining-touraine", it: "cena-al-castello" },
  galerie: { fr: "galerie", en: "gallery", it: "galleria" },
  contact: { fr: "contact", en: "contact", it: "contatti" },
};

// Pages libres (collection Keystatic pages / pages-en / pages-it). fr = nom de fichier.
export const FREE_PAGE_SLUGS: Record<string, { en: string; it: string }> = {
  "notre-histoire": { en: "our-story", it: "la-nostra-storia" },
  activites: { en: "things-to-do", it: "attivita" },
  "mentions-legales": { en: "legal-notice", it: "note-legali" },
  "politique-de-confidentialite": { en: "privacy-policy", it: "privacy" },
};

// Articles de blog (fichier .mdoc = id canonique, identique dans les 3 langues).
export const ARTICLE_SLUGS: Record<string, { en: string; it: string }> = {
  "chambres-hotes-amboise-chateau": { en: "bed-and-breakfast-amboise", it: "bed-breakfast-castello-loira" },
  "dormir-dans-un-chateau-loire": { en: "sleep-in-a-loire-chateau", it: "dormire-castello-della-loira" },
  "louer-chateau-entre-amis-famille": { en: "rent-chateau-group-weekend", it: "affittare-castello-weekend" },
  "organiser-mariage-au-chateau": { en: "chateau-wedding-planning", it: "organizzare-matrimonio-castello" },
  "organiser-retraite-yoga-chateau": { en: "yoga-retreat-chateau", it: "ritiro-yoga-castello-loira" },
  "organiser-seminaire-au-chateau": { en: "chateau-seminar-guide", it: "organizzare-seminario-castello" },
  "prix-mariage-chateau-loire": { en: "chateau-wedding-cost", it: "prezzo-matrimonio-castello" },
  "se-marier-en-hiver-chateau": { en: "winter-wedding-chateau-loire", it: "matrimonio-inverno-castello" },
  "seminaire-au-vert-pres-de-paris": { en: "corporate-retreat-near-paris", it: "seminario-nel-verde-parigi" },
  "seminaire-direction-chateau-privatise": { en: "executive-retreat-chateau-loire", it: "seminario-direzione-castello" },
  "team-building-touraine-activites": { en: "outdoor-team-building-loire", it: "attivita-team-building-castello" },
  "visiter-chateaux-de-la-loire": { en: "visiting-loire-chateaux", it: "visitare-castelli-loira" },
};

/** Slug localisé d'une page à segment unique (id → slug de la langue). */
export const pageSlug = (id: string, lang: Lang): string =>
  PAGE_SLUGS[id]?.[lang] ?? id;

/** Slug localisé d'une page libre. */
export const freeSlug = (id: string, lang: Lang): string =>
  lang === "fr" ? id : FREE_PAGE_SLUGS[id]?.[lang] ?? id;

/** Slug localisé d'un article de blog. */
export const articleSlug = (id: string, lang: Lang): string =>
  lang === "fr" ? id : ARTICLE_SLUGS[id]?.[lang] ?? id;

/**
 * Localise un chemin « style FR » (id canonique) vers la langue cible, avec le
 * bon slug ET le préfixe de langue. Repli « préfixe seul » pour tout chemin non
 * mappé (ancres, /merci, etc.). Préserve un éventuel fragment #ancre.
 *
 *   localizePath("/mariage", "en")            → "/en/chateau-wedding-loire"
 *   localizePath("/blog/prix-...", "it")      → "/it/blog/prezzo-matrimonio-castello"
 *   localizePath("/#location", "en")          → "/en#location"
 *   localizePath("/merci", "en")              → "/en/merci"   (repli)
 */
export function localizePath(frPath: string, lang: Lang): string {
  if (!frPath || !frPath.startsWith("/")) return frPath; // externe / relatif
  if (lang === "fr") return frPath;

  const hashAt = frPath.indexOf("#");
  const hash = hashAt >= 0 ? frPath.slice(hashAt) : "";
  const p = hashAt >= 0 ? frPath.slice(0, hashAt) : frPath;

  // Accueil (avec ou sans ancre).
  if (p === "/" || p === "") return `/${lang}${hash}`;

  // Blog : /blog ou /blog/<idArticle>.
  if (p === "/blog") return `/${lang}/blog${hash}`;
  const art = p.match(/^\/blog\/(.+)$/);
  if (art) return `/${lang}/blog/${articleSlug(art[1], lang)}${hash}`;

  // Page à segment unique : /<id>.
  const seg = p.slice(1);
  if (!seg.includes("/")) {
    if (PAGE_SLUGS[seg]) return `/${lang}/${PAGE_SLUGS[seg][lang]}${hash}`;
    if (FREE_PAGE_SLUGS[seg]) return `/${lang}/${freeSlug(seg, lang)}${hash}`;
  }

  // Repli : préfixe de langue seul (chemin non mappé).
  return `/${lang}${p}${hash}`;
}

/** Les 3 chemins localisés d'un même contenu (pour hreflang). frPath = style FR. */
export function alternatesFor(frPath: string): Record<Lang, string> {
  return {
    fr: localizePath(frPath, "fr"),
    en: localizePath(frPath, "en"),
    it: localizePath(frPath, "it"),
  };
}

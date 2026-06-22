import { config, singleton, collection, fields } from "@keystatic/core";

// Config Keystatic — édition multilingue du site (FR / EN / IT) sans code.
// Éditeur : /keystatic. GitHub en prod, local en dev (cf. PUBLIC_KEYSTATIC_STORAGE).
// Chaque page existe en 3 langues : src/data/{fr,en,it}/{page}.json (fichier plat,
// path sans slash final). Les schémas sont factorisés et réutilisés par langue.

const useGithub =
  import.meta.env.PROD || import.meta.env.PUBLIC_KEYSTATIC_STORAGE === "github";

// ---- Schémas (identiques pour les 3 langues) ----

const settingsSchema = {
  brandName: fields.text({ label: "Nom (header)" }),
  brandSub: fields.text({ label: "Sous-titre (header)" }),
  reserveLabel: fields.text({ label: "Bouton « Réserver » — texte" }),
  reserveHref: fields.text({ label: "Bouton « Réserver » — lien" }),
  nav: fields.array(
    fields.object({
      label: fields.text({ label: "Libellé" }),
      href: fields.text({ label: "Lien" }),
    }),
    { label: "Menu (header)", itemLabel: (p) => p.fields.label.value || "Lien" }
  ),
  footer: fields.object(
    {
      name: fields.text({ label: "Nom" }),
      addressLine1: fields.text({ label: "Adresse — ligne 1" }),
      addressLine2: fields.text({ label: "Adresse — ligne 2" }),
      phone: fields.text({ label: "Téléphone (affiché)" }),
      phoneHref: fields.text({ label: "Téléphone (lien tel:)" }),
      email: fields.text({ label: "Email" }),
      col2Title: fields.text({ label: "Colonne 2 — titre" }),
      col2Links: fields.array(
        fields.object({
          label: fields.text({ label: "Libellé" }),
          href: fields.text({ label: "Lien" }),
        }),
        { label: "Colonne 2 — liens", itemLabel: (p) => p.fields.label.value || "Lien" }
      ),
      col3Title: fields.text({ label: "Colonne 3 — titre" }),
      col3Links: fields.array(
        fields.object({
          label: fields.text({ label: "Libellé" }),
          href: fields.text({ label: "Lien" }),
        }),
        { label: "Colonne 3 — liens", itemLabel: (p) => p.fields.label.value || "Lien" }
      ),
      bottomLeft: fields.text({ label: "Bas de page — gauche" }),
      bottomRight: fields.text({ label: "Bas de page — droite" }),
    },
    { label: "Footer" }
  ),
};

const homepageSchema = {
  hero: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      titleLine1: fields.text({ label: "Titre — ligne 1" }),
      titleLine2Italic: fields.text({ label: "Titre — ligne 2 (italique)" }),
      lead: fields.text({ label: "Texte d'accroche", multiline: true }),
      ctaPrimary: fields.text({ label: "Bouton principal" }),
      ctaSecondary: fields.text({ label: "Bouton secondaire" }),
    },
    { label: "Hero (bandeau du haut)" }
  ),
  intro: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      titleLine1: fields.text({ label: "Titre — ligne 1" }),
      titleLine2Italic: fields.text({ label: "Titre — ligne 2 (italique)" }),
      paragraphs: fields.array(fields.text({ label: "Paragraphe", multiline: true }), {
        label: "Paragraphes",
        itemLabel: (p) => p.value.slice(0, 40) || "Paragraphe",
      }),
      sign: fields.text({ label: "Signature" }),
    },
    { label: "Section « L'esprit du lieu »" }
  ),
  activitiesHead: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      titlePlain: fields.text({ label: "Titre (début)" }),
      titleItalic: fields.text({ label: "Titre (fin, italique)" }),
      intro: fields.text({ label: "Texte d'introduction", multiline: true }),
    },
    { label: "Activités — en-tête" }
  ),
  activities: fields.array(
    fields.object({
      num: fields.text({ label: "Numéro / catégorie" }),
      titlePlain: fields.text({ label: "Titre (début)" }),
      titleItalic: fields.text({ label: "Titre (fin, italique)" }),
      text: fields.text({ label: "Description", multiline: true }),
      points: fields.array(fields.text({ label: "Point" }), { label: "Points clés" }),
      linkLabel: fields.text({ label: "Texte du lien" }),
      linkHref: fields.text({ label: "Cible du lien" }),
    }),
    { label: "Activités", itemLabel: (p) => p.fields.num.value || "Activité" }
  ),
  quote: fields.object(
    {
      text: fields.text({ label: "Texte de la citation", multiline: true }),
      cite: fields.text({ label: "Signature" }),
    },
    { label: "Citation" }
  ),
  galleryHead: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      titlePlain: fields.text({ label: "Titre (début)" }),
      titleItalic: fields.text({ label: "Titre (fin, italique)" }),
    },
    { label: "Galerie — en-tête" }
  ),
  location: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      titleLine1Plain: fields.text({ label: "Titre ligne 1 (début)" }),
      titleLine1Italic: fields.text({ label: "Titre ligne 1 (italique)" }),
      titleLine2: fields.text({ label: "Titre — ligne 2" }),
      paragraphs: fields.array(fields.text({ label: "Paragraphe", multiline: true }), {
        label: "Paragraphes",
        itemLabel: (p) => p.value.slice(0, 40) || "Paragraphe",
      }),
      pins: fields.array(
        fields.object({
          big: fields.text({ label: "Chiffre" }),
          lbl: fields.text({ label: "Légende" }),
        }),
        { label: "Chiffres clés", itemLabel: (p) => p.fields.big.value || "Chiffre" }
      ),
    },
    { label: "Section « Situation »" }
  ),
  final: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      titleLine1: fields.text({ label: "Titre — ligne 1" }),
      titleLine2Italic: fields.text({ label: "Titre — ligne 2 (italique)" }),
      text: fields.text({ label: "Texte", multiline: true }),
      ctaPrimary: fields.text({ label: "Bouton principal" }),
      ctaSecondary: fields.text({ label: "Bouton secondaire" }),
      responseLine: fields.text({ label: "Ligne « réponse sous 24h »" }),
    },
    { label: "Section contact (bas de page)" }
  ),
};

const mariageSchema = {
  title: fields.text({ label: "Titre de l'onglet (SEO)" }),
  description: fields.text({ label: "Méta description (SEO)", multiline: true }),
  hero: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      titleLine1: fields.text({ label: "Titre — ligne 1" }),
      titleLine2Italic: fields.text({ label: "Titre — ligne 2 (italique)" }),
      lead: fields.text({ label: "Texte d'accroche", multiline: true }),
    },
    { label: "Hero" }
  ),
  intro: fields.array(fields.text({ label: "Paragraphe", multiline: true }), {
    label: "Introduction",
    itemLabel: (p) => p.value.slice(0, 40) || "Paragraphe",
  }),
  cards: fields.array(
    fields.object({
      num: fields.text({ label: "Numéro" }),
      title: fields.text({ label: "Titre" }),
      text: fields.text({ label: "Texte", multiline: true }),
    }),
    { label: "Les 3 piliers", itemLabel: (p) => p.fields.title.value || "Pilier" }
  ),
  final: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      titleLine1: fields.text({ label: "Titre — ligne 1" }),
      titleLine2Italic: fields.text({ label: "Titre — ligne 2 (italique)" }),
      text: fields.text({ label: "Texte", multiline: true }),
      submitLabel: fields.text({ label: "Bouton du formulaire" }),
      responseLine: fields.text({ label: "Ligne « réponse sous 24h »" }),
    },
    { label: "Section contact" }
  ),
};

// ---- Singletons : une entrée par page, contenu nesté par langue ----
// Sections Français / English / Italiano dans le même écran d'édition : on édite
// la page d'accueil et on voit/corrige directement le wording IT en dessous.
const langSections = (schema: any) => ({
  fr: fields.object(schema, { label: "Français" }),
  en: fields.object(schema, { label: "English" }),
  it: fields.object(schema, { label: "Italiano" }),
});

export default config({
  storage: useGithub
    ? { kind: "github", repo: { owner: "alexis-morain", name: "huberdiere-site" } }
    : { kind: "local" },
  ui: {
    brand: { name: "Château de la Huberdière" },
    navigation: {
      Pages: ["homepage", "mariage"],
      Réglages: ["settings"],
      Contenu: ["pages", "articles"],
    },
  },
  singletons: {
    homepage: singleton({
      label: "Page d'accueil (FR · EN · IT)",
      path: "src/data/homepage",
      format: { data: "json" },
      previewUrl: "/",
      schema: langSections(homepageSchema),
    }),
    mariage: singleton({
      label: "Page Mariage (FR · EN · IT)",
      path: "src/data/mariage",
      format: { data: "json" },
      previewUrl: "/mariage",
      schema: langSections(mariageSchema),
    }),
    settings: singleton({
      label: "Réglages header & footer (FR · EN · IT)",
      path: "src/data/settings",
      format: { data: "json" },
      schema: langSections(settingsSchema),
    }),
  },
  collections: {
    pages: collection({
      label: "Pages libres",
      slugField: "title",
      path: "src/content/pages/*",
      format: { contentField: "body" },
      previewUrl: "/{slug}",
      schema: {
        title: fields.slug({
          name: { label: "Titre de la page" },
          slug: { label: "Adresse (URL)", description: "L'adresse de la page, ex. « tarifs » → /tarifs" },
        }),
        description: fields.text({ label: "Méta description (SEO)", multiline: true }),
        heroImage: fields.image({
          label: "Image de bandeau (optionnelle)",
          directory: "public/images/pages",
          publicPath: "/images/pages/",
        }),
        body: fields.markdoc({
          label: "Contenu de la page",
          options: { image: { directory: "public/images/pages", publicPath: "/images/pages/" } },
        }),
      },
    }),
    articles: collection({
      label: "Articles (blog SEO)",
      slugField: "title",
      path: "src/content/articles/*",
      format: { contentField: "body" },
      previewUrl: "/blog/{slug}",
      schema: {
        title: fields.slug({ name: { label: "Titre" } }),
        description: fields.text({ label: "Méta description (SEO)", multiline: true }),
        publishedAt: fields.date({ label: "Date de publication" }),
        cover: fields.image({
          label: "Image de couverture",
          directory: "public/images/articles",
          publicPath: "/images/articles/",
        }),
        body: fields.markdoc({
          label: "Contenu de l'article",
          options: { image: { directory: "public/images/articles", publicPath: "/images/articles/" } },
        }),
      },
    }),
  },
});

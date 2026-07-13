import { config, singleton, collection, fields } from "@keystatic/core";
import { createElement as h } from "react";

// Blason affiché en haut de la barre latérale de l'éditeur (tuile bordeaux + « H »),
// pour que l'espace d'édition porte l'identité du château. Rendu inline (pas de fetch),
// lisible sur fond clair comme sombre. Couleurs de marque : bordeaux #8B0000 / crème #F4F2EC.
const brandMark = () =>
  h(
    "svg",
    { width: 28, height: 28, viewBox: "0 0 64 64", "aria-hidden": true, style: { display: "block" } },
    h("rect", { width: 64, height: 64, rx: 13, fill: "#8B0000" }),
    h(
      "text",
      {
        x: 32,
        y: 46,
        textAnchor: "middle",
        fontFamily: "Georgia, 'Playfair Display', serif",
        fontWeight: 600,
        fontSize: 40,
        fill: "#F4F2EC",
      },
      "H"
    )
  );

// Config Keystatic : édition multilingue du site (FR / EN / IT) sans code.
// Éditeur : /keystatic. GitHub en prod, local en dev (cf. PUBLIC_KEYSTATIC_STORAGE).
// Chaque page existe en 3 langues : src/data/{fr,en,it}/{page}.json (fichier plat,
// path sans slash final). Les schémas sont factorisés et réutilisés par langue.

const useGithub =
  import.meta.env.PROD || import.meta.env.PUBLIC_KEYSTATIC_STORAGE === "github";

// ---- Schémas (identiques pour les 3 langues) ----

const settingsSchema = {
  brandName: fields.text({ label: "Nom (header)" }),
  brandSub: fields.text({ label: "Sous-titre (header)" }),
  reserveLabel: fields.text({ label: "Bouton « Réserver » : texte" }),
  reserveHref: fields.text({ label: "Bouton « Réserver » : lien" }),
  booking: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre (page réservation)" }),
      title: fields.text({ label: "Titre (page réservation)" }),
      intro: fields.text({ label: "Intro (page réservation)", multiline: true }),
      checkin: fields.text({ label: "Libellé Arrivée" }),
      checkout: fields.text({ label: "Libellé Départ" }),
      guests: fields.text({ label: "Libellé Voyageurs" }),
      submit: fields.text({ label: "Bouton barre de recherche" }),
      fallbackPre: fields.text({ label: "Texte avant lien de secours" }),
      fallbackLink: fields.text({ label: "Lien de secours" }),
    },
    { label: "Réservation (barre + page)" }
  ),
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
      addressLine1: fields.text({ label: "Adresse (ligne 1)" }),
      addressLine2: fields.text({ label: "Adresse (ligne 2)" }),
      phone: fields.text({ label: "Téléphone (affiché)" }),
      phoneHref: fields.text({ label: "Téléphone (lien tel:)" }),
      email: fields.text({ label: "Email" }),
      col2Title: fields.text({ label: "Colonne 2 : titre" }),
      col2Links: fields.array(
        fields.object({
          label: fields.text({ label: "Libellé" }),
          href: fields.text({ label: "Lien" }),
        }),
        { label: "Colonne 2 : liens", itemLabel: (p) => p.fields.label.value || "Lien" }
      ),
      col3Title: fields.text({ label: "Colonne 3 : titre" }),
      col3Links: fields.array(
        fields.object({
          label: fields.text({ label: "Libellé" }),
          href: fields.text({ label: "Lien" }),
        }),
        { label: "Colonne 3 : liens", itemLabel: (p) => p.fields.label.value || "Lien" }
      ),
      bottomLeft: fields.text({ label: "Bas de page (gauche)" }),
      bottomRight: fields.text({ label: "Bas de page (droite)" }),
    },
    { label: "Footer" }
  ),
};

const homepageSchema = {
  hero: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      titleLine1: fields.text({ label: "Titre (ligne 1)" }),
      titleLine2Italic: fields.text({ label: "Titre (ligne 2, en italique)" }),
      lead: fields.text({ label: "Texte d'accroche", multiline: true }),
      ctaPrimary: fields.text({ label: "Bouton principal" }),
      ctaSecondary: fields.text({ label: "Bouton secondaire" }),
    },
    { label: "Hero (bandeau du haut)" }
  ),
  intro: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      titleLine1: fields.text({ label: "Titre (ligne 1)" }),
      titleLine2Italic: fields.text({ label: "Titre (ligne 2, en italique)" }),
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
    { label: "Activités : en-tête" }
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
    { label: "Galerie : en-tête" }
  ),
  location: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      titleLine1Plain: fields.text({ label: "Titre ligne 1 (début)" }),
      titleLine1Italic: fields.text({ label: "Titre ligne 1 (italique)" }),
      titleLine2: fields.text({ label: "Titre (ligne 2)" }),
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
      titleLine1: fields.text({ label: "Titre (ligne 1)" }),
      titleLine2Italic: fields.text({ label: "Titre (ligne 2, en italique)" }),
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
      titleLine1: fields.text({ label: "Titre (ligne 1)" }),
      titleLine2Italic: fields.text({ label: "Titre (ligne 2, en italique)" }),
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
  stats: fields.array(
    fields.object({
      big: fields.text({ label: "Chiffre" }),
      lbl: fields.text({ label: "Légende" }),
    }),
    { label: "Chiffres clés (bande sous le hero)", itemLabel: (p) => p.fields.big.value || "Chiffre" }
  ),
  brief: fields.array(
    fields.object({
      label: fields.text({ label: "Intitulé (ex. « Capacité », « Situation »)" }),
      value: fields.text({ label: "Fait (phrase autonome et factuelle)", multiline: true }),
    }),
    { label: "Encart « En bref » (fiche factuelle en tête de page)", itemLabel: (p) => p.fields.label.value || "Fait" }
  ),
  extrasHead: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      title: fields.text({ label: "Titre de la section" }),
    },
    { label: "Section « activités / extras » : en-tête" }
  ),
  extras: fields.array(
    fields.object({
      title: fields.text({ label: "Titre" }),
      text: fields.text({ label: "Texte", multiline: true }),
    }),
    { label: "Section « activités / extras » : items", itemLabel: (p) => p.fields.title.value || "Item" }
  ),
  activitiesHead: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      title: fields.text({ label: "Titre de la section activités" }),
      intro: fields.text({ label: "Introduction", multiline: true }),
    },
    { label: "Section « activités » : en-tête (optionnel)" }
  ),
  activities: fields.array(
    fields.object({
      title: fields.text({ label: "Titre" }),
      text: fields.text({ label: "Texte", multiline: true }),
    }),
    { label: "Activités (liste, optionnel)", itemLabel: (p) => p.fields.title.value || "Activité" }
  ),
  roomsHead: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      title: fields.text({ label: "Titre de la section chambres" }),
    },
    { label: "Section « chambres » : en-tête (optionnel)" }
  ),
  rooms: fields.array(
    fields.object({
      name: fields.text({ label: "Nom de la chambre" }),
      size: fields.text({ label: "Surface" }),
      tag: fields.text({ label: "Étiquette (sur-titre, ex. « Chambre nuptiale »)" }),
      photos: fields.array(
        fields.image({
          label: "Photo",
          directory: "public/images/rooms",
          publicPath: "/images/rooms/",
        }),
        { label: "Photos de la chambre (défilement carrousel)", itemLabel: (p) => (p.value ? "Photo" : "Photo") }
      ),
      bed: fields.text({ label: "Lit (ex. « King size », « Baldaquin Queen »)" }),
      floor: fields.text({ label: "Étage (préciser « sans ascenseur » si concerné)" }),
      orientation: fields.text({ label: "Orientation / exposition" }),
      ac: fields.text({ label: "Climatisation (laisser vide si pas de clim ; sinon « Réversible »)" }),
      bathroom: fields.text({ label: "Salle de bain (baignoire / douche)" }),
      view: fields.text({ label: "Vue" }),
      amenities: fields.text({ label: "Équipements (ex. « Plateau de courtoisie · Wifi 6 »)" }),
      text: fields.text({ label: "Description", multiline: true }),
      note: fields.text({ label: "À savoir (mention importante, ex. « 2e étage sans ascenseur »)", multiline: true }),
    }),
    { label: "Chambres (liste, optionnel)", itemLabel: (p) => p.fields.name.value || "Chambre" }
  ),
  testimonial: fields.object(
    {
      text: fields.text({ label: "Citation", multiline: true }),
      author: fields.text({ label: "Auteur" }),
    },
    { label: "Témoignage (optionnel)" }
  ),
  faqHead: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      title: fields.text({ label: "Titre de la section FAQ" }),
    },
    { label: "FAQ : en-tête" }
  ),
  faq: fields.array(
    fields.object({
      q: fields.text({ label: "Question" }),
      a: fields.text({ label: "Réponse", multiline: true }),
    }),
    { label: "FAQ (questions / réponses)", itemLabel: (p) => p.fields.q.value || "Question" }
  ),
  final: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      titleLine1: fields.text({ label: "Titre (ligne 1)" }),
      titleLine2Italic: fields.text({ label: "Titre (ligne 2, en italique)" }),
      text: fields.text({ label: "Texte", multiline: true }),
      submitLabel: fields.text({ label: "Bouton du formulaire" }),
      responseLine: fields.text({ label: "Ligne « réponse sous 24h »" }),
    },
    { label: "Section contact" }
  ),
};

const contactSchema = {
  title: fields.text({ label: "Titre de l'onglet (SEO)" }),
  description: fields.text({ label: "Méta description (SEO)", multiline: true }),
  hero: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      titleLine1: fields.text({ label: "Titre (ligne 1)" }),
      titleLine2Italic: fields.text({ label: "Titre (ligne 2, en italique)" }),
      lead: fields.text({ label: "Texte d'accroche", multiline: true }),
    },
    { label: "Hero" }
  ),
  infoTitle: fields.text({ label: "Coordonnées : titre" }),
  infoNote: fields.text({ label: "Coordonnées : note", multiline: true }),
  formIntro: fields.text({ label: "Intro du formulaire", multiline: true }),
  submitLabel: fields.text({ label: "Bouton du formulaire" }),
  responseLine: fields.text({ label: "Ligne « réponse sous 24h »" }),
};

// Textes système : pages « Merci » et « 404 », bandeau cookies, encart newsletter.
// Petits textes visibles sur le site mais qui ne sont pas des pages éditoriales.
const linkPair = () =>
  fields.array(
    fields.object({
      label: fields.text({ label: "Libellé" }),
      href: fields.text({ label: "Lien" }),
    }),
    { label: "Liens", itemLabel: (p) => p.fields.label.value || "Lien" }
  );

const siteTextsSchema = {
  thanks: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      titleLine1: fields.text({ label: "Titre (ligne 1)" }),
      titleLine2Italic: fields.text({ label: "Titre (ligne 2, en italique)" }),
      lead: fields.text({ label: "Texte", multiline: true }),
      response: fields.text({ label: "Ligne « réponse sous 24h »" }),
      home: fields.text({ label: "Bouton retour à l'accueil" }),
      exploreTitle: fields.text({ label: "Titre « en attendant, explorez »" }),
      links: linkPair(),
    },
    { label: "Page « Merci » (après envoi d'un formulaire)" }
  ),
  notFound: fields.object(
    {
      eyebrow: fields.text({ label: "Sur-titre" }),
      title: fields.text({ label: "Titre" }),
      text: fields.text({ label: "Texte", multiline: true }),
      home: fields.text({ label: "Bouton retour à l'accueil" }),
      links: linkPair(),
    },
    { label: "Page « 404 » (page introuvable)" }
  ),
  cookies: fields.object(
    {
      text: fields.text({ label: "Texte du bandeau", multiline: true }),
      accept: fields.text({ label: "Bouton accepter" }),
      refuse: fields.text({ label: "Bouton refuser" }),
      link: fields.text({ label: "Libellé du lien confidentialité" }),
    },
    { label: "Bandeau cookies" }
  ),
  newsletter: fields.object(
    {
      title: fields.text({ label: "Titre" }),
      lead: fields.text({ label: "Sous-titre", multiline: true }),
      placeholder: fields.text({ label: "Champ email (texte d'invite)" }),
      button: fields.text({ label: "Bouton" }),
      ok: fields.text({ label: "Message de succès" }),
      err: fields.text({ label: "Message d'erreur" }),
    },
    { label: "Encart newsletter (bas de page)" }
  ),
};

// ---- Singletons : une entrée par page, contenu nesté par langue ----
// Sections Français / English / Italiano dans le même écran d'édition : on édite
// la page d'accueil et on voit/corrige directement le wording IT en dessous.
const langSections = (schema: any) => ({
  fr: fields.object(schema, {
    label: "Français",
    description: "La version de référence. C'est ici qu'on écrit et qu'on corrige le texte.",
  }),
  en: fields.object(schema, {
    label: "English",
    description:
      "Version anglaise, traduite automatiquement depuis le français. Modifiable, mais une correction sera écrasée à la prochaine traduction.",
  }),
  it: fields.object(schema, {
    label: "Italiano",
    description:
      "Version italienne, traduite automatiquement depuis le français. Modifiable, mais une correction sera écrasée à la prochaine traduction.",
  }),
});

// Schéma partagé des articles de blog (identique pour les 3 langues).
const articleSchemaFields = {
  title: fields.slug({ name: { label: "Titre" } }),
  description: fields.text({ label: "Méta description (SEO)", multiline: true }),
  publishedAt: fields.date({ label: "Date de publication" }),
  updatedAt: fields.date({ label: "Date de mise à jour (optionnel)" }),
  author: fields.select({
    label: "Auteur",
    options: [
      { label: "Lodovica", value: "lodovica" },
      { label: "Patrick", value: "patrick" },
    ],
    defaultValue: "lodovica",
  }),
  category: fields.select({
    label: "Catégorie",
    options: [
      { label: "Mariage", value: "mariage" },
      { label: "Séjour & tourisme", value: "sejour" },
      { label: "Séminaire", value: "seminaire" },
      { label: "Famille & groupes", value: "famille" },
      { label: "Retraites & bien-être", value: "retraite" },
      { label: "Art de vivre", value: "art-de-vivre" },
    ],
    defaultValue: "art-de-vivre",
  }),
  cover: fields.image({
    label: "Image de couverture",
    directory: "public/images/articles",
    publicPath: "/images/articles/",
  }),
  keywords: fields.array(fields.text({ label: "Mot-clé" }), {
    label: "Mots-clés associés (SEO + recherche)",
    description: "Termes ciblés par l'article. Servent à la recherche du blog et au référencement.",
    itemLabel: (props: any) => props.value,
  }),
  faq: fields.array(
    fields.object({
      q: fields.text({ label: "Question" }),
      a: fields.text({ label: "Réponse", multiline: true }),
    }),
    {
      label: "FAQ (questions / réponses)",
      description: "Optionnel. Affiché en bas de l'article + balisé FAQPage (positions zéro Google).",
      itemLabel: (p: any) => p.fields.q.value || "Question",
    }
  ),
  body: fields.markdoc({
    label: "Contenu de l'article",
    options: { image: { directory: "public/images/articles", publicPath: "/images/articles/" } },
  }),
};

// FR = source rédigée à la main. EN/IT = générés par scripts/translate-articles.mjs
// (DeepL), modifiables ensuite dans Keystatic. Régénérer écrase les corrections.
const articlesCollection = (label: string, dir: string, previewBase: string) =>
  collection({
    label,
    slugField: "title",
    path: `src/content/${dir}/*`,
    format: { contentField: "body" },
    previewUrl: `${previewBase}/{slug}`,
    schema: articleSchemaFields,
  });

// FR = source rédigée à la main. EN/IT = générés par scripts/translate-pages.mjs (DeepL).
const pagesCollection = (label: string, dir: string, previewBase: string) =>
  collection({
    label,
    slugField: "title",
    path: `src/content/${dir}/*`,
    format: { contentField: "body" },
    previewUrl: `${previewBase}/{slug}`,
    schema: {
      title: fields.slug({
        name: { label: "Titre de la page" },
        slug: { label: "Adresse (URL)", description: "L'adresse de la page, ex. « tarifs » → /tarifs" },
      }),
      description: fields.text({ label: "Méta description (SEO)", multiline: true }),
      layout: fields.select({
        label: "Type de mise en page",
        description:
          "« Éditoriale » = grande photo et mise en page magazine (comme Activités). « Sobre » = texte seul, sans photo ni bouton, pour les pages légales.",
        options: [
          { label: "Éditoriale (avec photo)", value: "editorial" },
          { label: "Sobre (page légale, texte seul)", value: "simple" },
        ],
        defaultValue: "editorial",
      }),
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
  });

export default config({
  storage: useGithub
    ? { kind: "github", repo: { owner: "La-Huberdiere", name: "huberdiere-site" } }
    : { kind: "local" },
  ui: {
    brand: { name: "Château de la Huberdière", mark: brandMark },
    navigation: {
      "Les pages du site": [
        "homepage",
        "mariage",
        "seminaire",
        "famille",
        "retraite",
        "sejour",
        "restauration",
        "contact",
        "galerie",
      ],
      "Le blog": ["articles"],
      "Réglages du site": ["settings", "reviews", "siteTexts"],
      "Autres pages": ["pages"],
      "Traductions automatiques (ne pas modifier)": ["pagesEn", "pagesIt", "articlesEn", "articlesIt"],
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
    seminaire: singleton({
      label: "Page Séminaire (FR · EN · IT)",
      path: "src/data/seminaire",
      format: { data: "json" },
      previewUrl: "/seminaire",
      schema: langSections(mariageSchema),
    }),
    famille: singleton({
      label: "Page Réunions de famille (FR · EN · IT)",
      path: "src/data/famille",
      format: { data: "json" },
      previewUrl: "/famille",
      schema: langSections(mariageSchema),
    }),
    retraite: singleton({
      label: "Page Retraites & ateliers (FR · EN · IT)",
      path: "src/data/retraite",
      format: { data: "json" },
      previewUrl: "/retraite",
      schema: langSections(mariageSchema),
    }),
    sejour: singleton({
      label: "Page Chambres d'hôtes / séjour (FR · EN · IT)",
      path: "src/data/sejour",
      format: { data: "json" },
      previewUrl: "/sejour",
      schema: langSections(mariageSchema),
    }),
    restauration: singleton({
      label: "Page Restauration (FR · EN · IT)",
      path: "src/data/restauration",
      format: { data: "json" },
      previewUrl: "/restauration",
      schema: langSections(mariageSchema),
    }),
    contact: singleton({
      label: "Page Contact (FR · EN · IT)",
      path: "src/data/contact",
      format: { data: "json" },
      previewUrl: "/contact",
      schema: langSections(contactSchema),
    }),
    galerie: singleton({
      label: "Galerie photo (page /galerie)",
      path: "src/data/galerie",
      format: { data: "json" },
      previewUrl: "/galerie",
      schema: {
        leadFr: fields.text({
          label: "Phrase d'intro de la page : FR",
          multiline: true,
          description: "La ligne sous le titre « Galerie », en haut de la page.",
        }),
        leadEn: fields.text({ label: "Phrase d'intro de la page : EN", multiline: true }),
        leadIt: fields.text({ label: "Phrase d'intro de la page : IT", multiline: true }),
        chapters: fields.array(
          fields.object({
            titleFr: fields.text({ label: "Titre du chapitre : FR" }),
            titleEn: fields.text({ label: "Titre du chapitre : EN" }),
            titleIt: fields.text({ label: "Titre du chapitre : IT" }),
            introFr: fields.text({ label: "Texte du chapitre : FR", multiline: true }),
            introEn: fields.text({ label: "Texte du chapitre : EN", multiline: true }),
            introIt: fields.text({ label: "Texte du chapitre : IT", multiline: true }),
            themes: fields.multiselect({
              label: "Thèmes de photos affichés dans ce chapitre",
              description:
                "Les photos viennent de la bibliothèque du château, rangée par thème. Cochez les thèmes à regrouper dans ce chapitre.",
              options: [
                { label: "Chambres", value: "chambres" },
                { label: "Château (extérieur)", value: "chateau-exterieur" },
                { label: "Jardin & fleurs", value: "jardin-fleurs" },
                { label: "Piscine", value: "piscine" },
                { label: "Salons (intérieurs)", value: "salons-interieurs" },
                { label: "Table & restauration", value: "restauration" },
                { label: "Mariage", value: "mariage" },
                { label: "Séminaire", value: "seminaire" },
                { label: "Retraite & yoga", value: "retraite-yoga" },
                { label: "Famille", value: "famille" },
                { label: "Fondateurs", value: "fondateurs" },
              ],
            }),
            hidden: fields.checkbox({
              label: "Masquer ce chapitre",
              description: "Coché, le chapitre n'apparaît pas sur le site (les photos restent en réserve).",
              defaultValue: false,
            }),
          }),
          {
            label: "Chapitres de la galerie",
            description:
              "L'ordre des chapitres ici est l'ordre affiché sur le site. Les photos et leur qualité ne changent pas : on choisit seulement les textes, l'ordre et les thèmes regroupés.",
            itemLabel: (p) => p.fields.titleFr.value || "Chapitre",
          }
        ),
      },
    }),
    settings: singleton({
      label: "Réglages header & footer (FR · EN · IT)",
      path: "src/data/settings",
      format: { data: "json" },
      schema: langSections(settingsSchema),
    }),
    siteTexts: singleton({
      label: "Textes du site (Merci, 404, cookies, newsletter)",
      path: "src/data/site-texts",
      format: { data: "json" },
      schema: langSections(siteTextsSchema),
    }),
    reviews: singleton({
      label: "Avis clients (home)",
      path: "src/data/reviews",
      format: { data: "json" },
      previewUrl: "/#avis",
      schema: {
        ratingValue: fields.text({ label: "Note moyenne (ex. 9.5)" }),
        bestRating: fields.text({ label: "Note maximale (ex. 10)" }),
        reviewCount: fields.text({ label: "Nombre total d'avis (ex. 42)" }),
        source: fields.text({ label: "Source principale (ex. Booking.com)" }),
        ratings: fields.array(
          fields.object({
            source: fields.text({ label: "Plateforme (ex. Booking.com, Google)" }),
            value: fields.text({ label: "Note (ex. 9.5)" }),
            best: fields.text({ label: "Note maximale (ex. 10)" }),
            count: fields.text({ label: "Nombre d'avis (ex. 120)" }),
          }),
          {
            label: "Notes par plateforme (badges de la section avis)",
            description: "Une ligne par plateforme. Alimente les notes affichées, ex. Booking 9,5/10 et Google 4,9/5.",
            itemLabel: (p) => p.fields.source.value || "Plateforme",
          }
        ),
        head: fields.object(
          {
            fr: fields.object(
              { eyebrow: fields.text({ label: "Sur-titre" }), title: fields.text({ label: "Titre" }) },
              { label: "Français" }
            ),
            en: fields.object(
              { eyebrow: fields.text({ label: "Eyebrow" }), title: fields.text({ label: "Title" }) },
              { label: "English" }
            ),
            it: fields.object(
              { eyebrow: fields.text({ label: "Sopratitolo" }), title: fields.text({ label: "Titolo" }) },
              { label: "Italiano" }
            ),
          },
          { label: "Intitulé de la section (par langue)" }
        ),
        items: fields.array(
          fields.object({
            author: fields.text({ label: "Auteur (prénom ou prénom + initiale)" }),
            location: fields.text({ label: "Lieu / pays (optionnel)" }),
            source: fields.text({ label: "Source (ex. Booking, Google)" }),
            rating: fields.text({ label: "Note de cet avis (ex. 10, optionnel)" }),
            date: fields.text({ label: "Date AAAA-MM-JJ (optionnel)" }),
            text: fields.text({ label: "Avis (français)", multiline: true }),
            textEn: fields.text({ label: "Avis (anglais)", multiline: true }),
            textIt: fields.text({ label: "Avis (italien)", multiline: true }),
          }),
          {
            label: "Avis affichés",
            itemLabel: (props) => props.fields.author.value || "Avis",
          }
        ),
      },
    }),
  },
  collections: {
    pages: pagesCollection("Pages libres (activités, notre histoire...)", "pages", "/"),
    pagesEn: pagesCollection("Pages libres · EN (auto)", "pages-en", "/en"),
    pagesIt: pagesCollection("Pages libres · IT (auto)", "pages-it", "/it"),
    articles: articlesCollection("Articles du blog", "articles", "/blog"),
    articlesEn: articlesCollection("Articles · EN (auto)", "articles-en", "/en/blog"),
    articlesIt: articlesCollection("Articles · IT (auto)", "articles-it", "/it/blog"),
  },
});

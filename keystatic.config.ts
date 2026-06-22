import { config, singleton, collection, fields } from "@keystatic/core";

// Config Keystatic (test ergonomie vs Pages CMS) — branche keystatic-test.
// Éditeur accessible sur /keystatic en local. Mode "local" : écrit dans les
// fichiers du dépôt, comme Pages CMS le ferait via GitHub.
//
// La homepage reprend le même schéma que .pages.yml / src/data/homepage.json.
// La collection Articles montre l'éditeur de contenu riche de Keystatic.

export default config({
  storage: { kind: "local" },
  ui: {
    brand: { name: "Château de la Huberdière" },
  },
  singletons: {
    homepage: singleton({
      label: "Page d'accueil",
      path: "src/data/homepage",
      format: { data: "json" },
      schema: {
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
      },
    }),
  },
  collections: {
    articles: collection({
      label: "Articles (blog SEO)",
      slugField: "title",
      path: "src/content/articles/*",
      format: { contentField: "body" },
      schema: {
        title: fields.slug({ name: { label: "Titre" } }),
        description: fields.text({ label: "Méta description (SEO)", multiline: true }),
        publishedAt: fields.date({ label: "Date de publication" }),
        cover: fields.image({
          label: "Image de couverture",
          directory: "src/assets/articles",
          publicPath: "/src/assets/articles/",
        }),
        body: fields.markdoc({ label: "Contenu de l'article" }),
      },
    }),
  },
});

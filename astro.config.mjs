import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";
import sitemap from "@astrojs/sitemap";

// V0 du Château de la Huberdière — site statique Astro + 1 fonction serverless
// (src/pages/api/lead.js) pour la réception des formulaires et la connexion Brevo.
// Branche keystatic-test : ajout de l'éditeur Keystatic (route /keystatic) pour
// comparer l'ergonomie avec Pages CMS. React est requis par l'UI Keystatic.
export default defineConfig({
  site: "https://www.chateaudelahuberdiere.com",
  output: "static",
  // URLs sans slash final, alignées sur les canonical/hreflang (sinon le sitemap
  // émet /mariage/ alors que la page se déclare canonique en /mariage → signal
  // contradictoire et budget de crawl gaspillé).
  trailingSlash: "never",
  adapter: vercel({ maxDuration: 60 }),
  integrations: [
    react(),
    keystatic(),
    sitemap({
      i18n: {
        defaultLocale: "fr",
        locales: { fr: "fr-FR", en: "en-GB", it: "it-IT" },
      },
      // Exclut les pages sans valeur d'indexation (remerciement, éditeur).
      filter: (page) =>
        !/\/merci|\/keystatic/.test(page),
    }),
  ],
  // Multilingue calé sur le site Wix actuel : FR par défaut (sans préfixe),
  // EN sur /en, IT sur /it.
  i18n: {
    locales: ["fr", "en", "it"],
    defaultLocale: "fr",
    routing: { prefixDefaultLocale: false },
  },
  build: { inlineStylesheets: "auto" },
  // Sans ça, Astro ignore l'en-tête x-forwarded-host derrière le proxy Vercel et
  // reconstruit request.url en https://localhost → Keystatic génère un mauvais
  // redirect_uri OAuth GitHub. On autorise les domaines Vercel + le domaine final.
  security: {
    allowedDomains: [
      { hostname: "**.vercel.app", protocol: "https" },
      { hostname: "www.chateaudelahuberdiere.com", protocol: "https" },
      { hostname: "chateaudelahuberdiere.com", protocol: "https" },
    ],
  },
});

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
      // Pas de bloc `i18n` ici : depuis que les slugs EN/IT sont localisés, l'auto-
      // appariement hreflang du sitemap (qui suppose le MÊME chemin entre langues)
      // produirait des alternates faux (ex. /it/chateau-wedding-loire inexistant).
      // Le hreflang correct est émis dans le <head> de chaque page (Base.astro),
      // c'est celui que Google lit en priorité. Le sitemap liste toutes les URLs.
      // Exclut les pages sans valeur d'indexation (remerciement, 404, éditeur).
      filter: (page) =>
        !/\/merci|\/404|\/keystatic/.test(page),
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

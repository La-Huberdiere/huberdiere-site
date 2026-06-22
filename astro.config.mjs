import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";

// V0 du Château de la Huberdière — site statique Astro + 1 fonction serverless
// (src/pages/api/lead.js) pour la réception des formulaires et la connexion Brevo.
// Branche keystatic-test : ajout de l'éditeur Keystatic (route /keystatic) pour
// comparer l'ergonomie avec Pages CMS. React est requis par l'UI Keystatic.
export default defineConfig({
  site: "https://www.chateaudelahuberdiere.com",
  output: "static",
  adapter: vercel(),
  integrations: [react(), keystatic()],
  build: { inlineStylesheets: "auto" },
});

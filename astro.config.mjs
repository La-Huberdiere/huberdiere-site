import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

// V0 du Château de la Huberdière — site statique Astro + 1 fonction serverless
// (src/pages/api/lead.js) pour la réception des formulaires et la connexion Brevo.
export default defineConfig({
  site: "https://www.chateaudelahuberdiere.com",
  output: "static",
  adapter: vercel(),
  build: { inlineStylesheets: "auto" },
});

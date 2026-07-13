// Post-build : rend les pages 404 par langue réellement servies par Vercel.
//
// L'adaptateur @astrojs/vercel génère une route attrape-tout finale
//   { src: "^/.*$", dest: "/404.html", status: 404 }
// qui envoie TOUTES les URL manquantes (y compris /en/* et /it/*) sur la 404
// française. On insère juste avant deux routes qui renvoient les URL manquantes
// d'une locale vers sa propre page 404 (statut 404 conservé, bon pour le SEO).
//
// Idempotent, défensif : si la structure change (nouvelle version de l'adaptateur),
// on n'insère rien et on prévient, sans casser le build.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CONFIG = ".vercel/output/config.json";

if (!existsSync(CONFIG)) {
  console.warn(`[patch-404] ${CONFIG} introuvable, rien à patcher.`);
  process.exit(0);
}

const cfg = JSON.parse(readFileSync(CONFIG, "utf8"));
if (!Array.isArray(cfg.routes)) {
  console.warn("[patch-404] pas de tableau routes, aucune modif.");
  process.exit(0);
}

// Une route 404 par locale préfixée. dest = fichier statique réellement généré
// (Astro produit en/404/index.html en mode "directory").
const localeRoutes = [
  { src: "^/en(?:/.*)?$", dest: "/en/404/index.html", status: 404 },
  { src: "^/it(?:/.*)?$", dest: "/it/404/index.html", status: 404 },
];

if (cfg.routes.some((r) => r && r.dest === "/en/404/index.html")) {
  console.log("[patch-404] déjà patché, rien à faire.");
  process.exit(0);
}

const idx = cfg.routes.findIndex(
  (r) => r && r.src === "^/.*$" && r.status === 404
);
if (idx === -1) {
  console.warn("[patch-404] route attrape-tout 404 introuvable, aucune modif.");
  process.exit(0);
}

cfg.routes.splice(idx, 0, ...localeRoutes);
writeFileSync(CONFIG, JSON.stringify(cfg, null, 2));
console.log("[patch-404] routes 404 EN/IT insérées avant l'attrape-tout.");

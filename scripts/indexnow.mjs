// Soumet des URLs à IndexNow (Bing, Yandex, Seznam, Naver... PAS Google, qui ne
// supporte pas IndexNow). Un seul POST notifie tous les moteurs participants.
//
// Prérequis : le fichier de clé public/<key>.txt doit être EN LIGNE (déployé) avant
// le ping, car IndexNow vérifie la propriété en lisant https://<host>/<key>.txt.
//
// Usage :
//   node scripts/indexnow.mjs <url1> [url2] ...     (URLs absolues ou chemins /blog/...)
//   node scripts/indexnow.mjs --slug prix-mariage-chateau-loire   (pousse les 3 langues)
//
// La clé est lue depuis public/<hex>.txt (le fichier de vérification lui-même).

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "www.chateaudelahuberdiere.com";

function loadKey() {
  const pub = join(ROOT, "public");
  const keyFile = readdirSync(pub).find((f) => /^[a-f0-9]{16,}\.txt$/i.test(f));
  if (!keyFile) throw new Error("Aucun fichier de clé IndexNow dans public/ (public/<hex>.txt).");
  const key = readFileSync(join(pub, keyFile), "utf8").trim();
  return { key, keyLocation: `https://${HOST}/${keyFile}` };
}

function toUrl(arg) {
  if (/^https?:\/\//i.test(arg)) return arg;
  return `https://${HOST}${arg.startsWith("/") ? "" : "/"}${arg}`;
}

function expandSlug(slug) {
  // Un article = 3 URLs (FR sans préfixe, EN, IT).
  return [`/blog/${slug}`, `/en/blog/${slug}`, `/it/blog/${slug}`].map(toUrl);
}

const args = process.argv.slice(2);
let urls = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--slug") urls.push(...expandSlug(args[++i]));
  else urls.push(toUrl(args[i]));
}
urls = [...new Set(urls)];

if (!urls.length) {
  console.error("Aucune URL. Usage : node scripts/indexnow.mjs <url|/chemin> ... | --slug <slug>");
  process.exit(1);
}

const { key, keyLocation } = loadKey();
const body = { host: HOST, key, keyLocation, urlList: urls };

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

// IndexNow renvoie 200 (accepté) ou 202 (accepté, en cours). 403 = clé non vérifiée
// (le fichier public/<key>.txt n'est pas encore en ligne). 422 = URL/clé incohérente.
const txt = await res.text().catch(() => "");
console.log(`IndexNow ${res.status} ${res.statusText} — ${urls.length} URL(s) :`);
urls.forEach((u) => console.log("  " + u));
if (![200, 202].includes(res.status)) {
  console.error(`Échec IndexNow (${res.status}). ${txt}`);
  console.error("403 => le fichier de clé n'est pas encore déployé (déploie d'abord). 422 => host/clé incohérents.");
  process.exit(1);
}
console.log("OK : soumis à Bing / Yandex / Seznam / Naver (Google n'utilise pas IndexNow).");

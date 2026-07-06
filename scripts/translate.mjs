// Traduit le contenu FR (src/data/fr/*.json) vers EN et IT via l'API DeepL.
// Usage : node scripts/translate.mjs            (toutes les pages, EN + IT)
//         node scripts/translate.mjs homepage   (une page)
// Clé : DEEPL_API_KEY dans .env. Le suffixe :fx => endpoint Free (api-free).
// Idempotent : régénère en/it depuis fr. À relire ensuite dans Keystatic.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- charge DEEPL_API_KEY depuis .env ---
const env = readFileSync(join(ROOT, ".env"), "utf8");
const KEY = (env.match(/^DEEPL_API_KEY=(.+)$/m)?.[1] || "").trim();
if (!KEY) {
  console.error("✗ DEEPL_API_KEY introuvable dans .env");
  process.exit(1);
}
const ENDPOINT = KEY.endsWith(":fx")
  ? "https://api-free.deepl.com/v2/translate"
  : "https://api.deepl.com/v2/translate";

// Clés à NE PAS traduire (liens, contacts, nom propre, mesures).
const SKIP = new Set(["email", "phone", "phoneHref", "big", "brandName", "name", "size", "photo", "photos"]);
const skipKey = (k) => SKIP.has(k) || /href$/i.test(k);

const PAGES = process.argv[2] ? [process.argv[2]] : ["homepage", "mariage", "settings"];
const TARGETS = [
  { code: "en", deepl: "EN-GB" },
  { code: "it", deepl: "IT" },
];

// Collecte récursive des chaînes à traduire, avec un setter pour réinjecter.
function collect(node, keyName, jobs) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => {
      if (typeof v === "string") {
        if (!skipKey(keyName) && v.trim()) jobs.push({ text: v, set: (t) => (node[i] = t) });
      } else collect(v, keyName, jobs);
    });
  } else if (node && typeof node === "object") {
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === "string") {
        if (!skipKey(k) && v.trim()) jobs.push({ text: v, set: (t) => (node[k] = t) });
      } else collect(v, k, jobs);
    }
  }
}

async function deepl(texts, target) {
  const out = [];
  for (let i = 0; i < texts.length; i += 50) {
    const chunk = texts.slice(i, i + 50);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: chunk, source_lang: "FR", target_lang: target }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`DeepL ${res.status} : ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    out.push(...data.translations.map((t) => t.text));
  }
  return out;
}

// Données nestées par langue : src/data/{page}.json = { fr, en, it }.
// On lit le FR, on traduit, on réécrit en/it dans le même fichier.
for (const page of PAGES) {
  const file = join(ROOT, "src/data", `${page}.json`);
  const all = JSON.parse(readFileSync(file, "utf8"));
  for (const { code, deepl: target } of TARGETS) {
    const clone = JSON.parse(JSON.stringify(all.fr));
    const jobs = [];
    collect(clone, "", jobs);
    const translated = await deepl(jobs.map((j) => j.text), target);
    jobs.forEach((j, i) => j.set(translated[i]));
    all[code] = clone;
    console.log(`✓ ${page} → ${code} (${jobs.length} chaînes)`);
  }
  writeFileSync(file, JSON.stringify(all, null, 2) + "\n");
}
console.log("Terminé. Relis dans Keystatic avant de déployer.");

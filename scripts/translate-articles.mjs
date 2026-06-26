// Traduit les articles de blog FR (src/content/articles/*.mdoc) vers EN et IT via
// l'API DeepL, et écrit src/content/articles-{en,it}/*.mdoc.
// Usage : node scripts/translate-articles.mjs                 (tous les articles, EN + IT)
//         node scripts/translate-articles.mjs <slug> [en|it]  (un article / une langue)
// Clé : DEEPL_API_KEY dans .env (suffixe :fx => endpoint Free).
//
// Ce qui est traduit : title, description, keywords[], faq[].q/.a et le corps markdoc.
// Ce qui est conservé du FR : author, category, publishedAt, updatedAt, cover.
// Les liens internes du corps (/sejour, /blog/...) sont préfixés selon la langue.
// IDEMPOTENT : régénère EN/IT depuis FR (écrase les corrections faites dans Keystatic).

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import yaml from "js-yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src/content/articles");

const env = readFileSync(join(ROOT, ".env"), "utf8");
const KEY = (env.match(/^DEEPL_API_KEY=(.+)$/m)?.[1] || "").trim();
if (!KEY) { console.error("✗ DEEPL_API_KEY introuvable dans .env"); process.exit(1); }
const ENDPOINT = KEY.endsWith(":fx")
  ? "https://api-free.deepl.com/v2/translate"
  : "https://api.deepl.com/v2/translate";

const argSlug = process.argv[2] && !["en", "it"].includes(process.argv[2]) ? process.argv[2] : null;
const argLang = ["en", "it"].includes(process.argv[process.argv.length - 1]) ? process.argv[process.argv.length - 1] : null;
const TARGETS = [
  { code: "en", deepl: "EN-GB" },
  { code: "it", deepl: "IT" },
].filter((t) => !argLang || t.code === argLang);

async function deepl(texts, target) {
  const out = [];
  for (let i = 0; i < texts.length; i += 50) {
    const chunk = texts.slice(i, i + 50);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${KEY}`, "Content-Type": "application/json" },
      // tag_handling=xml + ignore_tags=x : les URL des liens (enveloppées dans <x>…</x>)
      // ne sont PAS traduites (sinon DeepL traduit les slugs et casse les liens).
      body: JSON.stringify({
        text: chunk, source_lang: "FR", target_lang: target,
        preserve_formatting: true, tag_handling: "xml", ignore_tags: ["x"], outline_detection: false,
      }),
    });
    if (!res.ok) throw new Error(`DeepL ${res.status} : ${(await res.text()).slice(0, 200)}`);
    out.push(...(await res.json()).translations.map((t) => t.text));
  }
  return out;
}

// Protège les URL des liens markdown de la traduction, puis les restaure.
const protectLinks = (s) => s.replace(/\]\(([^)]+)\)/g, (_m, u) => `](<x>${u}</x>)`);
const restoreLinks = (s) => s.replace(/<x>([\s\S]*?)<\/x>/g, (_m, u) => u);

// Sépare un préfixe markdown (titre, liste, citation) du texte à traduire.
const MD_PREFIX = /^(\s*(?:#{1,6}\s+|>\s+|[-*+]\s+|\d+\.\s+))(.*)$/;

function parseMdoc(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("frontmatter introuvable");
  // FAILSAFE_SCHEMA : tout reste en chaînes (les dates ne deviennent pas des Date).
  return { data: yaml.load(m[1], { schema: yaml.FAILSAFE_SCHEMA }) || {}, body: m[2] };
}

const q = (s) => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\s*\n\s*/g, " ") + '"';

// Préfixe les liens internes du corps selon la langue (FR -> /en, /it).
function localizeLinks(body, code) {
  return body.replace(/\]\((\/[^)]*)\)/g, (full, url) => {
    if (url.startsWith(`/${code}/`)) return full;
    return `](/${code}${url})`;
  });
}

// Sérialise le frontmatter à la main, dans l'ordre/style des fichiers FR
// (titre/description/mots-clés/faq entre guillemets ; dates et champs techniques bruts).
function dumpFrontmatter(data) {
  const L = [];
  L.push(`title: ${q(data.title)}`);
  L.push(`description: ${q(data.description)}`);
  if (data.publishedAt) L.push(`publishedAt: ${data.publishedAt}`);
  if (data.updatedAt) L.push(`updatedAt: ${data.updatedAt}`);
  if (data.author) L.push(`author: ${data.author}`);
  if (data.category) L.push(`category: ${data.category}`);
  if (data.cover) L.push(`cover: ${data.cover}`);
  if (Array.isArray(data.keywords) && data.keywords.length) {
    L.push("keywords:");
    data.keywords.forEach((k) => L.push(`  - ${q(k)}`));
  }
  if (Array.isArray(data.faq) && data.faq.length) {
    L.push("faq:");
    data.faq.forEach((f) => { L.push(`  - q: ${q(f.q)}`); L.push(`    a: ${q(f.a)}`); });
  }
  return `---\n${L.join("\n")}\n---\n`;
}

function collectStrings(data, bodyLines) {
  const jobs = []; // { text, set }
  const push = (text, set) => { if (text && String(text).trim()) jobs.push({ text: String(text), set }); };
  push(data.title, (t) => (data.title = t));
  push(data.description, (t) => (data.description = t));
  (data.keywords || []).forEach((k, i) => push(k, (t) => (data.keywords[i] = t)));
  (data.faq || []).forEach((f, i) => {
    push(f.q, (t) => (data.faq[i].q = t));
    push(f.a, (t) => (data.faq[i].a = t));
  });
  // Corps ligne par ligne (préfixes markdown préservés, URL des liens protégées).
  bodyLines.forEach((line, i) => {
    if (!line.trim()) return;
    const mm = line.match(MD_PREFIX);
    const prefix = mm ? mm[1] : "";
    const text = mm ? mm[2] : line;
    push(protectLinks(text), (t) => (bodyLines[i] = prefix + restoreLinks(t)));
  });
  return jobs;
}

const files = readdirSync(SRC).filter((f) => f.endsWith(".mdoc") && (!argSlug || f === `${argSlug}.mdoc`));
if (!files.length) { console.error("✗ aucun article trouvé"); process.exit(1); }

for (const file of files) {
  const raw = readFileSync(join(SRC, file), "utf8");
  for (const { code, deepl: target } of TARGETS) {
    const { data, body } = parseMdoc(raw);
    const bodyLines = body.split("\n");
    const jobs = collectStrings(data, bodyLines);
    const translated = await deepl(jobs.map((j) => j.text), target);
    jobs.forEach((j, i) => j.set(translated[i]));
    const newBody = localizeLinks(bodyLines.join("\n"), code);
    const outDir = join(ROOT, `src/content/articles-${code}`);
    writeFileSync(join(outDir, file), dumpFrontmatter(data) + newBody);
    console.log(`✓ ${file} → ${code} (${jobs.length} segments)`);
  }
}
console.log("Terminé. Relis EN/IT dans Keystatic avant de déployer.");

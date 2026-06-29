// Traduit les pages libres FR (src/content/pages/*.mdoc) vers EN et IT via l'API
// DeepL, et écrit src/content/pages-{en,it}/*.mdoc.
// Usage : node scripts/translate-pages.mjs                 (toutes les pages, EN + IT)
//         node scripts/translate-pages.mjs <slug> [en|it]  (une page / une langue)
// Clé : DEEPL_API_KEY dans .env (suffixe :fx => endpoint Free).
//
// Traduit : title, description, corps markdoc. Les liens internes du corps sont
// préfixés selon la langue. IDEMPOTENT : régénère EN/IT depuis FR (écrase les
// corrections faites dans Keystatic).

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import yaml from "js-yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src/content/pages");

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
      body: JSON.stringify({
        text: chunk, source_lang: "FR", target_lang: target,
        preserve_formatting: true,
      }),
    });
    if (!res.ok) throw new Error(`DeepL ${res.status} : ${(await res.text()).slice(0, 200)}`);
    out.push(...(await res.json()).translations.map((t) => t.text));
  }
  return out;
}

const protectLinks = (s) => s.replace(/\]\(([^)]+)\)/g, (_m, u) => `](<x>${u}</x>)`);
const restoreLinks = (s) => s.replace(/<x>([\s\S]*?)<\/x>/g, (_m, u) => u);
const MD_PREFIX = /^(\s*(?:#{1,6}\s+|>\s+|[-*+]\s+|\d+\.\s+))(.*)$/;

function parseMdoc(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("frontmatter introuvable");
  return { data: yaml.load(m[1], { schema: yaml.FAILSAFE_SCHEMA }) || {}, body: m[2] };
}

const q = (s) => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\s*\n\s*/g, " ") + '"';

function localizeLinks(body, code) {
  return body.replace(/\]\((\/[^)]*)\)/g, (full, url) => {
    if (url.startsWith(`/${code}/`)) return full;
    return `](/${code}${url})`;
  });
}

function dumpFrontmatter(data) {
  return `---\ntitle: ${q(data.title)}\ndescription: ${q(data.description)}\n---\n`;
}

function collectStrings(data, bodyLines) {
  const jobs = [];
  const push = (text, set) => { if (text && String(text).trim()) jobs.push({ text: String(text), set }); };
  push(data.title, (t) => (data.title = t));
  push(data.description, (t) => (data.description = t));
  bodyLines.forEach((line, i) => {
    if (!line.trim()) return;
    const mm = line.match(MD_PREFIX);
    const prefix = mm ? mm[1] : "";
    const text = mm ? mm[2] : line;
    push(text, (t) => (bodyLines[i] = prefix + t));
  });
  return jobs;
}

const files = readdirSync(SRC).filter((f) => f.endsWith(".mdoc") && (!argSlug || f === `${argSlug}.mdoc`));
if (!files.length) { console.error("✗ aucune page trouvée"); process.exit(1); }

for (const file of files) {
  const raw = readFileSync(join(SRC, file), "utf8");
  for (const { code, deepl: target } of TARGETS) {
    const { data, body } = parseMdoc(raw);
    const bodyLines = body.split("\n");
    const jobs = collectStrings(data, bodyLines);
    const translated = await deepl(jobs.map((j) => j.text), target);
    jobs.forEach((j, i) => j.set(translated[i]));
    const newBody = localizeLinks(bodyLines.join("\n"), code);
    const outDir = join(ROOT, `src/content/pages-${code}`);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, file), dumpFrontmatter(data) + newBody);
    console.log(`✓ ${file} → ${code} (${jobs.length} segments)`);
  }
}
console.log("Terminé. Relis EN/IT dans Keystatic avant de déployer.");

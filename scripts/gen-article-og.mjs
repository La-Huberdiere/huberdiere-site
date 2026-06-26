// Génère les IMAGES DE PARTAGE SOCIAL (og:image) des articles, 1200×630, AVEC le
// titre + la catégorie + la signature incrustés. Ces images ne servent QU'AU partage
// (Facebook/LinkedIn/WhatsApp/Twitter), où elles s'affichent à un format fixe sans
// recadrage. Elles ne sont PAS utilisées comme cover sur le blog (la cover d'affichage
// reste une photo pure, cf. gen-article-covers.mjs, sinon le texte se fait rogner).
//
// Sortie : public/og/articles/<slug>.jpg (FR), public/og/articles/{en,it}/<slug>.jpg.
// Le fond = la cover de l'article (public/images/articles/...). Le titre = celui du
// frontmatter (donc traduit pour EN/IT). Lancer : node scripts/gen-article-og.mjs
// Relancer après ajout/traduction d'articles. JPG commités (Vercel ne régénère pas).
// NB : sharp/librsvg n'utilise que les polices SYSTÈME (Didot/Georgia sur macOS).

import sharp from "sharp";
import { readFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import yaml from "js-yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const W = 1200, H = 630;

// dir de contenu → langue + dossier de sortie.
const SOURCES = [
  { dir: "articles", lang: "fr", out: "og/articles" },
  { dir: "articles-en", lang: "en", out: "og/articles/en" },
  { dir: "articles-it", lang: "it", out: "og/articles/it" },
];

const CATEGORIES = {
  fr: { mariage: "Mariage", sejour: "Séjour & tourisme", seminaire: "Séminaire", famille: "Famille & groupes", retraite: "Retraites & bien-être", "art-de-vivre": "Art de vivre" },
  en: { mariage: "Weddings", sejour: "Stay & sightseeing", seminaire: "Seminars", famille: "Family & groups", retraite: "Retreats & wellness", "art-de-vivre": "Art of living" },
  it: { mariage: "Matrimoni", sejour: "Soggiorno e turismo", seminaire: "Seminari", famille: "Famiglia e gruppi", retraite: "Ritiri e benessere", "art-de-vivre": "Arte di vivere" },
};
const catLabel = (lang, id) => CATEGORIES[lang][id] ?? CATEGORIES[lang]["art-de-vivre"];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;").replace(/"/g, "&quot;");

function wrap(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars && line) { lines.push(line.trim()); line = w; }
    else line = (line + " " + w).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function overlaySvg(kicker, title) {
  const titleSize = 58, lineH = 70, padX = 80;
  const lines = wrap(title, 26);
  const baseY = H - 110 - lines.length * lineH + titleSize;
  const tspans = lines.map((l, i) => `<text x="${padX}" y="${baseY + i * lineH}" class="title">${esc(l)}</text>`).join("");
  return Buffer.from(`
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(20,10,10,0.20)"/>
      <stop offset="45%" stop-color="rgba(20,8,8,0.45)"/>
      <stop offset="100%" stop-color="rgba(40,6,6,0.88)"/>
    </linearGradient>
    <style>
      .kicker { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 22px; letter-spacing: 5px; fill: #f0d9d9; text-transform: uppercase; }
      .title { font-family: 'Didot', 'Playfair Display', Georgia, serif; font-size: ${titleSize}px; font-weight: 500; fill: #ffffff; }
      .sign { font-family: 'Didot', Georgia, serif; font-style: italic; font-size: 26px; fill: #f4f2ec; }
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="${padX}" y="${baseY - titleSize - 34}" width="64" height="3" fill="#8b0000"/>
  <text x="${padX}" y="${baseY - titleSize - 6}" class="kicker">${esc(kicker)}</text>
  ${tspans}
  <text x="${padX}" y="${H - 52}" class="sign">Château de la Huberdière</text>
</svg>`);
}

function parseFm(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  return m ? (yaml.load(m[1], { schema: yaml.FAILSAFE_SCHEMA }) || {}) : {};
}

async function main() {
  for (const { dir, lang, out } of SOURCES) {
    const srcDir = join(ROOT, "src/content", dir);
    if (!existsSync(srcDir)) continue;
    const outDir = join(PUBLIC, out);
    mkdirSync(outDir, { recursive: true });
    for (const file of readdirSync(srcDir).filter((f) => f.endsWith(".mdoc"))) {
      const slug = file.replace(/\.mdoc$/, "");
      const fm = parseFm(readFileSync(join(srcDir, file), "utf8"));
      if (!fm.cover || !fm.title) { console.warn("⚠ ignoré (cover/title manquant) :", dir, slug); continue; }
      const bgPath = join(PUBLIC, fm.cover.replace(/^\//, ""));
      if (!existsSync(bgPath)) { console.warn("⚠ cover introuvable :", fm.cover); continue; }
      const base = await sharp(bgPath).resize(W, H, { fit: "cover", position: "centre" }).toBuffer();
      await sharp(base)
        .composite([{ input: overlaySvg(catLabel(lang, fm.category), fm.title) }])
        .jpeg({ quality: 86, mozjpeg: true })
        .toFile(join(outDir, `${slug}.jpg`));
      console.log("✓", `${out}/${slug}.jpg`);
    }
  }
}

main();

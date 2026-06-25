// Génère les couvertures d'articles (1200×630) : photo du château + dégradé sombre
// + titre en titrage serif + signature, à la DA Huberdière. Sert de cover blog ET
// d'image OG (BlogPosting). Lancer : node scripts/gen-article-covers.mjs
// NB : sharp/librsvg n'utilise que les polices SYSTÈME (pas node_modules), d'où
// Didot/Georgia (macOS) pour le titre. Génération locale, les JPG sont commités.

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, "../src/assets");
const OUT = path.join(__dirname, "../public/images/articles");

const W = 1200, H = 630;

// slug → { photo, kicker (catégorie affichée), title }
const COVERS = [
  {
    slug: "chambres-hotes-amboise-chateau",
    photo: "SD_23.jpg",
    kicker: "Séjour & tourisme",
    title: "Chambres d'hôtes à Amboise : dormir dans un château de la Loire",
  },
  {
    slug: "organiser-mariage-au-chateau",
    photo: "SD_6.jpg",
    kicker: "Mariage",
    title: "Se marier au château : organiser un mariage en Val de Loire",
  },
  {
    slug: "visiter-chateaux-de-la-loire",
    photo: "SD_3.jpg",
    kicker: "Séjour & tourisme",
    title: "Visiter les châteaux de la Loire : itinéraire depuis Amboise",
  },
  {
    slug: "organiser-retraite-yoga-chateau",
    photo: "BD_5.jpg",
    kicker: "Retraites & bien-être",
    title: "Organiser une retraite de yoga dans un château en Touraine",
  },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;");

// Découpe un titre en lignes de ~maxChars caractères (équilibrage simple par mots).
function wrap(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function overlaySvg({ kicker, title }) {
  const titleSize = 58;
  const lineH = 70;
  const lines = wrap(title, 26);
  const blockH = lines.length * lineH;
  // Ancrage bas-gauche, padding 80.
  const padX = 80;
  const baseY = H - 96 - blockH + titleSize; // 1re ligne de titre
  const titleTspans = lines
    .map((l, i) => `<text x="${padX}" y="${baseY + i * lineH}" class="title">${esc(l)}</text>`)
    .join("");
  return Buffer.from(`
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(20,10,10,0.20)"/>
      <stop offset="45%" stop-color="rgba(20,8,8,0.45)"/>
      <stop offset="100%" stop-color="rgba(40,6,6,0.86)"/>
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
  ${titleTspans}
  <text x="${padX}" y="${H - 52}" class="sign">Château de la Huberdière</text>
</svg>`);
}

async function main() {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(OUT, { recursive: true });
  for (const c of COVERS) {
    const base = await sharp(path.join(ASSETS, c.photo))
      .resize(W, H, { fit: "cover", position: "centre" })
      .toBuffer();
    await sharp(base)
      .composite([{ input: overlaySvg(c) }])
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(path.join(OUT, `${c.slug}.jpg`));
    console.log("✓", c.slug + ".jpg");
  }
}

main();

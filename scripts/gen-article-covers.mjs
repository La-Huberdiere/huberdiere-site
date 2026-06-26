// Génère les couvertures d'articles (1200×630) : photo du château + léger
// dégradé de profondeur + signature de marque. PAS de titre incrusté : le titre
// et la catégorie sont rendus en HTML sur les cartes et l'article (sinon le texte
// se fait rogner sur les vignettes, et il fait doublon avec le H1). Sert de cover
// blog ET d'image OG (BlogPosting). Lancer : node scripts/gen-article-covers.mjs
// Pour un nouvel article : ajouter une entrée { slug, photo } dans COVERS, OU
// laisser le client uploader une photo dans Keystatic (champ « Image de couverture »).
// NB : sharp/librsvg n'utilise que les polices SYSTÈME (Didot/Georgia sur macOS).

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, "../src/assets");
const OUT = path.join(__dirname, "../public/images/articles");

const W = 1200, H = 630;

// slug → photo source (dans src/assets). Couvertures « propres », sans texte.
const COVERS = [
  { slug: "chambres-hotes-amboise-chateau", photo: "SD_23.jpg" },
  { slug: "organiser-mariage-au-chateau", photo: "SD_6.jpg" },
  { slug: "visiter-chateaux-de-la-loire", photo: "SD_3.jpg" },
  { slug: "organiser-retraite-yoga-chateau", photo: "BD_5.jpg" },
  { slug: "bienvenue-au-chateau", photo: "SD_9.jpg" },
];

// Dégradé doux (lisibilité/profondeur) + signature de marque discrète, sans titre.
function overlaySvg() {
  return Buffer.from(`
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(20,10,10,0.06)"/>
      <stop offset="58%" stop-color="rgba(20,8,8,0.10)"/>
      <stop offset="100%" stop-color="rgba(35,8,8,0.62)"/>
    </linearGradient>
    <style>
      .sign { font-family: 'Didot', 'Playfair Display', Georgia, serif; font-style: italic; font-size: 27px; fill: #f4f2ec; }
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="80" y="${H - 86}" width="52" height="3" fill="#8b0000"/>
  <text x="80" y="${H - 52}" class="sign">Château de la Huberdière</text>
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
      .composite([{ input: overlaySvg() }])
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(path.join(OUT, `${c.slug}.jpg`));
    console.log("✓", c.slug + ".jpg");
  }
}

main();

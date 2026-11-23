#!/usr/bin/env node
// Dérivés webp des couvertures d'articles (public/images/articles/<slug>.jpg).
//
// Le jpg 1200x630 reste la source : image OG, schema, repli. Les cartes du blog
// et des articles liés l'affichaient pourtant à 241-330 px de large, soit environ
// 120 Ko par carte et 1,5 à 3 Mo par page sur téléphone (audit du 23/11).
// On écrit à côté <slug>-600.webp et <slug>-1200.webp ; les composants ne s'en
// servent que si le fichier existe (coverSrcset de src/lib/blog.ts), donc une
// couverture sans dérivé s'affiche comme avant.
//
// Idempotent : ne refait un dérivé que s'il manque ou si le jpg est plus récent.
// Appelé par gen-article-covers.mjs et par le prebuild.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "../public/images/articles");
const SIZES = [600, 1200];

export async function genCoverWebp({ quiet = false } = {}) {
  let made = 0;
  for (const f of fs.readdirSync(DIR)) {
    if (!f.endsWith(".jpg")) continue;
    const src = path.join(DIR, f);
    const srcTime = fs.statSync(src).mtimeMs;
    for (const w of SIZES) {
      const out = path.join(DIR, f.replace(/\.jpg$/, `-${w}.webp`));
      if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= srcTime) continue;
      await sharp(src).resize({ width: w, withoutEnlargement: true }).webp({ quality: w === 600 ? 70 : 74 }).toFile(out);
      made++;
    }
  }
  if (!quiet) console.log(`couvertures webp : ${made} dérivé(s) écrit(s)`);
  return made;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await genCoverWebp();
}

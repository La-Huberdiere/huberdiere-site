// Déclinaisons des 4 photos de galerie des landings (public/images/landing/<cible>-g<n>.jpg).
// Chaque photo n'existait qu'en une taille (jusqu'à 1440 px, 339 Ko en webp) servie à tous
// les appareils. On génère <nom>-w480.webp et <nom>-w800.webp ; le <nom>.webp existant reste
// la plus grande version du srcset (MariagePage.astro).
// Un palier n'est produit que si la source est plus large que lui.
//
// Relançable : `node scripts/gen-landing-gallery.mjs`.
import sharp from "sharp";
import { readdir } from "node:fs/promises";
import path from "node:path";

const DIR = "public/images/landing";
const WIDTHS = [480, 800];
const QUALITY = 68;

const files = (await readdir(DIR)).filter((f) => /-g\d\.jpg$/.test(f));
for (const file of files.sort()) {
  const src = path.join(DIR, file);
  const base = file.replace(/\.jpg$/, "");
  const { width } = await sharp(src).metadata();
  const made = [];
  for (const w of WIDTHS) {
    if (w >= width) continue;
    const info = await sharp(src).resize({ width: w }).webp({ quality: QUALITY, effort: 5 }).toFile(path.join(DIR, `${base}-w${w}.webp`));
    made.push(`${w}:${Math.round(info.size / 1024)}Ko`);
  }
  console.log(base, width, made.join(" "));
}

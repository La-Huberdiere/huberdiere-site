#!/usr/bin/env node
// Dérivés webp redimensionnés des images servies depuis public/ sans srcset.
//
// - Couvertures d'articles (public/images/articles/<slug>.jpg, 1200x630) : le jpg
//   reste la source (image OG, schema, repli), les cartes du blog l'affichaient
//   à 241-330 px de large (environ 120 Ko par carte).
// - Photos des chambres (public/images/rooms/<nom>.webp, 1050 à 1400 px) : le
//   carrousel de /sejour les affiche à 346 px sur téléphone, 458 px sur ordinateur.
//
// Audit du 23/11. Les composants ne s'en servent que si les DEUX dérivés existent
// (src/lib/covers.ts) : une image ajoutée par le CMS s'affiche comme avant, plus
// lourde, tant que ce script n'a pas tourné. Idempotent : ne refait un dérivé que
// s'il manque ou si la source est plus récente. Appelé par gen-article-covers.mjs,
// le prebuild et le buildCommand de vercel.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "../public");

export const JEUX = [
  { dir: "images/articles", ext: ".jpg", sizes: [600, 1200], quality: { 600: 70, 1200: 74 } },
  { dir: "images/rooms", ext: ".webp", sizes: [700, 1000], quality: { 700: 72, 1000: 74 } },
];

const DERIVE = new RegExp(`-(${[...new Set(JEUX.flatMap((j) => j.sizes))].join("|")})\\.webp$`);

export async function genDerivesWebp({ quiet = false } = {}) {
  let made = 0;
  for (const j of JEUX) {
    const dir = path.join(PUBLIC, j.dir);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(j.ext) || DERIVE.test(f)) continue;
      const src = path.join(dir, f);
      const srcTime = fs.statSync(src).mtimeMs;
      for (const w of j.sizes) {
        const out = path.join(dir, f.slice(0, -j.ext.length) + `-${w}.webp`);
        if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= srcTime) continue;
        await sharp(src).resize({ width: w, withoutEnlargement: true }).webp({ quality: j.quality[w] }).toFile(out);
        made++;
      }
    }
  }
  if (!quiet) console.log(`dérivés webp : ${made} écrit(s)`);
  return made;
}

// Ancien nom, gardé pour gen-article-covers.mjs.
export const genCoverWebp = genDerivesWebp;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await genDerivesWebp();
}

// Recadrages verticaux des héros de pages activité, pour le mobile.
//
// Les héros de `public/images/landing/` sont des paysages servis en un seul
// fichier 1920 px. Sur téléphone, `.page-hero` fait ~375 x 620 : en object-fit
// cover, le navigateur met l'image à la hauteur du bloc et n'en montre plus que
// 40 % de la largeur, tout en téléchargeant les 100 %. On génère donc un
// recadrage 3/4 centré, décliné en trois largeurs, servi sous 768 px.
//
// Relançable : `node scripts/gen-landing-hero-mobile.mjs`.
import sharp from "sharp";
import { readdir } from "node:fs/promises";
import path from "node:path";

const DIR = "public/images/landing";
const RATIO = 3 / 4;
const WIDTHS = [720, 1080, 1440];
const QUALITY = 66;

const files = (await readdir(DIR)).filter((f) => /-hero\.jpg$/.test(f));

for (const file of files.sort()) {
  const src = path.join(DIR, file);
  const base = file.replace(/\.jpg$/, "");
  const { width, height } = await sharp(src).metadata();

  // Fenêtre 3/4 la plus large possible, centrée.
  const cropW = Math.min(width, Math.round(height * RATIO));
  const cropH = Math.min(height, Math.round(width / RATIO));
  const left = Math.round((width - cropW) / 2);
  const top = Math.round((height - cropH) / 2);

  for (const w of WIDTHS) {
    const out = path.join(DIR, `${base}-m${w}.webp`);
    await sharp(src)
      .extract({ left, top, width: cropW, height: cropH })
      .resize(w, Math.round(w / RATIO))
      .webp({ quality: QUALITY })
      .toFile(out);
  }
  console.log(`${base} ${width}x${height} -> ${cropW}x${cropH} @${left},${top}`);
}

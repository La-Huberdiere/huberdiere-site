// Génère les vignettes allégées de la page /galerie à partir de la bibliothèque
// (public/images/bibliotheque/<theme>/*.jpg, 2560px ~600 Ko chacune, 71 Mo au total).
// La mosaïque sert ces vignettes (bord long 1100px, q72) au lieu des originaux ;
// la visionneuse plein écran, elle, tire l'original 2560px à l'ouverture.
// Sans ça, /galerie chargerait 71 Mo. Relançable (idempotent, saute l'existant).
//
// Lancer : node scripts/gen-gallery-thumbs.mjs [--force]
import sharp from "sharp";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const LIB = join(ROOT, "public/images/bibliotheque");
const OUT = join(ROOT, "public/images/galerie-thumb");
const FORCE = process.argv.includes("--force");
const EDGE = 1100; // bord long de la vignette
const Q = 72;

const manifest = JSON.parse(readFileSync(join(LIB, "manifest.json"), "utf8"));
let done = 0,
  skipped = 0,
  bytes = 0;

for (const item of manifest.items) {
  const src = join(ROOT, "public/images", item.file); // item.file = "bibliotheque/<theme>/<name>.jpg"
  const rel = item.file.replace(/^bibliotheque\//, "");
  const out = join(OUT, rel);
  mkdirSync(dirname(out), { recursive: true });
  if (existsSync(out) && !FORCE) {
    skipped++;
    continue;
  }
  const info = await sharp(src)
    .resize(EDGE, EDGE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: Q, mozjpeg: true })
    .toFile(out);
  bytes += info.size;
  done++;
}

console.log(
  `Vignettes galerie : ${done} générées, ${skipped} déjà là. Poids nouveau lot : ${(bytes / 1024 / 1024).toFixed(1)} Mo.`
);

// Recadrages verticaux des héros, pour le mobile.
//
// Une photo de paysage mise à la hauteur d'un hero de téléphone n'est visible
// qu'au tiers de sa largeur, tout en étant téléchargée en entier. On prépare donc
// une version portrait de chaque héros, servie sous 768 px par un <picture>.
//
// Deux familles, deux formats :
//   - le hero de la home est très haut (le contenu est en flux normal), il lui
//     faut du 9/16. Sa source est src/assets/SD_2-mobile.jpg, générée à part.
//   - .page-hero et .free-hero font ~620 px de haut, le 3/4 leur suffit et
//     coûte deux fois moins lourd. C'est ce que produit ce script.
//
// Deux sorties selon l'origine de l'image :
//   - src/assets : on écrit un JPEG source, Astro s'occupe des déclinaisons.
//   - public : on écrit directement les webp aux largeurs utiles.
//
// Relançable : `node scripts/gen-hero-mobile.mjs`.
import sharp from "sharp";
import path from "node:path";

const RATIO = 3 / 4;

/** Héros importés comme assets Astro : une seule sortie, Astro fait le reste. */
const ASSETS = [
  { src: "src/assets/BD_5.jpg", out: "src/assets/BD_5-portrait.jpg" }, // contact
  { src: "src/assets/SD_2.jpg", out: "src/assets/SD_2-portrait.jpg" }, // page « notre histoire »
  { src: "src/assets/SD_4.jpg", out: "src/assets/SD_4-portrait.jpg" }, // page « activités »
  { src: "src/assets/SD_3.jpg", out: "src/assets/SD_3-portrait.jpg" }, // repli pages éditoriales
];

/** Héros servis depuis public/ : on écrit les largeurs finales en webp.
 *  La galerie ouvre sur la photo maîtresse du premier chapitre. Si ce chapitre
 *  change dans le CMS, relancer ce script avec la nouvelle source et mettre à
 *  jour HERO_SOURCE dans GalleryPage.astro, qui refuse le srcset s'il ne
 *  correspond plus (on préfère l'image d'origine à une image fausse). */
const PUBLIC_HEROES = [
  {
    src: "public/images/bibliotheque/chambres/chambre-01.jpg",
    out: "public/images/hero/galerie-hero",
    widths: [720, 1080, 1440, 1920],
  },
];

/** Fenêtre 3/4 la plus large possible, centrée. */
function window34(width, height) {
  return {
    left: Math.round((width - Math.min(width, Math.round(height * RATIO))) / 2),
    top: Math.round((height - Math.min(height, Math.round(width / RATIO))) / 2),
    width: Math.min(width, Math.round(height * RATIO)),
    height: Math.min(height, Math.round(width / RATIO)),
  };
}

for (const { src, out } of ASSETS) {
  const { width, height } = await sharp(src).metadata();
  const box = window34(width, height);
  await sharp(src).extract(box).resize(1440, 1920).jpeg({ quality: 88 }).toFile(out);
  console.log(`${path.basename(out)}  ${width}x${height} -> ${box.width}x${box.height} @${box.left},${box.top}`);
}

for (const { src, out, widths } of PUBLIC_HEROES) {
  const { width, height } = await sharp(src).metadata();
  const box = window34(width, height);
  for (const w of widths) {
    await sharp(src)
      .extract(box)
      .resize(w, Math.round(w / RATIO))
      .webp({ quality: 66 })
      .toFile(`${out}-${w}.webp`);
  }
  console.log(`${path.basename(out)}  ${width}x${height} -> ${widths.join("/")} webp`);
}

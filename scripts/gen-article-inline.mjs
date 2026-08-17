// Images insérées dans le corps des articles.
//
// Pourquoi : les photos de la bibliothèque font 2560 px et 300 à 700 Ko. Servies
// telles quelles au fil du texte, elles plombent la page. On en tire donc deux
// webp aux largeurs réellement utiles (760 px et son doublement en 2x), et on
// note les dimensions dans un manifeste pour que le rendu markdoc pose width et
// height sur le <img> : pas de décalage de mise en page au chargement.
//
// Ne génère QUE les images réellement citées dans les articles : on scanne les
// .mdoc des trois langues à la recherche de /images/inline/<theme>/<nom>.webp et
// on remonte à la source /images/bibliotheque/<theme>/<nom>.jpg. Ajouter une
// photo à un article puis relancer le script suffit.
//
// Relançable : `node scripts/gen-article-inline.mjs`.
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "public/images/bibliotheque");
const OUT_DIR = path.join(ROOT, "public/images/inline");
const MANIFEST = path.join(OUT_DIR, "manifest.json");
const CONTENT_DIRS = ["src/content/articles", "src/content/articles-en", "src/content/articles-it"];

// Une photo portrait servie à la largeur de la colonne fait 1 100 px de haut et
// mange l'écran. On la sert plus étroite : le texte respire, et l'alternance de
// largeurs donne le rythme de mise en page qu'on cherche.
const WIDTH_PAYSAGE = 720; // largeur exacte de la colonne de texte de l'article
const WIDTH_PORTRAIT = 520;
const QUALITY = 78;
const QUALITY_2X = 62; // le doublement de densité masque la perte

/** Toutes les références /images/inline/... trouvées dans les articles. */
async function usedImages() {
  const found = new Set();
  for (const dir of CONTENT_DIRS) {
    let files = [];
    try {
      files = await fs.readdir(path.join(ROOT, dir));
    } catch {
      continue;
    }
    for (const f of files.filter((f) => f.endsWith(".mdoc"))) {
      const raw = await fs.readFile(path.join(ROOT, dir, f), "utf8");
      for (const m of raw.matchAll(/\/images\/inline\/([\w-]+\/[\w-]+)\.webp/g)) found.add(m[1]);
    }
  }
  return [...found].sort();
}

const manifest = {};
const used = await usedImages();
if (!used.length) {
  console.log("Aucune image inline citée dans les articles, rien à générer.");
  process.exit(0);
}

for (const rel of used) {
  const src = path.join(SRC_DIR, `${rel}.jpg`);
  try {
    await fs.access(src);
  } catch {
    console.error(`Source absente : public/images/bibliotheque/${rel}.jpg`);
    process.exitCode = 1;
    continue;
  }
  await fs.mkdir(path.join(OUT_DIR, path.dirname(rel)), { recursive: true });

  const base = sharp(src);
  const meta = await base.metadata();
  // On ne recadre pas : les photos portrait de la bibliothèque valent pour leur
  // cadrage. On borne la largeur, la hauteur suit le rapport d'origine.
  const cible = meta.height > meta.width ? WIDTH_PORTRAIT : WIDTH_PAYSAGE;
  const w = Math.min(cible, meta.width);
  const h = Math.round((meta.height / meta.width) * w);

  await sharp(src).resize({ width: w }).webp({ quality: QUALITY }).toFile(path.join(OUT_DIR, `${rel}.webp`));
  await sharp(src).resize({ width: Math.min(w * 2, meta.width) }).webp({ quality: QUALITY_2X }).toFile(path.join(OUT_DIR, `${rel}@2x.webp`));

  manifest[`/images/inline/${rel}.webp`] = { w, h };
  console.log(`${rel} → ${w}×${h}`);
}

await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\n${Object.keys(manifest).length} images, manifeste écrit dans public/images/inline/manifest.json`);

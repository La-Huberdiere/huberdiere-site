// Dérivés webp des couvertures d'articles, écrits par scripts/gen-cover-webp.mjs.
// Lu au build seulement (fs). Sans dérivé sur disque, on renvoie undefined et la
// carte garde son jpg d'origine : un article ajouté par le CMS ou la routine
// s'affiche donc toujours, simplement plus lourd tant que le script n'a pas tourné.
import fs from "node:fs";
import path from "node:path";

const PUBLIC = path.join(process.cwd(), "public");

export function coverSrcset(cover?: string): string | undefined {
  if (!cover || !/^\/images\/articles\/[^/]+\.jpg$/.test(cover)) return undefined;
  const base = cover.replace(/\.jpg$/, "");
  const sizes = [600, 1200].filter((w) => fs.existsSync(path.join(PUBLIC, `${base}-${w}.webp`)));
  if (sizes.length !== 2) return undefined;
  return sizes.map((w) => `${base}-${w}.webp ${w}w`).join(", ");
}

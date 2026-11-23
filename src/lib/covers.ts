// Dérivés webp des couvertures d'articles, écrits par scripts/gen-derives-webp.mjs.
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

// Photos des chambres (carrousel de MariagePage) : <nom>-700.webp et -1000.webp.
export function roomSrcset(photo?: string): string | undefined {
  if (!photo || !/^\/images\/rooms\/[^/]+\.(jpe?g|png|webp)$/i.test(photo)) return undefined;
  const base = photo.replace(/\.(jpe?g|png|webp)$/i, "");
  const sizes = [700, 1000].filter((w) => fs.existsSync(path.join(PUBLIC, `${base}-${w}.webp`)));
  if (sizes.length !== 2) return undefined;
  return sizes.map((w) => `${base}-${w}.webp ${w}w`).join(", ");
}

/** Largeur affichée des photos de chambre : 100vw - 44 px sous 960 px, environ 460 px au-delà. */
export const ROOM_SIZES = "(max-width:960px) calc(100vw - 44px), 460px";

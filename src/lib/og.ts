// Génère l'image de partage social (og:image) d'un article AU BUILD.
// satori (texte → SVG avec polices fournies en buffer) + resvg (SVG → PNG) rendent
// le titre de façon identique sur macOS et sur Linux (Vercel), contrairement à
// sharp/librsvg qui dépend des polices système. La photo de fond + le dégradé sont
// composés par sharp. Appelé par les endpoints src/pages/og/articles/**.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const W = 1200, H = 630;
const ROOT = process.cwd();
const font = (p: string) => readFileSync(join(ROOT, "node_modules/@fontsource", p));

// Polices embarquées (woff accepté par satori). Chargées une fois.
const FONTS = [
  { name: "Playfair", data: font("playfair-display/files/playfair-display-latin-500-normal.woff"), weight: 500 as const, style: "normal" as const },
  { name: "PlayfairItalic", data: font("playfair-display/files/playfair-display-latin-400-italic.woff"), weight: 400 as const, style: "normal" as const },
  { name: "Montserrat", data: font("montserrat/files/montserrat-latin-600-normal.woff"), weight: 600 as const, style: "normal" as const },
];

// Arbre satori (objets, pas de JSX, fichier .ts).
const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: { style, ...(children !== undefined ? { children } : {}) },
});

function textTree(kicker: string, title: string) {
  return el(
    "div",
    {
      width: W, height: H, display: "flex", flexDirection: "column",
      justifyContent: "flex-end", padding: "80px 90px 52px", color: "#fff",
    },
    [
      el("div", { width: 64, height: 3, background: "#8b0000", marginBottom: 16 }),
      el("div", {
        fontFamily: "Montserrat", fontSize: 22, letterSpacing: 5,
        textTransform: "uppercase", color: "#f0d9d9", marginBottom: 10,
      }, kicker),
      el("div", {
        fontFamily: "Playfair", fontSize: 58, lineHeight: 1.18,
        color: "#fff", maxWidth: 1000, display: "flex",
      }, title),
      el("div", {
        fontFamily: "PlayfairItalic", fontStyle: "italic", fontSize: 26,
        color: "#f4f2ec", marginTop: 20,
      }, "Château de la Huberdière"),
    ]
  );
}

// Dégradé sombre (rect SVG sans police, rendu identique partout) pour la lisibilité.
const gradientSvg = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs>` +
  `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0%" stop-color="rgba(20,10,10,0.18)"/>` +
  `<stop offset="45%" stop-color="rgba(20,8,8,0.42)"/>` +
  `<stop offset="100%" stop-color="rgba(40,6,6,0.86)"/>` +
  `</linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`
);

export interface OgInput { title: string; kicker: string; coverPublicPath?: string }

/** Construit le JPEG 1200×630 (photo + dégradé + texte) d'un article. */
export async function renderArticleOg({ title, kicker, coverPublicPath }: OgInput): Promise<Buffer> {
  // Fond : la cover de l'article si présente, sinon une photo par défaut.
  let bgPath = coverPublicPath ? join(ROOT, "public", coverPublicPath.replace(/^\//, "")) : "";
  if (!bgPath || !existsSync(bgPath)) bgPath = join(ROOT, "src/assets/SD_9.jpg");
  const base = await sharp(bgPath).resize(W, H, { fit: "cover", position: "centre" }).toBuffer();

  const svg = await satori(textTree(kicker, title) as any, { width: W, height: H, fonts: FONTS });
  const textPng = new Resvg(svg, { background: "rgba(0,0,0,0)" }).render().asPng();

  return sharp(base)
    .composite([{ input: gradientSvg }, { input: textPng }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

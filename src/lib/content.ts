import { createReader } from "@keystatic/core/reader";
import Markdoc from "@markdoc/markdoc";
import keystaticConfig from "../../keystatic.config";

// Lecteur Keystatic : lit le contenu (pages libres, articles) depuis les
// fichiers du dépôt, au build comme en dev. Sert les routes dynamiques
// src/pages/[...slug].astro et src/pages/blog/[...slug].astro.
export const reader = createReader(process.cwd(), keystaticConfig);

// Transforme le corps markdoc (éditeur riche Keystatic) en HTML.
export function renderMarkdocNode(node: unknown): string {
  const renderable = Markdoc.transform(node as any);
  return Markdoc.renderers.html(renderable);
}

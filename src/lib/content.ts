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

// --- Pages libres : chargeur partagé par les routes FR / EN / IT ---
type PageCol = "pages" | "pagesEn" | "pagesIt";

/** getStaticPaths d'une page libre : rend le markdoc en HTML. */
export async function pageStaticPaths(col: PageCol) {
  const c = (reader.collections as any)[col];
  const slugs: string[] = await c.list();
  return Promise.all(
    slugs.map(async (slug: string) => {
      const entry = await c.read(slug);
      const body = await entry!.body();
      const node = (body as any)?.node ?? body;
      return { params: { slug }, props: { entry, html: renderMarkdocNode(node) } };
    })
  );
}

// --- Blog : chargeurs partagés par les routes FR / EN / IT ---
import { withToc } from "./blog";

type ArticleCol = "articles" | "articlesEn" | "articlesIt";

/** Liste des articles d'une collection, triés du plus récent au plus ancien. */
export async function listArticles(col: ArticleCol) {
  const c = (reader.collections as any)[col];
  const slugs: string[] = await c.list();
  const all = await Promise.all(
    slugs.map(async (slug: string) => ({ slug, ...(await c.read(slug)) }))
  );
  return all.sort((x: any, y: any) =>
    String(y.publishedAt || "").localeCompare(String(x.publishedAt || ""))
  );
}

/** getStaticPaths d'un article : rend le markdoc, extrait le sommaire + les articles liés. */
export async function articleStaticPaths(col: ArticleCol) {
  const c = (reader.collections as any)[col];
  const slugs: string[] = await c.list();
  const all = await Promise.all(
    slugs.map(async (slug: string) => ({ slug, entry: await c.read(slug) }))
  );
  return Promise.all(
    all.map(async ({ slug, entry }: any) => {
      const body = await entry.body();
      const node = (body as any)?.node ?? body;
      const { html, toc } = withToc(renderMarkdocNode(node));
      const related = all
        .filter((o: any) => o.slug !== slug && o.entry.category === entry.category)
        .slice(0, 3)
        .map((o: any) => ({ slug: o.slug, title: o.entry.title, cover: o.entry.cover, category: o.entry.category }));
      return { params: { slug }, props: { slug, entry, html, toc, related } };
    })
  );
}

import { createReader } from "@keystatic/core/reader";
import Markdoc from "@markdoc/markdoc";
import keystaticConfig from "../../keystatic.config";
import INLINE_IMAGES from "../../public/images/inline/manifest.json";

// Lecteur Keystatic : lit le contenu (pages libres, articles) depuis les
// fichiers du dépôt, au build comme en dev. Sert les routes dynamiques
// src/pages/[...slug].astro et src/pages/blog/[...slug].astro.
export const reader = createReader(process.cwd(), keystaticConfig);

/**
 * Rendu des images posées au fil du texte.
 *
 * Trois raisons de ne pas laisser markdoc rendre un <img> nu :
 *   - les moteurs de recherche IA privilégient les pages où le texte est appuyé
 *     par de vraies images légendées, la légende compte autant que l'alt ;
 *   - sans width ni height, la page saute au chargement de chaque photo ;
 *   - la bibliothèque est en 2560 px, il faut servir les dérivés webp générés
 *     par scripts/gen-article-inline.mjs.
 *
 * Syntaxe côté rédaction : ![alt descriptif](/images/inline/theme/photo.webp "Légende")
 * Une image sans légende reste une image, sans <figure>.
 */
const inlineMeta = INLINE_IMAGES as Record<string, { w: number; h: number }>;

function imageTag(src: string, alt: string, title?: string) {
  const meta = inlineMeta[src];
  const attrs: Record<string, string> = { src, alt, loading: "lazy", decoding: "async" };
  if (meta) {
    attrs.width = String(meta.w);
    attrs.height = String(meta.h);
    attrs.srcset = `${src} ${meta.w}w, ${src.replace(/\.webp$/, "@2x.webp")} ${meta.w * 2}w`;
    attrs.sizes = "(max-width: 860px) 100vw, 720px";
  }
  const img = new Markdoc.Tag("img", attrs);
  if (!title) return img;
  return new Markdoc.Tag("figure", { class: "article-figure" }, [
    img,
    new Markdoc.Tag("figcaption", {}, [title]),
  ]);
}

const markdocConfig = {
  nodes: {
    image: {
      attributes: {
        src: { type: String, required: true },
        alt: { type: String },
        title: { type: String },
      },
      transform(node: any, config: any) {
        const { src, alt = "", title } = node.transformAttributes(config);
        return imageTag(src, alt, title);
      },
    },
    // Markdoc enferme toute image dans un paragraphe. Un <figure> dans un <p>
    // est invalide et le navigateur referme le <p> avant, ce qui casse la mise
    // en page. Quand le paragraphe ne contient que la figure, on retire le <p>.
    paragraph: {
      transform(node: any, config: any) {
        const children = node.transformChildren(config);
        const meaningful = children.filter((c: any) => typeof c !== "string" || c.trim() !== "");
        if (meaningful.length === 1 && meaningful[0]?.name === "figure") return meaningful[0];
        return new Markdoc.Tag("p", node.transformAttributes(config), children);
      },
    },
  },
};

// Transforme le corps markdoc (éditeur riche Keystatic) en HTML.
export function renderMarkdocNode(node: unknown): string {
  const renderable = Markdoc.transform(node as any, markdocConfig as any);
  return Markdoc.renderers.html(renderable);
}

// --- Pages libres : chargeur partagé par les routes FR / EN / IT ---
import { freeSlug, articleSlug, type Lang } from "./routes";

type PageCol = "pages" | "pagesEn" | "pagesIt";
const LANG_OF: Record<string, Lang> = { pages: "fr", pagesEn: "en", pagesIt: "it", articles: "fr", articlesEn: "en", articlesIt: "it" };

/**
 * getStaticPaths d'une page libre. Le paramètre de route est le slug LOCALISÉ
 * (traduit en EN/IT) ; le contenu, lui, est lu par l'id canonique (nom de fichier,
 * identique dans les 3 langues) et exposé en prop `canonicalId`.
 */
export async function pageStaticPaths(col: PageCol) {
  const lang = LANG_OF[col];
  const c = (reader.collections as any)[col];
  const ids: string[] = await c.list();
  return Promise.all(
    ids.map(async (id: string) => {
      const entry = await c.read(id);
      const body = await entry!.body();
      const node = (body as any)?.node ?? body;
      return {
        params: { slug: freeSlug(id, lang) },
        props: { entry, html: renderMarkdocNode(node), canonicalId: id },
      };
    })
  );
}

// --- Blog : chargeurs partagés par les routes FR / EN / IT ---
import { withToc } from "./blog";

type ArticleCol = "articles" | "articlesEn" | "articlesIt";

// Publication programmée : un article n'est visible qu'à partir de sa date
// (comparaison AAAA-MM-JJ contre la date du build, UTC). Une date future le masque
// PARTOUT (liste, pages détail, articles liés, OG, sitemap) jusqu'au build du jour J.
// Le cron /api/cron/rebuild redéploie chaque jour → publication automatique. Un article
// sans date reste visible (jamais masqué par erreur).
const buildYMD = () => new Date().toISOString().slice(0, 10);
export const isLive = (a: any) => {
  const d = String(a?.publishedAt ?? "");
  return !d || d <= buildYMD();
};

/** Liste des articles d'une collection, publiés, triés du plus récent au plus ancien. */
export async function listArticles(col: ArticleCol) {
  const c = (reader.collections as any)[col];
  const slugs: string[] = await c.list();
  const all = await Promise.all(
    slugs.map(async (slug: string) => ({ slug, ...(await c.read(slug)) }))
  );
  return all.filter(isLive).sort((x: any, y: any) =>
    String(y.publishedAt || "").localeCompare(String(x.publishedAt || ""))
  );
}

/**
 * getStaticPaths d'un article. Le paramètre de route est le slug LOCALISÉ (EN/IT) ;
 * le contenu est lu par l'id canonique (nom de fichier). La prop `slug` reste l'id
 * canonique : elle sert au composant à construire son chemin « style FR » (que Base
 * localise) et l'URL de l'image OG. Les articles liés portent aussi l'id canonique
 * (localizePath fait la traduction au rendu du lien).
 */
export async function articleStaticPaths(col: ArticleCol) {
  const lang = LANG_OF[col];
  const c = (reader.collections as any)[col];
  const ids: string[] = await c.list();
  // Filtre publication : on ne génère pas les pages des articles à date future.
  const all = (await Promise.all(
    ids.map(async (id: string) => ({ slug: id, entry: await c.read(id) }))
  )).filter((o: any) => isLive(o.entry));
  return Promise.all(
    all.map(async ({ slug, entry }: any) => {
      const body = await entry.body();
      const node = (body as any)?.node ?? body;
      const { html, toc } = withToc(renderMarkdocNode(node));
      // Articles similaires : même catégorie en priorité, puis complétés par les autres
      // (du plus récent au plus ancien) pour toujours proposer jusqu'à 3 lectures, même
      // quand un cluster ne compte encore qu'un seul article.
      const candidates = all.filter((o: any) => o.slug !== slug);
      const byDateDesc = (a: any, b: any) =>
        String(b.entry.publishedAt ?? "").localeCompare(String(a.entry.publishedAt ?? ""));
      const sameCat = candidates.filter((o: any) => o.entry.category === entry.category).sort(byDateDesc);
      const otherCat = candidates.filter((o: any) => o.entry.category !== entry.category).sort(byDateDesc);
      const related = [...sameCat, ...otherCat]
        .slice(0, 3)
        .map((o: any) => ({ slug: o.slug, title: o.entry.title, cover: o.entry.cover, category: o.entry.category }));
      // params.slug = slug localisé (l'URL) ; props.slug = id canonique (usage interne).
      return { params: { slug: articleSlug(slug, lang) }, props: { slug, entry, html, toc, related } };
    })
  );
}

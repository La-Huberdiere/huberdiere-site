// Image de partage (og:image) EN, générée au build : /og/articles/en/<slug>.jpg
import type { APIRoute } from "astro";
import { listArticles } from "../../../../lib/content";
import { categoryLabel } from "../../../../lib/blog";
import { renderArticleOg } from "../../../../lib/og";

export const prerender = true;

export async function getStaticPaths() {
  const articles = await listArticles("articlesEn");
  return articles.map((a: any) => ({
    params: { slug: a.slug },
    props: { title: a.title, kicker: categoryLabel(a.category, "en"), cover: a.cover },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { title, kicker, cover } = props as any;
  const jpeg = await renderArticleOg({ title, kicker, coverPublicPath: cover });
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
  });
};

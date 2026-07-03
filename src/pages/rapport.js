// Sert le dernier rapport SEO client (HTML stocké dans Vercel Blob par le cron
// /api/cron/rapport) sous une URL propre : chateaudelahuberdiere.com/rapport.
// Page non indexée (noindex dans le HTML servi). Si le rapport n'a pas encore été
// généré, affiche un message d'attente plutôt qu'une erreur.
export const prerender = false

import { head } from "@vercel/blob"

const HTML_PATH = "rapport/index.html"

const PLACEHOLDER = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Rapport SEO — Château de la Huberdière</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F4F2EC;color:#212121;font-family:system-ui,sans-serif;text-align:center;padding:24px}
h1{font-size:22px;color:#8B0000;margin:0 0 8px}p{color:#646464;margin:0}</style></head>
<body><div><h1>Rapport en préparation</h1><p>Le premier rapport sera disponible ici très bientôt.</p></div></body></html>`

export async function GET() {
  try {
    const h = await head(HTML_PATH)
    const r = await fetch(h.url, { cache: "no-store" })
    if (!r.ok) throw new Error("blob fetch " + r.status)
    const html = await r.text()
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600", "x-robots-tag": "noindex, nofollow" },
    })
  } catch {
    return new Response(PLACEHOLDER, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow" },
    })
  }
}

// Sert le rapport SEO client (HTML stocké dans Vercel Blob par le cron
// /api/cron/rapport) sous une URL propre : /rapport (dernier) ou /rapport?m=YYYY-MM
// (archive d'un mois). Page non indexée. Placeholder si rien n'a encore été généré.
export const prerender = false

import { head } from "@vercel/blob"

const LATEST_PATH = "rapport/index.html"

const PLACEHOLDER = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Rapport SEO — Château de la Huberdière</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F4F2EC;color:#212121;font-family:system-ui,sans-serif;text-align:center;padding:24px}
h1{font-size:22px;color:#8B0000;margin:0 0 8px}p{color:#646464;margin:0}</style></head>
<body><div><h1>Rapport en préparation</h1><p>Le premier rapport sera disponible ici très bientôt.</p></div></body></html>`

export async function GET({ url }) {
  const m = url.searchParams.get("m")
  const path = /^\d{4}-\d{2}$/.test(m || "") ? `rapport/m/${m}.html` : LATEST_PATH
  try {
    const h = await head(path)
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

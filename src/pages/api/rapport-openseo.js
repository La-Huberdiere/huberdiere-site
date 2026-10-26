// Réception des relevés OpenSEO du mois, poussés par le NAS d'Alexis le dernier jour
// du mois (Family-Server/scripts/openseo-rapport/push.py). Rangés tels quels dans le
// Blob `rapport/m/<AAAA-MM>.openseo.json`, que le cron du rapport relit le 1er : les
// pages Google et les réponses d'IA ne sont plus achetées deux fois. Contrat :
// plans/2026-10-26-rapport-depuis-openseo.md. Authentification : en-tête
// `Authorization: Bearer <OPENSEO_PUSH_SECRET>`.
export const prerender = false

import { put } from "@vercel/blob"
import { timingSafeEqual } from "node:crypto"

// Une page de 100 résultats fait environ 15 Ko : 57 pages au plus, plus le relevé IA.
const TAILLE_MAX = 4_000_000

const json = (corps, status = 200) => new Response(JSON.stringify(corps), { status, headers: { "content-type": "application/json" } })

function autorise(request) {
  const secret = process.env.OPENSEO_PUSH_SECRET
  const recu = request.headers.get("authorization") ?? ""
  if (!secret) return false
  const a = Buffer.from(recu), b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function valider(corps) {
  if (corps?.version !== 1) return "version 1 attendue"
  if (!/^\d{4}-\d{2}$/.test(corps.month || "")) return "month=AAAA-MM attendu"
  const kws = corps.serp?.keywords
  if (!Array.isArray(kws)) return "serp.keywords doit être une liste"
  for (const k of kws) {
    if (typeof k?.keyword !== "string" || !Array.isArray(k.pages) || !k.pages.every(Array.isArray)) return "serp.keywords[] : keyword et pages[][] attendus"
  }
  if (corps.ia != null && !Array.isArray(corps.ia.rows)) return "ia.rows doit être une liste"
  return null
}

export async function POST({ request }) {
  if (!autorise(request)) return json({ ok: false, error: "unauthorized" }, 401)
  const texte = await request.text()
  if (texte.length > TAILLE_MAX) return json({ ok: false, error: "corps trop lourd" }, 413)
  let corps
  try { corps = JSON.parse(texte) } catch { return json({ ok: false, error: "JSON invalide" }, 400) }
  const erreur = valider(corps)
  if (erreur) return json({ ok: false, error: erreur }, 400)
  try {
    // Réécrit si le NAS renvoie le même mois (--force) : CDN plafonné à 300 s
    // comme les autres objets du rapport, sinon le cron relirait l'ancienne version.
    await put(`rapport/m/${corps.month}.openseo.json`, texte, {
      access: "public", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 300, contentType: "application/json",
    })
  } catch (e) {
    console.error("[rapport-openseo] écriture Blob :", e)
    return json({ ok: false, error: "écriture impossible" }, 500)
  }
  return json({ ok: true, month: corps.month, recherches: corps.serp.keywords.length, reponsesIa: corps.ia?.rows?.length ?? 0 })
}

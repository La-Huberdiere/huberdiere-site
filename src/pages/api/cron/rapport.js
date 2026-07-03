// Cron mensuel du rapport SEO/GEO client (remplace la GitHub Action, l'org GitHub
// étant flaggée). Génère le rapport, stocke HTML + historique dans Vercel Blob et
// notifie le lien par email (Brevo). Déclenché par Vercel Cron (vercel.json) avec
// l'en-tête Authorization: Bearer <CRON_SECRET>. Test manuel possible via ?key=<secret>.
export const prerender = false

import { put, head } from "@vercel/blob"
import { generateReport } from "../../../lib/rapport-seo.mjs"

const HISTORY_PATH = "rapport/history.json"
const HTML_PATH = "rapport/index.html"
// Domaine public encore sur Wix (bascule DNS vers Vercel en attente) : on sert le
// rapport via l'alias stable du projet. À rebasculer sur le domaine final après cutover.
const REPORT_URL = "https://huberdiere-site.vercel.app/rapport"
const SENDER = { name: "Reporting Huberdière", email: "hello@chateaudelahuberdiere.com" }

async function loadHistory() {
  try {
    const h = await head(HISTORY_PATH)
    const r = await fetch(h.url, { cache: "no-store" })
    return r.ok ? await r.json() : []
  } catch {
    return [] // premier run : pas encore d'historique
  }
}

async function sendEmail(summary, monthLabel) {
  const key = process.env.BREVO_API_KEY
  if (!key) { console.log("[rapport] BREVO_API_KEY absente, email ignoré."); return false }
  const to = (process.env.REPORT_EMAIL_TO || "alexis@morain.fr")
    .split(",").map((e) => ({ email: e.trim() })).filter((e) => e.email)
  const html = `
    <div style="font-family:Helvetica,Arial,sans-serif;color:#212121;line-height:1.6">
      <p>Le rapport SEO du Château de la Huberdière pour <strong>${monthLabel}</strong> est en ligne.</p>
      <p><a href="${REPORT_URL}" style="color:#8B0000;font-weight:600">Ouvrir le rapport</a></p>
      <p style="color:#646464;font-size:14px">
        ${summary.articles} articles publiés · ${summary.ranked}/${summary.keywords} mots-clés classés ·
        cité par les IA ${summary.llmCited}/${summary.llmAnswered}${summary.gbpNote != null ? ` · note Google ${String(summary.gbpNote).replace(".", ",")}` : ""}.
      </p>
      <p style="color:#646464;font-size:13px">Prêt à transférer au client.</p>
    </div>`
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: SENDER, to, subject: `Rapport SEO Huberdière — ${monthLabel}`, htmlContent: html }),
  })
  if (!res.ok) console.error("[rapport] Brevo:", res.status, (await res.text()).slice(0, 200))
  return res.ok
}

export async function GET({ request, url }) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  const ok = secret && (auth === `Bearer ${secret}` || url.searchParams.get("key") === secret)
  if (!ok) return new Response("unauthorized", { status: 401 })

  try {
    const prev = await loadHistory()
    const month = url.searchParams.get("month") // override optionnel YYYY-MM
    const { html, history, summary, monthLabel, month: ym } = await generateReport(prev, month)

    await put(HISTORY_PATH, JSON.stringify(history, null, 2), {
      access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json",
    })
    // Instantané mensuel permanent (archives) + copie « dernier rapport ».
    await put(`rapport/m/${ym}.html`, html, {
      access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "text/html; charset=utf-8",
    })
    const blob = await put(HTML_PATH, html, {
      access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "text/html; charset=utf-8",
    })

    const emailed = await sendEmail(summary, monthLabel)
    return new Response(JSON.stringify({ ok: true, summary, blob: blob.url, emailed }), {
      status: 200, headers: { "content-type": "application/json" },
    })
  } catch (e) {
    console.error("[rapport] échec:", e)
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500, headers: { "content-type": "application/json" },
    })
  }
}

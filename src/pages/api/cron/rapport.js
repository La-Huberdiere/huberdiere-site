// Cron mensuel du rapport SEO/GEO client (remplace la GitHub Action, l'org GitHub
// étant flaggée). Génère le rapport, stocke HTML + historique dans Vercel Blob et
// notifie le lien par email (Brevo). Déclenché par Vercel Cron (vercel.json) avec
// l'en-tête Authorization: Bearer <CRON_SECRET>. Test manuel possible via ?key=<secret>.
export const prerender = false

import { put, head } from "@vercel/blob"
import { generateReport } from "../../../lib/rapport-seo.mjs"

const HISTORY_PATH = "rapport/history.json"
const HTML_PATH = "rapport/index.html"
// Domaine basculé sur Vercel (6/07) : le rapport est servi sur le domaine final,
// protégé par mot de passe (cf. src/pages/rapport.js).
const REPORT_URL = "https://www.chateaudelahuberdiere.com/rapport"
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
  const to = (process.env.REPORT_EMAIL_TO || "contact@chateaudelahuberdiere.com")
    .split(",").map((e) => ({ email: e.trim() })).filter((e) => e.email)
  const cc = (process.env.REPORT_EMAIL_CC || "alexis@morain.fr")
    .split(",").map((e) => ({ email: e.trim() })).filter((e) => e.email)
  const s = summary
  const nbArt = s.articlesNew ?? s.articles
  const art = nbArt === 0 ? "pas de nouvel article ce mois-ci"
    : nbArt === 1 ? "un nouvel article publié sur le blog"
    : `${nbArt} nouveaux articles publiés sur le blog`
  const kw = s.ranked === 0
    ? `aucun de vos ${s.keywords} mots-clés suivis n'est encore positionné sur Google`
    : `${s.ranked} de vos ${s.keywords} mots-clés suivis ${s.ranked > 1 ? "sont positionnés" : "est positionné"} sur Google`
  const gbp = s.gbpNote != null ? `, et votre note Google se maintient à ${String(s.gbpNote).replace(".", ",")}/5` : ""
  const dem = s.demandes == null || s.demandes === 0 ? ""
    : ` Côté demandes, vous avez reçu ${s.demandes} contact${s.demandes > 1 ? "s" : ""} via le site${s.demandesChatgpt > 0 ? `, dont ${s.demandesChatgpt} en provenance de ChatGPT` : ""}.`
  const html = `
    <div style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#212121;line-height:1.65;font-size:15px;max-width:520px">
      <p>Bonjour à tous les deux,</p>
      <p>Voici votre point référencement pour <strong>${monthLabel}</strong>. J'ai tout mis au propre dans le rapport en ligne :</p>
      <p style="margin:22px 0">
        <a href="${REPORT_URL}?m=${s.month}" style="color:#8B0000;font-weight:600;font-size:16px">Ouvrir le rapport →</a><br>
        <span style="color:#646464;font-size:13px">mot de passe <strong>SEOHUBERDIERE</strong>, à saisir une seule fois sur votre navigateur</span>
      </p>
      <p>En deux mots ce mois-ci : ${art}, et ${kw}. Côté intelligences artificielles, le château a été cité ${s.llmCited} fois sur ${s.llmAnswered} questions testées${gbp}.${dem}</p>
      <p>Le rapport reprend l'évolution mois par mois et ce sur quoi je travaille pour la suite. Une question, un doute ? Répondez simplement à ce message.</p>
      <p style="margin-top:24px">Bonne lecture,<br>Alexis</p>
    </div>`
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: SENDER, replyTo: { email: "alexis@morain.fr", name: "Alexis Morain" }, to, cc, subject: `Votre point référencement · ${monthLabel}`, htmlContent: html }),
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
    const override = url.searchParams.get("month") // override optionnel YYYY-MM
    // Envoi anticipé ponctuel : le rapport doit partir un jour donné (call client) sans
    // attendre la fin du mois. Le cron `0 6 28-31` passe déjà ce jour-là ; on lève juste
    // la garde. L'idempotence (drapeau emailed) empêche le doublon avec le run du dernier
    // jour. Date UTC fixe, à retirer une fois passée (envoi juillet fait avant le call du 30).
    const EARLY_SEND = "2026-07-30"
    const todayUtc = new Date().toISOString().slice(0, 10)
    // Le cron tourne les 28-31 (cf. vercel.json). On ne génère qu'au VRAI dernier jour du
    // mois (le mois courant EST le mois à rapporter), sauf jour d'envoi anticipé. Un override
    // manuel (?month=YYYY-MM) court-circuite aussi cette garde.
    if (!override && todayUtc !== EARLY_SEND) {
      const now = new Date()
      const t = new Date(now); t.setUTCDate(now.getUTCDate() + 1)
      if (t.getUTCMonth() === now.getUTCMonth()) {
        return new Response(JSON.stringify({ ok: true, skipped: "pas le dernier jour du mois" }), {
          status: 200, headers: { "content-type": "application/json" },
        })
      }
    }
    const prev = await loadHistory()

    // Idempotence : un mois déjà envoyé n'est ni régénéré ni renvoyé. Évite le doublon
    // quand un envoi anticipé (ex. veille de call) précède le run automatique de fin de
    // mois. Contournable avec ?force=1 pour un renvoi volontaire.
    const force = url.searchParams.get("force") === "1"
    const now2 = new Date()
    const ymTarget = override || `${now2.getUTCFullYear()}-${String(now2.getUTCMonth() + 1).padStart(2, "0")}`
    if (!force && Array.isArray(prev) && prev.some((h) => h.month === ymTarget && h.emailed)) {
      return new Response(JSON.stringify({ ok: true, skipped: "rapport déjà envoyé ce mois", month: ymTarget }), {
        status: 200, headers: { "content-type": "application/json" },
      })
    }

    const { html, history, summary, monthLabel, month: ym } = await generateReport(prev, override)

    // Régénération silencieuse : reconstruit le rapport en ligne (blob + archive) sans
    // réexpédier de mail. Sert à corriger un rapport déjà envoyé. Le drapeau `emailed`
    // est préservé par generateReport (report de l'historique précédent), donc le verrou
    // d'idempotence tient et aucun doublon ne partira au run automatique suivant.
    const noemail = url.searchParams.get("noemail") === "1"

    // On envoie d'abord pour pouvoir marquer le mois comme « emailed » dans l'historique
    // persisté (verrou du doublon). Un échec d'envoi laisse le drapeau à false → un run
    // ultérieur retentera.
    const emailed = noemail ? false : await sendEmail(summary, monthLabel)
    if (emailed) {
      const e = history.find((h) => h.month === ym)
      if (e) e.emailed = true
    }

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

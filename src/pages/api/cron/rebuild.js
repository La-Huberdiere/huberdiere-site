// Cron QUOTIDIEN de publication programmée. Le blog est statique et filtré par date
// au build (cf. src/lib/content.ts, isLive) : un article à date future est masqué
// jusqu'au build du jour J. Ce cron redéploie le site chaque jour → les articles dont
// la date est arrivée deviennent visibles automatiquement.
// Déclenche le Deploy Hook Vercel (URL secrète en env DEPLOY_HOOK_URL, aucun token).
// Protégé par CRON_SECRET (Vercel Cron l'envoie en Authorization: Bearer ; ?key=… pour test).
//
// Il porte aussi le PRÉFLIGHT du rapport client (voir plus bas) : le plan Vercel est
// limité à deux crons, et celui-ci tourne déjà tous les jours.
import { reconcileLeads, travauxManquants } from "../../../lib/rapport-seo.mjs"

export const prerender = false

const SENDER = { name: "Reporting Huberdière", email: "hello@chateaudelahuberdiere.com" }
const ALEXIS = [{ email: "alexis@morain.fr", name: "Alexis Morain" }]
// Le rapport part au client entre le 28 et le 31. On contrôle le 25 puis le 27 :
// une première alerte qui laisse trois jours pour agir, une piqûre de rappel la
// veille. Deux mails par mois au maximum, et zéro quand tout va bien.
const JOURS_PREFLIGHT = [25, 27]

const esc = (v) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])

// Date du jour à Paris, pas en UTC : le cron tourne à 5 h UTC, soit 7 h Paris, et
// c'est le calendrier français qui décide du mois de reporting.
function aujourdhuiParis() {
  const iso = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", dateStyle: "short" }).format(new Date())
  return { iso, ym: iso.slice(0, 7), jour: Number(iso.slice(8, 10)) }
}

async function alerter(sujet, html) {
  const key = process.env.BREVO_API_KEY
  if (!key) { console.error("[preflight] BREVO_API_KEY absente, alerte non envoyée"); return false }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: SENDER, to: ALEXIS, subject: sujet, htmlContent: html }),
  })
  if (!res.ok) console.error("[preflight] envoi KO:", res.status)
  return res.ok
}

// Contrôle ce qui doit être vrai AVANT que le rapport parte tout seul au client :
// que les demandes du mois soient toutes dans le CRM, et que l'encart « Ce qui a
// été réalisé » soit rempli. Les deux se corrigeaient jusqu'ici à la main, en
// s'en souvenant. N'alerte que s'il y a quelque chose à faire, et jamais le client.
async function preflight(ym) {
  const soucis = []

  if (travauxManquants(ym)) {
    soucis.push(
      `<p><strong>L'encart « Ce qui a été réalisé » est vide pour ${esc(ym)}.</strong><br>` +
        `À remplir dans <code>src/data/rapport-travaux.json</code> avant le 28, sinon le client reçoit un rapport muet sur le travail du mois.</p>`,
    )
  }

  try {
    const r = await reconcileLeads(ym)
    if (r && r.manquants.length) {
      const lignes = r.manquants.map((m) => `<li><code>${esc(m.email)}</code> — ${esc(m.date)}</li>`).join("")
      soucis.push(
        `<p><strong>${r.manquants.length} demande(s) sur ${r.soumissions} absente(s) du CRM.</strong><br>` +
          `Le prospect a bien écrit et reçu sa confirmation, mais Brevo a refusé le contact. ` +
          `Le bloc « Demandes reçues » du rapport comptera donc faux.</p><ul>${lignes}</ul>` +
          `<p>Le contenu de chaque demande est dans le mail de notification reçu à <code>contact@</code>.</p>`,
      )
    } else if (r) {
      console.log(`[preflight] ${ym} : ${r.soumissions} demandes, toutes dans le CRM.`)
    }
  } catch (e) {
    // Un contrôle qui tombe en panne doit se signaler, pas se taire : c'est
    // exactement le silence qu'on cherche à supprimer.
    soucis.push(`<p><strong>La réconciliation des demandes a échoué :</strong> ${esc(e.message)}.<br>À vérifier à la main avant le 28.</p>`)
  }

  if (!soucis.length) return { ok: true, alerte: false }

  const html =
    `<div style="font-family:Helvetica,Arial,sans-serif;color:#2e3a48;font-size:15px;line-height:1.6">` +
    `<h1 style="font-family:Georgia,serif;color:#8B0000;font-size:20px;font-weight:normal">Préflight du rapport ${esc(ym)}</h1>` +
    soucis.join("") +
    `<p style="color:#646464;font-size:13px">Message automatique du cron quotidien, envoyé à toi seul. Le rapport client part entre le 28 et le 31.</p></div>`
  const alerte = await alerter(`Préflight rapport ${ym} : ${soucis.length} point(s) à traiter`, html)
  return { ok: true, alerte, soucis: soucis.length }
}

export async function GET({ request, url }) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  const ok = secret && (auth === `Bearer ${secret}` || url.searchParams.get("key") === secret)
  if (!ok) return new Response("unauthorized", { status: 401 })

  const hook = process.env.DEPLOY_HOOK_URL
  if (!hook) {
    return new Response(JSON.stringify({ ok: false, error: "DEPLOY_HOOK_URL absente" }), {
      status: 500, headers: { "content-type": "application/json" },
    })
  }

  const { ym, jour } = aujourdhuiParis()
  // ?preflight=1 pour le déclencher hors des jours prévus, ?preflight=AAAA-MM pour
  // contrôler un autre mois. Lecture seule côté CRM, il n'écrit rien nulle part.
  const forcer = url.searchParams.get("preflight")
  const moisPreflight = forcer && /^\d{4}-\d{2}$/.test(forcer) ? forcer : ym

  try {
    const res = await fetch(hook, { method: "POST" })
    const body = await res.json().catch(() => ({}))

    let preflightRes = null
    if (forcer || JOURS_PREFLIGHT.includes(jour)) {
      preflightRes = await preflight(moisPreflight).catch((e) => ({ ok: false, error: String(e?.message || e) }))
    }

    return new Response(JSON.stringify({ ok: res.ok, job: body?.job ?? null, preflight: preflightRes }), {
      status: res.ok ? 200 : 502, headers: { "content-type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500, headers: { "content-type": "application/json" },
    })
  }
}

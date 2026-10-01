// Cron mensuel du rapport SEO/GEO client, le 1er du mois pour le mois précédent (remplace la GitHub Action, l'org GitHub
// étant flaggée). Génère le rapport, stocke HTML + historique dans Vercel Blob et
// notifie le lien par email (Brevo). Déclenché par Vercel Cron (vercel.json) avec
// l'en-tête Authorization: Bearer <CRON_SECRET>. Test manuel possible via ?key=<secret>.
export const prerender = false

import { put, head } from "@vercel/blob"
import { generateReport, renderFromSnapshot, completerInstantane, detailMarqueGsc } from "../../../lib/rapport-seo.mjs"

const HISTORY_PATH = "rapport/history.json"
const HTML_PATH = "rapport/index.html"
// Instantané des données brutes d'un mois. Sans lui, refaire la mise en page d'un
// rapport déjà envoyé obligeait à retirer les données : le rapport d'août se serait
// rempli de positions de septembre. Un mois = un instantané, figé le jour de l'envoi.
const snapshotPath = (ym) => `rapport/m/${ym}.data.json`
// Ces chemins sont RÉÉCRITS (index.html chaque mois, un mois donné lors d'un rejeu).
// Le CDN de Vercel Blob garde un objet écrasé 30 jours par défaut : sans ce plafond
// court, une correction publiée reste invisible pendant des semaines.
// Domaine basculé sur Vercel (6/07) : le rapport est servi sur le domaine final,
// protégé par mot de passe (cf. src/pages/rapport.js).
const REPORT_URL = "https://www.chateaudelahuberdiere.com/rapport"
const SENDER = { name: "Reporting Huberdière", email: "hello@chateaudelahuberdiere.com" }

async function loadBlobJson(path) {
  const h = await head(path)
  const r = await fetch(h.url, { cache: "no-store" })
  if (!r.ok) throw new Error(`lecture ${path} : HTTP ${r.status}`)
  return r.json()
}

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
  // Le lien seul, sans résumé chiffré (consigne du 01/10) : un chiffre écrit dans un
  // mail ne se corrige plus une fois parti, le rapport en ligne si.
  const html = `
    <div style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#212121;line-height:1.65;font-size:15px;max-width:520px">
      <p>Bonjour à tous les deux,</p>
      <p>Votre point référencement de <strong>${monthLabel}</strong> est en ligne :</p>
      <p style="margin:22px 0">
        <a href="${REPORT_URL}?m=${s.month}" style="color:#8B0000;font-weight:600;font-size:16px">Ouvrir le rapport →</a><br>
        <span style="color:#646464;font-size:13px">mot de passe <strong>SEOHUBERDIERE</strong>, à saisir une seule fois sur votre navigateur</span>
      </p>
      <p>Une question, un doute ? Répondez simplement à ce message.</p>
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

  // Diagnostic notoriété (?marque=1&month=AAAA-MM) : recherches comptées par la
  // Search Console, une par ligne. Lecture seule, rien n'est écrit ni envoyé.
  if (url.searchParams.get("marque") === "1") {
    const ym = url.searchParams.get("month")
    if (!/^\d{4}-\d{2}$/.test(ym || "")) {
      return new Response(JSON.stringify({ ok: false, error: "month=AAAA-MM requis" }), { status: 400, headers: { "content-type": "application/json" } })
    }
    try {
      return new Response(JSON.stringify({ ok: true, ...(await detailMarqueGsc(ym)) }), { status: 200, headers: { "content-type": "application/json" } })
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { "content-type": "application/json" } })
    }
  }

  // Complément d'un mois terminé (?refresh=1&month=AAAA-MM) : relit demandes et
  // trafic sur le mois entier, réécrit instantané, historique et HTML. Aucun appel
  // DataForSEO, aucun mail. Lancé seul le 1er du mois par le cron `rebuild`.
  if (url.searchParams.get("refresh") === "1") {
    const ym = url.searchParams.get("month")
    if (!/^\d{4}-\d{2}$/.test(ym || "")) {
      return new Response(JSON.stringify({ ok: false, error: "month=AAAA-MM requis" }), { status: 400, headers: { "content-type": "application/json" } })
    }
    try {
      const { snap, maj } = await completerInstantane(await loadBlobJson(snapshotPath(ym)), { serp: url.searchParams.get("serp") === "1" })
      const opts = { access: "public", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 300 }
      // loadHistory() rend [] sur toute erreur de lecture : écrire ce vide effacerait l'historique.
      const hist = await loadHistory()
      if (!hist.length) throw new Error("historique illisible, rien n'a été réécrit")
      await put(snapshotPath(ym), JSON.stringify(snap), { ...opts, contentType: "application/json" })
      // L'historique vivant porte aussi les totaux du mois, relus par les mois suivants.
      const e = snap.history.find((h) => h.month === ym)
      const histMaj = hist.map((h) => (h.month === ym && e ? { ...h, leads: e.leads ?? h.leads, traffic: e.traffic ?? h.traffic, positions: e.positions ?? h.positions, aio: e.aio ?? h.aio } : h))
      await put(HISTORY_PATH, JSON.stringify(histMaj, null, 2), { ...opts, contentType: "application/json" })
      const html = renderFromSnapshot(snap)
      await put(`rapport/m/${ym}.html`, html, { ...opts, contentType: "text/html; charset=utf-8" })
      const dernier = histMaj.filter((h) => h.hasReport).map((h) => h.month).sort().pop()
      if (ym === dernier) await put(HTML_PATH, html, { ...opts, contentType: "text/html; charset=utf-8" })
      return new Response(JSON.stringify({ ok: true, month: ym, maj, leads: snap.leads?.total ?? null, visiteurs: snap.traffic?.visitors ?? null }), {
        status: 200, headers: { "content-type": "application/json" },
      })
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { "content-type": "application/json" } })
    }
  }

  // Rejeu de mise en page : reconstruit le HTML d'un mois (ou de tous) depuis son
  // instantané. Aucun appel DataForSEO, aucun mail, l'historique n'est pas touché.
  // Sert après un changement de rendu, pour que les mois déjà envoyés en profitent.
  if (url.searchParams.get("rerender") === "1") {
    try {
      const hist = await loadHistory()
      const seul = url.searchParams.get("month")
      const mois = (seul ? [seul] : hist.filter((h) => h.hasReport).map((h) => h.month)).sort()
      const dernier = [...hist].filter((h) => h.hasReport).map((h) => h.month).sort().pop()
      const faits = [], echecs = []
      for (const ym of mois) {
        try {
          const html = renderFromSnapshot(await loadBlobJson(snapshotPath(ym)))
          await put(`rapport/m/${ym}.html`, html, {
            access: "public", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 300, contentType: "text/html; charset=utf-8",
          })
          // `rapport/index.html` est la copie « dernier rapport » : seul le mois le
          // plus récent a le droit de l'écraser.
          if (ym === dernier) {
            await put(HTML_PATH, html, {
              access: "public", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 300, contentType: "text/html; charset=utf-8",
            })
          }
          faits.push(ym)
        } catch (e) {
          echecs.push({ month: ym, error: String(e?.message || e) })
        }
      }
      return new Response(JSON.stringify({ ok: echecs.length === 0, rerendered: faits, echecs }), {
        status: 200, headers: { "content-type": "application/json" },
      })
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
        status: 500, headers: { "content-type": "application/json" },
      })
    }
  }

  try {
    const override = url.searchParams.get("month") // override optionnel YYYY-MM
    // Le rapport part le 1er du mois (cron `0 6 1 * *`) et porte sur le mois PRÉCÉDENT,
    // désormais complet : envoyé le dernier jour à 8 h, il perdait cette journée de
    // demandes et de trafic. Hors du 1er, rien ne part sans ?month=AAAA-MM explicite.
    const now = new Date()
    if (!override && now.getUTCDate() !== 1) {
      return new Response(JSON.stringify({ ok: true, skipped: "le rapport part le 1er du mois" }), {
        status: 200, headers: { "content-type": "application/json" },
      })
    }
    const moisPrecedent = (() => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    })()
    const ymTarget = override || moisPrecedent
    const prev = await loadHistory()

    // Idempotence : un mois déjà envoyé n'est ni régénéré ni renvoyé. Évite le doublon
    // quand un envoi anticipé (ex. veille de call) précède le run automatique de fin de
    // mois. Contournable avec ?force=1 pour un renvoi volontaire.
    const force = url.searchParams.get("force") === "1"
    if (!force && Array.isArray(prev) && prev.some((h) => h.month === ymTarget && h.emailed)) {
      return new Response(JSON.stringify({ ok: true, skipped: "rapport déjà envoyé ce mois", month: ymTarget }), {
        status: 200, headers: { "content-type": "application/json" },
      })
    }

    const { html, history, summary, snapshot, monthLabel, month: ym } = await generateReport(prev, ymTarget)

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
      access: "public", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 300, contentType: "application/json",
    })
    // Données brutes du mois, figées : permettent de rejouer la mise en page plus
    // tard sans redemander les chiffres, donc sans réécrire l'histoire.
    await put(snapshotPath(ym), JSON.stringify(snapshot), {
      access: "public", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 300, contentType: "application/json",
    })
    // Instantané mensuel permanent (archives) + copie « dernier rapport ».
    await put(`rapport/m/${ym}.html`, html, {
      access: "public", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 300, contentType: "text/html; charset=utf-8",
    })
    const blob = await put(HTML_PATH, html, {
      access: "public", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 300, contentType: "text/html; charset=utf-8",
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

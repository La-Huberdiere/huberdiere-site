// Sert le rapport SEO client (HTML stocké dans Vercel Blob par le cron
// /api/cron/rapport). Protégé par mot de passe (cookie persistant).
//   /rapport            → page d'accueil : liste de tous les rapports mensuels
//   /rapport?m=YYYY-MM  → le rapport de ce mois, avec barre de navigation injectée
// Les instantanés mensuels (rapport/m/*.html) sont permanents, jamais écrasés.
export const prerender = false

import { head } from "@vercel/blob"
import PLAN_DATA from "../data/calendrier-editorial.json"

const HISTORY_PATH = "rapport/history.json"
const PASSWORD = "SEOHUBERDIERE"
// Cookie posé après saisie du mot de passe (HttpOnly, 1 an) → plus redemandé.
const COOKIE = "hub_rapport"
const TOKEN = "ok-8b0000"
const MAX_AGE = 60 * 60 * 24 * 365
const AUTH_COOKIE = `${COOKIE}=${TOKEN}; Path=/rapport; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
const isMonth = (m) => /^\d{4}-\d{2}$/.test(m || "")
function monthLong(ym) {
  const [y, m] = ym.split("-")
  const label = `${MOIS[+m - 1]} ${y}`
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// Liste des mois ayant un vrai rapport, du plus récent au plus ancien.
async function loadMonths() {
  try {
    const h = await head(HISTORY_PATH)
    const r = await fetch(h.url, { cache: "no-store" })
    if (!r.ok) return []
    const hist = await r.json()
    return (Array.isArray(hist) ? hist : [])
      .filter((e) => e && e.hasReport && isMonth(e.month))
      .map((e) => e.month)
      .sort((a, b) => b.localeCompare(a))
  } catch {
    return []
  }
}

function isAuthed(request) {
  const raw = request.headers.get("cookie") || ""
  return raw.split(";").some((c) => c.trim() === `${COOKIE}=${TOKEN}`)
}

const HEAD = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<style>
  :root{--ink:#212121;--wine:#8B0000;--cream:#F4F2EC;--muted:#646464;--line:#e3ddd0}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;background:var(--cream);color:var(--ink);
    font-family:'Montserrat',system-ui,-apple-system,sans-serif;line-height:1.55}
  a{color:var(--wine)}
</style>`

function loginPage(error, m) {
  const hidden = isMonth(m) ? `<input type="hidden" name="m" value="${m}">` : ""
  const msg = error ? `<p style="color:var(--wine);font-size:13px;margin:2px 0 0">Mot de passe incorrect.</p>` : ""
  return `<!doctype html><html lang="fr"><head>${HEAD}<title>Rapport SEO — Château de la Huberdière</title></head>
<body style="display:flex;align-items:center;justify-content:center;padding:24px">
  <div style="width:100%;max-width:360px;text-align:center">
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:26px;color:var(--wine);margin:0 0 6px;font-weight:600">Rapports SEO</h1>
    <p style="color:var(--muted);font-size:14px;margin:0 0 26px">Château de la Huberdière</p>
    <form method="POST" action="/rapport" style="display:flex;flex-direction:column;gap:12px">
      ${hidden}
      <input type="password" name="pw" placeholder="Mot de passe" autofocus required aria-label="Mot de passe"
        style="padding:13px 15px;border:1px solid #d8d2c4;background:#fff;color:var(--ink);font-size:15px;outline:none">
      <button type="submit" style="padding:13px 15px;border:0;background:var(--wine);color:#fff;font-size:14px;letter-spacing:.04em;text-transform:uppercase;cursor:pointer">Accéder aux rapports</button>
      ${msg}
    </form>
  </div>
</body></html>`
}

function indexPage(months) {
  const body = months.length
    ? (() => {
        const [latest, ...rest] = months
        const featured = `
          <a href="/rapport?m=${latest}" style="display:block;text-decoration:none;background:#fff;border:1px solid var(--line);border-top:3px solid var(--wine);padding:26px 28px;margin:0 0 28px">
            <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--wine);margin-bottom:8px">Le plus récent</div>
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:26px;color:var(--ink)">${monthLong(latest)}</div>
            <div style="color:var(--muted);font-size:13px;margin-top:6px">Ouvrir le rapport →</div>
          </a>`
        const list = rest.length
          ? `<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 12px">Rapports précédents</div>
             <ul style="list-style:none;margin:0;padding:0;border-top:1px solid var(--line)">
               ${rest.map((m) => `<li style="border-bottom:1px solid var(--line)"><a href="/rapport?m=${m}" style="display:flex;justify-content:space-between;align-items:center;padding:15px 4px;text-decoration:none;color:var(--ink)"><span>${monthLong(m)}</span><span style="color:var(--wine)">→</span></a></li>`).join("")}
             </ul>`
          : `<p style="color:var(--muted);font-size:14px">Les prochains rapports mensuels apparaîtront ici.</p>`
        return featured + list
      })()
    : `<div style="background:#fff;border:1px solid var(--line);padding:26px 28px;text-align:center">
         <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;color:var(--wine);margin-bottom:6px">Rapport en préparation</div>
         <p style="color:var(--muted);margin:0">Le premier rapport sera disponible ici très bientôt.</p>
       </div>`
  return `<!doctype html><html lang="fr"><head>${HEAD}<title>Rapports SEO — Château de la Huberdière</title></head>
<body>
  <div style="max-width:620px;margin:0 auto;padding:56px 22px 80px">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--wine);margin-bottom:6px">Château de la Huberdière</div>
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:32px;font-weight:600;margin:0 0 4px">Vos rapports SEO</h1>
    <p style="color:var(--muted);font-size:14px;margin:0 0 26px">Un point mensuel sur votre référencement et votre visibilité.</p>
    <a href="/rapport?doc=calendrier" style="display:flex;justify-content:space-between;align-items:center;text-decoration:none;background:#fff;border:1px solid var(--line);border-top:3px solid var(--wine);padding:16px 20px;margin:0 0 34px">
      <span>
        <span style="display:block;font-family:'Playfair Display',Georgia,serif;font-size:17px;color:var(--ink)">Plan éditorial SEO</span>
        <span style="display:block;color:var(--muted);font-size:12.5px;margin-top:2px">Les contenus prévus sur 6 mois</span>
      </span>
      <span style="color:var(--wine)">→</span>
    </a>
    ${body}
  </div>
</body></html>`
}

// Plan éditorial SEO servi à /rapport?doc=calendrier (derrière le même mot de passe).
// Le « quoi » (titre, pilier, justification trafic) vient de src/data/calendrier-editorial.json.
// Le « où en est-on » (en ligne / programmé / à venir) est calculé À L'AFFICHAGE depuis les
// vrais fichiers d'articles : la page reflète donc chaque publication (redéploy du rebuild
// quotidien qui rafraîchit le glob, plus la date du jour) et chaque reporting, sans statut
// codé en dur. Aucun appel réseau, aucune dépendance Blob.
const ARTICLE_RAW = import.meta.glob("../content/articles/*.mdoc", { query: "?raw", import: "default", eager: true })
const PUBLISHED_AT = Object.fromEntries(
  Object.entries(ARTICLE_RAW).map(([path, raw]) => {
    const slug = path.split("/").pop().replace(/\.mdoc$/, "")
    const m = /^publishedAt:\s*"?(\d{4}-\d{2}-\d{2})"?/m.exec(String(raw))
    return [slug, m ? m[1] : null]
  }),
)

// Statut d'un article planifié, à partir du fichier réel :
//   live      = fichier présent et date de publication atteinte
//   scheduled = fichier présent mais date encore future
//   planned   = pas encore rédigé
function articleStatut(slug) {
  if (!Object.prototype.hasOwnProperty.call(PUBLISHED_AT, slug)) return { key: "planned", date: null }
  const d = PUBLISHED_AT[slug]
  const today = new Date().toISOString().slice(0, 10)
  if (!d || d <= today) return { key: "live", date: d }
  return { key: "scheduled", date: d }
}

function statutBadge(st) {
  if (st.key === "live") return `<span style="white-space:nowrap;font-size:11.5px;color:#fff;background:var(--wine);padding:2px 9px;border-radius:2px">En ligne</span>`
  if (st.key === "scheduled") {
    const [, mm, dd] = st.date.split("-")
    return `<span style="white-space:nowrap;font-size:11.5px;color:var(--wine);border:1px solid #e2caca;padding:2px 9px;border-radius:2px">Programmé le ${dd}/${mm}</span>`
  }
  return `<span style="white-space:nowrap;font-size:11.5px;color:var(--muted);border:1px solid var(--line);padding:2px 9px;border-radius:2px">À venir</span>`
}

// Volume de recherche mensuel, séparateur de milliers à la française (1 600).
const fmtVol = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ")

// Ligne de données de recherche (DataForSEO) qui justifie le choix du sujet.
function seoLine(seo) {
  if (!seo) return `<div style="font-size:12px;margin-top:7px;color:var(--muted)">Données de recherche au prochain brief trimestriel.</div>`
  return `<div style="font-size:12px;margin-top:7px;color:var(--muted)">
    <span style="color:var(--wine)">«&nbsp;${seo.motCle}&nbsp;»</span> · ${fmtVol(seo.volume)} recherches/mois · concurrence ${seo.concurrence.toLowerCase()} · potentiel ${seo.potentiel.toLowerCase()}
  </div>`
}

// Mois de publication d'un satellite, DÉRIVÉ : mois de la date réelle du fichier
// si l'article existe (déplacer/reprogrammer un .mdoc le range tout seul), sinon
// le mois prévisionnel du plan (article pas encore rédigé). Aucune date n'est
// codée en dur dans le JSON, d'où l'absence de dérive quand un article bouge.
const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
const moisEffectif = (a) => (PUBLISHED_AT[a.slug] ? PUBLISHED_AT[a.slug].slice(0, 7) : a.moisPrevu)
const moisLabel = (ym) => { const [y, m] = ym.split("-"); return `${MOIS_FR[Number(m) - 1]} ${y}` }
// Clé de tri d'un article dans son mois : date réelle si connue, sinon fin de mois
// prévisionnel (les non-rédigés passent après les datés du même mois).
const triClef = (a) => PUBLISHED_AT[a.slug] || `${a.moisPrevu}-99`

// Titre cliquable seulement si l'article est en ligne (une page programmée renvoie
// 404 tant que sa date n'est pas atteinte : pas de lien mort dans le document).
function titreHtml(titre, slug, st) {
  if (st.key === "live") return `<a href="/blog/${slug}" style="color:var(--ink);font-weight:600;text-decoration:none;border-bottom:1px solid #d9b3b3">${titre}</a>`
  return `<span style="color:var(--ink);font-weight:600">${titre}</span>`
}

function calendrierPage() {
  const nav = `<div style="background:var(--wine);color:#fff;font-family:'Montserrat',system-ui,sans-serif;font-size:13px;padding:10px 18px;display:flex;align-items:center">
    <a href="/rapport" style="color:#fff;text-decoration:none;font-weight:600">← Tous les rapports</a>
  </div>`
  const allSlugs = [...PLAN_DATA.piliers.map((p) => p.slug), ...PLAN_DATA.satellites.map((a) => a.slug)]
  const liveTotal = allSlugs.filter((s) => articleStatut(s).key === "live").length
  const grandTotal = allSlugs.length

  // Regroupe les satellites par mois DÉRIVÉ, puis trie les mois et, dans chaque
  // mois, les articles par date. Le plan se réorganise donc tout seul quand un
  // article est publié, reprogrammé ou déplacé, sans toucher au JSON.
  const parMois = {}
  for (const a of PLAN_DATA.satellites) (parMois[moisEffectif(a)] ||= []).push(a)
  const moisTries = Object.keys(parMois).sort()

  const piliers = PLAN_DATA.piliers
    .map((p) => {
      const st = articleStatut(p.slug)
      return `<li style="display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid var(--line);padding:12px 2px">
        <span style="color:var(--ink)">${titreHtml(p.titre, p.slug, st)} <span style="color:var(--muted);font-size:12.5px">· ${p.cluster}</span></span>
        ${statutBadge(st)}
      </li>`
    })
    .join("")

  const mois = moisTries
    .map(
      (ym) => `
      <section style="margin:0 0 42px">
        <div style="border-left:3px solid var(--wine);padding-left:16px;margin-bottom:14px">
          <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:23px;font-weight:600;margin:0;color:var(--ink)">${moisLabel(ym).replace(/^./, (c) => c.toUpperCase())}</h2>
          <div style="color:var(--wine);font-size:13px;margin-top:3px">${PLAN_DATA.anglesParMois[ym] || ""}</div>
        </div>
        <ol class="plan" style="list-style:none;margin:0;padding:0">
          ${parMois[ym]
            .slice()
            .sort((x, y) => triClef(x).localeCompare(triClef(y)))
            .map((a) => {
              const st = articleStatut(a.slug)
              return `<li style="display:flex;gap:15px;padding:15px 2px;border-bottom:1px solid var(--line)">
                <span class="num" style="font-family:'Playfair Display',Georgia,serif;color:var(--wine);font-size:15px;min-width:20px;padding-top:2px" aria-hidden="true"></span>
                <div style="flex:1;min-width:0">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
                    ${titreHtml(a.titre, a.slug, st)}
                    ${statutBadge(st)}
                  </div>
                  <div style="color:var(--muted);font-size:13px;margin-top:5px;line-height:1.5">${a.justification}</div>
                  ${seoLine(a.seo)}
                  <div style="color:var(--wine);font-size:12px;margin-top:7px">Pilier ${a.cluster}</div>
                </div>
              </li>`
            })
            .join("")}
        </ol>
      </section>`,
    )
    .join("")

  return `<!doctype html><html lang="fr"><head>${HEAD}
<style>ol.plan{counter-reset:a}ol.plan>li{counter-increment:a}.num::before{content:counter(a)}</style>
<title>Plan éditorial SEO, Château de la Huberdière</title></head>
<body>
  ${nav}
  <div style="max-width:660px;margin:0 auto;padding:52px 22px 80px">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--wine);margin-bottom:6px">Château de la Huberdière</div>
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:34px;font-weight:600;margin:0 0 10px;line-height:1.15">Plan éditorial SEO</h1>
    <p style="color:var(--muted);font-size:15px;margin:0 0 8px;max-width:58ch">Six mois de contenus, quatre articles par mois. Chaque article vise une recherche précise de vos futurs clients et renvoie vers la page de réservation correspondante, pour construire mois après mois l'autorité du château sur Google et dans les moteurs de réponse par IA.</p>
    <p style="color:var(--ink);font-size:14px;margin:0 0 30px"><strong style="color:var(--wine);font-weight:600">${liveTotal}</strong> articles déjà en ligne sur ${grandTotal} prévus.</p>

    <div style="background:#fff;border:1px solid var(--line);border-top:3px solid var(--wine);padding:22px 24px;margin:0 0 44px">
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:19px;color:var(--ink);margin-bottom:4px">Les six fondations</div>
      <p style="color:var(--muted);font-size:13.5px;margin:0 0 8px">Un article pilier par activité, socle du maillage interne. Les articles mensuels ci-dessous s'y rattachent.</p>
      <ul style="list-style:none;margin:0;padding:0;border-top:1px solid var(--line)">${piliers}</ul>
    </div>

    ${mois}

    <p style="color:var(--muted);font-size:13px;margin:34px 0 0;padding-top:20px;border-top:1px solid var(--line)">Rythme de publication : quatre articles étalés sur le mois, traduits en anglais et en italien. Le statut et le lien de chaque article se mettent à jour automatiquement à mesure des publications. Volumes de recherche : ${PLAN_DATA.seoSource}. Le calendrier reste indicatif, l'ordre peut évoluer selon la saisonnalité des réservations.</p>
  </div>
</body></html>`
}

// Barre de navigation injectée en tête de chaque rapport (calculée à l'affichage,
// donc toujours complète : accueil + mois précédent/suivant réels).
function navBar(m, months) {
  const i = months.indexOf(m)
  const older = i >= 0 && i < months.length - 1 ? months[i + 1] : null // plus ancien
  const newer = i > 0 ? months[i - 1] : null // plus récent
  const link = (mm, label) => `<a href="/rapport?m=${mm}" style="color:#fff;text-decoration:none;white-space:nowrap">${label}</a>`
  const right = [
    older ? link(older, `◀ ${monthLong(older)}`) : `<span style="opacity:.4;white-space:nowrap">◀</span>`,
    `<span style="opacity:.85;white-space:nowrap">${isMonth(m) ? monthLong(m) : ""}</span>`,
    newer ? link(newer, `${monthLong(newer)} ▶`) : `<span style="opacity:.4;white-space:nowrap">▶</span>`,
  ].join('<span style="opacity:.4">·</span>')
  return `<div style="background:#8B0000;color:#fff;font-family:'Montserrat',system-ui,sans-serif;font-size:13px;padding:10px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
    <a href="/rapport" style="color:#fff;text-decoration:none;font-weight:600;white-space:nowrap">← Tous les rapports</a>
    <span style="display:flex;align-items:center;gap:10px">${right}</span>
  </div>`
}

async function serveReport(m, months) {
  try {
    const h = await head(`rapport/m/${m}.html`)
    const r = await fetch(h.url, { cache: "no-store" })
    if (!r.ok) throw new Error("blob fetch " + r.status)
    let html = await r.text()
    const nav = navBar(m, months)
    html = /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, (t) => t + nav) : nav + html
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, max-age=0", "x-robots-tag": "noindex, nofollow" },
    })
  } catch {
    // Mois demandé sans instantané : on retombe sur l'accueil.
    return new Response(indexPage(months), {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
    })
  }
}

export async function GET({ request, url }) {
  if (!isAuthed(request)) {
    return new Response(loginPage(false, url.searchParams.get("m")), {
      status: 401,
      headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow", "cache-control": "no-store" },
    })
  }
  if (url.searchParams.get("doc") === "calendrier") {
    return new Response(calendrierPage(), {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
    })
  }
  const months = await loadMonths()
  const m = url.searchParams.get("m")
  if (isMonth(m)) return serveReport(m, months)
  return new Response(indexPage(months), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
  })
}

export async function POST({ request }) {
  const form = await request.formData()
  const pw = String(form.get("pw") || "")
  const m = String(form.get("m") || "")
  if (pw !== PASSWORD) {
    return new Response(loginPage(true, m), {
      status: 401,
      headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow", "cache-control": "no-store" },
    })
  }
  const dest = isMonth(m) ? `/rapport?m=${m}` : "/rapport"
  return new Response(null, {
    status: 303,
    headers: { location: dest, "set-cookie": AUTH_COOKIE, "cache-control": "no-store" },
  })
}

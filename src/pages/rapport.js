// Sert le rapport SEO client (HTML stocké dans Vercel Blob par le cron
// /api/cron/rapport). Protégé par mot de passe (cookie persistant).
//   /rapport            → page d'accueil : liste de tous les rapports mensuels
//   /rapport?m=YYYY-MM  → le rapport de ce mois, avec barre de navigation injectée
// Les instantanés mensuels (rapport/m/*.html) sont permanents, jamais écrasés.
export const prerender = false

import { head } from "@vercel/blob"

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
// Document statique, sans dépendance Blob : c'est la feuille de route de contenu
// montrable au client, purgée des notes internes (volumes, arbitrages, slugs).
const PLAN = [
  {
    mois: "Août 2026",
    angle: "Conversion, requêtes à forte intention",
    articles: [
      "Combien coûte un mariage dans un château de la Loire ?",
      "Séminaire au vert près de Paris : 8 lieux à moins de 2 h 20",
      "Dormir dans un château de la Loire : 7 expériences",
      "Louer un château pour une réunion de famille",
    ],
  },
  {
    mois: "Septembre 2026",
    angle: "Rentrée B2B et week-ends",
    articles: [
      "Team building en Touraine : 12 activités",
      "Séminaire de direction dans un château privatisé",
      "Week-end romantique près d'Amboise",
      "Week-end entre amis au château",
    ],
  },
  {
    mois: "Octobre 2026",
    angle: "Mariage (réservations d'hiver) et art de la table",
    articles: [
      "Château pour un mariage en Val de Loire",
      "Mariage intimiste, de 30 à 60 invités",
      "La table d'hôtes en Touraine",
      "Hôtel de charme ou esprit maison d'hôtes ?",
    ],
  },
  {
    mois: "Novembre 2026",
    angle: "Mariage et tourisme evergreen",
    articles: [
      "Cérémonie laïque dans le parc du château",
      "Checklist mariage : le rétroplanning",
      "Que faire autour d'Amboise : 15 idées",
      "Cuisine et terroir de Touraine",
    ],
  },
  {
    mois: "Décembre 2026",
    angle: "Événements privés et œnotourisme",
    articles: [
      "Privatiser un château le temps d'un week-end",
      "Baptême et communion au château",
      "Les vignobles de Vouvray et Montlouis",
      "Visiter le Clos Lucé et Chenonceau",
    ],
  },
  {
    mois: "Janvier 2027",
    angle: "Fin du premier cycle",
    articles: [
      "Se marier en Touraine : 10 lieux d'exception",
      "Offsite annuel : un programme sur 3 jours",
      "Séminaire RSE et bien-être",
      "Brunch dominical au château",
    ],
  },
]

const PILIERS = [
  "Organiser un mariage au château",
  "Organiser un séminaire au château",
  "L'esprit chambres d'hôtes près d'Amboise",
  "Louer le château entre amis et en famille",
  "Organiser une retraite de yoga au château",
  "Visiter les châteaux de la Loire",
]

function calendrierPage() {
  const nav = `<div style="background:var(--wine);color:#fff;font-family:'Montserrat',system-ui,sans-serif;font-size:13px;padding:10px 18px;display:flex;align-items:center">
    <a href="/rapport" style="color:#fff;text-decoration:none;font-weight:600">← Tous les rapports</a>
  </div>`
  const piliers = PILIERS
    .map((p) => `<li style="border-bottom:1px solid var(--line);padding:11px 2px;color:var(--ink)">${p}</li>`)
    .join("")
  const mois = PLAN
    .map(
      (b) => `
      <section style="margin:0 0 40px">
        <div style="border-left:3px solid var(--wine);padding-left:16px;margin-bottom:16px">
          <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:23px;font-weight:600;margin:0;color:var(--ink)">${b.mois}</h2>
          <div style="color:var(--wine);font-size:13px;margin-top:3px">${b.angle}</div>
        </div>
        <ol style="list-style:none;margin:0;padding:0;counter-reset:a">
          ${b.articles
            .map(
              (t) => `<li style="counter-increment:a;display:flex;gap:14px;padding:10px 2px;border-bottom:1px solid var(--line)">
                <span style="font-family:'Playfair Display',Georgia,serif;color:var(--wine);font-size:15px;min-width:22px" aria-hidden="true"></span>
                <span style="color:var(--ink)">${t}</span>
              </li>`,
            )
            .join("")}
        </ol>
      </section>`,
    )
    .join("")
  return `<!doctype html><html lang="fr"><head>${HEAD}
<style>ol[style*="counter-reset:a"] li span:first-child::before{content:counter(a)}</style>
<title>Plan éditorial SEO, Château de la Huberdière</title></head>
<body>
  ${nav}
  <div style="max-width:640px;margin:0 auto;padding:52px 22px 80px">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--wine);margin-bottom:6px">Château de la Huberdière</div>
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:34px;font-weight:600;margin:0 0 10px;line-height:1.15">Plan éditorial SEO</h1>
    <p style="color:var(--muted);font-size:15px;margin:0 0 30px;max-width:56ch">Six mois de contenus, quatre articles par mois. Chaque article vise une recherche précise de vos futurs clients et renvoie vers la page de réservation correspondante, pour construire mois après mois l'autorité du château sur Google et dans les moteurs de réponse par IA.</p>

    <div style="background:#fff;border:1px solid var(--line);border-top:3px solid var(--wine);padding:22px 24px;margin:0 0 42px">
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:19px;color:var(--ink);margin-bottom:4px">Les six fondations, déjà en ligne</div>
      <p style="color:var(--muted);font-size:13.5px;margin:0 0 8px">Un article pilier par activité, socle du maillage. Les articles ci-dessous s'y rattachent.</p>
      <ul style="list-style:none;margin:0;padding:0;border-top:1px solid var(--line)">${piliers}</ul>
    </div>

    ${mois}

    <p style="color:var(--muted);font-size:13px;margin:34px 0 0;padding-top:20px;border-top:1px solid var(--line)">Rythme de publication : quatre articles étalés sur le mois. Traduction en anglais et en italien systématique. Ce calendrier est indicatif, l'ordre peut évoluer selon la saisonnalité des réservations.</p>
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

// Sert le rapport SEO client (HTML stocké dans Vercel Blob par le cron
// /api/cron/rapport) sous une URL propre : /rapport (dernier) ou /rapport?m=YYYY-MM
// (archive d'un mois). Page non indexée, protégée par mot de passe (cookie persistant
// posé au 1er accès, plus redemandé ensuite sur le même navigateur).
export const prerender = false

import { head } from "@vercel/blob"

const LATEST_PATH = "rapport/index.html"
const PASSWORD = "SEOHUBERDIERE"
// Cookie de session posé après saisie du mot de passe. Valeur opaque (le serveur
// vérifie l'égalité), HttpOnly, 1 an → le client ne ressaisit pas à chaque visite.
const COOKIE = "hub_rapport"
const TOKEN = "ok-8b0000"
const MAX_AGE = 60 * 60 * 24 * 365

const PLACEHOLDER = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Rapport SEO — Château de la Huberdière</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F4F2EC;color:#212121;font-family:system-ui,sans-serif;text-align:center;padding:24px}
h1{font-size:22px;color:#8B0000;margin:0 0 8px}p{color:#646464;margin:0}</style></head>
<body><div><h1>Rapport en préparation</h1><p>Le premier rapport sera disponible ici très bientôt.</p></div></body></html>`

function isAuthed(request) {
  const raw = request.headers.get("cookie") || ""
  return raw.split(";").some((c) => c.trim() === `${COOKIE}=${TOKEN}`)
}

function loginPage(error, m) {
  const hidden = m ? `<input type="hidden" name="m" value="${m.replace(/[^0-9-]/g, "")}">` : ""
  const msg = error ? `<p class="err">Mot de passe incorrect.</p>` : ""
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Rapport SEO — Château de la Huberdière</title>
<style>
  :root{--ink:#212121;--wine:#8B0000;--cream:#F4F2EC;--muted:#646464}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--cream);
    color:var(--ink);font-family:'Montserrat',system-ui,sans-serif;padding:24px}
  .card{width:100%;max-width:360px;text-align:center}
  h1{font-family:'Playfair Display',Georgia,serif;font-size:26px;color:var(--wine);margin:0 0 6px;font-weight:600}
  p.sub{color:var(--muted);font-size:14px;margin:0 0 26px}
  form{display:flex;flex-direction:column;gap:12px}
  input[type=password]{padding:13px 15px;border:1px solid #d8d2c4;background:#fff;color:var(--ink);
    font-size:15px;border-radius:0;outline:none}
  input[type=password]:focus{border-color:var(--wine)}
  button{padding:13px 15px;border:0;background:var(--wine);color:#fff;font-size:14px;letter-spacing:.04em;
    text-transform:uppercase;cursor:pointer;border-radius:0}
  .err{color:var(--wine);font-size:13px;margin:2px 0 0}
</style></head>
<body><div class="card">
  <h1>Rapport SEO</h1>
  <p class="sub">Château de la Huberdière</p>
  <form method="POST" action="/rapport">
    ${hidden}
    <input type="password" name="pw" placeholder="Mot de passe" autofocus required aria-label="Mot de passe">
    <button type="submit">Accéder au rapport</button>
    ${msg}
  </form>
</div></body></html>`
}

async function serveReport(m) {
  const path = /^\d{4}-\d{2}$/.test(m || "") ? `rapport/m/${m}.html` : LATEST_PATH
  try {
    const h = await head(path)
    const r = await fetch(h.url, { cache: "no-store" })
    if (!r.ok) throw new Error("blob fetch " + r.status)
    const html = await r.text()
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, max-age=0", "x-robots-tag": "noindex, nofollow" },
    })
  } catch {
    return new Response(PLACEHOLDER, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow" },
    })
  }
}

const AUTH_COOKIE = `${COOKIE}=${TOKEN}; Path=/rapport; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`

export async function GET({ request, url }) {
  if (!isAuthed(request)) {
    return new Response(loginPage(false, url.searchParams.get("m")), {
      status: 401,
      headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow", "cache-control": "no-store" },
    })
  }
  return serveReport(url.searchParams.get("m"))
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
  const dest = /^\d{4}-\d{2}$/.test(m) ? `/rapport?m=${m}` : "/rapport"
  return new Response(null, {
    status: 303,
    headers: { location: dest, "set-cookie": AUTH_COOKIE, "cache-control": "no-store" },
  })
}

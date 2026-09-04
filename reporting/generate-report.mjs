/**
 * HORS SERVICE. Le rapport client est généré par le cron Vercel `0 6 28-31 * *` →
 * src/pages/api/cron/rapport.js → src/lib/rapport-seo.mjs. C'est LÀ que vivent la liste
 * des concurrents et tout le reste. Ce fichier est figé à juillet 2026, ne rien y corriger.
 *
 * Il était encore exécuté par .github/workflows/rapport-seo.yml, déclenché par tout push
 * touchant reporting/ : il brûlait des crédits DataForSEO et publiait le rapport client sur
 * GitHub Pages, en accès libre. Workflow supprimé le 04/09. Ne pas le recréer.
 *
 * Château de la Huberdière — Rapport SEO/GEO client, généré en HTML interactif.
 *
 * Lit les articles du repo (frontmatter), tire les données DataForSEO (positions,
 * netlinking, fiche Google, visibilité IA), historise dans reporting/history.json
 * (pour la « montée » des mots-clés dans le temps), et écrit reporting/dist/index.html
 * (page interactive Chart.js, charte Huberdière). Aucune dépendance hors js-yaml
 * (déjà dans le repo). Node 20+ (fetch global).
 *
 * Env requis : DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD.
 * Usage : node reporting/generate-report.mjs [--month=YYYY-MM]
 */
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import yaml from "js-yaml"

const HERE = (p) => fileURLToPath(new URL(p, import.meta.url))
const ARTICLES_DIR = HERE("../src/content/articles")
const HISTORY_PATH = HERE("./history.json")
const OUT_DIR = HERE("./dist")

const DFS = "https://api.dataforseo.com/v3"
const LOCATION = 2250 // France
const LANGUAGE = "fr"
const DOMAIN = "chateaudelahuberdiere.com"

// Mots-clés locaux / longue traîne, gagnables et alignés sur les articles publiés.
// Le château apparaît déjà en page 1 sur certains (ex : "mariage château touraine"),
// c'est là que la progression se mesure (le générique national est trusté par les agrégateurs).
const KEYWORDS = [
  { intent: "Mariage", keyword: "mariage château touraine" },
  { intent: "Mariage", keyword: "location château mariage touraine" },
  { intent: "Mariage", keyword: "château mariage val de loire" },
  { intent: "Séjour", keyword: "chambres d'hôtes amboise" },
  { intent: "Séjour", keyword: "chambre d'hôtes château loire" },
  { intent: "Séminaire", keyword: "séminaire château touraine" },
  { intent: "Retraite", keyword: "retraite yoga touraine" },
  { intent: "Famille / groupe", keyword: "location château touraine" },
  { intent: "Restauration", keyword: "restaurant gastronomique amboise" },
]

const LLM_ENGINES = [
  { llmType: "chat_gpt", label: "ChatGPT", model: "gpt-4o-mini" },
  { llmType: "gemini", label: "Gemini", model: "gemini-2.5-flash" },
  { llmType: "perplexity", label: "Perplexity", model: "sonar" },
  { llmType: "claude", label: "Claude", model: "claude-haiku-4-5" },
]
const BRAND_ALIASES = ["huberdière", "huberdiere", "chateaudelahuberdiere"]
const LLM_COMPETITORS = ["Château de Pray", "Château des Arpentis", "Manoir Les Minimes", "Château de Perreux", "Château de Noizay"]
const LLM_PROMPTS = [
  "Quel est le meilleur château pour se marier en Touraine ? Cite des lieux précis.",
  "Où organiser un séminaire d'entreprise dans un château en Val de Loire ?",
  "Quel lieu de séminaire résidentiel recommandez-vous près de Tours ou d'Amboise ?",
  "Où organiser une grande réunion de famille dans un château en Indre-et-Loire ?",
  "Quelles chambres d'hôtes dans un château près des châteaux de la Loire recommandez-vous ?",
  "Quel château propose un séjour avec piscine chauffée et restauration en Touraine ?",
]
const GBP = { cid: "5728274181919890705", title: "Château de la Huberdière", coord: "47.447,0.935,15" }

// ── DataForSEO ────────────────────────────────────────────────────────────
const LOGIN = process.env.DATAFORSEO_LOGIN
const PASSWORD = process.env.DATAFORSEO_PASSWORD
const authHeader = () => "Basic " + Buffer.from(`${LOGIN}:${PASSWORD}`).toString("base64")

async function dfs(path, body) {
  const res = await fetch(`${DFS}${path}`, {
    method: "POST",
    headers: { authorization: authHeader(), "content-type": "application/json" },
    body: JSON.stringify([body]),
  })
  if (!res.ok) throw new Error(`DataForSEO ${res.status} ${path}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  const task = json.tasks?.[0]
  if (!task || task.status_code !== 20000) throw new Error(`DFS task KO ${path}: ${task?.status_message ?? json.status_message}`)
  return task.result ?? []
}

const domMatch = (d, t) => {
  if (!d) return false
  const a = d.replace(/^www\./i, "").toLowerCase()
  const b = t.replace(/^www\./i, "").toLowerCase()
  return a === b || a.endsWith("." + b)
}

async function pullSerp() {
  const rows = []
  for (const k of KEYWORDS) {
    try {
      const result = await dfs("/serp/google/organic/live/advanced", {
        keyword: k.keyword, location_code: LOCATION, language_code: LANGUAGE, device: "desktop", depth: 100,
      })
      const items = (result[0]?.items ?? []).filter((i) => i.type === "organic")
      const own = items.find((i) => domMatch(i.domain, DOMAIN))
      const leader = items.find((i) => i.rank_absolute === 1) ?? items[0]
      rows.push({ ...k, position: own?.rank_absolute ?? null, url: own?.url ?? null, leader: leader?.domain ?? null })
    } catch (e) {
      console.error("SERP KO", k.keyword, e.message)
      rows.push({ ...k, position: null, url: null, leader: null })
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  return rows
}

async function pullBacklinks() {
  const target = DOMAIN.replace(/^www\./, "")
  let s = {}
  try { s = (await dfs("/backlinks/summary/live", { target, include_subdomains: true, exclude_internal_backlinks: true, backlinks_status_type: "live", internal_list_limit: 1 }))[0] ?? {} } catch (e) { console.error("BL summary", e.message) }
  return { backlinks: s.backlinks ?? 0, referringDomains: s.referring_domains ?? 0, spamScore: s.backlinks_spam_score ?? 0, referringMainDomains: s.referring_main_domains ?? 0 }
}

async function pullGbp() {
  try {
    const result = await dfs("/business_data/business_listings/search/live", { title: GBP.title, location_coordinate: GBP.coord, limit: 10 })
    const items = result[0]?.items ?? []
    const it = items.find((i) => String(i.cid) === GBP.cid) ?? items[0]
    if (!it) return null
    return { note: it.rating?.value ?? null, reviews: it.rating?.votes_count ?? null, distribution: it.rating_distribution ?? {}, photos: it.total_photos ?? null }
  } catch (e) { console.error("GBP", e.message); return null }
}

async function pullLlm() {
  const results = await Promise.all(
    LLM_ENGINES.map(async (engine) => {
      const rows = await Promise.all(
        LLM_PROMPTS.map(async (prompt) => {
          try {
            const result = await dfs(`/ai_optimization/${engine.llmType}/llm_responses/live`, { user_prompt: prompt, model_name: engine.model, web_search: true })
            const text = (result[0]?.items ?? [])
              .flatMap((i) => i.sections ?? [])
              .filter((s) => s.type === "text" && s.text)
              .map((s) => s.text)
              .join("\n")
              .toLowerCase()
            return {
              prompt,
              cited: BRAND_ALIASES.some((a) => text.includes(a)),
              competitors: LLM_COMPETITORS.filter((c) => text.includes(c.toLowerCase())),
            }
          } catch (e) {
            console.error("LLM KO", engine.label, e.message)
            return { prompt, cited: false, competitors: [], error: true }
          }
        })
      )
      return { engine: engine.label, rows }
    })
  )
  return results
}

// ── Historique de visibilité du domaine (backfill, ~12 mois) ──────────────
async function pullDomainHistory() {
  try {
    const result = await dfs("/dataforseo_labs/google/historical_rank_overview/live", {
      target: DOMAIN, location_name: "France", language_code: "fr", ignore_synonyms: true,
    })
    const items = result[0]?.items ?? []
    return items
      .map((it) => {
        const o = it.metrics?.organic ?? {}
        const top3 = (o.pos_1 || 0) + (o.pos_2_3 || 0)
        const top10 = top3 + (o.pos_4_10 || 0)
        const top20 = top10 + (o.pos_11_20 || 0)
        return { ym: `${it.year}-${String(it.month).padStart(2, "0")}`, top3, top10, top20, etv: Math.round(o.etv || 0) }
      })
      .sort((a, b) => a.ym.localeCompare(b.ym))
  } catch (e) {
    console.error("Domain history KO", e.message)
    return []
  }
}

const monthShort = (ym) => new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${ym}-15T00:00:00Z`))

// ── Articles (frontmatter du repo) ────────────────────────────────────────
async function readArticles() {
  if (!existsSync(ARTICLES_DIR)) return []
  const files = (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith(".mdoc"))
  const out = []
  for (const f of files) {
    const raw = await readFile(`${ARTICLES_DIR}/${f}`, "utf8")
    const m = raw.match(/^---\n([\s\S]*?)\n---/)
    if (!m) continue
    let fm = {}
    try { fm = yaml.load(m[1]) ?? {} } catch { continue }
    out.push({
      slug: f.replace(/\.mdoc$/, ""),
      title: fm.title ?? f,
      publishedAt: fm.publishedAt ? String(fm.publishedAt).slice(0, 10) : "",
      category: fm.category ?? "",
      keywords: Array.isArray(fm.keywords) ? fm.keywords : [],
    })
  }
  return out.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))
}

// ── Historique ────────────────────────────────────────────────────────────
async function loadHistory() {
  try { return JSON.parse(await readFile(HISTORY_PATH, "utf8")) } catch { return [] }
}

function currentMonth(argv) {
  const arg = argv.find((a) => a.startsWith("--month="))
  if (arg) return arg.split("=")[1]
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

// ── Rendu HTML ────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function renderHtml(data) {
  const { month, serp, backlinks, gbp, llm, articles, history } = data
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-15T00:00:00Z`))
  const citedTotal = llm.reduce((s, e) => s + e.rows.filter((r) => r.cited).length, 0)
  const answeredTotal = llm.reduce((s, e) => s + e.rows.filter((r) => !r.error).length, 0)
  const rankedCount = serp.filter((s) => s.position !== null).length

  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Château de la Huberdière — Rapport SEO ${esc(monthLabel)}</title>
<meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  :root{--bordeaux:#8B0000;--creme:#F4F2EC;--encre:#212121;--gris:#646464;--or:#B08D57;--vert:#2E7D32;--rouge:#B23A3A}
  *{box-sizing:border-box}
  body{margin:0;background:var(--creme);color:var(--encre);font-family:Montserrat,system-ui,sans-serif;line-height:1.55}
  .wrap{max-width:1000px;margin:0 auto;padding:0 24px}
  header{background:var(--bordeaux);color:#fff;padding:40px 0 34px}
  header .wrap{display:flex;flex-direction:column;gap:6px}
  h1{font-family:"Playfair Display",serif;font-weight:700;font-size:30px;margin:0}
  header .sub{opacity:.85;font-size:15px}
  h2{font-family:"Playfair Display",serif;color:var(--bordeaux);font-size:22px;margin:44px 0 4px;font-weight:600}
  h2 + .lead{color:var(--gris);margin:0 0 18px;font-size:14px}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:26px}
  .kpi{background:#fff;border:1px solid #e6e1d6;border-radius:4px;padding:16px 18px}
  .kpi .l{font-size:11px;letter-spacing:.03em;color:var(--gris);text-transform:uppercase}
  .kpi .v{font-family:"Playfair Display",serif;font-size:28px;color:var(--encre);margin-top:4px}
  .kpi .n{font-size:12px;color:var(--gris);margin-top:2px}
  table{width:100%;border-collapse:collapse;margin-top:10px;background:#fff;border:1px solid #e6e1d6}
  th,td{text-align:left;padding:10px 12px;font-size:14px;border-bottom:1px solid #efeada;vertical-align:top}
  th{background:#faf8f2;color:var(--gris);font-size:12px;text-transform:uppercase;letter-spacing:.03em;font-weight:600}
  td.num{text-align:right;font-variant-numeric:tabular-nums}
  .tag{display:inline-block;background:#efeada;color:#5c4b3c;border-radius:3px;padding:2px 8px;margin:2px 4px 2px 0;font-size:12px}
  .yes{color:var(--vert);font-weight:600}.no{color:var(--rouge)}
  .card{background:#fff;border:1px solid #e6e1d6;border-radius:4px;padding:20px 22px;margin-top:14px}
  canvas{max-height:340px}
  footer{color:var(--gris);font-size:12px;padding:40px 0 60px;text-align:center}
  .pos{font-weight:600}
  @media(max-width:720px){.kpis{grid-template-columns:repeat(2,1fr)}h1{font-size:24px}}
</style></head>
<body>
<header><div class="wrap">
  <div class="sub">Château de la Huberdière · Reporting SEO & visibilité</div>
  <h1>Où en est votre référencement — ${esc(monthLabel)}</h1>
  <div class="sub">Positions Google, articles publiés, netlinking, présence dans les réponses IA.</div>
</div></header>
<div class="wrap">

  <div class="kpis">
    <div class="kpi"><div class="l">Mots-clés classés</div><div class="v">${rankedCount}<span style="font-size:15px;color:var(--gris)"> / ${serp.length}</span></div><div class="n">dans le top 100 Google</div></div>
    <div class="kpi"><div class="l">Articles publiés</div><div class="v">${articles.length}</div><div class="n">sur le blog du château</div></div>
    <div class="kpi"><div class="l">Note Google</div><div class="v">${gbp?.note != null ? String(gbp.note).replace(".", ",") : "–"}</div><div class="n">${gbp?.reviews != null ? gbp.reviews + " avis" : "fiche Google"}</div></div>
    <div class="kpi"><div class="l">Cité par les IA</div><div class="v">${citedTotal}<span style="font-size:15px;color:var(--gris)"> / ${answeredTotal}</span></div><div class="n">réponses testées</div></div>
  </div>

  <h2>Progression des positions Google</h2>
  <p class="lead">Position moyenne sur vos mots-clés cibles, mois après mois. Plus la courbe descend, mieux c'est (position 1 = en haut de Google).</p>
  <div class="card"><canvas id="posChart"></canvas></div>
  <table>
    <thead><tr><th>Mot-clé</th><th>Intention</th><th class="num">Position ce mois</th><th>En tête aujourd'hui</th></tr></thead>
    <tbody>${serp.map((s) => `<tr><td>${esc(s.keyword)}</td><td>${esc(s.intent)}</td><td class="num pos">${s.position != null ? s.position : '<span style="color:var(--gris)">non classé</span>'}</td><td style="color:var(--gris)">${esc(s.leader || "")}</td></tr>`).join("")}</tbody>
  </table>

  <h2>Visibilité globale sur Google</h2>
  <p class="lead">Nombre de mots-clés du site positionnés dans le top 20 de Google, et trafic mensuel estimé, sur les derniers mois.</p>
  <div class="card"><canvas id="domChart"></canvas></div>

  <h2>Articles rédigés</h2>
  <p class="lead">Le contenu publié ce mois et depuis le début, avec les mots-clés visés par chaque article.</p>
  <table>
    <thead><tr><th>Article</th><th>Publié le</th><th>Thème</th><th>Mots-clés visés</th></tr></thead>
    <tbody>${articles.map((a) => `<tr><td><strong>${esc(a.title)}</strong></td><td style="white-space:nowrap">${esc(a.publishedAt)}</td><td>${esc(a.category)}</td><td>${a.keywords.map((k) => `<span class="tag">${esc(k)}</span>`).join("")}</td></tr>`).join("")}</tbody>
  </table>

  <h2>Visibilité dans les réponses IA</h2>
  <p class="lead">De plus en plus de clients demandent à ChatGPT, Gemini ou Perplexity « quel château pour se marier en Touraine ». Voici si le château y est cité.</p>
  <table>
    <thead><tr><th>Moteur</th><th class="num">Château cité</th><th>Concurrents cités à sa place</th></tr></thead>
    <tbody>${llm.map((e) => {
      const c = e.rows.filter((r) => r.cited).length
      const n = e.rows.filter((r) => !r.error).length
      const comps = [...new Set(e.rows.flatMap((r) => r.competitors))]
      return `<tr><td>${esc(e.engine)}</td><td class="num"><span class="${c > 0 ? "yes" : "no"}">${c} / ${n}</span></td><td style="color:var(--gris)">${comps.length ? comps.map(esc).join(", ") : "—"}</td></tr>`
    }).join("")}</tbody>
  </table>

  <h2>Netlinking</h2>
  <p class="lead">Les autres sites qui pointent vers le château, un signal de confiance pour Google.</p>
  <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="l">Backlinks</div><div class="v">${backlinks.backlinks.toLocaleString("fr-FR")}</div></div>
    <div class="kpi"><div class="l">Domaines référents</div><div class="v">${backlinks.referringDomains.toLocaleString("fr-FR")}</div></div>
    <div class="kpi"><div class="l">Qualité (spam)</div><div class="v">${backlinks.spamScore} %</div><div class="n">${backlinks.spamScore <= 10 ? "faible, sain" : backlinks.spamScore <= 30 ? "modéré" : "à surveiller"}</div></div>
  </div>

  <footer>Rapport généré automatiquement pour le Château de la Huberdière — ${esc(monthLabel)}.<br>Données Google (SERP), profil Google Business, moteurs IA et blog du château.</footer>
</div>

<script>
const HISTORY = ${JSON.stringify(history)};
const KW = ${JSON.stringify(KEYWORDS.map((k) => k.keyword))};
const palette = ["#8B0000","#B08D57","#5C4B3C","#2E7D32","#3b6ea5","#8B7355","#a0508b","#417d7a","#c06014"];
// Graphe 1 : position par mot-clé (mois avec données de position uniquement).
(function(){
  const POS = HISTORY.filter(h => h.positions);
  const labels = POS.map(h => h.monthLabel || h.month);
  const datasets = KW.map((kw, i) => ({
    label: kw,
    data: POS.map(h => (h.positions[kw] != null) ? h.positions[kw] : null),
    borderColor: palette[i % palette.length], backgroundColor: palette[i % palette.length],
    spanGaps: true, tension: .3, borderWidth: 2, pointRadius: 3,
  }));
  new Chart(document.getElementById("posChart"), {
    type: "line", data: { labels, datasets },
    options: {
      responsive: true, interaction: { mode: "nearest", intersect: false },
      scales: { y: { reverse: true, min: 1, suggestedMax: 100, title: { display: true, text: "Position Google (1 = en haut)" }, ticks: { precision: 0 } } },
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { family: "Montserrat" } } } }
    }
  });
})();
// Graphe 2 : visibilité globale du domaine (mots-clés top 20 + trafic estimé).
(function(){
  const DOM = HISTORY.filter(h => h.domain);
  if (!DOM.length) { document.getElementById("domChart").closest(".card").style.display = "none"; return; }
  const labels = DOM.map(h => h.monthLabel || h.month);
  new Chart(document.getElementById("domChart"), {
    type: "bar",
    data: { labels, datasets: [
      { type: "bar", label: "Mots-clés en top 20", data: DOM.map(h => h.domain.top20), backgroundColor: "#8B0000", yAxisID: "y", order: 2 },
      { type: "line", label: "Visiteurs/mois estimés", data: DOM.map(h => h.domain.etv), borderColor: "#B08D57", backgroundColor: "#B08D57", yAxisID: "y1", tension: .3, borderWidth: 2, pointRadius: 3, order: 1 },
    ] },
    options: {
      responsive: true,
      scales: {
        y: { position: "left", beginAtZero: true, title: { display: true, text: "Mots-clés top 20" }, ticks: { precision: 0 } },
        y1: { position: "right", beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: "Visiteurs/mois estimés" } },
      },
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { family: "Montserrat" } } } }
    }
  });
})();
</script>
</body></html>`
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  if (!LOGIN || !PASSWORD) throw new Error("DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD manquants dans l'environnement.")
  const month = currentMonth(process.argv)
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${month}-15T00:00:00Z`))
  console.log(`Génération du rapport ${month}…`)

  const [serp, backlinks, gbp, llm, articles, domainHistory] = await Promise.all([
    pullSerp(), pullBacklinks(), pullGbp(), pullLlm(), readArticles(), pullDomainHistory(),
  ])

  // Historique fusionné par mois : métriques domaine (backfill ~12 mois via
  // DataForSEO) + positions par mot-clé (mois courant, s'enrichit à chaque run).
  const byMonth = new Map((await loadHistory()).map((h) => [h.month, h]))
  for (const d of domainHistory) {
    const e = byMonth.get(d.ym) ?? { month: d.ym, monthLabel: monthShort(d.ym) }
    e.domain = { top3: d.top3, top10: d.top10, top20: d.top20, etv: d.etv }
    byMonth.set(d.ym, e)
  }
  const positions = {}
  serp.forEach((s) => { positions[s.keyword] = s.position })
  const cur = byMonth.get(month) ?? { month, monthLabel }
  cur.monthLabel = monthLabel
  cur.positions = positions
  cur.backlinks = backlinks.backlinks
  cur.referringDomains = backlinks.referringDomains
  cur.gbpNote = gbp?.note ?? null
  cur.gbpReviews = gbp?.reviews ?? null
  cur.llmCited = llm.reduce((s, e) => s + e.rows.filter((r) => r.cited).length, 0)
  cur.llmAnswered = llm.reduce((s, e) => s + e.rows.filter((r) => !r.error).length, 0)
  byMonth.set(month, cur)
  const history = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))
  await writeFile(HISTORY_PATH, JSON.stringify(history, null, 2) + "\n")

  const html = renderHtml({ month, serp, backlinks, gbp, llm, articles, history })
  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(`${OUT_DIR}/index.html`, html)
  console.log(`OK. ${articles.length} articles, ${serp.filter((s) => s.position != null).length}/${serp.length} mots-clés classés, IA ${history[history.length - 1].llmCited}/${history[history.length - 1].llmAnswered}. → reporting/dist/index.html`)
}

main().catch((e) => { console.error(e); process.exit(1) })

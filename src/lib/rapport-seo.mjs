/**
 * Château de la Huberdière — moteur du rapport SEO/GEO client (v2).
 *
 * Version serverless : tire DataForSEO (positions locales, netlinking + détail et
 * historique, fiche Google, visibilité IA sur 4 moteurs et 6 thèmes), lit les
 * articles du repo via import.meta.glob, fusionne l'historique passé en argument et
 * rend le HTML interactif (Chart.js, charte Huberdière). L'I/O historique + HTML est
 * gérée par l'appelant (Vercel Blob).
 *
 * Env requis : DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD.
 */
import yaml from "js-yaml"
// Travaux réalisés par mois (saisie manuelle d'Alexis avant l'envoi). Clé = AAAA-MM,
// valeur = liste de phrases côté client. Absent = encart masqué, jamais de crash.
import TRAVAUX from "../data/rapport-travaux.json"

const DFS = "https://api.dataforseo.com/v3"
const LOCATION = 2250 // France
const LANGUAGE = "fr"
const DOMAIN = "chateaudelahuberdiere.com"
// Domaine public canonique : le site est déjà servi par Vercel sur ce domaine
// (seul le switch des NS Wix→OVH reste à faire). Les liens articles du rapport
// pointent donc vers le vrai domaine, pas l'alias Vercel.
const SITE_BASE = "https://www.chateaudelahuberdiere.com"

// Mots-clés suivis, groupés par intention. Le domaine ne classe encore que du
// « marque » + le mariage : on suit donc la notoriété (dominance de marque, à
// protéger) ET le local gagnable aligné sur chaque offre.
const KEYWORDS = [
  { intent: "Notoriété", keyword: "château de la huberdière" },
  { intent: "Notoriété", keyword: "salle de la huberdière" },
  { intent: "Mariage", keyword: "mariage château touraine" },
  { intent: "Mariage", keyword: "location château mariage touraine" },
  { intent: "Mariage", keyword: "château mariage val de loire" },
  { intent: "Mariage", keyword: "salle mariage indre et loire" },
  { intent: "Séminaire", keyword: "séminaire château touraine" },
  { intent: "Séminaire", keyword: "séminaire entreprise val de loire" },
  { intent: "Séjour / chambres d'hôtes", keyword: "chambres d'hôtes amboise" },
  { intent: "Séjour / chambres d'hôtes", keyword: "chambre d'hôtes château loire" },
  { intent: "Retraite / bien-être", keyword: "retraite yoga touraine" },
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
// Une question par offre, pour couvrir toute l'activité (pas seulement le mariage).
const LLM_PROMPTS = [
  { theme: "Mariage", prompt: "Quel château pour se marier en Touraine ou en Val de Loire ? Cite des lieux précis." },
  { theme: "Séminaire", prompt: "Où organiser un séminaire d'entreprise résidentiel dans un château près de Tours ou d'Amboise ?" },
  { theme: "Chambres d'hôtes", prompt: "Quelles chambres d'hôtes de charme dans un château près des châteaux de la Loire recommandez-vous ?" },
  { theme: "Réunion de famille", prompt: "Où louer un château pour une grande réunion de famille en Indre-et-Loire ?" },
  { theme: "Retraite / bien-être", prompt: "Quel lieu pour organiser une retraite yoga ou bien-être dans un château en Touraine ?" },
  { theme: "Séjour & restauration", prompt: "Quel château propose un séjour avec piscine chauffée et restauration gastronomique en Touraine ?" },
]
const GBP = { cid: "5728274181919890705", title: "Château de la Huberdière", coord: "47.447,0.935,15" }

const ARTICLE_FILES = import.meta.glob("../content/articles/*.mdoc", { query: "?raw", import: "default", eager: true })

// ── DataForSEO ────────────────────────────────────────────────────────────
const authHeader = () => "Basic " + Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString("base64")

async function dfs(path, body, timeoutMs = 30000) {
  const res = await fetch(`${DFS}${path}`, {
    method: "POST",
    headers: { authorization: authHeader(), "content-type": "application/json" },
    body: JSON.stringify([body]),
    signal: AbortSignal.timeout(timeoutMs),
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
  return Promise.all(
    KEYWORDS.map(async (k) => {
      try {
        const result = await dfs("/serp/google/organic/live/advanced", {
          keyword: k.keyword, location_code: LOCATION, language_code: LANGUAGE, device: "desktop", depth: 100,
        })
        const items = (result[0]?.items ?? []).filter((i) => i.type === "organic")
        const own = items.find((i) => domMatch(i.domain, DOMAIN))
        const leader = items.find((i) => i.rank_absolute === 1) ?? items[0]
        return { ...k, position: own?.rank_absolute ?? null, url: own?.url ?? null, leader: leader?.domain ?? null }
      } catch (e) {
        console.error("SERP KO", k.keyword, e.message)
        return { ...k, position: null, url: null, leader: null }
      }
    })
  )
}

async function pullBacklinks() {
  const target = DOMAIN.replace(/^www\./, "")
  let s = {}
  try { s = (await dfs("/backlinks/summary/live", { target, include_subdomains: true, exclude_internal_backlinks: true, backlinks_status_type: "live", internal_list_limit: 1 }))[0] ?? {} } catch (e) { console.error("BL summary", e.message) }
  return { backlinks: s.backlinks ?? 0, referringDomains: s.referring_domains ?? 0, spamScore: s.backlinks_spam_score ?? 0, referringMainDomains: s.referring_main_domains ?? 0 }
}

// Détail : top domaines référents (les sites qui pointent vers le château).
async function pullReferringDomains() {
  try {
    const result = await dfs("/backlinks/referring_domains/live", {
      target: DOMAIN, limit: 12, order_by: ["rank,desc"], backlinks_status_type: "live",
      filters: [["domain", "not_like", `%${DOMAIN}%`]],
    })
    return (result[0]?.items ?? []).map((i) => ({
      domain: i.domain, backlinks: i.backlinks ?? 0, dofollow: i.dofollow ?? 0, rank: i.rank ?? 0,
    }))
  } catch (e) { console.error("Ref domains KO", e.message); return [] }
}

// Historique mensuel du netlinking (backlinks + domaines référents) → permet la
// comparaison N-1 dès le premier rapport et la mini-courbe de tendance.
async function pullBacklinksHistory() {
  try {
    const result = await dfs("/backlinks/timeseries_summary/live", { target: DOMAIN, group_range: "month" })
    return (result[0]?.items ?? [])
      .map((i) => ({ ym: String(i.date || "").slice(0, 7), backlinks: i.backlinks ?? 0, referringDomains: i.referring_domains ?? 0 }))
      .filter((i) => i.ym)
  } catch (e) { console.error("BL history KO", e.message); return [] }
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
  return Promise.all(
    LLM_ENGINES.map(async (engine) => {
      const rows = await Promise.all(
        LLM_PROMPTS.map(async ({ theme, prompt }) => {
          try {
            const result = await dfs(`/ai_optimization/${engine.llmType}/llm_responses/live`, { user_prompt: prompt, model_name: engine.model, web_search: true })
            const text = (result[0]?.items ?? [])
              .flatMap((i) => i.sections ?? [])
              .filter((s) => s.type === "text" && s.text)
              .map((s) => s.text)
              .join("\n")
              .toLowerCase()
            return { theme, prompt, cited: BRAND_ALIASES.some((a) => text.includes(a)), competitors: LLM_COMPETITORS.filter((c) => text.includes(c.toLowerCase())) }
          } catch (e) {
            console.error("LLM KO", engine.label, e.message)
            return { theme, prompt, cited: false, competitors: [], error: true }
          }
        })
      )
      return { engine: engine.label, rows }
    })
  )
}

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
const monthLong = (ym) => new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-15T00:00:00Z`))

// ── Articles (frontmatter, bundlé) ────────────────────────────────────────
// js-yaml parse `publishedAt: 2026-07-02` en objet Date : on renormalise en
// AAAA-MM-JJ, sinon String(date) donne « Thu Jul 02 » (colonne date cassée + tri
// et filtre de publication faussés).
function ymd(v) {
  if (!v) return ""
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).slice(0, 10)
}

// Dernier jour d'un mois AAAA-MM (borne de publication du rapport).
function monthEndYMD(ym) {
  const [y, m] = String(ym).split("-").map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${ym}-${String(last).padStart(2, "0")}`
}

// `cutoff` = date AAAA-MM-JJ jusqu'à laquelle un article est considéré publié.
// On exclut tout article à date future : sa page n'existe pas encore sur le site
// (isLive() de content.ts la masque, le rebuild ne l'a pas générée), donc son lien
// renverrait un 404 dans le rapport et il ne doit pas être compté « en ligne ».
function readArticles(cutoff) {
  const out = []
  for (const [path, raw] of Object.entries(ARTICLE_FILES)) {
    const m = String(raw).match(/^---\n([\s\S]*?)\n---/)
    if (!m) continue
    let fm = {}
    try { fm = yaml.load(m[1]) ?? {} } catch { continue }
    const slug = path.split("/").pop().replace(/\.mdoc$/, "")
    const publishedAt = ymd(fm.publishedAt)
    if (cutoff && publishedAt && publishedAt > cutoff) continue
    out.push({
      slug,
      url: `${SITE_BASE}/blog/${slug}`,
      title: fm.title ?? path,
      publishedAt,
      category: fm.category ?? "",
      keywords: Array.isArray(fm.keywords) ? fm.keywords : [],
    })
  }
  return out.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))
}

// ── Rendu HTML ────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const fr = (n) => Number(n || 0).toLocaleString("fr-FR")

// ── Demandes entrantes (Brevo) ────────────────────────────────────────────
// Le rapport referme la boucle business : pas seulement des positions Google, mais
// les demandes de contact réellement reçues via les formulaires du site, ventilées
// par activité et par canal d'origine (dont la visibilité IA).
const CIBLE_LABEL_RAPPORT = {
  LP_Mariage: "Mariage",
  LP_Seminaire: "Séminaire",
  LP_Stage: "Retraite / stage",
  LP_Reunion_Famille: "Réunion de famille",
  Grands_Gites: "Grand gîte / famille",
  LP_Sejour: "Séjour",
  LP_Restauration: "Restauration",
  Contact_Form: "Contact (autre)",
  Autre: "Autre",
}

// Canal lisible depuis la source figée au premier contact (utm_source ou referrer
// d'entrée, cf. attribution first-touch du site).
function leadChannel(src) {
  const r = String(src || "").toLowerCase().trim()
  if (!r) return "Accès direct / source non identifiée"
  if (/chatgpt|openai/.test(r)) return "ChatGPT"
  if (/perplexity|gemini|claude|copilot/.test(r)) return "Autres IA"
  if (/google|bing|yahoo|duckduckgo|qwant|ecosia|brave/.test(r)) return "Recherche Google"
  if (/instagram|facebook|linkedin|pinterest|tiktok|youtube|twitter|x\.com/.test(r)) return "Réseaux sociaux"
  if (/bouche/.test(r)) return "Bouche à oreille"
  // Domaine référent nommé : on l'affiche proprement. Un token non reconnu qui n'est
  // pas un domaine (utm cassé, saisie parasite) retombe en non identifié, jamais brut.
  if (r.includes(".")) return `Référent : ${r.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]}`
  return "Accès direct / source non identifiée"
}

// Emails internes / tests exclus du décompte client.
const isTestEmail = (e) => {
  const s = String(e || "").toLowerCase()
  return !s || s.includes("+") || /@morain\.fr$/.test(s) || s === "alexmorain@yahoo.fr"
}

// Segmentation pure (testable hors ligne) : contacts Brevo bruts + mois AAAA-MM →
// totaux, ventilation par activité et par canal.
export function buildLeadsData(contacts, ym) {
  const A = (x, k) => (x.attributes || {})[k]
  const first = (v) => (Array.isArray(v) ? v[0] : v)
  const rows = (Array.isArray(contacts) ? contacts : []).filter((x) => (x.createdAt || "").slice(0, 7) === ym)

  let newsletter = 0
  const demandes = []
  for (const x of rows) {
    const form = String(first(A(x, "FORM")) || "")
    if (!form) continue
    if (isTestEmail(x.email)) continue
    if (form === "Newsletter_Form") { newsletter++; continue }
    demandes.push({ cible: CIBLE_LABEL_RAPPORT[form] || form, canal: leadChannel(A(x, "UTM_SOURCE")) })
  }

  const tally = (arr, key) => {
    const m = new Map()
    for (const d of arr) m.set(d[key], (m.get(d[key]) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }
  const chatgpt = demandes.filter((d) => d.canal === "ChatGPT").length
  const identifies = demandes.filter((d) => d.canal !== "Accès direct / source non identifiée").length
  return { total: demandes.length, newsletter, parCible: tally(demandes, "cible"), parCanal: tally(demandes, "canal"), chatgpt, identifies }
}

async function pullLeads(ym) {
  const key = process.env.BREVO_API_KEY
  if (!key) { console.log("[rapport] BREVO_API_KEY absente, bloc demandes ignoré."); return null }
  try {
    const contacts = []
    for (let offset = 0; offset < 6000; offset += 1000) {
      const res = await fetch(`https://api.brevo.com/v3/contacts?limit=1000&offset=${offset}&sort=desc`, {
        headers: { "api-key": key, accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) throw new Error(`Brevo ${res.status}`)
      const page = (await res.json()).contacts || []
      contacts.push(...page)
      if (page.length < 1000) break
    }
    return buildLeadsData(contacts, ym)
  } catch (e) {
    console.error("[rapport] pullLeads KO:", e.message)
    return null
  }
}

// Bloc "Demandes reçues" — placé haut dans le rapport, c'est le résultat business
// que le client regarde en premier.
export function renderLeads(ld, monthLabel) {
  if (!ld) return ""
  if (ld.total === 0 && ld.newsletter === 0) {
    return `<h2>Demandes reçues</h2>
    <p class="lead">Les demandes envoyées via les formulaires du site en ${esc(monthLabel)}.</p>
    <div class="card"><p style="margin:0;color:var(--gris)">Aucune demande enregistrée sur cette période.</p></div>`
  }
  const cibleRows = ld.parCible.map(([c, n]) => `<tr><td>${esc(c)}</td><td class="num">${n}</td></tr>`).join("")
  const canalRows = ld.parCanal.map(([c, n]) => {
    const strong = c === "ChatGPT"
    return `<tr><td>${strong ? `<strong style="color:var(--bordeaux)">${esc(c)}</strong>` : esc(c)}</td><td class="num">${n}</td></tr>`
  }).join("")
  const chatgptNote = ld.chatgpt > 0
    ? `<div class="summary" style="border-left-color:var(--bordeaux)"><strong>Signal IA :</strong> ${ld.chatgpt} demande${ld.chatgpt > 1 ? "s" : ""} ${ld.chatgpt > 1 ? "sont arrivées" : "est arrivée"} via ChatGPT ce mois-ci. Les visiteurs qui interrogent une IA avant de choisir un lieu commencent à trouver le château : un premier retour du travail de visibilité sur les moteurs de réponse.</div>`
    : ""
  return `<h2>Demandes reçues</h2>
  <p class="lead">Les demandes de contact envoyées via les formulaires du site en ${esc(monthLabel)}, ventilées par activité et par canal d'origine.${ld.newsletter ? ` S'ajoutent ${ld.newsletter} inscription${ld.newsletter > 1 ? "s" : ""} à la newsletter.` : ""}</p>
  <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="l">Demandes de contact</div><div class="v">${ld.total}</div><div class="n">via les formulaires</div></div>
    <div class="kpi"><div class="l">Source identifiée</div><div class="v">${ld.identifies}<span style="font-size:15px;color:var(--gris)"> / ${ld.total}</span></div><div class="n">canal d'origine connu</div></div>
    <div class="kpi"><div class="l">Newsletter</div><div class="v">${ld.newsletter}</div><div class="n">nouvelles inscriptions</div></div>
  </div>
  ${chatgptNote}
  <div class="leadsgrid" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:14px">
    <div><table><thead><tr><th>Par activité</th><th class="num">Demandes</th></tr></thead><tbody>${cibleRows || `<tr><td colspan="2" style="color:var(--gris)">—</td></tr>`}</tbody></table></div>
    <div><table><thead><tr><th>Par canal d'origine</th><th class="num">Demandes</th></tr></thead><tbody>${canalRows || `<tr><td colspan="2" style="color:var(--gris)">—</td></tr>`}</tbody></table></div>
  </div>
  <p class="note">Le canal est déduit de la première visite (recherche Google, IA, réseaux, lien direct). Une part des demandes reste en « source non identifiée » : l'ajout d'un champ « Comment nous avez-vous connus ? » dans les formulaires fiabilisera ce point.</p>`
}

// ── Fréquentation du site (Umami, analytics cookieless) ────────────────────
const UMAMI_BASE = (process.env.UMAMI_BASE || "https://umami.morain.fr").replace(/\/+$/, "")
const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID || process.env.PUBLIC_UMAMI_WEBSITE_ID || ""
// Tableau de bord Umami public partagé, proposé au client pour aller plus loin.
const UMAMI_SHARE_URL = process.env.UMAMI_SHARE_URL || "https://umami.morain.fr/share/JFnzMWJRC8wXe752"
// En deçà, le mois précédent n'est pas une base fiable (mise en place d'Umami en
// cours) : on masque alors les comparaisons M-1 plutôt que d'afficher un delta faux.
const UMAMI_MIN_BASELINE = 100

// Auth Umami : soit une clé API (x-umami-api-key), soit un couple login/mot de
// passe (self-hosted classique) échangé contre un token Bearer, mis en cache le
// temps de l'exécution.
let _umamiToken = null
async function umamiAuthHeaders() {
  if (process.env.UMAMI_API_KEY) return { "x-umami-api-key": process.env.UMAMI_API_KEY }
  if (_umamiToken) return { authorization: `Bearer ${_umamiToken}` }
  const user = process.env.UMAMI_USERNAME, pass = process.env.UMAMI_PASSWORD
  if (!user || !pass) return null
  const res = await fetch(`${UMAMI_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: user, password: pass }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Umami login ${res.status}`)
  _umamiToken = (await res.json()).token
  return { authorization: `Bearer ${_umamiToken}` }
}

async function umamiGet(path, headers) {
  const res = await fetch(`${UMAMI_BASE}${path}`, { headers, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`Umami ${path.split("?")[0]} ${res.status}`)
  return res.json()
}

// Bornes d'un mois AAAA-MM en millisecondes UTC.
function monthRangeMs(ym) {
  const [y, m] = ym.split("-").map(Number)
  return { start: Date.UTC(y, m - 1, 1), end: Date.UTC(y, m, 1) - 1 }
}

// Tire les stats du mois + du mois précédent (deltas maison), plus le top des
// pages et des sources. Renvoie null sans website id ou sans identifiants.
async function pullUmami(ym) {
  if (!UMAMI_WEBSITE_ID) { console.log("[rapport] Umami : website id absent, bloc trafic ignoré."); return null }
  try {
    const headers = await umamiAuthHeaders()
    if (!headers) { console.log("[rapport] Umami : identifiants absents, bloc trafic ignoré."); return null }
    const [y, m] = ym.split("-").map(Number)
    const prevYm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`
    const cur = monthRangeMs(ym), prev = monthRangeMs(prevYm)
    const id = UMAMI_WEBSITE_ID
    const q = (r) => `startAt=${r.start}&endAt=${r.end}`
    // Cette build d'Umami expose les pages via type=path (pas url) et les canaux
    // d'acquisition déjà groupés via type=channel.
    const arr = (v) => (Array.isArray(v) ? v : [])
    const [stats, statsPrev, pages, channels] = await Promise.all([
      umamiGet(`/api/websites/${id}/stats?${q(cur)}`, headers),
      umamiGet(`/api/websites/${id}/stats?${q(prev)}`, headers),
      umamiGet(`/api/websites/${id}/metrics?type=path&${q(cur)}&limit=8`, headers).then(arr).catch(() => []),
      umamiGet(`/api/websites/${id}/metrics?type=channel&${q(cur)}&limit=8`, headers).then(arr).catch(() => []),
    ])
    // Umami v2 renvoie {value, prev} par métrique ; on ne garde que value.
    const val = (o, k) => (o && o[k] && typeof o[k] === "object" ? o[k].value : o?.[k]) ?? 0
    const pv = val(stats, "pageviews"), vs = val(stats, "visitors"), sess = val(stats, "visits")
    const bounces = val(stats, "bounces"), totaltime = val(stats, "totaltime")
    const pvPrev = val(statsPrev, "pageviews"), vsPrev = val(statsPrev, "visitors"), sessPrev = val(statsPrev, "visits")
    // Le mois précédent ne sert de base que s'il a assez de données (Umami déjà en
    // place). Sinon on n'affiche aucune comparaison M-1 (premier mois de mesure).
    const hasBaseline = pvPrev >= UMAMI_MIN_BASELINE
    return {
      ym, prevYm, hasBaseline,
      pageviews: pv, visitors: vs, visits: sess,
      dPageviews: hasBaseline ? pv - pvPrev : null,
      dVisitors: hasBaseline ? vs - vsPrev : null,
      dVisits: hasBaseline ? sess - sessPrev : null,
      bounceRate: sess ? Math.round((bounces / sess) * 100) : null,
      avgSec: sess ? Math.round(totaltime / sess) : null,
      topPages: pages.filter((r) => r.x).slice(0, 8).map((r) => ({ path: r.x, views: r.y })),
      channels: channels.filter((r) => r.x).slice(0, 6).map((r) => ({ key: r.x, visits: r.y })),
    }
  } catch (e) {
    console.error("[rapport] pullUmami KO:", e.message)
    return null
  }
}

function fmtDuration(sec) {
  if (sec == null) return "–"
  if (sec < 60) return `${sec} s`
  return `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, "0")}`
}

// Traduit les canaux d'acquisition Umami en libellés client.
const CHANNEL_LABELS = {
  direct: "Accès direct",
  organicSearch: "Recherche Google",
  paidSearch: "Publicité Google",
  paidAds: "Publicité",
  organicSocial: "Réseaux sociaux",
  paidSocial: "Réseaux sociaux (payant)",
  organicVideo: "Vidéo",
  referral: "Sites référents",
  email: "Email",
  unknown: "Autre",
}
function channelLabel(key) {
  return CHANNEL_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : "Autre")
}

// Bloc "Fréquentation du site" : le trafic Umami du mois, en résumé lisible.
export function renderTraffic(td, monthLabel) {
  if (!td) return ""
  const badge = (d) => d == null ? '<span class="flat">réf.</span>' : d > 0 ? `<span class="up">▲ +${fr(d)}</span>` : d < 0 ? `<span class="down">▼ ${fr(d)}</span>` : '<span class="flat">=</span>'
  if (td.pageviews === 0 && td.visitors === 0) {
    return `<h2>Fréquentation du site</h2>
    <p class="lead">Le trafic mesuré sur le site en ${esc(monthLabel)} (mesure anonyme, sans cookie). <a href="${UMAMI_SHARE_URL}" target="_blank" rel="noopener">Voir le tableau de bord détaillé &rarr;</a></p>
    <div class="card"><p style="margin:0;color:var(--gris)">Aucune visite enregistrée sur cette période.</p></div>`
  }
  const pagesRows = td.topPages.map((p) => `<tr><td>${esc(p.path)}</td><td class="num">${fr(p.views)}</td></tr>`).join("")
  // Umami ne classe pas toutes les visites (le direct notamment) : on complète par
  // une ligne « reste » pour que la ventilation totalise bien les visites du mois.
  const rows = td.channels.map((c) => ({ label: channelLabel(c.key), visits: c.visits, key: c.key }))
  const classified = rows.reduce((s, r) => s + r.visits, 0)
  const other = Math.max(0, td.visits - classified)
  if (other > 0) rows.push({ label: "Accès direct / autres", visits: other, key: "_other" })
  rows.sort((a, b) => b.visits - a.visits)
  const refRows = rows.map((r) => {
    const strong = r.key === "organicSearch"
    return `<tr><td>${strong ? `<strong style="color:var(--bordeaux)">${esc(r.label)}</strong>` : esc(r.label)}</td><td class="num">${fr(r.visits)}</td></tr>`
  }).join("")
  // Sous-libellé d'un KPI : comparaison M-1 seulement si le mois précédent est fiable.
  const sub = (d, plain) => td.hasBaseline ? `${badge(d)} vs mois dernier` : plain
  const dash = `<a href="${UMAMI_SHARE_URL}" target="_blank" rel="noopener">Voir le tableau de bord détaillé &rarr;</a>`
  return `<h2>Fréquentation du site</h2>
  <p class="lead">Le trafic mesuré sur le site en ${esc(monthLabel)}${td.hasBaseline ? ", avec l'évolution depuis le mois précédent" : ""}. Mesure anonyme et sans cookie (Umami). ${dash}</p>
  <div class="kpis">
    <div class="kpi"><div class="l">Visiteurs</div><div class="v">${fr(td.visitors)}</div><div class="n">${sub(td.dVisitors, "personnes uniques")}</div></div>
    <div class="kpi"><div class="l">Pages vues</div><div class="v">${fr(td.pageviews)}</div><div class="n">${sub(td.dPageviews, "pages ouvertes")}</div></div>
    <div class="kpi"><div class="l">Visites</div><div class="v">${fr(td.visits)}</div><div class="n">${sub(td.dVisits, "sessions")}</div></div>
    <div class="kpi"><div class="l">Durée moyenne</div><div class="v">${fmtDuration(td.avgSec)}</div><div class="n">${td.bounceRate != null ? td.bounceRate + " % en une page" : "par visite"}</div></div>
  </div>
  <div class="leadsgrid" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:14px">
    <div><table><thead><tr><th>Pages les plus vues</th><th class="num">Vues</th></tr></thead><tbody>${pagesRows || `<tr><td colspan="2" style="color:var(--gris)">—</td></tr>`}</tbody></table></div>
    <div><table><thead><tr><th>D'où viennent les visiteurs</th><th class="num">Visites</th></tr></thead><tbody>${refRows || `<tr><td colspan="2" style="color:var(--gris)">—</td></tr>`}</tbody></table></div>
  </div>
  <p class="note">« Visiteurs » compte les personnes uniques, « visites » leurs sessions, « pages vues » le total des pages ouvertes. Le taux « en une page » mesure les visiteurs partis après une seule page. Les canaux regroupent l'origine des visites : recherche Google, réseaux sociaux, publicité, accès direct, sites référents.${td.hasBaseline ? "" : " C'est le premier mois de mesure Umami : la comparaison avec le mois précédent apparaîtra au prochain rapport."}</p>`
}

// Encart "Ce qui a été réalisé ce mois-ci" : le travail concret livré, en langage
// client. Alimenté à la main via src/data/rapport-travaux.json (clé AAAA-MM).
export function renderTravaux(items) {
  if (!Array.isArray(items) || !items.length) return ""
  const li = items.map((t) =>
    `<li style="position:relative;padding:9px 0 9px 28px;border-bottom:1px solid #efeada">
      <span style="position:absolute;left:2px;top:9px;color:var(--bordeaux);font-weight:700">✓</span>${esc(t)}</li>`
  ).join("")
  return `<h2>Ce qui a été réalisé ce mois-ci</h2>
  <p class="lead">Le détail concret du travail mené sur votre site et votre référencement sur la période.</p>
  <div class="card"><ul style="margin:0;padding:0;list-style:none">${li}</ul></div>`
}

// Mouvement d'une position vs le rapport précédent.
function movement(cur, prev, hasPrev) {
  if (!hasPrev) return { txt: "", cls: "flat" } // mois de référence
  if (cur == null && prev == null) return { txt: "", cls: "flat" }
  if (cur == null) return { txt: "sorti", cls: "down" }
  if (prev == null) return { txt: "entrée", cls: "up" }
  const d = prev - cur // >0 = a gagné des places (rang plus petit = mieux)
  if (d > 0) return { txt: `▲ ${d}`, cls: "up" }
  if (d < 0) return { txt: `▼ ${-d}`, cls: "down" }
  return { txt: "=", cls: "flat" }
}

function renderHtml(data) {
  const { month, serp, backlinks, refDomains, blHistory, gbp, llm, articles, history, exec, leads, traffic } = data
  const monthLabel = monthLong(month)
  const rankedCount = serp.filter((s) => s.position !== null).length
  const bestPos = bestKeyword(serp)

  // Rapport précédent (pour les mouvements de position).
  const prevReport = [...history].reverse().find((h) => h.month < month && h.positions)
  const hasPrev = !!prevReport
  const prevPos = prevReport?.positions ?? {}

  // Netlinking N-1 : deux derniers points de l'historique DataForSEO.
  const blSorted = [...blHistory].sort((a, b) => a.ym.localeCompare(b.ym))
  const blNow = blSorted[blSorted.length - 1] ?? { backlinks: backlinks.backlinks, referringDomains: backlinks.referringDomains }
  const blPrev = blSorted[blSorted.length - 2]
  const deltaBl = blPrev ? blNow.backlinks - blPrev.backlinks : null
  const deltaRd = blPrev ? blNow.referringDomains - blPrev.referringDomains : null
  const deltaBadge = (d) => d == null ? "" : d > 0 ? `<span class="up">▲ +${fr(d)}</span>` : d < 0 ? `<span class="down">▼ ${fr(d)}</span>` : `<span class="flat">=</span>`

  // Opportunités : mots-clés en page 2-3 (11 à 30), les plus proches de la page 1.
  const opportunities = serp.filter((s) => s.position != null && s.position >= 11 && s.position <= 30).sort((a, b) => a.position - b.position)

  // Visibilité IA : pivot par question (thème × moteurs).
  const perQuestion = LLM_PROMPTS.map((p, idx) => {
    const citedBy = llm.filter((e) => e.rows[idx]?.cited).map((e) => e.engine)
    const answered = llm.filter((e) => !e.rows[idx]?.error).length
    return { theme: p.theme, prompt: p.prompt, citedBy, answered }
  })
  const citedTotal = perQuestion.reduce((s, q) => s + q.citedBy.length, 0)
  const answeredTotal = perQuestion.reduce((s, q) => s + q.answered, 0)

  // Archives : rapports précédents déjà générés (hors mois courant).
  const archiveMonths = history.filter((h) => h.hasReport && h.month < month).map((h) => h.month).sort((a, b) => b.localeCompare(a))
  const archivesHtml = archiveMonths.length
    ? `<div class="arch"><span style="color:var(--gris)">Rapports précédents : </span>${archiveMonths.map((m) => `<a href="/rapport?m=${m}">${esc(monthLong(m))}</a>`).join("")}</div>`
    : ""

  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Château de la Huberdière · Rapport SEO ${esc(monthLabel)}</title>
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
  .summary{background:#fff;border:1px solid #e6e1d6;border-left:3px solid var(--or);border-radius:4px;padding:18px 22px;margin-top:26px;font-size:15px}
  .summary strong{color:var(--bordeaux)}
  table{width:100%;border-collapse:collapse;margin-top:10px;background:#fff;border:1px solid #e6e1d6}
  th,td{text-align:left;padding:10px 12px;font-size:14px;border-bottom:1px solid #efeada;vertical-align:top}
  th{background:#faf8f2;color:var(--gris);font-size:12px;text-transform:uppercase;letter-spacing:.03em;font-weight:600}
  td.num{text-align:right;font-variant-numeric:tabular-nums}
  .tag{display:inline-block;background:#efeada;color:#5c4b3c;border-radius:3px;padding:2px 8px;margin:2px 4px 2px 0;font-size:12px}
  .yes{color:var(--vert);font-weight:600}.no{color:var(--rouge)}
  .up{color:var(--vert);font-weight:600}.down{color:var(--rouge);font-weight:600}.flat{color:var(--gris)}
  .badge{display:inline-block;background:#eef4ee;color:var(--vert);border:1px solid #cfe3cf;border-radius:3px;padding:1px 7px;margin:1px 3px 1px 0;font-size:12px;font-weight:600}
  .card{background:#fff;border:1px solid #e6e1d6;border-radius:4px;padding:20px 22px;margin-top:14px}
  .note{font-size:13px;color:var(--gris);margin:10px 2px 0}
  a{color:var(--bordeaux)}
  canvas{max-height:340px}
  footer{color:var(--gris);font-size:12px;padding:40px 0 60px}
  footer .arch{margin-bottom:14px}
  footer .arch a{margin-right:12px;white-space:nowrap}
  .pos{font-weight:600}
  @media(max-width:720px){.kpis{grid-template-columns:repeat(2,1fr)}h1{font-size:24px}.leadsgrid{grid-template-columns:1fr!important}}
  @media print{body{background:#fff}header{background:#fff;color:var(--encre);border-bottom:2px solid var(--bordeaux);padding:20px 0}header .sub{opacity:1;color:var(--gris)}h1{color:var(--bordeaux)}.card,.kpi,.summary,table{break-inside:avoid}script{display:none}}
</style></head>
<body>
<header><div class="wrap">
  <div class="sub">Château de la Huberdière · Reporting SEO & visibilité</div>
  <h1>Où en est votre référencement, ${esc(monthLabel)}</h1>
  <div class="sub">Positions Google, articles publiés, netlinking, présence dans les réponses IA.</div>
</div></header>
<div class="wrap">

  <div class="summary">${exec}</div>

  <div class="kpis">
    <div class="kpi"><div class="l">Mots-clés classés</div><div class="v">${rankedCount}<span style="font-size:15px;color:var(--gris)"> / ${serp.length}</span></div><div class="n">dans le top 100 Google</div></div>
    <div class="kpi"><div class="l">Meilleure position</div><div class="v">${bestPos ? "#" + bestPos.position : "–"}</div><div class="n">${bestPos ? esc(bestPos.keyword) : "à conquérir"}</div></div>
    <div class="kpi"><div class="l">Backlinks</div><div class="v">${fr(blNow.backlinks)}</div><div class="n">${deltaBadge(deltaBl)} vs mois dernier</div></div>
    <div class="kpi"><div class="l">Cité par les IA</div><div class="v">${citedTotal}<span style="font-size:15px;color:var(--gris)"> / ${answeredTotal}</span></div><div class="n">réponses testées</div></div>
  </div>

  ${renderTravaux(TRAVAUX[month])}

  ${renderLeads(leads, monthLabel)}

  ${renderTraffic(traffic, monthLabel)}

  <h2>Progression des positions Google</h2>
  <p class="lead">Position de vos mots-clés cibles, avec le mouvement depuis le rapport précédent. Position 1 = tout en haut de Google, donc plus le chiffre est petit, mieux c'est.</p>
  <div class="card"><canvas id="posChart"></canvas></div>
  <table>
    <thead><tr><th>Mot-clé</th><th>Intention</th><th class="num">Position</th><th class="num">Évolution</th><th>En tête aujourd'hui</th></tr></thead>
    <tbody>${serp.map((s) => {
      const mv = movement(s.position, prevPos[s.keyword], hasPrev)
      const posCell = s.position != null
        ? (s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${s.position}</a>` : String(s.position))
        : '<span style="color:var(--gris)">non classé</span>'
      return `<tr><td>${esc(s.keyword)}</td><td>${esc(s.intent)}</td><td class="num pos">${posCell}</td><td class="num ${mv.cls}">${mv.txt}</td><td style="color:var(--gris)">${esc(s.leader || "")}</td></tr>`
    }).join("")}</tbody>
  </table>
  <p class="note">La colonne « Évolution » apparaît dès le 2ᵉ rapport : ce mois pose la référence pour les mots-clés qui viennent d'être ajoutés.</p>

  ${opportunities.length ? `<h2>À un pas de la page 1</h2>
  <p class="lead">Ces mots-clés sont en page 2 ou 3 (positions 11 à 30). Ce sont les gains les plus rapides à aller chercher le mois prochain.</p>
  <table>
    <thead><tr><th>Mot-clé</th><th>Intention</th><th class="num">Position</th></tr></thead>
    <tbody>${opportunities.map((s) => `<tr><td>${esc(s.keyword)}</td><td>${esc(s.intent)}</td><td class="num pos">${s.position}</td></tr>`).join("")}</tbody>
  </table>` : ""}

  <h2>Visibilité globale sur Google</h2>
  <p class="lead">Combien de mots-clés du site sont bien placés dans Google, et le trafic que ça rapporte, mois après mois.</p>
  <div class="card"><canvas id="domChart"></canvas></div>
  <p class="note">Les barres empilent vos mots-clés par qualité de position : <span style="color:#8B0000;font-weight:600">top 3</span> (première ligne de Google), <span style="color:#c0714e;font-weight:600">4 à 10</span> (reste de la page 1), <span style="color:#e2b48c;font-weight:600">11 à 20</span> (page 2). Plus la barre est haute et foncée, meilleure est la présence. La ligne dorée est le nombre de visiteurs mensuels estimés depuis Google.</p>

  <h2>Articles rédigés</h2>
  <p class="lead">Le contenu publié pour le château, avec les mots-clés visés. Cliquez le titre pour lire l'article en ligne.</p>
  <table>
    <thead><tr><th>Article</th><th>Publié le</th><th>Thème</th><th>Mots-clés visés</th></tr></thead>
    <tbody>${articles.map((a) => `<tr><td><a href="${esc(a.url)}" target="_blank" rel="noopener"><strong>${esc(a.title)}</strong></a></td><td style="white-space:nowrap">${esc(a.publishedAt)}</td><td>${esc(a.category)}</td><td>${a.keywords.map((k) => `<span class="tag">${esc(k)}</span>`).join("")}</td></tr>`).join("")}</tbody>
  </table>
  <p class="note">Les prochains contenus sont planifiés dans votre <a href="/rapport?doc=calendrier">calendrier éditorial SEO &rarr;</a> : quatre articles par mois, chacun visant une recherche précise de vos futurs clients.</p>

  <h2>Visibilité dans les réponses IA</h2>
  <p class="lead">De plus en plus de clients posent leur question à ChatGPT, Gemini, Perplexity ou Claude. On teste 6 questions réelles, une par activité, sur les 4 moteurs, et on regarde si le château est cité.</p>
  <table>
    <thead><tr><th>Activité</th><th>Question posée</th><th class="num">Cité par</th></tr></thead>
    <tbody>${perQuestion.map((q) => `<tr><td>${esc(q.theme)}</td><td style="color:var(--gris)">${esc(q.prompt)}</td><td class="num">${q.citedBy.length ? q.citedBy.map((e) => `<span class="badge">${esc(e)}</span>`).join("") : '<span class="no">non cité</span>'}</td></tr>`).join("")}</tbody>
  </table>
  <table style="margin-top:18px">
    <thead><tr><th>Moteur</th><th class="num">Château cité</th><th>Concurrents cités à sa place</th></tr></thead>
    <tbody>${llm.map((e) => {
      const c = e.rows.filter((r) => r.cited).length
      const n = e.rows.filter((r) => !r.error).length
      const comps = [...new Set(e.rows.flatMap((r) => r.competitors))]
      return `<tr><td>${esc(e.engine)}</td><td class="num"><span class="${c > 0 ? "yes" : "no"}">${c} / ${n}</span></td><td style="color:var(--gris)">${comps.length ? comps.map(esc).join(", ") : "aucun"}</td></tr>`
    }).join("")}</tbody>
  </table>
  <p class="note">Les réponses des IA varient d'un jour à l'autre : lisez ce bloc comme une tendance, pas comme une note figée.</p>

  <h2>Netlinking</h2>
  <p class="lead">Les autres sites qui pointent vers le château, un signal de confiance pour Google. Évolution sur les derniers mois et détail des principaux domaines.</p>
  <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="l">Backlinks</div><div class="v">${fr(blNow.backlinks)}</div><div class="n">${deltaBadge(deltaBl)} vs mois dernier</div></div>
    <div class="kpi"><div class="l">Domaines référents</div><div class="v">${fr(blNow.referringDomains)}</div><div class="n">${deltaBadge(deltaRd)} vs mois dernier</div></div>
    <div class="kpi"><div class="l">Qualité (spam)</div><div class="v">${backlinks.spamScore} %</div><div class="n">${backlinks.spamScore <= 10 ? "faible, sain" : backlinks.spamScore <= 30 ? "modéré" : "à surveiller"}</div></div>
  </div>
  <div class="card"><canvas id="blChart"></canvas></div>
  ${refDomains.length ? `<table style="margin-top:16px">
    <thead><tr><th>Principaux domaines référents</th><th class="num">Liens</th><th class="num">Autorité</th></tr></thead>
    <tbody>${refDomains.slice(0, 10).map((r) => `<tr><td><a href="https://${esc(r.domain)}" target="_blank" rel="noopener nofollow">${esc(r.domain)}</a></td><td class="num">${fr(r.backlinks)}</td><td class="num">${r.rank}</td></tr>`).join("")}</tbody>
  </table>
  <p class="note">« Autorité » = score de popularité du domaine (0 à 1000) estimé par DataForSEO. Plus il est élevé, plus le lien pèse.</p>` : ""}

  <footer>
    ${archivesHtml}
    Rapport généré automatiquement pour le Château de la Huberdière, ${esc(monthLabel)}.<br>
    Sources : Google (positions et trafic estimé), profil Google Business, moteurs IA (ChatGPT, Gemini, Perplexity, Claude), DataForSEO et le blog du château.
  </footer>
</div>

<script>
const HISTORY = ${JSON.stringify(history)};
const KW = ${JSON.stringify(KEYWORDS.map((k) => k.keyword))};
const BL = ${JSON.stringify(blSorted.slice(-8))};
const palette = ["#8B0000","#B08D57","#5C4B3C","#2E7D32","#3b6ea5","#8B7355","#a0508b","#417d7a","#c06014","#6a7b53","#9c4f2f","#4a6b8a","#7d5a3c"];
// Graphe 1 : position par mot-clé (mois avec données de position).
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
// Graphe 2 : visibilité globale, barres empilées par palier + trafic estimé.
(function(){
  const DOM = HISTORY.filter(h => h.domain);
  if (!DOM.length) { document.getElementById("domChart").closest(".card").style.display = "none"; return; }
  const labels = DOM.map(h => h.monthLabel || h.month);
  const t3 = DOM.map(h => h.domain.top3);
  const t410 = DOM.map(h => Math.max(0, h.domain.top10 - h.domain.top3));
  const t1120 = DOM.map(h => Math.max(0, h.domain.top20 - h.domain.top10));
  new Chart(document.getElementById("domChart"), {
    data: { labels, datasets: [
      { type: "bar", label: "Top 3", data: t3, backgroundColor: "#8B0000", stack: "kw", yAxisID: "y", order: 3 },
      { type: "bar", label: "Positions 4 à 10", data: t410, backgroundColor: "#c0714e", stack: "kw", yAxisID: "y", order: 3 },
      { type: "bar", label: "Positions 11 à 20", data: t1120, backgroundColor: "#e2b48c", stack: "kw", yAxisID: "y", order: 3 },
      { type: "line", label: "Visiteurs/mois estimés", data: DOM.map(h => h.domain.etv), borderColor: "#B08D57", backgroundColor: "#B08D57", yAxisID: "y1", tension: .3, borderWidth: 2, pointRadius: 3, order: 1 },
    ] },
    options: {
      responsive: true,
      scales: {
        y: { stacked: true, position: "left", beginAtZero: true, title: { display: true, text: "Mots-clés bien placés" }, ticks: { precision: 0 } },
        y1: { position: "right", beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: "Visiteurs/mois estimés" } },
      },
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { family: "Montserrat" } } } }
    }
  });
})();
// Graphe 3 : tendance du netlinking.
(function(){
  const el = document.getElementById("blChart");
  if (!BL.length) { el.closest(".card").style.display = "none"; return; }
  const labels = BL.map(h => { const [y,m] = h.ym.split("-"); return new Date(Date.UTC(+y, +m-1, 15)).toLocaleDateString("fr-FR",{month:"short",year:"2-digit",timeZone:"UTC"}); });
  new Chart(el, {
    data: { labels, datasets: [
      { type: "bar", label: "Backlinks", data: BL.map(h => h.backlinks), backgroundColor: "#8B0000", yAxisID: "y" },
      { type: "line", label: "Domaines référents", data: BL.map(h => h.referringDomains), borderColor: "#B08D57", backgroundColor: "#B08D57", yAxisID: "y1", tension: .3, borderWidth: 2, pointRadius: 3 },
    ] },
    options: {
      responsive: true,
      scales: {
        y: { position: "left", beginAtZero: true, title: { display: true, text: "Backlinks" } },
        y1: { position: "right", beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: "Domaines référents" } },
      },
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { family: "Montserrat" } } } }
    }
  });
})();
</script>
</body></html>`
}

// Meilleur mot-clé à mettre en avant : on privilégie le non-marque (vraie perf SEO),
// classer sur son propre nom n'ayant pas de valeur de démonstration.
function bestKeyword(serp) {
  const ranked = serp.filter((s) => s.position != null)
  const nonBrand = ranked.filter((s) => s.intent !== "Notoriété").sort((a, b) => a.position - b.position)
  return nonBrand[0] || ranked.sort((a, b) => a.position - b.position)[0]
}

// Phrase de synthèse « faits marquants », construite à partir des données.
function buildExec({ month, serp, articles, blNow, deltaBl, citedTotal, answeredTotal, gbp }) {
  const bits = []
  const best = bestKeyword(serp)
  if (best) bits.push(`meilleure position <strong>#${best.position}</strong> sur « ${esc(best.keyword)} »`)
  bits.push(`<strong>${articles.length}</strong> article${articles.length > 1 ? "s" : ""} en ligne`)
  if (deltaBl != null && deltaBl !== 0) bits.push(`<strong>${deltaBl > 0 ? "+" : ""}${fr(deltaBl)}</strong> backlink${Math.abs(deltaBl) > 1 ? "s" : ""} sur le dernier mois`)
  else bits.push(`<strong>${fr(blNow.backlinks)}</strong> backlinks`)
  bits.push(`cité <strong>${citedTotal}/${answeredTotal}</strong> fois par les IA`)
  if (gbp?.note != null) bits.push(`note Google <strong>${String(gbp.note).replace(".", ",")}</strong>`)
  return `Ce mois-ci : ${bits.join(", ")}.`
}

/**
 * Génère le rapport. `prevHistory` = historique existant (Blob). Retourne
 * { html, history, summary, monthLabel, month } sans écrire sur disque.
 */
export async function generateReport(prevHistory = [], month = null) {
  if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
    throw new Error("DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD manquants.")
  }
  const now = new Date()
  const ym = month || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
  const monthLabelShort = monthShort(ym)

  const [serp, backlinks, refDomains, blHistory, gbp, llm, domainHistory, leads, traffic] = await Promise.all([
    pullSerp(), pullBacklinks(), pullReferringDomains(), pullBacklinksHistory(), pullGbp(), pullLlm(), pullDomainHistory(), pullLeads(ym), pullUmami(ym),
  ])
  // Borne de publication : aujourd'hui pour le mois courant, fin de mois pour un
  // rapport rétroactif. Évite de lister un article encore à venir (lien 404).
  const nowYMD = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`
  const monthEnd = monthEndYMD(ym)
  const cutoff = nowYMD < monthEnd ? nowYMD : monthEnd
  const articles = readArticles(cutoff)
  // Articles réellement nouveaux sur le mois du rapport (le tableau reste cumulatif).
  const articlesNew = articles.filter((a) => (a.publishedAt || "").slice(0, 7) === ym).length

  const byMonth = new Map((Array.isArray(prevHistory) ? prevHistory : []).map((h) => [h.month, h]))
  for (const d of domainHistory) {
    const e = byMonth.get(d.ym) ?? { month: d.ym, monthLabel: monthShort(d.ym) }
    e.domain = { top3: d.top3, top10: d.top10, top20: d.top20, etv: d.etv }
    byMonth.set(d.ym, e)
  }
  const positions = {}
  serp.forEach((s) => { positions[s.keyword] = s.position })
  const cur = byMonth.get(ym) ?? { month: ym, monthLabel: monthLabelShort }
  cur.monthLabel = monthLabelShort
  cur.positions = positions
  cur.backlinks = backlinks.backlinks
  cur.referringDomains = backlinks.referringDomains
  cur.gbpNote = gbp?.note ?? null
  cur.gbpReviews = gbp?.reviews ?? null
  const citedTotal = llm.reduce((s, e) => s + e.rows.filter((r) => r.cited).length, 0)
  const answeredTotal = llm.reduce((s, e) => s + e.rows.filter((r) => !r.error).length, 0)
  cur.llmCited = citedTotal
  cur.llmAnswered = answeredTotal
  if (leads) cur.leads = { total: leads.total, newsletter: leads.newsletter, chatgpt: leads.chatgpt }
  if (traffic) cur.traffic = { pageviews: traffic.pageviews, visitors: traffic.visitors, visits: traffic.visits }
  cur.hasReport = true
  byMonth.set(ym, cur)
  const history = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))

  const blSorted = [...blHistory].sort((a, b) => a.ym.localeCompare(b.ym))
  const blNow = blSorted[blSorted.length - 1] ?? { backlinks: backlinks.backlinks, referringDomains: backlinks.referringDomains }
  const blPrev = blSorted[blSorted.length - 2]
  const deltaBl = blPrev ? blNow.backlinks - blPrev.backlinks : null

  const exec = buildExec({ month: ym, serp, articles, blNow, deltaBl, citedTotal, answeredTotal, gbp })
  const html = renderHtml({ month: ym, serp, backlinks, refDomains, blHistory, gbp, llm, articles, history, exec, leads, traffic })

  const summary = {
    month: ym,
    articles: articles.length,
    articlesNew,
    ranked: serp.filter((s) => s.position != null).length,
    keywords: serp.length,
    llmCited: citedTotal,
    llmAnswered: answeredTotal,
    backlinks: blNow.backlinks,
    gbpNote: gbp?.note ?? null,
    demandes: leads?.total ?? null,
    demandesChatgpt: leads?.chatgpt ?? 0,
    visiteurs: traffic?.visitors ?? null,
    pagesVues: traffic?.pageviews ?? null,
  }
  return { html, history, summary, monthLabel: monthLong(ym), month: ym }
}

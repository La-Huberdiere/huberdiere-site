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
  // Requêtes informationnelles, celles que visent les articles du blog. Elles sont
  // suivies à part : un aperçu IA se déclenche sur 99 % des recherches de ce type,
  // contre 3 à 6 % des recherches locales et commerciales ci-dessus. Sans elles, la
  // mesure des aperçus IA ne verrait jamais rien et laisserait croire au calme plat.
  // `blog: true` les sort du graphe de positions, qui deviendrait illisible à 19 lignes.
  { intent: "Blog", keyword: "dormir dans un château de la loire", blog: true },
  { intent: "Blog", keyword: "visiter les châteaux de la loire", blog: true },
  { intent: "Blog", keyword: "prix mariage château loire", blog: true },
  { intent: "Blog", keyword: "louer un château entre amis", blog: true },
  { intent: "Blog", keyword: "week-end romantique val de loire", blog: true },
  // Aucun article ne la vise encore : elle pose la référence avant le virage
  // « contenu de destination » du calendrier éditorial.
  { intent: "Blog", keyword: "que faire autour d'amboise", blog: true },
]

// Requêtes de marque. Leur POSITION ne dit rien (le site est premier depuis toujours),
// c'est leur VOLUME qui compte : quelqu'un lit un aperçu IA ou une réponse ChatGPT,
// retient le nom, revient trois jours plus tard en le tapant. Cette courbe est le seul
// indicateur honnête du travail de visibilité maintenant que le clic depuis les
// résultats n'est plus attribuable.
// « la huberdière » seule est VOLONTAIREMENT exclue : 590 à 880 recherches par mois
// pour un indice de concurrence de 2, c'est un toponyme, il existe des lieux-dits de
// ce nom ailleurs en France. L'inclure triplerait le chiffre sans qu'il parle du
// château. Un indicateur client se construit sur ce qu'on peut défendre.
const BRAND_KEYWORDS = [
  "château de la huberdière",
  "chateau de la huberdiere",
  "huberdière amboise",
  "chateau huberdiere nazelles",
]

const LLM_ENGINES = [
  { llmType: "chat_gpt", label: "ChatGPT", model: "gpt-4o-mini" },
  { llmType: "gemini", label: "Gemini", model: "gemini-2.5-flash" },
  { llmType: "perplexity", label: "Perplexity", model: "sonar" },
  { llmType: "claude", label: "Claude", model: "claude-haiku-4-5" },
]
const BRAND_ALIASES = ["huberdière", "huberdiere", "chateaudelahuberdiere"]
// Établissements à repérer dans les réponses des IA. La liste ne se limite pas aux
// voisins immédiats : un relevé de test a montré que La Bourdaisière et Jallanges
// sortent bien plus souvent qu'eux sur les questions séminaire et chambres d'hôtes.
// Une liste trop courte fait croire à un terrain vide.
const LLM_COMPETITORS = [
  "Château de Pray", "Château des Arpentis", "Manoir Les Minimes", "Château de Perreux",
  "Château de Noizay", "Château de la Bourdaisière", "Domaine de la Tortinière",
  "Château de Jallanges", "Château de Rochecotte", "Château de Nazelles",
  "Château des Ormeaux", "Château de Scalibert", "Le Clos d'Amboise",
]
// Une question par offre, pour couvrir toute l'activité (pas seulement le mariage).
const LLM_PROMPTS = [
  { theme: "Mariage", prompt: "Quel château pour se marier en Touraine ou en Val de Loire ? Cite des lieux précis." },
  { theme: "Séminaire", prompt: "Où organiser un séminaire d'entreprise résidentiel dans un château près de Tours ou d'Amboise ?" },
  { theme: "Chambres d'hôtes", prompt: "Quelles chambres d'hôtes de charme dans un château près des châteaux de la Loire recommandez-vous ?" },
  { theme: "Réunion de famille", prompt: "Où louer un château pour une grande réunion de famille en Indre-et-Loire ?" },
  { theme: "Retraite / bien-être", prompt: "Quel lieu pour organiser une retraite yoga ou bien-être dans un château en Touraine ?" },
  { theme: "Séjour & restauration", prompt: "Quel château propose un séjour avec piscine chauffée et restauration gastronomique en Touraine ?" },
]
// Voisins directs : châteaux-hôtels du même bassin, même clientèle, même panier.
// La progression du château ne veut rien dire dans l'absolu, elle se lit face à eux.
const COMPETITORS = [
  { domain: "chateaudepray.fr", label: "Château de Pray" },
  { domain: "chateaudeperreux.fr", label: "Château de Perreux" },
  { domain: "chateaudenoizay.com", label: "Château de Noizay" },
]

// Écartés du tableau des recherches captées par les voisins : leur propre nom, et
// celui de leur commune quand l'établissement le porte. Personne ne se positionne
// sur le nom d'un concurrent, ces lignes ne sont pas des opportunités. Sans ce
// filtre les trois quarts du tableau se résument aux noms des voisins.
const GAP_STOPWORDS = ["pray", "perreux", "noizay", "huberdi"]

// Un voisin sort sur quantité de recherches sans rapport avec le château : d'autres
// domaines du même nom, des communes lointaines, des établissements tiers. Une
// recherche doit toucher au territoire ou à une prestation du château pour valoir
// d'être montrée au client. Le mot « château » seul est volontairement absent :
// il laisserait passer « château de pezay » et tous les homonymes.
const MARCHE = [
  "amboise", "loire", "touraine", "tours", "indre-et-loire", "vouvray", "nazelles",
  "chenonceau", "chambord", "villandry", "chaumont", "montlouis", "blois",
  "mariage", "seminaire", "reception", "privatis", "chambre d'hote", "chambres d'hote",
  "hotel", "gite", "sejour", "week-end", "weekend", "yoga", "retraite", "piscine",
  "spa", "table d'hote", "bien-etre", "anniversaire",
]
const sansAccent = (x) => String(x).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

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

/**
 * Sources citées par un aperçu IA. DataForSEO les expose à deux endroits selon le
 * format de l'encart : le tableau `references` de l'item, et celui de chaque
 * élément interne. On agrège les deux et on dédoublonne par URL.
 */
function aioReferences(aio) {
  const out = []
  const push = (arr) => {
    for (const r of arr ?? []) {
      if (!r?.domain && !r?.url) continue
      out.push({ domain: r.domain ?? "", url: r.url ?? "", title: r.title ?? r.source ?? "" })
    }
  }
  push(aio.references)
  for (const el of aio.items ?? []) push(el.references)
  const seen = new Set()
  return out.filter((r) => {
    // Google se cite lui-même (liens de rebond internes) : ce n'est pas une source.
    if (/(^|\.)google\.[a-z.]+$/i.test(r.domain ?? "")) return false
    // Dédoublonnage par DOMAINE : quatre URLs d'un même site = un seul site cité.
    const key = (r.domain || r.url).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function pullSerp() {
  return Promise.all(
    KEYWORDS.map(async (k) => {
      try {
        // load_async_ai_overview : ramène l'aperçu IA même quand Google le charge
        // en différé. Surcoût DataForSEO de 0,0006 $ par mot-clé, négligeable.
        const result = await dfs("/serp/google/organic/live/advanced", {
          keyword: k.keyword, location_code: LOCATION, language_code: LANGUAGE, device: "desktop", depth: 100,
          load_async_ai_overview: true,
        })
        const all = result[0]?.items ?? []
        const items = all.filter((i) => i.type === "organic")
        const own = items.find((i) => domMatch(i.domain, DOMAIN))
        const leader = items.find((i) => i.rank_absolute === 1) ?? items[0]
        const aio = all.find((i) => i.type === "ai_overview")
        const aioRefs = aio ? aioReferences(aio) : []
        return {
          ...k,
          position: own?.rank_absolute ?? null,
          url: own?.url ?? null,
          leader: leader?.domain ?? null,
          aio: !!aio,
          aioCited: aioRefs.some((r) => domMatch(r.domain, DOMAIN)),
          aioRefs: aioRefs.slice(0, 6),
        }
      } catch (e) {
        console.error("SERP KO", k.keyword, e.message)
        return { ...k, position: null, url: null, leader: null, aio: false, aioCited: false, aioRefs: [] }
      }
    })
  )
}

/**
 * Volume de recherche sur le nom du château, 12 derniers mois.
 *
 * Un seul appel pour les 4 variantes de marque (facturation à la requête, pas au
 * mot-clé). On additionne : « chateau de la huberdiere » sans accent et la forme
 * accentuée sont deux entrées distinctes chez Google Ads, mais un seul et même
 * geste chez l'internaute.
 */
// ── Notoriété : Search Console d'abord, Keyword Planner en repli ──────────
// Keyword Planner est un modèle arrondi par paliers fixes ; la Search Console
// compte des impressions RÉELLES. Sur une requête de marque où le château sort
// premier, une impression vaut une recherche : c'est le même indicateur, mesuré
// au lieu d'être estimé. D'où la bascule dès que la clé est posée.
const GSC_SITE = process.env.GSC_SITE || "sc-domain:chateaudelahuberdiere.com"
// Toutes les variantes de marque en une seule regex. « huberdi » s'arrête avant
// l'accent, donc attrape « huberdière » comme « huberdiere », seul ou accompagné.
const GSC_BRAND_REGEX = process.env.GSC_BRAND_REGEX || "huberdi"
// Les deux ou trois derniers jours ne sont pas encore consolidés côté Google.
const GSC_LAG_DAYS = 3

const b64url = (b) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

/**
 * Jeton d'accès depuis la clé du compte de service. JWT RS256 signé à la main
 * plutôt que le paquet `googleapis` : une dépendance de 50 Mo dans une fonction
 * serverless pour un seul appel, ça ne se justifie pas.
 * `GSC_SERVICE_ACCOUNT_KEY` accepte le JSON brut ou sa version base64.
 */
export async function gscToken() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_KEY
  if (!raw) return null
  const txt = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf-8")
  const key = JSON.parse(txt)
  if (!key.client_email || !key.private_key) throw new Error("GSC_SERVICE_ACCOUNT_KEY sans client_email/private_key")
  const now = Math.floor(Date.now() / 1000)
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const body = b64url(JSON.stringify({
    iss: key.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }))
  const { createSign } = await import("node:crypto")
  const sig = createSign("RSA-SHA256").update(`${head}.${body}`).sign(key.private_key)
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${body}.${b64url(sig)}`,
    }),
  })
  if (!r.ok) throw new Error(`OAuth GSC ${r.status} : ${(await r.text()).slice(0, 200)}`)
  return (await r.json()).access_token
}

/**
 * Agrège en mois les lignes journalières de la Search Console. Exporté pour être
 * testable hors ligne : c'est ici que se joue la complétude d'un mois, donc la
 * différence entre une barre pleine et une barre en clair.
 *
 * Un mois est amputé des DEUX côtés. À la fin, parce que Google consolide avec
 * deux ou trois jours de retard. Au début, parce que la mesure n'existe pas avant
 * la vérification de la propriété (25/06/2026 ici) : juin ne porte que six jours
 * et vaudrait le quart de juillet, ce qui se lirait comme une explosion.
 */
export function aggregateGscMonths(rows, cutoff) {
  const parMois = new Map()
  let premierJour = null
  for (const row of rows ?? []) {
    const jour = row?.keys?.[0]
    if (!jour) continue
    if (!premierJour || jour < premierJour) premierJour = jour
    const ym = jour.slice(0, 7)
    const e = parMois.get(ym) ?? { impressions: 0, clics: 0 }
    e.impressions += row.impressions ?? 0
    e.clics += row.clicks ?? 0
    parMois.set(ym, e)
  }
  return [...parMois.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([ym, e]) => ({
    ym, label: monthShort(ym), volume: Math.round(e.impressions), clics: e.clics,
    complet: monthEndYMD(ym) <= cutoff && `${ym}-01` >= premierJour,
  }))
}

async function pullBrandGsc(ym) {
  const token = await gscToken()
  if (!token) return null
  const lag = new Date(Date.now() - GSC_LAG_DAYS * 86400000).toISOString().slice(0, 10)
  const finMois = monthEndYMD(ym)
  const cutoff = finMois < lag ? finMois : lag
  // 13 mois de recul : GSC ne remonte de toute façon pas avant la vérification de
  // la propriété (25/06/2026), la fenêtre se remplira d'elle-même.
  const [y, m] = ym.split("-").map(Number)
  const debut = new Date(Date.UTC(y, m - 13, 1)).toISOString().slice(0, 10)
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`
  const r = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      startDate: debut, endDate: cutoff, dimensions: ["date"], rowLimit: 1000, type: "web",
      dimensionFilterGroups: [{ filters: [{ dimension: "query", operator: "includingRegex", expression: GSC_BRAND_REGEX }] }],
    }),
  })
  if (!r.ok) throw new Error(`GSC ${r.status} : ${(await r.text()).slice(0, 200)}`)
  const serie = aggregateGscMonths((await r.json()).rows, cutoff).slice(-13)
  if (!serie.length) return null
  const complets = serie.filter((p) => p.complet)
  const moyenne = complets.length ? Math.round(complets.reduce((s, p) => s + p.volume, 0) / complets.length) : 0
  return { source: "gsc", moyenne, serie }
}

async function pullBrandVolume() {
  try {
    const result = await dfs("/keywords_data/google_ads/search_volume/live", {
      keywords: BRAND_KEYWORDS, location_code: LOCATION, language_code: LANGUAGE,
    })
    const parMois = new Map()
    let moyenne = 0
    for (const r of result ?? []) {
      moyenne += r.search_volume ?? 0
      // L'API renvoie un tableau {year, month, search_volume} ; certains proxys le
      // remettent à plat en objet {"AAAA-MM": volume}. On accepte les deux formes.
      const ms = r.monthly_searches
      if (Array.isArray(ms)) {
        for (const m of ms) {
          const ym = `${m.year}-${String(m.month).padStart(2, "0")}`
          parMois.set(ym, (parMois.get(ym) ?? 0) + (m.search_volume ?? 0))
        }
      } else if (ms && typeof ms === "object") {
        for (const [ym, v] of Object.entries(ms)) parMois.set(ym, (parMois.get(ym) ?? 0) + (v ?? 0))
      }
    }
    const serie = [...parMois.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
    return {
      source: "ads", moyenne,
      // Le point le plus récent de Keyword Planner est la sortie de modèle la plus
      // fraîche : il saute parfois plusieurs paliers sans qu'il se soit rien passé.
      // Il est donc tracé mais jamais annoncé, au même titre qu'un mois inachevé.
      serie: serie.map(([ym, v], i) => ({ ym, label: monthShort(ym), volume: v, complet: i < serie.length - 1 })),
    }
  } catch (e) {
    console.error("[rapport] pullBrandVolume KO:", e.message)
    return null
  }
}

/**
 * Notoriété : la Search Console si sa clé est posée, Keyword Planner sinon. Le
 * repli n'est pas décoratif — le cron tourne tous les mois et ne doit pas perdre
 * un bloc du rapport parce qu'une clé a expiré ou n'est pas encore en place.
 */
async function pullBrand(ym) {
  let gsc = null
  try {
    gsc = await pullBrandGsc(ym)
    if (!gsc) console.log("[rapport] GSC non configurée, notoriété via Keyword Planner.")
  } catch (e) {
    console.error("[rapport] GSC KO, repli Keyword Planner :", e.message)
  }
  const ads = await pullBrandVolume()
  if (!gsc) return ads
  if (!ads?.serie?.length) return gsc

  // Une seule courbe, la plus longue possible. La Search Console ne remonte pas
  // avant la vérification de la propriété ; Keyword Planner couvre les douze mois
  // précédents. Les deux estiment la MÊME chose, le nombre de gens qui cherchent
  // le nom du château : l'un le modélise, l'autre le compte. On les met bout à
  // bout, avec la couture VISIBLE au rendu (couleur + note), jamais fondues.
  //
  // Charnière = premier mois COMPLET de la Search Console. Le mois partiel de
  // démarrage (six jours en juin 2026) est écarté au profit du mois entier de
  // Keyword Planner, qui couvre mieux la même période.
  const premierMesure = gsc.serie.find((p) => p.complet)?.ym
  if (!premierMesure) return ads
  const avant = ads.serie.filter((p) => p.ym < premierMesure).map((p) => ({ ...p, mesure: false, complet: true }))
  const apres = gsc.serie.filter((p) => p.ym >= premierMesure).map((p) => ({ ...p, mesure: true }))
  const complets = apres.filter((p) => p.complet)
  return {
    source: "mixte",
    charniere: premierMesure,
    moyenne: complets.length ? Math.round(complets.reduce((s, p) => s + p.volume, 0) / complets.length) : gsc.moyenne,
    serie: [...avant, ...apres],
  }
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

/**
 * Photo des voisins le même jour que le reste du rapport : force du profil de liens,
 * présence dans Google, et recherches qu'ils captent alors que le château est absent.
 * Coût : 2 appels groupés, puis 2 par voisin. Chaque bloc échoue seul, un voisin
 * injoignable ne fait pas tomber le rapport.
 */
async function pullCompetitors() {
  const domains = [DOMAIN, ...COMPETITORS.map((c) => c.domain)]
  const safe = async (pr, fallback) => {
    try { return await pr } catch (e) { console.error("Concurrents KO", e.message); return fallback }
  }

  const [ranks, refs] = await Promise.all([
    safe(dfs("/backlinks/bulk_ranks/live", { targets: domains }), []),
    safe(dfs("/backlinks/bulk_referring_domains/live", { targets: domains }), []),
  ])
  const rankOf = new Map((ranks[0]?.items ?? []).map((i) => [i.target, i.rank ?? 0]))
  const rdOf = new Map((refs[0]?.items ?? []).map((i) => [i.target, i.referring_domains ?? 0]))

  const rows = await Promise.all(domains.map(async (d) => {
    const r = await safe(dfs("/dataforseo_labs/google/domain_rank_overview/live", {
      target: d, location_name: "France", language_code: "fr", ignore_synonyms: true,
    }), [])
    const o = r[0]?.items?.[0]?.metrics?.organic ?? {}
    const top3 = (o.pos_1 || 0) + (o.pos_2_3 || 0)
    const top10 = top3 + (o.pos_4_10 || 0)
    return {
      domain: d,
      label: d === DOMAIN ? "Château de la Huberdière" : (COMPETITORS.find((c) => c.domain === d)?.label ?? d),
      isBrand: d === DOMAIN,
      rank: rankOf.get(d) ?? 0,
      referringDomains: rdOf.get(d) ?? 0,
      top3, top10, top20: top10 + (o.pos_11_20 || 0),
      etv: Math.round(o.etv || 0),
    }
  }))

  // `intersections: false` renvoie les recherches où target1 sort et target2 non :
  // c'est le vrai écart, sans avoir à soustraire deux listes tronquées.
  const parVoisin = await Promise.all(COMPETITORS.map(async (c) => {
    const r = await safe(dfs("/dataforseo_labs/google/domain_intersection/live", {
      target1: c.domain, target2: DOMAIN, intersections: false,
      location_name: "France", language_code: "fr", limit: 30,
      filters: [["first_domain_serp_element.rank_group", "<=", 20], "and", ["keyword_data.keyword_info.search_volume", ">", 0]],
      order_by: ["keyword_data.keyword_info.search_volume,desc"],
    }), [])
    return (r[0]?.items ?? []).map((i) => ({
      keyword: i.keyword_data?.keyword ?? "",
      volume: i.keyword_data?.keyword_info?.search_volume ?? 0,
      competitor: c.label,
      position: i.first_domain_serp_element?.rank_group ?? null,
    }))
  }))

  const tout = parVoisin.flat().filter((k) => k.keyword && k.position != null)
  const utiles = tout.filter((k) => {
    const kw = sansAccent(k.keyword)
    if (GAP_STOPWORDS.some((w) => kw.includes(sansAccent(w)))) return false
    return MARCHE.some((m) => kw.includes(sansAccent(m)))
  })

  // Google regroupe les variantes d'une même recherche : « restaurant amboise » et
  // « restaurants in amboise » sortent avec le même volume, le même site et la même
  // position. Trois lignes pour une seule idée font désordre dans un rapport client,
  // on ne garde que la formulation la plus courte de chaque groupe.
  const parMot = new Map()
  for (const k of utiles) {
    const cle = `${k.volume}|${k.competitor}|${k.position}`
    const prec = parMot.get(cle)
    if (!prec || k.keyword.length < prec.keyword.length) parMot.set(cle, k)
  }
  const gap = [...parMot.values()].sort((a, b) => b.volume - a.volume).slice(0, 12)

  return { rows, gap, ecartes: tout.length - gap.length }
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
// `moisSoumission` (Map email -> AAAA-MM) rattache chaque demande au mois où le
// prospect a RÉELLEMENT écrit, lu dans les mails de confirmation. Sans lui, le
// mois vient de `createdAt`, c'est-à-dire de la date à laquelle Brevo a bien
// voulu stocker la ligne : une demande de juillet ressaisie en août comptait pour
// août. Les contacts sans confirmation (imports Octorate, saisies manuelles)
// retombent sur `createdAt`, faute de mieux.
export function buildLeadsData(contacts, ym, moisSoumission = null) {
  const A = (x, k) => (x.attributes || {})[k]
  const first = (v) => (Array.isArray(v) ? v[0] : v)
  const moisDe = (x) => moisSoumission?.get(String(x.email || "").toLowerCase()) || (x.createdAt || "").slice(0, 7)
  const rows = (Array.isArray(contacts) ? contacts : []).filter((x) => moisDe(x) === ym)

  let newsletter = 0
  const demandes = []
  for (const x of rows) {
    const form = String(first(A(x, "FORM")) || "")
    if (!form) continue
    if (isTestEmail(x.email)) continue
    if (form === "Newsletter_Form") { newsletter++; continue }
    demandes.push({
      cible: CIBLE_LABEL_RAPPORT[form] || form,
      canal: leadChannel(A(x, "UTM_SOURCE")),
      // Déclaratif du prospect (champ « Comment nous avez-vous connus ? »).
      declare: String(A(x, "ATTRIBUTION") || "").trim(),
    })
  }

  const tally = (arr, key) => {
    const m = new Map()
    for (const d of arr) m.set(d[key], (m.get(d[key]) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }
  const chatgpt = demandes.filter((d) => d.canal === "ChatGPT").length
  const identifies = demandes.filter((d) => d.canal !== "Accès direct / source non identifiée").length
  const declares = demandes.filter((d) => d.declare)
  return {
    total: demandes.length, newsletter,
    parCible: tally(demandes, "cible"), parCanal: tally(demandes, "canal"),
    parDeclare: tally(declares, "declare"), declares: declares.length,
    chatgpt, identifies,
  }
}

// ── Contrôle mensuel : le CRM a-t-il bien tout enregistré ? ────────────────
// Le bloc « Demandes reçues » compte des CONTACTS Brevo. Or Brevo peut refuser
// un contact en silence et la demande disparaît du CRM alors que le prospect a
// bien écrit. Le témoin qui survit à ce rejet, c'est le mail de confirmation :
// il part à chaque soumission du formulaire, avant et indépendamment du sort du
// contact. Comparer les deux, c'est savoir si le chiffre montré au client est
// vrai. Réconciliation faite par le préflight du cron quotidien, pas par le
// rapport lui-même : elle doit alerter Alexis, jamais apparaître côté client.
const CONFIRM_SUBJECTS = [
  "Nous avons bien reçu votre demande",
  "We have received your enquiry",
  "Abbiamo ricevuto la tua richiesta",
]

// Première confirmation envoyée à chaque adresse, entre deux dates. C'est la
// trace de la soumission elle-même : elle part avant que le contact soit créé, et
// survit donc à un rejet du CRM.
const PREMIER_MOIS = "2026-06" // mise en ligne du formulaire

export async function pullConfirmations(depuisYm = PREMIER_MOIS, jusquaYm = null) {
  const key = process.env.BREVO_API_KEY
  if (!key) return null
  const headers = { "api-key": key, accept: "application/json" }
  const jour = (ms) => new Date(ms).toISOString().slice(0, 10)
  const debut = jour(monthRangeMs(`${depuisYm}`).start)
  // Brevo refuse une endDate future : sur le mois courant, on s'arrête à aujourd'hui.
  const fin = jour(Math.min(jusquaYm ? monthRangeMs(jusquaYm).end : Date.now(), Date.now()))

  const premiere = new Map()
  for (let offset = 0; offset < 20000; offset += 1000) {
    const u = `https://api.brevo.com/v3/smtp/statistics/events?limit=1000&offset=${offset}&startDate=${debut}&endDate=${fin}`
    const res = await fetch(u, { headers, signal: AbortSignal.timeout(20000) })
    if (!res.ok) throw new Error(`Brevo events ${res.status}`)
    const events = (await res.json()).events || []
    for (const e of events) {
      if (!CONFIRM_SUBJECTS.some((x) => (e.subject || "").startsWith(x))) continue
      const email = (e.email || "").toLowerCase()
      const d = (e.date || "").slice(0, 16)
      if (email && (!premiere.has(email) || d < premiere.get(email))) premiere.set(email, d)
    }
    if (events.length < 1000) break
  }
  return premiere
}

// Mois de soumission par adresse, prêt à être passé à buildLeadsData().
export async function pullMoisSoumission() {
  const premiere = await pullConfirmations()
  if (!premiere) return null
  return new Map([...premiere].map(([email, d]) => [email, d.slice(0, 7)]))
}

export async function reconcileLeads(ym) {
  const soumissions = await pullConfirmations(ym, ym)
  if (!soumissions) return null
  const headers = { "api-key": process.env.BREVO_API_KEY, accept: "application/json" }

  // Les soumissions du mois qui n'ont pas de contact. Un appel par adresse,
  // jamais plus de quelques dizaines par mois.
  const manquants = []
  for (const [email, date] of soumissions) {
    const res = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      headers, signal: AbortSignal.timeout(15000),
    })
    if (res.status === 404) manquants.push({ email, date })
  }
  return { ym, soumissions: soumissions.size, manquants }
}

// Le mois est-il documenté dans l'encart « Ce qui a été réalisé » ? Sans lui, le
// client reçoit un rapport qui ne dit pas ce qu'on a fait pour lui.
export function travauxManquants(ym) {
  const items = TRAVAUX[ym]
  return !Array.isArray(items) || items.length === 0
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
    // Le mois d'une demande, c'est la date à laquelle le prospect a écrit, pas
    // celle où Brevo a stocké la ligne. Si la lecture échoue, on retombe sur
    // createdAt plutôt que de rendre un bloc vide.
    const moisSoumission = await pullMoisSoumission().catch((e) => {
      console.error("[rapport] mois de soumission indisponible, repli sur createdAt:", e.message)
      return null
    })
    return buildLeadsData(contacts, ym, moisSoumission)
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
  // Déclaratif : « IA » mis en avant, c'est le canal que rien d'autre ne mesure.
  const declareRows = (ld.parDeclare ?? []).map(([c, n]) => {
    const strong = /IA$|ChatGPT/.test(c)
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
  <div class="leadsgrid" style="display:grid;grid-template-columns:${declareRows ? "1fr 1fr 1fr" : "1fr 1fr"};gap:18px;margin-top:14px">
    <div><table><thead><tr><th>Par activité</th><th class="num">Demandes</th></tr></thead><tbody>${cibleRows || `<tr><td colspan="2" style="color:var(--gris)">—</td></tr>`}</tbody></table></div>
    <div><table><thead><tr><th>Par canal d'origine</th><th class="num">Demandes</th></tr></thead><tbody>${canalRows || `<tr><td colspan="2" style="color:var(--gris)">—</td></tr>`}</tbody></table></div>
    ${declareRows ? `<div><table><thead><tr><th>Ce qu'ils déclarent</th><th class="num">Demandes</th></tr></thead><tbody>${declareRows}</tbody></table></div>` : ""}
  </div>
  <p class="note">Le canal est déduit de la première visite (recherche Google, IA, réseaux, lien direct). ${declareRows
    ? `La troisième colonne vient du champ « Comment nous avez-vous connus &#63; » du formulaire, renseigné par ${ld.declares} personne${ld.declares > 1 ? "s" : ""} ce mois-ci. C'est la seule mesure qui rattrape le bouche à oreille et les réponses d'IA, invisibles pour les outils de suivi.`
    : `Une part des demandes reste en « source non identifiée » : le champ « Comment nous avez-vous connus &#63; » vient d'être ajouté aux formulaires, ses premiers résultats apparaîtront le mois prochain.`}</p>`
}

// ── Fréquentation du site (Umami, analytics cookieless) ────────────────────
const UMAMI_BASE = (process.env.UMAMI_BASE || "https://umami.morain.fr").replace(/\/+$/, "")
let _umamiWebsiteId = process.env.UMAMI_WEBSITE_ID || process.env.PUBLIC_UMAMI_WEBSITE_ID || ""
// Tableau de bord Umami public partagé, proposé au client pour aller plus loin.
const UMAMI_SHARE_URL = process.env.UMAMI_SHARE_URL || "https://umami.morain.fr/share/JFnzMWJRC8wXe752"
// En deçà, le mois précédent n'est pas une base fiable (mise en place d'Umami en
// cours) : on masque alors les comparaisons M-1 plutôt que d'afficher un delta faux.
const UMAMI_MIN_BASELINE = 100

// Auth Umami, dans cet ordre : clé API, couple login/mot de passe, puis le jeton
// du tableau de bord public déjà partagé au client. Ce dernier ne demande aucun
// secret, donc il tient quand le mot de passe change ou manque sur Vercel : sans
// ce repli, le bloc « Fréquentation » disparaissait du rapport sans un mot.
let _umamiHeaders = null

async function umamiShareHeaders() {
  const shareId = (UMAMI_SHARE_URL.match(/\/share\/([^/?#]+)/) || [])[1]
  if (!shareId) return null
  const res = await fetch(`${UMAMI_BASE}/api/share/${shareId}`, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Umami share ${res.status}`)
  const data = await res.json()
  // Le partage porte lui-même l'identifiant du site : dernier filet si la variable
  // d'environnement manque.
  if (!_umamiWebsiteId) _umamiWebsiteId = data.websiteId || ""
  return { "x-umami-share-token": data.token }
}

async function umamiAuthHeaders() {
  if (process.env.UMAMI_API_KEY) return { "x-umami-api-key": process.env.UMAMI_API_KEY }
  if (_umamiHeaders) return _umamiHeaders
  const user = process.env.UMAMI_USERNAME, pass = process.env.UMAMI_PASSWORD
  if (user && pass) {
    try {
      const res = await fetch(`${UMAMI_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) return (_umamiHeaders = { authorization: `Bearer ${(await res.json()).token}` })
      console.warn(`[rapport] Umami : login ${res.status}, repli sur le tableau de bord partagé.`)
    } catch (e) {
      console.warn(`[rapport] Umami : login injoignable (${e.message}), repli sur le tableau de bord partagé.`)
    }
  }
  return (_umamiHeaders = await umamiShareHeaders())
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
  try {
    const headers = await umamiAuthHeaders()
    if (!headers) { console.log("[rapport] Umami : ni identifiants ni tableau partagé, bloc trafic ignoré."); return null }
    if (!_umamiWebsiteId) { console.log("[rapport] Umami : website id absent, bloc trafic ignoré."); return null }
    const [y, m] = ym.split("-").map(Number)
    const prevYm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`
    const cur = monthRangeMs(ym), prev = monthRangeMs(prevYm)
    const id = _umamiWebsiteId
    const q = (r) => `startAt=${r.start}&endAt=${r.end}`
    // Cette build d'Umami expose les pages via type=path (pas url) et les canaux
    // d'acquisition déjà groupés via type=channel. type=entry donne la page par
    // laquelle la visite commence : ce n'est pas le classement des pages vues, et
    // c'est lui qui dit quelle porte du site travaille vraiment.
    const arr = (v) => (Array.isArray(v) ? v : [])
    const [stats, statsPrev, pages, channels, entries, devices] = await Promise.all([
      umamiGet(`/api/websites/${id}/stats?${q(cur)}`, headers),
      umamiGet(`/api/websites/${id}/stats?${q(prev)}`, headers),
      umamiGet(`/api/websites/${id}/metrics?type=path&${q(cur)}&limit=8`, headers).then(arr).catch(() => []),
      umamiGet(`/api/websites/${id}/metrics?type=channel&${q(cur)}&limit=8`, headers).then(arr).catch(() => []),
      umamiGet(`/api/websites/${id}/metrics?type=entry&${q(cur)}&limit=8`, headers).then(arr).catch(() => []),
      umamiGet(`/api/websites/${id}/metrics?type=device&${q(cur)}&limit=8`, headers).then(arr).catch(() => []),
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
      entryPages: entries.filter((r) => r.x).slice(0, 8).map((r) => ({ path: r.x, visits: r.y })),
      // Umami classe par largeur d'écran : la frontière laptop / desktop est un
      // artefact de mesure, pas un usage. On regroupe les deux sous « ordinateur »,
      // le détail reste dans le tableau de bord lié plus haut.
      devices: groupDevices(devices),
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

// Umami sépare « laptop » et « desktop » sur un seuil de largeur d'écran. Les deux
// sont le même usage pour le client, et le seuil produit des écarts qui ne veulent
// rien dire d'un mois sur l'autre. Trois familles suffisent au rapport.
const DEVICE_FAMILIES = { mobile: "Mobile", tablet: "Tablette", laptop: "Ordinateur", desktop: "Ordinateur" }
function groupDevices(rows) {
  const total = new Map()
  for (const r of Array.isArray(rows) ? rows : []) {
    const label = DEVICE_FAMILIES[r?.x] || (r?.x ? "Autre" : null)
    if (!label) continue
    total.set(label, (total.get(label) || 0) + (Number(r.y) || 0))
  }
  return [...total.entries()].map(([label, visits]) => ({ label, visits })).sort((a, b) => b.visits - a.visits)
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
  // Page d'entrée : celle par laquelle la visite commence. Une page peut être très
  // vue sans jamais faire entrer personne, et l'inverse est vrai aussi.
  const entryRows = (td.entryPages || []).map((p) => `<tr><td>${esc(p.path)}</td><td class="num">${fr(p.visits)}</td></tr>`).join("")
  const deviceRows = (td.devices || []).map((d) => `<tr><td>${esc(d.label)}</td><td class="num">${fr(d.visits)}</td></tr>`).join("")
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
    <div><table><thead><tr><th>Par où les visiteurs entrent</th><th class="num">Visites</th></tr></thead><tbody>${entryRows || `<tr><td colspan="2" style="color:var(--gris)">—</td></tr>`}</tbody></table></div>
    <div><table><thead><tr><th>D'où viennent les visiteurs</th><th class="num">Visites</th></tr></thead><tbody>${refRows || `<tr><td colspan="2" style="color:var(--gris)">—</td></tr>`}</tbody></table></div>
    <div><table><thead><tr><th>Sur quel appareil</th><th class="num">Visites</th></tr></thead><tbody>${deviceRows || `<tr><td colspan="2" style="color:var(--gris)">—</td></tr>`}</tbody></table></div>
  </div>
  <p class="note">« Visiteurs » compte les personnes uniques, « visites » leurs sessions, « pages vues » le total des pages ouvertes. Le taux « en une page » mesure les visiteurs partis après une seule page. Les canaux regroupent l'origine des visites : recherche Google, réseaux sociaux, publicité, accès direct, sites référents. « Par où les visiteurs entrent » compte la première page de chaque visite : c'est la porte d'entrée réelle du site. L'appareil est déduit de la taille de l'écran.${td.hasBaseline ? "" : " C'est le premier mois de mesure Umami : la comparaison avec le mois précédent apparaîtra au prochain rapport."}</p>`
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

/**
 * Le château face à ses voisins. Sans ce repère une progression ne se lit pas :
 * gagner deux places pendant que le voisin en gagne dix n'est pas un gain.
 */
export function renderCompetitors(cp) {
  if (!cp || !cp.rows?.length) return ""
  const ordre = [...cp.rows].sort((a, b) => b.top10 - a.top10 || b.top3 - a.top3 || b.etv - a.etv)
  const ligne = (r) => {
    const nom = r.isBrand ? `<strong>${esc(r.label)}</strong> <span class="badge">vous</span>` : esc(r.label)
    return `<tr><td>${nom}</td><td class="num">${fr(r.referringDomains)}</td><td class="num pos">${fr(r.top3)}</td><td class="num">${fr(r.top10)}</td><td class="num">${fr(r.top20)}</td><td class="num">${fr(r.etv)}</td></tr>`
  }
  return `<h2>Face aux châteaux voisins</h2>
  <p class="lead">Les trois châteaux-hôtels qui visent la même clientèle que vous autour d'Amboise, mesurés le même jour avec les mêmes outils.</p>
  <table>
    <thead><tr><th>Établissement</th><th class="num">Sites qui font un lien</th><th class="num">Mots-clés top 3</th><th class="num">Top 10</th><th class="num">Top 20</th><th class="num">Visiteurs Google / mois</th></tr></thead>
    <tbody>${ordre.map(ligne).join("")}</tbody>
  </table>
  <p class="note">« Mots-clés top 3 » compte toutes les recherches Google sur lesquelles l'établissement sort dans les trois premiers résultats, pas seulement celles que nous suivons pour vous. « Sites qui font un lien » est le nombre de domaines qui pointent vers lui : ce capital de confiance se construit sur des années et explique une bonne part de l'écart. La dernière colonne est l'estimation Google du trafic mensuel que ces positions rapportent.</p>`
}

/**
 * Deux chemins de gain, du plus rapide au plus lent : remonter là où le château
 * est déjà proche, puis aller chercher ce que les voisins captent seuls.
 */
export function renderGains(opportunities, cp) {
  const proches = opportunities.length ? `<h3 class="sub-h">Vous y êtes presque</h3>
  <p class="lead">Ces recherches vous placent en page 2 ou 3. Quelques positions à reprendre, c'est le gain le plus rapide.</p>
  <table>
    <thead><tr><th>Recherche</th><th>Intention</th><th class="num">Position</th></tr></thead>
    <tbody>${opportunities.map((s) => `<tr><td>${esc(s.keyword)}</td><td>${esc(s.intent)}</td><td class="num pos">${s.position}</td></tr>`).join("")}</tbody>
  </table>` : ""

  const captees = cp?.gap?.length ? `<h3 class="sub-h">Ce que les voisins captent et pas vous</h3>
  <p class="lead">Recherches sur lesquelles un château voisin sort dans les vingt premiers résultats, alors que le vôtre n'apparaît pas du tout.</p>
  <table>
    <thead><tr><th>Recherche</th><th class="num">Recherches / mois</th><th>Qui la capte</th><th class="num">Sa position</th></tr></thead>
    <tbody>${cp.gap.map((g) => `<tr><td>${esc(g.keyword)}</td><td class="num">${fr(g.volume)}</td><td style="color:var(--gris)">${esc(g.competitor)}</td><td class="num pos">${g.position}</td></tr>`).join("")}</tbody>
  </table>
  <p class="note">Toutes ne sont pas à viser : une recherche « restaurant » suppose une table ouverte au public, ce que la table d'hôtes n'est pas. Celles qui parlent de séjour, de château ou de la région alimentent directement le calendrier éditorial. ${cp.ecartes ? `${fr(cp.ecartes)} recherches ont été écartées de ce tableau : le nom des voisins eux-mêmes, sur lequel personne ne peut se positionner, et des requêtes sans rapport avec votre région ni vos prestations.` : ""}</p>` : ""

  if (!proches && !captees) return ""
  return `<h2>Où aller chercher les prochains gains</h2>${proches}${captees}`
}

function renderHtml(data) {
  const { month, serp, gbp, llm, articles, history, exec, leads, traffic, brand, competitors } = data
  const monthLabel = monthLong(month)
  const rankedCount = serp.filter((s) => s.position !== null).length
  const bestPos = bestKeyword(serp)

  // Rapport précédent (pour les mouvements de position).
  const prevReport = [...history].reverse().find((h) => h.month < month && h.positions)
  const hasPrev = !!prevReport
  const prevPos = prevReport?.positions ?? {}

  // Opportunités : mots-clés en page 2-3 (11 à 30), les plus proches de la page 1.
  const opportunities = serp.filter((s) => s.position != null && s.position >= 11 && s.position <= 30).sort((a, b) => a.position - b.position)

  // Aperçus IA de Google (AI Overviews). Déployés en France le 22 juillet 2026 :
  // on mesure sur quels mots-clés l'encart s'affiche, et s'il cite le château.
  // Le tableau des articles ne montre que la production du mois : le cumul
  // rallongeait la liste à chaque rapport sans rien dire du travail livré.
  const articlesMois = articles.filter((a) => (a.publishedAt || "").slice(0, 7) === month)
  // Le tableau des positions ne détaille que les recherches où le château apparaît.
  // Les autres disaient toutes la même chose sur onze lignes : « non classé ».
  // Notoriété. `complet` n'existe pas dans les instantanés d'avant la Search
  // Console : on y retombe sur l'ancienne règle, le dernier point n'est pas annoncé.
  const brandPts = (brand?.serie ?? []).map((p, i, a) => ({
    ...p,
    complet: p.complet ?? i < a.length - 1,
    mesure: p.mesure ?? false, // instantanés d'avant la Search Console : tout était estimé
  }))
  const brandMixte = brand?.source === "mixte"
  const brandGsc = brand?.source === "gsc" || brandMixte
  // Le chiffre annoncé vient toujours d'un mois MESURÉ et complet. À défaut de
  // mesure, du dernier mois complet, quitte à ce qu'il soit estimé.
  const brandConfirme = [...brandPts].reverse().find((p) => p.complet && p.mesure)
    ?? [...brandPts].reverse().find((p) => p.complet) ?? null
  const brandAnPasse = brandPts.length >= 12 ? brandPts[0] : null
  const serpClasses = serp.filter((s) => s.position != null).sort((a, b) => a.position - b.position)
  const serpAbsents = serp.filter((s) => s.position == null)
  const aioKw = serp.filter((s) => s.aio)
  const aioCitedKw = serp.filter((s) => s.aioCited)

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
  .sub-h{font-family:"Playfair Display",serif;color:var(--encre);font-size:17px;margin:26px 0 2px;font-weight:600}
  @media(max-width:720px){.kpis{grid-template-columns:repeat(2,1fr)}h1{font-size:24px}.leadsgrid{grid-template-columns:1fr!important}}
  @media print{body{background:#fff}header{background:#fff;color:var(--encre);border-bottom:2px solid var(--bordeaux);padding:20px 0}header .sub{opacity:1;color:var(--gris)}h1{color:var(--bordeaux)}.card,.kpi,.summary,table{break-inside:avoid}script{display:none}}
</style></head>
<body>
<header><div class="wrap">
  <div class="sub">Château de la Huberdière · Reporting SEO & visibilité</div>
  <h1>Où en est votre référencement, ${esc(monthLabel)}</h1>
  <div class="sub">Demandes reçues, fréquentation, notoriété, positions Google, comparaison avec les châteaux voisins, présence dans les réponses IA.</div>
</div></header>
<div class="wrap">

  <div class="summary">${exec}</div>

  <div class="kpis">
    <div class="kpi"><div class="l">Mots-clés classés</div><div class="v">${rankedCount}<span style="font-size:15px;color:var(--gris)"> / ${serp.length}</span></div><div class="n">dans le top 100 Google</div></div>
    <div class="kpi"><div class="l">Meilleure position</div><div class="v">${bestPos ? "#" + bestPos.position : "–"}</div><div class="n">${bestPos ? esc(bestPos.keyword) : "à conquérir"}</div></div>
    <div class="kpi"><div class="l">Demandes reçues</div><div class="v">${leads?.total ?? "–"}</div><div class="n">via les formulaires du site</div></div>
    <div class="kpi"><div class="l">Cité par les IA</div><div class="v">${citedTotal}<span style="font-size:15px;color:var(--gris)"> / ${answeredTotal}</span></div><div class="n">réponses testées</div></div>
  </div>

  ${renderTravaux(TRAVAUX[month])}

  ${renderLeads(leads, monthLabel)}

  ${renderTraffic(traffic, monthLabel)}

  ${brandPts.length ? `<h2>Notoriété : on cherche le château par son nom</h2>
  <p class="lead">${brandMixte
    ? "Combien de personnes cherchent le nom du château sur Google, mois par mois. Les premiers mois sont l'estimation de Google, les derniers le comptage réel de votre Search Console."
    : brandGsc
    ? "Nombre de fois où quelqu'un a cherché le nom du château sur Google et vu votre site dans les résultats, mois par mois. Relevé dans votre Search Console."
    : "Nombre de recherches Google portant sur « Château de la Huberdière » et ses variantes, mois par mois."} C'est la trace la plus directe de votre notoriété, et voici pourquoi elle compte plus qu'avant.</p>
  <div class="card"><canvas id="brandChart"></canvas></div>
  ${brandConfirme ? `<div class="kpis" style="grid-template-columns:repeat(2,1fr)">
    <div class="kpi"><div class="l">${brandConfirme.mesure ? "Dernier mois mesuré" : "Dernier mois complet"}</div><div class="v">${fr(brandConfirme.volume)}</div><div class="n">${esc(brandConfirme.label)}, sur le nom du château</div></div>
    <div class="kpi"><div class="l">Il y a un an</div><div class="v">${brandAnPasse ? fr(brandAnPasse.volume) : "–"}</div><div class="n">${brandAnPasse ? `${esc(brandAnPasse.label)}${brandAnPasse.mesure ? "" : ", estimation"}` : "historique encore court"}</div></div>
  </div>` : ""}
  <p class="note">Depuis que Google répond directement dans son aperçu IA, une partie des internautes ne clique plus le lien : ils lisent la réponse, retiennent le nom du château, et reviennent quelques jours plus tard en le tapant dans Google ou en allant droit sur le site. Ce trajet-là n'apparaît nulle part dans les statistiques de trafic. En revanche il se voit ici : plus le nom est cherché, plus le château a été vu et retenu, quel que soit l'endroit où il a été vu. Une courbe qui monte pendant que le trafic depuis les résultats de recherche stagne n'est pas une contradiction, c'est la signature de ce nouveau fonctionnement.</p>
  <p class="note">${brandMixte
    ? `<span style="color:var(--or);font-weight:600">Les barres dorées</span> sont l'estimation de l'outil publicitaire de Google, seule source qui remonte aussi loin, arrondie par paliers fixes. <span style="color:var(--bordeaux);font-weight:600">Les barres bordeaux</span> sont le comptage réel de votre Search Console, disponible depuis ${esc(monthLong(brand.charniere))}. Les deux mesurent la même chose, la première l'estime et la seconde la compte : le changement d'outil se voit à la couleur, il n'est jamais fondu dans la courbe. Une barre pâle est un mois encore inachevé, que nous n'annonçons pas.`
    : brandGsc
    ? "Ces chiffres sont comptés par Google dans votre Search Console, pas estimés. Google consolide ses données avec deux à trois jours de retard : la dernière barre du graphique est donc tracée en clair tant que son mois n'est pas terminé, et les chiffres ci-dessus s'arrêtent au dernier mois complet."
    : "Ces volumes sont des estimations de l'outil publicitaire de Google, arrondies par paliers fixes (320, 390, 480, 590, 720, 880, 1 000…) et publiées avec un mois de décalage. La dernière barre est tracée en clair parce qu'un mois tout juste publié saute parfois plusieurs paliers d'un coup, sans que rien ne l'ait justifié : nous ne l'annonçons qu'une fois le mois suivant arrivé."} C'est la pente sur plusieurs mois qui raconte l'essentiel, jamais le dernier point pris seul.</p>` : ""}

  <h2>Où vous sortez dans Google</h2>
  <p class="lead">Les recherches suivies sur lesquelles le château apparaît, et son mouvement depuis le rapport précédent. Position 1 = tout en haut : plus le chiffre est petit, mieux c'est.</p>
  ${serpClasses.length ? `<table>
    <thead><tr><th>Recherche</th><th class="num">Position</th><th class="num">Évolution</th><th>Qui est devant vous</th></tr></thead>
    <tbody>${serpClasses.map((s) => {
      const mv = movement(s.position, prevPos[s.keyword], hasPrev)
      const posCell = s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${s.position}</a>` : String(s.position)
      const tete = s.position === 1 ? '<span class="badge">vous</span>' : esc(s.leader || "")
      return `<tr><td>${esc(s.keyword)}</td><td class="num pos">${posCell}</td><td class="num ${mv.cls}">${mv.txt}</td><td style="color:var(--gris)">${tete}</td></tr>`
    }).join("")}</tbody>
  </table>` : `<div class="card">Aucune des recherches suivies ne place encore le château dans les 100 premiers résultats.</div>`}
  ${serpAbsents.length ? `<p class="note"><strong>${serpAbsents.length} autres recherches suivies</strong> ne placent pas encore le château : ${serpAbsents.map((s) => `<span class="tag">${esc(s.keyword)}</span>`).join("")}</p>` : ""}
  <p class="note">« Évolution » compare au rapport du mois dernier ; une case vide signale une recherche entrée dans le suivi ce mois-ci.</p>

  ${renderCompetitors(competitors)}

  ${renderGains(opportunities, competitors)}

  <h2>Articles publiés ce mois-ci</h2>
  <p class="lead">Le contenu mis en ligne pour le château en ${esc(monthLabel)}, avec les mots-clés visés. Cliquez le titre pour lire l'article.</p>
  ${articlesMois.length ? `<table>
    <thead><tr><th>Article</th><th>Publié le</th><th>Thème</th><th>Mots-clés visés</th></tr></thead>
    <tbody>${articlesMois.map((a) => `<tr><td><a href="${esc(a.url)}" target="_blank" rel="noopener"><strong>${esc(a.title)}</strong></a></td><td style="white-space:nowrap">${esc(a.publishedAt)}</td><td>${esc(a.category)}</td><td>${a.keywords.map((k) => `<span class="tag">${esc(k)}</span>`).join("")}</td></tr>`).join("")}</tbody>
  </table>` : `<div class="card"><p style="margin:0;color:var(--gris)">Aucun article publié sur cette période.</p></div>`}
  <p class="note">Votre blog compte désormais ${articles.length} article${articles.length > 1 ? "s" : ""} en ligne. Les prochains sont planifiés dans votre <a href="/rapport?doc=calendrier">calendrier éditorial SEO &rarr;</a> : quatre articles par mois, chacun visant une recherche précise de vos futurs clients.</p>

  <h2>Aperçus IA de Google</h2>
  <p class="lead">Depuis le 22 juillet 2026, Google affiche en France un résumé rédigé par son IA au-dessus des résultats classiques. Il répond directement à la question de l'internaute et cite quelques sites en source. Être cité dans cet encart, c'est occuper la place la plus visible de la page.</p>
  <div class="kpis" style="grid-template-columns:repeat(2,1fr)">
    <div class="kpi"><div class="l">Mots-clés avec aperçu IA</div><div class="v">${aioKw.length}<span style="font-size:15px;color:var(--gris)"> / ${serp.length}</span></div><div class="n">sur vos mots-clés suivis</div></div>
    <div class="kpi"><div class="l">Château cité en source</div><div class="v">${aioCitedKw.length}</div><div class="n">${aioKw.length ? `sur ${aioKw.length} aperçu${aioKw.length > 1 ? "s" : ""} affiché${aioKw.length > 1 ? "s" : ""}` : "aucun aperçu ce mois-ci"}</div></div>
  </div>
  ${aioKw.length ? `<table style="margin-top:16px">
    <thead><tr><th>Mot-clé déclenchant un aperçu</th><th class="num">Votre position</th><th class="num">Château cité</th><th>Sites cités dans l'aperçu</th></tr></thead>
    <tbody>${aioKw.map((s) => `<tr><td>${esc(s.keyword)}</td><td class="num pos">${s.position != null ? s.position : '<span style="color:var(--gris)">non classé</span>'}</td><td class="num">${s.aioCited ? '<span class="yes">oui</span>' : '<span class="no">non</span>'}</td><td style="color:var(--gris)">${s.aioRefs.length ? s.aioRefs.map((r) => esc(r.domain)).filter(Boolean).slice(0, 4).join(", ") : "sources non communiquées"}</td></tr>`).join("")}</tbody>
  </table>` : `<div class="card">Aucun aperçu IA relevé ce mois-ci sur vos mots-clés suivis. C'est cohérent : Google en affiche peu sur les recherches locales et commerciales, qui sont justement les vôtres. Le déploiement français se poursuit jusqu'au 23 septembre 2026, on surveille mois par mois.</div>`}
  <p class="note">Sur les recherches où un aperçu s'affiche, le nombre de clics vers les sites baisse nettement, y compris pour la première position. La parade n'est pas de monter d'un rang, c'est d'être la source que l'IA cite. C'est ce qui guide la façon dont vos articles sont désormais écrits : une question par titre, une réponse nette dessous, des chiffres et des détails que personne d'autre ne peut donner sur le château.</p>

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

  <footer>
    ${archivesHtml}
    Rapport généré automatiquement pour le Château de la Huberdière, ${esc(monthLabel)}.<br>
    Sources : Google (positions, aperçus IA et trafic estimé), profil Google Business, moteurs IA (ChatGPT, Gemini, Perplexity, Claude), DataForSEO pour la comparaison avec les châteaux voisins, et le blog du château.
  </footer>
</div>

<script>
const HISTORY = ${JSON.stringify(history)};
// Seul graphe du rapport : les recherches sur le nom du château. Barres plutôt
// que courbe, c'est un volume mensuel et non une mesure continue. Les autres
// (positions, paliers de visibilité, netlinking) demandaient une lecture de
// métier : axe inversé, paliers empilés, courbe qui monte toute seule.
(function(){
  const B = ${JSON.stringify(brandPts)};
  if (!B.length) return;
  new Chart(document.getElementById("brandChart"), {
    type: "bar",
    data: { labels: B.map(p => p.label), datasets: [{
      label: "Recherches sur le nom du château",
      data: B.map(p => p.volume),
      // Dernière barre en clair : mois publié à l'instant, pas encore confirmé.
      // Trois états, une seule courbe : estimé (doré), mesuré (bordeaux), inachevé (pâle).
      backgroundColor: B.map(p => !p.complet ? "#d9b3b3" : p.mesure === false ? "#B08D57" : "#8B0000"),
      borderRadius: 0,
    }] },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, title: { display: true, text: "Recherches par mois" }, ticks: { precision: 0 } } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { afterLabel: (c) => {
          const p = B[c.dataIndex]
          if (!p.complet) return "mois incomplet, non annoncé"
          return p.mesure === false ? "estimation Google" : "mesuré en Search Console"
        } } },
      }
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
function buildExec({ month, serp, articlesNew, citedTotal, answeredTotal, gbp, leads }) {
  const bits = []
  const best = bestKeyword(serp)
  if (best) bits.push(`meilleure position <strong>#${best.position}</strong> sur « ${esc(best.keyword)} »`)
  bits.push(`<strong>${articlesNew}</strong> article${articlesNew > 1 ? "s" : ""} publié${articlesNew > 1 ? "s" : ""}`)
  if (leads?.total) bits.push(`<strong>${leads.total}</strong> demande${leads.total > 1 ? "s" : ""} reçue${leads.total > 1 ? "s" : ""}`)
  bits.push(`cité <strong>${citedTotal}/${answeredTotal}</strong> fois par les IA`)
  const aioN = serp.filter((s) => s.aio).length
  if (aioN) {
    const cites = serp.filter((s) => s.aioCited).length
    bits.push(`aperçu IA de Google sur <strong>${aioN}</strong> mot${aioN > 1 ? "s" : ""}-clé${aioN > 1 ? "s" : ""} suivi${aioN > 1 ? "s" : ""}, ${cites > 0 ? `château cité dans <strong>${cites}</strong> d'entre eux` : "château pas encore cité comme source"}`)
  }
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

  // `pullBacklinks` reste appelé sans rien afficher : il entretient la série
  // backlinks/domaines de l'historique, seul moyen de rouvrir le sujet plus tard
  // si une vraie acquisition de liens démarre. Un appel, aucun rendu.
  const [serp, backlinks, gbp, llm, domainHistory, leads, traffic, brand, competitors] = await Promise.all([
    pullSerp(), pullBacklinks(), pullGbp(), pullLlm(), pullDomainHistory(), pullLeads(ym), pullUmami(ym), pullBrand(ym), pullCompetitors(),
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
  cur.aio = { present: serp.filter((s) => s.aio).length, cited: serp.filter((s) => s.aioCited).length, keywords: serp.length }
  if (brand) cur.brandVolume = brand.serie[brand.serie.length - 1]?.volume ?? null
  if (leads) cur.leads = { total: leads.total, newsletter: leads.newsletter, chatgpt: leads.chatgpt }
  if (traffic) cur.traffic = { pageviews: traffic.pageviews, visitors: traffic.visitors, visits: traffic.visits }
  cur.hasReport = true
  byMonth.set(ym, cur)
  const history = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))

  // Tout ce dont le rendu a besoin, figé tel quel. `exec` en est exclu : c'est du
  // texte dérivé, on le recalcule au rendu pour qu'un changement de formulation
  // profite aussi aux mois passés.
  const snapshot = { month: ym, serp, gbp, llm, articles, history, leads, traffic, brand, competitors }
  const exec = buildExec({ month: ym, serp, articlesNew, citedTotal, answeredTotal, gbp, leads })
  const html = renderHtml({ ...snapshot, exec })

  const summary = {
    month: ym,
    articles: articles.length,
    articlesNew,
    ranked: serp.filter((s) => s.position != null).length,
    keywords: serp.length,
    llmCited: citedTotal,
    llmAnswered: answeredTotal,
    aioPresent: serp.filter((s) => s.aio).length,
    aioCited: serp.filter((s) => s.aioCited).length,
    // Dernier mois CONFIRMÉ, pas le plus récent : le point tout juste publié par
    // Keyword Planner est trop instable pour être annoncé au client (cf. renderHtml).
    marque: brand && brand.serie.length >= 2 ? brand.serie[brand.serie.length - 2].volume : null,
    marqueMois: brand && brand.serie.length >= 2 ? brand.serie[brand.serie.length - 2].label : null,
    marqueAnPasse: brand && brand.serie.length >= 12 ? brand.serie[0].volume : null,
    backlinks: backlinks.backlinks,
    gbpNote: gbp?.note ?? null,
    demandes: leads?.total ?? null,
    demandesChatgpt: leads?.chatgpt ?? 0,
    visiteurs: traffic?.visitors ?? null,
    pagesVues: traffic?.pageviews ?? null,
  }
  return { html, history, summary, snapshot, monthLabel: monthLong(ym), month: ym }
}

/**
 * Rejoue le HTML d'un mois depuis son instantané, sans le moindre appel d'API.
 *
 * C'est ce qui permet de changer la mise en page et de la répercuter sur les mois
 * déjà envoyés. Un nouvel appel rendrait les positions et les réponses d'IA DU
 * JOUR : le rapport d'août afficherait des chiffres de septembre sous un titre
 * d'août, et le client lirait autre chose que ce qu'il a reçu. L'instantané est
 * donc une question de fidélité avant d'être une question de coût.
 *
 * L'encart « Ce qui a été réalisé » (`rapport-travaux.json`) et le texte de
 * synthèse sont volontairement relus au rendu : eux peuvent encore être corrigés.
 */
export function renderFromSnapshot(snap) {
  const { month, serp, gbp, llm, articles, history, leads, traffic, brand, competitors } = snap
  if (!month || !Array.isArray(serp) || !Array.isArray(llm)) {
    throw new Error("Instantané incomplet : month, serp et llm sont requis.")
  }
  const citedTotal = llm.reduce((s, e) => s + e.rows.filter((r) => r.cited).length, 0)
  const answeredTotal = llm.reduce((s, e) => s + e.rows.filter((r) => !r.error).length, 0)
  const articlesNew = (articles ?? []).filter((a) => (a.publishedAt || "").slice(0, 7) === month).length
  const exec = buildExec({ month, serp, articlesNew, citedTotal, answeredTotal, gbp, leads })
  return renderHtml({ month, serp, gbp, llm, articles: articles ?? [], history: history ?? [], exec, leads, traffic, brand, competitors })
}

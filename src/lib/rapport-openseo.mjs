// Relevés OpenSEO du rapport client, depuis octobre 2026.
//
// Le rapport achetait lui-même ses pages Google et ses réponses d'IA à DataForSEO,
// pendant qu'OpenSEO (sur le NAS d'Alexis) achetait les mêmes. Désormais une seule
// source : le NAS lit OpenSEO le dernier jour du mois et pousse le tout au site
// (`/api/rapport-openseo`, Blob `rapport/m/<AAAA-MM>.openseo.json`). Ce module
// transforme cet envoi dans les formes que le rapport connaît déjà, et rend les
// sections IA qui en profitent. Module pur, testé sous `node --test`.
//
// Contrat de l'envoi : plans/2026-10-26-rapport-depuis-openseo.md.

import { positionsVoisins, pageLaPlusComplete } from "./rapport-voisins.mjs"
import { absenceProuvee, sansPanneau } from "./rapport-positions.mjs"

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const sansWww = (d) => String(d || "").replace(/^www\./i, "").toLowerCase()
const domMatch = (d, t) => {
  if (!d) return false
  const a = sansWww(d), b = sansWww(t)
  return a === b || a.endsWith("." + b)
}
// Google lui-même : jamais un site cité, jamais un concurrent. Octobre 2026 : en tête
// des sources IA, et la moitié des résultats en liens masqués « google.com/goto ».
const estGoogle = (d) => /^(www\.)?google\.[a-z.]+$/i.test(String(d || ""))
const lienMasque = (i) => i?.type === "organic" && /^https?:\/\/(www\.)?google\.com\/goto\b/i.test(String(i?.url || ""))
const fr = (n) => new Intl.NumberFormat("fr-FR").format(n)
const fr1 = (n) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(n)

// ── Pages Google ──────────────────────────────────────────────────────────

// OpenSEO rend `rank` (rang absolu, aperçu IA et encarts compris) et `organicRank`.
// Le rapport compare au rang ABSOLU depuis juillet : on garde celui-là, sinon
// chaque position gagnerait une ou deux places le mois du changement d'outil.
const versDataforseo = (items) => sansPanneau((Array.isArray(items) ? items : []).map((i) => ({
  type: i?.type ?? null, rank_absolute: i?.rank ?? null, domain: i?.domain ?? null, url: i?.url ?? null,
})))

/**
 * Lignes `serp` du rapport, dans l'ordre de `keywords`, à partir des pages
 * poussées par le NAS. Même règles que les relevés directs : la page la plus
 * complète fait foi, et une absence ne vaut que sur une page complète. Les
 * sources de l'aperçu IA ne sont pas dans ces pages : elles viennent du suivi IA.
 */
export function serpDepuisOpenseo(payload, keywords, voisins, domaine) {
  const parRecherche = new Map((payload?.serp?.keywords ?? []).map((k) => [String(k.keyword).toLowerCase(), k.pages ?? []]))
  return keywords.map((k) => {
    const pages = parRecherche.get(k.keyword.toLowerCase()) ?? []
    const page = pageLaPlusComplete(pages.map((p) => [{ items: versDataforseo(p) }]))
    const vide = { ...k, position: null, url: null, leader: null, aio: false, aioCited: false, aioRefs: [], releve: false }
    if (!page.items.length) return vide
    const organiques = page.items.filter((i) => i.type === "organic")
    const own = organiques.find((i) => domMatch(i.domain, domaine))
    // Le NAS résout les liens masqués avant l'envoi ; s'il en reste, le château
    // peut se cacher derrière l'un d'eux : son absence ne prouve plus rien.
    const masques = organiques.some(lienMasque)
    if (!own && (masques || !absenceProuvee(page))) return { ...vide, organiques: page.organiques }
    const lisibles = organiques.filter((i) => !lienMasque(i))
    const leader = lisibles.find((i) => i.rank_absolute === 1) ?? lisibles[0]
    return {
      ...k,
      position: own?.rank_absolute ?? null,
      url: own?.url ?? null,
      leader: leader?.domain ?? null,
      aio: page.items.some((i) => i.type === "ai_overview"),
      aioCited: false,
      aioRefs: [],
      voisins: positionsVoisins(page.items, voisins),
      organiques: page.organiques,
    }
  })
}

// ── Réponses des IA ───────────────────────────────────────────────────────

export const MOTEURS = {
  chatgpt: "ChatGPT", gemini: "Gemini", perplexity: "Perplexity", claude: "Claude", google_ai_overview: "Aperçu IA de Google",
}
const ORDRE = ["chatgpt", "gemini", "perplexity", "claude", "google_ai_overview"]
const APERCU = "google_ai_overview"

/**
 * Le relevé IA du mois, figé dans l'instantané sous `ia`. Le château compte comme
 * cité dès que la réponse le nomme ou renvoie vers son site, comme avant (le nom
 * dans le texte). Une réponse en erreur, ou un aperçu Google qui ne s'affiche pas,
 * n'est pas une réponse : elle sort des comptes au lieu de passer pour un oubli.
 */
export function iaDepuisOpenseo(ia) {
  // Un relevé sans aucune ligne n'est pas un relevé : le rapport passe au secours.
  if (!ia || !Array.isArray(ia.rows) || ia.rows.length === 0) return null
  const questions = new Map()
  const vus = new Set()
  for (const r of ia.rows) {
    if (!questions.has(r.promptId)) {
      questions.set(r.promptId, { id: r.promptId, prompt: r.prompt, topic: r.topic, marque: !!r.branded, reponses: {} })
    }
    vus.add(r.engine)
    const marques = Array.isArray(r.brands) ? r.brands : []
    const own = marques.find((b) => b.own)
    questions.get(r.promptId).reponses[r.engine] = {
      repondu: r.status === "completed" && r.answerStatus === "answered" && !r.error,
      cite: !!(own && (own.mentioned || own.cited)),
      concurrents: marques.filter((b) => !b.own && b.mentioned).map((b) => b.name),
    }
  }
  const sources = (ia.sources ?? [])
    .filter((s) => !estGoogle(s.domain))
    .map((s) => ({ domain: sansWww(s.domain), ownership: s.ownership, reponses: s.answerCount ?? 0, moteurs: (s.engines ?? []).map((e) => e.engine) }))
    .sort((a, b) => b.reponses - a.reponses || a.domain.localeCompare(b.domain))
  return {
    source: "openseo",
    releveLe: ia.run?.completedAt ?? ia.run?.createdAt ?? null,
    moteurs: ORDRE.filter((m) => vus.has(m)),
    questions: [...questions.values()],
    sources,
  }
}

const neutres = (ia) => (ia?.questions ?? []).filter((q) => !q.marque)
const moteursConversation = (ia) => (ia?.moteurs ?? []).filter((m) => m !== APERCU)

// Réponses des assistants (ChatGPT, Gemini, Perplexity) aux questions neutres. Les
// questions de marque citent le château par construction, l'aperçu Google a sa section.
export function bilanIa(ia) {
  let cites = 0, reponses = 0
  for (const q of neutres(ia)) {
    for (const m of moteursConversation(ia)) {
      const r = q.reponses[m]
      if (!r?.repondu) continue
      reponses++
      if (r.cite) cites++
    }
  }
  return { cites, reponses }
}

export function bilanApercus(ia) {
  const qs = neutres(ia).filter((q) => q.reponses[APERCU])
  const affiches = qs.filter((q) => q.reponses[APERCU].repondu)
  return { questions: qs.length, affiches: affiches.length, cites: affiches.filter((q) => q.reponses[APERCU].cite).length }
}

const pl = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`
const pct = (c, n) => (n ? Math.round((c / n) * 100) : 0)
const listeEt = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} et ${xs.at(-1)}` : xs.join(""))
const moisCourt = (ym) => new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${ym}-15T00:00:00Z`))

/**
 * Mois après mois, part des réponses des IA qui citent le château, lue dans
 * l'historique du rapport (12 derniers mois mesurés jusqu'au mois du rapport).
 * Jusqu'en septembre 2026 la mesure était autre (6 questions, versions techniques
 * des IA) : `methode` le dit, pour que le saut d'octobre ne passe pas pour un progrès.
 * L'aperçu Google n'est repris que depuis qu'il se lit sur les mêmes questions.
 */
export function evolutionIa(history, month) {
  return (Array.isArray(history) ? history : [])
    .filter((h) => h?.month && h.month <= month && h.llmAnswered > 0)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)
    .map((h) => ({
      month: h.month,
      label: h.monthLabel || moisCourt(h.month),
      cites: h.llmCited ?? 0,
      reponses: h.llmAnswered,
      pct: pct(h.llmCited ?? 0, h.llmAnswered),
      methode: h.iaSource === "openseo" ? "actuelle" : "ancienne",
      apercu: h.aio?.source === "openseo" ? { cites: h.aio.cited ?? 0, affiches: h.aio.present ?? 0 } : null,
    }))
}

// Barre horizontale en SVG : elle s'imprime (un fond CSS ne s'imprime pas) et sa
// longueur porte le sens, pas la couleur. Hachurée pour l'ancienne mesure.
function barre(p, i) {
  const id = `hach-ia-${i}`
  const w = Math.max(p.pct, 0.5)
  const motif = p.methode === "ancienne"
    ? `<defs><pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#fff"/><line x1="0" y1="0" x2="0" y2="5" stroke="#222" stroke-width="1.6"/></pattern></defs>`
    : ""
  const rempli = p.methode === "ancienne" ? `fill="url(#${id})" stroke="#222" stroke-width=".8"` : `fill="#8B0000" class="barre-ia"`
  return `<svg viewBox="0 0 100 12" preserveAspectRatio="none" style="display:block;width:100%;height:14px" aria-hidden="true">${motif}<rect x="0" y="0" width="100" height="12" fill="#f1ede3"/><rect x="0" y="0" width="${w}" height="12" ${rempli}/></svg>`
}

function renderEvolutionIa(points, { changementMethode, questions }) {
  if (points.length < 2) return ""
  const avecApercu = points.some((p) => p.apercu)
  const anciens = points.some((p) => p.methode === "ancienne")
  const lignes = points.map((p, i) => `<tr><td style="white-space:nowrap">${esc(p.label)}${p.methode === "ancienne" ? '<span class="sur-mobile">ancienne mesure</span>' : ""}</td><td style="width:48%">${barre(p, i)}</td><td class="num"><strong>${p.pct} %</strong><span class="sur-mobile">${p.cites} sur ${p.reponses}</span></td><td class="num hors-mobile" style="color:var(--gris)">${p.cites} sur ${p.reponses}${p.methode === "ancienne" ? ", ancienne mesure" : ""}</td>${avecApercu ? `<td class="num hors-mobile">${p.apercu ? `${p.apercu.cites} sur ${p.apercu.affiches}` : '<span style="color:var(--gris)">–</span>'}</td>` : ""}</tr>`).join("")
  return `<h3 class="sub-h">Mois après mois</h3>
  <table class="evolution-ia">
    <thead><tr><th>Mois</th><th>Réponses des IA citant le château</th><th class="num">Part</th><th class="num hors-mobile">Réponses</th>${avecApercu ? '<th class="num hors-mobile">Aperçus Google</th>' : ""}</tr></thead>
    <tbody>${lignes}</tbody>
  </table>
  ${anciens ? `<p class="note">Barres hachurées, « ancienne mesure » : jusqu'en septembre 2026, 6 questions posées aux versions techniques des IA. Depuis octobre, ${questions} questions posées comme le ferait un client.${changementMethode ? " Ce bloc a changé d'outil ce mois-ci, et le saut d'octobre vient surtout de ce changement : la progression se lit à partir d'octobre." : " La progression se lit sur les barres pleines."}</p>` : ""}`
}

/**
 * « Le château dans les réponses des IA » : aperçus Google et assistants (ChatGPT,
 * Gemini, Perplexity) en une seule section. Deux chiffres, l'évolution mois par
 * mois, une ligne par activité, puis ce qui se fait concrètement : les sites que
 * les IA lisent. Le détail des questions reste replié.
 */
export function renderSectionIa(ia, { history = [], month = "", changementMethode = false } = {}) {
  const qs = neutres(ia)
  const moteurs = moteursConversation(ia)
  const { cites, reponses } = bilanIa(ia)
  const ap = bilanApercus(ia)
  const avecApercu = ap.questions > 0
  const noms = moteurs.map((m) => MOTEURS[m])
  const attendues = qs.length * moteurs.length
  const total = reponses === attendues
    ? `soit ${pl(attendues, "réponse")}`
    : `soit ${pl(attendues, "réponse")} attendue${attendues > 1 ? "s" : ""}, ${reponses} ${reponses > 1 ? "sont arrivées" : "est arrivée"}`

  // Par activité : assistants et aperçu Google côte à côte.
  const parTheme = new Map()
  for (const q of qs) {
    const t = parTheme.get(q.topic) ?? { theme: q.topic, reponses: 0, cites: 0, apAff: 0, apCit: 0 }
    for (const m of moteurs) {
      const r = q.reponses[m]
      if (!r?.repondu) continue
      t.reponses++
      if (r.cite) t.cites++
    }
    const a = q.reponses[APERCU]
    if (a?.repondu) { t.apAff++; if (a.cite) t.apCit++ }
    parTheme.set(q.topic, t)
  }
  const themes = [...parTheme.values()]
  const cellule = (c, n) => (n ? `<span class="${c ? "yes" : "no"}">${c} sur ${n}</span>` : '<span style="color:var(--gris)">–</span>')

  // Une phrase par moteur, du plus favorable au moins favorable.
  const parMoteur = moteurs.map((m) => {
    const rs = qs.map((q) => q.reponses[m]).filter((r) => r?.repondu)
    return { nom: MOTEURS[m], n: rs.length, c: rs.filter((r) => r.cite).length }
  })
  const repondants = parMoteur.filter((x) => x.n).sort((a, b) => b.c - a.c)
  const muets = parMoteur.filter((x) => !x.n).map((x) => x.nom)
  const phraseMoteurs = repondants.length
    ? `${repondants.map((x, i) => (i === 0 ? `${esc(x.nom)} cite le château dans ${x.c} réponse${x.c > 1 ? "s" : ""} sur ${x.n}` : `${esc(x.nom)} dans ${x.c} sur ${x.n}`)).join(", ")}.${muets.length ? ` ${esc(listeEt(muets))} n'${muets.length > 1 ? "ont" : "a"} pas répondu ce mois-ci.` : ""}`
    : ""

  // Les voisins que les IA nomment le plus souvent, aperçus Google compris.
  const compte = new Map()
  for (const q of qs) for (const r of Object.values(q.reponses)) {
    if (!r?.repondu) continue
    for (const c of new Set(r.concurrents)) compte.set(c, (compte.get(c) ?? 0) + 1)
  }
  const voisins = [...compte.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5)

  const own = ia.sources.find((s) => s.ownership === "own")
  const sites = ia.sources.filter((s) => s.ownership !== "own" && !estGoogle(s.domain)).slice(0, 5)

  const detail = qs.map((q) => {
    const par = moteurs.filter((m) => q.reponses[m]?.repondu && q.reponses[m].cite).map((m) => MOTEURS[m])
    const a = q.reponses[APERCU]
    const apTxt = !a ? "" : !a.repondu ? " ; pas d'aperçu Google" : a.cite ? " ; cité dans l'aperçu Google" : " ; absent de l'aperçu Google"
    return `<li>${esc(q.prompt)} <span style="color:var(--gris)">(${esc(q.topic)}) : ${par.length ? `cité par ${esc(listeEt(par))}` : "cité par aucune IA"}${apTxt}</span></li>`
  }).join("")

  return `<h2>Le château dans les réponses des IA</h2>
  <p class="lead">De plus en plus de clients posent leur question à une IA plutôt qu'à Google. Chaque mois, nous posons les mêmes ${pl(qs.length, "question")} de futurs clients, couvrant toutes vos activités, à ${esc(listeEt(noms))}${avecApercu ? ", et nous les tapons dans Google, qui affiche désormais au-dessus des résultats un résumé rédigé par son IA, l'aperçu IA" : ""}.</p>
  <div class="kpis" style="grid-template-columns:repeat(${avecApercu ? 2 : 1},1fr)">
    <div class="kpi"><div class="l">Réponses des IA citant le château</div><div class="v">${cites}<span style="font-size:15px;color:var(--gris)"> / ${reponses}</span></div><div class="n">${pl(qs.length, "question")} à ${moteurs.length} IA, ${total}</div></div>
    ${avecApercu ? `<div class="kpi"><div class="l">Aperçus Google citant le château</div><div class="v">${ap.cites}<span style="font-size:15px;color:var(--gris)"> / ${ap.affiches}</span></div><div class="n">${ap.affiches} aperçu${ap.affiches > 1 ? "s" : ""} affiché${ap.affiches > 1 ? "s" : ""} sur ${pl(ap.questions, "question")}</div></div>` : ""}
  </div>
  ${renderEvolutionIa(evolutionIa(history, month), { changementMethode, questions: qs.length })}
  <h3 class="sub-h">Par activité</h3>
  <table>
    <thead><tr><th>Activité</th><th class="num">Réponses des IA</th>${avecApercu ? '<th class="num">Aperçu Google</th>' : ""}</tr></thead>
    <tbody>${themes.map((t) => `<tr><td>${esc(t.theme)}</td><td class="num">${cellule(t.cites, t.reponses)}</td>${avecApercu ? `<td class="num">${cellule(t.apCit, t.apAff)}</td>` : ""}</tr>`).join("")}</tbody>
  </table>
  ${phraseMoteurs || voisins.length ? `<p class="note">${phraseMoteurs}${voisins.length ? ` Les voisins les plus nommés à votre place : ${voisins.map(([n, k]) => `${esc(n)} (${pl(k, "réponse")})`).join(", ")}.` : ""}</p>` : ""}
  ${sites.length ? `<h3 class="sub-h">Où les IA vont chercher leurs réponses</h3>
  <p class="note" style="font-size:14px;color:var(--encre)">Une IA recommande ce qu'elle lit ailleurs. Les sites qu'elles citent le plus en source sur vos questions : ${sites.map((s) => `<strong>${esc(s.domain)}</strong> (${pl(s.reponses, "réponse")})`).join(", ")}. Y figurer, par une fiche, un guide ou un article, est le moyen le plus direct d'entrer dans leurs réponses. ${own ? `Le site du château est lui-même cité en source dans ${pl(own.reponses, "réponse")}.` : "Le site du château n'est cité en source dans aucune réponse ce mois-ci."}</p>` : ""}
  <details class="note"><summary>Le détail des ${pl(qs.length, "question")}</summary><ul>${detail}</ul></details>
  <p class="note">Les réponses des IA varient d'un jour à l'autre : lisez ce bloc comme une tendance, pas comme une note figée.</p>`
}

// ── Recherches à portée (Search Console) ──────────────────────────────────

export const A_PORTEE_MIN_IMPRESSIONS = 10

/**
 * Recherches où le château sort déjà entre la 4e et la 20e place en moyenne sur
 * le mois, hors recherches sur son nom. Une ligne par recherche : la page qui
 * s'y affiche le plus, sa place moyenne, et les vues cumulées de toutes les pages
 * du site dans cette plage. Remplace les « pages 2 et 3 » des 18 recherches
 * suivies : la Search Console en voit des centaines, gratuitement.
 */
export function aPorteeDepuisGsc(rows, regexMarque, max = 8) {
  const marque = new RegExp(regexMarque, "i")
  const parRequete = new Map()
  for (const r of Array.isArray(rows) ? rows : []) {
    const [requete, url] = r?.keys ?? []
    if (!requete || marque.test(requete) || r.position < 4 || r.position > 20) continue
    const e = parRequete.get(requete) ?? { requete, impressions: 0, clics: 0, top: null }
    e.impressions += r.impressions ?? 0
    e.clics += r.clicks ?? 0
    if (!e.top || (r.impressions ?? 0) > e.top.impressions) e.top = { url, impressions: r.impressions ?? 0, position: r.position }
    parRequete.set(requete, e)
  }
  return [...parRequete.values()]
    .filter((e) => e.impressions >= A_PORTEE_MIN_IMPRESSIONS)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, max)
    .map((e) => {
      let page = e.top.url
      try { page = new URL(e.top.url).pathname } catch {}
      return { requete: e.requete, page, position: Math.round(e.top.position * 10) / 10, impressions: e.impressions, clics: e.clics }
    })
}

/**
 * Place moyenne du mois des recherches suivies, lue dans la Search Console
 * (lignes de dimension `query`). Figée dans l'instantané sous `gscPositions`.
 */
export function positionsGsc(rows, keywords) {
  const parRequete = new Map((Array.isArray(rows) ? rows : []).map((r) => [String(r?.keys?.[0] ?? "").toLowerCase(), r]))
  const out = {}
  for (const { keyword } of keywords) {
    const r = parRequete.get(keyword.toLowerCase())
    if (r) out[keyword] = { position: Math.round(r.position * 10) / 10, impressions: r.impressions ?? 0 }
  }
  return out
}

export function renderAPortee(liste, libelle) {
  if (!liste?.length) return ""
  return `<h2>Où aller chercher les prochains gains</h2>
  <h3 class="sub-h">Les recherches à portée de la première page</h3>
  <p class="lead">Relevées dans votre Search Console : des recherches où le château apparaît déjà, mais entre la 4<sup>e</sup> et la 20<sup>e</sup> place en moyenne sur le mois. Ce sont celles où une page ou un article retravaillé rapporte le plus vite.</p>
  <table>
    <thead><tr><th>Recherche</th><th class="hors-mobile">Page du site</th><th class="num">Place moyenne</th><th class="num">Affichages</th></tr></thead>
    <tbody>${liste.map((x) => {
      const page = libelle(x.page)?.texte ?? x.page
      return `<tr><td>${esc(x.requete)}<span class="sur-mobile">${esc(page)}</span></td><td class="hors-mobile" style="color:var(--gris)">${esc(page)}</td><td class="num pos">${fr1(x.position)}</td><td class="num">${fr(x.impressions)}</td></tr>`
    }).join("")}</tbody>
  </table>
  <p class="note">« Place moyenne » : moyenne du mois sur toutes les fois où Google a affiché le site pour cette recherche, elle bouge plus doucement qu'une position relevée un jour donné. « Affichages » : nombre de fois où le site est apparu dans les résultats.</p>`
}

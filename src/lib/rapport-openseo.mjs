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
import { absenceProuvee } from "./rapport-positions.mjs"

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const sansWww = (d) => String(d || "").replace(/^www\./i, "").toLowerCase()
const domMatch = (d, t) => {
  if (!d) return false
  const a = sansWww(d), b = sansWww(t)
  return a === b || a.endsWith("." + b)
}
const fr = (n) => new Intl.NumberFormat("fr-FR").format(n)
const fr1 = (n) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(n)

// ── Pages Google ──────────────────────────────────────────────────────────

// OpenSEO rend `rank` (rang absolu, aperçu IA et encarts compris) et `organicRank`.
// Le rapport compare au rang ABSOLU depuis juillet : on garde celui-là, sinon
// chaque position gagnerait une ou deux places le mois du changement d'outil.
const versDataforseo = (items) => (Array.isArray(items) ? items : []).map((i) => ({
  type: i?.type ?? null, rank_absolute: i?.rank ?? null, domain: i?.domain ?? null, url: i?.url ?? null,
}))

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
    if (!own && !absenceProuvee(page)) return { ...vide, organiques: page.organiques }
    const leader = organiques.find((i) => i.rank_absolute === 1) ?? organiques[0]
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

const badge = (t) => `<span class="badge">${esc(t)}</span>`

/**
 * « Visibilité dans les réponses IA » : par activité, par moteur, puis les sites
 * que les IA citent. Ce dernier tableau est le plus utile au client : une IA
 * recommande ce qu'elle lit ailleurs, être présent sur ces sites-là est le moyen
 * le plus direct d'entrer dans ses réponses.
 */
export function renderIa(ia, { changementMethode = false } = {}) {
  const qs = neutres(ia)
  const moteurs = moteursConversation(ia)
  const { cites, reponses } = bilanIa(ia)
  const parTheme = new Map()
  for (const q of qs) {
    const t = parTheme.get(q.topic) ?? { theme: q.topic, questions: 0, reponses: 0, cites: 0, par: new Set() }
    t.questions++
    for (const m of moteurs) {
      const r = q.reponses[m]
      if (!r?.repondu) continue
      t.reponses++
      if (r.cite) { t.cites++; t.par.add(MOTEURS[m]) }
    }
    parTheme.set(q.topic, t)
  }
  const themes = [...parTheme.values()]
  const lignesMoteurs = moteurs.map((m) => {
    const rs = qs.map((q) => q.reponses[m]).filter((r) => r?.repondu)
    const comps = [...new Set(rs.flatMap((r) => r.concurrents))]
    if (!rs.length) return `<tr><td>${esc(MOTEURS[m])}</td><td class="num" style="color:var(--gris)">–</td><td style="color:var(--gris)">pas de réponse de ce moteur ce mois-ci</td></tr>`
    const c = rs.filter((r) => r.cite).length
    return `<tr><td>${esc(MOTEURS[m])}</td><td class="num"><span class="${c ? "yes" : "no"}">${c} / ${rs.length}</span></td><td style="color:var(--gris)">${comps.length ? comps.map(esc).join(", ") : "aucun"}</td></tr>`
  }).join("")
  const own = ia.sources.find((s) => s.ownership === "own")
  const autres = ia.sources.filter((s) => s.ownership !== "own").slice(0, 8)
  const nomsMoteurs = moteurs.map((m) => MOTEURS[m])
  const listeMoteurs = nomsMoteurs.length > 1 ? `${nomsMoteurs.slice(0, -1).join(", ")} et ${nomsMoteurs.at(-1)}` : nomsMoteurs.join("")

  return `<h2>Visibilité dans les réponses IA</h2>
  <p class="lead">De plus en plus de clients posent leur question à une IA plutôt qu'à Google. Nous posons chaque mois ${qs.length} question${qs.length > 1 ? "s" : ""} réelle${qs.length > 1 ? "s" : ""}, couvrant toutes vos activités${listeMoteurs ? `, à ${esc(listeMoteurs)}` : " aux assistants IA"}, et nous regardons si le château est cité. Le château est cité dans <strong>${cites}</strong> réponse${cites > 1 ? "s" : ""} sur ${reponses}.</p>
  <table>
    <thead><tr><th>Activité</th><th class="num hors-mobile">Questions</th><th class="num">Château cité</th><th class="hors-mobile">Par</th></tr></thead>
    <tbody>${themes.map((t) => `<tr><td>${esc(t.theme)}<span class="sur-mobile">${t.questions} question${t.questions > 1 ? "s" : ""}${t.par.size ? `, cité par ${[...t.par].map(esc).join(", ")}` : ""}</span></td><td class="num hors-mobile">${t.questions}</td><td class="num"><span class="${t.cites ? "yes" : "no"}">${t.cites} / ${t.reponses}</span></td><td class="hors-mobile">${t.par.size ? [...t.par].map(badge).join("") : '<span style="color:var(--gris)">personne</span>'}</td></tr>`).join("")}</tbody>
  </table>
  <table style="margin-top:18px">
    <thead><tr><th>Moteur</th><th class="num">Château cité</th><th>Concurrents nommés dans ses réponses</th></tr></thead>
    <tbody>${lignesMoteurs}</tbody>
  </table>
  ${autres.length ? `<h3 class="sub-h">Où les IA vont chercher leurs réponses</h3>
  <p class="lead">Les sites que ces IA citent le plus souvent en source sur vos questions. Une IA recommande ce qu'elle lit ailleurs : figurer sur ces sites (fiche d'annuaire, guide, article) est le moyen le plus direct d'entrer dans ses réponses.</p>
  <table>
    <thead><tr><th>Site cité</th><th class="num">Réponses qui le citent</th><th class="hors-mobile">Nature</th></tr></thead>
    <tbody>${autres.map((s) => `<tr><td>${esc(s.domain)}${s.ownership === "competitor" ? '<span class="sur-mobile">concurrent suivi</span>' : ""}</td><td class="num">${s.reponses}</td><td class="hors-mobile" style="color:var(--gris)">${s.ownership === "competitor" ? "concurrent suivi" : "site tiers"}</td></tr>`).join("")}</tbody>
  </table>
  <p class="note">${own ? `Le site du château lui-même est cité en source dans ${own.reponses} réponse${own.reponses > 1 ? "s" : ""}.` : "Le site du château n'est cité en source dans aucune réponse ce mois-ci."}</p>` : ""}
  <details class="note"><summary>Les ${qs.length} questions posées</summary><ul>${qs.map((q) => `<li>${esc(q.prompt)} <span style="color:var(--gris)">(${esc(q.topic)})</span></li>`).join("")}</ul></details>
  <p class="note">${changementMethode ? "Ce bloc a changé d'outil ce mois-ci : jusqu'en septembre, 6 questions étaient posées aux versions techniques des IA ; elles sont désormais posées comme le ferait un client, sur leurs sites publics, avec plus de questions. L'écart avec septembre tient en partie à ce changement : comparez d'un mois sur l'autre à partir de maintenant. " : ""}Les réponses des IA varient d'un jour à l'autre : lisez ce bloc comme une tendance, pas comme une note figée.</p>`
}

/** « Aperçus IA de Google », lus dans le suivi IA : l'encart au-dessus des résultats. */
export function renderApercus(ia) {
  const qs = neutres(ia).filter((q) => q.reponses[APERCU])
  if (!qs.length) return ""
  const b = bilanApercus(ia)
  const sources = ia.sources.filter((s) => s.moteurs.includes(APERCU) && s.ownership !== "own").slice(0, 5)
  return `<h2>Aperçus IA de Google</h2>
  <p class="lead">Depuis le 22 juillet 2026, Google affiche en France un résumé rédigé par son IA au-dessus des résultats classiques. Il répond directement à la question et cite quelques sites en source. Être cité dans cet encart, c'est occuper la place la plus visible de la page. Nous tapons dans Google les mêmes questions que celles posées aux IA.</p>
  <div class="kpis" style="grid-template-columns:repeat(2,1fr)">
    <div class="kpi"><div class="l">Questions avec aperçu IA</div><div class="v">${b.affiches}<span style="font-size:15px;color:var(--gris)"> / ${b.questions}</span></div><div class="n">questions tapées dans Google</div></div>
    <div class="kpi"><div class="l">Château cité dans l'aperçu</div><div class="v">${b.cites}</div><div class="n">${b.affiches ? `sur ${b.affiches} aperçu${b.affiches > 1 ? "s" : ""} affiché${b.affiches > 1 ? "s" : ""}` : "aucun aperçu ce mois-ci"}</div></div>
  </div>
  <table style="margin-top:16px">
    <thead><tr><th>Question</th><th class="num">Aperçu</th><th class="num">Château cité</th><th class="hors-mobile">Concurrents nommés</th></tr></thead>
    <tbody>${qs.map((q) => {
      const r = q.reponses[APERCU]
      const comps = r.repondu && r.concurrents.length ? r.concurrents.map(esc).join(", ") : ""
      return `<tr><td>${esc(q.prompt)}${comps ? `<span class="sur-mobile">nommés : ${comps}</span>` : ""}</td><td class="num">${r.repondu ? "oui" : '<span style="color:var(--gris)">non</span>'}</td><td class="num">${!r.repondu ? '<span style="color:var(--gris)">–</span>' : r.cite ? '<span class="yes">oui</span>' : '<span class="no">non</span>'}</td><td class="hors-mobile" style="color:var(--gris)">${comps || (r.repondu ? "aucun" : "")}</td></tr>`
    }).join("")}</tbody>
  </table>
  ${sources.length ? `<p class="note">Sites que Google cite le plus dans ces aperçus : ${sources.map((s) => esc(s.domain)).join(", ")}.</p>` : ""}
  <p class="note">Sur les recherches où un aperçu s'affiche, les clics vers les sites baissent nettement, y compris pour la première position. La parade n'est pas de monter d'un rang, c'est d'être la source que l'IA cite : une question par titre, une réponse nette dessous, des détails que personne d'autre ne peut donner sur le château.</p>`
}

// ── Recherches à portée (Search Console) ──────────────────────────────────

export const A_PORTEE_MIN_IMPRESSIONS = 10

/**
 * Recherches où le château sort déjà entre la 4e et la 20e place en moyenne sur
 * le mois, hors recherches sur son nom. Une ligne par recherche : la page qui
 * s'y affiche le plus, sa place moyenne, et les vues cumulées de toutes les pages
 * du site dans cette plage. Remplace les « pages 2 et 3 » des 19 recherches
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

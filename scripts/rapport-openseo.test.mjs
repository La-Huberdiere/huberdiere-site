// node --test scripts/rapport-openseo.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import {
  serpDepuisOpenseo, iaDepuisOpenseo, bilanIa, bilanApercus, aPorteeDepuisGsc, positionsGsc,
  renderSectionIa, evolutionIa, renderAPortee,
} from "../src/lib/rapport-openseo.mjs"

const DOMAINE = "chateaudelahuberdiere.com"
const VOISINS = [
  { domain: "chateaudepray.fr", label: "Château de Pray" },
  { domain: "leclosdamboise.com", label: "Le Clos d'Amboise" },
]
const KW = [
  { intent: "Mariage", keyword: "mariage château touraine" },
  { intent: "Séjour", keyword: "chambres d'hôtes amboise" },
  { intent: "Blog", keyword: "visiter les châteaux de la loire", blog: true },
]

// Page de n résultats organiques, le château et les voisins aux rangs donnés.
function page(n, places = {}, extra = []) {
  const items = [...extra]
  for (let r = 1; r <= n; r++) {
    const domain = Object.keys(places).find((d) => places[d] === r) ?? `site${r}.fr`
    items.push({ type: "organic", rank: r + extra.length, organicRank: r, domain, url: `https://${domain}/p${r}` })
  }
  return items
}

test("position, site en tête et voisins lus dans la page la plus complète", () => {
  const payload = { serp: { keywords: [
    { keyword: "mariage château touraine", pages: [
      page(30, { "www.chateaudelahuberdiere.com": 5 }),
      page(95, { "www.chateaudelahuberdiere.com": 4, "chateaudepray.fr": 2, "www.leclosdamboise.com": 60 }, [{ type: "ai_overview", rank: 1, domain: null, url: null }]),
    ] },
  ] } }
  const [s] = serpDepuisOpenseo(payload, KW.slice(0, 1), VOISINS, DOMAINE)
  // Rang absolu, comme les relevés d'avant : l'aperçu IA occupe le premier rang.
  assert.equal(s.position, 5)
  assert.equal(s.url, "https://www.chateaudelahuberdiere.com/p4")
  assert.equal(s.leader, "site1.fr")
  assert.equal(s.aio, true)
  assert.deepEqual(s.voisins, { "chateaudepray.fr": 3, "leclosdamboise.com": 61 })
  assert.equal(s.organiques, 95)
  assert.equal(s.releve, undefined)
  assert.equal(s.intent, "Mariage")
})

test("absent d'une page tronquée : non relevée ; absent d'une page complète : non classé", () => {
  const payload = { serp: { keywords: [
    { keyword: "mariage château touraine", pages: [page(40)] },
    { keyword: "chambres d'hôtes amboise", pages: [page(40), page(90)] },
  ] } }
  const [a, b, c] = serpDepuisOpenseo(payload, KW, VOISINS, DOMAINE)
  assert.equal(a.releve, false)
  assert.equal(a.position, null)
  assert.equal(b.releve, undefined)
  assert.equal(b.position, null)
  // Recherche absente de l'envoi : non relevée, jamais « absente ».
  assert.equal(c.releve, false)
  assert.equal(c.keyword, "visiter les châteaux de la loire")
})

const IA = {
  run: { id: "r1", status: "completed", createdAt: "2026-10-31T05:38:00Z", completedAt: "2026-10-31T05:41:00Z" },
  rows: [
    { promptId: "p1", prompt: "Quel château pour se marier ?", topic: "Mariage", branded: false, engine: "chatgpt", status: "completed", answerStatus: "answered", error: null,
      brands: [{ name: "Château de la Huberdière", own: true, mentioned: true, cited: false }, { name: "Château de Pray", own: false, mentioned: true, cited: false }] },
    { promptId: "p1", prompt: "Quel château pour se marier ?", topic: "Mariage", branded: false, engine: "perplexity", status: "completed", answerStatus: "answered", error: null,
      brands: [{ name: "Château de la Huberdière", own: true, mentioned: false, cited: true }] },
    { promptId: "p1", prompt: "Quel château pour se marier ?", topic: "Mariage", branded: false, engine: "google_ai_overview", status: "completed", answerStatus: "no_answer", error: null, brands: [] },
    { promptId: "p2", prompt: "Où faire un séminaire ?", topic: "Séminaire", branded: false, engine: "chatgpt", status: "failed", answerStatus: null, error: "timeout", brands: [] },
    { promptId: "p2", prompt: "Où faire un séminaire ?", topic: "Séminaire", branded: false, engine: "google_ai_overview", status: "completed", answerStatus: "answered", error: null,
      brands: [{ name: "Château de la Huberdière", own: true, mentioned: false, cited: false }, { name: "Le Clos d'Amboise", own: false, mentioned: true, cited: true }] },
    { promptId: "p3", prompt: "Le Château de la Huberdière est-il un hôtel ?", topic: "Marque", branded: true, engine: "chatgpt", status: "completed", answerStatus: "answered", error: null,
      brands: [{ name: "Château de la Huberdière", own: true, mentioned: true, cited: true }] },
  ],
  sources: [
    { domain: "www.chateaudelahuberdiere.com", ownership: "own", answerCount: 3, promptCount: 2, engines: [{ engine: "chatgpt", answerCount: 3 }] },
    { domain: "www.mariages.net", ownership: "other", answerCount: 5, promptCount: 2, engines: [{ engine: "perplexity", answerCount: 5 }] },
    { domain: "leclosdamboise.com", ownership: "competitor", answerCount: 2, promptCount: 1, engines: [{ engine: "google_ai_overview", answerCount: 2 }] },
  ],
}

test("réponses IA regroupées par question et par moteur", () => {
  const ia = iaDepuisOpenseo(IA)
  assert.equal(ia.source, "openseo")
  assert.deepEqual(ia.moteurs, ["chatgpt", "perplexity", "google_ai_overview"])
  const q1 = ia.questions.find((q) => q.id === "p1")
  assert.deepEqual(q1.reponses.chatgpt, { repondu: true, cite: true, concurrents: ["Château de Pray"] })
  assert.deepEqual(q1.reponses.perplexity, { repondu: true, cite: true, concurrents: [] })
  assert.equal(q1.reponses.google_ai_overview.repondu, false)
  assert.equal(ia.questions.find((q) => q.id === "p2").reponses.chatgpt.repondu, false)
  assert.equal(ia.questions.find((q) => q.id === "p3").marque, true)
  assert.deepEqual(ia.sources.map((s) => s.domain), ["mariages.net", "chateaudelahuberdiere.com", "leclosdamboise.com"])
})

test("relevé IA vide ou absent : null, le rapport passe au relevé de secours", () => {
  assert.equal(iaDepuisOpenseo(null), null)
  assert.equal(iaDepuisOpenseo({ run: IA.run, rows: [], sources: [] }), null)
})

test("bilans : questions de marque et aperçus Google hors du compte des réponses IA", () => {
  const ia = iaDepuisOpenseo(IA)
  assert.deepEqual(bilanIa(ia), { cites: 2, reponses: 2 })
  assert.deepEqual(bilanApercus(ia), { questions: 2, affiches: 1, cites: 0 })
})

test("évolution IA : un point par mois mesuré, méthode marquée, 12 mois au plus", () => {
  const history = [
    { month: "2026-06" },
    { month: "2026-07", monthLabel: "juil. 26", llmCited: 7, llmAnswered: 24 },
    { month: "2026-08", monthLabel: "août 26", llmCited: 3, llmAnswered: 24, aio: { present: 3, cited: 0, keywords: 19 } },
    { month: "2026-10", monthLabel: "oct. 26", llmCited: 21, llmAnswered: 42, aio: { present: 14, cited: 4, keywords: 14, source: "openseo" }, iaSource: "openseo" },
    { month: "2026-11", monthLabel: "nov. 26", llmCited: 30, llmAnswered: 42, iaSource: "openseo" },
  ]
  const pts = evolutionIa(history, "2026-10")
  assert.deepEqual(pts.map((p) => p.month), ["2026-07", "2026-08", "2026-10"]) // ni mois vide, ni mois futur
  assert.deepEqual(pts.map((p) => p.methode), ["ancienne", "ancienne", "actuelle"])
  assert.equal(pts[2].pct, 50)
  // L'aperçu d'août se lisait sur les 19 recherches, pas sur les questions : pas comparable.
  assert.equal(pts[1].apercu, null)
  assert.deepEqual(pts[2].apercu, { cites: 4, affiches: 14 })
  const mois = [...Array(12)].map((_, i) => `2027-${String(i + 1).padStart(2, "0")}`).concat(["2028-01", "2028-02", "2028-03"])
  const long = mois.map((month) => ({ month, llmCited: 1, llmAnswered: 2 }))
  assert.equal(evolutionIa(long, "2028-12").length, 12)
})

test("section IA : une seule section, chiffres clés, évolution, activités, sans la question de marque", () => {
  const ia = iaDepuisOpenseo(IA)
  const historique = [
    { month: "2026-09", monthLabel: "sept. 26", llmCited: 3, llmAnswered: 18 },
    { month: "2026-10", monthLabel: "oct. 26", llmCited: 2, llmAnswered: 2, aio: { present: 1, cited: 0, keywords: 2, source: "openseo" }, iaSource: "openseo" },
  ]
  const html = renderSectionIa(ia, { history: historique, month: "2026-10", changementMethode: true })
  assert.match(html, /<h2>Le château dans les réponses des IA<\/h2>/)
  assert.equal((html.match(/<h2>/g) ?? []).length, 1) // aperçus Google et assistants réunis
  assert.doesNotMatch(html, /est-il un hôtel/)
  // Le total se lit comme questions x IA : 2 questions x 2 IA = 4 attendues, 2 arrivées.
  assert.match(html, /les mêmes 2 questions/)
  assert.match(html, /ChatGPT et Perplexity/)
  assert.match(html, /4 réponses attendues, 2 sont arrivées/)
  // Mois après mois, l'ancienne méthode marquée par un mot, pas seulement par le motif.
  assert.match(html, /Mois après mois/)
  assert.match(html, /sept\. 26/)
  assert.match(html, /17 %/)
  assert.match(html, /ancienne mesure/)
  assert.match(html, /Mariage/)
  assert.match(html, /mariages\.net/)
  assert.match(html, /Château de Pray/)
  assert.match(html, /Le Clos d'Amboise/)
  assert.doesNotMatch(html, /—/)
  assert.match(html, /changé d'outil ce mois-ci/)
  assert.doesNotMatch(renderSectionIa(ia, { history: historique, month: "2026-10", changementMethode: false }), /changé d'outil/)
})

test("recherches à portée : positions 4 à 20, hors marque, regroupées par recherche", () => {
  const rows = [
    { keys: ["seminaire amboise", "https://www.chateaudelahuberdiere.com/"], impressions: 115, clicks: 3, position: 2.9 },
    { keys: ["seminaire amboise", "https://www.chateaudelahuberdiere.com/seminaire"], impressions: 78, clicks: 0, position: 28.6 },
    { keys: ["séminaire val de loire", "https://www.chateaudelahuberdiere.com/seminaire"], impressions: 155, clicks: 1, position: 20.3 },
    { keys: ["seminaire val de loire", "https://www.chateaudelahuberdiere.com/seminaire"], impressions: 110, clicks: 2, position: 13.9 },
    { keys: ["hotel amboise piscine", "https://www.chateaudelahuberdiere.com/"], impressions: 54, clicks: 0, position: 17.2 },
    { keys: ["hotel amboise piscine", "https://www.chateaudelahuberdiere.com/sejour"], impressions: 9, clicks: 0, position: 12 },
    { keys: ["château de la huberdière avis", "https://www.chateaudelahuberdiere.com/"], impressions: 300, clicks: 9, position: 5 },
    { keys: ["stage bien etre", "https://www.chateaudelahuberdiere.com/retraite"], impressions: 8, clicks: 0, position: 8.9 },
  ]
  const out = aPorteeDepuisGsc(rows, "huberdi")
  assert.deepEqual(out.map((x) => x.requete), ["seminaire val de loire", "hotel amboise piscine"])
  assert.equal(out[1].page, "/")
  assert.equal(out[1].impressions, 63)
  assert.equal(out[1].position, 17.2)
  const html = renderAPortee(out, (p) => ({ texte: p === "/" ? "Accueil" : p }))
  assert.match(html, /Accueil/)
  assert.match(html, /17,2/)
})

test("lien masqué de Google : l'absence du château n'est pas prouvée", () => {
  // Octobre 2026 : OpenSEO rendait 50 à 75 % des résultats en « google.com/goto?url=… ».
  // Le château, caché derrière l'un d'eux, passait pour absent d'une page complète.
  const masque = page(95)
  masque[3] = { type: "organic", rank: 4, organicRank: 4, domain: "google.com", url: "https://google.com/goto?url=CAESdQ" }
  const payload = { serp: { keywords: [{ keyword: "mariage château touraine", pages: [masque] }] } }
  const [s] = serpDepuisOpenseo(payload, KW.slice(0, 1), VOISINS, DOMAINE)
  assert.equal(s.position, null)
  assert.equal(s.releve, false)
})

test("lien masqué de Google : jamais en tête de page", () => {
  const p = page(95, { "www.chateaudelahuberdiere.com": 7 })
  p[0] = { type: "organic", rank: 1, organicRank: 1, domain: "google.com", url: "https://google.com/goto?url=CAESdQ" }
  const [s] = serpDepuisOpenseo({ serp: { keywords: [{ keyword: "mariage château touraine", pages: [p] }] } }, KW.slice(0, 1), VOISINS, DOMAINE)
  assert.equal(s.position, 7)
  assert.equal(s.leader, "site2.fr")
})

test("Google n'est pas un site cité par les IA", () => {
  const ia = iaDepuisOpenseo({ ...IA, sources: [...IA.sources,
    { domain: "google.com", ownership: "other", answerCount: 40, engines: [{ engine: "google_ai_overview", answerCount: 40 }] },
    { domain: "www.google.fr", ownership: "other", answerCount: 9, engines: [{ engine: "gemini", answerCount: 9 }] },
  ] })
  assert.deepEqual(ia.sources.map((s) => s.domain), ["mariages.net", "chateaudelahuberdiere.com", "leclosdamboise.com"])
})

test("place moyenne Search Console des recherches suivies", () => {
  const rows = [
    { keys: ["Séminaire château touraine"], position: 3.4, impressions: 20, clicks: 1 },
    { keys: ["mariage château touraine"], position: 5.6, impressions: 31, clicks: 0 },
    { keys: ["autre recherche"], position: 2, impressions: 99, clicks: 9 },
  ]
  const kw = [{ keyword: "séminaire château touraine" }, { keyword: "mariage château touraine" }, { keyword: "gîte amboise" }]
  assert.deepEqual(positionsGsc(rows, kw), {
    "séminaire château touraine": { position: 3.4, impressions: 20 },
    "mariage château touraine": { position: 5.6, impressions: 31 },
  })
  assert.deepEqual(positionsGsc(null, kw), {})
})

test("le panneau d'information de Google ne prend pas de place au château", () => {
  // Octobre 2026, « château de la huberdière » : le panneau de la colonne de droite
  // portait le rang 1, le site le 2. Le rapport affichait 2e et « ▼ 1 ».
  const kg = { type: "knowledge_graph", rank: 1, domain: null, url: "https://www.chateaudelahuberdiere.com/" }
  const p = [kg, ...page(90, { "www.chateaudelahuberdiere.com": 1, "chateaudepray.fr": 3 })].map((i) => (i === kg ? i : { ...i, rank: i.rank + 1 }))
  const [s] = serpDepuisOpenseo({ serp: { keywords: [{ keyword: "mariage château touraine", pages: [p] }] } }, KW.slice(0, 1), VOISINS, DOMAINE)
  assert.equal(s.position, 1)
  assert.equal(s.leader, "www.chateaudelahuberdiere.com")
  assert.deepEqual(s.voisins, { "chateaudepray.fr": 3 })
})

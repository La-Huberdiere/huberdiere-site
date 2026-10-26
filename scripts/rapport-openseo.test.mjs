// node --test scripts/rapport-openseo.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import {
  serpDepuisOpenseo, iaDepuisOpenseo, bilanIa, bilanApercus, aPorteeDepuisGsc,
  renderIa, renderApercus, renderAPortee,
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

test("rendu IA : activités, moteurs, sources, sans la question de marque", () => {
  const ia = iaDepuisOpenseo(IA)
  const html = renderIa(ia, { changementMethode: true })
  assert.match(html, /Visibilité dans les réponses IA/)
  assert.match(html, /Mariage/)
  assert.match(html, /mariages\.net/)
  assert.doesNotMatch(html, /est-il un hôtel/)
  assert.match(html, /septembre/i) // note sur le changement d'outil
  assert.doesNotMatch(renderIa(ia, { changementMethode: false }), /changé d'outil/)
  // Rien ne passe par la couleur seule : un mot accompagne toujours le symbole.
  assert.doesNotMatch(html, /—/)
  const ap = renderApercus(ia)
  assert.match(ap, /Aperçus IA de Google/)
  assert.match(ap, /Le Clos d'Amboise/)
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

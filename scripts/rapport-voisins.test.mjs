// node --test scripts/rapport-voisins.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { positionsVoisins, renderVoisins, aDesVoisins, pageLaPlusComplete, PAGE_COMPLETE, themesDesRecherches } from "../src/lib/rapport-voisins.mjs"

const VOISINS = [
  { domain: "chateaudepray.fr", label: "Château de Pray" },
  { domain: "leclosdamboise.com", label: "Le Clos d'Amboise" },
  { domain: "chateau-nazelles.com", label: "Château de Nazelles" },
]

test("meilleure position de chaque voisin dans une page de résultats, sous-domaines compris", () => {
  const items = [
    { type: "organic", domain: "www.chateaudepray.fr", rank_absolute: 7 },
    { type: "organic", domain: "chateaudepray.fr", rank_absolute: 3 },
    { type: "local_pack", domain: "leclosdamboise.com", rank_absolute: 1 },
    { type: "organic", domain: "blog.leclosdamboise.com", rank_absolute: 12 },
  ]
  assert.deepEqual(positionsVoisins(items, VOISINS), { "chateaudepray.fr": 3, "leclosdamboise.com": 12 })
})

// 3 recherches clients, plus une de marque et une de blog qui ne comptent pas.
const SERP = [
  { intent: "Notoriété", keyword: "château de la huberdière", position: 1, voisins: {} },
  { intent: "Mariage", keyword: "mariage château touraine", position: 5, voisins: { "chateaudepray.fr": 2, "leclosdamboise.com": 9 } },
  { intent: "Séminaire", keyword: "séminaire château touraine", position: 14, voisins: { "chateaudepray.fr": 8 } },
  { intent: "Séjour", keyword: "chambres d'hôtes amboise", position: null, voisins: { "leclosdamboise.com": 4 } },
  { intent: "Blog", blog: true, keyword: "visiter les châteaux de la loire", position: 40, voisins: { "chateaudepray.fr": 1 } },
]

test("aDesVoisins distingue les instantanés d'avant la refonte", () => {
  assert.equal(aDesVoisins(SERP), true)
  assert.equal(aDesVoisins(SERP.map(({ voisins, ...s }) => s)), false)
})

const lignes = (html) => [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[1].replace(/<[^>]+>/g, "|").replace(/\|+/g, "|").trim())

test("compte sur les seules recherches clients, ni marque ni blog", () => {
  const html = renderVoisins(SERP, VOISINS, "Château de la Huberdière")
  assert.match(html, /3 recherches/)
  const pray = lignes(html).find((l) => l.includes("Château de Pray"))
  // 1re page : mariage (2) et séminaire (8) → 2 ; meilleure place 2e sur mariage
  assert.match(pray, /\|2\|2\|e\|/)
})

test("trois colonnes seulement : établissement, 1re page, meilleure place", () => {
  // Rapport de septembre 2026 jugé flou : « 3 premiers » et « Devant vous » retirés.
  const html = renderVoisins(SERP, VOISINS, "Château de la Huberdière")
  assert.equal((html.match(/<th[ >]/g) || []).length, 3)
  assert.doesNotMatch(html, /Devant vous|3 premiers/)
})

test("le château en première ligne, les voisins absents partout regroupés sous le tableau", () => {
  const html = renderVoisins(SERP, VOISINS, "Château de la Huberdière")
  const l = lignes(html).slice(1) // sans l'en-tête
  assert.match(l[0], /Huberdière/)
  assert.match(l[1], /Château de Pray/) // 2 en 1re page, devant le Clos à 2 mais au mieux 4e
  assert.ok(!l.some((x) => x.includes("Nazelles")))
  assert.match(html, /Absents des 3 recherches\s?: Château de Nazelles/)
})

test("meilleure place écrite en clair, sans couleur pour la porter", () => {
  const html = renderVoisins(SERP, VOISINS, "Château de la Huberdière")
  assert.match(html, /2<sup>e<\/sup>[^<]*<span[^>]*>mariage château touraine/)
  assert.match(html, /5<sup>e<\/sup>[^<]*<span[^>]*>mariage château touraine/) // le château
  assert.doesNotMatch(html, /class="(up|down|yes|no)"/)
})

test("une recherche non relevée ne compte pour personne, et le dit", () => {
  const serp = [...SERP, { intent: "Famille", keyword: "location château touraine", position: null, voisins: {}, releve: false }]
  const html = renderVoisins(serp, VOISINS, "Château de la Huberdière")
  assert.match(html, /3 recherches/) // pas 4
  assert.match(html, /1 recherche n'a pas pu être relevée/)
  assert.match(lignes(html).find((l) => l.includes("Le Clos")), /\|2\|4\|e\|/)
})

test("entre plusieurs relevés d'une même recherche, garde la page la plus complète", () => {
  const page = (n) => [{ items: [{ type: "ai_overview" }, ...Array.from({ length: n }, (_, i) => ({ type: "organic", rank_absolute: i + 1 }))] }]
  const vide = [{ items: null }]
  assert.equal(pageLaPlusComplete([vide, page(31), page(97)]).organiques, 97)
  assert.equal(pageLaPlusComplete([vide, []]).organiques, 0)
  assert.equal(pageLaPlusComplete([vide, []]).items.length, 0)
  assert.ok(pageLaPlusComplete([page(PAGE_COMPLETE)]).complete)
  assert.ok(!pageLaPlusComplete([page(42)]).complete)
})

test("les thèmes annoncés sont ceux des recherches réellement relevées", () => {
  const serp = [
    { intent: "Mariage", keyword: "a" }, { intent: "Séminaire", keyword: "b", releve: false },
    { intent: "Restauration", keyword: "c" }, { intent: "Notoriété", keyword: "d" }, { intent: "Blog", keyword: "e", blog: true },
  ]
  assert.equal(themesDesRecherches(serp), "mariage, table")
})

test("l'introduction dit ce qui est écarté, et où le château sort quand même en 1re page", () => {
  // Septembre 2026 : « 0 en 1re page » lu comme une contradiction avec le tableau
  // des positions (1er sur son nom, 6e et 8e sur des sujets du blog).
  const serp = [
    ...SERP,
    { intent: "Blog", blog: true, keyword: "prix mariage château loire", position: 6, voisins: {} },
    { intent: "Blog", blog: true, keyword: "dormir dans un château de la loire", position: 25, voisins: {} },
  ]
  const html = renderVoisins(serp, VOISINS, "Château de la Huberdière")
  assert.match(html, /recherches sur votre nom et les sujets du blog/)
  assert.match(html, /«\s?prix mariage château loire\s?» \(6<sup>e<\/sup>\)/)
  assert.doesNotMatch(html, /dormir dans un château/) // 25e : pas en 1re page
})

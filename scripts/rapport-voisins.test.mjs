// node --test scripts/rapport-voisins.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { positionsVoisins, renderVoisins, aDesVoisins, pageLaPlusComplete, PAGE_COMPLETE, rechercheCaptable, filtrerCaptees, themesDesRecherches } from "../src/lib/rapport-voisins.mjs"

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
  // 1re page : mariage (2) et séminaire (8) → 2 ; top 3 : 1 ; devant vous : mariage (2<5) et séminaire (8<14) → 2
  assert.match(pray, /\|2\|1\|2\|$/)
})

test("un voisin présent là où le château est absent sort devant lui", () => {
  const clos = lignes(renderVoisins(SERP, VOISINS, "Château de la Huberdière")).find((l) => l.includes("Le Clos"))
  // 1re page : mariage (9) et chambres (4) → 2 ; top 3 : 0 ; devant : chambres (château absent) → 1
  assert.match(clos, /\|2\|0\|1\|$/)
})

test("le château en tête de sa propre ligne, voisins triés, absent signalé en toutes lettres", () => {
  const html = renderVoisins(SERP, VOISINS, "Château de la Huberdière")
  const l = lignes(html).slice(1) // sans l'en-tête
  assert.match(l[0], /Château de Pray/) // 2 en 1re page, 1 dans le top 3
  assert.ok(l.findIndex((x) => x.includes("Huberdière")) >= 0)
  const naz = l.find((x) => x.includes("Nazelles"))
  assert.match(naz, /absent/)
  assert.match(naz, /\|0\|0\|0\|$/)
})

test("meilleure place écrite en clair, sans couleur pour la porter", () => {
  const html = renderVoisins(SERP, VOISINS, "Château de la Huberdière")
  assert.match(html, /2<sup>e<\/sup> sur «\s?mariage château touraine\s?»/)
  assert.match(html, /5<sup>e<\/sup> sur «\s?mariage château touraine\s?»/) // le château
  assert.doesNotMatch(html, /class="(up|down|yes|no)"/)
})

test("une recherche non relevée ne compte pour personne, et le dit", () => {
  const serp = [...SERP, { intent: "Famille", keyword: "location château touraine", position: null, voisins: {}, releve: false }]
  const html = renderVoisins(serp, VOISINS, "Château de la Huberdière")
  assert.match(html, /3 recherches/) // pas 4
  assert.match(html, /1 recherche n'a pas pu être relevée/)
  assert.match(lignes(html).find((l) => l.includes("Le Clos")), /\|2\|0\|1\|$/)
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

test("le nom d'un voisin, ou de la commune qu'il porte, n'est pas une recherche à capter", () => {
  // Rapport de septembre 2026 : « le clos d'amboise », « hôtel restaurant le clos
  // d'amboise », « nazelles », « amboise » et « 37400 amboise » sous une note qui
  // disait le nom des voisins écarté.
  for (const k of ["le clos d'amboise", "hôtel restaurant le clos d'amboise", "relais d'amboise", "pavillon des lys amboise",
    "château des arpentis", "nazelles", "amboise", "37400 amboise", "amboise france", "chateau de pray"]) {
    assert.equal(rechercheCaptable(k), false, k)
  }
  // Août 2026 : établissements tiers et homonyme (Nozay n'est pas Noizay).
  for (const k of ["restaurant le lion d'or amboise", "calypso amboise", "la table du manoir amboise", "l'avant garde amboise", "hotel nozay"]) {
    assert.equal(rechercheCaptable(k), false, k)
  }
  for (const k of ["hotel amboise", "restaurant amboise", "hotels à amboise", "mariage château touraine"]) {
    assert.equal(rechercheCaptable(k), true, k)
  }
})

test("une recherche captée par deux voisins tient sur une ligne, au mieux placé", () => {
  const gap = [
    { keyword: "hotel amboise", volume: 4400, competitor: "Le Clos d'Amboise", position: 1 },
    { keyword: "hotel amboise", volume: 4400, competitor: "Le Relais d'Amboise", position: 9 },
    { keyword: "le clos d'amboise", volume: 1300, competitor: "Le Clos d'Amboise", position: 1 },
  ]
  const r = filtrerCaptees(gap)
  assert.deepEqual(r.gap, [{ keyword: "hotel amboise", volume: 4400, competitor: "Le Clos d'Amboise", position: 1 }])
  assert.equal(r.retirees, 2)
  assert.equal(r.ecartees, 1)
})

test("les thèmes annoncés sont ceux des recherches réellement relevées", () => {
  const serp = [
    { intent: "Mariage", keyword: "a" }, { intent: "Séminaire", keyword: "b", releve: false },
    { intent: "Restauration", keyword: "c" }, { intent: "Notoriété", keyword: "d" }, { intent: "Blog", keyword: "e", blog: true },
  ]
  assert.equal(themesDesRecherches(serp), "mariage, table")
})

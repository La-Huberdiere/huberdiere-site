// node --test scripts/rapport-marque.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { BRAND_KEYWORDS, GSC_BRAND_REGEX, estRechercheChateau } from "../src/lib/rapport-marque.mjs"

// Recherches réellement comptées par la Search Console de juillet à septembre 2026.
const CHATEAU = [
  "château de la huberdière", "chateau de la huberdiere", "chateau de la huberdière", "château de la huberdière photos",
  "chateau huberdiere", "chateau de huberdiere", "la huberdière nazelles", "chateau de la huberdiere nazelles",
  "chateau de la huberdiere in nazelles negron",
]
// Homonymes (Manche, Fondettes, Corps-Nuds) et toponyme seul : ils ne disent pas qu'on cherche le château.
const AUTRES = [
  "la huberdière", "la huberdiere", "huberdiere", "salle de la huberdière", "domaine de la huberdiere",
  "domaine de la huberdière", "au domaine de la huberdière photos", "ferme de la huberdiere",
  "chèvrerie de la huberdière ferme auberge", "gîte de la huberdière", "la huberdière fondettes",
]

test("la notoriété compte le château, pas ses homonymes", () => {
  for (const q of CHATEAU) assert.equal(estRechercheChateau(q), true, q)
  for (const q of AUTRES) assert.equal(estRechercheChateau(q), false, q)
})

test("l'estimation et la mesure suivent la même définition", () => {
  for (const k of BRAND_KEYWORDS) assert.equal(estRechercheChateau(k), true, k)
})

test("la regex envoyée à la Search Console est celle qu'on teste", () => {
  assert.equal(typeof GSC_BRAND_REGEX, "string")
  assert.ok(new RegExp(GSC_BRAND_REGEX, "i").test("château de la huberdière"))
})

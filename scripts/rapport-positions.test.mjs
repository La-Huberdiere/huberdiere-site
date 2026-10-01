// node --test scripts/rapport-positions.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { repartirAbsents, absenceProuvee, domainesCites } from "../src/lib/rapport-positions.mjs"

test("une recherche classée le mois dernier n'est pas « pas encore classée »", () => {
  // Septembre 2026 : « salle de la huberdière » (17e en août) listée parmi les
  // recherches qui « ne placent pas encore le château ». Relevée 15e-16e le 01/10.
  const absents = [{ keyword: "salle de la huberdière" }, { keyword: "chambres d'hôtes amboise" }]
  const prev = { "salle de la huberdière": 17, "chambres d'hôtes amboise": null }
  const r = repartirAbsents(absents, prev, true)
  assert.deepEqual(r.perdues, [{ keyword: "salle de la huberdière", avant: 17 }])
  assert.deepEqual(r.jamais.map((s) => s.keyword), ["chambres d'hôtes amboise"])
})

test("sans rapport précédent, tout absent est simplement non classé", () => {
  const r = repartirAbsents([{ keyword: "x" }], {}, false)
  assert.deepEqual(r.perdues, [])
  assert.equal(r.jamais.length, 1)
})

test("une absence ne se prouve que sur une page complète", () => {
  assert.equal(absenceProuvee({ complete: true }), true)
  assert.equal(absenceProuvee({ complete: false }), false)
})

test("un site cité deux fois dans un aperçu IA n'apparaît qu'une fois", () => {
  // Août 2026 : « amboise-valdeloire.com » listé deux fois pour « que faire autour d'amboise ».
  const refs = [{ domain: "amboise-valdeloire.com" }, { domain: "www.valdeloire-france.com" }, { domain: "www.amboise-valdeloire.com" }, { domain: "" }]
  assert.deepEqual(domainesCites(refs), ["amboise-valdeloire.com", "www.valdeloire-france.com"])
})

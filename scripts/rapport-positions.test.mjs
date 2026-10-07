// node --test scripts/rapport-positions.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { repartirAbsents, absenceProuvee, domainesCites, kpiBaseFixe } from "../src/lib/rapport-positions.mjs"

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

test("le KPI garde la base des 19 recherches suivies, même avec des relevés ratés", () => {
  // Septembre 2026 : « 7 / 17 » contre « 8 / 19 » en août, le client a cru que la base changeait.
  const serp = [
    ...Array.from({ length: 7 }, (_, i) => ({ keyword: `c${i}`, position: 10 + i })),
    ...Array.from({ length: 10 }, (_, i) => ({ keyword: `a${i}`, position: null })),
    { keyword: "r1", position: null, releve: false },
    { keyword: "r2", position: null, releve: false },
  ]
  const k = kpiBaseFixe(serp, (s) => s.position != null, "dans le top 100 Google")
  assert.equal(k.valeur, 7)
  assert.equal(k.base, 19)
  assert.equal(k.note, "dans le top 100 Google · 2 non relevées ce mois-ci")
})

test("une seule recherche non relevée se dit au singulier", () => {
  const k = kpiBaseFixe([{ aio: true }, { releve: false }], (s) => s.aio, "sur vos mots-clés suivis")
  assert.deepEqual(k, { valeur: 1, base: 2, note: "sur vos mots-clés suivis · 1 non relevée ce mois-ci" })
})

test("tout relevé : la note reste celle d'origine", () => {
  const k = kpiBaseFixe([{ position: 3 }, { position: null }], (s) => s.position != null, "dans le top 100 Google")
  assert.deepEqual(k, { valeur: 1, base: 2, note: "dans le top 100 Google" })
})

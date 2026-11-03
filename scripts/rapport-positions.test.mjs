// node --test scripts/rapport-positions.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { repartirAbsents, absenceProuvee, domainesCites, kpiBaseFixe, garderRecherchesSuivies } from "../src/lib/rapport-positions.mjs"

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

test("une sortie que la Search Console voit encore en première page porte sa place moyenne", () => {
  // Octobre 2026 : « séminaire château touraine » sortie du relevé national, 3,4e
  // en moyenne sur 20 affichages dans la Search Console du même mois.
  const absents = [{ keyword: "séminaire château touraine" }, { keyword: "gîte touraine" }, { keyword: "location salle" }]
  const prev = { "séminaire château touraine": 4, "gîte touraine": 30, "location salle": 12 }
  const gsc = { "séminaire château touraine": { position: 3.4, impressions: 20 }, "gîte touraine": { position: 9, impressions: 2 }, "location salle": { position: 35, impressions: 40 } }
  const r = repartirAbsents(absents, prev, true, gsc)
  assert.deepEqual(r.perdues[0], { keyword: "séminaire château touraine", avant: 4, gsc: { position: 3.4, impressions: 20 } })
  // Trop peu d'affichages, ou hors des deux premières pages : la sortie reste une sortie.
  assert.equal(r.perdues[1].gsc, undefined)
  assert.equal(r.perdues[2].gsc, undefined)
})

test("une sortie garde le site en tête de la page relevée", () => {
  const r = repartirAbsents([{ keyword: "salle de la huberdière", leader: "www.auvergne-livradois-forez.com" }], { "salle de la huberdière": 15 }, true, { "salle de la huberdière": { position: 10.3, impressions: 30 } })
  assert.equal(r.perdues[0].leader, "www.auvergne-livradois-forez.com")
})

test("une recherche retirée du suivi disparaît aussi des mois rejoués", () => {
  // 02/11/2026 : « salle de la huberdière » retirée, un homonyme (salle des fêtes)
  // sans rapport avec le château. Les instantanés d'août à octobre la portent encore.
  const snap = {
    month: "2026-10",
    serp: [{ keyword: "château de la huberdière", position: 1 }, { keyword: "salle de la huberdière", position: 15 }],
    gscPositions: { "salle de la huberdière": { position: 12, impressions: 9 }, "château de la huberdière": { position: 1, impressions: 80 } },
    history: [{ month: "2026-09", positions: { "château de la huberdière": 1, "salle de la huberdière": 17 } }, { month: "2026-07" }],
  }
  const r = garderRecherchesSuivies(snap, ["château de la huberdière"])
  assert.deepEqual(r.serp.map((s) => s.keyword), ["château de la huberdière"])
  assert.deepEqual(Object.keys(r.gscPositions), ["château de la huberdière"])
  assert.deepEqual(r.history[0].positions, { "château de la huberdière": 1 })
  assert.equal(r.history[1].positions, undefined)
  assert.equal(snap.serp.length, 2, "l'instantané d'origine reste intact")
})

test("sans gscPositions ni history, le filtre ne casse rien", () => {
  const r = garderRecherchesSuivies({ serp: [{ keyword: "a" }, { keyword: "b" }] }, ["a"])
  assert.deepEqual(r.serp, [{ keyword: "a" }])
  assert.equal(r.gscPositions, undefined)
})

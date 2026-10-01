// node --test scripts/rapport-periodes.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { fenetresDeJours, moisDecales, pointDeComparaison } from "../src/lib/rapport-periodes.mjs"

const ecart = ([a, b]) => (Date.parse(b) - Date.parse(a)) / 86400000

test("une plage courte reste une seule fenêtre", () => {
  assert.deepEqual(fenetresDeJours("2026-09-01", "2026-09-30"), [["2026-09-01", "2026-09-30"]])
})

test("juin à fin septembre se coupe sous la limite de 90 jours de Brevo, sans trou ni recouvrement", () => {
  const f = fenetresDeJours("2026-06-01", "2026-09-30")
  assert.ok(f.length >= 2)
  assert.equal(f[0][0], "2026-06-01")
  assert.equal(f.at(-1)[1], "2026-09-30")
  for (const w of f) assert.ok(ecart(w) < 90, `fenêtre trop large : ${w}`)
  for (let i = 1; i < f.length; i++) assert.equal(ecart([f[i - 1][1], f[i][0]]), 1)
})

test("une plage de 90 jours pile est déjà refusée par Brevo, elle se coupe", () => {
  // 1er juin → 30 août : 90 jours d'écart, le message d'erreur du 01/10.
  assert.equal(fenetresDeJours("2026-06-01", "2026-08-30").length, 2)
})

test("début après la fin : aucune fenêtre", () => {
  assert.deepEqual(fenetresDeJours("2026-10-02", "2026-10-01"), [])
})

test("décaler un mois AAAA-MM, à travers les années", () => {
  assert.equal(moisDecales("2026-08", -12), "2025-08")
  assert.equal(moisDecales("2026-01", -1), "2025-12")
  assert.equal(moisDecales("2025-12", 1), "2026-01")
})

const pts = (yms) => yms.map((ym, i) => ({ ym, label: ym, volume: i * 10 }))

test("comparaison sur le même mois un an plus tôt quand la série le porte", () => {
  const serie = pts(["2025-08", "2025-09", "2026-07", "2026-08"])
  const r = pointDeComparaison(serie, serie[3])
  assert.equal(r.point.ym, "2025-08")
  assert.equal(r.titre, "Il y a un an")
})

test("sans le même mois, le plus ancien point, nommé pour ce qu'il est", () => {
  // Rapport de septembre 2026 : 928 en août 2026 annoncé face à 210… en septembre 2025.
  const serie = pts(["2025-09", "2025-10", "2026-07", "2026-08", "2026-09"])
  const r = pointDeComparaison(serie, serie[3])
  assert.equal(r.point.ym, "2025-09")
  assert.equal(r.titre, "11 mois plus tôt")
})

test("historique trop court : pas de comparaison", () => {
  const serie = pts(["2026-03", "2026-08"])
  assert.equal(pointDeComparaison(serie, serie[1]), null)
})

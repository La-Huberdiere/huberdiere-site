// node --test scripts/rapport-graphique.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { renderBrandChart } from "../src/lib/rapport-graphique.mjs"

const PTS = [
  { label: "juin 26", volume: 430, complet: true, mesure: false },
  { label: "juil. 26", volume: 861, complet: true, mesure: true },
  { label: "août 26", volume: 850, complet: true, mesure: true },
  { label: "sept. 26", volume: 1204, complet: false, mesure: true },
]

const barres = (svg) => [...svg.matchAll(/<rect class="b ([a-z]+)"/g)].map((m) => m[1])

test("aucune donnée : pas de graphique", () => {
  assert.equal(renderBrandChart([]), "")
  assert.equal(renderBrandChart(undefined), "")
})

test("une barre par mois, état porté par la classe et non par une couleur en dur", () => {
  const svg = renderBrandChart(PTS)
  assert.deepEqual(barres(svg), ["estime", "mesure", "mesure", "encours"])
  assert.doesNotMatch(svg, /<rect class="b[^>]*fill="#/)
})

test("valeur écrite au-dessus de chaque barre, au format français", () => {
  const svg = renderBrandChart(PTS)
  for (const v of ["430", "861", "850", "1 204"]) assert.ok(svg.includes(`>${v}</text>`), v)
})

test("la barre la plus haute tient dans le cadre", () => {
  const svg = renderBrandChart(PTS)
  const ys = [...svg.matchAll(/<rect class="b [a-z]+" x="[\d.]+" y="([\d.]+)"/g)].map((m) => Number(m[1]))
  assert.ok(Math.min(...ys) > 0)
})

test("légende avec les trois états, et seulement ceux présents", () => {
  const svg = renderBrandChart(PTS)
  assert.match(svg, /Estimation Google/)
  assert.match(svg, /Mesure Search Console/)
  assert.match(svg, /Mois pas encore annoncé/)
  const sansEstime = renderBrandChart(PTS.slice(1))
  assert.doesNotMatch(sansEstime, /Estimation Google/)
})

test("libellés échappés, et chaque barre titrée pour le survol", () => {
  const svg = renderBrandChart([{ label: "<x>", volume: 1, complet: true, mesure: true }])
  assert.doesNotMatch(svg, /<x>/)
  assert.match(svg, /<title>&lt;x&gt; : 1 recherche, mesurée<\/title>/)
})

test("axe à peine plus haut que la plus haute barre", () => {
  const svg = renderBrandChart([{ label: "a", volume: 910, complet: true, mesure: true }])
  const ticks = [...svg.matchAll(/<text class="t"[^>]*>([^<]+)<\/text>/g)].map((m) => Number(m[1].replace(/\D/g, "")))
  assert.equal(Math.max(...ticks), 1250)
})

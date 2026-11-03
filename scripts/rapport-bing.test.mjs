// node --test scripts/rapport-bing.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { bilanBing, renderBing } from "../src/lib/rapport-bing.mjs"

const jour = (iso) => `/Date(${Date.parse(iso)})/`

test("le mois additionne les jours de Bing et garde le mois précédent pour comparer", () => {
  const trafic = [
    { Date: jour("2026-09-30T00:00:00Z"), Impressions: 40, Clicks: 2 },
    { Date: jour("2026-10-01T00:00:00Z"), Impressions: 10, Clicks: 1 },
    { Date: jour("2026-10-31T00:00:00Z"), Impressions: 5, Clicks: 0 },
    { Date: jour("2026-11-01T00:00:00Z"), Impressions: 99, Clicks: 9 },
  ]
  const b = bilanBing(trafic, [], "2026-10")
  assert.equal(b.impressions, 15)
  assert.equal(b.clics, 1)
  assert.deepEqual(b.precedent, { impressions: 40, clics: 2 })
})

test("les recherches du mois sont fusionnées, classées par affichages, position pondérée", () => {
  const requetes = [
    { Date: jour("2026-10-05T00:00:00Z"), Query: "chateau huberdiere", Impressions: 6, Clicks: 2, AvgImpressionPosition: 2 },
    { Date: jour("2026-10-12T00:00:00Z"), Query: "chateau huberdiere", Impressions: 2, Clicks: 0, AvgImpressionPosition: 6 },
    { Date: jour("2026-10-12T00:00:00Z"), Query: "mariage amboise", Impressions: 3, Clicks: 0, AvgImpressionPosition: -1 },
    { Date: jour("2026-09-12T00:00:00Z"), Query: "hors du mois", Impressions: 50, Clicks: 5, AvgImpressionPosition: 1 },
  ]
  const b = bilanBing([], requetes, "2026-10")
  assert.deepEqual(b.requetes, [
    { requete: "chateau huberdiere", impressions: 8, clics: 2, position: 3 },
    { requete: "mariage amboise", impressions: 3, clics: 0, position: null },
  ])
})

test("sans donnée Bing du mois, le bloc ne s'affiche pas", () => {
  assert.equal(bilanBing([], [], "2026-10"), null)
  assert.equal(renderBing(null, "octobre 2026"), "")
})

test("le bloc nomme Bing et les moteurs qu'il alimente, sans couleur seule pour l'évolution", () => {
  const html = renderBing({ ym: "2026-10", impressions: 120, clics: 6, precedent: { impressions: 100, clics: 6 }, requetes: [{ requete: "chateau <huberdiere>", impressions: 8, clics: 2, position: 3 }] }, "octobre 2026")
  assert.match(html, /Bing/)
  assert.match(html, /DuckDuckGo/)
  assert.match(html, /\+20/)
  assert.match(html, /chateau &lt;huberdiere&gt;/)
})

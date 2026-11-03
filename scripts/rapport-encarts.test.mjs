// node --test scripts/rapport-encarts.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { renderEncartConcurrents, renderLienSatisfaction } from "../src/lib/rapport-encarts.mjs"

test("sans entrée pour le mois, rien n'est rendu", () => {
  assert.equal(renderEncartConcurrents(undefined), "")
  assert.equal(renderEncartConcurrents({ titre: "x", points: [] }), "")
  assert.equal(renderLienSatisfaction(undefined), "")
  assert.equal(renderLienSatisfaction({ titre: "x", texte: "y" }), "")
})

test("l'encart concurrents rend titre, intro et points, texte échappé", () => {
  const html = renderEncartConcurrents({
    titre: "Deux voisins regardés de près",
    intro: "Ce mois-ci, deux <voisins>.",
    points: [{ titre: "Le Clos d'Amboise", texte: "2e sur « hôtel Amboise »" }, { titre: "", texte: "Sans titre" }],
  })
  assert.match(html, /class="encart"/)
  assert.match(html, /<h3 class="sub-h">Deux voisins regardés de près<\/h3>/)
  assert.match(html, /deux &lt;voisins&gt;\./)
  assert.match(html, /<strong>Le Clos d'Amboise\.<\/strong> 2e sur «&nbsp;hôtel Amboise&nbsp;»/)
  assert.match(html, /<p>Sans titre<\/p>/)
  assert.doesNotMatch(html, /—/)
})

test("le lien satisfaction ne sort que vers une page du rapport", () => {
  const html = renderLienSatisfaction({ titre: "Faire circuler la satisfaction", texte: "Le projet.", lien: "/rapport?doc=satisfaction", libelle: "Lire le projet" })
  assert.match(html, /href="\/rapport\?doc=satisfaction"/)
  assert.match(html, /Lire le projet/)
  assert.match(html, /Faire circuler la satisfaction/)
  assert.equal(renderLienSatisfaction({ titre: "x", texte: "y", lien: "javascript:alert(1)" }), "")
  assert.equal(renderLienSatisfaction({ titre: "x", texte: "y", lien: "https://exemple.com" }), "")
})

test("les guillemets ne restent jamais seuls en bout de ligne", () => {
  const html = renderLienSatisfaction({ titre: "T", texte: "le mail « Bien rentrés ? »", lien: "/rapport?doc=satisfaction" })
  assert.match(html, /«&nbsp;Bien rentrés&nbsp;\?&nbsp;»/)
})

// node --test scripts/rapport-propositions.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { renderPropositions, propositionsManquantes } from "../src/lib/rapport-propositions.mjs"

test("sans entrée pour le mois, la section disparaît", () => {
  assert.equal(renderPropositions(undefined), "")
  assert.equal(renderPropositions({ alexis: [], client: [] }), "")
})

test("les deux blocs sont rendus, texte échappé", () => {
  const html = renderPropositions({ alexis: ["Écrire « où dormir à Amboise »", "Analyser <Pray>"], client: "Poser le supplément à 15 € dans Octorate" })
  assert.match(html, /<h2>Pour le mois prochain<\/h2>/)
  assert.match(html, /Ce que je fais/)
  assert.match(html, /Ce que je vous propose/)
  assert.match(html, /<p>Écrire « où dormir à Amboise »<\/p>/)
  assert.match(html, /Analyser &lt;Pray&gt;/)
  assert.match(html, /<p>Poser le supplément à 15 € dans Octorate<\/p>/)
  assert.doesNotMatch(html, /—/)
})

test("un seul côté rempli : seul son bloc apparaît", () => {
  const html = renderPropositions({ alexis: ["Une chose"], client: [] })
  assert.match(html, /Ce que je fais/)
  assert.doesNotMatch(html, /Ce que je vous propose/)
})

test("le préflight signale une entrée absente ou incomplète", () => {
  assert.equal(propositionsManquantes(undefined), true)
  assert.equal(propositionsManquantes({ alexis: ["x"], client: [] }), true)
  assert.equal(propositionsManquantes({ alexis: [" "], client: ["y"] }), true)
  assert.equal(propositionsManquantes({ alexis: "x", client: ["y"] }), false)
})

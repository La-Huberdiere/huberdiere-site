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
  assert.match(html, /<li>Écrire « où dormir à Amboise »<\/li>/)
  assert.match(html, /Analyser &lt;Pray&gt;/)
  assert.match(html, /<li>Poser le supplément à 15 € dans Octorate<\/li>/)
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

test("éléments { titre, texte } : intitulé en gras, deux colonnes, préflight satisfait", () => {
  const entree = {
    alexis: [{ titre: "Articles de novembre", texte: "Quatre articles, les 2, 9, 16 et 23." }],
    client: [{ titre: "Avis <Google>", texte: "En demander un après chaque séjour." }, { titre: "", texte: "" }],
  }
  const html = renderPropositions(entree)
  assert.match(html, /class="propositions-grille"/)
  assert.match(html, /<strong>Articles de novembre\.<\/strong> Quatre articles, les 2, 9, 16 et 23\./)
  assert.match(html, /<strong>Avis &lt;Google&gt;\.<\/strong>/)
  assert.equal((html.match(/<li>/g) ?? []).length, 2) // l'élément vide disparaît
  assert.equal(propositionsManquantes(entree), false)
  assert.equal(propositionsManquantes({ alexis: [{ titre: "x", texte: "y" }], client: [{ titre: " ", texte: "" }] }), true)
})

test("lien : l'ancre du texte devient un lien https, sinon le texte reste brut", () => {
  const html = renderPropositions({ client: [{ titre: "Office", texte: "Demander un article comme celui sur Pray & co.", lien: { ancre: "celui sur Pray & co", url: "https://link.morain.fr/abc" } }] })
  assert.match(html, /comme <a href="https:\/\/link\.morain\.fr\/abc">celui sur Pray &amp; co<\/a>\./)
  const brut = renderPropositions({ client: [{ titre: "", texte: "Voir ici", lien: { ancre: "ici", url: "javascript:alert(1)" } }] })
  assert.doesNotMatch(brut, /<a /)
  const absente = renderPropositions({ client: [{ titre: "", texte: "Voir ici", lien: { ancre: "là", url: "https://x.fr" } }] })
  assert.doesNotMatch(absente, /<a /)
})

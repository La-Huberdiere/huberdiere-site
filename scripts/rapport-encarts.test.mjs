// node --test scripts/rapport-encarts.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { renderEncartConcurrents, renderLienSatisfaction, renderEncartMission } from "../src/lib/rapport-encarts.mjs"

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

const voisins = {
  titre: "Deux voisins regardés de près",
  intro: "Intro.",
  chiffres: {
    titre: "Les trois maisons en chiffres",
    colonnes: ["Le Clos d'Amboise", "La Bourdaisière", "Vous"],
    lignes: [
      { libelle: "Note Google", valeurs: ["4,6", "4,3", "4,9"], meilleur: 2 },
      { libelle: "Avis Google", valeurs: [716, 1274, 124], barres: true },
    ],
    note: "Relevés du 22/10.",
  },
  fiches: [{
    nom: "Le Clos d'Amboise", statut: "Hôtel 4 étoiles", resume: "Résumé.",
    plus: ["2e sur « hôtel Amboise »"], moins: ["Pas de page mariage"], garder: ["Demander un avis"],
  }],
  points: [{ titre: "Ce que j'en retiens", texte: "Conclusion." }],
}

test("le tableau des voisins met chaque chiffre en clair et une barre à l'échelle de sa ligne", () => {
  const html = renderEncartConcurrents(voisins)
  assert.match(html, /Les trois maisons en chiffres/)
  assert.match(html, /<th class="num">Vous<\/th>/)
  assert.match(html, /1 274/, "milliers séparés par une espace fine insécable")
  assert.match(html, /<strong>4,9<\/strong>/, "la meilleure valeur en gras, lisible en noir et blanc")
  // 1 274 est le maximum de sa ligne : barre pleine ; 124 en fait moins d'un dixième.
  assert.match(html, /width="100"/)
  assert.match(html, /width="9\.7"/)
  assert.equal((html.match(/<svg/g) || []).length, 3, "pas de barre sur une ligne sans `barres`")
  assert.match(html, /Relevés du 22\/10\./)
})

test("chaque fiche de voisin porte ses plus, ses moins et ce que nous en gardons", () => {
  const html = renderEncartConcurrents(voisins)
  assert.match(html, /class="fiche-voisin"/)
  assert.match(html, /Le Clos d'Amboise<\/h4>/)
  assert.match(html, /Hôtel 4 étoiles/)
  assert.match(html, /class="plus"[\s\S]*2e sur «&nbsp;hôtel Amboise&nbsp;»/)
  assert.match(html, /class="moins"[\s\S]*Pas de page mariage/)
  assert.match(html, /Ce que nous en gardons[\s\S]*Demander un avis/)
  assert.match(html, /<strong>Ce que j'en retiens\.<\/strong> Conclusion\./)
  assert.doesNotMatch(html, /—/)
})

test("un encart sans points mais avec des fiches s'affiche quand même", () => {
  const { points, ...sansPoints } = voisins
  assert.match(renderEncartConcurrents(sansPoints), /fiche-voisin/)
})

const mission = {
  titre: "La mission en 2027",
  texte: "Deux formules à partir du 1er janvier.",
  colonnes: ["Socle", "Mission complète"],
  lignes: [
    { libelle: "Prix", valeurs: ["700 € par mois", "1 000 € par mois"] },
    { libelle: "Articles", valeurs: ["2 par mois, en <FR>, EN et IT", "4 par mois"] },
  ],
  note: "Newsletter et projets restent hors forfait.",
}

test("sans formules, l'encart mission ne rend rien", () => {
  assert.equal(renderEncartMission(undefined), "")
  assert.equal(renderEncartMission({ titre: "x", texte: "y" }), "")
  assert.equal(renderEncartMission({ titre: "x", colonnes: ["A"], lignes: [] }), "")
})

test("l'encart mission met les deux formules côte à côte, texte échappé", () => {
  const html = renderEncartMission(mission)
  assert.match(html, /class="encart"/)
  assert.match(html, /<h3 class="sub-h">La mission en 2027<\/h3>/)
  assert.match(html, /Deux formules à partir du 1er janvier\./)
  assert.match(html, /<th>Socle<\/th><th>Mission complète<\/th>/)
  assert.match(html, /<td>Prix<\/td><td>700 € par mois<\/td><td>1 000 € par mois<\/td>/)
  assert.match(html, /&lt;FR&gt;/)
  assert.match(html, /Newsletter et projets restent hors forfait\./)
  assert.doesNotMatch(html, /—/)
})

test("l'encart mission peut porter un seul prix et ses arguments, sans tableau", () => {
  const html = renderEncartMission({
    titre: "La mission en 2027",
    texte: "1 000 € par mois.",
    points: [{ titre: "Les résultats sont là", texte: "Une demande par <jour>." }, { texte: "" }],
  })
  assert.match(html, /<p class="encart-intro">1 000 € par mois\.<\/p>/)
  assert.match(html, /<p><strong>Les résultats sont là\.<\/strong> Une demande par &lt;jour&gt;\.<\/p>/)
  assert.doesNotMatch(html, /<table/)
  assert.equal((html.match(/<p>/g) || []).length, 1)
})

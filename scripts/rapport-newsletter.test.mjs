// node --test scripts/rapport-newsletter.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { renderNewsletters } from "../src/lib/rapport-newsletter.mjs"

const AUTOMNE = {
  nom: "La newsletter d'automne",
  envoi: "2026-09-21",
  releve: "2026-09-28",
  envoyes: 1318, recus: 1236, ouvertures: 731, cliqueurs: 104, desinscrits: 20, plaintes: 0,
  segments: [
    { nom: "Vos clients 2026", envoyes: 152, recus: 152, ouvertures: 106, cliqueurs: 13 },
    { nom: "Adresses non vérifiables", envoyes: 316, recus: 270, ouvertures: 131, cliqueurs: 16 },
  ],
  liens: [
    { nom: "Le film du château", visites: 51 },
    { nom: "Les dates 2027", visites: 3 },
  ],
  robotsEcartes: 110,
  surLeSite: { film: 33, disponibilites: 6, demandes: 0 },
}

test("aucune campagne ce mois-ci : section absente", () => {
  assert.equal(renderNewsletters(undefined), "")
  assert.equal(renderNewsletters([]), "")
})

test("chiffres clés rapportés aux mails reçus, pas aux envois", () => {
  const html = renderNewsletters([AUTOMNE])
  assert.match(html, /La newsletter d'automne/)
  assert.match(html, /21 septembre/)
  assert.match(html, /1\u00a0236/) // reçus : espace insécable ordinaire, Montserrat ne dessine pas U+202F
  assert.match(html, /59\s?%/) // 731 / 1236
  assert.match(html, /104/)
  assert.match(html, /8\s?%/) // 104 / 1236
  assert.match(html, /1,6\s?%/) // 20 / 1236
})

test("segments en pourcentage de leurs propres reçus", () => {
  const html = renderNewsletters([AUTOMNE])
  assert.match(html, /Vos clients 2026/)
  assert.match(html, /70\s?%/) // 106 / 152
  assert.match(html, /49\s?%/) // 131 / 270
})

test("liens triés du plus visité au moins visité, robots annoncés comme écartés", () => {
  const html = renderNewsletters([{ ...AUTOMNE, liens: [...AUTOMNE.liens].reverse() }])
  assert.ok(html.indexOf("Le film du château") < html.indexOf("Les dates 2027"))
  assert.match(html, /110/)
})

test("le texte saisi est échappé", () => {
  const html = renderNewsletters([{ ...AUTOMNE, nom: "<script>x</script>" }])
  assert.doesNotMatch(html, /<script>x/)
})

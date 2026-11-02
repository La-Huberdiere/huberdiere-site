// node --test scripts/newsletter-optin.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { signerLien, lireLien, saisieHumaine, LIEN_VALIDITE_MS } from "../src/lib/newsletter-optin.mjs"

const SECRET = "secret-de-test"
const T0 = Date.UTC(2026, 10, 2, 10, 0, 0)

test("le lien de confirmation rend l'adresse et la langue signées", () => {
  const j = signerLien("Lodo@Ex.fr", "it", SECRET, T0)
  assert.deepEqual(lireLien(j, SECRET, T0 + 60_000), { email: "lodo@ex.fr", lang: "it" })
})

test("un lien modifié, signé d'une autre clé ou expiré ne vaut rien", () => {
  const j = signerLien("a@ex.fr", "fr", SECRET, T0)
  const [charge, sig] = j.split(".")
  const autre = Buffer.from(JSON.stringify({ e: "b@ex.fr", l: "fr", x: T0 + LIEN_VALIDITE_MS })).toString("base64url")
  assert.equal(lireLien(`${autre}.${sig}`, SECRET, T0), null)
  assert.equal(lireLien(j, "autre-secret", T0), null)
  assert.equal(lireLien(j, SECRET, T0 + LIEN_VALIDITE_MS + 1), null)
  assert.equal(lireLien(`${charge}`, SECRET, T0), null)
  assert.equal(lireLien("", SECRET, T0), null)
  assert.equal(lireLien(null, SECRET, T0), null)
})

test("le jeton horodaté de la page écarte les envois sans page ni délai", () => {
  // Octobre 2026 : 362 adresses saisies par des robots en cinq jours, le champ
  // piège laissé vide. Un humain met plus de 2 secondes à taper son adresse.
  assert.equal(saisieHumaine(undefined, T0), false)
  assert.equal(saisieHumaine("abc", T0), false)
  assert.equal(saisieHumaine(T0 - 500, T0), false)
  assert.equal(saisieHumaine(T0 + 60_000, T0), false)
  assert.equal(saisieHumaine(T0 - 3 * 86_400_000, T0), false)
  assert.equal(saisieHumaine(T0 - 8_000, T0), true)
  assert.equal(saisieHumaine(String(T0 - 8_000), T0), true)
})

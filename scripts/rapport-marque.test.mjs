// node --test scripts/rapport-marque.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { BRAND_KEYWORDS, GSC_BRAND_REGEX } from "../src/lib/rapport-marque.mjs"

const mesure = new RegExp(GSC_BRAND_REGEX, "i")

test("la Search Console compte tout ce qui contient « huberdi », toponyme seul et homonymes compris", () => {
  // Décision d'Alexis du 01/10 : août 2026, 928 et non 816.
  for (const q of ["château de la huberdière", "chateau de la huberdiere", "la huberdière", "huberdiere", "la huberdiere",
    "ferme de la huberdiere", "domaine de la huberdiere", "salle de la huberdière", "la huberdière nazelles"]) {
    assert.ok(mesure.test(q), q)
  }
})

test("l'estimation ne porte que sur des formulations qui nomment le château", () => {
  // « la huberdière » seule vaut ~800 recherches/mois chez Google Ads, surtout la
  // ferme-auberge et le gîte de la Manche : l'estimation exploserait.
  const chateau = /ch[aâ]teau.*huberdi|huberdi.*(nazelles|amboise)/i
  for (const k of BRAND_KEYWORDS) {
    assert.ok(mesure.test(k), k)
    assert.ok(chateau.test(k), k)
  }
})

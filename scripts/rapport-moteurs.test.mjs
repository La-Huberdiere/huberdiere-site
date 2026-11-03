// node --test scripts/rapport-moteurs.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { moteurDe, visitesParMoteur } from "../src/lib/rapport-moteurs.mjs"

test("chaque moteur est reconnu depuis son domaine ou son utm", () => {
  assert.equal(moteurDe("google.com"), "Google")
  assert.equal(moteurDe("www.google.fr"), "Google")
  assert.equal(moteurDe("google"), "Google")
  assert.equal(moteurDe("bing.com"), "Bing")
  assert.equal(moteurDe("ecosia.org"), "Ecosia")
  assert.equal(moteurDe("duckduckgo.com"), "DuckDuckGo")
  assert.equal(moteurDe("qwant.com"), "Qwant")
  assert.equal(moteurDe("search.brave.com"), "Brave")
  assert.equal(moteurDe("fr.search.yahoo.com"), "Yahoo")
})

test("une IA, une messagerie ou un site quelconque n'est pas un moteur", () => {
  assert.equal(moteurDe("gemini.google.com"), null)
  assert.equal(moteurDe("com.google.android.gm"), null)
  assert.equal(moteurDe("copilot.microsoft.com"), null)
  assert.equal(moteurDe("book.octorate.com"), null)
  assert.equal(moteurDe(""), null)
})

test("les référents Umami se regroupent par moteur, Google en tête", () => {
  // Octobre 2026, extrait réel de type=referrer.
  const rows = [
    { x: "google.com", y: 501 }, { x: "bing.com", y: 17 }, { x: "book.octorate.com", y: 12 },
    { x: "ecosia.org", y: 4 }, { x: "google.de", y: 3 }, { x: "duckduckgo.com", y: 3 },
    { x: "google.fr", y: 2 }, { x: "qwant.com", y: 2 }, { x: "gemini.google.com", y: 1 },
  ]
  assert.deepEqual(visitesParMoteur(rows), [
    { moteur: "Google", visites: 506 }, { moteur: "Bing", visites: 17 }, { moteur: "Ecosia", visites: 4 },
    { moteur: "DuckDuckGo", visites: 3 }, { moteur: "Qwant", visites: 2 },
  ])
  assert.deepEqual(visitesParMoteur(null), [])
})

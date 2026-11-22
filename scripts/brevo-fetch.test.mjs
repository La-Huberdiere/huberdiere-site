// node --test scripts/brevo-fetch.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { fetchBrevo, BREVO_TIMEOUT_MS } from "../src/lib/brevo-fetch.mjs"

function serveur(handler) {
  return new Promise((resolve) => {
    const s = http.createServer(handler)
    s.listen(0, "127.0.0.1", () => resolve({ s, url: `http://127.0.0.1:${s.address().port}/` }))
  })
}

test("un Brevo qui ne répond pas est abandonné après le délai", async () => {
  const { s, url } = await serveur(() => {}) // accepte la connexion, ne répond jamais
  const t0 = Date.now()
  await assert.rejects(fetchBrevo(url, {}, 300), (e) => e.name === "TimeoutError")
  const dt = Date.now() - t0
  assert.ok(dt >= 250 && dt < 2000, `abandon en ${dt} ms`)
  s.closeAllConnections()
  s.close()
})

test("un Brevo qui répond à temps est lu normalement", async () => {
  const { s, url } = await serveur((req, res) => res.end(JSON.stringify({ ok: 1 })))
  const r = await fetchBrevo(url, {}, 2000)
  assert.deepEqual(await r.json(), { ok: 1 })
  s.close()
})

test("le délai par défaut est de 8 s", () => {
  assert.equal(BREVO_TIMEOUT_MS, 8000)
})

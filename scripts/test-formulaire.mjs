#!/usr/bin/env node
/**
 * Test de non-régression du formulaire de demande, dans les trois langues.
 *
 * C'est le seul tunnel du site qui rapporte : 24 démarrages de formulaire par
 * mois pour une dizaine de demandes reçues. Une régression silencieuse coûte
 * directement des leads, et le dépôt n'avait aucun test.
 *
 * L'appel à /api/lead est intercepté et jamais laissé partir : le honeypot
 * s'appelle « website », et un envoi réel créerait un vrai contact dans le CRM
 * du client. L'adresse utilisée est en .invalid, réservée par la RFC 2606.
 *
 *   Prérequis :  npx --yes playwright install chromium
 *   Servir le site (dist/client ou astro dev), puis :
 *     node scripts/test-formulaire.mjs [--base http://127.0.0.1:4321]
 */

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("--base", "http://127.0.0.1:4321").replace(/\/$/, "");

/** Une page de formulaire par langue, plus /contact qui a sa propre variante. */
const CASES = [
  ["/mariage", "fr", "Prénom"],
  ["/en/chateau-wedding-loire", "en", "First name"],
  ["/it/matrimonio-castello-loira", "it", "Nome"],
  ["/contact", "fr", "Prénom"],
];

/**
 * Le site est en `trailingSlash: "never"` : contre `astro dev`, une URL à slash
 * final rend 404 et le script expirait ensuite sur un sélecteur absent, sans
 * jamais dire pourquoi. On demande la forme canonique, on bascule sur l'autre si
 * le serveur la refuse, et on échoue bruyamment si aucune des deux ne répond.
 */
async function gotoPath(page, path, opts) {
  const alt = path.endsWith("/") ? path.replace(/\/+$/, "") : path + "/";
  let res = await page.goto(BASE + path, opts);
  if (res && res.status() === 404) res = await page.goto(BASE + alt, opts);
  if (!res || !res.ok()) throw new Error(`${BASE}${path} répond ${res ? res.status() : "rien"}`);
  return res;
}

/** Clés que le back attend : leur disparition casse l'attribution sans rien signaler. */
const PAYLOAD_KEYS = [
  "cible", "prenom", "nom", "email", "telephone", "message", "attribution",
  "lang", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "page", "referrer", "landing", "gclid", "lead_id", "origine", "website",
];

const results = [];
const check = (name, pass, detail = "") => results.push({ name, pass, detail });

const { chromium } = await import("playwright");
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });

for (const [path, lang, expectedLabel] of CASES) {
  const page = await context.newPage();
  let payload = null;
  await page.route("**/api/lead", async (route) => {
    payload = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await gotoPath(page, path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);

  const label = (await page.textContent("label[for=lf-prenom]")) || "";
  check(`${path} libellé traduit`, label.trim().startsWith(expectedLabel), `« ${label.trim()} »`);

  // Envoi à vide : l'erreur s'affiche dans la page, à côté du champ, et rien ne part.
  await page.click("#submitBtn");
  await page.waitForTimeout(400);
  check(`${path} erreur affichée à vide`, await page.isVisible("#err-prenom"));
  check(`${path} aria-invalid posé`, (await page.getAttribute("#lf-prenom", "aria-invalid")) === "true");
  check(`${path} focus sur le champ fautif`, (await page.evaluate(() => document.activeElement?.id)) === "lf-prenom");
  check(`${path} aucun envoi à vide`, payload === null);

  // Email mal formé : signalé, toujours rien envoyé.
  await page.fill("#lf-prenom", "Test");
  await page.fill("#lf-nom", "Automate");
  await page.fill("#lf-email", "pas-un-email");
  await page.click("#submitBtn");
  await page.waitForTimeout(300);
  check(`${path} email invalide signalé`, ((await page.textContent("#err-email")) || "").trim().length > 0);
  check(`${path} aucun envoi sur email invalide`, payload === null);

  // Envoi valide : la requête part, la charge utile est complète, on arrive sur /merci.
  await page.fill("#lf-email", "ne-pas-utiliser@example.invalid");
  await page.fill("#lf-message", "Test automatisé, ne pas traiter.");
  await Promise.all([
    page.waitForURL(/\/merci\/?\?/, { timeout: 15000 }).catch(() => {}),
    page.click("#submitBtn"),
  ]);
  await page.waitForTimeout(600);

  check(`${path} requête envoyée`, payload !== null);
  if (payload) {
    check(`${path} langue transmise`, payload.lang === lang, `lang=${payload.lang}`);
    check(`${path} honeypot vide`, payload.website === "", `website="${payload.website}"`);
    check(`${path} identifiant de lead`, !!payload.lead_id);
    for (const k of PAYLOAD_KEYS) check(`${path} clé ${k}`, k in payload);
  }
  check(`${path} redirection vers /merci`, /\/merci\/?\?/.test(page.url()), page.url().slice(0, 80));
  await page.close();
}

await context.close();
await browser.close();

const failed = results.filter((r) => !r.pass);
failed.forEach((r) => console.error(`  ECHEC  ${r.name}  ${r.detail}`));
console.log(`\n${results.length - failed.length}/${results.length} vérifications passées.`);
process.exit(failed.length ? 1 : 0);

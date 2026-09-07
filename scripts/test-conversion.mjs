#!/usr/bin/env node
/**
 * La page /merci est la seule page de conversion du site. Elle doit émettre
 * DEUX signaux : `generate_lead` dans le dataLayer (GTM, GA4, Google Ads) et
 * `lead` vers Umami (entonnoirs, rapport client).
 *
 * Le second a été muet tout le mois d'août, zéro événement pour une vingtaine de
 * demandes reçues, sans que rien ne le signale : le script Umami est chargé en
 * `async` dans le head, le script de la page s'exécute au parse du body, et la
 * garde `if (window.umami)` échouait donc en silence à chaque conversion. Les
 * autres événements (`form_start`, `reserve_click`) n'ont jamais eu le problème
 * puisqu'ils suivent une interaction, des secondes plus tard.
 *
 * Ce test intercepte la balise de collecte Umami et vérifie que `lead` part
 * réellement. Aucun événement ne rejoint le vrai tableau de bord.
 *
 *   Prérequis :  npx --yes playwright install chromium
 *   node scripts/test-conversion.mjs [--base https://www.chateaudelahuberdiere.com]
 */

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("--base", "http://127.0.0.1:4321").replace(/\/$/, "");

/** Une page de remerciement par langue, la cible portant la valeur de conversion. */
const CAS = [
  ["/merci", "fr", "mariage", 50],
  ["/en/merci", "en", "seminaire", 40],
  ["/it/merci", "it", "contact", 5],
];

const results = [];
const check = (name, pass, detail = "") => results.push({ name, pass, detail });

const { chromium } = await import("playwright");
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

for (const [path, lang, cible, valeur] of CAS) {
  const page = await context.newPage();
  const beacons = [];

  // La collecte Umami est un POST sur /api/send. On la retient et on répond 200 :
  // le script continue de tourner normalement, rien ne part vers la vraie instance.
  await page.route("**/api/send", async (route) => {
    try { beacons.push(JSON.parse(route.request().postData() || "{}")); } catch {}
    await route.fulfill({ status: 200, contentType: "text/plain", body: "ok" });
  });

  const leadId = `test-conversion-${Date.now()}`;
  const url = `${BASE}${path}?cible=${cible}&lead_id=${leadId}`;
  const res = await page.goto(url, { waitUntil: "domcontentloaded" });
  if (!res || !res.ok()) { check(`${path} répond`, false, String(res && res.status())); await page.close(); continue; }
  check(`${path} répond`, true);

  // Le dataLayer est synchrone : GTM rejoue sa file, il n'a jamais eu le problème.
  const dl = await page.evaluate(() => (window.dataLayer || []).filter((e) => e && e.event === "generate_lead"));
  check(`${path} dataLayer generate_lead`, dl.length === 1, `${dl.length} événement(s)`);
  if (dl[0]) {
    check(`${path} lead_type = ${cible}`, dl[0].lead_type === cible, String(dl[0].lead_type));
    check(`${path} valeur = ${valeur}`, dl[0].value === valeur, String(dl[0].value));
    check(`${path} transaction_id transmis`, dl[0].transaction_id === leadId, String(dl[0].transaction_id));
  }

  // Umami arrive par le réseau : on lui laisse le temps, c'est tout l'objet du test.
  await page.waitForFunction(() => !!(window.umami && window.umami.track), null, { timeout: 15000 }).catch(() => {});
  check(`${path} script Umami chargé`, await page.evaluate(() => !!(window.umami && window.umami.track)));

  await page.waitForFunction(
    () => (window.__beacons || 0) >= 0 && true,
    null, { timeout: 1000 },
  ).catch(() => {});
  // La file est vidée par une minuterie de 250 ms : on lui laisse quelques tours.
  await page.waitForTimeout(2500);

  const leads = beacons.filter((b) => b?.payload?.name === "lead");
  check(`${path} événement Umami « lead » émis`, leads.length >= 1, `${beacons.length} balise(s), ${leads.length} lead`);
  if (leads[0]) {
    const d = leads[0].payload.data || {};
    check(`${path} Umami type = ${cible}`, d.type === cible, String(d.type));
    check(`${path} Umami valeur = ${valeur}`, Number(d.value) === valeur, String(d.value));
  }

  // Rechargement : l'anti double comptage doit tenir sur le même lead_id.
  beacons.length = 0;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  check(
    `${path} pas de double comptage au rechargement`,
    beacons.filter((b) => b?.payload?.name === "lead").length === 0,
    `${beacons.filter((b) => b?.payload?.name === "lead").length} lead en trop`,
  );

  await page.close();
}

await context.close();
await browser.close();

const failed = results.filter((r) => !r.pass);
failed.forEach((r) => console.error(`  ECHEC  ${r.name}  ${r.detail}`));
console.log(`\n${results.length - failed.length}/${results.length} vérifications passées.`);
process.exit(failed.length ? 1 : 0);

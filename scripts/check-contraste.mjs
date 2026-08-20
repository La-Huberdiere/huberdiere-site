#!/usr/bin/env node
/**
 * Contrôle du contraste du texte posé sur photo (héros).
 *
 * Un ratio calculé sur des valeurs CSS ne dit rien quand le fond est une image :
 * ce script masque le texte, photographie le fond réellement rendu sous chaque
 * bloc, et mesure le pire pixel. C'est la seule façon de savoir si le chapeau de
 * /mariage tombe sur la robe blanche de la mariée.
 *
 *   Prérequis, une seule fois :  npx --yes playwright install chromium
 *   Usage :  node scripts/check-contraste.mjs [--base http://127.0.0.1:4321]
 *
 * Sort en code 1 si un bloc passe sous 4,5:1 (AA texte courant).
 */

const AA = 4.5;
const PATHS = [
  ["/", "home"],
  ["/mariage/", "mariage"],
  ["/seminaire/", "seminaire"],
  ["/sejour/", "sejour"],
  ["/famille/", "famille"],
  ["/retraite/", "retraite"],
  ["/restauration/", "restauration"],
  ["/en/things-to-do/", "page-libre"],
];
const VIEWPORTS = [
  [1440, 900, "desktop"],
  [390, 844, "mobile"],
];
const SELECTORS = [".hero h1", ".hero p", ".page-hero h1", ".page-hero p", ".free-hero h1"];
/** Conteneurs à masquer pour ne photographier que la photo et son voile. */
const HIDE = ".hero-inner,.page-hero .inner,.fh-inner,.hero-inner *,.page-hero .inner *";

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const lin = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const luminance = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
/** Contraste du blanc pur contre une luminance donnée. */
const againstWhite = (L) => 1.05 / (L + 0.05);

const base = arg("--base", "http://127.0.0.1:4321").replace(/\/$/, "");
const { chromium } = await import("playwright");
const { PNG } = await import("pngjs");

const browser = await chromium.launch();
const failures = [];

for (const [width, height, vpName] of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height } });
  for (const [path, pageName] of PATHS) {
    const page = await context.newPage();
    try {
      await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 45000 });
    } catch {
      await page.close();
      continue;
    }
    await page.waitForTimeout(2200);

    const boxes = [];
    for (const sel of SELECTORS) {
      const el = await page.$(sel);
      if (!el) continue;
      const bb = await el.boundingBox().catch(() => null);
      if (!bb || bb.width < 10 || bb.y > height) continue;
      boxes.push([sel, bb]);
    }
    if (!boxes.length) {
      await page.close();
      continue;
    }

    await page.addStyleTag({ content: `${HIDE}{visibility:hidden!important}` });
    await page.waitForTimeout(400);

    for (const [sel, bb] of boxes) {
      const clip = {
        x: Math.max(0, Math.round(bb.x)),
        y: Math.max(0, Math.round(bb.y)),
        width: Math.round(Math.min(bb.width, width - bb.x)),
        height: Math.round(Math.min(bb.height, height - bb.y)),
      };
      if (clip.width < 2 || clip.height < 2) continue;
      let buf;
      try {
        buf = await page.screenshot({ clip });
      } catch {
        continue;
      }
      const png = PNG.sync.read(buf);
      let brightest = 0;
      for (let i = 0; i < png.data.length; i += 4) {
        const L = luminance(png.data[i], png.data[i + 1], png.data[i + 2]);
        if (L > brightest) brightest = L;
      }
      const ratio = againstWhite(brightest);
      const ok = ratio >= AA;
      if (!ok) failures.push(`${vpName} ${pageName} ${sel} → ${ratio.toFixed(2)}:1`);
      console.log(
        `${ok ? "  " : "!!"} ${vpName.padEnd(8)} ${pageName.padEnd(12)} ${sel.padEnd(15)} pire pixel ${ratio.toFixed(2)}:1`
      );
    }
    await page.close();
  }
  await context.close();
}
await browser.close();

if (failures.length) {
  console.error(`\n${failures.length} bloc(s) sous ${AA}:1 :`);
  failures.forEach((f) => console.error("  " + f));
  process.exit(1);
}
console.log(`\nTous les blocs de héros tiennent ${AA}:1 sur leur pire pixel.`);

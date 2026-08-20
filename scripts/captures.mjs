#!/usr/bin/env node
/**
 * Filet de sécurité visuel du chantier de refonte (décision D5 du plan du 20/08).
 *
 * Capture les 6 landings × 3 langues, la home × 3 langues et les pages transverses,
 * en desktop et en mobile, dans un dossier horodaté. Deux dossiers se comparent
 * ensuite fichier par fichier : on voit ce qu'on a changé, et surtout ce qu'on a
 * cassé sans le vouloir.
 *
 * Playwright n'est volontairement pas une dépendance du projet : il est tiré à la
 * demande par npx pour ne pas alourdir l'installation de production sur Vercel.
 *
 *   Prérequis, une seule fois :  npx --yes playwright install chromium
 *
 *   Avant un lot :   node scripts/captures.mjs --label avant-lot3
 *   Après le lot :   node scripts/captures.mjs --label apres-lot3
 *   Comparaison :    node scripts/captures.mjs --diff avant-lot3 apres-lot3
 *
 * Cible par défaut : le serveur de préversion local (npm run preview). Passer
 * --base https://chateaudelahuberdiere.com pour capturer la production.
 */

import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { localizePath } from "../src/lib/routes.ts";

const LANGS = ["fr", "en", "it"];

/** Chemins « style FR » : localizePath se charge des slugs EN/IT. */
const FR_PATHS = [
  "/",
  "/mariage",
  "/seminaire",
  "/sejour",
  "/famille",
  "/retraite",
  "/restauration",
  "/galerie",
  "/contact",
  "/blog",
  // Deuxième porte d'entrée du site en anglais (235 entrées sur 30 j) : à surveiller.
  "/blog/prix-mariage-chateau-loire",
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

function arg(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const OUT_ROOT = path.resolve("captures");

/** Nom de fichier lisible et triable : lang__chemin__viewport.png */
function shotName(frPath, lang, viewport) {
  const localized = localizePath(frPath, lang);
  const slug = localized.replace(/^\//, "").replace(/\//g, "_") || "home";
  return `${lang}__${slug}__${viewport}.png`;
}

async function capture() {
  const label = arg("--label");
  if (!label) {
    console.error("Il faut un libellé : --label avant-lot3");
    process.exit(1);
  }
  const base = arg("--base", "http://localhost:4321").replace(/\/$/, "");
  const outDir = path.join(OUT_ROOT, label);
  await mkdir(outDir, { recursive: true });

  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  let done = 0;
  const total = FR_PATHS.length * LANGS.length * VIEWPORTS.length;

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      // Le bandeau cookies masque la page : on le neutralise pour capturer le fond.
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    // Les animations d'apparition rendent les captures non déterministes.
    await page.addInitScript(() => {
      const css = "*,*::before,*::after{animation:none!important;transition:none!important}";
      document.addEventListener("DOMContentLoaded", () => {
        const s = document.createElement("style");
        s.textContent = css;
        document.head.appendChild(s);
      });
    });

    for (const frPath of FR_PATHS) {
      for (const lang of LANGS) {
        const url = base + localizePath(frPath, lang);
        try {
          await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
        } catch {
          // networkidle ne vient jamais sur les pages qui portent le widget Octorate.
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
          await page.waitForTimeout(2500);
        }
        await page.screenshot({
          path: path.join(outDir, shotName(frPath, lang, viewport.name)),
          fullPage: true,
        });
        done += 1;
        process.stdout.write(`\r${done}/${total} ${url.slice(0, 70).padEnd(72)}`);
      }
    }
    await context.close();
  }

  await browser.close();
  console.log(`\nCaptures écrites dans ${outDir}`);
}

async function hashDir(dir) {
  const files = await readdir(dir);
  const map = new Map();
  for (const f of files.filter((f) => f.endsWith(".png"))) {
    const buf = await readFile(path.join(dir, f));
    map.set(f, { hash: createHash("sha1").update(buf).digest("hex"), size: buf.length });
  }
  return map;
}

async function diff() {
  const i = process.argv.indexOf("--diff");
  const [a, b] = [process.argv[i + 1], process.argv[i + 2]];
  if (!a || !b) {
    console.error("Il faut deux libellés : --diff avant-lot3 apres-lot3");
    process.exit(1);
  }
  const [ma, mb] = await Promise.all([
    hashDir(path.join(OUT_ROOT, a)),
    hashDir(path.join(OUT_ROOT, b)),
  ]);

  const changed = [];
  const identical = [];
  for (const [name, va] of ma) {
    const vb = mb.get(name);
    if (!vb) {
      changed.push(`  disparue    ${name}`);
    } else if (vb.hash !== va.hash) {
      const delta = (((vb.size - va.size) / va.size) * 100).toFixed(1);
      changed.push(`  modifiée    ${name}  (poids ${delta > 0 ? "+" : ""}${delta} %)`);
    } else {
      identical.push(name);
    }
  }
  for (const name of mb.keys()) if (!ma.has(name)) changed.push(`  nouvelle    ${name}`);

  console.log(`\n${a} → ${b}`);
  console.log(`${identical.length} page(s) inchangée(s), ${changed.length} à revoir à l'œil.\n`);
  changed.sort().forEach((l) => console.log(l));
  if (!changed.length) console.log("  aucune différence pixel.");

  const report = path.join(OUT_ROOT, `diff-${a}--${b}.txt`);
  await writeFile(report, changed.sort().join("\n") + "\n", "utf-8");
  console.log(`\nRapport : ${report}`);
}

if (process.argv.includes("--diff")) await diff();
else await capture();

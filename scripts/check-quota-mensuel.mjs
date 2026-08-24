#!/usr/bin/env node
// Contrôle bloquant du quota éditorial : 4 articles par mois, jamais plus.
//
// Pourquoi : le client paie 4 articles par mois. En août 2026 il y en a eu 6, parce
// que la règle de sélection du skill `redige-huberdiere` choisissait « le premier slug
// du BLOC du mois courant non publié » puis datait au JOUR DU RUN. Un rééchelonnement
// avait vidé le bloc d'août, la règle le voyait soldé, allait se servir dans le bloc de
// septembre et datait quand même en août. Deux runs, deux articles en trop, et le mois
// suivant vidé d'autant. La règle a été réécrite (comptage sur le publishedAt RÉEL des
// fichiers), mais une règle vit dans un SKILL.md : elle est advisory, elle se contourne
// et elle se perd. Ce script est le filet, côté build.
//
// Deux erreurs FATALES :
//   1. un mois dépasse 4 articles ;
//   2. un même slug porte des publishedAt différents selon la langue (FR/EN/IT).
//      Une date désynchronisée sort l'article dans une langue et le masque dans les
//      autres, sans rien casser d'autre : invisible sans ce contrôle.
//
// Le contrôle ne porte que sur les mois >= CADENCE_DEPUIS. Juin et juillet 2026 sont
// hors périmètre : ce sont le lancement et ses 6 piliers, mis en ligne avant que la
// cadence « 4/mois » ne soit actée, et redater des pages indexées depuis des mois
// coûterait plus cher que l'anomalie qu'on corrigerait.
//
// Un mois SOUS le quota n'est pas une erreur : le mois en cours se remplit run après
// run. Seul le dépassement est une faute, et il est irréversible sans dépublier.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const COLS = { fr: "src/content/articles", en: "src/content/articles-en", it: "src/content/articles-it" };

const QUOTA = 4;
const CADENCE_DEPUIS = "2026-08"; // début de la cadence client 4/mois

/** publishedAt de chaque slug d'une collection. */
function datesDe(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return {};
  const out = {};
  for (const f of fs.readdirSync(abs).filter((n) => n.endsWith(".mdoc"))) {
    const raw = fs.readFileSync(path.join(abs, f), "utf8");
    const m = /^publishedAt:\s*"?(\d{4}-\d{2}-\d{2})"?/m.exec(raw);
    out[f.replace(/\.mdoc$/, "")] = m ? m[1] : null;
  }
  return out;
}

const parLangue = Object.fromEntries(Object.entries(COLS).map(([l, d]) => [l, datesDe(d)]));
const erreurs = [];

// 1. Quota mensuel, compté sur le FR (la référence).
const parMois = {};
for (const [slug, date] of Object.entries(parLangue.fr)) {
  if (!date) {
    erreurs.push(`${slug} : publishedAt absent ou illisible`);
    continue;
  }
  (parMois[date.slice(0, 7)] ??= []).push({ slug, date });
}

for (const mois of Object.keys(parMois).sort()) {
  const articles = parMois[mois].sort((a, b) => a.date.localeCompare(b.date));
  if (mois < CADENCE_DEPUIS || articles.length <= QUOTA) continue;
  erreurs.push(
    `${mois} : ${articles.length} articles pour un quota de ${QUOTA}\n` +
      articles.map((a) => `            ${a.date}  ${a.slug}`).join("\n")
  );
}

// 2. Dates cohérentes entre les 3 langues.
for (const [slug, date] of Object.entries(parLangue.fr)) {
  for (const lang of ["en", "it"]) {
    const autre = parLangue[lang][slug];
    if (autre !== undefined && autre !== date) {
      erreurs.push(`${slug} : publishedAt ${date} en fr mais ${autre} en ${lang}`);
    }
  }
}

if (erreurs.length) {
  console.error(`\nQuota éditorial : ${erreurs.length} erreur(s), build interrompu.\n`);
  for (const e of erreurs) console.error(`  ERREUR  ${e}`);
  console.error(
    "\nRappel : 4 articles par mois maximum, compté sur le publishedAt RÉEL des fichiers,\n" +
      "jamais sur l'appartenance d'un slug à un bloc du calendrier. Un mois plein pousse\n" +
      "l'article suivant au premier créneau libre du mois d'après (rythme 2/9/16/23) : un\n" +
      "publishedAt futur est une publication différée, pas un bug. Voir l'en-tête de ce\n" +
      "script et l'étape 1 de ~/.claude/skills/redige-huberdiere/SKILL.md.\n"
  );
  process.exit(1);
}

const suivis = Object.keys(parMois)
  .filter((m) => m >= CADENCE_DEPUIS)
  .sort();
console.log(
  `Quota éditorial : OK (${suivis.map((m) => `${m} ${parMois[m].length}/${QUOTA}`).join(", ")}).`
);

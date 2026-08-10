#!/usr/bin/env node
// Contrôle bloquant du maillage interne des articles, dans les 3 langues.
//
// Pourquoi : un article à date future n'a PAS de page générée (filtre isLive de
// src/lib/content.ts). Le lier depuis un article déjà en ligne produit un 404 en
// production, silencieusement, jusqu'à la date de sortie de la cible. C'est arrivé
// deux fois (piliers repoussés en septembre, satellites programmés liés par des
// articles publiés avant eux), d'où ce garde-fou.
//
// Trois erreurs FATALES, qui cassent le build :
//   1. lien vers un article ou une page qui n'existe pas ;
//   2. lien EN/IT vers un slug FR (URL non localisée, cf. routes.ts) ;
//   3. lien « vers le futur » non résolu : cible plus récente que la source ET pas
//      encore en ligne. C'est exactement la condition d'un 404.
//
// Un lien « vers le futur » dont les deux extrémités sont déjà en ligne n'est plus
// nocif : simple avertissement, pas d'échec. Conséquence utile : un build vert reste
// vert quand le temps passe, la condition 3 ne peut que se résoudre. Seul un nouveau
// commit peut faire échouer ce contrôle, jamais l'écoulement du temps.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const COLS = { fr: "src/content/articles", en: "src/content/articles-en", it: "src/content/articles-it" };

// Routes hors pages « money » qui existent bel et bien (ancres, remerciement, index).
const EXTRA_ROUTES = new Set(["", "blog", "merci", "404"]);

const routesTs = fs.readFileSync(path.join(ROOT, "src/lib/routes.ts"), "utf8");

/** Extrait le corps d'un objet exporté de routes.ts, par son nom. */
function bloc(nom) {
  const i = routesTs.indexOf(`export const ${nom}`);
  if (i < 0) throw new Error(`routes.ts : ${nom} introuvable`);
  // On cherche l'accolade de l'AFFECTATION, pas la première accolade rencontrée :
  // l'annotation de type la précède, ex. Record<string, { en: string; it: string }>.
  const eq = routesTs.indexOf("= {", i);
  if (eq < 0) throw new Error(`routes.ts : affectation de ${nom} introuvable`);
  const start = routesTs.indexOf("{", eq);
  let prof = 0;
  for (let k = start; k < routesTs.length; k++) {
    if (routesTs[k] === "{") prof++;
    else if (routesTs[k] === "}" && --prof === 0) return routesTs.slice(start, k + 1);
  }
  throw new Error(`routes.ts : bloc ${nom} non fermé`);
}

/** id canonique -> { fr?, en, it } pour un bloc de routes.ts. */
function parseMap(nom) {
  const out = {};
  const re = /["']?([a-z0-9-]+)["']?\s*:\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(bloc(nom)))) {
    const champs = {};
    for (const [, lg, val] of m[2].matchAll(/(fr|en|it)\s*:\s*"([^"]+)"/g)) champs[lg] = val;
    out[m[1]] = champs;
  }
  return out;
}

const ARTICLE_SLUGS = parseMap("ARTICLE_SLUGS");
const PAGE_SLUGS = parseMap("PAGE_SLUGS");
const FREE_PAGE_SLUGS = parseMap("FREE_PAGE_SLUGS");

// Index inverse : slug localisé -> id canonique, par langue et par famille.
const revArticle = { fr: {}, en: {}, it: {} };
const revPage = { fr: {}, en: {}, it: {} };
const ids = fs.readdirSync(path.join(ROOT, COLS.fr)).filter((f) => f.endsWith(".mdoc")).map((f) => f.slice(0, -5));
for (const id of ids) {
  revArticle.fr[id] = id;
  for (const lg of ["en", "it"]) revArticle[lg][ARTICLE_SLUGS[id]?.[lg] ?? id] = id;
}
for (const [id, s] of Object.entries({ ...PAGE_SLUGS, ...FREE_PAGE_SLUGS })) {
  revPage.fr[s.fr ?? id] = id;
  for (const lg of ["en", "it"]) revPage[lg][s[lg] ?? id] = id;
}
// Un slug FR de page ou d'article, quelle que soit la langue : sert à détecter les
// liens EN/IT restés au slug français.
const slugsFr = new Set([...ids, ...Object.keys(revPage.fr)]);

const today = new Date().toISOString().slice(0, 10);
const dateOf = (lg, id) => {
  const p = path.join(ROOT, COLS[lg], `${id}.mdoc`);
  if (!fs.existsSync(p)) return null;
  return (fs.readFileSync(p, "utf8").match(/^publishedAt:\s*(\S+)/m) ?? [])[1] ?? null;
};

const erreurs = [];
const avertissements = [];

for (const [lg, dir] of Object.entries(COLS)) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs).filter((x) => x.endsWith(".mdoc"))) {
    const id = f.slice(0, -5);
    const src = `${dir}/${f}`;
    const texte = fs.readFileSync(path.join(abs, f), "utf8");
    const corps = texte.split(/^---$/m).slice(2).join("---");
    const dSrc = dateOf(lg, id);

    for (const [, brut] of corps.matchAll(/\]\((\/[^)\s]*)\)/g)) {
      const chemin = brut.split("#")[0].split("?")[0].replace(/\/$/, "");
      if (!chemin) continue;
      let reste = chemin.slice(1);

      // Préfixe de langue obligatoire hors FR.
      if (lg !== "fr") {
        if (!reste.startsWith(`${lg}/`) && reste !== lg) {
          erreurs.push(`${src} : lien « ${brut} » sans préfixe /${lg}/`);
          continue;
        }
        reste = reste.slice(lg.length + 1);
      }

      const estArticle = reste === "blog" ? false : reste.startsWith("blog/");
      const slug = estArticle ? reste.slice("blog/".length) : reste;

      if (!estArticle) {
        if (EXTRA_ROUTES.has(slug) || revPage[lg][slug]) continue;
        if (lg !== "fr" && slugsFr.has(slug)) {
          erreurs.push(`${src} : page « ${brut} » au slug FR, attendu le slug ${lg} (PAGE_SLUGS)`);
        } else {
          erreurs.push(`${src} : page inconnue « ${brut} »`);
        }
        continue;
      }

      const cible = revArticle[lg][slug];
      if (!cible) {
        if (lg !== "fr" && ids.includes(slug)) {
          erreurs.push(`${src} : article « ${brut} » au slug FR, attendu le slug ${lg} (ARTICLE_SLUGS)`);
        } else {
          erreurs.push(`${src} : article inexistant « ${brut} »`);
        }
        continue;
      }
      if (!fs.existsSync(path.join(ROOT, COLS[lg], `${cible}.mdoc`))) {
        erreurs.push(`${src} : « ${brut} » existe en FR mais pas en ${lg}`);
        continue;
      }

      const dCible = dateOf(lg, cible);
      if (!dSrc || !dCible || dCible <= dSrc) continue;
      const msg = `${src} (${dSrc}) linke ${cible} (${dCible}), plus récent que lui`;
      if (dCible > today) {
        erreurs.push(`${msg} et pas encore en ligne : 404 garanti`);
      } else {
        avertissements.push(`${msg}, mais les deux sont en ligne : sans effet aujourd'hui`);
      }
    }
  }
}

for (const a of avertissements) console.warn(`  avertissement  ${a}`);
if (erreurs.length) {
  console.error(`\nMaillage interne : ${erreurs.length} erreur(s), build interrompu.\n`);
  for (const e of erreurs) console.error(`  ERREUR  ${e}`);
  console.error(
    "\nRappel : ne jamais linker un article dont la date de publication est postérieure\n" +
      "à celle de l'article qui le linke. Choisir une cible déjà en ligne, ou avancer la\n" +
      "date de la cible. Voir l'en-tête de scripts/check-liens-articles.mjs.\n"
  );
  process.exit(1);
}
console.log(
  `Maillage interne : OK (${ids.length} articles, 3 langues` +
    `${avertissements.length ? `, ${avertissements.length} avertissement(s)` : ""}).`
);

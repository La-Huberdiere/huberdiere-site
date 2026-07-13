// Outil i18n : extrait les chaînes FR traduisibles d'un fichier de données
// { fr, en, it } et réinjecte les traductions EN/IT sans jamais toucher la
// structure. La traduction elle-même est faite par Claude (pas DeepL), donc
// contextuelle. Deux modes :
//   node scripts/i18n.mjs extract <file.json> [out.fr.json]
//   node scripts/i18n.mjs apply   <file.json> <trad.json>
//
// trad.json = { "<id>": { "en": "...", "it": "..." }, ... } (ids = ceux de extract)
//
// Champs NON traduits (recopiés tels quels en EN/IT) : noms de chambres, tailles,
// emails, téléphones, tout *href, photos. "big" (gros chiffres des stats) EST
// traduit car il contient parfois des mots ("Le jeudi" -> "On Thursdays") ;
// consigne au traducteur : garder chiffres/unités, ne traduire que les mots.

import { readFileSync, writeFileSync } from "node:fs";

const SKIP = new Set([
  "email", "phone", "phoneHref", "brandName", "name", "size", "photo", "photos",
]);
const skipKey = (k) => SKIP.has(k) || /href$/i.test(String(k));

// Parcours déterministe des feuilles string traduisibles de `node`.
// visit(value, setter) appelé dans le MÊME ordre à l'extract et à l'apply,
// ce qui garantit que les ids correspondent.
function walk(node, visit, parentKey) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => {
      if (typeof v === "string") {
        if (!skipKey(parentKey) && v.trim()) visit(v, (t) => (node[i] = t));
      } else if (v && typeof v === "object") {
        walk(v, visit, parentKey);
      }
    });
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string") {
        if (!skipKey(k) && v.trim()) visit(v, (t) => (node[k] = t));
      } else if (v && typeof v === "object") {
        walk(v, visit, k);
      }
    }
  }
}

const [, , mode, file, extra] = process.argv;
if (!mode || !file) {
  console.error("usage: i18n.mjs extract|apply <file> [out|trad]");
  process.exit(1);
}

const data = JSON.parse(readFileSync(file, "utf8"));
if (!data.fr) {
  console.error(`${file}: pas de clé racine "fr", fichier ignoré.`);
  process.exit(2);
}

if (mode === "extract") {
  const out = [];
  const fr = structuredClone(data.fr);
  walk(fr, (v) => out.push({ id: out.length, fr: v }));
  const json = JSON.stringify(out, null, 2);
  if (extra) writeFileSync(extra, json);
  else process.stdout.write(json + "\n");
  console.error(`extract ${file}: ${out.length} chaînes`);
} else if (mode === "apply") {
  if (!extra) { console.error("apply: fichier de traductions requis"); process.exit(1); }
  const tr = JSON.parse(readFileSync(extra, "utf8"));
  let missing = 0;
  for (const lang of ["en", "it"]) {
    const clone = structuredClone(data.fr);
    let id = 0;
    walk(clone, (v, set) => {
      const t = tr[id] && tr[id][lang];
      if (t == null || t === "") { missing++; /* garde le FR */ }
      else set(t);
      id++;
    });
    data[lang] = clone;
  }
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.error(`apply ${file}: OK${missing ? ` (${missing} chaînes sans trad -> FR conservé)` : ""}`);
} else {
  console.error(`mode inconnu: ${mode}`);
  process.exit(1);
}

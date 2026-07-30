#!/usr/bin/env node
// Garde-fou de cohérence du calendrier éditorial client (/rapport?doc=calendrier).
// But : empêcher la dérive entre src/data/calendrier-editorial.json (le plan montré
// au client) et les vrais articles src/content/articles/*.mdoc.
//
// Contrôles :
//   ERREUR  un article publié n'est pas dans le plan (il n'apparaîtra pas au client)
//   ERREUR  un slug apparaît en double, ou un cluster est hors liste
//   ALERTE  un slug du plan n'a pas de fichier alors que son mois prévu est passé
//           (probable fantôme : sujet renommé, abandonné ou jamais rédigé)
//   INFO    un satellite rédigé est publié dans un autre mois que 'moisPrevu'
//           (l'affichage suit déjà la date réelle ; réaligner moisPrevu quand tu peux)
//
// Exécution : `npm run check:calendrier`. Lancé aussi en prebuild (non bloquant),
// pour que la dérive saute aux yeux au moment où on rédige, pas chez le client.

import { readFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const PLAN = JSON.parse(readFileSync(join(ROOT, "src/data/calendrier-editorial.json"), "utf8"))
const ARTICLES_DIR = join(ROOT, "src/content/articles")

const CLUSTERS = new Set(["Mariage", "Séminaire", "Séjour", "Famille", "Retraite", "Tourisme", "Restauration"])
const moisCourant = new Date().toISOString().slice(0, 7)

// Fichiers réels -> mois de publication (AAAA-MM), depuis le frontmatter.
const fichiers = {}
for (const f of readdirSync(ARTICLES_DIR).filter((n) => n.endsWith(".mdoc"))) {
  const slug = f.replace(/\.mdoc$/, "")
  const raw = readFileSync(join(ARTICLES_DIR, f), "utf8")
  const m = /^publishedAt:\s*"?(\d{4}-\d{2}-\d{2})"?/m.exec(raw)
  fichiers[slug] = m ? m[1] : null
}

const piliers = PLAN.piliers ?? []
const satellites = PLAN.satellites ?? []
const planSlugs = [...piliers, ...satellites].map((a) => a.slug)

const erreurs = []
const alertes = []
const infos = []

// 1. Doublons de slug dans le plan.
const vus = new Set()
for (const s of planSlugs) {
  if (vus.has(s)) erreurs.push(`Slug en double dans le plan : ${s}`)
  vus.add(s)
}

// 2. Clusters valides + moisPrevu présent sur les satellites.
for (const a of satellites) {
  if (!CLUSTERS.has(a.cluster)) erreurs.push(`Cluster inconnu « ${a.cluster} » pour ${a.slug}`)
  if (!/^\d{4}-\d{2}$/.test(a.moisPrevu || "")) erreurs.push(`moisPrevu manquant ou mal formé pour ${a.slug}`)
}
for (const p of piliers) if (!CLUSTERS.has(p.cluster)) erreurs.push(`Cluster inconnu « ${p.cluster} » pour ${p.slug}`)

// 3. Tout article publié doit être dans le plan.
for (const slug of Object.keys(fichiers)) {
  if (!vus.has(slug)) erreurs.push(`Article publié absent du plan : ${slug} (il ne s'affichera pas dans le calendrier client)`)
}

// 4. Slugs du plan sans fichier : fantôme si le mois prévu est déjà passé.
for (const a of satellites) {
  if (!(a.slug in fichiers) && a.moisPrevu < moisCourant) {
    alertes.push(`Satellite « ${a.slug} » prévu ${a.moisPrevu} (passé) sans fichier : fantôme, renommé ou en retard ?`)
  }
}
for (const p of piliers) {
  if (!(p.slug in fichiers)) alertes.push(`Pilier « ${p.slug} » sans fichier d'article`)
}

// 5. Satellite rédigé mais publié dans un autre mois que moisPrevu (l'affichage suit
//    la date réelle, donc pas une erreur, juste un moisPrevu à réaligner).
for (const a of satellites) {
  const d = fichiers[a.slug]
  if (d && d.slice(0, 7) !== a.moisPrevu) {
    infos.push(`« ${a.slug} » : publié ${d.slice(0, 7)}, moisPrevu ${a.moisPrevu} (affichage OK, réaligner moisPrevu)`)
  }
}

const total = planSlugs.length
const enLigne = planSlugs.filter((s) => fichiers[s] && fichiers[s] <= new Date().toISOString().slice(0, 10)).length
console.log(`\nCalendrier éditorial : ${total} articles au plan (${piliers.length} piliers + ${satellites.length} satellites), ${enLigne} en ligne.`)
for (const i of infos) console.log(`  info   ${i}`)
for (const a of alertes) console.log(`  ALERTE ${a}`)
for (const e of erreurs) console.log(`  ERREUR ${e}`)
if (!infos.length && !alertes.length && !erreurs.length) console.log("  Tout est cohérent.")
console.log("")

process.exit(erreurs.length ? 1 : 0)

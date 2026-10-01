// Tableau « Face aux voisins » du rapport client, refait après le call du 02/09.
//
// L'ancien croisait des estimations nationales de DataForSEO (mots-clés en top 3,
// visiteurs Google par mois, domaines référents) avec les positions RÉELLES montrées
// juste au-dessus : le château y avait 2 mots-clés en top 3 quand le tableau des
// positions en montrait davantage, et 120 visiteurs par mois quand Umami en comptait
// bien plus. Patrick a lu ces chiffres comme faux, à raison.
//
// Celui-ci ne lit qu'une source, les pages de résultats déjà relevées pour les
// positions du château (même jour, même requête, aucun appel en plus), et une seule
// unité : « sur N recherches de clients ». Rien n'y passe par la couleur, le client
// imprime le rapport en noir et blanc. Module pur, testé sous `node --test`.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const domMatch = (d, t) => {
  if (!d) return false
  const a = d.replace(/^www\./i, "").toLowerCase()
  const b = t.replace(/^www\./i, "").toLowerCase()
  return a === b || a.endsWith("." + b)
}

/**
 * Meilleure position organique de chaque voisin dans une page de résultats
 * DataForSEO. `rank_absolute`, comme la position du château, pour que les deux
 * se comparent. Un voisin absent des 100 premiers résultats n'a pas de clé.
 */
export function positionsVoisins(items, voisins) {
  const out = {}
  for (const i of Array.isArray(items) ? items : []) {
    if (i?.type !== "organic" || i.rank_absolute == null) continue
    const v = voisins.find((c) => domMatch(i.domain, c.domain))
    if (v && (out[v.domain] == null || i.rank_absolute < out[v.domain])) out[v.domain] = i.rank_absolute
  }
  return out
}

// DataForSEO rend, pour une même requête à la même minute, tantôt ~100 résultats,
// tantôt 31 ou 42, tantôt zéro (mesuré le 28/09, facturé à chaque fois). On relève
// donc plusieurs fois et on garde la page la plus longue : les positions qu'elle
// contient sont justes, c'est l'absence dans une page tronquée qui ment.
export const PAGE_COMPLETE = 80 // résultats organiques, pour une demande de 100

export function pageLaPlusComplete(resultats) {
  let meilleure = { items: [], organiques: 0 }
  for (const r of Array.isArray(resultats) ? resultats : []) {
    const items = Array.isArray(r?.[0]?.items) ? r[0].items : []
    const organiques = items.filter((i) => i?.type === "organic").length
    if (organiques > meilleure.organiques) meilleure = { items, organiques }
  }
  return { ...meilleure, complete: meilleure.organiques >= PAGE_COMPLETE }
}

// Un instantané d'avant la refonte (août 2026) n'a pas de `voisins` : la section y
// est omise, l'ancien tableau d'estimations contredisait les positions relevées.
export const aDesVoisins = (serp) => Array.isArray(serp) && serp.some((s) => s && typeof s.voisins === "object")

// Les recherches de clients : ni le nom du château (il y est premier par définition)
// ni les requêtes d'articles, qui ne disent pas qui on choisit pour un séjour.
// Recherches de blog où l'on cherche un lieu à réserver : elles comptent comme
// recherches clients (décision d'Alexis du 01/10/2026). Les recherches purement
// touristiques (« visiter les châteaux de la loire », « que faire autour
// d'amboise ») restent dehors. Liste par mot-clé, pas par drapeau : les
// instantanés déjà figés en profitent au rejeu.
export const BLOG_COMMERCIALES = [
  "prix mariage château loire",
  "louer un château entre amis",
  "dormir dans un château de la loire",
  "week-end romantique val de loire",
]
export const rechercheClient = (s) => s.intent !== "Notoriété" && (!s.blog || BLOG_COMMERCIALES.includes(s.keyword))
// `releve: false` : DataForSEO a rendu une page vide, même après relance. Personne
// n'y est « absent », la recherche n'a simplement pas été vue ce mois-ci.
const releve = (s) => s.releve !== false

const rang = (p) => `${p}<sup>${p === 1 ? "er" : "e"}</sup>`

function bilan(recherches, positionDe) {
  let premierePage = 0, meilleure = null
  for (const s of recherches) {
    const p = positionDe(s)
    if (p == null) continue
    if (p <= 10) premierePage++
    if (!meilleure || p < meilleure.position) meilleure = { position: p, keyword: s.keyword }
  }
  return { premierePage, meilleure }
}

export function renderVoisins(serp, voisins, nomChateau) {
  const clients = (Array.isArray(serp) ? serp : []).filter(rechercheClient)
  const recherches = clients.filter(releve)
  if (!recherches.length) return ""
  const n = recherches.length
  const manquees = clients.length - n

  // Trois colonnes, le château d'abord : le tableau de septembre 2026, avec « 3
  // premiers » et « Devant vous », a été jugé flou par le client. Les voisins
  // absents partout tiennent en une ligne sous le tableau.
  const chateau = { label: nomChateau, vous: true, ...bilan(recherches, (s) => s.position) }
  const lesVoisins = voisins.map((v) => ({ label: v.label, ...bilan(recherches, (s) => s.voisins?.[v.domain] ?? null) }))
  const presents = lesVoisins.filter((l) => l.meilleure)
    .sort((a, b) => b.premierePage - a.premierePage || a.meilleure.position - b.meilleure.position)
  const absents = lesVoisins.filter((l) => !l.meilleure).map((l) => l.label)
  // Écartées du tableau, mais le client les voit 1re page juste au-dessus : sans les
  // nommer ici, « 0 en 1re page » se lisait comme une contradiction (septembre 2026).
  const horsTableau = (Array.isArray(serp) ? serp : [])
    .filter((s) => s.blog && !rechercheClient(s) && releve(s) && s.position != null && s.position <= 10)
    .sort((a, b) => a.position - b.position)

  const ligne = (l) => {
    const nom = l.vous ? `<strong>${esc(l.label)}</strong> <span class="badge">vous</span>` : esc(l.label)
    const mieux = l.meilleure
      ? `${rang(l.meilleure.position)} <span style="color:var(--gris);font-size:12px">${esc(l.meilleure.keyword)}</span>`
      : `<span style="color:var(--gris)">absent</span>`
    return `<tr><td>${nom}</td><td class="num">${l.premierePage}</td><td>${mieux}</td></tr>`
  }

  return `<h2>Face aux voisins</h2>
  <p class="lead">Sur les ${n} recherches de futurs clients que nous suivons pour vous (liste sous le tableau), combien placent chaque établissement en première page de Google, et sa meilleure place. Les recherches sur votre nom et les sujets purement touristiques du blog n'y entrent pas : elles ne disent pas chez qui l'on réserve${horsTableau.length
    ? `. Le château y sort pourtant en 1<sup>re</sup> page : ${horsTableau.map((s) => `«\u00a0${esc(s.keyword)}\u00a0» (${rang(s.position)})`).join(", ")}, en plus de son propre nom.`
    : "."}</p>
  <table class="voisins">
    <thead><tr><th>Établissement</th><th class="num">En 1<sup>re</sup> page</th><th>Meilleure place</th></tr></thead>
    <tbody>${[chateau, ...presents].map(ligne).join("")}</tbody>
  </table>
  ${absents.length ? `<p class="note">Absents des ${n} recherches : ${absents.map(esc).join(", ")}.</p>` : ""}
  <p class="note"><strong>Recherches comptées (${n})</strong> : ${recherches.map((s) => esc(s.keyword)).join(", ")}.${manquees ? ` <strong>Non relevées ce mois-ci</strong> : ${clients.filter((s) => !releve(s)).map((s) => esc(s.keyword)).join(", ")}, laissées de côté.` : ""} Même relevé Google que les positions ci-dessus.</p>`
}

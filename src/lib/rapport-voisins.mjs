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
const rechercheClient = (s) => s.intent !== "Notoriété" && !s.blog
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

// ── « Ce que les voisins captent et pas vous » ──────────────────────────────
// Écartés : le nom des voisins, et celui de leur commune quand l'établissement le
// porte. Personne ne se positionne sur le nom d'un concurrent, ces lignes ne sont
// pas des opportunités. La liste n'avait pas suivi l'arrivée des cinq voisins
// d'Amboise le 04/09 : le rapport de septembre montrait « le clos d'amboise »,
// « nazelles » ou « 37400 amboise » sous une note qui les disait écartés.
const GAP_STOPWORDS = [
  "pray", "perreux", "noizay", "huberdi",
  "clos d'amboise", "relais d'amboise", "pavillon des lys", "arpentis", "chateau de nazelles", "chateau-nazelles",
  // Établissements tiers et homonyme relevés en août 2026 (Nozay n'est pas Noizay) :
  // le nom d'un autre restaurant n'est pas une recherche à capter.
  "lion d'or", "calypso", "table du manoir", "avant garde", "nozay",
]
// Une commune seule (« amboise », « 37400 amboise », « amboise france ») cherche une
// ville, pas un lieu où dormir ou se marier.
const TOPONYMES = ["amboise", "nazelles", "nazelles-negron", "nazelles negron"]

// Un voisin sort sur quantité de recherches sans rapport avec le château : d'autres
// domaines du même nom, des communes lointaines, des établissements tiers. Une
// recherche doit toucher au territoire ou à une prestation du château pour valoir
// d'être montrée au client. Le mot « château » seul est volontairement absent :
// il laisserait passer « château de pezay » et tous les homonymes.
const MARCHE = [
  "amboise", "loire", "touraine", "tours", "indre-et-loire", "vouvray", "nazelles",
  "chenonceau", "chambord", "villandry", "chaumont", "montlouis", "blois",
  "mariage", "seminaire", "reception", "privatis", "chambre d'hote", "chambres d'hote",
  "hotel", "gite", "sejour", "week-end", "weekend", "yoga", "retraite", "piscine",
  "spa", "table d'hote", "bien-etre", "anniversaire",
]
const sansAccent = (x) => String(x).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u2019/g, "'").toLowerCase()

export function rechercheCaptable(keyword) {
  const kw = sansAccent(keyword).trim()
  if (GAP_STOPWORDS.some((w) => kw.includes(w))) return false
  const ville = kw.replace(/\b\d{5}\b/g, " ").replace(/\bfrance\b/g, " ").replace(/\s+/g, " ").trim()
  if (TOPONYMES.includes(ville)) return false
  return MARCHE.some((m) => kw.includes(m))
}

// Filtre rejoué au rendu, et une ligne par recherche : « hotel amboise » sortait
// deux fois, une par voisin. On garde le mieux placé.
export function filtrerCaptees(gap) {
  const parRecherche = new Map()
  let ecartees = 0
  for (const g of Array.isArray(gap) ? gap : []) {
    if (!rechercheCaptable(g.keyword)) { ecartees++; continue }
    const cle = sansAccent(g.keyword)
    const prec = parRecherche.get(cle)
    if (!prec || g.position < prec.position) parRecherche.set(cle, g)
  }
  const out = [...parRecherche.values()].sort((a, b) => b.volume - a.volume)
  // `ecartees` : hors sujet ou nom de voisin, ce que dit la note. Les doublons fusionnés n'y entrent pas.
  return { gap: out, retirees: (Array.isArray(gap) ? gap.length : 0) - out.length, ecartees }
}

const THEME_DE = {
  "Mariage": "mariage", "Séminaire": "séminaire", "Séjour / chambres d'hôtes": "séjour",
  "Retraite / bien-être": "retraite", "Famille / groupe": "famille", "Restauration": "table",
}
// Thèmes des recherches clients réellement relevées : le texte annonçait
// « séminaire » un mois où aucune recherche séminaire n'avait pu être relevée.
export function themesDesRecherches(serp) {
  const vus = []
  for (const s of (Array.isArray(serp) ? serp : []).filter(rechercheClient).filter(releve)) {
    const t = THEME_DE[s.intent] ?? sansAccent(s.intent)
    if (!vus.includes(t)) vus.push(t)
  }
  return vus.join(", ")
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

  const ligne = (l) => {
    const nom = l.vous ? `<strong>${esc(l.label)}</strong> <span class="badge">vous</span>` : esc(l.label)
    const mieux = l.meilleure
      ? `${rang(l.meilleure.position)} <span style="color:var(--gris);font-size:12px">${esc(l.meilleure.keyword)}</span>`
      : `<span style="color:var(--gris)">absent</span>`
    return `<tr><td>${nom}</td><td class="num">${l.premierePage}</td><td>${mieux}</td></tr>`
  }

  return `<h2>Face aux voisins</h2>
  <p class="lead">Sur les ${n} recherches de futurs clients que nous suivons pour vous (${esc(themesDesRecherches(serp))}), combien placent chaque établissement en première page de Google, et sa meilleure place.</p>
  <table class="voisins">
    <thead><tr><th>Établissement</th><th class="num">En 1<sup>re</sup> page</th><th>Meilleure place</th></tr></thead>
    <tbody>${[chateau, ...presents].map(ligne).join("")}</tbody>
  </table>
  ${absents.length ? `<p class="note">Absents des ${n} recherches : ${absents.map(esc).join(", ")}.</p>` : ""}
  <p class="note">Même relevé Google que les positions ci-dessus. Les recherches sur votre nom et celles des articles du blog ne sont pas comptées.${manquees ? ` ${manquees} recherche${manquees > 1 ? "s n'ont" : " n'a"} pas pu être relevée${manquees > 1 ? "s" : ""} ce mois-ci et ${manquees > 1 ? "sont laissées" : "est laissée"} de côté.` : ""}</p>`
}

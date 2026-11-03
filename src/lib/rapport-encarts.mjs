// Encarts ponctuels du rapport client, saisis à la main dans src/data/rapport-encarts.json,
// clé AAAA-MM : { concurrents: { titre, intro, chiffres: { titre, colonnes, lignes: [{ libelle,
// detail, valeurs, barres, meilleur }], note }, fiches: [{ nom, statut, resume, plus, moins,
// garder }], points: [{ titre, texte }] },
// satisfaction: { titre, texte, lien, libelle } }. Lus au rendu comme les travaux :
// un mois sans entrée reste identique au rejeu. Module sans import de JSON pour rester
// testable sous `node --test`.

// Espaces insécables de la typographie française : un « ou un ? ne finit jamais seul
// en début ou en bout de ligne.
export const insecables = (s) => s.replace(/« /g, "«&nbsp;").replace(/ ([»?!;])/g, "&nbsp;$1")
const esc = (s) => insecables(String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"))

// Chiffres : espace fine insécable entre les milliers, comme dans le reste du rapport.
const nombre = (v) => typeof v === "number" ? v.toLocaleString("fr-FR").replace(/[\u00a0\u202f\s]/g, "\u202f") : String(v ?? "")

// Barre en SVG, à l'échelle du maximum de sa ligne : elle s'imprime (un fond CSS ne
// s'imprime pas) et c'est sa longueur, pas sa couleur, qui porte le sens.
function barre(v, max, vous) {
  const w = max > 0 ? Math.max(Math.round((v / max) * 1000) / 10, 0.5) : 0.5
  return `<svg class="barre-voisin" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="0" width="100" height="8" fill="#f1ede3"/><rect x="0" y="0" width="${w}" height="8" class="${vous ? "barre-vous" : "barre-eux"}"/></svg>`
}

// Tableau « les maisons en chiffres » : une ligne par indicateur, la dernière colonne
// est le château. `barres` ajoute une barre sous chaque nombre, `meilleur` met en gras
// la valeur d'une colonne (lisible en noir et blanc, sans couleur).
function renderChiffres(c) {
  const colonnes = c?.colonnes || []
  const lignes = (c?.lignes || []).filter((l) => Array.isArray(l?.valeurs))
  if (!colonnes.length || !lignes.length) return ""
  const derniere = colonnes.length - 1
  const corps = lignes.map((l) => {
    const nums = l.valeurs.filter((v) => typeof v === "number")
    const max = nums.length ? Math.max(...nums) : 0
    const cellules = l.valeurs.map((v, i) => {
      const texte = esc(nombre(v))
      const fort = l.meilleur === i ? `<strong>${texte}</strong>` : texte
      return `<td class="num">${fort}${l.barres && typeof v === "number" ? barre(v, max, i === derniere) : ""}</td>`
    }).join("")
    return `<tr><td>${esc(l.libelle)}${l.detail ? `<span class="detail-voisin">${esc(l.detail)}</span>` : ""}</td>${cellules}</tr>`
  }).join("")
  return `${c.titre ? `<h4 class="titre-voisins">${esc(c.titre)}</h4>` : ""}
    <table class="chiffres-voisins">
      <thead><tr><th></th>${colonnes.map((n) => `<th class="num">${esc(n)}</th>`).join("")}</tr></thead>
      <tbody>${corps}</tbody>
    </table>
    ${c.note ? `<p class="note">${esc(c.note)}</p>` : ""}`
}

const liste = (items, classe) => (items || []).filter(Boolean).length
  ? `<ul class="${classe}">${items.filter(Boolean).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""

// Une fiche par voisin : ce qui marche pour lui (+), ce qui lui manque (−), et ce que
// nous en reprenons pour le château.
function renderFiche(f) {
  if (!f?.nom) return ""
  return `<div class="fiche-voisin">
      <h4>${esc(f.nom)}</h4>
      ${f.statut ? `<p class="statut-voisin">${esc(f.statut)}</p>` : ""}
      ${f.resume ? `<p>${esc(f.resume)}</p>` : ""}
      <div class="plus-moins">
        <div><p class="pm-titre">Ce qui marche pour lui</p>${liste(f.plus, "plus")}</div>
        <div><p class="pm-titre">Ce qui lui manque</p>${liste(f.moins, "moins")}</div>
      </div>
      ${(f.garder || []).length ? `<div class="garder"><p class="pm-titre">Ce que nous en gardons</p>${liste(f.garder, "garder-liste")}</div>` : ""}
    </div>`
}

// Encart sous « Face aux voisins » : l'analyse d'un ou deux concurrents regardés de
// près ce mois-là. Chiffres comparés, une fiche par voisin, puis quelques paragraphes
// à l'intitulé en gras.
export function renderEncartConcurrents(e) {
  const points = (e?.points || [])
    .map((p) => ({ titre: String(p?.titre ?? "").trim(), texte: String(p?.texte ?? "").trim() }))
    .filter((p) => p.texte)
  const chiffres = renderChiffres(e?.chiffres)
  const fiches = (e?.fiches || []).map(renderFiche).join("")
  if (!points.length && !chiffres && !fiches) return ""
  return `<section class="encart${chiffres || fiches ? " encart-voisins" : ""}">
    <h3 class="sub-h">${esc(e.titre)}</h3>
    ${e.intro ? `<p class="encart-intro">${esc(e.intro)}</p>` : ""}
    ${chiffres}
    ${fiches}
    ${points.map((p) => `<p>${p.titre ? `<strong>${esc(p.titre)}.</strong> ` : ""}${esc(p.texte)}</p>`).join("")}
  </section>`
}

// Renvoi vers une page jointe au rapport, derrière le même mot de passe. Seul un
// chemin /rapport est accepté : le JSON ne doit pas pouvoir pousser un lien externe.
export function renderLienSatisfaction(e) {
  const lien = String(e?.lien ?? "")
  if (!/^\/rapport\?doc=[a-z-]+$/.test(lien) || !e?.texte) return ""
  return `<section class="encart">
    <h3 class="sub-h">${esc(e.titre)}</h3>
    <p>${esc(e.texte)}</p>
    <p class="encart-lien"><a href="${esc(lien)}">${esc(e.libelle || "Lire la page")} &rarr;</a></p>
  </section>`
}

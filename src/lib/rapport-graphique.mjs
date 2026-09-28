// Graphique de notoriété du rapport client, en SVG rendu côté serveur.
//
// Il remplace Chart.js (28/09) : le client imprime le rapport en noir et blanc, et
// un canvas s'y imprime mal (vide ou flou selon le navigateur, redimensionné au
// moment de l'impression), tandis que le doré et le bordeaux y deviennent deux gris
// voisins. Ici l'état d'un mois se lit à son MOTIF, pas à sa couleur : plein pour
// la mesure Search Console, hachuré pour l'estimation Google, contour pointillé
// pour le mois en cours. Chaque barre porte sa valeur, lisible sur papier.
// Aucun script : le graphique s'affiche aussi là où le JavaScript ne tourne pas.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const fr = (n) => Number(n || 0).toLocaleString("fr-FR").replace(/ /g, " ") // Montserrat ne dessine pas U+202F

const W = 720, H = 290
const M = { haut: 26, droite: 8, bas: 30, gauche: 46 }

const etat = (p) => (!p.complet ? "encours" : p.mesure === false ? "estime" : "mesure")
const LEGENDE = {
  mesure: "Mesure Search Console",
  estime: "Estimation Google",
  encours: "Mois pas encore annoncé",
}
const TITRE = { mesure: "mesurée", estime: "estimée", encours: "mois pas encore annoncé" }

// Graduation « ronde » (1, 2, 2,5 ou 5 × 10^k) donnant 4 à 5 lignes : sans le pas de
// 2,5, un maximum de 910 montait l'axe à 1 500 et tassait les barres en bas.
function graduation(max) {
  if (max <= 0) return { pas: 1, haut: 1 }
  const brut = max / 4
  const p10 = 10 ** Math.floor(Math.log10(brut))
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * p10).find((s) => s >= brut)
  return { pas, haut: Math.ceil((max * 1.1) / pas) * pas }
}

const STYLE = `<style>
  .graph{margin:0}
  /* Sur téléphone le graphique défile : il s'ouvre sur les mois récents (à droite),
     les seuls qui comptent, grâce au sens de lecture inversé du conteneur. */
  .graph-scroll{overflow-x:auto;direction:rtl}
  .graph-scroll svg{direction:ltr}
  .graph svg{display:block;width:100%;min-width:560px;height:auto;font-family:Montserrat,system-ui,sans-serif}
  .graph .g{stroke:#e6e1d6;stroke-width:1}
  .graph .t{fill:#646464;font-size:11px}
  .graph .m{fill:#646464;font-size:11px}
  .graph .v{fill:#212121;font-size:12px;font-weight:600}
  .graph .b.mesure{fill:#8B0000}
  .graph .b.estime{fill:url(#hachures-notoriete);stroke:#B08D57;stroke-width:1.2}
  .graph .b.encours{fill:#fff;stroke:#8B0000;stroke-width:1.4;stroke-dasharray:4 3}
  .graph .h{stroke:#B08D57;stroke-width:2}
  .graph .leg{display:flex;flex-wrap:wrap;gap:6px 20px;margin:10px 2px 0;font-size:12px;color:#646464}
  .graph .leg span{display:inline-flex;align-items:center;gap:7px}
  .graph .leg svg{width:14px;min-width:0;height:14px;display:inline}
  @media print{
    .graph .b.mesure{fill:#222}
    .graph .b.estime{stroke:#222}
    .graph .h{stroke:#222;stroke-width:1.6}
    .graph .b.encours{stroke:#222}
    .graph .t,.graph .m,.graph .leg{color:#000;fill:#000}
    .graph .v{fill:#000}
    .graph svg{min-width:0}
  }
</style>`

export function renderBrandChart(points) {
  const pts = (Array.isArray(points) ? points : []).filter((p) => p && Number.isFinite(Number(p.volume)))
  if (!pts.length) return ""

  const { pas, haut } = graduation(Math.max(...pts.map((p) => Number(p.volume))))
  const lw = W - M.gauche - M.droite, lh = H - M.haut - M.bas
  const y = (v) => M.haut + lh - (v / haut) * lh
  const col = lw / pts.length
  const bw = Math.min(40, col * 0.62)
  const r1 = (n) => Math.round(n * 10) / 10

  const grille = []
  for (let v = 0; v <= haut; v += pas) {
    grille.push(`<line class="g" x1="${M.gauche}" x2="${W - M.droite}" y1="${r1(y(v))}" y2="${r1(y(v))}"/><text class="t" x="${M.gauche - 8}" y="${r1(y(v) + 4)}" text-anchor="end">${fr(v)}</text>`)
  }

  const barres = pts.map((p, i) => {
    const e = etat(p), v = Number(p.volume)
    const cx = M.gauche + col * i + col / 2
    const top = y(v), hauteur = Math.max(1, M.haut + lh - top)
    return `<g><title>${esc(p.label)} : ${fr(v)} recherche${v > 1 ? "s" : ""}, ${TITRE[e]}</title><rect class="b ${e}" x="${r1(cx - bw / 2)}" y="${r1(top)}" width="${r1(bw)}" height="${r1(hauteur)}"/><text class="v" x="${r1(cx)}" y="${r1(top - 6)}" text-anchor="middle">${fr(v)}</text><text class="m" x="${r1(cx)}" y="${H - 10}" text-anchor="middle">${esc(p.label)}</text></g>`
  }).join("")

  // Motif des hachures : défini une fois, réutilisé par les barres et la légende.
  const defs = `<defs><pattern id="hachures-notoriete" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><line class="h" x1="0" y1="0" x2="0" y2="6"/></pattern></defs>`

  const presents = ["mesure", "estime", "encours"].filter((e) => pts.some((p) => etat(p) === e))
  const legende = presents.map((e) => `<span><svg viewBox="0 0 14 14" aria-hidden="true"><rect class="s b ${e}" x="1" y="1" width="12" height="12"/></svg>${LEGENDE[e]}</span>`).join("")

  return `${STYLE}<figure class="graph">
  <div class="graph-scroll"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Recherches sur le nom du château, mois par mois">${defs}${grille.join("")}${barres}</svg></div>
  <figcaption class="leg">${legende}</figcaption>
</figure>`
}

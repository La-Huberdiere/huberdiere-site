// Encarts ponctuels du rapport client, saisis à la main dans src/data/rapport-encarts.json,
// clé AAAA-MM : { concurrents: { titre, intro, points: [{ titre, texte }] },
// satisfaction: { titre, texte, lien, libelle } }. Lus au rendu comme les travaux :
// un mois sans entrée reste identique au rejeu. Module sans import de JSON pour rester
// testable sous `node --test`.

// Espaces insécables de la typographie française : un « ou un ? ne finit jamais seul
// en début ou en bout de ligne.
export const insecables = (s) => s.replace(/« /g, "«&nbsp;").replace(/ ([»?!;])/g, "&nbsp;$1")
const esc = (s) => insecables(String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"))

// Encart rapide sous « Face aux voisins » : l'analyse SEO d'un ou deux concurrents
// regardés de près ce mois-là, en quelques paragraphes à l'intitulé en gras.
export function renderEncartConcurrents(e) {
  const points = (e?.points || [])
    .map((p) => ({ titre: String(p?.titre ?? "").trim(), texte: String(p?.texte ?? "").trim() }))
    .filter((p) => p.texte)
  if (!points.length) return ""
  return `<section class="encart">
    <h3 class="sub-h">${esc(e.titre)}</h3>
    ${e.intro ? `<p class="encart-intro">${esc(e.intro)}</p>` : ""}
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

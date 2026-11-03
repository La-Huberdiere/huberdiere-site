// Section finale « Pour le mois prochain » du rapport client : ce qu'Alexis fera,
// ce qu'il propose à Patrick et Lodovica (demande du call du 05/10, pour que chacun
// réagisse dès réception). Saisie à la main dans src/data/rapport-propositions.json,
// clé AAAA-MM, valeur { alexis: [paragraphes], client: [paragraphes] }, chaîne seule
// acceptée. Module sans import de JSON pour rester testable sous `node --test`.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

// Un élément est une phrase, ou { titre, texte } depuis octobre 2026 : l'intitulé
// en gras se lit en diagonale, le texte tient en une phrase ou deux.
const elements = (v) => (Array.isArray(v) ? v : v == null ? [] : [v])
  .map((t) => (t && typeof t === "object"
    ? { titre: String(t.titre ?? "").trim(), texte: String(t.texte ?? "").trim(), lien: t.lien }
    : { titre: "", texte: String(t ?? "").trim() }))
  .filter((e) => e.titre || e.texte)

// Lien optionnel { ancre, url } : la première occurrence de l'ancre dans le texte
// devient un lien, en https seulement ; ancre introuvable, texte rendu brut.
const texteLie = (e) => {
  const texte = esc(e.texte)
  const ancre = esc(String(e.lien?.ancre ?? ""))
  const url = String(e.lien?.url ?? "")
  if (!ancre || !/^https:\/\//.test(url) || !texte.includes(ancre)) return texte
  return texte.replace(ancre, () => `<a href="${esc(url)}">${ancre}</a>`)
}

const contenu = (e) => (e.titre ? `<strong>${esc(e.titre)}.</strong> ${texteLie(e)}` : texteLie(e)).trim()

// Le préflight des 25 et 28 alerte tant que l'un des deux côtés est vide.
export function propositionsManquantes(entree) {
  return !elements(entree?.alexis).length || !elements(entree?.client).length
}

// Rien pour le mois : section omise, les rapports passés restent identiques au rejeu.
// Deux colonnes à l'écran, l'une sous l'autre sur téléphone et à l'impression.
export function renderPropositions(entree) {
  const blocs = [
    ["Ce que je fais", elements(entree?.alexis)],
    ["Ce que je vous propose", elements(entree?.client)],
  ].filter(([, e]) => e.length)
  if (!blocs.length) return ""
  return `<h2>Pour le mois prochain</h2>
  <p class="lead">Ce que je prévois de mener, et ce que je vous propose de faire de votre côté. Dites-moi ce qui vous convient dès réception.</p>
  <div class="propositions-grille">${blocs.map(([titre, e]) => `<section class="propositions">
    <h3 class="sub-h">${titre}</h3>
    <ol>${e.map((x) => `<li>${contenu(x)}</li>`).join("")}</ol>
  </section>`).join("")}</div>`
}

// Section finale « Pour le mois prochain » du rapport client : ce qu'Alexis fera,
// ce qu'il propose à Patrick et Lodovica (demande du call du 05/10, pour que chacun
// réagisse dès réception). Saisie à la main dans src/data/rapport-propositions.json,
// clé AAAA-MM, valeur { alexis: [paragraphes], client: [paragraphes] }, chaîne seule
// acceptée. Module sans import de JSON pour rester testable sous `node --test`.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const paragraphes = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]).map((t) => String(t ?? "").trim()).filter(Boolean)

// Le préflight des 25 et 28 alerte tant que l'un des deux côtés est vide.
export function propositionsManquantes(entree) {
  return !paragraphes(entree?.alexis).length || !paragraphes(entree?.client).length
}

// Rien pour le mois : section omise, les rapports passés restent identiques au rejeu.
export function renderPropositions(entree) {
  const blocs = [
    ["Ce que je fais", paragraphes(entree?.alexis)],
    ["Ce que je vous propose", paragraphes(entree?.client)],
  ].filter(([, p]) => p.length)
  if (!blocs.length) return ""
  return `<h2>Pour le mois prochain</h2>
  <p class="lead">Ce que je prévois de mener, et ce que je vous propose de faire de votre côté. Dites-moi ce qui vous convient dès réception.</p>
  ${blocs.map(([titre, p]) => `<h3 class="sub-h">${titre}</h3>
  <div class="card propositions">${p.map((t) => `<p>${esc(t)}</p>`).join("")}</div>`).join("\n  ")}`
}

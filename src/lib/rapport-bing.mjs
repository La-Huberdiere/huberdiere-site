// Bloc « Sur Bing » de la Fréquentation : affichages, clics et recherches du mois
// lus dans Bing Webmaster Tools (l'équivalent de la Search Console pour Bing, qui
// alimente aussi Yahoo, DuckDuckGo et une partie d'Ecosia). Ajouté en novembre
// 2026 : jusque-là, le rapport ne suivait que Google. Module pur, testé.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const fr = (n) => Number(n || 0).toLocaleString("fr-FR").replace(/ /g, " ") // Montserrat ne dessine pas U+202F

// Bing date ses lignes en « /Date(1730000000000) » (ms UTC), parfois suivies d'un fuseau.
const moisDe = (d) => {
  const ms = Number(String(d || "").match(/-?\d+/)?.[0])
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 7) : ""
}

const moisPrecedent = (ym) => {
  const [y, m] = ym.split("-").map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`
}

// `trafic` : GetRankAndTrafficStats (une ligne par jour). `requetes` : GetQueryStats
// (une ligne par recherche et par semaine). Renvoie null sans aucune donnée du mois.
export function bilanBing(trafic, requetes, ym) {
  const somme = (mois) => {
    const t = { impressions: 0, clics: 0 }
    for (const r of Array.isArray(trafic) ? trafic : []) {
      if (moisDe(r?.Date) !== mois) continue
      t.impressions += Number(r.Impressions) || 0
      t.clics += Number(r.Clicks) || 0
    }
    return t
  }
  const courant = somme(ym)
  const parRequete = new Map()
  for (const r of Array.isArray(requetes) ? requetes : []) {
    if (moisDe(r?.Date) !== ym || !r.Query) continue
    const q = parRequete.get(r.Query) || { requete: r.Query, impressions: 0, clics: 0, poids: 0, somme: 0 }
    const imp = Number(r.Impressions) || 0
    q.impressions += imp
    q.clics += Number(r.Clicks) || 0
    // -1 : Bing n'a pas de position pour cette ligne.
    if (Number(r.AvgImpressionPosition) > 0) { q.somme += r.AvgImpressionPosition * imp; q.poids += imp }
    parRequete.set(r.Query, q)
  }
  if (!courant.impressions && !parRequete.size) return null
  const top = [...parRequete.values()]
    .sort((a, b) => b.impressions - a.impressions || b.clics - a.clics)
    .slice(0, 8)
    .map(({ requete, impressions, clics, poids, somme }) => ({ requete, impressions, clics, position: poids ? Math.round(somme / poids) : null }))
  return { ym, ...courant, precedent: somme(moisPrecedent(ym)), requetes: top }
}

export function renderBing(b, monthLabel) {
  if (!b) return ""
  const delta = (n, avant) => {
    if (!avant) return ""
    const d = n - avant
    return d > 0 ? ` <span class="up">▲ +${fr(d)}</span>` : d < 0 ? ` <span class="down">▼ ${fr(d)}</span>` : ` <span class="flat">=</span>`
  }
  const p = b.precedent || {}
  const lignes = (b.requetes || []).map((r) => `<tr><td>${esc(r.requete)}<span class="sur-mobile">${fr(r.clics)} clic${r.clics > 1 ? "s" : ""}</span></td><td class="num">${fr(r.impressions)}</td><td class="num hors-mobile">${fr(r.clics)}</td><td class="num">${r.position ? r.position + "e" : "–"}</td></tr>`).join("")
  return `<h3 class="sub-h">Sur Bing</h3>
  <p class="lead">Bing alimente aussi Yahoo, DuckDuckGo et une partie d'Ecosia. En ${esc(monthLabel)}, le site y a été affiché <strong>${fr(b.impressions)}</strong> fois${delta(b.impressions, p.impressions)} et cliqué <strong>${fr(b.clics)}</strong> fois${delta(b.clics, p.clics)}${p.impressions ? " par rapport au mois précédent" : ""}.</p>
  ${lignes ? `<table><thead><tr><th>Recherche sur Bing</th><th class="num">Affichages</th><th class="num hors-mobile">Clics</th><th class="num">Position</th></tr></thead><tbody>${lignes}</tbody></table>` : ""}`
}

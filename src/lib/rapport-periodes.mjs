// Calendrier du rapport client. Module pur, testé sous `node --test`.

const JOUR = 86400000
const iso = (ms) => new Date(ms).toISOString().slice(0, 10)

// Brevo refuse toute plage d'événements dont les bornes sont à 90 jours ou plus
// (« Maximum difference between startDate and endDate […] can not be greater than
// 90 »). Depuis le 30/08, l'historique des confirmations, ouvert au 1er juin,
// dépassait la limite : la lecture échouait et le rapport retombait en silence
// sur la date de création du contact. On découpe en fenêtres de 89 jours d'écart,
// bout à bout, sans trou ni recouvrement.
export function fenetresDeJours(debut, fin, ecartMax = 89) {
  const out = []
  const finMs = Date.parse(fin)
  for (let d = Date.parse(debut); d <= finMs; d += (ecartMax + 1) * JOUR) {
    out.push([iso(d), iso(Math.min(d + ecartMax * JOUR, finMs))])
  }
  return out
}

// Mois AAAA-MM décalé de `n` mois (négatif pour reculer).
export function moisDecales(ym, n) {
  const [y, m] = String(ym).split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

// Point de comparaison de la notoriété : le même mois un an plus tôt, sinon le
// plus ancien point de la série s'il remonte à 10 mois au moins, titré par son
// vrai écart. Le rapport de septembre 2026 opposait août 2026 à septembre 2025
// sous « Il y a un an ».
export function pointDeComparaison(serie, confirme) {
  if (!confirme?.ym || !Array.isArray(serie)) return null
  const cible = moisDecales(confirme.ym, -12)
  const exact = serie.find((p) => p.ym === cible)
  if (exact) return { point: exact, titre: "Il y a un an" }
  const plusAncien = serie.filter((p) => p.ym && p.ym < confirme.ym).sort((a, b) => a.ym.localeCompare(b.ym))[0]
  if (!plusAncien) return null
  const [y1, m1] = plusAncien.ym.split("-").map(Number)
  const [y2, m2] = confirme.ym.split("-").map(Number)
  const ecart = (y2 - y1) * 12 + (m2 - m1)
  return ecart >= 10 ? { point: plusAncien, titre: `${ecart} mois plus tôt` } : null
}

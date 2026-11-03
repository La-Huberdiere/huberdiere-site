// Moteurs de recherche reconnus dans un référent ou un utm_source. Partagé par
// « Demandes reçues » et « Fréquentation » : jusqu'en novembre 2026, le rapport
// rangeait Bing, Ecosia ou Qwant sous « Recherche Google ». Module pur, testé.

// Domaines d'un moteur qui ne sont pas une recherche : IA de Google ou de
// Microsoft, appli Gmail Android, webmail.
const PAS_UNE_RECHERCHE = /gemini|copilot|bard|android\.gm|mail\.google/

const MOTEURS = [
  ["Google", /(^|[./])google(\.|$)|googlequicksearchbox/],
  ["Bing", /(^|[./])bing(\.|$)/],
  ["Ecosia", /ecosia/],
  ["DuckDuckGo", /duckduckgo/],
  ["Qwant", /qwant/],
  ["Brave", /search\.brave|^brave$/],
  ["Yahoo", /yahoo/],
  ["Yandex", /yandex/],
  ["Startpage", /startpage/],
  ["Lilo", /(^|\.)lilo\.org/],
]

export function moteurDe(src) {
  const r = String(src || "").toLowerCase().trim()
  if (!r || PAS_UNE_RECHERCHE.test(r)) return null
  for (const [nom, re] of MOTEURS) if (re.test(r)) return nom
  return null
}

// Lignes Umami `metrics?type=referrer` ({x: domaine, y: visites}) → visites par
// moteur, la plus forte en tête. Les autres référents sont ignorés.
export function visitesParMoteur(rows) {
  const total = new Map()
  for (const r of Array.isArray(rows) ? rows : []) {
    const m = moteurDe(r?.x)
    if (m) total.set(m, (total.get(m) || 0) + (Number(r.y) || 0))
  }
  return [...total.entries()].map(([moteur, visites]) => ({ moteur, visites })).sort((a, b) => b.visites - a.visites)
}

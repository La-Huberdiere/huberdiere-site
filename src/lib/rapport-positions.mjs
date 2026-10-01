// Positions du château dans le rapport client. Module pur, testé sous `node --test`.

// DataForSEO rend souvent une page tronquée (20, 31, 42 résultats sur 100) sous un
// statut « Ok ». Le château lu sur une telle page est bien à sa place ; absent, on
// ne sait rien : il est peut-être 45e. Le 01/10, « location château mariage
// touraine » sortait 42e sur une page de 50, absente sur deux pages vides.
export const absenceProuvee = (page) => !!page?.complete

// Les recherches où le château n'apparaît pas, séparées en deux : celles qui ne
// l'ont jamais placé, et celles qui le plaçaient au rapport précédent. Les mettre
// toutes sous « ne placent pas encore » faisait passer une perte, ou un relevé
// raté, pour un statu quo.
export function repartirAbsents(absents, prevPos, hasPrev) {
  const jamais = [], perdues = []
  for (const s of absents) {
    const avant = hasPrev ? prevPos?.[s.keyword] : null
    if (avant != null) perdues.push({ keyword: s.keyword, avant })
    else jamais.push(s)
  }
  return { jamais, perdues }
}

// Sites cités par un aperçu IA, une fois chacun : avec ou sans « www. », c'est le
// même site (août 2026 : « amboise-valdeloire.com » listé deux fois).
export function domainesCites(refs) {
  const vus = new Set(), out = []
  for (const r of Array.isArray(refs) ? refs : []) {
    const d = String(r?.domain || "").trim()
    const cle = d.replace(/^www\./i, "").toLowerCase()
    if (!cle || vus.has(cle)) continue
    vus.add(cle)
    out.push(d)
  }
  return out
}

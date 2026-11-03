// Positions du château dans le rapport client. Module pur, testé sous `node --test`.

// DataForSEO rend souvent une page tronquée (20, 31, 42 résultats sur 100) sous un
// statut « Ok ». Le château lu sur une telle page est bien à sa place ; absent, on
// ne sait rien : il est peut-être 45e. Le 01/10, « location château mariage
// touraine » sortait 42e sur une page de 50, absente sur deux pages vides.
export const absenceProuvee = (page) => !!page?.complete

// Le panneau d'information (knowledge_graph) occupe la colonne de droite sur
// ordinateur : il ne prend la place de personne. Le compter faisait passer le
// château 2e sur son propre nom en octobre 2026, derrière son propre panneau.
// Les rangs suivants remontent d'autant ; l'aperçu IA, lui, garde sa place.
export function sansPanneau(items) {
  const liste = Array.isArray(items) ? items : []
  const panneaux = liste.filter((i) => i?.type === "knowledge_graph" && i.rank_absolute != null).map((i) => i.rank_absolute)
  if (!panneaux.length) return liste
  return liste.filter((i) => i?.type !== "knowledge_graph").map((i) => i.rank_absolute == null ? i
    : { ...i, rank_absolute: i.rank_absolute - panneaux.filter((r) => r < i.rank_absolute).length })
}

// Les recherches où le château n'apparaît pas, séparées en deux : celles qui ne
// l'ont jamais placé, et celles qui le plaçaient au rapport précédent. Les mettre
// toutes sous « ne placent pas encore » faisait passer une perte, ou un relevé
// raté, pour un statu quo.
//
// Une perdue que la Search Console du mois voit encore dans les deux premières pages
// porte sa place moyenne (`gsc`) : le relevé est national, la Search Console voit
// les vrais internautes, surtout locaux. Octobre 2026 : « séminaire château
// touraine » sortie du relevé, 3,4e en moyenne sur 20 affichages.
export const GSC_SORTIE_MIN_IMPRESSIONS = 5

export function repartirAbsents(absents, prevPos, hasPrev, gsc = {}) {
  const jamais = [], perdues = []
  for (const s of absents) {
    const avant = hasPrev ? prevPos?.[s.keyword] : null
    if (avant == null) { jamais.push(s); continue }
    const g = gsc?.[s.keyword]
    const base = s.leader ? { keyword: s.keyword, avant, leader: s.leader } : { keyword: s.keyword, avant }
    perdues.push(g && g.position <= 20 && g.impressions >= GSC_SORTIE_MIN_IMPRESSIONS ? { ...base, gsc: g } : base)
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

// KPI de positions sur la base FIXE des recherches suivies. Septembre 2026 affichait
// « 7 / 17 » après « 8 / 19 » en août : les 2 recherches non relevées sortaient du
// dénominateur et le client a cru que la base changeait. La base reste toujours la
// liste complète, et les recherches non relevées se disent dans la note.
export function kpiBaseFixe(serp, compte, note) {
  const liste = Array.isArray(serp) ? serp : []
  const nonReleves = liste.filter((s) => s.releve === false).length
  return {
    valeur: liste.filter((s) => s.releve !== false && compte(s)).length,
    base: liste.length,
    note: nonReleves ? `${note} · ${nonReleves} non relevée${nonReleves > 1 ? "s" : ""} ce mois-ci` : note,
  }
}

// Définition de la notoriété du rapport client : quelles recherches veulent dire
// « je cherche le château ». Une seule règle pour les deux sources de la courbe,
// l'estimation Google Ads (avant juillet 2026) et la Search Console (depuis).
// Module pur, testé sous `node --test`.
//
// « huberdi » seul ne suffit pas : il existe une chèvrerie-ferme auberge et un gîte
// de la Huberdière dans la Manche, une Huberdière à Fondettes, une salle à
// Corps-Nuds. Google Ads les estime à plus de 1 000 recherches par mois. « La
// huberdière » ou « huberdiere » seuls sont ambigus : le château y sort 2e à 4e,
// une partie seulement de ces gens le cherchent. Décision du 01/10/2026 : on ne
// compte que les recherches qui nomment le château, ou la Huberdière avec sa commune.
export const GSC_BRAND_REGEX = "ch[aâ]teau.*huberdi|huberdi.*(nazelles|amboise)"

const RE = new RegExp(GSC_BRAND_REGEX, "i")
export const estRechercheChateau = (q) => RE.test(String(q || ""))

// Les formulations vues en Search Console, côté estimation. Google Ads garde
// accentuée et non accentuée comme deux entrées distinctes (390 et 70 en août
// 2026) : on les additionne. Une formulation sans volume connu rend 0.
export const BRAND_KEYWORDS = [
  "château de la huberdière",
  "chateau de la huberdiere",
  "chateau huberdiere",
  "chateau de huberdiere",
  "château de la huberdière photos",
  "la huberdière nazelles",
  "chateau de la huberdiere nazelles",
  "chateau huberdiere nazelles",
  "huberdière amboise",
]

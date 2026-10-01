// Définition de la notoriété du rapport client. Module pur, testé sous `node --test`.
//
// Mesure (Search Console, depuis juillet 2026) : toute recherche contenant
// « huberdi », ce qui attrape « huberdière » comme « huberdiere ». Décision
// d'Alexis du 01/10/2026 : on garde tout, « la huberdière » seule et les quelques
// homonymes compris (ferme, domaine, salle de la Huberdière : 15 impressions sur
// 928 en août). Ils pèsent peu ici parce que la Search Console ne compte une
// recherche que si le site du château s'y affiche.
export const GSC_BRAND_REGEX = "huberdi"

// Estimation (Google Ads, avant juillet 2026) : les formulations qui nomment le
// château, vues en Search Console. Pas « la huberdière » seule : Google Ads
// l'estime à ~800 recherches/mois, surtout pour la chèvrerie-ferme auberge et le
// gîte de la Huberdière dans la Manche, qui n'ont rien à voir avec le château.
// Accentuée et non accentuée sont deux entrées distinctes chez Google Ads (390 et
// 70 en août 2026) : on les additionne.
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

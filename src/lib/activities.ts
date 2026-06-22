// Carte des pages activité : données (par langue) + image de hero.
// Alimente les routes /[activity], /en/[activity], /it/[activity].
import seminaire from "../data/seminaire.json";
import famille from "../data/famille.json";
import retraite from "../data/retraite.json";
import sejour from "../data/sejour.json";
import restauration from "../data/restauration.json";

import imgSeminaire from "../assets/SD_8.jpg";
import imgFamille from "../assets/SD_7.jpg";
import imgRetraite from "../assets/SD_10.jpg";
import imgSejour from "../assets/SD_23.jpg";
import imgRestauration from "../assets/BD_1.jpg";

export const activities: Record<string, { data: any; hero: any }> = {
  seminaire: { data: seminaire, hero: imgSeminaire },
  famille: { data: famille, hero: imgFamille },
  retraite: { data: retraite, hero: imgRetraite },
  sejour: { data: sejour, hero: imgSejour },
  restauration: { data: restauration, hero: imgRestauration },
};

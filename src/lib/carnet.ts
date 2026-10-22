// Le carnet de Lodovica : contenu FR de la page /carnet.
//
// Démo du kit « faire circuler la satisfaction » (22/10/2026). Le carnet est une
// EXTRACTION du livret d'accueil en chambre : seul ce que liste
// satisfaction/livret-source-fr.md a le droit d'y figurer. Rien du privé (Wi-Fi,
// WhatsApp, piscine, règles, horaires), aucun tarif du château.
//
// Le contenu vit ici et non dans src/data/*.json : un champ absent du schéma
// Keystatic casse l'éditeur du singleton, et la page n'a pas à être éditable.
// La structure est prête pour l'EN et l'IT : `CARNET` est indexé par langue.

export type Lang = "fr" | "en" | "it";

export interface Adresse {
  nom: string;
  note: string;
  ville?: string;
  site?: string; // domaine ou chemin, sans protocole
  tel?: string; // format affiché, ex. « +33 2 47 57 23 67 »
}

export interface GroupeAdresses {
  titre: string;
  adresses: Adresse[];
}

export interface Activite {
  nom: string;
  texte: string;
  prestataire?: string;
}

export interface Carnet {
  titre: string;
  sousTitre: string;
  mot: string[];
  signature: string;
  offrir: string;
  imprimer: string;
  lienCopie: string;
  partageTitre: string;
  partageTexte: string;
  tables: { titre: string; intro: string; groupes: GroupeAdresses[] };
  activites: { titre: string; intro: string; liste: Activite[] };
  aCompleter: {
    etiquette: string;
    saisons: string;
    producteurs: string;
    pluie: string;
    coordonnees: string;
  };
  pied: string;
}

const FR: Carnet = {
  titre: "Le carnet de Lodovica",
  sousTitre: "Nos adresses autour d'Amboise, celles que nous donnons à nos hôtes.",
  mot: [
    "Nous avons toujours aimé recevoir : les grands dîners, les fêtes, un tour de voilier pour les amis. De nos voyages est née une promesse, devenir un jour les meilleurs des hôtes.",
    "C'est à la Huberdière que nous la tenons. Nous avons restauré le château entre 2021 et 2023, avec de jeunes artisans italiens, des woofers et le Covid en travers du chemin. Quelle aventure.",
    "Ce carnet réunit nos tables et nos sorties favorites en Touraine. Gardez-le, ou passez-le à quelqu'un qui part par ici.",
  ],
  signature: "Lodovica et Patrick",
  offrir: "Offrir ce carnet",
  imprimer: "Imprimer",
  lienCopie: "Lien copié, il ne reste qu'à l'envoyer.",
  partageTitre: "Le carnet de Lodovica, Château de la Huberdière",
  partageTexte: "Les adresses de Lodovica et Patrick autour d'Amboise : tables et sorties.",
  tables: {
    titre: "Où manger",
    intro: "L'été, réservez à l'avance. Nous vous le conseillons fortement.",
    groupes: [
      {
        titre: "Gastronomiques",
        adresses: [
          { nom: "Château de Pray", note: "Une étoile au Guide Michelin.", ville: "Chargé", site: "www.chateaudepray.fr", tel: "+33 2 47 57 23 67" },
          { nom: "Château Louise de la Vallière", note: "Immersion historique, service en tenue d'époque.", ville: "Reugny", site: "www.chateaulouise.com", tel: "+33 2 42 06 02 00" },
          { nom: "La Brèche", note: "Gastronomie, cocktails et terrasse.", ville: "Amboise", site: "www.labreche-amboise.com", tel: "+33 2 47 57 00 79" },
          { nom: "Les Arpents", note: "Cuisine raffinée, ambiance chaleureuse.", ville: "Amboise", site: "www.restaurant-lesarpents.fr", tel: "+33 2 36 20 92 44" },
        ],
      },
      {
        titre: "Bistrots et cuisine gourmande",
        adresses: [
          { nom: "Chez Bruno", note: "Plats classiques et vaste choix de vins.", ville: "Amboise", tel: "+33 2 47 57 73 49" },
          { nom: "Le Clos d'Amboise", note: "Modernité et tradition.", ville: "Amboise", site: "www.leclosdamboise.com", tel: "+33 2 47 30 10 20" },
          { nom: "La Planque", note: "Cuisine raffinée et burgers de compétition.", ville: "Amboise", site: "instagram.com/laplanqueamboise", tel: "+33 2 47 79 94 91" },
        ],
      },
      {
        titre: "Simple et bon",
        adresses: [
          { nom: "La Fourchette", note: "Cuisine du monde créative, surprenant mais sûr.", ville: "Amboise", tel: "+33 2 36 20 99 36" },
          { nom: "Chez Oscar et Suzette", note: "Guinguette et cuisine créative au bord de la Loire. Réservation par SMS uniquement.", ville: "Amboise", tel: "+33 7 66 37 70 17" },
          { nom: "Crêperie Les 4 Saisons", note: "Crêpes bretonnes créatives.", ville: "Amboise", site: "www.les4saisons-amboise.com", tel: "+33 2 47 79 05 58" },
          { nom: "Les Caves de la Croix Verte", note: "Restaurant troglodyte, terrasse, grillades au feu de bois.", ville: "Pocé-sur-Cisse", site: "www.cavesdelacroixverte.com", tel: "+33 2 47 57 39 98" },
          { nom: "Baalbeck", note: "Spécialités libanaises.", ville: "Amboise", tel: "+33 6 32 60 69 68" },
        ],
      },
      {
        titre: "Un verre au bord de la Loire",
        adresses: [
          { nom: "Le Shaker", note: "Cocktails et tapas, vue sur le château d'Amboise.", ville: "Amboise", tel: "+33 2 47 23 24 26" },
          { nom: "Le Sauvage", note: "Guinguette en rive de Loire, cave troglodyte et planches.", ville: "Chargé", tel: "+33 2 47 30 08 98" },
        ],
      },
    ],
  },
  activites: {
    titre: "Que faire",
    intro:
      "Près de 3 000 châteaux le long de la vallée : impossible de tous les voir, et chacun raconte son époque. Autour de nous, le fleuve le plus sauvage d'Europe, des vignobles et des sentiers, à vélo, en bateau ou en montgolfière.",
    liste: [
      { nom: "En montgolfière", texte: "Le décollage se fait depuis les prairies du château.", prestataire: "Art Montgolfière" },
      { nom: "En gabare", texte: "Un verre au coucher du soleil sur le bateau traditionnel de la Loire.", prestataire: "Millière Raboton" },
      { nom: "À vélo", texte: "La Loire à vélo, jusqu'à Chenonceaux. Dites que vous venez de notre part : ils vous font une réduction.", prestataire: "Loirebykes" },
      { nom: "À pied", texte: "Des sentiers à travers vignes et forêts, tout autour. Ils sont sur l'application MaRando." },
      { nom: "Au verre", texte: "Une visite guidée chez nos voisins de Mondomaine, un tour des vignobles avec Cathy, ou la cave troglodyte de l'Ambacia à Amboise." },
    ],
  },
  aCompleter: {
    etiquette: "À compléter par Lodovica",
    saisons: "Dans quel ordre visiter, selon la saison, et ce qu'on évite (Chenonceau en août à 11 h, par exemple).",
    producteurs: "Vos marchés, vos producteurs, votre boulangerie.",
    pluie: "Un plan de journée quand il pleut.",
    coordonnees: "Les coordonnées de Cathy, de Millière Raboton, de Mondomaine et de l'Ambacia.",
  },
  pied: "Château de la Huberdière, hôtel de charme près d'Amboise.",
};

export const CARNET: Partial<Record<Lang, Carnet>> = { fr: FR };

/** Lien partagé par le bouton « Offrir » : il porte la source qui nomme le canal dans le rapport. */
export const CARNET_PARTAGE_QUERY = "utm_source=carnet&utm_medium=partage&utm_campaign=satisfaction";

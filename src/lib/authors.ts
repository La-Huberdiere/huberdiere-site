// Auteurs du blog : signal E-E-A-T (auteur réel, identifié, avec expertise du lieu).
// Rôle et bio sont localisés FR/EN/IT pour ne pas laisser du français sur /en et /it.
// La photo est optionnelle : tant qu'aucun fichier n'existe, un monogramme s'affiche.
// Déposer les photos dans public/images/authors/ puis renseigner `photo`.

export type Lang = "fr" | "en" | "it";

interface AuthorL10n { role: string; bio: string }
export interface Author {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo?: string;
}

const DATA: Record<string, { name: string; photo?: string; l10n: Record<Lang, AuthorL10n> }> = {
  lodovica: {
    name: "Lodovica",
    // photo: "/images/authors/lodovica.jpg",
    l10n: {
      fr: {
        role: "Propriétaire et maîtresse de maison du Château de la Huberdière",
        bio: "Italienne d'origine, Lodovica est propriétaire du Château de la Huberdière, qu'elle tient avec Patrick. Elle accueille les hôtes et orchestre la table d'hôtes maison, et partage ici sa connaissance du lieu, de la Touraine et de l'art de recevoir au château.",
      },
      en: {
        role: "Owner and hostess of Château de la Huberdière",
        bio: "Italian by origin, Lodovica owns Château de la Huberdière, which she runs with Patrick. She welcomes the guests and runs the house table d'hôtes, and shares here her knowledge of the estate, of Touraine and of the art of hosting at the château.",
      },
      it: {
        role: "Proprietaria e padrona di casa dello Château de la Huberdière",
        bio: "Italiana d'origine, Lodovica è proprietaria dello Château de la Huberdière, che gestisce con Patrick. Accoglie gli ospiti e cura la tavola di casa, e qui condivide la sua conoscenza del luogo, della Turenna e dell'arte di ricevere al castello.",
      },
    },
  },
  patrick: {
    name: "Patrick",
    // photo: "/images/authors/patrick.jpg",
    l10n: {
      fr: {
        role: "Propriétaire et maître de maison du Château de la Huberdière",
        bio: "Patrick est propriétaire du Château de la Huberdière, qu'il tient avec Lodovica. Il veille sur le domaine, son parc séculaire et ses événements, et écrit sur l'histoire des lieux, leur entretien et l'organisation des mariages, séminaires et séjours.",
      },
      en: {
        role: "Owner and host of Château de la Huberdière",
        bio: "Patrick owns Château de la Huberdière, which he runs with Lodovica. He looks after the estate, its centuries-old park and its events, and writes about the history of the place, its upkeep and the organisation of weddings, seminars and stays.",
      },
      it: {
        role: "Proprietario e padrone di casa dello Château de la Huberdière",
        bio: "Patrick è proprietario dello Château de la Huberdière, che gestisce con Lodovica. Si prende cura della tenuta, del suo parco secolare e dei suoi eventi, e scrive della storia dei luoghi, della loro manutenzione e dell'organizzazione di matrimoni, seminari e soggiorni.",
      },
    },
  },
};

export const defaultAuthorId = "lodovica";

export function getAuthor(id?: string | null, lang: Lang = "fr"): Author {
  const d = DATA[id ?? ""] ?? DATA[defaultAuthorId];
  return { id: id ?? defaultAuthorId, name: d.name, photo: d.photo, ...d.l10n[lang] };
}

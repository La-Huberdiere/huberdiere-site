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
        role: "Maîtresse de maison du Château de la Huberdière",
        bio: "Italienne d'origine, Lodovica accueille les hôtes du Château de la Huberdière et orchestre la table d'hôtes maison. Elle partage ici sa connaissance du lieu, de la Touraine et de l'art de recevoir au château.",
      },
      en: {
        role: "Hostess of Château de la Huberdière",
        bio: "Italian by origin, Lodovica welcomes the guests of Château de la Huberdière and runs the house table d'hôtes. Here she shares her knowledge of the estate, of Touraine and of the art of hosting at the château.",
      },
      it: {
        role: "Padrona di casa dello Château de la Huberdière",
        bio: "Italiana d'origine, Lodovica accoglie gli ospiti dello Château de la Huberdière e cura la tavola di casa. Qui condivide la sua conoscenza del luogo, della Turenna e dell'arte di ricevere al castello.",
      },
    },
  },
  patrick: {
    name: "Patrick",
    // photo: "/images/authors/patrick.jpg",
    l10n: {
      fr: {
        role: "Propriétaire du Château de la Huberdière",
        bio: "Patrick veille sur le Château de la Huberdière, son parc séculaire et ses événements. Il écrit sur l'histoire du domaine, son entretien et l'organisation des mariages, séminaires et séjours.",
      },
      en: {
        role: "Owner of Château de la Huberdière",
        bio: "Patrick looks after Château de la Huberdière, its centuries-old park and its events. He writes about the history of the estate, its upkeep and the organisation of weddings, seminars and stays.",
      },
      it: {
        role: "Proprietario dello Château de la Huberdière",
        bio: "Patrick si prende cura dello Château de la Huberdière, del suo parco secolare e dei suoi eventi. Scrive della storia della tenuta, della sua manutenzione e dell'organizzazione di matrimoni, seminari e soggiorni.",
      },
    },
  },
};

export const defaultAuthorId = "lodovica";

export function getAuthor(id?: string | null, lang: Lang = "fr"): Author {
  const d = DATA[id ?? ""] ?? DATA[defaultAuthorId];
  return { id: id ?? defaultAuthorId, name: d.name, photo: d.photo, ...d.l10n[lang] };
}

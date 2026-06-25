// Auteurs du blog : signal E-E-A-T (auteur réel, identifié, avec expertise du lieu).
// La photo est optionnelle : tant qu'aucun fichier n'existe, l'encadré et le schema
// s'affichent sans image (pas d'image cassée). Déposer les photos dans
// public/images/authors/ puis renseigner `photo` ici.

export interface Author {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo?: string;
}

export const authors: Record<string, Author> = {
  lodovica: {
    id: "lodovica",
    name: "Lodovica",
    role: "Maîtresse de maison du Château de la Huberdière",
    bio: "Italienne d'origine, Lodovica accueille les hôtes du Château de la Huberdière et orchestre la table d'hôtes maison. Elle partage ici sa connaissance du lieu, de la Touraine et de l'art de recevoir au château.",
    // photo: "/images/authors/lodovica.jpg",
  },
  patrick: {
    id: "patrick",
    name: "Patrick",
    role: "Propriétaire du Château de la Huberdière",
    bio: "Patrick veille sur le Château de la Huberdière, son parc séculaire et ses événements. Il écrit sur l'histoire du domaine, son entretien et l'organisation des mariages, séminaires et séjours.",
    // photo: "/images/authors/patrick.jpg",
  },
};

export const defaultAuthorId = "lodovica";

export function getAuthor(id?: string | null): Author {
  return authors[id ?? ""] ?? authors[defaultAuthorId];
}

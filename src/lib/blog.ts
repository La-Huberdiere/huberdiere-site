// Helpers blog : libellés de catégories + temps de lecture.

export const CATEGORIES: Record<string, string> = {
  mariage: "Mariage",
  sejour: "Séjour & tourisme",
  seminaire: "Séminaire",
  famille: "Famille & groupes",
  retraite: "Retraites & bien-être",
  "art-de-vivre": "Art de vivre",
};

export const categoryLabel = (id?: string | null) => CATEGORIES[id ?? ""] ?? "Art de vivre";

/** Temps de lecture estimé (≈ 200 mots/min) à partir du HTML rendu. */
export function readingTime(html: string): number {
  const words = (html.replace(/<[^>]+>/g, " ").match(/\S+/g) || []).length;
  return Math.max(1, Math.round(words / 200));
}

export const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

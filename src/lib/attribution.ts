// « Comment nous avez-vous connus ? »
//
// Pourquoi ce champ existe : entre 40 et 60 % des demandes arrivent en accès
// direct, sans referrer ni UTM. L'analytics ne peut rien en dire. Or c'est
// précisément là que se cachent le bouche à oreille et, depuis 2026, les
// réponses d'IA : quelqu'un lit un aperçu IA ou une réponse ChatGPT, retient le
// nom du château, et revient trois jours plus tard en tapant l'adresse. Aucun
// outil de mesure ne rattrape ce chemin, seule la question posée le rattrape.
//
// Les clés sont figées : elles alimentent le rapport client mois après mois.
// Les libellés sont ici, et non dans les src/data/*.json éditables au CMS, pour
// que le vocabulaire reste stable et comparable dans le temps.

export type Lang = "fr" | "en" | "it";

export const ATTRIBUTION_KEYS = [
  "recherche-google",
  "ia",
  "bouche-a-oreille",
  "reseaux-sociaux",
  "plateforme",
  "presse-blog",
  "deja-venu",
  "autre",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

const LABELS: Record<Lang, { prompt: string; options: Record<AttributionKey, string> }> = {
  fr: {
    prompt: "Comment nous avez-vous connus ? (facultatif)",
    options: {
      "recherche-google": "Recherche Google",
      ia: "ChatGPT, Gemini ou une autre IA",
      "bouche-a-oreille": "Bouche à oreille, recommandation",
      "reseaux-sociaux": "Instagram, Facebook",
      plateforme: "Booking, Airbnb, Mariages.net…",
      "presse-blog": "Presse, blog ou guide",
      "deja-venu": "Nous nous connaissons déjà",
      autre: "Autre",
    },
  },
  en: {
    prompt: "How did you hear about us? (optional)",
    options: {
      "recherche-google": "Google search",
      ia: "ChatGPT, Gemini or another AI",
      "bouche-a-oreille": "Word of mouth, a recommendation",
      "reseaux-sociaux": "Instagram, Facebook",
      plateforme: "Booking, Airbnb, a wedding directory…",
      "presse-blog": "Press, a blog or a guide",
      "deja-venu": "We already know each other",
      autre: "Something else",
    },
  },
  it: {
    prompt: "Come ci avete conosciuti? (facoltativo)",
    options: {
      "recherche-google": "Ricerca Google",
      ia: "ChatGPT, Gemini o un'altra IA",
      "bouche-a-oreille": "Passaparola, una raccomandazione",
      "reseaux-sociaux": "Instagram, Facebook",
      plateforme: "Booking, Airbnb, un portale matrimoni…",
      "presse-blog": "Stampa, un blog o una guida",
      "deja-venu": "Ci conosciamo già",
      autre: "Altro",
    },
  },
};

export function attributionField(lang: Lang = "fr") {
  const l = LABELS[lang] ?? LABELS.fr;
  return { prompt: l.prompt, options: ATTRIBUTION_KEYS.map((k) => ({ value: k, label: l.options[k] })) };
}

/** Libellé français d'une clé, pour le CRM et le rapport client. */
export function attributionLabel(key?: string | null): string {
  if (!key) return "";
  return LABELS.fr.options[key as AttributionKey] ?? "";
}

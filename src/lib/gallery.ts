// Données de la page /galerie : regroupe les 117 photos de la bibliothèque
// (public/images/bibliotheque, cf. manifest.json) en 5 chapitres éditoriaux.
// Les 11 thèmes bruts sont trop inégaux pour faire 11 sections (famille = 1,
// séminaire = 4) : on consolide en chapitres qui tiennent debout, avec le mélange
// chambres + événements voulu. Les 4 photos « fondateurs » restent hors galerie
// (elles vivent sur /notre-histoire).
import manifestRaw from "../../public/images/bibliotheque/manifest.json";

export type Lang = "fr" | "en" | "it";

type ManifestItem = {
  file: string; // "bibliotheque/<theme>/<name>.jpg"
  theme: string;
  w: number;
  h: number;
};
const manifest = manifestRaw as { items: ManifestItem[] };

export type Photo = {
  full: string; // original 2560px (visionneuse plein écran)
  thumb: string; // vignette 1100px (mosaïque)
  w: number;
  h: number;
  orient: "land" | "port" | "square";
  alt: string;
};
export type Chapter = {
  id: string;
  numeral: string; // I, II, III… (numérotation maison, détail signature)
  title: string;
  intro: string;
  count: number;
  photos: Photo[];
};

// Chapitres : ordre d'affichage + thèmes regroupés + textes FR/EN/IT.
const CHAPTERS: {
  id: string;
  numeral: string;
  themes: string[];
  title: Record<Lang, string>;
  intro: Record<Lang, string>;
  alt: Record<Lang, string>;
}[] = [
  {
    id: "chambres",
    numeral: "I",
    themes: ["chambres"],
    title: { fr: "Les chambres", en: "The rooms", it: "Le camere" },
    intro: {
      fr: "Dix chambres, aucune identique. Poutres, parquets et tissus choisis pièce par pièce.",
      en: "Ten rooms, no two alike. Beams, parquet and fabrics chosen one by one.",
      it: "Dieci camere, nessuna uguale. Travi, parquet e tessuti scelti uno a uno.",
    },
    alt: { fr: "Chambre du Château de la Huberdière", en: "Room at Château de la Huberdière", it: "Camera dello Château de la Huberdière" },
  },
  {
    id: "chateau-parc",
    numeral: "II",
    themes: ["chateau-exterieur", "jardin-fleurs", "piscine"],
    title: { fr: "Le château & le parc", en: "The château & grounds", it: "Il castello e il parco" },
    intro: {
      fr: "Quatorze hectares, une demeure du XVIᵉ siècle, un étang et une piscine chauffée.",
      en: "Fourteen hectares, a 16th-century house, a pond and a heated pool.",
      it: "Quattordici ettari, una dimora del XVI secolo, uno stagno e una piscina riscaldata.",
    },
    alt: { fr: "Château de la Huberdière et son parc", en: "Château de la Huberdière and its grounds", it: "Château de la Huberdière e il suo parco" },
  },
  {
    id: "salons",
    numeral: "III",
    themes: ["salons-interieurs"],
    title: { fr: "Les salons", en: "The lounges", it: "I saloni" },
    intro: {
      fr: "Les pièces de réception, entre feux de cheminée et grandes tablées.",
      en: "The reception rooms, from fireside corners to long shared tables.",
      it: "Le sale di ricevimento, tra camini accesi e grandi tavolate.",
    },
    alt: { fr: "Salon du Château de la Huberdière", en: "Lounge at Château de la Huberdière", it: "Salone dello Château de la Huberdière" },
  },
  {
    id: "table",
    numeral: "IV",
    themes: ["restauration"],
    title: { fr: "La table", en: "The table", it: "La tavola" },
    intro: {
      fr: "Petits-déjeuners maison, planches à partager et dîners italiens, servis aux résidents.",
      en: "Homemade breakfasts, sharing boards and Italian dinners, served to guests.",
      it: "Colazioni fatte in casa, taglieri da condividere e cene italiane, per gli ospiti.",
    },
    alt: { fr: "Table et cuisine du Château de la Huberdière", en: "Dining at Château de la Huberdière", it: "La tavola dello Château de la Huberdière" },
  },
  {
    id: "celebrations",
    numeral: "V",
    themes: ["mariage", "seminaire", "retraite-yoga", "famille"],
    title: { fr: "Célébrations", en: "Celebrations", it: "Celebrazioni" },
    intro: {
      fr: "Mariages, séminaires, retraites et réunions de famille, quand le château se privatise.",
      en: "Weddings, seminars, retreats and family gatherings, when the château is yours alone.",
      it: "Matrimoni, seminari, ritiri e riunioni di famiglia, quando il castello è tutto vostro.",
    },
    alt: { fr: "Événement au Château de la Huberdière", en: "Event at Château de la Huberdière", it: "Evento allo Château de la Huberdière" },
  },
];

const orientOf = (w: number, h: number): Photo["orient"] => {
  const r = w / h;
  if (r >= 1.15) return "land";
  if (r <= 0.87) return "port";
  return "square";
};

// Réordonne pour que le chapitre s'ouvre sur une belle photo large (maîtresse),
// le reste garde l'ordre du manifeste.
const withLeadFirst = (photos: Photo[]): Photo[] => {
  const i = photos.findIndex((p) => p.w / p.h >= 1.4);
  if (i <= 0) return photos;
  return [photos[i], ...photos.slice(0, i), ...photos.slice(i + 1)];
};

export function galleryChapters(lang: Lang): Chapter[] {
  return CHAPTERS.map((c) => {
    const items = manifest.items.filter((it) => c.themes.includes(it.theme));
    const rel = (file: string) => file.replace(/^bibliotheque\//, "");
    const photos: Photo[] = items.map((it) => ({
      full: `/images/${it.file}`,
      thumb: `/images/galerie-thumb/${rel(it.file)}`,
      w: it.w,
      h: it.h,
      orient: orientOf(it.w, it.h),
      alt: c.alt[lang],
    }));
    const ordered = withLeadFirst(photos);
    return {
      id: c.id,
      numeral: c.numeral,
      title: c.title[lang],
      intro: c.intro[lang],
      count: ordered.length,
      photos: ordered,
    };
  });
}

export const galleryTotal = manifest.items.filter((it) =>
  CHAPTERS.some((c) => c.themes.includes(it.theme))
).length;

// Libellés d'interface localisés (hors données photo).
export const galleryUI: Record<Lang, {
  eyebrow: string;
  title: string;
  lead: string;
  hint: string;
  close: string;
  prev: string;
  next: string;
  metaTitle: string;
  metaDesc: string;
}> = {
  fr: {
    eyebrow: "Touraine · Vallée de la Loire",
    title: "Galerie",
    lead: `${galleryTotal} photographies du domaine, chambre par chambre, saison après saison.`,
    hint: "Cliquez une photo pour l'ouvrir en plein écran.",
    close: "Fermer",
    prev: "Précédente",
    next: "Suivante",
    metaTitle: "Galerie photo · Château de la Huberdière",
    metaDesc:
      "La galerie photo du Château de la Huberdière : chambres, salons, parc, table et célébrations d'un hôtel de charme du XVIᵉ siècle près d'Amboise, en Val de Loire.",
  },
  en: {
    eyebrow: "Touraine · Loire Valley",
    title: "Gallery",
    lead: `${galleryTotal} photographs of the estate, room by room, season after season.`,
    hint: "Click a photo to open it full screen.",
    close: "Close",
    prev: "Previous",
    next: "Next",
    metaTitle: "Photo gallery · Château de la Huberdière",
    metaDesc:
      "The photo gallery of Château de la Huberdière: rooms, lounges, grounds, table and celebrations at a 16th-century boutique hotel near Amboise, in the Loire Valley.",
  },
  it: {
    eyebrow: "Turenna · Valle della Loira",
    title: "Galleria",
    lead: `${galleryTotal} fotografie della tenuta, camera dopo camera, stagione dopo stagione.`,
    hint: "Clicca una foto per aprirla a schermo intero.",
    close: "Chiudi",
    prev: "Precedente",
    next: "Successiva",
    metaTitle: "Galleria fotografica · Château de la Huberdière",
    metaDesc:
      "La galleria fotografica dello Château de la Huberdière: camere, saloni, parco, tavola e celebrazioni di un hotel di charme del XVI secolo vicino ad Amboise, nella Valle della Loira.",
  },
};

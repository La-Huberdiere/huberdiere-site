// Bloc « Demandes reçues » du rapport client : contacts Brevo bruts → demandes du
// mois, par activité, canal et déclaratif. Module pur, testé sous `node --test`.

const CIBLE_LABEL_RAPPORT = {
  LP_Mariage: "Mariage",
  LP_Seminaire: "Séminaire",
  LP_Stage: "Retraite / stage",
  LP_Reunion_Famille: "Réunion de famille",
  LP_Sejour: "Séjour",
  LP_Restauration: "Restauration",
  Contact_Form: "Contact (autre)",
}

// Étiquettes `FORM` que pose le formulaire du site (TAGS de src/pages/api/lead.js),
// plus l'inscription newsletter. Le compte Brevo en connaît d'autres, héritées de
// Wix (Grands_Gites, Bienvenue_Au_Chateau) ou posées à la main (Autre) : elles ne
// viennent pas du site. Le 05/09, huit fiches Grands_Gites importées en dix minutes
// sont passées pour huit demandes de septembre, 22 annoncées pour 13 reçues.
const FORMS_DU_SITE = new Set([...Object.keys(CIBLE_LABEL_RAPPORT), "Newsletter_Form"])

// Canal lisible depuis la source figée au premier contact (utm_source ou referrer
// d'entrée, cf. attribution first-touch du site).
function leadChannel(src) {
  const r = String(src || "").toLowerCase().trim()
  if (!r) return "Accès direct / source non identifiée"
  if (/chatgpt|openai/.test(r)) return "ChatGPT"
  if (/perplexity|gemini|claude|copilot/.test(r)) return "Autres IA"
  if (/google|bing|yahoo|duckduckgo|qwant|ecosia|brave/.test(r)) return "Recherche Google"
  if (/instagram|facebook|linkedin|pinterest|tiktok|youtube|twitter|x\.com/.test(r)) return "Réseaux sociaux"
  if (/bouche/.test(r)) return "Bouche à oreille"
  // Domaine référent nommé : on l'affiche proprement. Un token non reconnu qui n'est
  // pas un domaine (utm cassé, saisie parasite) retombe en non identifié, jamais brut.
  if (r.includes(".")) return `Référent : ${r.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]}`
  return "Accès direct / source non identifiée"
}

// Source d'une demande : l'UTM d'abord, puis le référent d'entrée figé par le site.
// Le rapport ne lisait que UTM_SOURCE : en septembre 2026, neuf demandes arrivées
// de Google sont sorties « accès direct ». Le site lui-même n'est jamais une source :
// quand la première visite n'a laissé aucune trace (lien ouvert depuis l'appli
// ChatGPT, adresse tapée), le formulaire retombe sur la page interne précédente.
const DOMAINE = "chateaudelahuberdiere.com"
function sourceDe(utm, referrer) {
  if (String(utm || "").trim()) return utm
  const r = String(referrer || "").trim()
  if (!r) return ""
  try {
    const host = new URL(r).hostname.replace(/^www\./, "").toLowerCase()
    // Appli Gmail Android (android-app://com.google.android.gm) : un mail, pas une recherche Google.
    if (host.startsWith("com.google.android.gm")) return ""
    return host === DOMAINE || host.endsWith("." + DOMAINE) ? "" : host
  } catch {
    return ""
  }
}

const estIA = (canal) => canal === "ChatGPT" || canal === "Autres IA"
const declareIA = (declare) => /\bIA\b|ChatGPT|Gemini|Perplexity|Claude/i.test(declare)

// Emails internes / tests exclus du décompte client.
const isTestEmail = (e) => {
  const s = String(e || "").toLowerCase()
  return !s || s.includes("+") || /@morain\.fr$/.test(s) || s === "alexmorain@yahoo.fr"
}

// Segmentation pure (testable hors ligne) : contacts Brevo bruts + mois AAAA-MM →
// totaux, ventilation par activité et par canal.
// `moisSoumission` (Map email -> AAAA-MM) rattache chaque demande au mois où le
// prospect a RÉELLEMENT écrit, lu dans les mails de confirmation. Sans lui, le
// mois vient de `createdAt`, c'est-à-dire de la date à laquelle Brevo a bien
// voulu stocker la ligne : une demande de juillet ressaisie en août comptait pour
// août. Les contacts sans confirmation (imports Octorate, saisies manuelles)
// retombent sur `createdAt`, faute de mieux.
export function buildLeadsData(contacts, ym, moisSoumission = null) {
  const A = (x, k) => (x.attributes || {})[k]
  const first = (v) => (Array.isArray(v) ? v[0] : v)
  // Valeurs AAAA-MM ou date complète de la confirmation (AAAA-MM-JJTHH:MM).
  const soumis = (x) => moisSoumission?.get(String(x.email || "").toLowerCase()) || ""
  const moisDe = (x) => (soumis(x) || x.createdAt || "").slice(0, 7)
  const rows = (Array.isArray(contacts) ? contacts : []).filter((x) => moisDe(x) === ym)

  let newsletter = 0
  const demandes = []
  for (const x of rows) {
    const form = String(first(A(x, "FORM")) || "")
    if (!FORMS_DU_SITE.has(form)) continue
    if (isTestEmail(x.email)) continue
    if (form === "Newsletter_Form") { newsletter++; continue }
    demandes.push({
      cible: CIBLE_LABEL_RAPPORT[form] || form,
      canal: leadChannel(sourceDe(A(x, "UTM_SOURCE"), A(x, "REFERRER"))),
      // Déclaratif du prospect (champ « Comment nous avez-vous connus ? »).
      declare: String(A(x, "ATTRIBUTION") || "").trim(),
      // Parcours : première page de la visite venue d'un moteur ou d'un lien
      // (vide si elle n'a laissé aucune trace), page consultée juste avant celle
      // du formulaire, et page du formulaire. Sert à montrer le rôle des articles.
      date: (soumis(x).length >= 10 ? soumis(x) : x.createdAt || "").slice(0, 10),
      entree: String(A(x, "PAGE_ENTREE") || "").trim(),
      provenance: String(A(x, "PAGE_PROVENANCE") || "").trim(),
      formulaire: String(A(x, "PAGE_FORMULAIRE") || "").trim(),
    })
  }

  const tally = (arr, key) => {
    const m = new Map()
    for (const d of arr) m.set(d[key], (m.get(d[key]) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }
  const chatgpt = demandes.filter((d) => d.canal === "ChatGPT").length
  const identifies = demandes.filter((d) => d.canal !== "Accès direct / source non identifiée").length
  const declares = demandes.filter((d) => d.declare)
  // Une IA se lit de deux façons : tracée (le clic venait d'une IA) ou déclarée par
  // le prospect. La plupart des clics depuis l'appli ChatGPT arrivent sans aucune
  // trace : seul le déclaratif les rattrape. Chaque personne compte une fois.
  const tracees = demandes.filter((d) => estIA(d.canal)).length
  const declareesSeules = demandes.filter((d) => !estIA(d.canal) && declareIA(d.declare)).length
  return {
    total: demandes.length, newsletter,
    parCible: tally(demandes, "cible"), parCanal: tally(demandes, "canal"),
    parDeclare: tally(declares, "declare"), declares: declares.length,
    chatgpt, identifies,
    ia: { total: tracees + declareesSeules, tracees, declareesSeules },
    parcours: demandes
      .map(({ date, cible, entree, provenance, formulaire }) => ({ date, cible, entree, provenance, formulaire }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}

const LANGUES = { en: "anglais", it: "italien" }

// Libellé client d'un chemin du site. `pages` : Map chemin → { label, blog, langue },
// construite au rendu depuis les articles et les slugs localisés (routes.ts).
export function libellePage(chemin, pages) {
  const brut = String(chemin || "").trim()
  if (!brut) return null
  const p = brut.split(/[?#]/)[0].replace(/(.)\/$/, "$1") || "/"
  const page = pages?.get(p)
  if (!page) return { texte: p, blog: false }
  const langue = LANGUES[page.langue] ? ` (${LANGUES[page.langue]})` : ""
  return { texte: page.blog ? `Article « ${page.label} »${langue}` : `${page.label}${langue}`, blog: !!page.blog }
}

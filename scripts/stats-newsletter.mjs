// Bilan d'une campagne Brevo pour le rapport client : Brevo pour la délivrabilité,
// Umami pour ce que les lecteurs ont fait sur le site, robots de sécurité écartés.
//
//   set -a && . ./.env && set +a
//   node scripts/stats-newsletter.mjs <idCampagneBrevo>                 # affiche le JSON
//   node scripts/stats-newsletter.mjs <idCampagneBrevo> --write 2026-09 # l'écrit dans rapport-newsletters.json
//
// Pourquoi pas les clics globaux de Brevo : sur la campagne d'automne, `globalStats`
// annonçait 1 240 cliqueurs pour 1 236 mails reçus. Les passerelles de sécurité des
// messageries pro (Microsoft surtout, sorties d'Irlande et des Pays-Bas) ouvrent
// CHAQUE lien avant de livrer. Les clics par liste (`campaignStats`) en sont
// débarrassés (104), c'est eux qu'on retient. Côté Umami, une session robot se
// reconnaît à ce qu'elle atterrit sur 3 liens différents ou plus, ou vient d'un
// poste IE/NL sans aucune interaction ni page vue au-delà de l'atterrissage.
import fs from "node:fs"

const [id, flag, ym] = process.argv.slice(2)
if (!id) { console.error("usage : node scripts/stats-newsletter.mjs <idCampagne> [--write AAAA-MM]"); process.exit(1) }
const { BREVO_API_KEY, UMAMI_BASE, UMAMI_USERNAME, UMAMI_PASSWORD, PUBLIC_UMAMI_WEBSITE_ID } = process.env
if (!BREVO_API_KEY || !UMAMI_BASE || !UMAMI_USERNAME || !UMAMI_PASSWORD || !PUBLIC_UMAMI_WEBSITE_ID) {
  console.error("Variables manquantes : sourcer .env (BREVO_API_KEY, UMAMI_*, PUBLIC_UMAMI_WEBSITE_ID)."); process.exit(1)
}

// Libellés client. Un utm_content ou une liste inconnue sort sous son nom brut :
// à ajouter ici plutôt qu'à corriger dans le JSON.
const LIENS = {
  film: "Le film du château", entete: "La photo d'ouverture", manchette: "Le nom du château en tête du mail",
  "week-end-groupe": "Le week-end en groupe", sejour: "Le séjour au château", "mariage-hiver": "L'article sur le mariage en hiver",
  "dates-2027": "Les dates 2027 (formulaire de contact)",
}
const LISTES = [
  [/clients_directs/, "Vos clients 2026"], [/clients_anterieurs/, "Vos clients des années précédentes"],
  [/prospects_site/, "Demandes reçues par le site"], [/reste_valide/, "Autres contacts vérifiés"],
  [/incertains/, "Adresses non vérifiables"],
]

const brevo = async (p) => {
  const r = await fetch(`https://api.brevo.com/v3${p}`, { headers: { "api-key": BREVO_API_KEY, accept: "application/json" } })
  if (!r.ok) throw new Error(`Brevo ${p} ${r.status}`)
  return r.json()
}

const camp = await brevo(`/emailCampaigns/${id}?statistics=globalStats`)
if (camp.status !== "sent") throw new Error(`Campagne ${id} en statut ${camp.status}, pas encore envoyée.`)
const g = camp.statistics.globalStats
const parListe = (await brevo(`/emailCampaigns/${id}?statistics=campaignStats`)).statistics.campaignStats
const segments = []
for (const s of parListe) {
  const nom = (await brevo(`/contacts/lists/${s.listId}`)).name
  segments.push({
    nom: (LISTES.find(([re]) => re.test(nom)) || [, nom])[1],
    envoyes: s.sent, recus: s.delivered, ouvertures: s.uniqueViews, cliqueurs: s.uniqueClicks,
  })
}

// Umami : toutes les sessions depuis l'envoi, rattachées à la campagne par leur
// utm_campaign, lu sur la page d'atterrissage.
const liensBrevo = (await brevo(`/emailCampaigns/${id}?statistics=linksStats`)).statistics.linksStats || {}
const utmCampaign = Object.keys(liensBrevo).map((u) => u.match(/utm_campaign=([\w-]+)/)?.[1]).find(Boolean)
if (!utmCampaign) throw new Error("utm_campaign introuvable dans les liens de la campagne.")
const token = (await (await fetch(`${UMAMI_BASE}/api/auth/login`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: UMAMI_USERNAME, password: UMAMI_PASSWORD }),
})).json()).token
const debut = new Date(camp.scheduledAt || camp.sentDate).getTime() - 3600e3
const events = []
for (let page = 1; ; page++) {
  const r = await (await fetch(`${UMAMI_BASE}/api/websites/${PUBLIC_UMAMI_WEBSITE_ID}/events?startAt=${debut}&endAt=${Date.now()}&pageSize=500&page=${page}`, {
    headers: { authorization: `Bearer ${token}` },
  })).json()
  events.push(...r.data)
  if (!r.data.length || events.length >= r.count) break
}
const parSession = new Map()
for (const e of events) (parSession.get(e.sessionId) || parSession.set(e.sessionId, []).get(e.sessionId)).push(e)

let robots = 0
const humains = []
for (const es of parSession.values()) {
  es.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const atterrissages = es.filter((e) => e.eventType === 1 && (e.urlQuery || "").includes(`utm_campaign=${utmCampaign}`))
  if (!atterrissages.length) continue
  const contenus = atterrissages.map((e) => (e.urlQuery.match(/utm_content=([^&]+)/) || [, "autre"])[1])
  const noms = es.filter((e) => e.eventType === 2).map((e) => e.eventName)
  const auDela = es.some((e) => e.eventType === 1 && !(e.urlQuery || "").includes(`utm_campaign=${utmCampaign}`))
  const mobile = ["iOS", "Android OS"].includes(es[0].os)
  const passerelle = ["IE", "NL"].includes(es[0].country) && !mobile
  const robot = new Set(contenus).size >= 3 || (passerelle && !auDela && !noms.length)
  if (robot) { robots++; continue }
  humains.push({ entree: contenus[0], noms })
}

const liensCompte = new Map()
for (const h of humains) liensCompte.set(h.entree, (liensCompte.get(h.entree) || 0) + 1)
const avec = (n) => humains.filter((h) => h.noms.includes(n)).length

const entree = {
  nom: "La newsletter",
  envoi: (camp.sentDate || camp.scheduledAt).slice(0, 10),
  releve: new Date().toISOString().slice(0, 10),
  objet: camp.subject,
  envoyes: g.sent, recus: g.delivered, ouvertures: g.uniqueViews,
  cliqueurs: segments.reduce((s, x) => s + (x.cliqueurs || 0), 0),
  desinscrits: g.unsubscriptions, plaintes: g.complaints,
  rebonds: { definitifs: g.hardBounces, temporaires: g.softBounces },
  segments,
  liens: [...liensCompte].map(([k, v]) => ({ nom: LIENS[k] || k, visites: v })).sort((a, b) => b.visites - a.visites),
  robotsEcartes: robots,
  visiteursReels: humains.length,
  // `lead` est l'événement posé sur /merci : une demande réellement envoyée.
  surLeSite: { film: avec("film_play"), disponibilites: avec("booking_search"), demandes: avec("lead") },
}

if (flag === "--write") {
  if (!/^\d{4}-\d{2}$/.test(ym || "")) throw new Error("--write attend un mois AAAA-MM")
  const f = new URL("../src/data/rapport-newsletters.json", import.meta.url)
  const data = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {}
  // Le nom affiché est éditorial : on garde celui déjà saisi pour cette campagne.
  const deja = (data[ym] || []).find((c) => c.envoi === entree.envoi)
  if (deja) entree.nom = deja.nom
  data[ym] = [...(data[ym] || []).filter((c) => c.envoi !== entree.envoi), entree]
  fs.writeFileSync(f, JSON.stringify(data, null, 2) + "\n")
  console.log(`écrit dans src/data/rapport-newsletters.json sous ${ym}`)
}
console.log(JSON.stringify(entree, null, 2))

// Section « newsletter » du rapport client : une campagne Brevo envoyée dans le
// mois, lue dans src/data/rapport-newsletters.json (clé AAAA-MM, liste de
// campagnes). Chiffres produits par scripts/stats-newsletter.mjs, qui écarte les
// robots de sécurité des messageries : Brevo compte leurs clics comme des lecteurs
// (1 240 « cliqueurs » pour 104 vrais sur la campagne d'automne).
// Module sans import de JSON pour rester testable sous `node --test`.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const fr = (n) => Number(n || 0).toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0") // Montserrat ne dessine pas U+202F

// Entier au-dessus de 5 %, une décimale en dessous : « 1,6 % » de désinscrits dit
// quelque chose, « 2 % » l'arrondit à un chiffre qui inquiète.
function pct(n, sur) {
  if (!sur) return "–"
  const v = (n / sur) * 100
  return `${v < 5 ? v.toFixed(1).replace(".", ",") : Math.round(v)} %`
}

function dateLongue(iso) {
  const d = new Date(`${iso}T12:00:00Z`)
  // « 1er octobre », pas « 1 octobre ».
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).replace(/^1 /, "1er ")
}

function renderCampagne(c) {
  const segments = Array.isArray(c.segments) ? c.segments : []
  const liens = (Array.isArray(c.liens) ? c.liens : []).slice().sort((a, b) => b.visites - a.visites)
  const site = c.surLeSite || {}
  const faits = [
    site.film ? `<strong>${fr(site.film)}</strong> ont lancé le film du château` : "",
    site.disponibilites ? `<strong>${fr(site.disponibilites)}</strong> ont cherché des disponibilités sur le moteur de réservation` : "",
    `<strong>${fr(site.demandes || 0)}</strong> demande${site.demandes > 1 ? "s" : ""} de renseignements envoyée${site.demandes > 1 ? "s" : ""} depuis le formulaire du site`,
  ].filter(Boolean)

  return `<h2>${esc(c.nom)}</h2>
  <p class="lead">Envoyée le ${esc(dateLongue(c.envoi))} à ${fr(c.envoyes)} adresses, c'est le premier envoi à l'ensemble de votre base de contacts. Voici ce qu'elle a produit${c.releve ? `, relevé au ${esc(dateLongue(c.releve))}` : ""}.</p>
  <div class="kpis">
    <div class="kpi"><div class="l">Bien reçue</div><div class="v">${fr(c.recus)}</div><div class="n">${pct(c.recus, c.envoyes)} des adresses</div></div>
    <div class="kpi"><div class="l">Ouverte</div><div class="v">${pct(c.ouvertures, c.recus)}</div><div class="n">${fr(c.ouvertures)} personnes</div></div>
    <div class="kpi"><div class="l">Venus sur le site</div><div class="v">${fr(c.cliqueurs)}</div><div class="n">${pct(c.cliqueurs, c.recus)} des mails reçus</div></div>
    <div class="kpi"><div class="l">Désinscriptions</div><div class="v">${fr(c.desinscrits)}</div><div class="n">${pct(c.desinscrits, c.recus)}, ${c.plaintes ? `${fr(c.plaintes)} signalement${c.plaintes > 1 ? "s" : ""} en indésirable` : "aucun signalement en indésirable"}</div></div>
  </div>
  ${segments.length ? `<p class="sub-h">Qui a lu</p>
  <table>
    <thead><tr><th>Destinataires</th><th class="num">Ouverte</th><th class="num">Cliquée</th></tr></thead>
    <tbody>${segments.map((s) => `<tr><td>${esc(s.nom)}<br><span style="color:var(--gris);font-size:12px">${fr(s.envoyes)} adresses</span></td><td class="num">${pct(s.ouvertures, s.recus)}</td><td class="num">${pct(s.cliqueurs, s.recus)}</td></tr>`).join("")}</tbody>
  </table>` : ""}
  ${liens.length ? `<p class="sub-h">Ce qui a fait venir les lecteurs sur le site</p>
  <table>
    <thead><tr><th>Lien cliqué dans la newsletter</th><th class="num">Visites</th></tr></thead>
    <tbody>${liens.map((l) => `<tr><td>${esc(l.nom)}</td><td class="num">${fr(l.visites)}</td></tr>`).join("")}</tbody>
  </table>` : ""}
  <div class="card"><p style="margin:0">Une fois sur le site, parmi ces lecteurs : ${faits.join(", ")}.</p></div>
  <p class="note">Les pourcentages sont calculés sur les mails effectivement reçus. Les messageries d'entreprise font ouvrir chaque lien par un robot de sécurité avant de livrer le mail : ${c.robotsEcartes ? `${fr(c.robotsEcartes)} de ces passages automatiques ont été écartés, ` : ""}seuls les vrais visiteurs sont comptés ici. Les réservations passées sur le moteur de réservation ne remontent pas jusqu'à ce rapport : une réservation faite après la lecture de la newsletter se lit dans votre carnet, pas ici.</p>`
}

export function renderNewsletters(campagnes) {
  if (!Array.isArray(campagnes) || !campagnes.length) return ""
  return campagnes.map(renderCampagne).join("\n")
}

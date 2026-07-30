// Réception des formulaires du site → Brevo (CRM + emails).
// Tourne en fonction serverless sur Vercel. La clé API reste côté serveur.
// 3 emails : confirmation au prospect + notification à l'équipe (contact@ et Alexis).
export const prerender = false;

const TAGS = {
  mariage: "LP_Mariage",
  seminaire: "LP_Seminaire",
  stage: "LP_Stage",
  retraite: "LP_Stage",
  famille: "LP_Reunion_Famille",
  sejour: "LP_Sejour",
  restauration: "LP_Restauration",
  contact: "Contact_Form",
};

// Libellés lisibles de la cible (titre du mail + ligne « Activité »).
const CIBLE_LABEL = {
  mariage: "Mariage",
  seminaire: "Séminaire",
  stage: "Stage",
  retraite: "Retraite",
  famille: "Réunion de famille",
  sejour: "Séjour",
  restauration: "Restauration",
  contact: "Contact",
};

// Adresse expéditrice : DOIT être un expéditeur validé dans le compte Brevo du château.
// Validés : hello@ et lodovica.dalpozzo@. contact@ n'est PAS validé comme expéditeur
// (c'est l'email du compte), donc on envoie depuis hello@ et on répond vers contact@.
const SENDER = { name: "Château de la Huberdière", email: "hello@chateaudelahuberdiere.com" };
const REPLY_PUBLIC = { email: "contact@chateaudelahuberdiere.com", name: "Château de la Huberdière" };
// Destinataires des notifications internes.
// MISE EN LIGNE 2026-06-30 : le client reçoit ses leads, Alexis garde une copie de suivi.
const TEAM = [{ email: "contact@chateaudelahuberdiere.com" }, { email: "alexis@morain.fr" }];

// Confirmation envoyée au prospect, localisée.
const CONFIRM = {
  fr: {
    subject: "Nous avons bien reçu votre demande — Château de la Huberdière",
    title: "Merci pour votre message",
    body: (p) =>
      `Bonjour ${p || ""},<br><br>Nous avons bien reçu votre demande et nous reviendrons vers vous sous 24 heures avec une première réponse. À très bientôt au Château de la Huberdière.`,
    signoff: "L'équipe du Château de la Huberdière",
  },
  en: {
    subject: "We have received your enquiry — Château de la Huberdière",
    title: "Thank you for your message",
    body: (p) =>
      `Hello ${p || ""},<br><br>We have received your enquiry and will get back to you within 24 hours with a first reply. See you soon at Château de la Huberdière.`,
    signoff: "The Château de la Huberdière team",
  },
  it: {
    subject: "Abbiamo ricevuto la tua richiesta — Château de la Huberdière",
    title: "Grazie per il tuo messaggio",
    body: (p) =>
      `Buongiorno ${p || ""},<br><br>Abbiamo ricevuto la tua richiesta e ti risponderemo entro 24 ore con una prima risposta. A presto al Château de la Huberdière.`,
    signoff: "Il team del Château de la Huberdière",
  },
};

export async function POST({ request }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  // Anti-spam : honeypot. Un bot remplit le champ caché "website".
  if (data.website) return json({ ok: true });
  if (!data.email) return json({ ok: false, error: "email_required" }, 422);

  const tag = TAGS[data.cible] || "Contact_Form";
  const cibleLabel = CIBLE_LABEL[data.cible] || "Contact";
  const lang = ["fr", "en", "it"].includes(data.lang) ? data.lang : "fr";
  const key = process.env.BREVO_API_KEY || import.meta.env.BREVO_API_KEY;
  const fullName = `${data.prenom || ""} ${data.nom || ""}`.trim();

  // Contexte du lead pour la notification (navigateur via User-Agent, géo Vercel, date).
  const dec = (v) => { try { return decodeURIComponent(v || ""); } catch { return v || ""; } };
  const client = parseUA(request.headers.get("user-agent") || "");
  const meta = {
    lang,
    browserLang: (data.browser_lang || "").slice(0, 35),
    browser: client.browser,
    os: client.os,
    device: client.device,
    location: [
      dec(request.headers.get("x-vercel-ip-city")),
      dec(request.headers.get("x-vercel-ip-country-region")),
      request.headers.get("x-vercel-ip-country") || "",
    ].filter(Boolean).join(", "),
    when: new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date()),
  };

  // Sans clé (démo), on n'échoue pas : on laisse le parcours se terminer.
  if (!key) {
    console.log("[lead] BREVO_API_KEY absente — lead non envoyé :", data.email, tag);
    return json({ ok: true, brevo: false });
  }

  const headers = { "api-key": key, "content-type": "application/json", accept: "application/json" };

  // Canal d'origine lisible (SEO, direct, réseaux sociaux…), déduit une fois pour
  // le contact CRM et le mail. Comble les leads sans UTM (le SEO n'en pose pas).
  const origin = classifyChannel(data);

  // 1) Contact dans le CRM. On y range un maximum de contexte : attribution
  // (canal + UTM), parcours (pages, referrer), technique (navigateur, appareil,
  // localisation, langues). Tous ces attributs existent côté Brevo.
  const contact = fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: data.email,
      updateEnabled: true,
      attributes: {
        PRENOM: data.prenom || "",
        NOM: data.nom || "",
        SMS: data.telephone || "",
        MESSAGE: data.message || "",
        FORM: [tag],
        CANAL: origin,
        UTM_SOURCE: data.utm_source || "",
        UTM_MEDIUM: data.utm_medium || "",
        UTM_TERM: data.utm_term || "",
        UTM_CAMPAIGN: data.utm_campaign || "",
        UTM_CONTENT: data.utm_content || "",
        GCLID: data.gclid || "",
        LEAD_ID: data.lead_id || "",
        PAGE_FORMULAIRE: data.page || "",
        PAGE_ENTREE: data.landing || "",
        REFERRER: data.referrer || "",
        LOCALISATION: meta.location || "",
        NAVIGATEUR: meta.browser || "",
        APPAREIL: meta.device || "",
        SYSTEME: meta.os || "",
        LANGUE_SITE: meta.lang || "",
        LANGUE_NAVIGATEUR: meta.browserLang || "",
      },
    }),
  });

  // 2) Notification à l'équipe (contact@ + Alexis), réponse possible au prospect.
  const notify = fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers,
    body: JSON.stringify({
      sender: SENDER,
      to: TEAM,
      replyTo: { email: data.email, name: fullName || data.email },
      subject: `[${cibleLabel}] Nouvelle demande — ${fullName || data.email}`,
      htmlContent: notifyHtml(data, cibleLabel, meta, origin),
    }),
  });

  // 3) Confirmation au prospect (localisée, à la DA du château).
  const confirm = fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers,
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: data.email, name: fullName || data.email }],
      replyTo: REPLY_PUBLIC,
      subject: CONFIRM[lang].subject,
      htmlContent: confirmHtml(lang, data.prenom),
    }),
  });

  try {
    const [c, n, p] = await Promise.all([contact, notify, confirm]);
    if (!c.ok) console.error("[lead] Brevo contact:", c.status, await safeText(c));
    if (!n.ok) console.error("[lead] Brevo notif:", n.status, await safeText(n));
    if (!p.ok) console.error("[lead] Brevo confirm:", p.status, await safeText(p));
    return json({ ok: true, brevo: c.ok && n.ok && p.ok });
  } catch (e) {
    console.error("[lead] erreur Brevo:", e);
    // On ne bloque pas le prospect : le parcours se termine quand même.
    return json({ ok: true, brevo: false });
  }
}

function confirmHtml(lang, prenom) {
  const t = CONFIRM[lang];
  return `
  <div style="background:#f4f2ec;padding:32px 0;font-family:Helvetica,Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #e6dfce;border-radius:10px;overflow:hidden">
      <div style="background:#2e3a48;padding:22px 28px">
        <span style="color:#fff;font-family:Georgia,serif;font-size:20px;letter-spacing:.5px">Château de la Huberdière</span>
      </div>
      <div style="padding:30px 28px">
        <h1 style="font-family:Georgia,serif;color:#8B0000;font-size:22px;font-weight:normal;margin:0 0 16px">${t.title}</h1>
        <p style="color:#2e3a48;font-size:15px;line-height:1.65;margin:0 0 22px">${t.body(esc(prenom))}</p>
        <p style="color:#2e3a48;font-size:15px;margin:0">${t.signoff}</p>
        <hr style="border:none;border-top:1px solid #ece6d8;margin:26px 0">
        <p style="color:#646464;font-size:13px;line-height:1.6;margin:0">
          Vallée de Vaugadeland, 37530 Nazelles-Négron · +33 2 47 57 52 92<br>
          <a href="mailto:contact@chateaudelahuberdiere.com" style="color:#8B0000">contact@chateaudelahuberdiere.com</a> ·
          <a href="https://www.chateaudelahuberdiere.com" style="color:#8B0000">chateaudelahuberdiere.com</a>
        </p>
      </div>
    </div>
  </div>`;
}

// Déduit navigateur / OS / type d'appareil depuis le User-Agent.
function parseUA(s = "") {
  let browser = "Inconnu";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/.test(s)) browser = "Opera";
  else if (/SamsungBrowser/.test(s)) browser = "Samsung Internet";
  else if (/Chrome\//.test(s) && !/Chromium/.test(s)) browser = "Chrome";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/Version\/.*Safari/.test(s)) browser = "Safari";
  let os = "Inconnu";
  if (/Windows NT/.test(s)) os = "Windows";
  else if (/iPhone|iPad|iPod/.test(s)) os = "iOS";
  else if (/Mac OS X/.test(s)) os = "macOS";
  else if (/Android/.test(s)) os = "Android";
  else if (/Linux/.test(s)) os = "Linux";
  const device = /iPad|Tablet/.test(s) ? "Tablette" : /Mobi|iPhone|Android.*Mobile/.test(s) ? "Mobile" : "Ordinateur";
  return { browser, os, device };
}

// Normalise une source UTM (souvent abrégée) en libellé propre pour la notif.
// Ex. utm_source=ig, utm_medium=social -> « Réseaux sociaux (Instagram) ».
const SOURCE_NAMES = {
  ig: "Instagram", instagram: "Instagram", insta: "Instagram",
  fb: "Facebook", facebook: "Facebook", meta: "Facebook",
  li: "LinkedIn", linkedin: "LinkedIn",
  yt: "YouTube", youtube: "YouTube",
  tt: "TikTok", tiktok: "TikTok",
  x: "X", twitter: "X", pinterest: "Pinterest", snapchat: "Snapchat",
  google: "Google", gbp: "Fiche Google", "google-business": "Fiche Google",
  newsletter: "Newsletter", brevo: "Newsletter", email: "Email",
  "mariages-net": "Mariages.net", grandsgites: "Grands Gîtes",
  "gites-de-france": "Gîtes de France", abcsalles: "ABC Salles",
};
const SOCIAL_SOURCES = new Set([
  "ig", "instagram", "insta", "fb", "facebook", "meta", "li", "linkedin",
  "yt", "youtube", "tt", "tiktok", "x", "twitter", "pinterest", "snapchat",
]);
const DIRECTORY_SOURCES = new Set([
  "mariages-net", "grandsgites", "gites-de-france", "abcsalles", "zankyou",
  "booking", "airbnb", "tripadvisor",
]);

function labelFromUtm(data) {
  const s = (data.utm_source || "").toLowerCase().trim();
  const m = (data.utm_medium || "").toLowerCase().trim();
  const name = SOURCE_NAMES[s] || data.utm_source;
  if (SOCIAL_SOURCES.has(s) || m === "social") return `Réseaux sociaux (${name})`;
  if (DIRECTORY_SOURCES.has(s) || m === "referral") return `Annuaire / plateforme (${name})`;
  if (["newsletter", "brevo", "email"].includes(s) || m === "email") return "Newsletter";
  if (s === "gbp" || s === "google-business" || m === "gbp") return "Fiche Google";
  return m ? `${name} / ${m}` : name;
}

// Déduit un canal lisible à partir de l'UTM (prioritaire) puis du referrer d'entrée.
// Remplace l'ancien « Lien externe » opaque qui ne nommait aucune source.
function classifyChannel(data) {
  if (data.utm_source) return labelFromUtm(data);
  const r = (data.referrer || "").toLowerCase();
  if (!r) return "Accès direct";
  if (/(google|bing|yahoo|duckduckgo|qwant|ecosia|search\.brave)\./.test(r)) return "Recherche organique (SEO)";
  if (/(instagram|facebook|fb\.com|fb\.me|l\.facebook|lm\.facebook|t\.co|twitter|x\.com|linkedin|lnkd\.in|pinterest|youtube|youtu\.be|tiktok|snapchat)\./.test(r))
    return "Réseaux sociaux";
  if (/(mariages\.net|zankyou|abcsalles|1001salles|mariage\.net|grandsgites|gites-de-france|booking\.|airbnb|tripadvisor|le-guide-des-chateaux|chateauxhotels)/.test(r))
    return "Annuaire / plateforme";
  try {
    return `Référent : ${new URL(data.referrer).hostname.replace(/^www\./, "")}`;
  } catch (e) {
    return "Lien externe";
  }
}

// Mail de notification interne, brandé, avec un maximum de contexte sur le lead.
function notifyHtml(data, cibleLabel, meta, origin) {
  const full = `${data.prenom || ""} ${data.nom || ""}`.trim() || data.email;
  const rows = [
    ["Activité", cibleLabel],
    ["Canal (détecté)", origin],
    ["Source (utm_source)", data.utm_source],
    ["Support (utm_medium)", data.utm_medium],
    ["Campagne (utm_campaign)", data.utm_campaign],
    ["Mot-clé (utm_term)", data.utm_term],
    ["Contenu (utm_content)", data.utm_content],
    ["Page du formulaire", data.page],
    ["Page d'entrée (1re visite)", data.landing],
    ["Provenance (referrer)", data.referrer],
    ["Langue du site", meta.lang],
    ["Langue du navigateur", meta.browserLang],
    ["Localisation", meta.location],
    ["Appareil", meta.device],
    ["Navigateur", meta.browser],
    ["Système", meta.os],
    ["Google Ads (gclid)", data.gclid],
    ["ID lead", data.lead_id],
    ["Reçu le", meta.when],
  ]
    .filter(([, v]) => v)
    .map(
      ([l, v]) =>
        `<tr><td style="padding:7px 14px;color:#646464;font-size:13px;border-bottom:1px solid #f0ebdf;white-space:nowrap;vertical-align:top">${esc(l)}</td><td style="padding:7px 14px;color:#2e3a48;font-size:13px;border-bottom:1px solid #f0ebdf;word-break:break-word">${esc(v)}</td></tr>`
    )
    .join("");
  return `
  <div style="background:#f4f2ec;padding:32px 0;font-family:Helvetica,Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto;background:#fffdf9;border:1px solid #e6dfce;border-radius:10px;overflow:hidden">
      <div style="background:#8B0000;padding:18px 28px">
        <span style="color:#fff;font-family:Georgia,serif;font-size:18px">Nouvelle demande · Château de la Huberdière</span>
      </div>
      <div style="padding:26px 28px">
        <h1 style="font-family:Georgia,serif;color:#2e3a48;font-size:20px;font-weight:normal;margin:0 0 4px">${esc(full)}</h1>
        <p style="margin:0 0 18px;font-size:14px;color:#2e3a48">
          <a href="mailto:${esc(data.email)}" style="color:#8B0000">${esc(data.email)}</a>${
            data.telephone ? ` · <a href="tel:${esc(data.telephone)}" style="color:#8B0000">${esc(data.telephone)}</a>` : ""
          }
        </p>
        <div style="background:#fbfaf6;border-left:3px solid #8B0000;padding:14px 16px;border-radius:4px;margin:0 0 22px">
          <div style="color:#646464;font-size:12px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Message</div>
          <div style="color:#2e3a48;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(data.message) || "(pas de message)"}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #f0ebdf">${rows}</table>
      </div>
    </div>
  </div>`;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
function esc(s = "") {
  return String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
}
async function safeText(r) {
  try { return await r.text(); } catch { return ""; }
}

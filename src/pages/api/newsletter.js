// Inscription newsletter, en double confirmation depuis le 02/11/2026
// (src/lib/newsletter-optin.mjs) : ce point d'entrée n'inscrit plus personne, il
// envoie un lien signé ; l'adresse n'entre dans Brevo (liste "newsletter_form"
// id 17, tag Newsletter_Form) qu'au clic sur le bouton de /newsletter/confirmer.
// L'opt-in marketing plus fin reste géré côté Brevo (automation du client).
import { signerLien, saisieHumaine } from "../../lib/newsletter-optin.mjs";
export const prerender = false;

// Expéditeur : DOIT être un expéditeur validé du compte Brevo château (hello@ / lodovica.dalpozzo@).
// contact@ n'est PAS validé comme expéditeur → on envoie depuis hello@ et on répond vers contact@.
const SENDER = { name: "Château de la Huberdière", email: "hello@chateaudelahuberdiere.com" };
const REPLY_PUBLIC = { email: "contact@chateaudelahuberdiere.com", name: "Château de la Huberdière" };
const SITE = "https://www.chateaudelahuberdiere.com";

// Demande de confirmation envoyée à l'adresse saisie, localisée.
const CONFIRM = {
  fr: {
    subject: "Confirmez votre inscription à la lettre du château",
    title: "Une dernière étape",
    body: "Vous avez demandé à recevoir la lettre du Château de la Huberdière : nos saisons, nos événements et quelques idées pour la vallée de la Loire, quelques fois par an. Confirmez d'un clic.",
    button: "Confirmer mon inscription",
    ignore: "Vous n'avez rien demandé ? Ignorez ce message : sans confirmation, votre adresse n'est pas enregistrée.",
    signoff: "L'équipe du Château de la Huberdière",
  },
  en: {
    subject: "Confirm your subscription to the château newsletter",
    title: "One last step",
    body: "You asked to receive the Château de la Huberdière newsletter: our seasons, our events and a few ideas for the Loire Valley, a few times a year. Confirm with one click.",
    button: "Confirm my subscription",
    ignore: "Didn't ask for anything? Just ignore this message: without confirmation, your address is not recorded.",
    signoff: "The Château de la Huberdière team",
  },
  it: {
    subject: "Conferma l'iscrizione alla newsletter del castello",
    title: "Un ultimo passo",
    body: "Hai chiesto di ricevere la newsletter del Château de la Huberdière: le nostre stagioni, i nostri eventi e qualche idea per la Valle della Loira, qualche volta l'anno. Conferma con un clic.",
    button: "Confermo l'iscrizione",
    ignore: "Non hai chiesto nulla? Ignora questo messaggio: senza conferma, il tuo indirizzo non viene registrato.",
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

  // Anti-spam : champ piège, puis horodatage posé par le script de la page. Un
  // robot reçoit la même réponse qu'un humain, sans qu'aucun mail ne parte.
  if (data.website || !saisieHumaine(data.t)) return json({ ok: true });
  const email = (data.email || "").trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: "email_invalid" }, 422);
  }
  const lang = ["fr", "en", "it"].includes(data.lang) ? data.lang : "fr";

  const key = process.env.BREVO_API_KEY || import.meta.env.BREVO_API_KEY;
  const secret = process.env.CRON_SECRET || import.meta.env.CRON_SECRET;
  if (!key || !secret) {
    console.log("[newsletter] BREVO_API_KEY ou CRON_SECRET absente : demande de confirmation non envoyée");
    return json({ ok: true, brevo: false });
  }

  try {
    const lien = `${SITE}/newsletter/confirmer?j=${signerLien(email, lang, secret)}`;
    const m = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email }],
        replyTo: REPLY_PUBLIC,
        subject: CONFIRM[lang].subject,
        htmlContent: confirmHtml(lang, lien),
        tags: ["newsletter-confirmation"],
      }),
    });
    if (!m.ok) console.error("[newsletter] Brevo confirm:", m.status, await safeText(m));
    return json({ ok: true, brevo: m.ok });
  } catch (e) {
    console.error("[newsletter] erreur Brevo:", e);
    return json({ ok: true, brevo: false });
  }
}

function confirmHtml(lang, lien) {
  const t = CONFIRM[lang];
  return `
  <div style="background:#f4f2ec;padding:32px 0;font-family:Helvetica,Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #e6dfce;border-radius:10px;overflow:hidden">
      <div style="background:#2e3a48;padding:22px 28px">
        <span style="color:#fff;font-family:Georgia,serif;font-size:20px;letter-spacing:.5px">Château de la Huberdière</span>
      </div>
      <div style="padding:30px 28px">
        <h1 style="font-family:Georgia,serif;color:#8B0000;font-size:22px;font-weight:normal;margin:0 0 16px">${t.title}</h1>
        <p style="color:#2e3a48;font-size:15px;line-height:1.65;margin:0 0 22px">${t.body}</p>
        <p style="margin:0 0 24px"><a href="${lien}" style="display:inline-block;background:#8B0000;color:#fff;text-decoration:none;font-size:15px;padding:13px 24px">${t.button}</a></p>
        <p style="color:#646464;font-size:13px;line-height:1.6;margin:0 0 22px">${t.ignore}</p>
        <p style="color:#2e3a48;font-size:15px;margin:0">${t.signoff}</p>
        <hr style="border:none;border-top:1px solid #ece6d8;margin:26px 0">
        <p style="color:#646464;font-size:13px;line-height:1.6;margin:0">
          10 La Huberdière, 37530 Nazelles-Négron · +33 2 47 57 52 92<br>
          <a href="mailto:contact@chateaudelahuberdiere.com" style="color:#8B0000">contact@chateaudelahuberdiere.com</a> ·
          <a href="https://www.chateaudelahuberdiere.com" style="color:#8B0000">chateaudelahuberdiere.com</a>
        </p>
      </div>
    </div>
  </div>`;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
async function safeText(r) {
  try { return await r.text(); } catch { return ""; }
}

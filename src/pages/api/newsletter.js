// Inscription newsletter → Brevo (liste "newsletter_form" id 17 + tag Newsletter_Form)
// + mail de confirmation d'inscription au contact (localisé FR/EN/IT, à la DA du château).
// L'opt-in marketing plus fin reste géré côté Brevo (automation du client).
export const prerender = false;

const NEWSLETTER_LIST_ID = 17; // liste "newsletter_form" du compte château

// Expéditeur : DOIT être un expéditeur validé du compte Brevo château (hello@ / lodovica.dalpozzo@).
// contact@ n'est PAS validé comme expéditeur → on envoie depuis hello@ et on répond vers contact@.
const SENDER = { name: "Château de la Huberdière", email: "hello@chateaudelahuberdiere.com" };
const REPLY_PUBLIC = { email: "contact@chateaudelahuberdiere.com", name: "Château de la Huberdière" };

// Confirmation envoyée au nouvel inscrit, localisée.
const CONFIRM = {
  fr: {
    subject: "Bienvenue dans la lettre du château",
    title: "Votre inscription est confirmée",
    body: "Merci de rejoindre la lettre du Château de la Huberdière. Vous recevrez, quelques fois par an, nos saisons, nos événements et quelques inspirations pour la vallée de la Loire. À très bientôt.",
    signoff: "L'équipe du Château de la Huberdière",
  },
  en: {
    subject: "Welcome to the château newsletter",
    title: "Your subscription is confirmed",
    body: "Thank you for joining the Château de la Huberdière newsletter. A few times a year, we will share our seasons, our events and some inspiration for the Loire Valley. See you soon.",
    signoff: "The Château de la Huberdière team",
  },
  it: {
    subject: "Benvenuti nella newsletter del castello",
    title: "La tua iscrizione è confermata",
    body: "Grazie per esserti iscritto alla newsletter del Château de la Huberdière. Qualche volta l'anno condivideremo le nostre stagioni, i nostri eventi e qualche ispirazione per la Valle della Loira. A presto.",
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

  // Anti-spam : honeypot.
  if (data.website) return json({ ok: true });
  const email = (data.email || "").trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: "email_invalid" }, 422);
  }
  const lang = ["fr", "en", "it"].includes(data.lang) ? data.lang : "fr";

  const key = process.env.BREVO_API_KEY || import.meta.env.BREVO_API_KEY;
  if (!key) {
    console.log("[newsletter] BREVO_API_KEY absente — inscription non envoyée :", email);
    return json({ ok: true, brevo: false });
  }

  const headers = { "api-key": key, "content-type": "application/json", accept: "application/json" };
  try {
    // 1) Ajout du contact à la liste.
    const contact = fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        updateEnabled: true,
        listIds: [NEWSLETTER_LIST_ID],
        attributes: { FORM: ["Newsletter_Form"] },
      }),
    });

    // 2) Mail de confirmation d'inscription à l'abonné.
    const confirm = fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers,
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email }],
        replyTo: REPLY_PUBLIC,
        subject: CONFIRM[lang].subject,
        htmlContent: confirmHtml(lang),
      }),
    });

    const [c, m] = await Promise.all([contact, confirm]);
    if (!c.ok) console.error("[newsletter] Brevo contact:", c.status, await safeText(c));
    if (!m.ok) console.error("[newsletter] Brevo confirm:", m.status, await safeText(m));
    return json({ ok: true, brevo: c.ok && m.ok });
  } catch (e) {
    console.error("[newsletter] erreur Brevo:", e);
    return json({ ok: true, brevo: false });
  }
}

function confirmHtml(lang) {
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

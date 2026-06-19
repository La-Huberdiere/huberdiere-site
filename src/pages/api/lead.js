// Réception des formulaires du site → Brevo (CRM + email de notification).
// Tourne en fonction serverless sur Vercel. La clé API reste côté serveur.
export const prerender = false;

const TAGS = {
  mariage: "LP_Mariage",
  seminaire: "LP_Seminaire",
  stage: "LP_Stage",
  famille: "LP_Reunion_Famille",
  contact: "Contact_Form",
};

const OWNER_EMAIL = "contact@chateaudelahuberdiere.com";

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
  const key = process.env.BREVO_API_KEY || import.meta.env.BREVO_API_KEY;

  // Sans clé (démo), on n'échoue pas : on laisse le parcours se terminer.
  if (!key) {
    console.log("[lead] BREVO_API_KEY absente — lead non envoyé :", data.email, tag);
    return json({ ok: true, brevo: false });
  }

  const headers = { "api-key": key, "content-type": "application/json", accept: "application/json" };

  // 1) Contact dans le CRM (mêmes tags + UTM que le dashboard attend).
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
        UTM_SOURCE: data.utm_source || "",
        UTM_CAMPAIGN: data.utm_campaign || "",
      },
    }),
  });

  // 2) Notification à l'équipe (réception automatique du mail).
  const notify = fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers,
    body: JSON.stringify({
      sender: { name: "Site Huberdière", email: OWNER_EMAIL },
      to: [{ email: OWNER_EMAIL }],
      replyTo: { email: data.email, name: `${data.prenom || ""} ${data.nom || ""}`.trim() || data.email },
      subject: `Nouvelle demande ${data.cible || "contact"} — ${data.prenom || ""} ${data.nom || ""}`.trim(),
      htmlContent: `
        <h2 style="font-family:Georgia,serif;color:#8B0000">Nouvelle demande (${tag})</h2>
        <p><strong>${esc(data.prenom)} ${esc(data.nom)}</strong></p>
        <p>Email : <a href="mailto:${esc(data.email)}">${esc(data.email)}</a><br>
           Téléphone : ${esc(data.telephone) || "—"}</p>
        <p style="white-space:pre-wrap">${esc(data.message) || "(pas de message)"}</p>
        <hr>
        <p style="color:#646464;font-size:13px">Source : ${esc(data.utm_source) || "direct"} · Campagne : ${esc(data.utm_campaign) || "—"}</p>`,
    }),
  });

  try {
    const [c, n] = await Promise.all([contact, notify]);
    if (!c.ok) console.error("[lead] Brevo contact:", c.status, await safeText(c));
    if (!n.ok) console.error("[lead] Brevo email:", n.status, await safeText(n));
    return json({ ok: true, brevo: c.ok && n.ok });
  } catch (e) {
    console.error("[lead] erreur Brevo:", e);
    // On ne bloque pas le prospect : le parcours se termine quand même.
    return json({ ok: true, brevo: false });
  }
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

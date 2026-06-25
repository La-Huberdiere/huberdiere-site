// Inscription newsletter → Brevo (liste "newsletter_form" id 17 + tag Newsletter_Form).
// Endpoint léger, séparé de /api/lead : pas de mail de confirmation ni de notification,
// juste l'ajout du contact. L'opt-in marketing est géré côté Brevo (automation du client).
export const prerender = false;

const NEWSLETTER_LIST_ID = 17; // liste "newsletter_form" du compte château

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

  const key = process.env.BREVO_API_KEY || import.meta.env.BREVO_API_KEY;
  if (!key) {
    console.log("[newsletter] BREVO_API_KEY absente — inscription non envoyée :", email);
    return json({ ok: true, brevo: false });
  }

  const headers = { "api-key": key, "content-type": "application/json", accept: "application/json" };
  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        updateEnabled: true,
        listIds: [NEWSLETTER_LIST_ID],
        attributes: { FORM: ["Newsletter_Form"] },
      }),
    });
    if (!res.ok) console.error("[newsletter] Brevo:", res.status, await safeText(res));
    return json({ ok: true, brevo: res.ok });
  } catch (e) {
    console.error("[newsletter] erreur Brevo:", e);
    return json({ ok: true, brevo: false });
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
async function safeText(r) {
  try { return await r.text(); } catch { return ""; }
}

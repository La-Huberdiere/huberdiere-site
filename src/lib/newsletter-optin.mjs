// Double confirmation de l'inscription newsletter. Module pur, testé sous `node --test`.
//
// Jusqu'au 02/11/2026, le formulaire inscrivait l'adresse et lui envoyait aussitôt
// un mail de bienvenue : du 19 au 23/10, des robots y ont saisi 362 adresses, et le
// château a envoyé 574 mails non sollicités (13 rebonds définitifs, 1 plainte).
// Désormais le formulaire n'envoie qu'un lien ; l'adresse n'entre dans Brevo qu'au
// clic sur le bouton de la page de ce lien. Un bouton et pas le lien seul : les
// passerelles de sécurité des messageries ouvrent tous les liens d'un mail.

import { createHmac, timingSafeEqual } from "node:crypto"

export const LIEN_VALIDITE_MS = 7 * 86_400_000
const LANGUES = ["fr", "en", "it"]

// Clé dérivée, pour qu'une signature de lien ne vaille jamais pour un autre usage
// du même secret.
const signer = (charge, secret) => createHmac("sha256", `newsletter-optin:${secret}`).update(charge).digest("base64url")

export function signerLien(email, lang, secret, maintenant = Date.now()) {
  const charge = Buffer.from(JSON.stringify({
    e: String(email).trim().toLowerCase(),
    l: LANGUES.includes(lang) ? lang : "fr",
    x: maintenant + LIEN_VALIDITE_MS,
  })).toString("base64url")
  return `${charge}.${signer(charge, secret)}`
}

/** Adresse et langue du lien, ou null si le lien est faux ou expiré. */
export function lireLien(jeton, secret, maintenant = Date.now()) {
  const [charge, sig] = String(jeton ?? "").split(".")
  if (!charge || !sig || !secret) return null
  const attendu = Buffer.from(signer(charge, secret))
  const recu = Buffer.from(sig)
  if (attendu.length !== recu.length || !timingSafeEqual(attendu, recu)) return null
  try {
    const { e, l, x } = JSON.parse(Buffer.from(charge, "base64url").toString("utf8"))
    if (typeof e !== "string" || !e.includes("@") || !(x >= maintenant)) return null
    return { email: e, lang: LANGUES.includes(l) ? l : "fr" }
  } catch {
    return null
  }
}

// Horodatage posé par le script de la page à son chargement. Absent : l'envoi ne
// vient pas de la page. Trop récent : personne ne tape son adresse en 2 secondes.
export function saisieHumaine(t, maintenant = Date.now()) {
  const n = Number(t)
  if (!Number.isFinite(n) || n <= 0) return false
  const ecart = maintenant - n
  return ecart >= 2_000 && ecart <= 86_400_000
}

// fetch vers Brevo avec un délai maximal. Sans lui, un Brevo qui ne répond pas
// laissait le visiteur devant le formulaire jusqu'à la limite de la fonction
// (300 s). À l'expiration, la promesse est rejetée (TimeoutError) : `lead.js`
// l'attrape déjà et laisse le parcours se terminer.
export const BREVO_TIMEOUT_MS = 8000

export function fetchBrevo(url, init = {}, ms = BREVO_TIMEOUT_MS) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(ms) })
}

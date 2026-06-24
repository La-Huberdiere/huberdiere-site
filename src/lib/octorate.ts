// Moteur de réservation Octorate du Château de la Huberdière.
// siteKey récupéré sur le Wix en ligne (bouton "Réserver"), code propriété 27869.
//
// PIÈGES (vérifiés 2026-06-24) :
//  - book.octorate.com REFUSE l'iframe (X-Frame-Options en GET navigateur) → pas d'embed.
//  - result.xhtml n'accepte QUE siteKey. Ajouter lang/arrival/departure/adults → 404.
//    On reproduit donc EXACTEMENT le lien du Wix : result.xhtml?siteKey=…
//  - Moteur en JSF : aucun deeplink de dates par URL. Les dates se choisissent dans le moteur.
export const OCTORATE_SITE_KEY = "cfa59f3552d511c8205e1a2bf27d6662";

export const OCTORATE_BASE =
  "https://book.octorate.com/octobook/site/reservation/result.xhtml";

// Lien exact du moteur (identique au bouton « Réserver » du Wix actuel).
export function octorateUrl(): string {
  return `${OCTORATE_BASE}?siteKey=${OCTORATE_SITE_KEY}`;
}

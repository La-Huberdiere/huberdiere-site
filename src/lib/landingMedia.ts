// Photos par cible pour les pages activité (héros + galerie éditoriale).
// Sélectionnées dans la bibliothèque Wix par thème, optimisées (jpg + webp) dans
// public/images/landing/. Le composant MariagePage lit ce mapping via `cible`.
export const landingMedia: Record<string, { hero: string; gallery: string[] }> = {
  mariage: { hero: "/images/landing/mariage-hero.jpg", gallery: ["/images/landing/mariage-g1.jpg", "/images/landing/mariage-g2.jpg", "/images/landing/mariage-g3.jpg", "/images/landing/mariage-g4.jpg"] },
  seminaire: { hero: "/images/landing/seminaire-hero.jpg", gallery: ["/images/landing/seminaire-g1.jpg", "/images/landing/seminaire-g2.jpg", "/images/landing/seminaire-g3.jpg"] },
  famille: { hero: "/images/landing/famille-hero.jpg", gallery: ["/images/landing/famille-g1.jpg", "/images/landing/famille-g2.jpg", "/images/landing/famille-g3.jpg", "/images/landing/famille-g4.jpg"] },
  retraite: { hero: "/images/landing/retraite-hero.jpg", gallery: ["/images/landing/retraite-g1.jpg", "/images/landing/retraite-g2.jpg", "/images/landing/retraite-g3.jpg", "/images/landing/retraite-g4.jpg"] },
  sejour: { hero: "/images/landing/sejour-hero.jpg", gallery: ["/images/landing/sejour-g1.jpg", "/images/landing/sejour-g2.jpg", "/images/landing/sejour-g3.jpg", "/images/landing/sejour-g4.jpg"] },
  restauration: { hero: "/images/landing/restauration-hero.jpg", gallery: ["/images/landing/restauration-g1.jpg", "/images/landing/restauration-g2.jpg", "/images/landing/restauration-g3.jpg", "/images/landing/restauration-g4.jpg"] },
};

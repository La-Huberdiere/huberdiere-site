# Château de la Huberdière — V0 (Astro)

Maquette de migration Wix → Astro, à montrer pendant le call.
DA officielle (Playfair + Montserrat, crème/bordeaux), vraies photos du château,
SEO technique maîtrisé au niveau du code (head, schema JSON-LD corrigé, images
optimisées en webp, NAP cohérent).

## Lancer en local (pour le call)

```bash
cd site-v0
npm install      # une seule fois
npm run dev      # puis ouvrir http://localhost:4321
```

Pour partager une version en ligne (démo cliquable par le client) :

```bash
npm run build    # génère le dossier dist/
```

Puis déposer `dist/` sur Netlify Drop (https://app.netlify.com/drop) ou
Cloudflare Pages, pour obtenir une URL publique en deux minutes.

## Pages

- `/` : page d'accueil multi-activités (hero, esprit du lieu, 5 activités,
  galerie, situation, contact).
- `/mariage` : landing mariage (exemple de page money).

## Structure

- `src/pages/` : les pages (Astro).
- `src/layouts/Base.astro` : head, fonts, schema JSON-LD, header + footer, scripts.
- `src/components/` : Header, Footer.
- `src/styles/global.css` : la DA complète.
- `src/assets/` : photos (optimisées automatiquement par Astro au build).

## Ce que ça démontre

- Performance : images servies en webp responsive (ex. une photo de 1,9 Mo
  tombe à ~85 Ko).
- SEO : `<head>` maîtrisé, schema LodgingBusiness avec GPS justes + 42 avis,
  NAP cohérent en footer, viewport correct. Tout ce que l'audit pointait sur Wix.
- Édition : prêt à brancher Pages CMS (ou Keystatic) pour que le client édite
  textes, photos et articles de blog sans toucher au code.

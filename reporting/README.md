# Rapport SEO/GEO client — Château de la Huberdière

Reporting mensuel automatisé, envoyé au client sous forme de **lien HTML interactif**.
Montre la progression des positions Google, les articles publiés (et leurs mots-clés),
le netlinking, la note Google et la visibilité dans les réponses IA.

## Comment ça marche

- `reporting/generate-report.mjs` : tire les données DataForSEO (positions SERP locales,
  netlinking, fiche Google, visibilité IA sur 4 moteurs), lit les articles du repo
  (`src/content/articles/*.mdoc`, frontmatter `title` / `publishedAt` / `keywords`),
  historise dans `reporting/history.json` (pour la courbe de progression), et écrit
  `reporting/dist/index.html` (page interactive Chart.js, charte Huberdière).
- `.github/workflows/monthly-report.yml` : le 3 de chaque mois (ou à la demande),
  exécute le script et publie `reporting/dist` sur **GitHub Pages**. L'URL Pages est
  le lien à transmettre au client.

## Mots-clés suivis

Termes locaux / longue traîne, gagnables et alignés sur les articles (le générique
national « mariage au château » est trusté par les agrégateurs, sans intérêt pour le
suivi). Le château apparaît déjà en page 1 sur « mariage château touraine ». Édition
dans `KEYWORDS` en tête du script.

## Configuration (une fois)

Secrets du repo (déjà posés) : `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`.
GitHub Pages : source = GitHub Actions (activé).

## Lancer manuellement

```bash
# En local (aperçu) :
export DATAFORSEO_LOGIN=... DATAFORSEO_PASSWORD=...
node reporting/generate-report.mjs        # → reporting/dist/index.html
# Forcer un mois précis : node reporting/generate-report.mjs --month=2026-08

# Déclencher la GitHub Action à la demande :
gh workflow run "Rapport SEO mensuel (client)"
```

## Notes

- La « montée » des mots-clés s'enrichit à chaque run : le mois 1 est la base, la
  tendance apparaît dès le mois 2 (historique cumulé dans `history.json`).
- Les réponses IA varient d'un run à l'autre (non déterministe) : c'est une tendance,
  pas une mesure exacte.
- La page porte `noindex,nofollow` : elle n'est pas indexée par Google.

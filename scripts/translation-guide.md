# Guide de traduction FR → EN / IT — Château de la Huberdière

Référence unique pour toute traduction du site. Traduction faite par Claude (contextuelle),
pas par DeepL. Objectif : une VO française rendue juste, idiomatique et « château », pas du
mot-à-mot. Ce guide sert aussi le skill `redige-huberdiere` pour les nouveaux articles.

## Règles dures (jamais enfreintes)

1. **Positionnement : hôtel de charme 3 étoiles, JAMAIS « chambre d'hôtes » comme statut.**
   Le mot-clé « chambre d'hôtes » est autorisé en title/meta/keywords et comme THÈME
   (« envie d'une chambre d'hôtes à Amboise ? », « l'esprit d'une maison d'hôtes »), mais on
   ne revendique jamais l'être.
   - Interdit FR : « nous sommes une chambre d'hôtes », « nos chambres d'hôtes », « les chambres
     d'hôtes du château ».
   - Interdit EN : « our/the guesthouse » (comme statut), « we are a bed and breakfast ».
   - Interdit IT : « le nostre camere per ospiti », « siamo un bed & breakfast ».
   - Opposer « à un hôtel ordinaire/classique », jamais « à un hôtel » (ils en sont un).

2. **Zéro tiret cadratin `—`** nulle part (titres, corps, metas inclus). Remplacer par point,
   virgule, deux-points, ou reformuler.

3. **Chiffres canoniques, identiques dans les 3 langues** : 14 hectares, 10 chambres,
   21 couchages / 21 personnes en privatisation, 2 h 20 de Paris (EN « 2 hrs 20 from Paris » /
   « 2h20 »; IT « 2 ore e 20 da Parigi »). Jamais « 2 h » / « two hours » / « due ore ».

## Lexique canonique (à respecter systématiquement)

| FR | EN | IT |
|---|---|---|
| château | château | castello |
| hôtel de charme (3 étoiles) | charming (3-star) hotel / boutique hotel | hotel di charme (a 3 stelle) |
| maison / chambre d'hôtes (esprit, thème) | bed and breakfast / guesthouse | bed & breakfast |
| l'esprit maison d'hôtes | the guesthouse spirit / the spirit of a B&B | lo spirito del bed & breakfast |
| retraite (séjour bien-être/yoga) | retreat | ritiro  (JAMAIS pensione / vacanze) |
| stage | course / workshop | corso / stage |
| séminaire | seminar / corporate retreat | seminario |
| table d'hôtes | table d'hôtes / the host's table | tavola dell'ospite / cena in tavola |
| planches (à partager) | sharing boards / platters | taglieri |
| demi-pension / pension complète | half board / full board | mezza pensione / pensione completa |
| couchages | beds / sleeps X | posti letto |
| privatisation (du domaine) | exclusive use / private hire | affitto in esclusiva |
| parc (14 ha) | grounds / park | parco |
| piscine chauffée / couloir de nage | heated pool / lap pool | piscina riscaldata / corsia di nuoto |
| gîte | holiday cottage | casa vacanze (dans le corps/FAQ, pas en vitrine) |
| droit de bouchon | corkage | diritto di tappo |

- **Noms de chambres NON traduits** : Paradis Sauvage, Giboulée, Pêche, Thé, Mirage, Allium,
  Bouquet, Cactus, Ponceau, Bleu Indien. (Le script les saute déjà via le champ `name`.)
- **Noms propres NON traduits** : Lodovica, Patrick, Nazelles-Négron, Amboise, Touraine,
  Loire, Clos Lucé, Chenonceau, Chambord, etc. « de Lodovica » = « Lodovica's » (EN) /
  « di Lodovica » (IT), JAMAIS « at Lodovica ».

## Ponctuation et typographie

- FR : guillemets français « … » avec espaces insécables, apostrophes courbes ’.
- EN : straight or curly quotes “…”, apostrophe ’ (Lodovica’s).
- IT : virgolette « … » ou "…", apostrofo ’.
- **Jamais d'entité HTML dans le texte** (`&amp;`, `&quot;`…). Écrire le caractère réel
  (`&`, `"`). Astro échappe à l'affichage ; une entité dans la source = double-encodage.
- Nombres/prix : garder le format et les unités tels quels (« 4 000 € », « 70 € HT »,
  « 16 x 3 m »). EN « excl. VAT » pour « HT », IT « IVA esclusa ».

## SEO (title, meta, keywords) — ne pas traduire littéralement, LOCALISER

- **keywords** : produire les vrais termes de recherche du marché cible (EN britannique,
  IT), pas un calque du FR. Ex. « location château mariage » → EN « château wedding venue »,
  IT « castello per matrimoni ». Cohérents avec le sujet de la page.
- **title** : 55-62 caractères, mot-clé cible en tête + différenciateur. Séparateur « · »
  (jamais « — »). Suffixe de marque « · Château de la Huberdière » si présent en FR.
- **description / meta** : 145-158 caractères, mot-clé + preuve concrète + CTA. Ton château.

## Champs à NE PAS traduire (recopiés tels quels)

`email`, `phone`, `phoneHref`, tout `*href`, `name` (noms de chambres), `size` (surfaces),
`photo`/`photos` (chemins), `brandName`. Le script `i18n.mjs` s'en charge automatiquement.
Le champ `big` (gros chiffre des stats) EST traduit : garder chiffres/unités, ne traduire
que les mots (« Le jeudi » → « On Thursdays » / « Il giovedì » ; « 6 soirs/7 » →
« 6 nights/7 » / « 6 sere/7 »).

## Ton

Élégant mais accessible, incarné (voix des hôtes). Pas de jargon marketing, pas de
superlatifs empilés. Une UI luxe avec une copy « plongez dans » reste grillée : écrire comme
Lodovica ou Patrick le diraient à voix haute.

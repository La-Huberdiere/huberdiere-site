// Page jointe au rapport, servie à /rapport?doc=satisfaction derrière le même mot de
// passe : le projet « faire circuler la satisfaction » présenté au call de novembre 2026.
// Version 2 du 03/11 : la photo de départ est abandonnée (dette technique), restent la carte
// postale et la séquence après séjour. Source : satisfaction/sequence-post-sejour.md. Aucune
// rémunération d'Alexis ici : elle se discute avec le périmètre contractuel, pas sur une page
// client. Les schémas sont en HTML et CSS, pas en image, pour se replier sur téléphone ; le
// sens n'est jamais porté par la couleur seule, le client imprime en noir et blanc.

import { insecables } from "./rapport-encarts.mjs"

const IMG = "/images/satisfaction"

const figure = (src, alt, w, h, legende) => `<figure>
  <img src="${IMG}/${src}" alt="${alt}" width="${w}" height="${h}" loading="lazy">
  ${legende ? `<figcaption>${legende}</figcaption>` : ""}
</figure>`

// Un mail de la séquence : pourquoi il part à ce moment, et son texte dépliable.
const mail = ({ quand, objet, demande, pourquoi, texte, variantes }) => `<article class="mail">
  <div class="mail-tete"><span class="mail-quand">${quand}</span><span class="mail-objet">${objet}</span></div>
  <p class="mail-demande">Ce qu'il demande : <strong>${demande}</strong></p>
  ${pourquoi}
  <details><summary>Lire le mail</summary><div class="mail-texte">${texte}</div>${variantes ? `<div class="mail-variantes">${variantes}</div>` : ""}</details>
</article>`

const STYLE = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Montserrat:wght@400;500;600&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">
<style>
  .sat{max-width:700px;margin:0 auto;padding:52px 22px 80px}
  .sat h1{font-family:'Playfair Display',Georgia,serif;font-size:34px;font-weight:600;margin:0 0 12px;line-height:1.15}
  .sat h2{font-family:'Playfair Display',Georgia,serif;font-size:23px;font-weight:600;margin:52px 0 12px;padding-top:16px;border-top:2px solid var(--wine)}
  .sat h3{font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:600;margin:28px 0 6px}
  .sat p,.sat li{font-size:15px}
  .sat .chapo{color:var(--muted);font-size:16px;max-width:60ch}
  .sat .maison{color:var(--wine);font-size:13px;margin:0 0 6px}
  .sat strong{color:var(--ink)}
  .projet{font-family:'Playfair Display',Georgia,serif;font-style:italic;color:var(--wine);font-size:15px;margin:52px 0 -40px}
  .note{color:var(--muted);font-size:13px}
  figure{margin:16px 0 6px}
  figure img{display:block;width:100%;height:auto;border:1px solid var(--line)}
  figcaption{color:var(--muted);font-size:13px;margin-top:6px}

  /* Les deux moteurs : un séjour réussi, deux publics, une même arrivée. */
  .moteurs{display:grid;grid-template-columns:1fr 1fr;gap:0 28px;margin:22px 0 8px;text-align:center}
  .moteurs .depart,.moteurs .arrivee{grid-column:1/-1;justify-self:center;padding:12px 22px;font-family:'Playfair Display',Georgia,serif;font-size:17px}
  .moteurs .depart{border:2px solid var(--ink)}
  .moteurs .arrivee{background:var(--wine);color:#fff;border:2px solid var(--wine)}
  .moteurs .fleche{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:28px;height:34px}
  .moteurs .fleche span{position:relative}
  .moteurs .fleche span::before{content:"";position:absolute;left:50%;top:4px;bottom:8px;border-left:2px solid var(--ink)}
  .moteurs .fleche span::after{content:"";position:absolute;left:calc(50% - 5px);bottom:2px;border:6px solid transparent;border-top:8px solid var(--ink);border-bottom:0}
  .moteurs .voie{border-top:3px solid var(--wine);background:#fff;padding:14px 16px;text-align:left}
  .moteurs .voie h3{margin:0 0 4px;font-size:17px}
  .moteurs .voie p{margin:0 0 6px;font-size:14px}
  .moteurs .voie .par{color:var(--muted);font-size:13px;margin:8px 0 0}

  /* La carte postale, verso annoté. Tailles en cqw : elle se dessine pareil à toute largeur. */
  .carte-verso{container-type:inline-size;margin:20px 0 8px}
  .carte{position:relative;aspect-ratio:3/2;background:#fbf8f1;border:1px solid #d9d1bf;box-shadow:0 10px 28px rgba(33,33,33,.12);display:grid;grid-template-columns:1fr 1fr;overflow:hidden}
  .carte .gauche{padding:5cqw 4cqw 4cqw 8cqw;border-right:1px solid #d9d1bf;margin:4cqw 0;font-family:'Caveat',cursive;font-size:4.2cqw;line-height:1.25;color:#2E3A48;display:flex;flex-direction:column}
  .carte .gauche p{margin:0;font-size:inherit}
  .carte .signe{margin-top:auto!important;color:var(--wine);font-size:4cqw!important}
  .carte .droite{position:relative;padding:4cqw}
  .carte .timbre{position:absolute;right:4cqw;top:4cqw;width:13cqw;padding:1.2cqw;background:#fff;
    -webkit-mask:linear-gradient(#000 0 0) content-box,radial-gradient(circle,transparent 0.42cqw,#000 0.47cqw) -0.6cqw -0.6cqw/1.2cqw 1.2cqw;
            mask:linear-gradient(#000 0 0) content-box,radial-gradient(circle,transparent 0.42cqw,#000 0.47cqw) -0.6cqw -0.6cqw/1.2cqw 1.2cqw;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.2))}
  .carte .timbre img{display:block;width:100%;height:auto;border:0}
  .carte .timbre i{display:block;font-style:normal;font-family:'Montserrat',sans-serif;font-size:1.25cqw;font-weight:600;letter-spacing:.02em;color:#212121;padding-top:.6cqw}
  .carte .cachet{position:absolute;right:17cqw;top:9cqw;width:17cqw;height:17cqw;transform:rotate(-12deg);opacity:.85}
  .carte .dateur{position:absolute;right:3cqw;top:24cqw;font-family:'Courier New',monospace;font-weight:700;font-size:2cqw;color:var(--wine);border:.35cqw solid var(--wine);padding:.5cqw 1.2cqw;transform:rotate(4deg);opacity:.85}
  .carte .adresse{position:absolute;left:8cqw;right:4cqw;bottom:6cqw;font-family:'Caveat',cursive;font-size:4.2cqw;color:#2E3A48;line-height:1.5}
  .carte .adresse span{display:block;border-bottom:1px solid #cfc6b2}
  .carte .num{position:absolute;width:5cqw;height:5cqw;border-radius:50%;background:var(--ink);color:#fff;font-family:'Montserrat',sans-serif;font-weight:600;font-size:2.6cqw;display:grid;place-items:center;z-index:2;box-shadow:0 0 0 .5cqw #fbf8f1}
  .legende-carte{list-style:none;margin:16px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}
  .legende-carte li{display:grid;grid-template-columns:26px 1fr;gap:10px;font-size:14px;margin:0}
  .legende-carte b{width:24px;height:24px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:600}

  /* Le trajet de la carte. */
  .trajet{list-style:none;margin:20px 0 6px;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:0}
  .trajet li{position:relative;padding:12px 14px 12px 0;border-top:2px solid var(--ink);margin:0;font-size:14px}
  .trajet li::before{content:"";position:absolute;left:0;top:-7px;width:12px;height:12px;border-radius:50%;background:var(--cream);border:2px solid var(--ink)}
  .trajet li:last-child::before{background:var(--wine);border-color:var(--wine)}
  .trajet b{display:block;font-family:'Playfair Display',Georgia,serif;font-size:16px;font-weight:600;margin:6px 0 2px}
  .trajet .qui{display:block;color:var(--muted);font-size:12px}

  .deux{display:grid;grid-template-columns:1fr 1fr;gap:28px}
  .deux h3{margin-top:4px}
  .objet{display:grid;grid-template-columns:minmax(0,1fr) 200px;gap:24px;align-items:start}

  /* La frise de la séquence : une colonne par moment, une ligne par canal de réservation. */
  .frise{display:grid;grid-template-columns:118px repeat(6,minmax(0,1fr));gap:6px;margin:22px 0 8px;font-size:13px}
  .frise .t{font-weight:600;font-size:12px;color:var(--muted);padding:0 2px 4px;border-bottom:2px solid var(--ink)}
  .frise .canal{font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:600;padding:10px 6px 0 0;line-height:1.2}
  .frise .canal small{display:block;font-family:'Montserrat',sans-serif;font-weight:400;font-size:12px;color:var(--muted);margin-top:2px}
  .frise .c{background:#fff;border:1px solid var(--ink);padding:9px 8px;line-height:1.3;min-height:74px;hyphens:auto;-webkit-hyphens:auto;overflow-wrap:break-word}
  .frise .c b{display:block;font-weight:600;margin-bottom:3px}
  .frise .c em{display:block;font-style:normal;color:var(--muted);font-size:12px}
  .frise .c.objet-c{border:1px solid var(--line);background:var(--cream)}
  .frise .c.booking{border:1px dashed var(--ink);background:transparent}
  .frise .c.vide{border:0;background:none;min-height:0}
  .frise .q{display:none}
  .frise .rien{grid-column:span 3;align-self:center;color:var(--muted);font-size:12px;padding:0 8px;border-left:1px solid var(--line)}
  .legende-frise{display:flex;flex-wrap:wrap;gap:8px 22px;font-size:13px;color:var(--muted);margin:10px 0 0}
  .legende-frise span::before{content:"";display:inline-block;width:18px;height:12px;margin-right:6px;vertical-align:-1px}
  .legende-frise .l1::before{border:1px solid var(--ink);background:#fff}
  .legende-frise .l2::before{border:1px dashed var(--ink)}
  .legende-frise .l3::before{border:1px solid var(--line);background:var(--cream)}

  /* La boîte de réception du client, telle qu'il la verra. */
  .boite{max-width:380px;margin:20px auto 6px;border:1px solid var(--line);border-radius:18px;background:#fff;padding:14px 0 6px;box-shadow:0 8px 24px rgba(33,33,33,.08)}
  .boite .titre{font-weight:600;font-size:15px;padding:0 18px 8px;border-bottom:1px solid var(--line)}
  .boite .ligne{display:grid;grid-template-columns:34px 1fr auto;gap:10px;padding:10px 18px;border-bottom:1px solid #f0ebe0;align-items:start}
  .boite .ligne:last-child{border-bottom:0}
  .boite .av{width:34px;height:34px;border-radius:50%;background:var(--wine);color:#fff;font-family:'Playfair Display',Georgia,serif;display:grid;place-items:center;font-size:15px}
  .boite .ligne>span:nth-child(2){min-width:0}
  .boite .de,.boite .obj,.boite .apercu{display:block}
  .boite .de{font-weight:600;font-size:13px}
  .boite .obj{font-size:13px;color:var(--ink)}
  .boite .apercu{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .boite .j{font-size:12px;color:var(--muted);white-space:nowrap}

  .mail{border-left:3px solid var(--wine);padding:2px 0 2px 18px;margin:26px 0}
  .mail-tete{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline}
  .mail-quand{font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:var(--wine)}
  .mail-objet{font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:600}
  .mail-demande{font-size:14px!important;margin:4px 0 8px;color:var(--muted)}
  .mail p{margin:0 0 8px}
  details{margin-top:6px}
  summary{cursor:pointer;color:var(--wine);font-size:14px;font-weight:500}
  .mail-texte{background:#fff;border:1px solid var(--line);padding:16px 18px;margin-top:8px;font-size:14px}
  .mail-texte p{font-size:14px;margin:0 0 10px}
  .mail-texte .bouton{display:inline-block;background:var(--wine);color:#fff;padding:7px 14px;font-size:13px}
  .mail-texte .a-valider{color:var(--muted);font-style:italic}
  .mail-variantes{font-size:13px;color:var(--muted);margin-top:8px}
  .mail-variantes p{font-size:13px}

  .regles{list-style:none;margin:14px 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}
  .regles li{margin:0;padding-left:16px;border-left:2px solid var(--ink);font-size:14px}
  .regles b{display:block}

  table{width:100%;border-collapse:collapse;font-size:14px;margin-top:10px}
  th,td{text-align:left;padding:9px 6px;border-bottom:1px solid var(--line);vertical-align:top}
  th{font-weight:600;font-size:13px}
  td.num,th.num{text-align:right;white-space:nowrap}
  tr.total td{font-weight:600;border-top:2px solid var(--ink)}
  .sous{display:block;color:var(--muted);font-size:12px}
  ol.trancher{padding-left:20px}
  ol.trancher li{margin:0 0 10px}
  .dates{list-style:none;margin:0;padding:0}
  .dates li{display:grid;grid-template-columns:150px 1fr;gap:14px;padding:10px 0;border-bottom:1px solid var(--line);margin:0}
  .dates b{color:var(--wine);font-weight:600}

  @media screen and (max-width:720px){
    .sat h1{font-size:28px}
    .deux,.objet,.regles,.legende-carte{grid-template-columns:1fr;gap:16px}
    .objet figure{max-width:220px}
    .moteurs{grid-template-columns:1fr;gap:12px}
    .moteurs .fleche{grid-template-columns:1fr;height:26px}
    .moteurs .fleche span+span{display:none}
    .trajet{grid-template-columns:1fr}
    .trajet li{border-top:0;border-left:2px solid var(--ink);padding:0 0 18px 20px}
    .trajet li::before{left:-7px;top:2px}
    .trajet b{margin-top:0}
    .frise{grid-template-columns:1fr;gap:6px}
    .frise .t,.frise .c.vide{display:none}
    .frise .canal{padding:18px 0 4px;border-bottom:2px solid var(--ink)}
    .frise .c{min-height:0;display:grid;grid-template-columns:88px 1fr;gap:2px 10px}
    .frise .c .q{display:block;grid-row:span 3;font-weight:600;color:var(--wine)}
    .frise .rien{grid-column:auto;border-left:0;padding:4px 0}
    .dates li{grid-template-columns:1fr;gap:2px}
  }
  @media print{
    .rapport-nav{display:none!important}
    body{background:#fff;color:#000}
    .sat{max-width:none;padding:0}
    .sat h2{border-top-color:#000;break-after:avoid}
    .dates b,.sat .maison,.projet,.mail-quand{color:#000}
    .mail{border-left-color:#000}
    details>*{display:block}
    figure,tr,.mail,.carte-verso,.frise,.moteurs,.boite{break-inside:avoid}
  }
</style>`

const CACHET = `<svg class="cachet" viewBox="0 0 100 100" aria-hidden="true">
  <defs><path id="rond" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0"/></defs>
  <circle cx="50" cy="50" r="46" fill="none" stroke="#8B0000" stroke-width="2.4"/>
  <circle cx="50" cy="50" r="27" fill="none" stroke="#8B0000" stroke-width="1.4"/>
  <text font-family="Montserrat,sans-serif" font-size="7.3" font-weight="600" fill="#8B0000" letter-spacing=".25"><textPath href="#rond">POSTÉ AU CHÂTEAU DE LA HUBERDIÈRE · AMBOISE ·</textPath></text>
  <text x="50" y="47" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-size="11" font-style="italic" fill="#8B0000">la maison</text>
  <text x="50" y="60" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-size="11" font-style="italic" fill="#8B0000">poste</text>
</svg>`

export function satisfactionPage(head) {
  const nav = `<div class="rapport-nav" style="background:var(--wine);color:#fff;font-family:'Montserrat',system-ui,sans-serif;font-size:13px;padding:10px 18px;display:flex;align-items:center">
    <a href="/rapport" style="color:#fff;text-decoration:none;font-weight:600">← Tous les rapports</a>
  </div>`

  const mails = [
    mail({
      quand: "J+2",
      objet: "Bien rentrés ?",
      demande: "rien, une question ouverte",
      pourquoi: `<p>Le premier mail ne demande rien. Il pose une seule question : « y a-t-il une chose que nous aurions pu mieux faire ? ». Un client déçu le dit ici, à Lodovica, plutôt qu'en public. Et celui qui a été écouté écrit ensuite un avis plus juste, souvent plus chaleureux.</p>`,
      texte: `<p>Bonjour Camille,</p>
        <p>La maison est redevenue calme depuis votre départ. Merci d'être venus.</p>
        <p class="a-valider">Ici, une ligne de Lodovica sur la semaine au château : ce qui pousse au potager, ce qui change dans le parc.</p>
        <p>Une question, une seule : y a-t-il une chose que nous aurions pu mieux faire ? Répondez simplement à ce mail. C'est Lodovica qui lit les réponses, et elle y répond.</p>
        <p>Bonne reprise,<br>Lodovica et Patrick</p>`,
      variantes: `<p>Aucun lien. Une réponse mécontente ne retire pas le client de la suite.</p>`,
    }),
    mail({
      quand: "J+6",
      objet: "Une faveur, si vous avez deux minutes",
      demande: "un avis sur Google",
      pourquoi: `<p>Six jours après, le souvenir est encore précis et la reprise est passée. Ce mail remplace celui qu'Octorate envoie aujourd'hui à J+7. La différence tient à une phrase : un couple marié lit « racontez votre mariage », une équipe lit « racontez votre séminaire ». Chacun écrit alors avec ses propres mots les avis que cherchent les suivants, sans qu'on lui en dicte un seul.</p>
        <p>Les avis comptent deux fois. Ils rassurent ceux qui hésitent, et Google s'en sert pour classer les établissements sur Maps : le nombre et la note d'un lieu font partie de ce qu'il appelle sa notoriété. C'est justement ce qui manque au château sur la carte, où il disparaît à moins de deux kilomètres.</p>`,
      texte: `<p>Bonjour Camille,</p>
        <p>Ceux qui hésitent à venir chez nous lisent d'abord ce qu'en disent les clients d'avant eux.</p>
        <p>Si vous avez deux minutes, racontez votre séjour sur Google. Quelques lignes suffisent, une phrase aussi.</p>
        <p><span class="bouton">Écrire mon avis</span></p>
        <p>Merci,<br>Lodovica et Patrick</p>`,
      variantes: `<p><strong>Mariage :</strong> « racontez votre mariage sur Google. Les couples qui cherchent un lieu lisent ces avis avant de nous appeler. »</p>
        <p><strong>Séminaire :</strong> « racontez votre séminaire sur Google. Les équipes qui cherchent un lieu les lisent avant de nous écrire. »</p>
        <p>Le bouton ouvre directement le formulaire d'avis de la fiche. Pas de relance.</p>`,
    }),
    mail({
      quand: "J+14",
      objet: "Pour vos amis qui partent en Val de Loire",
      demande: "transmettre le carnet à un proche",
      pourquoi: `<p>C'est le moment que Patrick appelait la « soirée diapo » : les quinze jours où l'on montre ses photos et où un ami demande « c'était où ? ». Le mail donne au client quelque chose à transmettre qui a de la valeur en soi, le carnet d'adresses de Lodovica, utile même à qui ne dort pas au château. Rien à vendre, aucune remise : un ami qui vient « de la part de » est accueilli comme un ami de la maison.</p>`,
      texte: `<p>Bonjour Camille,</p>
        <p>Les photos du séjour ont peut-être déjà circulé. Si quelqu'un vous a demandé où c'était, voici de quoi lui répondre.</p>
        <p>Lodovica a réuni dans un carnet les adresses qu'elle donne à ses propres amis : où dîner à Amboise, où louer un vélo pour suivre la Loire, quels sentiers prendre dans les vignes. Il se lit sans avoir dormi chez nous.</p>
        <p><span class="bouton">Offrir le carnet</span></p>
        <p>Et si l'un d'eux vient un jour, qu'il donne votre nom en réservant. Nous l'accueillerons comme un ami de la maison.</p>
        <p>À bientôt peut-être,<br>Lodovica et Patrick</p>`,
      variantes: `<p>Le bouton ouvre un partage par WhatsApp, SMS ou mail, avec un message prêt et modifiable : « Je te passe le carnet de Lodovica, du château où on a dormi près d'Amboise. Ses adresses valent le coup même si tu ne dors pas là-bas. »</p>
        <p><strong>Mariage :</strong> « Vos invités ont vu le château. Si l'un d'eux prépare son mariage, nous faisons visiter sur rendez-vous », avec la page mariage.</p>
        <p><strong>Séminaire :</strong> « Si un collègue cherche un lieu pour le prochain séminaire de son équipe », avec la page séminaire.</p>`,
    }),
    mail({
      quand: "La saison suivante",
      objet: "Revenir",
      demande: "réserver, en direct",
      pourquoi: `<p>Un client qui revient coûte moins cher que n'importe quel nouveau, et il réserve sans commission de plateforme. Le mail part au moment où l'envie de repartir se décide, et il change selon le séjour.</p>`,
      texte: `<p><strong>Séjour, au début de la saison.</strong></p>
        <p class="a-valider">Deux lignes de Lodovica sur ce qui se passe au château cette saison.</p>
        <p>Si l'envie vous prend de revenir, réservez directement chez nous.</p>
        <p><span class="bouton">Voir les disponibilités</span></p>
        <p><strong>Mariage, un an jour pour jour.</strong> Objet : Un an déjà</p>
        <p>Il y a un an, vous vous disiez oui dans le parc. Il a refleuri depuis. Si vous voulez fêter votre anniversaire là où tout a commencé, nous serons heureux de vous recevoir.</p>
        <p><strong>Séminaire, vers dix mois.</strong> Objet : On garde vos dates pour l'an prochain ?</p>
        <p>L'an dernier à la même période, votre équipe était au château. Si un nouveau séminaire se prépare, dites-nous vos dates, nous les tiendrons de côté le temps que vous décidiez.</p>`,
    }),
  ].join("")

  const corps = insecables(`
<body>
  ${nav}
  <main class="sat">
    <p class="maison">Château de la Huberdière, projet pour le call de novembre 2026</p>
    <h1>Faire circuler la satisfaction</h1>
    <p class="chapo">Vos clients repartent contents. Ce projet leur donne les moyens de le dire, à leurs amis et aux inconnus qui hésitent, sans rien leur demander de plus qu'un geste. Deux projets, sans aucune remise ni contrepartie. Tout est à l'état de maquette : rien n'est imprimé ni envoyé avant votre accord.</p>

    <h2>Deux moteurs, une même arrivée</h2>
    <p>Un séjour réussi fait venir de nouveaux clients par deux chemins. Les proches, qui entendent le récit et voient la carte arriver. Les inconnus, qui lisent les avis avant de réserver. Le premier projet travaille le premier chemin, le second travaille les deux.</p>
    <div class="moteurs" role="img" aria-label="Schéma : un séjour réussi alimente deux chemins, les proches et les inconnus, qui mènent tous deux à de nouvelles réservations en direct">
      <div class="depart">Un séjour réussi</div>
      <div class="fleche"><span></span><span></span></div>
      <div class="voie">
        <h3>Les proches</h3>
        <p>Une carte postale arrive chez eux, un carnet d'adresses leur est transmis.</p>
        <p class="par">Par la carte postale (projet 1) et le mail du carnet (projet 2).</p>
      </div>
      <div class="voie">
        <h3>Les inconnus</h3>
        <p>Ils cherchent un lieu sur Google, lisent les avis et choisissent.</p>
        <p class="par">Par les demandes d'avis Google et Booking (projet 2).</p>
      </div>
      <div class="fleche"><span></span><span></span></div>
      <div class="arrivee">De nouvelles demandes, « de la part de » ou en direct</div>
    </div>
    <p class="note">Aujourd'hui, le bouche à oreille ne se voit presque pas : en septembre, une demande sur treize s'est déclarée venue par une recommandation. Le champ « De la part de qui ? » du formulaire, en ligne depuis octobre, mesurera l'effet du projet.</p>

    <p class="projet">Projet 1</p>
    <h2>La carte postale, postée par la maison</h2>
    <p>Une carte du château attend dans chaque chambre. Le client l'écrit, la dépose à l'accueil, et la maison la poste pour lui. Elle arrive chez un ami pendant ou juste après le séjour, avec l'écriture de quelqu'un qu'il connaît, et elle reste des semaines sur un frigo. C'est le seul geste du projet qui touche aussi les clients étrangers et ceux venus par Booking.</p>
    <p>Une carte postale ordinaire, tout le monde en a reçu. Quatre détails font de celle-ci un objet qu'on garde, sans un seul outil numérique.</p>

    <div class="carte-verso" role="img" aria-label="Maquette du verso de la carte postale : texte manuscrit du client, mot de Lodovica, timbre à l'image du château, cachet bordeaux de la maison et tampon dateur, adressée à soi-même">
      <div class="carte">
        <div class="gauche">
          <p>On a dîné sous le cèdre, Lodovica nous a gardé la meilleure table. Le parc au réveil, la brume sur l'étang. On reviendra, c'est sûr.</p>
          <p class="signe">Bons baisers de la Huberdière,<br>Lodovica</p>
        </div>
        <div class="droite">
          <div class="timbre"><img src="${IMG}/timbre-chateau.webp" alt="" width="320" height="400"><i>LETTRE VERTE</i></div>
          ${CACHET}
          <span class="dateur">14·05·27</span>
          <div class="adresse"><span>Camille Martin</span><span>12 rue des Lilas</span><span>75011 Paris</span></div>
        </div>
        <span class="num" style="right:2cqw;top:2cqw">1</span>
        <span class="num" style="right:32cqw;top:7cqw">2</span>
        <span class="num" style="left:1.8cqw;bottom:10cqw">3</span>
        <span class="num" style="left:51.5cqw;bottom:20cqw">4</span>
      </div>
    </div>
    <ol class="legende-carte">
      <li><b>1</b><span><strong>Le timbre à l'image du château.</strong> Un vrai timbre de La Poste, imprimé avec une photo du domaine. On le remarque avant de lire la carte.</span></li>
      <li><b>2</b><span><strong>Le cachet de la maison.</strong> Un tampon bordeaux « Posté au Château de la Huberdière, Amboise », et un tampon dateur. La carte porte la preuve d'où elle vient.</span></li>
      <li><b>3</b><span><strong>Le mot de Lodovica.</strong> Une ligne à la main au pied de la carte, ajoutée au moment où elle passe à l'accueil. Le client ne s'y attend pas.</span></li>
      <li><b>4</b><span><strong>La carte à soi-même.</strong> Le chevalet le propose : « Écrivez-vous, vous la trouverez dans votre boîte en rentrant. » Le jour de la soirée diapo, elle est sur la table.</span></li>
    </ol>

    <h3>Le trajet de la carte</h3>
    <ol class="trajet">
      <li><span class="qui">Le client</span><b>En chambre</b>Il trouve la carte et le chevalet, il écrit à qui il veut, ou à lui-même.</li>
      <li><span class="qui">L'accueil</span><b>Le dépôt</b>Timbre, cachet, date, et le mot de Lodovica. Une minute par carte.</li>
      <li><span class="qui">La Poste</span><b>L'envoi</b>Deux à quatre jours en France, un peu plus à l'étranger.</li>
      <li><span class="qui">L'ami, ou le client</span><b>La boîte aux lettres</b>Une adresse courte et un QR code mènent au site, pour qui veut voir.</li>
    </ol>
    <p class="note">Le timbre se pose à l'accueil et pas en chambre : on ne connaît la destination qu'au dépôt, et une carte emportée en souvenir ne gaspille pas de timbre. L'adresse du destinataire n'est jamais notée.</p>

    <div class="deux">
      ${figure("carte-recto-facade.webp", "Maquette de la carte postale, recto avec la façade du château", 900, 600, "Recto, la façade")}
      ${figure("carte-recto-parc.webp", "Maquette de la carte postale, recto avec le parc", 900, 600, "Recto, le parc. Quatre visuels au choix : façade, parc, chambre, table.")}
    </div>
    <div class="objet">
      <div>
        <h3>Le chevalet en chambre</h3>
        <p>Il explique le service en deux phrases, en français, en anglais et en italien, et propose la carte à soi-même.</p>
        <h3>Pour un mariage</h3>
        <p>La soirée diapo a lieu sur place, devant 80 à 120 invités. Une carte « Vous aussi, vous vous mariez ? » les attend dans les chambres et au bar.</p>
      </div>
      <div>${figure("chevalet-trilingue.webp", "Maquette du chevalet trilingue : Écrivez à qui vous voulez, Write to whoever you like, Scrivete a chi volete", 700, 987, "Le chevalet")}</div>
    </div>

    <p class="projet">Projet 2</p>
    <h2>Les nouvelles après le séjour</h2>
    <p>Aujourd'hui, un seul mail part après le départ, celui d'Octorate qui demande un avis à J+7. Le projet le remplace par une courte suite de messages signés Lodovica et Patrick, chacun à son moment et chacun avec une seule demande. Les clients de Booking ont leur propre branche : Booking garde la main sur eux et fixe ce qu'on peut leur envoyer.</p>

    <div class="frise" role="img" aria-label="Frise de la séquence : pour les clients directs, la carte pendant le séjour, puis des mails à J+2, J+6, J+14 et la saison suivante ; pour les clients Booking, la carte, un message la veille du départ, puis le questionnaire de Booking">
      <div></div><div class="t">Pendant le séjour</div><div class="t">La veille du départ</div><div class="t">J+2</div><div class="t">J+6</div><div class="t">J+14</div><div class="t">La saison suivante</div>

      <div class="canal">Réservé en direct<small>site, téléphone, Octorate</small></div>
      <div class="c objet-c"><span class="q">Au séjour</span><b>La carte postale</b><em>projet 1</em></div>
      <div class="c vide"></div>
      <div class="c"><span class="q">J+2</span><b>Bien rentrés ?</b><em>aucun lien</em></div>
      <div class="c"><span class="q">J+6</span><b>L'avis Google</b><em>remplace le mail d'Octorate</em></div>
      <div class="c"><span class="q">J+14</span><b>Le carnet à offrir</b><em>à un proche</em></div>
      <div class="c"><span class="q">Saison suivante</span><b>Revenir</b><em>en direct</em></div>

      <div class="canal">Réservé par Booking<small>30 % des réservations</small></div>
      <div class="c objet-c"><span class="q">Au séjour</span><b>La carte postale</b><em>projet 1</em></div>
      <div class="c"><span class="q">Veille du départ</span><b>Un message Booking</b><em>merci, la carte, le questionnaire</em></div>
      <div class="c booking"><span class="q">J+2</span><b>Le questionnaire</b><em>envoyé par Booking</em></div>
      <div class="rien">Rien ensuite : Booking interdit de détourner ses clients vers la réservation directe.</div>
    </div>
    <div class="legende-frise"><span class="l1">envoyé par le château</span><span class="l2">envoyé par Booking</span><span class="l3">un objet, sur place</span></div>

    <h3>Ce que le client voit dans sa boîte</h3>
    <p>Quatre mails en un an, dont trois dans les deux semaines qui suivent le séjour. Chacun se lit en vingt secondes.</p>
    <div class="boite" aria-label="Maquette d'une boîte de réception sur téléphone">
      <div class="titre">Boîte de réception</div>
      <div class="ligne"><span class="av">H</span><span><span class="de">Lodovica et Patrick</span><span class="obj">Bien rentrés ?</span><span class="apercu">La maison est redevenue calme depuis votre départ…</span></span><span class="j">J+2</span></div>
      <div class="ligne"><span class="av">H</span><span><span class="de">Lodovica et Patrick</span><span class="obj">Une faveur, si vous avez deux minutes</span><span class="apercu">Ceux qui hésitent à venir chez nous lisent d'abord…</span></span><span class="j">J+6</span></div>
      <div class="ligne"><span class="av">H</span><span><span class="de">Lodovica et Patrick</span><span class="obj">Pour vos amis qui partent en Val de Loire</span><span class="apercu">Les photos du séjour ont peut-être déjà circulé…</span></span><span class="j">J+14</span></div>
      <div class="ligne"><span class="av">H</span><span><span class="de">Lodovica et Patrick</span><span class="obj">Un an déjà</span><span class="apercu">Il y a un an, vous vous disiez oui dans le parc…</span></span><span class="j">J+365</span></div>
    </div>
    <p class="note" style="text-align:center">Ici, la suite d'un mariage. Pour un séjour, le dernier mail part au début de la saison suivante.</p>

    <h3>Mail par mail, et pourquoi à ce moment</h3>
    ${mails}

    <h3>Le message aux clients de Booking</h3>
    <p>Booking ne laisse partir des messages automatiques qu'avant le départ, jamais après. Le seul moment utile est donc la veille du départ. Le message fait trois choses : il remercie, il rappelle la carte postale, qui est pour ces clients le seul relais vers leurs amis, et il annonce une fois le questionnaire de Booking, sans insister. Pour un château de dix chambres, chaque note Booking pèse lourd dans la moyenne affichée.</p>
    <details><summary>Lire le message</summary><div class="mail-texte">
      <p>Bonjour Camille,</p>
      <p>Merci d'être venus. Avant de partir, une carte postale vous attend dans la chambre : écrivez à qui vous voulez, déposez-la à l'accueil, nous la postons pour vous.</p>
      <p>Après votre départ, Booking vous enverra un court questionnaire sur votre séjour. Nous lisons chaque réponse, et pour une maison de dix chambres comme la nôtre, chacune compte.</p>
      <p>Bonne route,<br>Lodovica et Patrick</p>
    </div><div class="mail-variantes"><p>Pas de lien vers un avis Google : deux demandes dans un message, c'est une demande à moitié. Pas de lien de réservation, interdit par le contrat Booking. Le lien du carnet est possible si le site du château est déclaré dans les réglages de la messagerie Booking, sinon Booking l'efface.</p></div></details>

    <h3>Les règles de la suite</h3>
    <ul class="regles">
      <li><b>Une demande par mail.</b>Un avis, ou un carnet à transmettre, jamais les deux.</li>
      <li><b>Aucune contrepartie.</b>Ni remise contre un avis, ni cadeau contre un ami recommandé. Google et Booking l'interdisent, et cela abîme la confiance.</li>
      <li><b>Tout le monde reçoit la demande d'avis.</b>Même un client qui s'est plaint à J+2. Google interdit de trier ses clients avant de leur demander un avis.</li>
      <li><b>Jamais de relance.</b>Celui qui ne répond pas ne reçoit rien de plus sur le même sujet.</li>
      <li><b>Les mots du client.</b>On ne lui souffle aucune formule, on lui rappelle seulement ce qu'il a vécu : un séjour, un mariage, un séminaire.</li>
      <li><b>Trois langues.</b>Chaque message existe en français, en anglais et en italien, envoyé selon la langue du client.</li>
    </ul>

    <h2>Ce que chacun y gagne</h2>
    <div class="deux">
      <div>
        <h3>Le client</h3>
        <p>Une carte dont il est fier, des nouvelles qui ne lui vendent rien, de bonnes adresses à donner. S'il recommande, ses amis sont reçus à part grâce à lui.</p>
        <h3>Son ami</h3>
        <p>Un vrai carnet pour préparer son voyage, et un accueil particulier s'il vient.</p>
      </div>
      <div>
        <h3>Le château</h3>
        <p>Plus d'avis, et des avis qui parlent de mariage et de séminaire, là où se jouent les gros devis. Une meilleure place sur Google Maps, qui tient en partie aux avis. Des clients qui reviennent sans commission. Et une mesure : les demandes « de la part de ».</p>
        <h3>Vous deux</h3>
        <p>Un geste par carte à l'accueil. La séquence part seule ; seules les réponses au mail de J+2 vous attendent, et elles disent ce qui est à corriger.</p>
      </div>
    </div>

    <h2>Le budget</h2>
    <p>Le matériel de la carte, pour une saison de 250 cartes postées, moitié en France, moitié à l'étranger. Le nombre est une hypothèse, à recaler sur vos séjours.</p>
    <table>
      <thead><tr><th>Poste</th><th class="num">Coût</th></tr></thead>
      <tbody>
        <tr><td>500 cartes, 4 visuels, imprimeur en ligne</td><td class="num">60 à 100 €</td></tr>
        <tr><td>Chevalets en trois langues</td><td class="num">20 à 30 €</td></tr>
        <tr><td>Tampon de la maison et tampon dateur<span class="sous">prix à confirmer au devis</span></td><td class="num">50 à 80 €</td></tr>
        <tr><td>Timbre à l'image du château, 10 planches de 30<span class="sous">13,50 € la planche à partir de 5, soit 0,45 € par timbre</span></td><td class="num">135 €</td></tr>
        <tr><td>150 timbres Lettre verte<span class="sous">1,52 € en 2026, environ 1,67 € en 2027</span></td><td class="num">228 à 251 €</td></tr>
        <tr><td>150 timbres internationaux<span class="sous">2,25 € en 2026, environ 2,45 € en 2027</span></td><td class="num">338 à 368 €</td></tr>
        <tr class="total"><td>La saison</td><td class="num">830 à 965 €</td></tr>
      </tbody>
    </table>
    <p class="note">Le timbre fait les trois quarts du budget, qui suit donc le nombre de cartes envoyées. Le timbre à l'image du château ajoute 135 € à la saison ; sans lui, la carte reste possible avec un timbre ordinaire. Commander les timbres en décembre, au tarif 2026, économiserait environ 50 € s'ils restent valables après la hausse de janvier : c'est à vérifier auprès du service des timbres personnalisés de La Poste.</p>
    <p>La séquence n'a pas de coût de matériel : elle part d'Octorate si ses envois automatiques le permettent, sinon de votre compte Brevo existant.</p>

    <h2>À trancher ensemble</h2>
    <ol class="trancher">
      <li><strong>Le mot de Lodovica sur chaque carte.</strong> Environ 250 par saison, une ligne chacune. Est-ce tenable en haute saison ?</li>
      <li><strong>Le timbre à l'image du château</strong>, pour 135 € de plus par saison, ou un timbre ordinaire. Et quelle photo du domaine pour le timbre ?</li>
      <li><strong>La carte à soi-même</strong> sur le chevalet vous convient-elle ?</li>
      <li><strong>Le mail d'avis actuel.</strong> Pouvez-vous m'envoyer le texte de celui qu'Octorate envoie à J+7, qu'il soit remplacé proprement ?</li>
      <li><strong>Octorate.</strong> Ses envois automatiques permettent-ils quatre mails programmés, un tri entre clients directs et plateformes, et un texte par langue ? Gère-t-il aussi la messagerie Booking ? Je vérifierai avec vous dans l'extranet.</li>
      <li><strong>Les mariages et séminaires</strong> passent-ils par Octorate ? Sinon, leur date est saisie à la main dans Brevo et la suite part de là.</li>
      <li><strong>Les lignes de saison de Lodovica</strong> dans les mails de J+2 et de la saison suivante, et la possibilité de tenir des dates sans engagement pour un séminaire.</li>
      <li><strong>Le carnet.</strong> Lodovica veut-elle l'étoffer avant qu'il circule : l'ordre des visites selon la saison, une journée de pluie, ses marchés et ses producteurs ?</li>
      <li><strong>Le livret d'accueil</strong> annonce encore le petit-déjeuner inclus : il est à corriger avant le lancement.</li>
    </ol>

    <h2>Déjà en place</h2>
    <ul>
      <li>Le champ « De la part de qui ? » du formulaire de demande, en ligne : il mesure dès maintenant.</li>
      <li>Le carnet de Lodovica, en version de démonstration, invisible pour Google : <a href="/carnet?brouillon" target="_blank" rel="noopener">voir le carnet</a>.</li>
      <li>L'adresse courte et le QR code de la carte, qui mènent déjà au site.</li>
      <li>Les maquettes de la carte, du chevalet et de la carte mariage, et les textes de la séquence.</li>
    </ul>

    <h2>Le calendrier</h2>
    <ul class="dates">
      <li><b>Novembre 2026</b><span>Le call : vous décidez de ce que vous gardez.</span></li>
      <li><b>Décembre</b><span>Le visuel du timbre envoyé à La Poste (une semaine de validation) et la commande, au tarif 2026 si les timbres restent valables.</span></li>
      <li><b>Janvier 2027</b><span>Les textes relus par Lodovica, traduits en anglais et en italien. La séquence branchée et testée : elle peut partir dès ce moment, hors saison comprise.</span></li>
      <li><b>Février</b><span>Les maquettes définitives de la carte et du chevalet, la commande des tampons.</span></li>
      <li><b>Mars</b><span>L'impression des cartes et des chevalets.</span></li>
      <li><b>Avril 2027</b><span>Les cartes en chambre, pour l'ouverture de la saison.</span></li>
    </ul>
  </main>
</body>`)
  return `<!doctype html><html lang="fr"><head>${head}${STYLE}
<title>Faire circuler la satisfaction, Château de la Huberdière</title></head>
${corps}</html>`
}

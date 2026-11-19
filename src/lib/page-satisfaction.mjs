// Page jointe au rapport, servie à /rapport?doc=satisfaction derrière le même mot de
// passe : le projet « faire circuler la satisfaction » présenté au call de novembre 2026.
// Version 3 du 19/11 : raccourcie en listes, livrables d'Alexis en tête, option carnet repliée.
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
  /* Ce que je livre, ce qui reste au château : deux colonnes, puis trois repères chiffrés. */
  .livre{display:grid;grid-template-columns:1.35fr 1fr;gap:0;margin:28px 0 0;border:1px solid var(--line)}
  .livre>div{padding:18px 20px 14px}
  .livre .moi{background:#fff;border-top:3px solid var(--wine)}
  .livre .vous{border-top:3px solid var(--ink)}
  .livre .t{font-family:'Playfair Display',Georgia,serif;font-size:19px;font-weight:600;margin:0 0 8px}
  .livre ul{margin:0;padding-left:18px}
  .livre li{font-size:14px;margin:0 0 7px}
  .reperes{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid var(--line);border-top:0;margin:0 0 6px}
  .reperes div{padding:12px 16px;border-left:1px solid var(--line)}
  .reperes div:first-child{border-left:0}
  .reperes b{display:block;font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:600;color:var(--wine)}
  .reperes span{font-size:13px;color:var(--muted)}
  .puces{padding-left:18px;margin:10px 0}
  .puces li{margin:0 0 6px}
  .sat .note li{font-size:13px}
  .trancher-g{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:14px}
  .trancher-g h3{margin:0 0 6px;font-size:17px;padding-bottom:4px;border-bottom:1px solid var(--ink)}
  .trancher-g ol{padding-left:18px;margin:0}
  .trancher-g li{font-size:14px;margin:0 0 7px}
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

  /* Le carnet : la page, le formulaire d'envoi à un proche et le mail qu'il reçoit. */
  .carnet-lp{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:24px;align-items:start}
  .carnet-lp figure{margin-top:4px}
  .envoi{background:#fff;border:1px solid var(--line);border-top:3px solid var(--wine);padding:18px 20px;margin:18px 0 6px}
  .envoi .t{font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:600;margin:0 0 4px}
  .envoi .s{font-size:13px!important;color:var(--muted);margin:0 0 12px}
  .envoi .champs{display:grid;grid-template-columns:1fr 1.4fr auto;gap:10px;align-items:end}
  .envoi label{display:block;font-size:12px;color:var(--muted)}
  .envoi .champ{display:block;border:1px solid #bfb6a3;padding:8px 10px;font-size:14px;color:var(--ink);margin-top:3px;background:var(--cream);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .envoi .btn{background:var(--wine);color:#fff;padding:9px 16px;font-size:14px;white-space:nowrap;text-align:center}
  .envoi .ok{font-size:13px!important;margin:12px 0 0;padding-top:10px;border-top:1px dashed var(--line)}
  .envoi .ok::before{content:"✓ ";font-weight:600}
  .mail-ami{max-width:520px;margin:20px auto 6px;background:#fff;border:1px solid var(--line);box-shadow:0 8px 24px rgba(33,33,33,.08)}
  .mail-ami .entete{padding:12px 20px;border-bottom:1px solid var(--line);font-size:13px}
  .mail-ami .entete span{display:block;color:var(--muted)}
  .mail-ami .entete strong{font-weight:600}
  .mail-ami .entete .objet-m{font-family:'Playfair Display',Georgia,serif;font-size:17px;color:var(--ink);margin-top:4px}
  .mail-ami .corps{padding:18px 20px 6px}
  .mail-ami .corps p{font-size:14px;margin:0 0 10px}
  .mail-ami .bouton{display:inline-block;background:var(--wine);color:#fff;padding:8px 16px;font-size:13px}
  .mail-ami .pied{padding:10px 20px 14px;font-size:12px!important;color:var(--muted);border-top:1px solid #f0ebe0;margin:0}

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
    .livre,.trancher-g{grid-template-columns:1fr}
    .reperes{grid-template-columns:1fr}
    .reperes div{border-left:0;border-top:1px solid var(--line)}
    .reperes div:first-child{border-top:0}
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
    .carnet-lp{grid-template-columns:1fr;gap:8px}
    .carnet-lp figure{max-width:300px}
    .envoi .champs{grid-template-columns:1fr}
  }
  @media print{
    .rapport-nav{display:none!important}
    body{background:#fff;color:#000}
    .sat{max-width:none;padding:0}
    .sat h2{border-top-color:#000;break-after:avoid}
    .dates b,.sat .maison,.projet,.mail-quand{color:#000}
    .mail{border-left-color:#000}
    details>*{display:block}
    figure,tr,.mail,.carte-verso,.frise,.moteurs,.boite,.envoi,.mail-ami,.livre,.reperes,.trancher-g{break-inside:avoid}
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
      demande: "rien, une seule question",
      pourquoi: `<p>Un client déçu le dit à Lodovica, pas sur Google. Celui qui a été écouté écrit ensuite un avis plus juste.</p>`,
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
      pourquoi: `<ul class="puces">
        <li>Remplace le mail d'avis d'Octorate (J+7).</li>
        <li>« Racontez votre mariage », « racontez votre séminaire » : les avis parlent de ce qui rapporte le plus.</li>
        <li>Plus d'avis, c'est aussi une meilleure place sur Google Maps.</li>
      </ul>`,
      texte: `<p>Bonjour Camille,</p>
        <p>Ceux qui hésitent à venir chez nous lisent d'abord ce qu'en disent les clients d'avant eux.</p>
        <p>Si vous avez deux minutes, racontez votre séjour sur Google. Quelques lignes suffisent, une phrase aussi.</p>
        <p><span class="bouton">Écrire mon avis</span></p>
        <p>Merci,<br>Lodovica et Patrick</p>`,
      variantes: `<p><strong>Mariage :</strong> « racontez votre mariage sur Google. Les couples qui cherchent un lieu lisent ces avis avant de nous appeler. »</p>
        <p><strong>Séminaire :</strong> « racontez votre séminaire sur Google. Les équipes qui cherchent un lieu les lisent avant de nous écrire. »</p>`,
    }),
    mail({
      quand: "J+14",
      objet: "Pour vos amis qui partent en Val de Loire",
      demande: "transmettre le carnet de Lodovica",
      pourquoi: `<p>C'est le moment où un ami demande « c'était où ? ». Le carnet sert même à qui ne dort pas au château. Aucune remise : l'ami est simplement reçu « de la part de ».</p>`,
      texte: `<p>Bonjour Camille,</p>
        <p>Les photos du séjour ont peut-être déjà circulé. Si quelqu'un vous a demandé où c'était, voici de quoi lui répondre.</p>
        <p>Lodovica a réuni dans un carnet les adresses qu'elle donne à ses propres amis : où dîner à Amboise, où louer un vélo pour suivre la Loire, quels sentiers prendre dans les vignes. Il se lit sans avoir dormi chez nous.</p>
        <p><span class="bouton">Offrir le carnet</span></p>
        <p>Et si l'un d'eux vient un jour, qu'il donne votre nom en réservant. Nous l'accueillerons comme un ami de la maison.</p>
        <p>À bientôt peut-être,<br>Lodovica et Patrick</p>`,
      variantes: `<p><strong>Mariage :</strong> « Vos invités ont vu le château. Si l'un d'eux prépare son mariage, nous faisons visiter sur rendez-vous. »</p>
        <p><strong>Séminaire :</strong> « Si un collègue cherche un lieu pour le prochain séminaire de son équipe. »</p>`,
    }),
    mail({
      quand: "La saison suivante",
      objet: "Revenir",
      demande: "réserver, en direct",
      pourquoi: `<p>Un client qui revient ne coûte aucune commission. Séjour : au début de la saison. Mariage : un an jour pour jour. Séminaire : vers dix mois.</p>`,
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
    <p class="maison">Château de la Huberdière, projet pour le call de décembre 2026</p>
    <h1>Faire circuler la satisfaction</h1>
    <p class="chapo">Vos clients repartent contents. Je vous livre de quoi le faire savoir à leurs amis et aux inconnus qui hésitent : une carte postale et quatre mails. Sans remise ni contrepartie. Rien ne part avant votre accord.</p>

    <div class="livre">
      <div class="moi">
        <p class="t">Ce que je vous livre</p>
        <ul>
          <li><strong>La carte postale prête à imprimer</strong> : quatre rectos, le verso, le chevalet de chambre en français, anglais et italien, la carte des mariages.</li>
          <li><strong>Le timbre à l'image du château et les deux tampons</strong> : visuels faits, commandes préparées.</li>
          <li><strong>Les quatre mails après séjour et le message Booking</strong>, écrits, traduits dans les trois langues, programmés et testés.</li>
          <li><strong>Le carnet de Lodovica</strong> en ligne dans les trois langues, avec son bouton « Offrir ».</li>
          <li><strong>La mesure</strong> : les demandes « de la part de » comptées chaque mois dans le rapport.</li>
        </ul>
      </div>
      <div class="vous">
        <p class="t">Ce qui reste de votre côté</p>
        <ul>
          <li>Payer le matériel, surtout des timbres.</li>
          <li>À l'accueil : timbrer et tamponner chaque carte, une minute.</li>
          <li>Lodovica : une ligne à la main sur chaque carte.</li>
          <li>Lire les réponses au mail de J+2.</li>
          <li>Relire les textes en janvier.</li>
        </ul>
      </div>
    </div>
    <div class="reperes">
      <div><b>830 à 965 €</b><span>de matériel par saison</span></div>
      <div><b>0 €</b><span>pour les mails</span></div>
      <div><b>Avril 2027</b><span>lancement, à l'ouverture</span></div>
    </div>

    <h2>Deux chemins vers de nouveaux clients</h2>
    <div class="moteurs" role="img" aria-label="Schéma : un séjour réussi alimente deux chemins, les proches et les inconnus, qui mènent tous deux à de nouvelles réservations en direct">
      <div class="depart">Un séjour réussi</div>
      <div class="fleche"><span></span><span></span></div>
      <div class="voie">
        <h3>Les proches</h3>
        <p>Ils reçoivent la carte, on leur transmet le carnet.</p>
        <p class="par">Carte postale et mail de J+14</p>
      </div>
      <div class="voie">
        <h3>Les inconnus</h3>
        <p>Ils lisent les avis avant de choisir.</p>
        <p class="par">Demandes d'avis Google et Booking</p>
      </div>
      <div class="fleche"><span></span><span></span></div>
      <div class="arrivee">De nouvelles demandes, « de la part de » ou en direct</div>
    </div>
    <p class="note">Aujourd'hui, le bouche à oreille se voit à peine : une demande sur treize en septembre. Le champ « De la part de qui ? » du formulaire le mesure depuis octobre.</p>

    <p class="projet">Projet 1</p>
    <h2>La carte postale, postée par la maison</h2>
    <ul class="puces">
      <li>Dans chaque chambre, une carte du château et un chevalet qui explique le service.</li>
      <li>Le client l'écrit et la dépose à l'accueil, la maison la poste.</li>
      <li>Elle touche aussi les étrangers et les clients Booking, qu'on ne peut pas recontacter.</li>
      <li>Pour un mariage, une carte « Vous aussi, vous vous mariez ? » attend les invités.</li>
    </ul>

    <h3>Quatre détails qui en font un objet qu'on garde</h3>
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
      <li><b>1</b><span><strong>Le timbre au château.</strong> Un vrai timbre de La Poste, avec une photo du domaine.</span></li>
      <li><b>2</b><span><strong>Le cachet de la maison</strong> et le tampon dateur : on sait d'où vient la carte.</span></li>
      <li><b>3</b><span><strong>Le mot de Lodovica</strong>, une ligne à la main, ajoutée à l'accueil.</span></li>
      <li><b>4</b><span><strong>La carte à soi-même</strong>, proposée par le chevalet : on retrouve son séjour en rentrant.</span></li>
    </ol>

    <h3>Le trajet de la carte</h3>
    <ol class="trajet">
      <li><span class="qui">Le client</span><b>En chambre</b>Il écrit à qui il veut, ou à lui-même.</li>
      <li><span class="qui">L'accueil</span><b>Le dépôt</b>Timbre, cachet, date, mot de Lodovica.</li>
      <li><span class="qui">La Poste</span><b>L'envoi</b>Deux à quatre jours en France.</li>
      <li><span class="qui">L'ami</span><b>La boîte aux lettres</b>Un QR code mène au site.</li>
    </ol>

    <div class="deux">
      ${figure("carte-recto-facade.webp", "Maquette de la carte postale, recto avec la façade du château", 900, 600, "Recto, la façade")}
      ${figure("carte-recto-parc.webp", "Maquette de la carte postale, recto avec le parc", 900, 600, "Recto, le parc. Quatre visuels au choix : façade, parc, chambre, table.")}
    </div>
    <details><summary>Voir le chevalet en chambre</summary>
      <div style="max-width:220px">${figure("chevalet-trilingue.webp", "Maquette du chevalet trilingue : Écrivez à qui vous voulez, Write to whoever you like, Scrivete a chi volete", 700, 987, "En français, anglais et italien")}</div>
    </details>

    <p class="projet">Projet 2</p>
    <h2>Les nouvelles après le séjour</h2>
    <ul class="puces">
      <li>Remplace le seul mail actuel, la demande d'avis d'Octorate à J+7.</li>
      <li>Quatre mails signés Lodovica et Patrick, <strong>une seule demande chacun</strong>.</li>
      <li>Clients Booking et autres plateformes : un seul message, la veille du départ. Booking interdit tout envoi après.</li>
    </ul>

    <div class="frise" role="img" aria-label="Frise de la séquence : pour les clients directs, la carte pendant le séjour, puis des mails à J+2, J+6, J+14 et la saison suivante ; pour les clients Booking, la carte, un message la veille du départ, puis le questionnaire de Booking">
      <div></div><div class="t">Pendant le séjour</div><div class="t">La veille du départ</div><div class="t">J+2</div><div class="t">J+6</div><div class="t">J+14</div><div class="t">La saison suivante</div>

      <div class="canal">Réservé en direct<small>site, téléphone, Octorate</small></div>
      <div class="c objet-c"><span class="q">Au séjour</span><b>La carte postale</b><em>projet 1</em></div>
      <div class="c vide"></div>
      <div class="c"><span class="q">J+2</span><b>Bien rentrés ?</b><em>aucun lien</em></div>
      <div class="c"><span class="q">J+6</span><b>L'avis Google</b><em>remplace le mail d'Octorate</em></div>
      <div class="c"><span class="q">J+14</span><b>Le carnet à offrir</b><em>à un proche</em></div>
      <div class="c"><span class="q">Saison suivante</span><b>Revenir</b><em>en direct</em></div>

      <div class="canal">Réservé par Booking<small>et les autres plateformes, 30 % des réservations</small></div>
      <div class="c objet-c"><span class="q">Au séjour</span><b>La carte postale</b><em>projet 1</em></div>
      <div class="c"><span class="q">Veille du départ</span><b>Un message Booking</b><em>merci, la carte, le questionnaire</em></div>
      <div class="c booking"><span class="q">J+2</span><b>Le questionnaire</b><em>envoyé par Booking</em></div>
      <div class="rien">Rien ensuite : Booking interdit de détourner ses clients vers la réservation directe.</div>
    </div>
    <div class="legende-frise"><span class="l1">envoyé par le château</span><span class="l2">envoyé par Booking</span><span class="l3">un objet, sur place</span></div>

    <h3>Ce que le client voit dans sa boîte</h3>
    <div class="boite" aria-label="Maquette d'une boîte de réception sur téléphone">
      <div class="titre">Boîte de réception</div>
      <div class="ligne"><span class="av">H</span><span><span class="de">Lodovica et Patrick</span><span class="obj">Bien rentrés ?</span><span class="apercu">La maison est redevenue calme depuis votre départ…</span></span><span class="j">J+2</span></div>
      <div class="ligne"><span class="av">H</span><span><span class="de">Lodovica et Patrick</span><span class="obj">Une faveur, si vous avez deux minutes</span><span class="apercu">Ceux qui hésitent à venir chez nous lisent d'abord…</span></span><span class="j">J+6</span></div>
      <div class="ligne"><span class="av">H</span><span><span class="de">Lodovica et Patrick</span><span class="obj">Pour vos amis qui partent en Val de Loire</span><span class="apercu">Les photos du séjour ont peut-être déjà circulé…</span></span><span class="j">J+14</span></div>
      <div class="ligne"><span class="av">H</span><span><span class="de">Lodovica et Patrick</span><span class="obj">Un an déjà</span><span class="apercu">Il y a un an, vous vous disiez oui dans le parc…</span></span><span class="j">J+365</span></div>
    </div>
    <p class="note" style="text-align:center">Quatre mails en un an, vingt secondes de lecture chacun. Ici, la suite d'un mariage.</p>

    <h3>Mail par mail</h3>
    ${mails}

    <h3>Le message aux clients de Booking, la veille du départ</h3>
    <ul class="puces">
      <li>Il remercie.</li>
      <li>Il rappelle la carte postale, leur seul relais vers leurs amis.</li>
      <li>Il annonce le questionnaire Booking, une fois : pour dix chambres, chaque note pèse.</li>
    </ul>
    <details><summary>Lire le message</summary><div class="mail-texte">
      <p>Bonjour Camille,</p>
      <p>Merci d'être venus. Avant de partir, une carte postale vous attend dans la chambre : écrivez à qui vous voulez, déposez-la à l'accueil, nous la postons pour vous.</p>
      <p>Après votre départ, Booking vous enverra un court questionnaire sur votre séjour. Nous lisons chaque réponse, et pour une maison de dix chambres comme la nôtre, chacune compte.</p>
      <p>Bonne route,<br>Lodovica et Patrick</p>
    </div></details>

    <h3>Les règles</h3>
    <ul class="regles">
      <li><b>Une demande par mail.</b>Jamais un avis et un carnet ensemble.</li>
      <li><b>Aucune contrepartie.</b>Ni remise contre un avis, ni cadeau contre un ami.</li>
      <li><b>Tout le monde reçoit la demande d'avis.</b>Google interdit de trier ses clients.</li>
      <li><b>Jamais de relance.</b>Pas de réponse, pas de second mail.</li>
    </ul>

    <p class="projet">Projet 2, le mail de J+14</p>
    <h2>Le carnet de Lodovica</h2>
    <div class="carnet-lp">
      <ul class="puces">
        <li>Les adresses que Lodovica donne à ses amis : tables, sorties, balades autour d'Amboise.</li>
        <li>Utile même sans dormir au château : c'est pour ça qu'on le transmet.</li>
        <li>Déjà en ligne en démonstration : <a href="/carnet?brouillon" target="_blank" rel="noopener">voir le carnet</a>. Le bouton « Offrir ce carnet » le partage par WhatsApp, SMS ou mail.</li>
        <li><strong>En option</strong>, à décider : le client tape l'adresse d'un proche, le château lui envoie le carnet de sa part.</li>
      </ul>
      ${figure("carnet-page.webp", "Le haut de la page du carnet de Lodovica : titre, bouton Offrir ce carnet, mot de Lodovica et Patrick, rubrique Où manger", 900, 1150, "La page du carnet, en ligne aujourd'hui")}
    </div>

    <details><summary>Voir l'option : l'envoi du carnet par mail</summary>
      <div class="envoi" role="img" aria-label="Maquette du formulaire : votre prénom, Matteo ; l'adresse mail de votre proche ; bouton Envoyer le carnet ; message de confirmation">
        <p class="t">Envoyez-le à quelqu'un qui part par ici</p>
        <p class="s">Nous lui envoyons le carnet de votre part, une seule fois. Son adresse n'est pas conservée.</p>
        <div class="champs">
          <div><label>Votre prénom</label><span class="champ">Matteo</span></div>
          <div><label>L'adresse mail de votre proche</label><span class="champ">giulia.rossi@exemple.it</span></div>
          <div><span class="btn">Envoyer le carnet</span></div>
        </div>
        <p class="ok">C'est parti. Le carnet arrive dans sa boîte dans quelques minutes.</p>
      </div>
      <div class="mail-ami" aria-label="Maquette du mail reçu par le proche">
        <div class="entete">
          <span>De : <strong>Lodovica et Patrick, Château de la Huberdière</strong></span>
          <span>À : giulia.rossi@exemple.it</span>
          <span class="objet-m">Matteo vous a recommandé cet endroit</span>
        </div>
        <div class="corps">
          <p>Bonjour,</p>
          <p>Matteo a séjourné chez nous, au Château de la Huberdière, près d'Amboise. Il a pensé à vous et nous a demandé de vous transmettre nos bonnes adresses.</p>
          <p>Ce sont celles que Lodovica donne à ses amis : où dîner à Amboise, où louer un vélo pour suivre la Loire, quels sentiers prendre dans les vignes. Elles valent le détour, que vous dormiez chez nous ou non.</p>
          <p><span class="bouton">Ouvrir le carnet</span></p>
          <p>Et si un jour vous venez, dites que vous venez de la part de Matteo. Nous vous recevrons comme une amie de la maison.</p>
          <p>Lodovica et Patrick</p>
        </div>
        <p class="pied">Vous recevez ce mail parce que Matteo a saisi votre adresse sur notre site. C'est le seul : nous ne l'avons pas gardée.</p>
      </div>
      <ul class="regles">
        <li><b>Une adresse, un envoi.</b>Ni fichier clients, ni newsletter.</li>
        <li><b>Pas de message libre.</b>Seul le prénom change.</li>
        <li><b>Fermé aux robots.</b>Mêmes protections que le formulaire de demande.</li>
        <li><b>Les réponses arrivent chez vous</b>, dans la boîte contact.</li>
      </ul>
    </details>

    <h2>Ce que chacun y gagne</h2>
    <ul class="regles">
      <li><b>Le client</b>Une carte dont il est fier, de bonnes adresses à donner.</li>
      <li><b>Son ami</b>Un vrai carnet de voyage, et un accueil particulier s'il vient.</li>
      <li><b>Le château</b>Plus d'avis sur les mariages et séminaires, une meilleure place sur Maps, des retours sans commission.</li>
      <li><b>Vous deux</b>Une minute par carte. Les mails partent seuls.</li>
    </ul>

    <h2>Le budget</h2>
    <p>Pour 250 cartes par saison, moitié en France, moitié à l'étranger (hypothèse à recaler).</p>
    <table>
      <thead><tr><th>Poste</th><th class="num">Coût</th></tr></thead>
      <tbody>
        <tr><td>500 cartes, 4 visuels</td><td class="num">60 à 100 €</td></tr>
        <tr><td>Chevalets en trois langues</td><td class="num">20 à 30 €</td></tr>
        <tr><td>Tampon de la maison et tampon dateur<span class="sous">à confirmer au devis</span></td><td class="num">50 à 80 €</td></tr>
        <tr><td>Timbre à l'image du château, 300 timbres<span class="sous">0,45 € par timbre, en plus de l'affranchissement</span></td><td class="num">135 €</td></tr>
        <tr><td>150 timbres Lettre verte</td><td class="num">228 à 251 €</td></tr>
        <tr><td>150 timbres internationaux</td><td class="num">338 à 368 €</td></tr>
        <tr class="total"><td>La saison</td><td class="num">830 à 965 €</td></tr>
      </tbody>
    </table>
    <ul class="puces note">
      <li>Les timbres font les trois quarts du budget : il suit le nombre de cartes.</li>
      <li>Avec un timbre ordinaire : 135 € de moins.</li>
      <li>Commandés en décembre au tarif 2026 : environ 50 € d'économie, validité à vérifier auprès de La Poste.</li>
      <li>Les mails partent d'Octorate, ou de votre compte Brevo s'il le faut : aucun matériel.</li>
    </ul>

    <h2>À trancher ensemble</h2>
    <div class="trancher-g">
      <div>
        <h3>La carte</h3>
        <ol>
          <li>Le mot de Lodovica, 250 par saison : tenable ?</li>
          <li>Timbre au château (+135 €) ou ordinaire ? Quelle photo ?</li>
          <li>La carte à soi-même vous plaît-elle ?</li>
        </ol>
      </div>
      <div>
        <h3>Les mails</h3>
        <ol>
          <li>Le texte du mail d'avis actuel d'Octorate.</li>
          <li>Octorate sait-il programmer quatre mails, par langue et par canal ? On vérifie ensemble.</li>
          <li>Mariages et séminaires passent-ils par Octorate ?</li>
          <li>Les lignes de saison de Lodovica.</li>
        </ol>
      </div>
      <div>
        <h3>Le carnet</h3>
        <ol>
          <li>L'étoffer avant qu'il circule ?</li>
          <li>Garder les tables de Pray et du Clos d'Amboise, deux hôtels voisins ?</li>
          <li>L'envoi par mail : au lancement, plus tard, ou pas du tout ?</li>
        </ol>
      </div>
    </div>
    <p class="note">Avant le lancement : le livret d'accueil annonce encore le petit-déjeuner inclus, à corriger.</p>

    <h2>Le calendrier</h2>
    <ul class="dates">
      <li><b>Déjà fait</b><span>Le champ « De la part de qui ? », le carnet en démonstration, le QR code de la carte, les maquettes et les textes.</span></li>
      <li><b>Décembre 2026</b><span>Le call : vous choisissez. Si le timbre au château est retenu, son visuel part à La Poste.</span></li>
      <li><b>Janvier 2027</b><span>Textes et carnet relus, traduits. Les mails branchés et testés, ils peuvent partir aussitôt.</span></li>
      <li><b>Février et mars</b><span>Maquettes définitives, tampons, impression.</span></li>
      <li><b>Avril 2027</b><span>Les cartes en chambre, pour l'ouverture.</span></li>
    </ul>
  </main>
</body>`)
  return `<!doctype html><html lang="fr"><head>${head}${STYLE}
<title>Faire circuler la satisfaction, Château de la Huberdière</title></head>
${corps}</html>`
}

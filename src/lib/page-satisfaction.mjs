// Page jointe au rapport, servie à /rapport?doc=satisfaction derrière le même mot de
// passe : le projet « faire circuler la satisfaction » présenté au call de novembre 2026.
// Sources : satisfaction/parcours-satisfaction.md, la maquette du parcours automatisé et
// le plan du 05/10 (carte postale, budget). Aucune rémunération d'Alexis ici : elle se
// discute avec le périmètre contractuel, pas sur une page client.

const IMG = "/images/satisfaction"

const figure = (src, alt, w, h, legende) => `<figure>
  <img src="${IMG}/${src}" alt="${alt}" width="${w}" height="${h}" loading="lazy">
  ${legende ? `<figcaption>${legende}</figcaption>` : ""}
</figure>`

const STYLE = `<style>
  .sat{max-width:700px;margin:0 auto;padding:52px 22px 80px}
  .sat h1{font-family:'Playfair Display',Georgia,serif;font-size:34px;font-weight:600;margin:0 0 12px;line-height:1.15}
  .sat h2{font-family:'Playfair Display',Georgia,serif;font-size:23px;font-weight:600;margin:46px 0 12px;padding-top:16px;border-top:2px solid var(--wine)}
  .sat h3{font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:600;margin:26px 0 6px}
  .sat p,.sat li{font-size:15px}
  .sat .chapo{color:var(--muted);font-size:16px;max-width:60ch}
  .sat .maison{color:var(--wine);font-size:13px;margin:0 0 6px}
  .sat strong{color:var(--ink)}
  .deux{display:grid;grid-template-columns:1fr 1fr;gap:28px}
  .deux h3{margin-top:4px}
  .deux ul{margin:0;padding-left:18px}
  .deux li{margin:0 0 6px}
  .vous{border-left:3px solid var(--wine);padding-left:16px}
  .seul{border-left:1px dashed var(--muted);padding-left:16px}
  ol.moments{list-style:none;counter-reset:m;margin:0;padding:0}
  ol.moments li{counter-increment:m;position:relative;padding:12px 0 12px 34px;border-bottom:1px solid var(--line)}
  ol.moments li::before{content:counter(m);position:absolute;left:4px;top:10px;font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:600;color:var(--wine)}
  figure{margin:16px 0 6px}
  figure img{display:block;width:100%;height:auto;border:1px solid var(--line)}
  figcaption{color:var(--muted);font-size:13px;margin-top:6px}
  .cartes{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .cartes figure{margin:0}
  .objet{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:24px;align-items:start}
  table{width:100%;border-collapse:collapse;font-size:14px;margin-top:10px}
  th,td{text-align:left;padding:9px 6px;border-bottom:1px solid var(--line);vertical-align:top}
  th{font-weight:600;font-size:13px}
  td.num,th.num{text-align:right;white-space:nowrap}
  tr.total td{font-weight:600;border-top:2px solid var(--ink)}
  .note{color:var(--muted);font-size:13px}
  ol.trancher{padding-left:20px}
  ol.trancher li{margin:0 0 10px}
  .dates{list-style:none;margin:0;padding:0}
  .dates li{display:grid;grid-template-columns:150px 1fr;gap:14px;padding:10px 0;border-bottom:1px solid var(--line)}
  .dates b{color:var(--wine);font-weight:600}
  @media screen and (max-width:720px){
    .deux,.objet{grid-template-columns:1fr;gap:18px}
    .objet figure{max-width:260px}
    .dates li{grid-template-columns:1fr;gap:2px}
    .sat h1{font-size:28px}
  }
  @media print{
    .rapport-nav{display:none!important}
    body{background:#fff;color:#000}
    .sat{max-width:none;padding:0}
    .sat h2{border-top-color:#000;break-after:avoid}
    .vous{border-left-color:#000}
    .dates b,ol.moments li::before,.sat .maison{color:#000}
    figure,tr{break-inside:avoid}
  }
</style>`

export function satisfactionPage(head) {
  const nav = `<div class="rapport-nav" style="background:var(--wine);color:#fff;font-family:'Montserrat',system-ui,sans-serif;font-size:13px;padding:10px 18px;display:flex;align-items:center">
    <a href="/rapport" style="color:#fff;text-decoration:none;font-weight:600">← Tous les rapports</a>
  </div>`
  return `<!doctype html><html lang="fr"><head>${head}${STYLE}
<title>Faire circuler la satisfaction, Château de la Huberdière</title></head>
<body>
  ${nav}
  <main class="sat">
    <p class="maison">Château de la Huberdière, projet pour le call de novembre 2026</p>
    <h1>Faire circuler la satisfaction</h1>
    <p class="chapo">Comment vos clients parlent du château à leurs amis, et comment les y aider sans rien leur demander. Tout ce qui suit est à l'état de maquette : rien n'est imprimé ni envoyé avant votre accord.</p>

    <h2>Le besoin</h2>
    <p>Patrick l'a formulé au call du 5 octobre : s'inviter dans la « soirée diapo », les quinze jours qui suivent le retour, quand vos clients montrent leurs photos et qu'un ami demande « c'était où ? ». Sans parrainage contre remise.</p>
    <p>La recommandation se fait donc à l'oral, entre amis. On ne la provoque pas, on la prépare : le client doit avoir sous la main quelque chose à montrer et quelque chose à transmettre.</p>

    <h2>Trois gestes pour vous, le reste se fait seul</h2>
    <div class="deux">
      <div class="vous">
        <h3>Vos trois gestes</h3>
        <ul>
          <li><strong>La photo.</strong> Le jour du départ, dans le parc, avec l'accord du client. Trente secondes, depuis votre téléphone.</li>
          <li><strong>L'accueil.</strong> À l'arrivée des amis d'un client, un petit geste, à décider ensemble.</li>
          <li><strong>Le merci.</strong> Le mot au client qui a parlé de vous est déjà écrit : vous le relisez, vous l'envoyez.</li>
        </ul>
      </div>
      <div class="seul">
        <h3>Ce qui se fait sans vous</h3>
        <ul>
          <li>La photo est rangée en sécurité.</li>
          <li>Une page souvenir privée est créée pour le séjour : Google ne la voit pas, et elle est effacée au bout de six mois.</li>
          <li>Le mail « Bien rentrés ? » part trois jours après le départ.</li>
          <li>Le carnet de Lodovica est prêt à être offert.</li>
          <li>Chez l'ami, le champ « De la part de qui ? » du formulaire est déjà rempli.</li>
          <li>Vous êtes prévenus de sa demande, et le brouillon du merci est rédigé.</li>
        </ul>
      </div>
    </div>
    <p class="note">Trait plein : un geste de votre part. Pointillés : le château s'en occupe seul.</p>

    <h2>Le parcours, en sept moments</h2>
    <ol class="moments">
      <li><strong>Pendant le séjour.</strong> Une carte postale attend dans la chambre, la maison la poste. Au départ, vous prenez une photo des clients dans le parc.</li>
      <li><strong>Trois jours après.</strong> Le mail « Bien rentrés ? » leur apporte leur photo en haute définition et le carnet de Lodovica, « pour vous, et pour qui vous voudrez ». Aucune demande d'avis, aucun lien de réservation.</li>
      <li><strong>La soirée diapo.</strong> La photo circule, quelqu'un demande où c'était. Le client envoie le carnet depuis son téléphone, avec un message court qu'il peut changer. Ni éloge, ni argument de vente.</li>
      <li><strong>L'ami lit.</strong> Il trouve des adresses utiles même s'il ne dort pas au château, et une ligne discrète : « Vous venez de la part de quelqu'un ? Dites-le-nous. »</li>
      <li><strong>L'ami fait sa demande.</strong> Le nom de celui qui l'envoie est déjà inscrit.</li>
      <li><strong>L'accueil.</strong> Vous recevez « les amis de Camille » avec un petit geste : un verre, la visite du potager, un mot dans la chambre.</li>
      <li><strong>La boucle se ferme.</strong> Lodovica écrit à Camille : « Vos amis sont venus ce week-end, merci de leur avoir parlé de nous. »</li>
    </ol>

    <h2>Les objets</h2>

    <h3>La carte postale, timbrée par la maison</h3>
    <p>Une carte du château dans chaque chambre, au format 10 x 15 cm, avec trois ou quatre photos au choix : la façade, le parc, une chambre, la table. Elle dit, en français, en anglais et en italien : déposez-la à l'accueil, l'affranchissement est offert par la maison, nous la postons pour vous.</p>
    <p>Le timbre se pose à l'accueil et pas sur la carte : on ne connaît la destination qu'au dépôt, et une carte emportée en souvenir ne gaspille pas de timbre. La carte passe aussi entre vos mains, ce qui vous laisse glisser un mot. Elle arrive chez un ami pendant ou juste après le séjour, avec l'écriture du client, et reste des semaines sur un frigo. C'est le seul objet du parcours qui marche aussi pour les clients venus par Booking et pour les étrangers.</p>
    <div class="cartes">
      ${figure("carte-recto-facade.webp", "Maquette de la carte postale, recto avec la façade du château", 900, 600, "Recto, la façade")}
      ${figure("carte-recto-parc.webp", "Maquette de la carte postale, recto avec le parc", 900, 600, "Recto, le parc")}
    </div>
    ${figure("carte-verso.webp", "Maquette du verso de la carte postale : lignes pour le texte et l'adresse, case du timbre, QR code et adresse courte du site", 900, 600, "Verso : la moitié droite reste libre pour l'adresse et le timbre. En pied, une adresse courte et un QR code qui mènent au site.")}
    <p class="note">L'adresse courte et le QR code disent combien de visites la carte amène, et quelle photo fait venir. L'adresse du destinataire n'est jamais notée.</p>

    <div class="objet">
      <div>
        <h3>Le chevalet en chambre</h3>
        <p>Il explique le service en deux phrases, dans les trois langues, posé à côté des cartes.</p>
        <h3>Le mail « Bien rentrés ? »</h3>
        <p>Signé Lodovica et Patrick, il part seul trois jours après le départ. Il apporte la photo prise dans le parc et ouvre la page souvenir du séjour : la photo à télécharger, et le carnet avec un bouton pour l'offrir à un ami.</p>
        <h3>Le carnet de Lodovica</h3>
        <p>Ses adresses : où dîner, où louer un vélo, qui appeler pour une montgolfière. Il existe déjà en version de démonstration, invisible pour Google et lié nulle part : <a href="/carnet?brouillon" target="_blank" rel="noopener">voir le carnet</a>.</p>
      </div>
      <div>
        ${figure("chevalet-trilingue.webp", "Maquette du chevalet trilingue : Écrivez à qui vous voulez, Write to whoever you like, Scrivete a chi volete", 700, 987, "Le chevalet")}
        ${figure("mail-retour-j3-mobile.webp", "Maquette du mail Bien rentrés, vu sur téléphone", 520, 2215, "Le mail, sur téléphone")}
      </div>
    </div>

    <div class="objet">
      <div>
        <h3>La carte mariage</h3>
        <p>Pour un mariage, la soirée diapo a lieu sur place, devant 80 à 120 invités. Une carte « Vous aussi, vous vous mariez ? » les attend dans les chambres et au bar.</p>
      </div>
      <div>${figure("carte-mariage-1.webp", "Maquette de la carte Vous aussi, vous vous mariez ?", 900, 1268, "La carte mariage")}</div>
    </div>

    <h2>Selon le type de séjour</h2>
    <ul>
      <li><strong>Séjour.</strong> Le parcours ci-dessus.</li>
      <li><strong>Mariage.</strong> La carte mariage, puis un mot aux mariés un an après.</li>
      <li><strong>Séminaire.</strong> La photo de groupe dans le parc, envoyée le jour même à l'organisateur. L'équipe la publie sur LinkedIn, et c'est là que sont les prochains organisateurs.</li>
      <li><strong>Clients de Booking et des autres plateformes</strong> (30 % des réservations). Pas de mail possible : pour eux, la carte postale et la photo remise sur place.</li>
    </ul>

    <h2>Ce que chacun y gagne</h2>
    <p><strong>Celui qui recommande</strong> a de bonnes adresses à donner, voit ses amis reçus à part grâce à lui et reçoit un merci personnel de Lodovica. Rien d'autre, et c'est ce qui donne envie de recommencer.</p>
    <p><strong>L'ami</strong> reçoit un vrai carnet pour préparer son voyage, et un accueil particulier s'il vient.</p>
    <p><strong>Le château</strong> gagne des clients qui arrivent en confiance, et une mesure : les demandes « de la part de ». En septembre, 1 demande sur 13 se déclarait venue par le bouche à oreille.</p>

    <h2>Le budget du matériel</h2>
    <p>Une estimation pour 250 cartes postées par saison, moitié en France, moitié à l'étranger. Le nombre est une hypothèse, à recaler sur vos séjours.</p>
    <table>
      <thead><tr><th>Poste</th><th class="num">Coût</th></tr></thead>
      <tbody>
        <tr><td>500 cartes, 4 visuels, imprimeur en ligne</td><td class="num">60 à 100 € TTC</td></tr>
        <tr><td>Chevalets en trois langues</td><td class="num">20 à 30 €</td></tr>
        <tr><td>125 timbres France à 1,52 €</td><td class="num">190 €</td></tr>
        <tr><td>125 timbres internationaux à 2,25 €</td><td class="num">281 €</td></tr>
        <tr class="total"><td>La saison</td><td class="num">550 à 600 €</td></tr>
      </tbody>
    </table>
    <p class="note">Soit 2,20 à 2,40 € la carte postée. Le timbre fait plus de 80 % du coût : le budget suit le nombre de cartes envoyées. Les carnets de timbres Lettre verte et Lettre internationale n'ont pas de valeur faciale et restent valables après une hausse : une hausse de la Lettre verte est annoncée, de 1,52 € à environ 1,67 €, d'où l'intérêt de faire le stock de la saison avant le 1er janvier 2027. Le prix de l'impression et celui du timbre international sont à confirmer.</p>

    <h2>À trancher ensemble</h2>
    <ol class="trancher">
      <li>Êtes-vous prêts à prendre la photo du départ, à accueillir les amis d'un geste et à envoyer le mot de remerciement ? Ce sont les trois gestes que rien ne remplace.</li>
      <li>Le geste offert à l'ami, un verre ou une visite, reste-t-il dans l'esprit, ou y voyez-vous déjà du parrainage ?</li>
      <li>Le timbre posé à l'accueil plutôt que sur la carte en chambre vous convient-il ?</li>
      <li>La photo : l'accord du client se recueille au moment où vous la prenez, et sa page souvenir est effacée au bout de six mois. Cela vous va-t-il ?</li>
      <li>Les réservations en ligne : la plupart des séjours se réservent sur Octorate, qui ne demande pas « de la part de qui ». Il est possible de suivre une réservation Octorate jusqu'à son origine, je vous montrerai comment au call.</li>
      <li>Le carnet : Lodovica veut-elle l'étoffer avant qu'il circule (l'ordre des visites selon la saison, une journée de pluie, ses marchés et ses producteurs) ?</li>
      <li>Le livret d'accueil annonce encore le petit-déjeuner inclus : il est à corriger avant le lancement.</li>
    </ol>

    <h2>Déjà en place</h2>
    <ul>
      <li>Le champ « De la part de qui ? » du formulaire de demande, en ligne : il mesure dès maintenant.</li>
      <li>Le carnet, en version de démonstration.</li>
      <li>L'adresse courte imprimée sur la carte et celle du QR code, qui mènent déjà au site.</li>
      <li>Les maquettes de la carte postale, du chevalet, de la carte mariage et du mail.</li>
    </ul>

    <h2>Le calendrier</h2>
    <ul class="dates">
      <li><b>Novembre 2026</b><span>Le call : vous décidez de ce que vous gardez.</span></li>
      <li><b>Avant le 1er janvier</b><span>Le stock de timbres de la saison, si la hausse se confirme.</span></li>
      <li><b>Février 2027</b><span>Les maquettes définitives, les textes relus par Lodovica, les versions anglaise et italienne.</span></li>
      <li><b>Avant fin mars</b><span>L'impression des cartes et des chevalets.</span></li>
      <li><b>Avril 2027</b><span>Le lancement, avant la saison.</span></li>
    </ul>
  </main>
</body></html>`
}

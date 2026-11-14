/* Incontri casuali per ambiente e livello del gruppo.
   Prima la tabella stava dentro Generatori.rollIncontro (index.html); qui la usano anche
   il viaggio sul calendario e le mappe a esagoni. */
const IncontriCasuali = (() => {
  const TABELLA = {
  foresta: {
    basso: [
      '1d4 goblin nascosti tra i rovi che tendono un agguato',
      'Un lupo solitario ferito, affamato e aggressivo',
      '1d3 banditi che si fingono viaggiatori in difficoltà',
      'Un ragno gigante che cala dal soffitto di foglie',
      'Una trappola da caccia nascosta sotto le foglie secche',
      'Un coboldo esploratore — gli altri sono vicini',
      'Un cinghiale irritato che difende i cuccioli',
      '1d4 pixie dispettose che rubano oggetti dagli zaini',
    ],
    medio: [
      '1d6 lupi guidati da un worg intelligente',
      '2d4 goblin su lupi da guerra che cacciano',
      'Un orco solitario in cerca di prede, urlante',
      'Un cubo gelatinoso che occupa un sentiero stretto',
      'Un gruppo di banditi con un capo umanoide (GS 2)',
      'Un dryad che difende il suo albero sacro con forza',
      'Un owlbear che ha perso i cuccioli — furibondo',
      'Tracce fresche di un troll — ore di anticipo',
    ],
    alto: [
      'Un giovane drago verde che rivendica la foresta',
      'Un gruppetto di assassini inviati da qualcuno',
      'Una strega della foresta con 1d4 servitori non morti',
      'Un treant irato per la deforestazione recente',
      'Un vampiro che usa la foresta come caccia notturna',
      'Un grifone che difende il nido nelle alture',
      'Una banda di ranger corrotti guidati da un ex eroe',
      'Portale instabile — creature aberranti emergono',
    ],
  },
  dungeon: {
    basso: [
      '1d6 scheletri che pattugliano il corridoio',
      'Una trappola a dardo avvelenato su una porta',
      '1d4 ratti giganti che escono da un buco nel muro',
      'Due goblin che litigano sul cibo — non vi hanno visto',
      'Uno zombie lento che cammina verso di voi',
      'Una trappola a fossa coperta da polvere fine',
      '1d3 coboldi trappeurs con un sistema di fili',
      'Un fungo velenoso che spore se disturbato',
    ],
    medio: [
      '1d4 zombie che banchettano su resti di un avventuriero',
      'Un gelatinoso cubo che riempie il corridoio',
      'Un gruppo di gnoll che esplora il dungeon',
      'Un mago pazzo con 1d3 costrutti difettosi',
      'Una mummia dimenticata che si risveglia',
      'Un\'ombra che insegue il personaggio con meno PF',
      '2d4 orchi ubriachi che dormono — svegliarli è rischioso',
      'Un naga custode di un\'anticamera del tesoro',
    ],
    alto: [
      'Un vampiro con 1d4 spawn nel suo sarcofago',
      'Un beholder che considera il dungeon suo territorio',
      'Un lich indebolito — cerca corpi per recuperare forza',
      'Una chimera rinchiusa — la gabbia sta cedendo',
      'Un demone maggiore invocato e non più controllato',
      'Un drago anziano che dorme su un cumulo di ossa',
      'Un mindflayer con 1d6 schiavi thrall',
      'La guardia non-morta di un re sepolto',
    ],
  },
  citta: {
    basso: [
      'Un borseggiatore nimble colpisce un PG (DEX CD 13)',
      'Una rissa fuori da una taverna — folla eccitata',
      'Un mendicante con informazioni preziose in cambio di cibo',
      'Una guardia corrotta che chiede "pedaggio" informale',
      'Un bambino che chiede aiuto — la madre è scomparsa',
      'Un ciarlatano vende pozioni false a prezzi alti',
      'Un testimone di un crimine che chiede protezione',
      'Un mercante furioso insegue un presunto ladro',
    ],
    medio: [
      'Un banditore legge una taglia — la descrizione somiglia a un PG',
      'Agenti della gilda dei ladri che "proteggono" un negozio',
      'Un nobile in carrozza che crea incidente diplomatico',
      'Un cultista che distribuisce volantini nel mercato',
      'Guardie corrotte che scortano un carico sospetto',
      'Un assassino che ha sbagliato bersaglio — confusione',
      'Un incendio doloso in un quartiere povero',
      'Un ricattatore che conosce segreti di qualcuno del party',
    ],
    alto: [
      'Un maestro assassino incaricato di eliminare un PG',
      'Un demone travestito da nobile che gestisce la città',
      'Una rivolta popolare che sta degenerando',
      'Un incantatore rinnegato che terrorizza il mercato',
      'La guardia della città intrappolata da un incantesimo di massa',
      'Un drago polimorfo che vive come mercante da anni',
      'Una cospirazione per assassinare il signore della città',
      'Un portale aperto in piazza centrale da un rituale fallito',
    ],
  },
  pianura: {
    basso: [
      '1d4 banditi a cavallo che chiedono pedaggi',
      'Un cacciatore di taglie che cerca qualcuno',
      'Un contadino con un carro spezzato e bestiame rubato',
      '1d6 goblin che assaltano un piccolo accampamento',
      'Un gregge incustodito — dove sono i pastori?',
      'Un fuoco di accampamento abbandonato di recente',
      'Un soldato disertore, ferito e spaventato',
      'Una trappola di caccia dimenticata sul sentiero',
    ],
    medio: [
      'Un gruppo di gnoll che cacciano in formazione',
      '1d4 orchi che scortano un prigioniero',
      'Un cavaliere nero che non si ferma per nessun motivo',
      'Un\'aquila gigante che sorvola e poi attacca',
      'Nuvola di polvere — piccolo esercito di goblin in marcia',
      'Un guardiano della palude — troll solitario e furioso',
      'Un cerchio di pietre con un spirito intrappolato',
      'Banditi organizzati con un mago come supporto',
    ],
    alto: [
      'Un gigante delle colline che lancia rocce da lontano',
      'Un drago anziano che sorvola cercando prede',
      'Un esercito di non-morti in marcia verso la città',
      'Un lich che viaggia verso una destinazione sconosciuta',
      'Una mandria di manticore che cacciano in gruppo',
      'Un arcimago fuggitivo braccato da agenti misteriosi',
      'Un portale elementale che aspira tutto nel raggio di 30m',
      'Un semi-dio caduto che cerca un degno avversario',
    ],
  },
  montagna: {
    basso: [
      '1d4 orchi che controllano un passo di montagna',
      'Una valanga minore — CD DES 12 o 2d6 danni contundenti',
      '1d6 coboldi che estraggono in una sporgenza',
      'Un\'aquila gigante che difende il nido',
      'Un sentiero ghiacciato — CD DES 10 per non cadere',
      'Un mercante nano bloccato da una frana',
      'Una famiglia di capre delle montagne — attenzione al caprone',
      'Un passaggio segreto in una parete rocciosa',
    ],
    medio: [
      'Un gigante delle colline curioso e territoriale',
      'Un manticora che caccia dal cielo',
      'Un wyvern che difende il nido a strapiombo',
      '2d4 orchi con un capo sciamano',
      'Un troll di montagna che usa un\'avalanga come trappola',
      'Un grifo che sorvola — si interessa al party',
      'Un\'imboscata di goblin da alta quota con pietre',
      'Un nano corrotto che controlla il passo con mercenari',
    ],
    alto: [
      'Un drago adulto delle montagne — territorio segnato',
      'Un gigante delle tempeste che comanda i fulmini',
      'Un esercito di orchi guidato da un campione half-drago',
      'Un\'arrocca di pietra che si risveglia',
      'Un\'antica creatura elementale di terra che emerge',
      'Un nemico antico sigillato nella roccia — ora libero',
      'Un lich che usa la montagna come fortezza',
      'Portale verso il Piano elementale della terra',
    ],
  },
  mare: {
    basso: [
      'Una piccola barca pirata con 1d6 pirati disorganizzati',
      'Banchi di nebbia fitta — qualcosa si muove dentro',
      'Un relitto galleggiante — qualcosa si agita ancora dentro',
      '1d4 sahuagin che assaltano dalla prua',
      'Delfini che escortano — poi scappano all\'improvviso',
      'Una corrente pericolosa — CD FOR 11 per nuotare fuori',
      'Una scialuppa alla deriva con un unico sopravvissuto',
      'Un polpo gigante che abbraccia lo scafo',
    ],
    medio: [
      'Una nave pirata ben equipaggiata con un capitano GS 5',
      'Un drago di mare che emerge tra le onde',
      'Sirene che cantano — CD SAG 14 o il PG si getta in mare',
      'Un idra marina che attacca dal basso',
      'Un mercante in difficoltà — è una trappola di pirati',
      'Una tempesta improvvisa — tiro abilità per mantenere la rotta',
      'Una balena infuriata che speronò una nave prima di voi',
      'Un elementale dell\'acqua che sorge dal nulla',
    ],
    alto: [
      'Un kraken che si risveglia — impossibile combatterlo, solo fuggire',
      'Una flotta di non-morti — navi fantasma con equipaggio spettrale',
      'Un drago delle tempeste che comanda la flotta pirata',
      'Un dio del mare minore che vuole un tributo',
      'Un\'aberrazione degli abissi che emerge alla superficie',
      'Una maelstrom magica con una struttura al centro',
      'La nave fantasma del Capitano Maledetto — vi segue',
      'Un portale negli abissi si apre sotto la chiglia',
    ],
  },
  palude: {
    basso: [
      '1d4 lizardfolk che emergono dall\'acqua torbida',
      'Fuochi fatui che cercano di attirare fuori dal sentiero',
      'Sabbie mobili — CD DES 12 o si affonda di 1,5m',
      'Gas fetido — CD COS 12 o svantaggio per 1 ora',
      'Un serpente gigante sul tronco che funge da ponte',
      'Un coboldo scalvenged con trappole artigianali',
      'Una rana gigante che inghiotte una creatura piccola',
      'Una zona di territorio lizardfolk — vietato l\'accesso',
    ],
    medio: [
      'Un troll di palude che si rigenera nell\'acqua',
      'Un gruppo di lizardfolk con uno sciamano',
      'Un\'idra a tre teste che ha il nido nelle canne',
      'Un\'ombra che insegue dal crepuscolo',
      'Una druidessa corrotta che controlla la palude',
      'Un\'antica maledizione trasforma l\'acqua in acido diluito',
      'Fuochi fatui intelligenti che lavorano per una strega',
      '2d4 zombie acquatici che emergono dal fango nero',
    ],
    alto: [
      'Un drago nero che tana nelle profondità della palude',
      'Una strega antica con un\'armata di non-morti acquatici',
      'Un behir che ha stabilito territorio nella palude',
      'Un\'aberrazione della palude — qualcosa di mai catalogato',
      'Un portale verso il Piano dell\'Acqua — inonda la zona',
      'Un lich che usa la palude come laboratorio',
      'Una mandria di ippopotami giganti guidati da un\'entità',
      'Un tentacolo del kraken che emerge in questa palude',
    ],
  },
  deserto: {
    basso: [
      'Un miraggio — CD SAG 12 per non seguirlo',
      '1d4 gnoll che cacciano nella sabbia',
      'Un\'imboscata di briganti nomadi (1d6)',
      '2d4 scorpioni giganti da sotto la sabbia',
      'Un pozzo avvelenato con ossa attorno',
      'Un mercante di spezie con prezzi sospettosi',
      'Una tempesta di sabbia in arrivo — 30 minuti',
      'Tracce di un verme della sabbia — non fresche',
    ],
    medio: [
      'Un\'ankheg che emerge sotto i piedi del party',
      'Un giovane lamia con 1d4 cultisti',
      'Un djinn imprigionato che offre un accordo pericoloso',
      'Un mummia che difende le rovine di una città',
      'Un branco di iena gigante con un capo GS 4',
      'Rovine con un guardiano costrutto ancora attivo',
      'Una tempesta di fuoco elementale — pianura bruciante',
      'Tracce di un verme della sabbia — fresche, molto fresche',
    ],
    alto: [
      'Un drago rosso che usa il deserto come caccia',
      'Un verme della sabbia adulto — il suolo trema',
      'Un lich del deserto nel suo palazzo sepolto',
      'Un genio maligno con un esercito di cultisti',
      'Un elemental del fuoco di dimensioni colossali',
      'Un avatar del dio del sole — vuole sacrifici',
      'Una città sepolta che emerge — ancora abitata da non-morti',
      'Un portale verso il Piano elementale del fuoco',
    ],
  },
  };

  const AMBIENTI = Object.keys(TABELLA);
  const ETICHETTE = { foresta: 'Foresta', dungeon: 'Dungeon', citta: 'Città', pianura: 'Pianura', montagna: 'Montagna', mare: 'Mare / Costa', palude: 'Palude', deserto: 'Deserto' };
  const ORE = ['Alba (nebbia leggera)', 'Mattina', 'Mezzogiorno (caldo)', 'Pomeriggio', 'Tramonto', 'Sera', 'Notte (buio)', 'Mezzanotte'];
  const DISTANZE = ['Visibile immediatamente', 'A 30m', 'A 60m', 'In lontananza (300m+)', 'Sentito ma non visto'];
  const _rnd = (a) => a[Math.floor(Math.random() * a.length)];

  // Livello del gruppo dal Party della campagna (media dei livelli), per scegliere la colonna giusta
  const livelloParty = () => {
    const party = (typeof App !== 'undefined' && App.getActiveCampaign()?.party) || [];
    const liv = party.map(p => parseInt(p.livello, 10)).filter(n => n > 0);
    if (!liv.length) return 'medio';
    const m = liv.reduce((s, n) => s + n, 0) / liv.length;
    return m <= 4 ? 'basso' : m <= 10 ? 'medio' : 'alto';
  };

  // Terreni del viaggio e degli esagoni → ambiente della tabella
  const DA_TERRENO = {
    strada: 'pianura', pianura: 'pianura', prateria: 'pianura', campi: 'pianura', colline: 'montagna',
    foresta: 'foresta', bosco: 'foresta', giungla: 'foresta', montagna: 'montagna', montagne: 'montagna',
    palude: 'palude', acquitrino: 'palude', deserto: 'deserto', mare: 'mare', costa: 'mare', lago: 'mare', acqua: 'mare',
    citta: 'citta', città: 'citta', villaggio: 'citta', rovine: 'dungeon', dungeon: 'dungeon', caverna: 'dungeon',
  };
  const ambienteDi = (terreno) => DA_TERRENO[String(terreno || '').toLowerCase()] || 'pianura';

  // Un incontro: { testo, ora, distanza, ambiente, livello }
  const tira = (ambiente, livello) => {
    const amb = TABELLA[ambiente] ? ambiente : 'foresta';
    const liv = livello || livelloParty();
    const lista = TABELLA[amb]?.[liv] || TABELLA.foresta.medio;
    return { testo: _rnd(lista), ora: _rnd(ORE), distanza: _rnd(DISTANZE), ambiente: amb, livello: liv };
  };

  return { TABELLA, AMBIENTI, ETICHETTE, tira, ambienteDi, livelloParty };
})();

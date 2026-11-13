/* DM Toolkit — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   CARTOGRAFO-TESTI.JS — Tutti i testi dei generatori di mappe:
   temi dei dungeon, stanze, trappole, tipi di edificio, arredi e
   luoghi di caverne e radure. Tenuti qui per poterli ampliare senza
   toccare il disegno.
   ============================================================ */

const CartoTesti = (() => {
  const TEMI_DUNGEON = {
    cripta: { sotto: 'Cripta', nome: ['Cripta di', 'Sepolcro di', 'Ossario di'], stanze: [
      ['Vestibolo', 'Iscrizioni consumate mettono in guardia i vivi.', 'statua'], ['Sala delle bare', 'File di sarcofagi; uno ha il coperchio spostato.', 'bara'], ['Ossario', 'Pareti fatte di teschi. Qualcosa si muove sotto le ossa.', 'macerie'],
      ['Cappella funebre', 'Altare annerito con candele ancora accese.', 'altare'], ['Tomba del fondatore', 'Un sarcofago riccamente scolpito sigillato con cera.', 'bara'], ['Galleria dei loculi', 'Nicchie su due file, molte aperte dall\'interno.', 'colonne'],
      ['Stanza del custode', 'Branda, lanterna e un registro dei sepolti.', 'tavolo'], ['Pozzo delle anime', 'Un pozzo stretto: da sotto arriva un sussurro.', 'pozzo'], ['Tesoro votivo', 'Offerte in argento, polverose ma intatte.', 'baule'], ['Sala delle statue', 'Statue velate che sembrano voltarsi.', 'statua'],
      ['Camera dell\'imbalsamatore', 'Vasi canopi e strumenti di bronzo.', 'tavolo'], ['Sala crollata', 'Il soffitto ha ceduto: si passa strisciando.', 'macerie'], ['Santuario oscuro', 'Un simbolo profanato sul pavimento.', 'altare'], ['Stanza sigillata', 'Porta murata dall\'interno, aria viziata.', 'baule'],
    ] },
    fortezza: { sotto: 'Fortezza in rovina', nome: ['Forte di', 'Bastione di', 'Rocca di'], stanze: [
      ['Corpo di guardia', 'Rastrelliere vuote e un tavolo con dadi abbandonati.', 'tavolo'], ['Armeria', 'Armi arrugginite; poche ancora utilizzabili.', 'baule'], ['Caserma', 'File di brande marcite, un odore di muffa.', 'letti'],
      ['Mensa', 'Lunghi tavoli rovesciati a formare una barricata.', 'tavolo'], ['Sala del comandante', 'Una mappa della zona ancora appesa al muro.', 'tavolo'], ['Prigione', 'Celle aperte, catene spezzate dall\'interno.', 'colonne'],
      ['Magazzino', 'Botti e casse, alcune ancora sigillate.', 'botti'], ['Cisterna', 'Acqua stagnante, utile ma non invitante.', 'pozzo'], ['Sala delle udienze', 'Un trono di pietra e stendardi strappati.', 'colonne'], ['Camera del tesoro', 'Una cassaforte di ferro con tre serrature.', 'baule'],
      ['Fucina', 'La forgia è fredda, ma il mantice è stato usato da poco.', 'macerie'], ['Cortile interno', 'Erbacce tra le lastre e una statua decapitata.', 'statua'], ['Cappella militare', 'Un altare al dio della guerra, ancora curato.', 'altare'], ['Cucine', 'Pentole enormi e topi dappertutto.', 'botti'],
    ] },
    tempio: { sotto: 'Tempio perduto', nome: ['Tempio di', 'Santuario di', 'Sacrario di'], stanze: [
      ['Atrio', 'Una vasca per le abluzioni, ormai asciutta.', 'pozzo'], ['Navata', 'Colonne altissime e affreschi sbiaditi.', 'colonne'], ['Sancta sanctorum', 'L\'altare maggiore, sormontato da un idolo.', 'altare'],
      ['Sacrestia', 'Paramenti ammuffiti e un calice nascosto.', 'baule'], ['Scriptorium', 'Scaffali di pergamene, alcune ancora leggibili.', 'tavolo'], ['Celle dei monaci', 'Stanzette spoglie con simboli graffiati.', 'letti'],
      ['Sala delle offerte', 'Monete antiche sparse su un pavimento a mosaico.', 'baule'], ['Sala della prova', 'Un enigma inciso blocca il passaggio.', 'statua'], ['Fonte sacra', 'Acqua che brilla debolmente.', 'pozzo'], ['Refettorio', 'Tavoli di pietra; le ciotole sono ancora in fila.', 'tavolo'],
      ['Cripta dei sacerdoti', 'Nicchie con mummie in abiti cerimoniali.', 'bara'], ['Sala degli idoli', 'Decine di statuette rivolte verso la porta.', 'statua'], ['Camera rituale', 'Un cerchio inciso, con tracce di sangue fresco.', 'altare'], ['Biblioteca proibita', 'Libri incatenati ai leggii.', 'colonne'],
    ] },
    miniera: { sotto: 'Miniera abbandonata', nome: ['Miniera di', 'Scavi di', 'Filone di'], stanze: [
      ['Pozzo d\'accesso', 'Argani e corde consumate.', 'pozzo'], ['Deposito attrezzi', 'Picconi, lampade a olio e casse di chiodi.', 'botti'], ['Dormitorio', 'Giacigli di paglia, lasciati in fretta.', 'letti'],
      ['Galleria puntellata', 'Travi che scricchiolano a ogni passo.', 'colonne'], ['Filone d\'argento', 'La vena riluce ancora tra la roccia.', 'macerie'], ['Ufficio del caposquadra', 'Registri con una pagina strappata.', 'tavolo'],
      ['Sala allagata', 'Acqua alle ginocchia, con correnti strane.', 'pozzo'], ['Crollo recente', 'Un passaggio bloccato da macerie fresche.', 'macerie'], ['Cassaforte della paga', 'Una cassa di ferro inchiodata al pavimento.', 'baule'], ['Santuario dei minatori', 'Una piccola statua coperta di offerte.', 'statua'],
      ['Fonderia', 'Crogioli freddi e scorie ovunque.', 'botti'], ['Sala delle macchine', 'Una ruota enorme, ferma da anni.', 'colonne'], ['Scavo proibito', 'Qui i minatori hanno trovato qualcosa di antico.', 'altare'], ['Tana nel filone', 'Le pareti sono state rosicchiate.', 'macerie'],
    ] },
  };
  const TRAPPOLE = ['Trappola: lastra a pressione, frecce (CD 13).', 'Trappola: fossa coperta di 3 m (CD 12).', 'Trappola: gas soporifero (CD 14).', 'Trappola: lame oscillanti (CD 15).', 'Trappola: rune che esplodono (CD 14).'];


  const TIPI_CASA = {
    casa: { sotto: 'Casa', dim: [12, 9], terra: ['Sala comune', 'Cucina', 'Dispensa', 'Laboratorio', 'Ripostiglio', 'Vestibolo'], sopra: ['Camera padronale', 'Camera', 'Studio', 'Camera degli ospiti', 'Guardaroba', 'Soffitta'], nomi: ['Casa', 'Dimora', 'Casale'] },
    taverna: { sotto: 'Taverna', dim: [15, 11], terra: ['Sala della taverna', 'Cucina', 'Dispensa', 'Saletta privata', 'Retro', 'Ripostiglio'], sopra: ['Camerata', 'Camera in affitto', 'Camera in affitto', 'Camera dell\'oste', 'Camera in affitto', 'Soffitta'], nomi: ['Taverna del', 'Locanda del', 'Osteria del'] },
    bottega: { sotto: 'Bottega', dim: [13, 9], terra: ['Bottega', 'Laboratorio', 'Magazzino', 'Retrobottega', 'Ripostiglio', 'Cucina'], sopra: ['Camera del padrone', 'Camera degli apprendisti', 'Cucina', 'Studio', 'Soffitta', 'Guardaroba'], nomi: ['Bottega', 'Emporio', 'Fondaco'] },
    torre: { sotto: 'Torre', dim: [9, 9], terra: ['Sala di guardia', 'Armeria', 'Deposito', 'Cucina', 'Ripostiglio', 'Vestibolo'], sopra: ['Studio', 'Biblioteca', 'Alloggio', 'Osservatorio', 'Camera', 'Laboratorio'], nomi: ['Torre di', 'Torrione di', 'Guardia di'] },
  };
  const NOTE_STANZA = {
    'Sala comune': 'Il camino è il centro della casa.', Cucina: 'Pentole, odore di fumo e di zuppa.', Dispensa: 'Scorte per l\'inverno.', Laboratorio: 'Attrezzi del mestiere in ordine sparso.', Ripostiglio: 'Roba vecchia che nessuno butta.', Vestibolo: 'Mantelli e stivali all\'ingresso.',
    'Camera padronale': 'Il letto migliore e un baule chiuso.', Camera: 'Semplice ma pulita.', Studio: 'Carte, inchiostro, una lettera non finita.', 'Camera degli ospiti': 'Poco usata, odora di chiuso.', Guardaroba: 'Abiti buoni e qualche segreto.', Soffitta: 'Polvere e bauli dimenticati.',
    'Sala della taverna': 'Bancone, tavoli lunghi e chiacchiere.', 'Saletta privata': 'Per chi non vuole farsi sentire.', Retro: 'Porta sul retro e casse vuote.', Camerata: 'Pagliericci a poco prezzo.', 'Camera in affitto': 'Si paga a notte, in anticipo.', 'Camera dell\'oste': 'Sotto il letto c\'è la cassetta dei soldi.',
    Bottega: 'Merce in mostra e un bancone robusto.', Magazzino: 'Casse numerate con cura.', Retrobottega: 'Qui si fanno gli affari veri.', 'Camera del padrone': 'Vista sulla strada.', 'Camera degli apprendisti': 'Due brande e poche pretese.',
    'Sala di guardia': 'Armi a portata di mano.', Armeria: 'Rastrelliere e una mola.', Deposito: 'Viveri, frecce e olio.', Biblioteca: 'Scaffali fino al soffitto.', Alloggio: 'Spartano e ordinato.', Osservatorio: 'Una finestra grande e strumenti di ottone.',
    Cantina: 'Fresca e buia.', 'Stanza nascosta': 'Non tutti sanno che esiste.', Segrete: 'Ceppi al muro e una grata sul pavimento.',
  };
  const MOBILI = {
    'Sala comune': ['camino', 'tavolo', 'baule'], Cucina: ['camino', 'tavolino', 'botte', 'scaffale'], Dispensa: ['botte', 'botte', 'scaffale', 'cassa'], Laboratorio: ['tavolo', 'scaffale', 'cassa'], Ripostiglio: ['cassa', 'botte', 'cassa'], Vestibolo: ['cassa'],
    'Camera padronale': ['letto', 'baule', 'tavolino', 'camino'], Camera: ['letto', 'baule', 'tavolino'], Studio: ['tavolo', 'scaffale', 'scaffale'], 'Camera degli ospiti': ['letto', 'baule'], Guardaroba: ['scaffale', 'baule', 'baule'], Soffitta: ['cassa', 'baule', 'cassa', 'botte'],
    'Sala della taverna': ['camino', 'bancone', 'tavolo', 'tavolo', 'tavolino', 'botte'], 'Saletta privata': ['tavolo', 'camino'], Retro: ['botte', 'cassa', 'botte'], Camerata: ['letto', 'letto', 'letto', 'baule'], 'Camera in affitto': ['letto', 'tavolino'], 'Camera dell\'oste': ['letto', 'baule', 'tavolino'],
    Bottega: ['bancone', 'scaffale', 'scaffale', 'cassa'], Magazzino: ['cassa', 'botte', 'cassa', 'scaffale'], Retrobottega: ['tavolo', 'cassa'], 'Camera del padrone': ['letto', 'baule', 'tavolino'], 'Camera degli apprendisti': ['letto', 'letto'],
    'Sala di guardia': ['tavolo', 'camino', 'baule'], Armeria: ['scaffale', 'scaffale', 'baule', 'cassa'], Deposito: ['botte', 'cassa', 'botte', 'cassa'], Biblioteca: ['scaffale', 'scaffale', 'scaffale', 'tavolo'], Alloggio: ['letto', 'baule'], Osservatorio: ['tavolo', 'scaffale'],
    Cantina: ['botte', 'botte', 'botte', 'cassa'], 'Stanza nascosta': ['baule', 'tavolino'], Segrete: ['cassa'],
  };


  const vociGrotta = (radura) => {
    const VOCI = radura
      ? [['Sentiero d\'accesso', 'Erba calpestata: qualcuno passa di qui.'], ['Cerchio di pietre', 'Pietre muschiose disposte ad arte.'], ['Quercia antica', 'Un albero enorme, con segni incisi sul tronco.'], ['Accampamento', 'Cenere ancora tiepida, tende abbandonate in fretta.'], ['Tronco caduto', 'Offre riparo e nasconde una buca.'], ['Prato dei funghi', 'Un anello di funghi: meglio non attraversarlo.'], ['Sorgente', 'Acqua limpida e impronte di animali.'], ['Altare di rami', 'Offerte fresche a uno spirito del bosco.'], ['Tana', 'Ossa rosicchiate e odore di selvatico.'], ['Roccia fessurata', 'Una fenditura scende nel buio.']]
      : [['Imboccatura', 'Luce fioca e aria fredda. Tracce recenti nel fango.'], ['Sala delle stalattiti', 'Gocciolio costante: difficile sentire chi si avvicina.'], ['Tana', 'Ossa e pelli ammucchiate. Odore forte.'], ['Galleria dei funghi', 'Funghi luminosi danno una luce verdastra.'], ['Camera crollata', 'Massi instabili: terreno difficile.'], ['Lago sotterraneo', 'Acqua nera e immobile, profondità ignota.'], ['Antico rifugio', 'Graffiti e un focolare di pietra molto vecchio.'], ['Pozzo naturale', 'Un salto di sei metri verso il basso.'], ['Sala dell\'eco', 'Ogni rumore rimbalza a lungo.'], ['Nascondiglio', 'Un baule marcito dietro le rocce.']];
    return VOCI;
  };

  const STORIE = {
    cripta: ['Per generazioni nessuno ha osato disturbare questo luogo. Di recente le lapidi sono state trovate spostate.', 'Le famiglie più antiche seppellivano qui i loro morti. Da qualche notte, dal basso, arrivano dei canti.'],
    fortezza: ['Il presidio fu abbandonato in una sola notte, e nessuno seppe mai perché. Ora qualcuno ha riacceso i fuochi.', 'Doveva difendere il valico, ma cadde senza battaglia. Si dice che le sue casse non siano mai state svuotate.'],
    tempio: ['Il culto che lo costruì è scomparso, ma le offerte sull\'altare sono ancora fresche.', 'I pellegrini smisero di venire quando l\'ultimo sacerdote murò la porta dall\'interno.'],
    miniera: ['I minatori scavarono troppo a fondo e se ne andarono di colpo, lasciando gli attrezzi dov\'erano.', 'Il filone d\'argento fece ricca una città intera, finché dalle gallerie non smise di tornare chi ci scendeva.'],
  };

  return { TEMI_DUNGEON, TRAPPOLE, TIPI_CASA, NOTE_STANZA, MOBILI, vociGrotta, STORIE };
})();

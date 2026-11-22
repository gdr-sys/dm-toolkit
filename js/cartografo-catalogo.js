/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   CARTOGRAFO-CATALOGO.JS — L'elenco dei generatori di mappe, con le
   opzioni e i colori di ognuno. Da qui si generano le mappe e si
   ottengono le opzioni a caso: aggiungere un'opzione in questo
   file basta perche' compaia nell'interfaccia e nel casuale.
   ============================================================ */

const CartoCatalogo = (() => {
  const S = (k, l, v, d) => ({ k, l, v, d });
  const C = (k, l, d = true, pCaso = 0.5) => ({ k, l, c: true, d, pCaso });
  const POPOLO = () => S('popolo', 'Nomi', CartoMotore.POPOLO_OPZIONI, 'italiano');
  // Battle map: varianti di ogni scena (la chiave e' quella dell'impianto in cartografo-battaglia-scene.js, 'base' = la scena stessa)
  const VARIANTI = {
    bosco: [['base', 'Strada nel bosco'], ['bivio', 'Bivio'], ['radura', 'Radura'], ['ruscello', 'Ruscello']],
    ponte: [['ponte', 'Con il ponte'], ['guado', 'Con il guado'], ['entrambi', 'Ponte e guado']],
    accampamento: [['base', 'Campo nella radura'], ['carovana', 'Carovana'], ['avamposto', 'Avamposto']],
    rovine: [['base', 'Tempio'], ['chiostro', 'Chiostro'], ['torre', 'Torre crollata']],
    palude: [['base', 'Acquitrini'], ['capanna', 'Capanna della strega']],
    villaggio: [['base', 'Piazza'], ['incrocio', 'Crocevia'], ['fattoria', 'Fattoria']],
    mercato: [['base', 'Piazza del mercato'], ['strada', 'Via del mercato'], ['fiera', 'Fiera']],
    cimitero: [['base', 'Cimitero recintato'], ['bosco', 'Tombe nel bosco']],
    porto: [['base', 'Banchina e moli'], ['cala', 'Cala']],
    caverna: [['base', 'Grotte'], ['fiume', 'Fiume sotterraneo'], ['tana', 'Tana']],
    cripta: [['base', 'Cripta'], ['catacombe', 'Catacombe']],
  };
  const AL_CHIUSO = ['caverna', 'cripta', 'locanda'];
  // [chiave, etichetta, dove ci sta] — gli stessi di ELEMENTI in cartografo-battaglia.js
  const ELEMENTI_BM = [
    ['carro', 'Carro', ['aperto']], ['carrozza', 'Carrozza', ['aperto']], ['rovesciato', 'Carro rovesciato', ['aperto']], ['tenda', 'Tenda', ['aperto']], ['fuoco', 'Fuoco', ['aperto', 'grotta', 'chiuso']],
    ['massi', 'Massi', ['aperto', 'grotta']], ['tronco', 'Albero caduto', ['aperto']], ['rovi', 'Rovi', ['aperto']], ['stagno', 'Stagno', ['aperto']],
    ['pozzo', 'Pozzo', ['aperto']], ['lapidi', 'Tombe', ['aperto']], ['statua', 'Statua', ['aperto', 'grotta', 'chiuso']], ['rovine', 'Rovine', ['aperto', 'grotta', 'chiuso']],
    ['casse', 'Casse e barili', ['aperto', 'grotta', 'chiuso']], ['tesoro', 'Tesoro', ['aperto', 'grotta', 'chiuso']], ['ossa', 'Ossa', ['aperto', 'grotta', 'chiuso']],
    ['gabbia', 'Gabbia', ['aperto', 'grotta', 'chiuso']], ['altare', 'Altare', ['aperto', 'grotta', 'chiuso']],
  ];
  const TIPI = {
    regno: {
      nome: 'Regno', genera: (o) => CartoRegno.regno(o),
      colori: [['atlante', 'Carta'], ['colori', 'Colori'], ['notte', 'Notte']],
      opzioni: [
        POPOLO(),
        S('forma', 'Forma', [['isola', 'Isola'], ['continente', 'Continente'], ['arcipelago', 'Arcipelago'], ['costa', 'Costa']], 'isola'),
        S('clima', 'Clima', [['temperato', 'Temperato'], ['freddo', 'Freddo'], ['arido', 'Arido']], 'temperato'),
        S('taglia', 'Insediamenti', [['pochi', 'Pochi'], ['normali', 'Normali'], ['molti', 'Molti']], 'normali'),
        S('regni', 'Regni (con i confini)', [['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']], '3'),
        C('distanze', 'Distanze', true, 0.8), C('confini', 'Confini', false, 0.3), C('tinte', 'Colori dei regni', false, 0.3), C('stemmi', 'Stemmi', true, 0.7),
      ],
    },
    citta: {
      nome: 'Città', genera: (o) => CartoInsediamenti.citta(o),
      colori: [['atlante', 'Carta'], ['colori', 'Colori'], ['notte', 'Notte']],
      opzioni: [
        POPOLO(),
        S('taglia', 'Dimensione', [['piccola', 'Piccola'], ['media', 'Media'], ['grande', 'Grande']], 'media'),
        C('mura', 'Mura', true, 0.85), C('castello', 'Castello', true, 0.7), C('fiume', 'Fiume', true, 0.6), C('costa', 'Mare', false, 0.35),
        C('cimitero', 'Cimitero', true, 0.6), C('baracche', 'Baraccopoli', false, 0.4), C('griglia', 'Griglia', true, 0.6),
      ],
    },
    villaggio: {
      nome: 'Villaggio', genera: (o) => CartoVillaggio.villaggio(o),
      colori: [['atlante', 'Carta'], ['colori', 'Colori'], ['notte', 'Notte']],
      opzioni: [
        POPOLO(),
        S('taglia', 'Dimensione', [['piccolo', 'Piccolo'], ['medio', 'Medio'], ['grande', 'Grande']], 'medio'),
        S('pianta', 'Pianta', [['caso', 'A caso'], ['piazza', 'Con piazza'], ['lungo', 'Lungo la strada']], 'caso'),
        C('fiume', 'Fiume', false, 0.4),
      ],
    },
    caverna: {
      nome: 'Caverna o radura', genera: (o) => CartoCaverna.caverna(o),
      colori: [['atlante', 'Carta'], ['colori', 'Colori'], ['notte', 'Notte']],
      opzioni: [
        POPOLO(),
        S('ambiente', 'Ambiente', [['caverna', 'Caverna'], ['radura', 'Radura']], 'caverna'),
        S('taglia', 'Dimensione', [['piccola', 'Piccola'], ['media', 'Media'], ['grande', 'Grande']], 'media'),
        C('acqua', 'Acqua', true, 0.6), C('griglia', 'Griglia', true, 0.7), C('legenda', 'Legenda', true, 1),
      ],
    },
    dungeon: {
      nome: 'Dungeon', genera: (o) => CartoDungeon.dungeon(o),
      colori: [['atlante', 'Carta'], ['colori', 'Colori'], ['notte', 'Notte']],
      opzioni: [
        POPOLO(),
        S('tema', 'Tema', [['cripta', 'Cripta'], ['fortezza', 'Fortezza'], ['tempio', 'Tempio'], ['miniera', 'Miniera']], 'cripta'),
        S('livelli', 'Livelli', [['1', '1'], ['2', '2'], ['3', '3']], '1'),
        S('taglia', 'Dimensione', [['piccolo', 'Piccolo'], ['medio', 'Medio'], ['grande', 'Grande']], 'medio'),
        S('rotazione', 'Orientamento', [['caso', 'A caso'], ['dritto', 'Dritto'], ['traverso', 'Di traverso']], 'caso'),
        C('griglia', 'Griglia', true, 0.8), C('trappole', 'Trappole', true, 0.7), C('legenda', 'Legenda', true, 1),
      ],
    },
    battaglia: {
      nome: 'Battle map', genera: (o) => CartoBattaglia.battaglia(o),
      colori: [['colori', 'Colori'], ['notte', 'Notte']],
      opzioni: [
        POPOLO(),
        { ...S('scena', 'Scena', [['bosco', 'Bosco'], ['ponte', 'Fiume'], ['accampamento', 'Accampamento'], ['rovine', 'Rovine'], ['palude', 'Palude'], ['villaggio', 'Villaggio'], ['mercato', 'Mercato'], ['cimitero', 'Cimitero'], ['porto', 'Porto e costa'], ['caverna', 'Caverna'], ['cripta', 'Cripta'], ['locanda', 'Interno di locanda']], 'bosco'), azzera: ['impianto'] },
        // Variante: dipende dalla scena (dip); in v tutte, per validare quelle salvate
        { ...S('impianto', 'Variante', [['caso', 'A caso']].concat(...Object.values(VARIANTI)), 'caso'), dip: (o) => [['caso', 'A caso']].concat(VARIANTI[o.scena] || []), se: (o) => (VARIANTI[o.scena] || []).length > 1, caso: 'caso' },
        { ...S('terreno', 'Terreno', [['auto', 'Automatico'], ['prato', 'Prato'], ['secco', 'Erba secca'], ['deserto', 'Deserto'], ['neve', 'Neve'], ['fango', 'Fango']], 'auto'), se: (o) => !AL_CHIUSO.includes(o.scena) },
        { ...S('vegetazione', 'Alberi', [['auto', 'Automatico'], ['nessuna', 'Nessuno'], ['rada', 'Pochi'], ['fitta', 'Tanti']], 'auto'), se: (o) => !AL_CHIUSO.includes(o.scena) },
        { ...S('strada', 'Strade', [['auto', 'Automatico'], ['sterrata', 'Sterrate'], ['selciata', 'Selciate']], 'auto'), se: (o) => !AL_CHIUSO.includes(o.scena) && o.scena !== 'palude' },
        S('taglia', 'Quadretti', [['piccola', '17 × 12'], ['media', '24 × 17'], ['grande', '31 × 22']], 'media'),
        S('impagina', 'Impaginazione', [['foglio', 'Foglio A4 intero'], ['scheda', 'Con titolo e legenda']], 'foglio'),
        // Oggetti da aggiungere alla scena (scelta multipla); al chiuso compaiono solo quelli che ci stanno
        { k: 'elementi', l: 'Aggiungi', m: true, d: [], v: ELEMENTI_BM, dip: (o) => ELEMENTI_BM.filter((e) => e[2].includes(o.scena === 'caverna' ? 'grotta' : AL_CHIUSO.includes(o.scena) ? 'chiuso' : 'aperto') && !(o.scena === 'locanda' && ['rovine', 'altare'].includes(e[0]))) },
        C('griglia', 'Griglia', true, 0.9), C('legenda', 'Numeri e legenda', true, 1),
      ],
    },
    abitazione: {
      nome: 'Abitazione', genera: (o) => CartoAbitazione.abitazione(o),
      colori: [['atlante', 'Carta'], ['colori', 'Colori'], ['notte', 'Notte']],
      opzioni: [
        POPOLO(),
        S('edificio', 'Edificio', [['casa', 'Casa'], ['taverna', 'Taverna'], ['bottega', 'Bottega'], ['torre', 'Torre']], 'casa'),
        S('piani', 'Piani', [['1', '1'], ['2', '2'], ['3', '3']], '2'),
        C('cantina', 'Cantina', true, 0.5), C('tetto', 'Tetto', true, 0.7), C('arredi', 'Arredi', true, 0.85), C('griglia', 'Griglia', true, 0.6), C('legenda', 'Legenda', false, 0.25),
      ],
    },
  };

  const seme = () => Math.random().toString(36).slice(2, 8);
  const predefinite = (tipo) => {
    const o = { palette: TIPI[tipo].colori[0][0], nomi: true, titolo: true };
    TIPI[tipo].opzioni.forEach((x) => { o[x.k] = Array.isArray(x.d) ? x.d.slice() : x.d; });
    return o;
  };
  // A caso, dentro un tipo di mappa: opzioni e colori estratti davvero, ma con pesi sensati (una citta' di solito ha le mura)
  const aCaso = (tipo) => {
    const pick = (l) => l[Math.floor(Math.random() * l.length)];
    const o = { palette: pick(TIPI[tipo].colori)[0], nomi: true, titolo: true };
    TIPI[tipo].opzioni.forEach((x) => { o[x.k] = x.m ? [] : 'caso' in x ? x.caso : x.c ? Math.random() < x.pCaso : x.k === 'popolo' ? (Math.random() < 0.7 ? 'italiano' : pick(x.v)[0]) : pick(x.v)[0]; });
    return o;
  };
  const genera = (tipo, o) => TIPI[tipo].genera(o);

  return { TIPI, seme, predefinite, aCaso, genera };
})();

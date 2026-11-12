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
  const TIPI = {
    regno: {
      nome: 'Regno', genera: (o) => CartoRegno.regno(o),
      colori: [['atlante', 'Carta'], ['colori', 'Colori'], ['notte', 'Notte']],
      opzioni: [
        POPOLO(),
        S('forma', 'Forma', [['isola', 'Isola'], ['continente', 'Continente'], ['arcipelago', 'Arcipelago'], ['costa', 'Costa']], 'isola'),
        S('clima', 'Clima', [['temperato', 'Temperato'], ['freddo', 'Freddo'], ['arido', 'Arido']], 'temperato'),
        S('taglia', 'Insediamenti', [['pochi', 'Pochi'], ['normali', 'Normali'], ['molti', 'Molti']], 'normali'),
        C('distanze', 'Distanze', true, 0.8), C('confini', 'Confini', false, 0.3), C('stemmi', 'Stemmi', true, 0.7),
      ],
    },
    citta: {
      nome: 'Città', genera: (o) => CartoInsediamenti.citta(o),
      colori: [['atlante', 'Carta'], ['colori', 'Colori'], ['notte', 'Notte']],
      opzioni: [
        POPOLO(),
        S('taglia', 'Dimensione', [['piccola', 'Piccola'], ['media', 'Media'], ['grande', 'Grande']], 'media'),
        C('mura', 'Mura', true, 0.85), C('castello', 'Castello', true, 0.7), C('fiume', 'Fiume', true, 0.6), C('costa', 'Mare', false, 0.35), C('griglia', 'Griglia', true, 0.6),
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
        C('acqua', 'Acqua', true, 0.6), C('griglia', 'Griglia', true, 0.7), C('legenda', 'Legenda', true, 0.7),
      ],
    },
    dungeon: {
      nome: 'Dungeon', genera: (o) => CartoDungeon.dungeon(o),
      colori: [['atlante', 'Carta'], ['colori', 'Colori'], ['notte', 'Notte']],
      opzioni: [
        POPOLO(),
        S('tema', 'Tema', [['cripta', 'Cripta'], ['fortezza', 'Fortezza'], ['tempio', 'Tempio'], ['miniera', 'Miniera']], 'cripta'),
        S('taglia', 'Dimensione', [['piccolo', 'Piccolo'], ['medio', 'Medio'], ['grande', 'Grande']], 'medio'),
        S('rotazione', 'Orientamento', [['caso', 'A caso'], ['dritto', 'Dritto'], ['traverso', 'Di traverso']], 'caso'),
        C('griglia', 'Griglia', true, 0.8), C('trappole', 'Trappole', true, 0.7), C('legenda', 'Legenda', true, 0.8),
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
    TIPI[tipo].opzioni.forEach((x) => { o[x.k] = x.d; });
    return o;
  };
  // A caso, dentro un tipo di mappa: opzioni e colori estratti davvero, ma con pesi sensati (una citta' di solito ha le mura)
  const aCaso = (tipo) => {
    const pick = (l) => l[Math.floor(Math.random() * l.length)];
    const o = { palette: pick(TIPI[tipo].colori)[0], nomi: true, titolo: true };
    TIPI[tipo].opzioni.forEach((x) => { o[x.k] = x.c ? Math.random() < x.pCaso : x.k === 'popolo' ? (Math.random() < 0.7 ? 'italiano' : pick(x.v)[0]) : pick(x.v)[0]; });
    return o;
  };
  const genera = (tipo, o) => TIPI[tipo].genera(o);

  return { TIPI, seme, predefinite, aCaso, genera };
})();

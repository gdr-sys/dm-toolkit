/* ============================================================
   GENERATORI-EXTRA.JS — Quattro generatori per la pagina
   Generatori: Trappole ed enigmi, Dungeon e stanze, Taverne e
   insediamenti, Eventi di viaggio e riposo.

   Modulo autonomo: inserisce la sua sezione e le sue card nella
   griglia dei Generatori quando viene caricato (prima che partano
   riordino e visibilita', cosi' le card si comportano come le
   altre) e registra i generatori in Generatori._GEN_DEFS, per
   poterli nascondere da "Personalizza".
   ============================================================ */

const GeneratoriExtra = (() => {
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const d = (n) => 1 + Math.floor(Math.random() * n);
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const mescola = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  // ── Blocchi grafici comuni (stesso stile degli altri generatori) ──
  const riquadro = (html) => '<div style="background:var(--bg-secondary);border-left:3px solid var(--accent-secondary);border-radius:0 var(--radius-sm) var(--radius-sm) 0;padding:10px 12px;margin-bottom:8px;font-size:0.88rem;line-height:1.65;">' + html + '</div>';
  const riga = (etichetta, testo) => '<div style="margin-top:4px;"><span style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);">' + etichetta + '</span><div>' + testo + '</div></div>';
  const titolo = (t) => '<div style="font-family:var(--font-display);font-size:0.98rem;color:var(--text-primary);margin-bottom:4px;">' + t + '</div>';
  const segreto = (etichetta, testo) => '<details style="margin-top:6px;"><summary style="cursor:pointer;font-size:0.8rem;color:var(--accent-secondary-text);">' + etichetta + '</summary><div style="margin-top:4px;font-size:0.85rem;">' + testo + '</div></details>';

  // ════════════════════════════════════════════
  // 1. TRAPPOLE, ENIGMI, INDOVINELLI
  // ════════════════════════════════════════════

  // Danni e CD per livello del party e pericolosita' (linee guida della Guida del DM 5e)
  const DANNI = {
    '1':  { ostacolo: '1d10',  pericolosa: '2d10',  letale: '4d10' },
    '5':  { ostacolo: '2d10',  pericolosa: '4d10',  letale: '10d10' },
    '11': { ostacolo: '4d10',  pericolosa: '10d10', letale: '18d10' },
    '17': { ostacolo: '10d10', pericolosa: '18d10', letale: '24d10' },
  };
  const CD = { ostacolo: [10, 11], pericolosa: [12, 15], letale: [16, 20] };

  const TRAPPOLE = [
    { nome: 'Lastra a pressione e dardi', innesco: 'una lastra del pavimento leggermente rialzata', effetto: 'dardi avvelenati da fori nascosti nelle pareti', ts: 'Destrezza', tipo: 'perforanti + veleno', indizio: 'piccoli fori allineati sulle pareti, a altezza del petto' },
    { nome: 'Fossa coperta', innesco: 'un telo dipinto come il pavimento', effetto: 'una caduta in una fossa irta di punte', ts: 'Destrezza', tipo: 'perforanti', indizio: 'la polvere sul pavimento si interrompe in un rettangolo preciso' },
    { nome: 'Lama a pendolo', innesco: 'un filo teso alla caviglia sulla soglia', effetto: 'una lama ricurva che spazza il corridoio', ts: 'Destrezza', tipo: 'taglienti', indizio: 'una fessura sottile sul soffitto, segni di graffi sulle pareti' },
    { nome: 'Soffitto che cala', innesco: 'la porta d\'uscita che si chiude alle spalle', effetto: 'il soffitto scende lentamente per tre round', ts: 'Forza', tipo: 'contundenti', indizio: 'il soffitto è a lastre separate e i muri hanno solchi verticali' },
    { nome: 'Glifo esplosivo', innesco: 'aprire il forziere o leggere l\'iscrizione', effetto: 'un\'esplosione di energia arcana', ts: 'Destrezza', tipo: 'fuoco, fulmine o freddo', indizio: 'una scritta che sembra muoversi se la si guarda di sbieco' },
    { nome: 'Gas soporifero', innesco: 'girare la maniglia della porta', effetto: 'una nube di gas dolciastro riempie la stanza', ts: 'Costituzione', tipo: 'veleno (o addormentati per 1 minuto)', indizio: 'un odore di fiori fuori posto, piccole grate alla base dei muri' },
    { nome: 'Masso rotolante', innesco: 'sollevare l\'idolo dal piedistallo', effetto: 'un masso enorme rotola giù per il corridoio inclinato', ts: 'Destrezza', tipo: 'contundenti', indizio: 'il corridoio è in leggera pendenza e liscissimo' },
    { nome: 'Stanza allagata', innesco: 'una leva che sembra aprire l\'uscita', effetto: 'le porte si sigillano e l\'acqua sale in 10 round', ts: 'Forza (nuotare)', tipo: 'annegamento', indizio: 'alghe secche e una linea di calcare a metà parete' },
    { nome: 'Specchio ingannatore', innesco: 'guardare il proprio riflesso', effetto: 'il riflesso esce dallo specchio e attacca', ts: 'Saggezza', tipo: 'psichici', indizio: 'il riflesso reagisce con un attimo di ritardo' },
    { nome: 'Pavimento elettrificato', innesco: 'calpestare le piastre di rame', effetto: 'una scarica attraversa il pavimento', ts: 'Costituzione', tipo: 'fulmine', indizio: 'odore di temporale, piastre di metallo annerite' },
    { nome: 'Rete con campanelli', innesco: 'un filo quasi invisibile all\'altezza del ginocchio', effetto: 'una rete cade dall\'alto e i campanelli avvisano le guardie', ts: 'Destrezza', tipo: 'nessuno (trattenuti, e arrivano i nemici)', indizio: 'un luccichio di filo alla luce della torcia' },
    { nome: 'Statue che soffiano', innesco: 'passare tra le due statue senza inchinarsi', effetto: 'le bocche delle statue sputano un getto di fiamme', ts: 'Destrezza', tipo: 'fuoco', indizio: 'fuliggine sulle labbra di pietra, pavimento bruciato al centro' },
  ];

  const ENIGMI = [
    { testo: 'Una porta con quattro leve, ognuna con un simbolo stagionale. Sopra, l\'incisione: "Io vengo dopo il raccolto e prima del disgelo."', soluzione: 'Abbassare la leva dell\'inverno.', suggerimento: 'L\'ordine delle stagioni è scolpito anche sul pavimento, in un angolo.' },
    { testo: 'Cinque statue di guerrieri puntano le spade in direzioni diverse. Una placca dice: "Solo chi guarda dove guarda il re troverà la via."', soluzione: 'Ruotare tutte le statue verso quella con la corona, che punta a una sezione di muro cava.', suggerimento: 'Una sola statua ha un dettaglio diverso dalle altre.' },
    { testo: 'Una bilancia d\'oro e sette pesi di pietra di aspetto identico. Un\'iscrizione: "Uno mente."', soluzione: 'Trovare il peso più leggero con due pesate e posarlo sull\'altare: è cavo e contiene la chiave.', suggerimento: 'Bastano due pesate se si dividono i pesi in tre gruppi.' },
    { testo: 'Un pavimento a scacchiera di piastrelle con rune. Calpestare quella sbagliata fa scattare un suono acuto.', soluzione: 'Le rune giuste compitano il nome del dio del tempio, che è scritto all\'ingresso.', suggerimento: 'All\'ingresso c\'è una dedica che sembra solo decorativa.' },
    { testo: 'Tre fontane: una d\'acqua, una di vino, una vuota. Una voce chiede: "Riempimi senza toccare nessuna delle due."', soluzione: 'Far piovere, oppure usare le lacrime o la propria acqua: qualsiasi liquido portato da fuori.', suggerimento: 'La voce non ha detto nulla sui liquidi che il party ha con sé.' },
    { testo: 'Una porta senza serratura, con una bocca di pietra che dice soltanto: "Chiedimi."', soluzione: 'Chiedere "Posso passare?" o fare la domanda giusta, educatamente. Le minacce la fanno tacere per un\'ora.', suggerimento: 'La bocca risponde a tutto, ma solo alle domande.' },
    { testo: 'Quattro bracieri spenti di colori diversi davanti a un mosaico di un tramonto.', soluzione: 'Accenderli nell\'ordine dei colori del tramonto, dall\'alto verso l\'orizzonte.', suggerimento: 'Il mosaico è l\'unica cosa colorata nella stanza.' },
    { testo: 'Un corridoio infinito: chi lo percorre si ritrova sempre all\'inizio.', soluzione: 'Camminare all\'indietro, o a occhi chiusi seguendo il muro sinistro.', suggerimento: 'Sulle pareti ci sono impronte di mani che vanno solo in una direzione.' },
  ];

  const INDOVINELLI = [
    { testo: 'Più ne togli, più divento grande.', risposta: 'Una buca.' },
    { testo: 'Ho città senza case, foreste senza alberi e fiumi senza acqua.', risposta: 'Una mappa.' },
    { testo: 'Cammino senza piedi, piango senza occhi, e tutti mi aspettano quando la terra ha sete.', risposta: 'La nuvola (o la pioggia).' },
    { testo: 'Se mi nomini, mi rompi.', risposta: 'Il silenzio.' },
    { testo: 'Ho denti ma non mordo mai.', risposta: 'Un pettine (o una chiave).' },
    { testo: 'Mi alzo senza gambe, mi corico senza letto, e tutti mi guardano ma nessuno mi fissa.', risposta: 'Il sole.' },
    { testo: 'Divoro tutto: uccelli, bestie, alberi e fiori. Rodo il ferro e spezzo la pietra.', risposta: 'Il tempo.' },
    { testo: 'Più sono, meno si vede.', risposta: 'Il buio.' },
    { testo: 'Ho un collo ma non una testa, porto un tappo ma non un cappello.', risposta: 'Una bottiglia.' },
    { testo: 'Mi trovi una volta in un minuto, due volte in un momento e mai in cento anni.', risposta: 'La lettera M.' },
    { testo: 'Ti seguo ovunque alla luce e sparisco nel buio.', risposta: 'L\'ombra.' },
    { testo: 'Ho una sola voce, ma rispondo con quella di chiunque mi parli.', risposta: 'L\'eco.' },
  ];

  const generaTrappola = () => {
    const tipo = document.getElementById('gx-trap-tipo')?.value || 'trappola';
    const livello = document.getElementById('gx-trap-livello')?.value || '1';
    const el = document.getElementById('gx-trap-result');
    if (!el) return;
    if (tipo === 'enigma') {
      const e = rnd(ENIGMI);
      el.innerHTML = riquadro(titolo('Enigma') + _esc(e.testo)) +
        segreto('Suggerimento da dare se il party si blocca', _esc(e.suggerimento)) +
        segreto('Soluzione', _esc(e.soluzione));
      return;
    }
    if (tipo === 'indovinello') {
      const r = rnd(INDOVINELLI);
      el.innerHTML = riquadro(titolo('Indovinello') + '<em>«' + _esc(r.testo) + '»</em>') + segreto('Risposta', _esc(r.risposta));
      return;
    }
    const t = rnd(TRAPPOLE);
    const sev = document.getElementById('gx-trap-sev')?.value || rnd(['ostacolo', 'pericolosa', 'pericolosa', 'letale']);
    const [cdMin, cdMax] = CD[sev];
    const cd = cdMin + Math.floor(Math.random() * (cdMax - cdMin + 1));
    const cdScopri = Math.max(10, cd - 2 + d(4));
    el.innerHTML = riquadro(
      titolo(_esc(t.nome)) +
      riga('Innesco', _esc(t.innesco)) +
      riga('Effetto', _esc(t.effetto) + ': tiro salvezza su ' + t.ts + ' CD ' + cd + ', <strong>' + DANNI[livello][sev] + '</strong> danni ' + _esc(t.tipo) + ' (metà se riesce)') +
      riga('Per accorgersene', 'Saggezza (Percezione) o Intelligenza (Indagare) CD ' + cdScopri + ' — ' + _esc(t.indizio)) +
      riga('Per disinnescarla', 'Destrezza con arnesi da scasso CD ' + cd + ', oppure aggirarla con un\'idea del party')
    ) + '<span class="badge badge-muted">' + { ostacolo: 'Ostacolo', pericolosa: 'Pericolosa', letale: 'Letale' }[sev] + '</span>';
  };

  // ════════════════════════════════════════════
  // 2. DUNGEON E STANZE
  // ════════════════════════════════════════════

  const TEMI = {
    rovina:   { nome: 'Rovina', stanze: ['un atrio crollato a metà', 'una sala delle udienze con il trono spaccato', 'un archivio di tavolette di pietra', 'una cucina con un forno enorme', 'una caserma con brande marcite', 'un giardino interno invaso dai rovi'], sensi: ['muschio e pietra bagnata', 'il vento che fischia tra le crepe', 'polvere che cade dal soffitto a ogni passo'] },
    cripta:   { nome: 'Cripta', stanze: ['un ossario con pareti di teschi', 'una cappella funebre', 'una galleria di loculi sigillati', 'la camera dell\'imbalsamatore', 'un sepolcro nobiliare con statue giacenti', 'un pozzo per i corpi senza nome'], sensi: ['odore dolciastro di incenso vecchio', 'un freddo che non viene da nessuna parte', 'il silenzio assoluto, rotto solo dalle proprie voci'] },
    caverna:  { nome: 'Caverna', stanze: ['una grotta con un lago sotterraneo', 'una galleria stretta da percorrere di lato', 'una caverna piena di funghi luminosi', 'una sala di stalattiti come zanne', 'un crepaccio attraversato da un ponte di roccia', 'una tana piena di ossa rosicchiate'], sensi: ['gocciolio costante d\'acqua', 'aria umida e pesante', 'un\'eco che restituisce i passi in ritardo'] },
    fortezza: { nome: 'Fortezza', stanze: ['un corpo di guardia con una feritoia', 'un\'armeria saccheggiata', 'una sala da pranzo con la tavola ancora apparecchiata', 'le prigioni con le celle aperte', 'la stanza del comandante, con mappe sul tavolo', 'una torre di vedetta crollata a metà'], sensi: ['ferro arrugginito e cuoio vecchio', 'corvi sul tetto', 'una bandiera strappata che sbatte da qualche parte'] },
    tempio:   { nome: 'Tempio', stanze: ['una navata con vetrate infrante', 'una sala delle offerte piena di monete annerite', 'il dormitorio dei novizi', 'la biblioteca sacra', 'un sancta sanctorum con un altare di ossidiana', 'una sala delle abluzioni con una vasca d\'acqua nera'], sensi: ['un canto lontano che si interrompe appena si ascolta', 'cera colata ovunque', 'la sensazione di essere osservati dalle statue'] },
    tana:     { nome: 'Tana di mostri', stanze: ['un ingresso pieno di trofei macabri', 'una dispensa con carcasse appese', 'un recinto con prigionieri', 'il giaciglio del capo, foderato di pellicce', 'una pozza dove i mostri bevono', 'un deposito di bottino ammucchiato a caso'], sensi: ['odore di selvatico e sangue', 'grugniti lontani', 'ossa che scricchiolano sotto i piedi'] },
  };
  const CONTENUTO = [
    ['Vuota, ma con un dettaglio interessante da esaminare', 3],
    ['Mostri: un gruppo di guardie o abitanti della zona', 4],
    ['Una trappola (usa il generatore Trappole ed enigmi)', 2],
    ['Un enigma o un meccanismo da capire', 1],
    ['Un piccolo tesoro, nascosto o protetto', 2],
    ['Qualcuno da incontrare: un prigioniero, un esploratore perso, un mostro che vuole trattare', 2],
    ['Qualcosa di strano: un fenomeno magico, un oggetto fuori posto', 2],
  ];
  const COMPLICAZIONI = [
    'Un altro gruppo di avventurieri è arrivato prima.', 'Il pavimento è instabile: un passo falso e si cade al livello sotto.',
    'Le torce si spengono da sole in questa zona.', 'Arriva una pattuglia tra 1d4 round.', 'La stanza si sta allagando lentamente.',
    'C\'è un passaggio segreto, ma usarlo fa rumore.', 'Un nemico ferito si arrende e offre informazioni in cambio della vita.',
    'Una porta si chiude alle spalle e si riapre solo dall\'altra parte.', 'Qui la magia funziona male: chi lancia un incantesimo tira sulla tabella della magia selvaggia.',
    'Il tesoro è una trappola, o un\'esca per qualcos\'altro.',
  ];
  const USCITE = ['una porta di legno rinforzato', 'un arco aperto', 'una porta di pietra che scorre', 'un cunicolo stretto', 'una scala a chiocciola', 'una grata da sollevare', 'una porta chiusa a chiave', 'un passaggio segreto dietro un arazzo'];
  const DIMENSIONI = ['piccola (3×3 m)', 'stretta e lunga (3×9 m)', 'media (6×6 m)', 'ampia (9×12 m)', 'enorme, il soffitto si perde nel buio', 'irregolare, su due livelli'];

  const _pesato = (lista) => { const tot = lista.reduce((s, [, p]) => s + p, 0); let r = d(tot); return lista.find(([, p]) => (r -= p) <= 0)[0]; };

  const _stanza = (tema, contenutoForzato) => {
    const t = TEMI[tema];
    const usc = d(3);
    return riga('Stanza', 'È ' + rnd(t.stanze) + ', ' + rnd(DIMENSIONI) + '.') +
      riga('Si sente', rnd(t.sensi)) +
      riga('Uscite', usc === 1 ? rnd(USCITE) : mescola(USCITE).slice(0, usc).join(', ')) +
      riga('Contenuto', contenutoForzato || _pesato(CONTENUTO));
  };

  const generaStanza = () => {
    const tema = document.getElementById('gx-dun-tema')?.value || 'rovina';
    const el = document.getElementById('gx-dun-result');
    if (!el) return;
    el.innerHTML = riquadro(titolo(TEMI[tema].nome) + _stanza(tema) + (d(3) === 1 ? riga('Complicazione', rnd(COMPLICAZIONI)) : ''));
  };

  // Struttura classica del dungeon in cinque stanze
  const generaCinqueStanze = () => {
    const tema = document.getElementById('gx-dun-tema')?.value || 'rovina';
    const el = document.getElementById('gx-dun-result');
    if (!el) return;
    const tappe = [
      ['1. Ingresso e guardiano', 'Qualcosa impedisce di entrare: una guardia, un sigillo, una creatura di soglia.'],
      ['2. Enigma o sfida sociale', 'Una prova che non si risolve con le armi.'],
      ['3. Trappola o colpo di scena', 'Una battuta d\'arresto: una trappola, un tradimento, un crollo.'],
      ['4. Scontro finale', 'Il nemico principale, in un luogo che rende lo scontro interessante.'],
      ['5. Ricompensa e rivelazione', 'Il tesoro, e una scoperta che cambia qualcosa: un indizio, un segreto, un nuovo problema.'],
    ];
    el.innerHTML = tappe.map(([nome, ruolo], i) => riquadro(
      titolo(nome) + '<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:2px;">' + ruolo + '</div>' +
      _stanza(tema, i === 4 ? 'Il tesoro principale, e ' + rnd(['una lettera che rivela chi c\'è davvero dietro', 'una mappa verso un luogo più profondo', 'un prigioniero importante', 'la prova di un tradimento', 'un oggetto che qualcuno vorrà a ogni costo']) : null) +
      (i === 2 ? riga('Complicazione', rnd(COMPLICAZIONI)) : '')
    )).join('');
  };

  // ════════════════════════════════════════════
  // 3. TAVERNE E INSEDIAMENTI
  // ════════════════════════════════════════════

  const NOMI_T = [['Cinghiale', 'm'], ['Drago', 'm'], ['Grifone', 'm'], ['Corvo', 'm'], ['Boccale', 'm'], ['Cavaliere', 'm'], ['Lupo', 'm'], ['Barile', 'm'], ['Volpe', 'f'], ['Sirena', 'f'], ['Lanterna', 'f'], ['Civetta', 'f'], ['Spada', 'f'], ['Corona', 'f'], ['Capra', 'f'], ['Ancora', 'f']];
  const AGG_T = [['Zoppo', 'Zoppa'], ['Ubriaco', 'Ubriaca'], ['Dorato', 'Dorata'], ['Addormentato', 'Addormentata'], ['Rosso', 'Rossa'], ['Ridente', 'Ridente'], ['Spezzato', 'Spezzata'], ['Fortunato', 'Fortunata'], ['Affamato', 'Affamata'], ['Nero', 'Nera'], ['Allegro', 'Allegra'], ['Guercio', 'Guercia']];
  const SILL_A = ['Bra', 'Cor', 'Val', 'Mor', 'Fen', 'Ast', 'Gal', 'Ros', 'Dun', 'Tor', 'Lis', 'Ver', 'Ald', 'Bel'];
  const SILL_B = ['ford', 'mora', 'dale', 'vento', 'bruna', 'castro', 'fonte', 'rupe', 'lago', 'selva', 'pietra', 'guado'];
  const NOMI_P = ['Aldo', 'Brina', 'Corrado', 'Dalia', 'Ermes', 'Fiora', 'Gualtiero', 'Ilda', 'Lando', 'Marta', 'Nives', 'Orso', 'Pia', 'Rufo', 'Selma', 'Tobia', 'Ugo', 'Vera', 'Zeno', 'Agnese'];
  const TRATTI = ['parla troppo e sa tutto di tutti', 'è sospettoso con gli stranieri', 'ride di gusto a ogni frase', 'è stanco e sbrigativo', 'nasconde un passato da avventuriero', 'è avaro fino all\'osso', 'è gentile ma terrorizzato da qualcosa', 'beve più dei suoi clienti', 'colleziona strani oggetti dei viaggiatori', 'non dimentica mai un debito'];
  const SPECIALITA = ['stufato di cinghiale e birra scura', 'pane nero e formaggio di capra', 'pesce di lago arrosto', 'zuppa piccante di cui nessuno sa la ricetta', 'sidro di mele con un retrogusto sospetto', 'carne secca e liquore di more', 'torta di funghi del bosco'];
  const CLIENTELA = ['contadini a fine giornata', 'mercanti di passaggio', 'mercenari in cerca di lavoro', 'pescatori rumorosi', 'una compagnia di attori itineranti', 'guardie fuori servizio', 'tipi loschi che parlano a bassa voce'];
  const PROBLEMI = ['i lupi scendono dalle colline e nessuno osa uscire di notte', 'il pozzo dà acqua che sa di ferro e la gente si ammala', 'un esattore del signore pretende il doppio delle tasse', 'qualcuno ruba il bestiame senza lasciare tracce', 'il figlio del capo è sparito da tre giorni', 'due famiglie sono a un passo dalla faida', 'un culto si riunisce di nascosto nel vecchio mulino', 'i raccolti marciscono in una notte', 'un mostro ha preso possesso del ponte sulla strada principale', 'gli stranieri vengono accusati di ogni sventura'];
  const VOCI = ['dicono che nelle rovine a nord si veda una luce ogni notte', 'pare che il mercante di stoffe paghi bene per una scorta', 'qualcuno giura di aver visto un drago sopra le montagne', 'si dice che l\'oste abbia una mappa del tesoro nascosta in cantina', 'il vecchio eremita del bosco è morto, ma qualcuno vive ancora nella sua capanna', 'le guardie del signore cercano un uomo con una cicatrice sulla mano'];
  const DIMENS = {
    villaggio: { tipo: 'Villaggio', pop: () => (20 + d(10) * 15) + ' abitanti' },
    paese:     { tipo: 'Paese', pop: () => (500 + d(20) * 100) + ' abitanti' },
    citta:     { tipo: 'Città', pop: () => (5 + d(20)) * 1000 + ' abitanti' },
  };
  const CARATTERI = ['costruito attorno a un antico albero sacro', 'su palafitte in mezzo a una palude', 'arroccato su una rupe, con una sola strada d\'accesso', 'circondato da mura troppo grandi per la sua gente', 'famoso per una fiera che attira gente da lontano', 'diviso in due da un fiume, con un unico ponte', 'cresciuto attorno a una miniera ormai quasi esaurita', 'dove tutti indossano qualcosa di blu, per tradizione'];
  const GOVERNI = ['un anziano rispettato da tutti', 'un consiglio di mercanti', 'un signore che non si vede mai', 'il capo della milizia', 'il sacerdote del tempio', 'una famiglia che possiede metà delle terre'];
  const LUOGHI_INT = ['il tempio con un\'unica campana incrinata', 'la fucina, dove il fabbro forgia anche per chi non dovrebbe', 'il mercato coperto', 'il vecchio mulino', 'le terme romane mezze crollate', 'la torre del mago, abbandonata da anni', 'il cimitero sulla collina'];
  const RUOLI = ['l\'oste', 'il fabbro', 'la guaritrice', 'il capo della milizia', 'il mercante più ricco', 'il sacerdote', 'la vedova che sa tutto', 'il cacciatore'];

  const _nomeLuogo = () => rnd(SILL_A) + rnd(SILL_B);
  const _nomeTaverna = () => {
    const [n, g] = rnd(NOMI_T), [am, af] = rnd(AGG_T);
    const art = g === 'm' ? (/^[AEIOU]/.test(n) ? 'L\'' : 'Il ') : (/^[AEIOU]/.test(n) ? 'L\'' : 'La ');
    return art + n + ' ' + (g === 'm' ? am : af);
  };
  const _png = (ruolo) => rnd(NOMI_P) + ', ' + ruolo + ', che ' + rnd(TRATTI);

  let _ultimoLuogo = null;

  const generaInsediamento = () => {
    const tipo = document.getElementById('gx-ins-tipo')?.value || 'taverna';
    const el = document.getElementById('gx-ins-result');
    if (!el) return;
    if (tipo === 'taverna') {
      const nome = _nomeTaverna();
      const oste = rnd(NOMI_P), tratto = rnd(TRATTI), spec = rnd(SPECIALITA), clienti = rnd(CLIENTELA), voce = rnd(VOCI), prob = rnd(PROBLEMI);
      const prezzo = (2 + d(6)) + ' monete di rame';
      _ultimoLuogo = { nome, tipo: 'Taverna',
        atmosfera: 'Gestita da ' + oste + ', che ' + tratto + '. Clientela: ' + clienti + '. Specialità della casa: ' + spec + ' (' + prezzo + ').',
        abitanti: oste + ' (oste)', pericoli: prob, storia: 'Voce che gira: ' + voce + '.' };
      el.innerHTML = riquadro(
        titolo(_esc(nome)) +
        riga('Oste', _esc(oste) + ', che ' + _esc(tratto)) +
        riga('Clientela', _esc(clienti)) +
        riga('Specialità della casa', _esc(spec) + ' — ' + prezzo) +
        riga('Voce che gira', _esc(voce)) +
        riga('Il problema del momento', _esc(prob))
      ) + _bottoneSalva();
      return;
    }
    const dim = DIMENS[tipo];
    const nome = _nomeLuogo();
    const pop = dim.pop(), carattere = rnd(CARATTERI), governo = rnd(GOVERNI), luogo = rnd(LUOGHI_INT), prob = rnd(PROBLEMI);
    const png = mescola(RUOLI).slice(0, 3).map(_png);
    const taverna = _nomeTaverna();
    _ultimoLuogo = { nome, tipo: dim.tipo,
      atmosfera: dim.tipo + ' di ' + pop + ', ' + carattere + '. Comanda ' + governo + '. Da vedere: ' + luogo + '. Locanda: ' + taverna + '.',
      abitanti: png.join('; '), pericoli: prob, storia: '' };
    el.innerHTML = riquadro(
      titolo(_esc(nome) + ' <span style="font-family:var(--font-body);font-size:0.8rem;color:var(--text-muted);">— ' + dim.tipo + ', ' + pop + '</span>') +
      riga('Caratteristica', _esc(carattere)) +
      riga('Chi comanda', _esc(governo)) +
      riga('PNG chiave', png.map(p => '• ' + _esc(p)).join('<br>')) +
      riga('Luogo d\'interesse', _esc(luogo) + '; la locanda è ' + _esc(taverna)) +
      riga('Il problema del momento', _esc(prob))
    ) + _bottoneSalva();
  };

  const _bottoneSalva = () => '<button type="button" class="btn btn-ghost btn-sm" style="margin-top:2px;" onclick="GeneratoriExtra.salvaComeLuogo()">Salva come Luogo</button>';

  const salvaComeLuogo = () => {
    if (!_ultimoLuogo) return;
    if (!App.getActiveCampaign()) { Toast.show('Apri prima una campagna', 'warning'); return; }
    const cfg = typeof WikiSections !== 'undefined' ? WikiSections._getCfg('luoghi') : null;
    if (!cfg) return;
    const opzioni = cfg.fields.find(f => f.key === 'tipo')?.options || [];
    const item = { ...cfg.newItem(), ..._ultimoLuogo, tipo: opzioni.includes(_ultimoLuogo.tipo) ? _ultimoLuogo.tipo : 'Altro' };
    cfg.saveItem(App.getActiveCampaign(), item);
    Toast.show('"' + _ultimoLuogo.nome + '" aggiunto ai Luoghi', 'success', 2500);
    _ultimoLuogo = null;
    document.querySelectorAll('#gx-ins-result button').forEach(b => { b.disabled = true; b.textContent = 'Salvato nei Luoghi'; });
  };

  // ════════════════════════════════════════════
  // 4. EVENTI DI VIAGGIO E RIPOSO
  // ════════════════════════════════════════════

  const EVENTI_AMB = {
    foresta:     ['un sentiero che sparisce e ricompare più avanti, come se il bosco si spostasse', 'un cervo bianco che osserva il party senza fuggire', 'tracce fresche di un orso enorme', 'un albero cavo con dentro le provviste di qualcun altro', 'una radura con un cerchio di funghi perfetto', 'cacciatori di frodo che non vogliono testimoni'],
    montagna:    ['una frana blocca il passo: serve un giro di mezza giornata', 'una tempesta di neve improvvisa', 'un rifugio di pastori, occupato da qualcuno', 'le grida di un grifone che sorvola la valle', 'un ponte di corda in pessime condizioni', 'un eremita che offre ospitalità in cambio di un favore'],
    palude:      ['nebbia così fitta da non vedere il compagno a fianco', 'luci danzanti che invitano a lasciare il sentiero', 'una carovana impantanata che chiede aiuto', 'un isolotto con una capanna su palafitte', 'sanguisughe grosse come un pugno', 'un coccodrillo che dorme proprio sul guado'],
    deserto:     ['una tempesta di sabbia all\'orizzonte', 'un\'oasi che forse è un miraggio', 'le ossa di una creatura gigantesca semisepolte', 'una carovana di mercanti che vende acqua a prezzo d\'oro', 'un pozzo prosciugato con qualcosa sul fondo', 'tracce di un verme delle sabbie'],
    pianura:     ['una pattuglia che chiede i documenti', 'un carro rovesciato senza nessuno attorno', 'un pastore che ha perso il suo gregge', 'un temporale violento e nessun riparo in vista', 'una fattoria che offre un pasto caldo', 'un cavaliere ferito che chiede di portare un messaggio'],
    costa:       ['un relitto arenato sulla spiaggia', 'la marea che sale più in fretta del previsto', 'pescatori che raccontano di una creatura nella baia', 'una grotta marina visibile solo con la bassa marea', 'contrabbandieri che scaricano merci di notte', 'gabbiani che rubano il cibo dal campo'],
    sotterraneo: ['un crollo alle spalle chiude la via del ritorno', 'una corrente d\'aria che porta voci lontane', 'funghi commestibili, o forse no', 'un fiume sotterraneo da guadare', 'segni di scavo recenti', 'un campo abbandonato di un altro gruppo, con un diario'],
    citta:       ['un borseggiatore prende di mira il party', 'una rissa che coinvolge un nobile', 'un banditore annuncia una taglia', 'un mendicante che sa più di quanto dovrebbe', 'una festa religiosa blocca le strade', 'guardie che cercano qualcuno che somiglia a un PG'],
  };
  const EVENTI_RIPOSO = [
    'Durante il secondo turno di guardia, qualcosa si muove ai margini della luce del fuoco.', 'Un viandante chiede di dividere il fuoco: ha una storia da raccontare e un segreto da nascondere.',
    'Un PG fa un sogno vivido e inquietante, che sembra un messaggio.', 'Un animale selvatico ruba parte delle provviste.',
    'Piove a dirotto: il riposo lungo dà solo i benefici di un riposo breve, a meno di trovare un riparo.', 'Si sentono canti lontani, che si interrompono di colpo.',
    'Il fuoco cambia colore per un istante.', 'Tutto tranquillo: un momento buono per una scena tra i personaggi.',
    'Al risveglio, intorno al campo ci sono impronte che nessuno ha visto lasciare.', 'Un messaggero trova il party nel cuore della notte, ansimante.',
  ];
  const COMPLICAZIONI_V = ['ma qualcuno nel party non è d\'accordo su cosa fare', 'e succede proprio quando le provviste stanno finendo', 'e qualcuno sta seguendo il party da ore', 'e il tempo sta per cambiare', 'ma è quasi notte', 'e un PG riconosce qualcosa del proprio passato'];

  const generaEvento = () => {
    const momento = document.getElementById('gx-ev-momento')?.value || 'viaggio';
    const amb = document.getElementById('gx-ev-amb')?.value || 'foresta';
    const el = document.getElementById('gx-ev-result');
    if (!el) return;
    if (momento === 'riposo') {
      const ev = d(4) === 1 ? 'Nell\'ambiente: ' + rnd(EVENTI_AMB[amb]) + '.' : rnd(EVENTI_RIPOSO);
      el.innerHTML = riquadro(titolo('Durante il riposo') + _esc(ev));
      return;
    }
    const ev = rnd(EVENTI_AMB[amb]);
    el.innerHTML = riquadro(titolo('Lungo la strada') + _esc(ev.charAt(0).toUpperCase() + ev.slice(1)) + (d(2) === 1 ? ', ' + _esc(rnd(COMPLICAZIONI_V)) : '') + '.');
  };

  // ════════════════════════════════════════════
  // Card nella pagina Generatori
  // ════════════════════════════════════════════

  const opz = (coppie) => coppie.map(([v, t]) => '<option value="' + v + '">' + t + '</option>').join('');
  const sel = (id, coppie, onchange) => '<select id="' + id + '" class="form-select" style="width:auto;font-size:0.78rem;"' + (onchange ? ' onchange="' + onchange + '"' : '') + '>' + opz(coppie) + '</select>';
  const vuoto = (testo) => '<div class="text-muted text-sm">' + testo + '</div>';

  const _card = (id, titoloCard, controlli, risultatoId, testoVuoto) =>
    '<div class="card gen-card" data-gen-id="' + id + '">' +
      '<div class="card-header" style="flex-wrap:wrap;gap:6px;">' +
        '<h2 class="card-title">' + titoloCard + '</h2>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">' + controlli + '</div>' +
      '</div>' +
      '<div id="' + risultatoId + '" style="min-height:60px;">' + vuoto(testoVuoto) + '</div>' +
    '</div>';

  const _aggiornaVisibilitaTrap = () => {
    const tipo = document.getElementById('gx-trap-tipo')?.value;
    ['gx-trap-livello', 'gx-trap-sev'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = tipo === 'trappola' ? '' : 'none'; });
  };

  const _inserisci = () => {
    const griglia = document.querySelector('#page-generatori .generatori-grid');
    if (!griglia || document.querySelector('[data-gen-id="trappole"]')) return;
    const html =
      '<div style="grid-column:1/-1;margin-top:4px;margin-bottom:-4px;">' +
        '<div style="font-family:var(--font-display);font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);padding-bottom:4px;">Dungeon, insediamenti e viaggi</div>' +
      '</div>' +
      _card('trappole', 'Trappole ed enigmi',
        sel('gx-trap-tipo', [['trappola', 'Trappola'], ['enigma', 'Enigma'], ['indovinello', 'Indovinello']], 'GeneratoriExtra._trapTipo()') +
        sel('gx-trap-livello', [['1', 'Liv. 1–4'], ['5', 'Liv. 5–10'], ['11', 'Liv. 11–16'], ['17', 'Liv. 17–20']]) +
        sel('gx-trap-sev', [['', 'Pericolosità casuale'], ['ostacolo', 'Ostacolo'], ['pericolosa', 'Pericolosa'], ['letale', 'Letale']]) +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="GeneratoriExtra.generaTrappola()">Genera</button>',
        'gx-trap-result', 'Trappole con CD e danni adatti al livello del party, enigmi con soluzione e indovinelli.') +
      _card('dungeon', 'Dungeon e stanze',
        sel('gx-dun-tema', Object.entries(TEMI).map(([k, v]) => [k, v.nome])) +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="GeneratoriExtra.generaStanza()">Una stanza</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" onclick="GeneratoriExtra.generaCinqueStanze()">Dungeon in 5 stanze</button>',
        'gx-dun-result', 'Una stanza con contenuto e uscite, o un intero dungeon in cinque stanze.') +
      _card('insediamenti', 'Taverne e insediamenti',
        sel('gx-ins-tipo', [['taverna', 'Taverna'], ['villaggio', 'Villaggio'], ['paese', 'Paese'], ['citta', 'Città']]) +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="GeneratoriExtra.generaInsediamento()">Genera</button>',
        'gx-ins-result', 'Nome, PNG chiave, problema del momento. Puoi salvarlo subito tra i tuoi Luoghi.') +
      _card('eventi_viaggio', 'Eventi di viaggio e riposo',
        sel('gx-ev-momento', [['viaggio', 'In viaggio'], ['riposo', 'Al campo']]) +
        sel('gx-ev-amb', Object.keys(EVENTI_AMB).map(k => [k, { foresta: 'Foresta', montagna: 'Montagna', palude: 'Palude', deserto: 'Deserto', pianura: 'Pianura', costa: 'Costa', sotterraneo: 'Sotterraneo', citta: 'Città' }[k]])) +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="GeneratoriExtra.generaEvento()">Genera</button>',
        'gx-ev-result', 'Cosa succede lungo la strada o durante la notte al campo.');
    // In fondo alla griglia, prima della chiusura: sezione propria, dopo i generatori esistenti
    griglia.insertAdjacentHTML('beforeend', html);
    _aggiornaVisibilitaTrap();
  };

  const _registra = () => {
    if (typeof Generatori === 'undefined' || !Generatori._GEN_DEFS) return;
    Object.assign(Generatori._GEN_DEFS, {
      trappole:       { label: 'Trappole ed enigmi',       emoji: '' },
      dungeon:        { label: 'Dungeon e stanze',         emoji: '' },
      insediamenti:   { label: 'Taverne e insediamenti',   emoji: '' },
      eventi_viaggio: { label: 'Eventi di viaggio e riposo', emoji: '' },
    });
  };

  // Lo script e' in fondo al body: la griglia esiste gia', e inserendo subito le card (non al
  // DOMContentLoaded) riordino e visibilita' dei Generatori le trovano come tutte le altre.
  _registra();
  _inserisci();

  return { generaTrappola, generaStanza, generaCinqueStanze, generaInsediamento, generaEvento, salvaComeLuogo, _trapTipo: _aggiornaVisibilitaTrap };
})();

/* DM Toolkit — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   CAMPAGNA-DEMO.JS — "Le Ceneri di Valmora": una campagna di
   esempio gia' piena (PNG, luoghi, fazioni, quest, PG, sessioni,
   calendario, tabelle casuali, Sessione Zero, note Wiki, clock),
   creata dal pulsante nella Home vuota per far vedere subito cosa
   sa fare l'app.

   Le schede passano dalle stesse funzioni di salvataggio della
   Wiki (WikiSections TYPES.saveItem), cosi' hanno esattamente la
   forma che l'app si aspetta e i PG finiscono anche nel Party.
   Tutti i contenuti sono originali.
   ============================================================ */

const CampagnaDemo = (() => {
  const NOME = 'Le Ceneri di Valmora';

  const crea = () => {
    if (typeof Storage === 'undefined' || typeof WikiSections === 'undefined') return;
    const esistente = (Storage.getCampaigns() || []).find(c => c.name === NOME);
    if (esistente) { App.openCampaign(esistente.id); return; }

    const camp = Storage.createCampaign(NOME, 'campagna');
    Storage.updateCampaign(camp.id, {
      system: '5e2024',
      description: 'Il vulcano Ardegna, spento da tre secoli, si è risvegliato. Cenere sulla valle di Valmora, raccolti perduti, e dalle crepe della montagna escono creature che nessuno ricordava. Una campagna d\'esempio per scoprire DM Toolkit: guarda, modifica, elimina quando vuoi.',
      demo: true,
    });
    App.openCampaign(camp.id);
    const cfg = (t) => WikiSections._getCfg(t);
    const nuovo = (t, campi) => { const c = cfg(t); const item = { ...c.newItem(), ...campi }; c.saveItem(App.getActiveCampaign(), item); return item.id; };
    // Un collegamento come lo scrive l'editor della Wiki: cliccabile, e visto dal Grafo e dai collegamenti inversi
    const link = (chiave, testo) => '<span class="nc-wikilink" data-link="' + chiave + '" onclick="wikiNavigateLink(\'' + chiave.replace(/'/g, "\\'") + '\')">[[' + testo + ']]</span>';

    // ── Luoghi ──
    const valmora = nuovo('luoghi', { nome: 'Valmora', tipo: 'Villaggio', clima: 'Temperato, ora coperto di cenere',
      atmosfera: 'Un villaggio di vignaioli ai piedi del vulcano. Le case di pietra grigia hanno i tetti coperti da un velo di cenere che la gente spazza ogni mattina, e l\'aria sa di zolfo e mosto.',
      storia: 'Fondato dai monaci dell\'Ordine della Fiamma Quieta, che giurarono di vegliare sul vulcano. L\'ordine si è sciolto un secolo fa.',
      pericoli: 'Scosse di terremoto, crepe che si aprono nei campi, creature di fuoco che scendono di notte.' });
    const ardegna = nuovo('luoghi', { nome: 'Monte Ardegna', tipo: 'Regione', regione: '',
      atmosfera: 'Il vulcano domina la valle. Dal cratere sale una colonna di fumo che di notte si tinge di rosso. Sui fianchi, vigneti abbandonati e antichi eremi scavati nella roccia.',
      pericoli: 'Gas velenosi nelle gallerie, colate di lava improvvise, elementali del fuoco.',
      segreto: 'Il vulcano non si è svegliato da solo: qualcuno ha spezzato il sigillo dei monaci nella Cripta della Fiamma.' });
    const locanda = nuovo('luoghi', { nome: 'Il Tino Rovesciato', tipo: 'Taverna',
      atmosfera: 'L\'unica locanda di Valmora, ricavata in una vecchia cantina. Botti enormi fanno da tavoli e il vino rosso della casa è famoso in tutta la regione.',
      punti: 'La botte più grande nasconde una scala verso le cantine dimenticate.' });
    const cripta = nuovo('luoghi', { nome: 'Cripta della Fiamma Quieta', tipo: 'Dungeon',
      atmosfera: 'Scavata nel fianco del vulcano, la cripta custodisce le tombe dei monaci e il sigillo che teneva addormentato l\'Ardegna. Le pareti sono calde al tatto.',
      pericoli: 'Trappole dei monaci ancora attive, non morti che proteggono il sigillo.',
      segreto: 'Il sigillo è stato spezzato dall\'interno: uno dei monaci non è mai morto davvero.' });
    const corvara = nuovo('luoghi', { nome: 'Corvara', tipo: 'Città',
      atmosfera: 'La città mercantile a due giorni di strada, sul fiume. Qui si vende il vino di Valmora e si decide il destino della valle.' });

    // ── Fazioni ──
    nuovo('fazioni', { nome: 'Custodi della Cenere', tipo: 'Religiosa', attitudine: 'Sospettosa',
      obiettivo: 'Dicono di voler placare il vulcano con preghiere e offerte.',
      vero_obiettivo: 'Vogliono che il vulcano erutti: credono che dal fuoco rinascerà il loro dio dimenticato.',
      sede: '@Monte Ardegna', risorse: 'Una ventina di fedeli, conoscenza delle gallerie del vulcano.' });
    nuovo('fazioni', { nome: 'Gilda dei Vignaioli', tipo: 'Mercantile', attitudine: 'Amichevole',
      obiettivo: 'Salvare la vendemmia e il commercio con Corvara.', sede: '@Valmora',
      risorse: 'Denaro, carri, il rispetto di tutto il villaggio.' });

    // ── PNG ──
    const tessa = nuovo('png', { nome: 'Tessa Brunvento', ruolo: 'Ostessa del Tino Rovesciato', razza: 'Umana', stato: 'Vivo', sede: '@Il Tino Rovesciato',
      personalita: 'Schietta, ride forte, ricorda il nome di ogni cliente.', vuole: 'Che il villaggio resti unito.', teme: 'Che suo figlio si unisca ai Custodi.',
      segreto: 'Suo figlio Elio frequenta già i Custodi della Cenere di nascosto.' });
    const orsino = nuovo('png', { nome: 'Fratello Orsino', ruolo: 'Ultimo monaco della Fiamma Quieta', razza: 'Nano', stato: 'Vivo', sede: '@Monte Ardegna',
      personalita: 'Vecchio, distratto, parla per enigmi.', vuole: 'Riparare il sigillo prima che sia tardi.',
      segreto: 'Ha più di trecento anni: è legato al sigillo, e se il sigillo si spezza del tutto morirà.' });
    const cinerea = nuovo('png', { nome: 'Madre Cinerea', ruolo: 'Guida dei Custodi della Cenere', razza: 'Tiefling', stato: 'Vivo', fazione: '@Custodi della Cenere',
      personalita: 'Calma, gentile, convincente. Non alza mai la voce.', vuole: 'L\'eruzione.',
      segreto: 'È stata lei a guidare i Custodi nella cripta e a spezzare il primo dei tre anelli del sigillo.' });
    nuovo('png', { nome: 'Bertrando Viti', ruolo: 'Capo della Gilda dei Vignaioli', razza: 'Halfling', stato: 'Vivo', fazione: '@Gilda dei Vignaioli',
      personalita: 'Agitato, generoso, sempre con un bicchiere in mano.', vuole: 'Salvare la vendemmia, a qualsiasi costo.', teme: 'La rovina.' });
    nuovo('png', { nome: 'Capitano Dalia Ferraguto', ruolo: 'Comandante della guardia di Corvara', razza: 'Mezzelfa', stato: 'Vivo', sede: '@Corvara',
      personalita: 'Pratica e diffidente.', vuole: 'Evacuare la valle prima che il fuoco arrivi al fiume.' });

    // ── Quest ──
    nuovo('quest', { nome: 'Il sigillo spezzato', tipo: 'Principale', stato: 'Attiva', priorita: 'Alta', committente: '@Fratello Orsino',
      luoghi: '@Cripta della Fiamma Quieta', obiettivo: 'Scoprire chi ha spezzato il sigillo nella cripta e riparare i tre anelli prima dell\'eruzione.',
      ricompensa: 'La gratitudine della valle, e il bastone di Fratello Orsino', ostacoli: 'I Custodi della Cenere sorvegliano la cripta.' });
    nuovo('quest', { nome: 'La vendemmia di cenere', tipo: 'Secondaria', stato: 'Attiva', priorita: 'Media', committente: '@Bertrando Viti',
      obiettivo: 'Scortare i carri di vino fino a Corvara prima che la strada venga chiusa.', ricompensa: '200 mo e una botte del vino migliore' });
    nuovo('quest', { nome: 'Il figlio dell\'ostessa', tipo: 'Personale', stato: 'In sospeso', priorita: 'Bassa', committente: '@Tessa Brunvento',
      obiettivo: 'Capire dove sparisce Elio, il figlio di Tessa, ogni notte.' });

    // ── PG (finiscono anche nel Party di Sessione Live) ──
    nuovo('pg', { nome: 'Ilaria del Pozzo', classe: 'Chierica', razza: 'Umana', livello: 3, hp_max: 24, ca: 18, perc_pass: 13, giocatore: 'Giocatrice 1', motivazione: 'Ritrovare il tempio dove è cresciuta, sepolto dalla cenere.' });
    nuovo('pg', { nome: 'Grun Pietrafonda', classe: 'Guerriero', razza: 'Nano', livello: 3, hp_max: 31, ca: 17, perc_pass: 11, giocatore: 'Giocatore 2', motivazione: 'Ripagare un debito con Fratello Orsino.' });
    nuovo('pg', { nome: 'Selvaggia', classe: 'Ranger', razza: 'Elfa dei boschi', livello: 3, hp_max: 26, ca: 15, perc_pass: 15, giocatore: 'Giocatrice 3', motivazione: 'Proteggere gli animali che fuggono dal vulcano.' });
    nuovo('pg', { nome: 'Mirto Lanterna', classe: 'Bardo', razza: 'Halfling', livello: 3, hp_max: 20, ca: 14, perc_pass: 12, giocatore: 'Giocatore 4', motivazione: 'Scrivere la ballata dell\'eruzione, possibilmente da vivo.' });

    // ── Calendario, eventi, sessioni, tabelle, Sessione Zero, Wiki, clock ──
    const mesi = ['Gelo', 'Brina', 'Germoglio', 'Fioritura', 'Messe', 'Sole Alto', 'Calura', 'Vendemmia', 'Mosto', 'Nebbia', 'Brace', 'Lunga Notte'].map(n => ({ nome: n, giorni: 30, it: '' }));
    const ora = Date.now();
    App.saveActiveCampaign({
      calendario: { tipo: 'custom', nome: 'Calendario di Valmora', mesi, giorni_settimana: ['Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto', 'Riposo'], anno_base: 1, prefisso_anno: 'Anno', festivita: [], anno: 742, mese: 8, giorno: 14, ora: 18, minuti: 0 },
      calendarioEventi: [
        { id: 'cev_demo1', titolo: 'Prima scossa sull\'Ardegna', data: { anno: 742, mese: 8, giorno: 2 }, tipo: 'evento', categoria: 'disastro', layer: 'mondo', descrizione: 'La terra trema per tutta la notte. Al mattino, dal cratere sale fumo.', entita: [{ tipo: 'luoghi', id: ardegna, nome: 'Monte Ardegna' }], promemoriaGiorni: 3, completata: false, creatoAt: ora, aggiornatoAt: ora },
        { id: 'cev_demo2', titolo: 'Il party arriva a Valmora', data: { anno: 742, mese: 8, giorno: 9 }, tipo: 'evento', categoria: 'sociale', layer: 'campagna', descrizione: 'Prima sera al Tino Rovesciato.', entita: [{ tipo: 'luoghi', id: valmora, nome: 'Valmora' }], promemoriaGiorni: 3, completata: false, creatoAt: ora, aggiornatoAt: ora },
        { id: 'cev_demo3', titolo: 'Scontro nella cripta', data: { anno: 742, mese: 8, giorno: 12 }, tipo: 'evento', categoria: 'combattimento', layer: 'campagna', descrizione: 'Il party respinge i Custodi all\'ingresso della cripta.', entita: [{ tipo: 'luoghi', id: cripta, nome: 'Cripta della Fiamma Quieta' }], promemoriaGiorni: 3, completata: false, creatoAt: ora, aggiornatoAt: ora },
        { id: 'cev_demo4', titolo: 'Ultimi carri per Corvara', data: { anno: 742, mese: 8, giorno: 17 }, tipo: 'deadline', categoria: '', layer: 'campagna', descrizione: 'Dopo questa data la strada verrà chiusa dalla guardia.', entita: [{ tipo: 'luoghi', id: corvara, nome: 'Corvara' }], promemoriaGiorni: 5, conseguenza: 'La guardia chiude la strada: il vino resta a Valmora, Bertrando rischia la rovina e la Gilda dei Vignaioli diventa sospettosa verso il party.', completata: false, creatoAt: ora, aggiornatoAt: ora },
        { id: 'cev_demo6', titolo: 'Inizia la vendemmia', data: { anno: 742, mese: 7, giorno: 24 }, tipo: 'evento', categoria: 'sociale', layer: 'mondo', descrizione: 'Tutta Valmora è nelle vigne. Bertrando promette a Corvara il raccolto migliore da anni.', entita: [{ tipo: 'luoghi', id: valmora, nome: 'Valmora' }], promemoriaGiorni: 3, completata: false, creatoAt: ora, aggiornatoAt: ora },
        { id: 'cev_demo7', titolo: 'Le crepe nei campi', data: { anno: 742, mese: 8, giorno: 5 }, tipo: 'evento', categoria: 'disastro', layer: 'mondo', descrizione: 'Si aprono le prime crepe tra i filari. Dall\'Ardegna scende odore di zolfo.', entita: [{ tipo: 'luoghi', id: ardegna, nome: 'Monte Ardegna' }], promemoriaGiorni: 3, completata: false, creatoAt: ora, aggiornatoAt: ora },
        { id: 'cev_demo8', titolo: 'L\'amuleto tra le braci', data: { anno: 742, mese: 8, giorno: 10 }, tipo: 'evento', categoria: 'scoperta', layer: 'campagna', descrizione: 'Tra i resti della creatura di fuoco il party trova un amuleto dei Custodi della Cenere.', entita: [{ tipo: 'luoghi', id: valmora, nome: 'Valmora' }], promemoriaGiorni: 3, completata: false, creatoAt: ora, aggiornatoAt: ora },
        { id: 'cev_demo9', titolo: 'Consiglio di guerra a Corvara', data: { anno: 742, mese: 8, giorno: 22 }, tipo: 'evento', categoria: 'politico', layer: 'campagna', descrizione: 'Il capitano Dalia Ferraguto decide se evacuare la valle.', entita: [{ tipo: 'luoghi', id: corvara, nome: 'Corvara' }], promemoriaGiorni: 5, completata: false, creatoAt: ora, aggiornatoAt: ora },
      ],
      sessioni_log: [
        { id: 'sess_demo1', numero: 1, titolo: 'Cenere sul vino', data: new Date(ora - 14 * 864e5).toISOString().slice(0, 10), data_inworld: { anno: 742, mese: 8, giorno: 9 }, stato: 'giocata',
          recap: 'Il party arriva a Valmora mentre cade la prima cenere. Al Tino Rovesciato conosce Tessa e Bertrando, che offre un lavoro: scortare i carri a Corvara. Nella notte, una creatura di fuoco attacca le vigne: Grun la abbatte, ma tra le sue braci il gruppo trova un amuleto dei Custodi della Cenere.',
          creatoAt: ora, aggiornatoAt: ora },
        { id: 'sess_demo2', numero: 2, titolo: 'La cripta', data: new Date(ora - 7 * 864e5).toISOString().slice(0, 10), data_inworld: { anno: 742, mese: 8, giorno: 12 }, stato: 'giocata',
          recap: 'Fratello Orsino porta il party alla Cripta della Fiamma Quieta. All\'ingresso, i Custodi attaccano. Dentro, il primo dei tre anelli del sigillo è spezzato, e sul pavimento c\'è un\'impronta di zoccolo. Selvaggia nota che qualcuno è entrato e uscito molte volte.',
          creatoAt: ora, aggiornatoAt: ora },
      ],
      tabelleCasuali: [
        { id: 'tab_demo1', nome: 'Incontri sul Monte Ardegna', dado: '20', categoria: 'Viaggio & Incontri', luoghi: [ardegna],
          sorgente: '1-6 Una colata di lava improvvisa taglia il sentiero\n7-10 {1d4+1} Custodi della Cenere in pellegrinaggio\n11-14 Un elementale del fuoco minore che vaga confuso\n15-17 Un eremita che chiede di riportare il suo mulo a valle\n18-19 Una galleria di gas: TS su Costituzione CD 13\n20 Qualcosa di strano: [[Segni del vulcano]]', creatoAt: ora, aggiornatoAt: ora },
        { id: 'tab_demo2', nome: 'Segni del vulcano', dado: 'pesi', categoria: 'Ambiente & Atmosfera', luoghi: [],
          sorgente: '3 La cenere forma per un istante un volto nel cielo\n2 Tutti gli uccelli della valle tacciono di colpo\n2 Le botti del Tino Rovesciato si scaldano da sole\n1 Una scossa apre una crepa che mostra un\'antica scalinata', creatoAt: ora, aggiornatoAt: ora },
        { id: 'tab_demo3', nome: 'Voci al Tino Rovesciato', dado: '6', categoria: 'Strumenti Narrativi', luoghi: [locanda],
          sorgente: 'Bertrando ha venduto metà della vendemmia prima ancora di raccoglierla\nDi notte si vedono torce salire verso il cratere\nFratello Orsino non invecchia: mia nonna lo conosceva già vecchio\nA Corvara pagano il triplo per il vino che sa di cenere\nElio, il figlio di Tessa, porta un amuleto nuovo\nNella cripta c\'è un tesoro dei monaci, e nessuno ha il coraggio di prenderlo', creatoAt: ora, aggiornatoAt: ora },
      ],
      segreti: [
        { id: 'seg_demo1', titolo: 'Madre Cinerea ha spezzato il primo anello', scoperto: false, creatoAt: ora, aggiornatoAt: ora,
          descrizione: 'Madre Cinerea è entrata nella cripta tre mesi fa con i Custodi e ha spezzato il primo anello del sigillo. Le impronte di zoccolo sono sue.',
          indizi: [
            { id: 'ind_demo1', testo: 'Le impronte di zoccolo nella cripta: chi ha sangue infernale ha i piedi caprini', dove: { tipo: 'luoghi', id: cripta, nome: 'Cripta della Fiamma Quieta' }, condizione: 'Indagare CD 13 nella cripta', trovato: true },
            { id: 'ind_demo2', testo: 'Elio ha visto Madre Cinerea uscire dalla cripta con una chiave di bronzo', dove: { tipo: 'png', id: tessa, nome: 'Tessa Brunvento' }, condizione: 'Tessa lo dice solo se il party promette di proteggere Elio', trovato: false },
            { id: 'ind_demo3', testo: 'La chiave di bronzo della cripta manca dal reliquiario dei monaci', dove: { tipo: 'png', id: orsino, nome: 'Fratello Orsino' }, condizione: 'Persuasione CD 14, oppure aiutarlo a riordinare il reliquiario', trovato: false },
          ] },
      ],
      sessioneZero: { aspettative: { tono: 'Avventura classica', morte: 'Possibile', pvp: 'Solo con il consenso di entrambi', combattimento: 'Bilanciato', esplorazione: 'Molta', interazione: 'Bilanciata', note: 'Ogni due venerdì alle 21. I tiri si fanno in vista.' },
        linee: ['Violenza su bambini'], veli: ['Tortura esplicita'], strumenti: ['cartaX', 'linee', 'porta', 'stelle'], aggiornatoAt: ora },
      clocks: [{ nome: 'Eruzione dell\'Ardegna', max: 8, current: 3, nota: 'L\'Ardegna erutta: la cenere copre la valle e Valmora va evacuata (avanza di 1 per ogni anello spezzato o settimana passata)' },
               { nome: 'Pazienza della guardia di Corvara', max: 6, current: 1, nota: 'La guardia chiude la valle: nessuno entra o esce senza un lasciapassare' }],
      // Video verificati il 2026-11-07 (oEmbed di YouTube): musica e ambienti pensati per il gioco di ruolo
      playlist: [
        { id: 'pl_demo1', nome: 'Taverna', descrizione: 'Serate alla locanda di Valmora', tracce: [
          { id: 'tr_demo1', nome: 'Locanda affollata, con musica', url: 'https://www.youtube.com/watch?v=RUn1dJY6syc' },
          { id: 'tr_demo2', nome: 'Taverna medievale', url: 'https://www.youtube.com/watch?v=vyg5jJrZ42s' } ] },
        { id: 'pl_demo2', nome: 'Battaglia', descrizione: 'Scontri con i Custodi della Cenere', tracce: [
          { id: 'tr_demo3', nome: 'Combattimento, un\'ora', url: 'https://www.youtube.com/watch?v=t3B802PIuB0' },
          { id: 'tr_demo4', nome: 'Scontro teso', url: 'https://www.youtube.com/watch?v=378jfMSW8V4' } ] },
        { id: 'pl_demo3', nome: 'Esplorazione', descrizione: 'In viaggio sui fianchi dell\'Ardegna', tracce: [
          { id: 'tr_demo5', nome: 'Foresta misteriosa', url: 'https://www.youtube.com/watch?v=4Y6n-1XQSfE' },
          { id: 'tr_demo6', nome: 'Terre selvagge', url: 'https://www.youtube.com/watch?v=RQJiDxIiWAc' },
          { id: 'tr_demo7', nome: 'Ambienti di Tabletop Audio', url: 'https://tabletopaudio.com/' } ] },
        { id: 'pl_demo4', nome: 'La cripta', descrizione: 'Il rituale di Madre Cinerea', tracce: [
          { id: 'tr_demo8', nome: 'Rituale oscuro', url: 'https://www.youtube.com/watch?v=5Y7oXb_Vmsc' },
          { id: 'tr_demo9', nome: 'Sotterraneo', url: 'https://www.youtube.com/watch?v=wScEFaoqwPM' } ] },
      ],
      wiki: { ...(App.getActiveCampaign().wiki || {}), lore: [
        { id: 'n_demo1', titolo: 'L\'Ordine della Fiamma Quieta', categoria: 'Storia', tags: ['storia', 'ordine'], creatoAt: ora, aggiornatoAt: ora,
          contenuto: '<p>Tre secoli fa i monaci dell\'Ordine incatenarono il fuoco del ' + link('luogo:Monte Ardegna', 'Monte Ardegna') + ' con un sigillo di tre anelli, nascosto nella ' + link('luogo:Cripta della Fiamma Quieta', 'Cripta della Fiamma Quieta') + '.</p>' +
            '<h3>La regola</h3><p>Ogni monaco vegliava sul ' + link('Il sigillo dei tre anelli', 'sigillo') + ' per un anno intero, senza scendere a valle. In cambio ' + link('luogo:Valmora', 'Valmora') + ', il villaggio fondato dall\'Ordine, mandava pane e vino agli eremi sul vulcano. Da quei carri nasce il commercio che oggi la ' + link('fazione:Gilda dei Vignaioli', 'Gilda dei Vignaioli') + ' porta fino a ' + link('luogo:Corvara', 'Corvara') + '.</p>' +
            '<h3>La fine</h3><p>L\'ordine si sciolse un secolo fa: il vulcano taceva da così tanto che nessuno credeva più al pericolo. Ne resta solo ' + link('png:Fratello Orsino', 'Fratello Orsino') + '. #storia</p>' +
            '<div class="wiki-callout wiki-callout-read"><span class="wiki-callout-label">DA LEGGERE AD ALTA VOCE</span><p>Sopra la porta dell\'eremo, consumate dal vento, restano poche parole: «Finché uno veglia, tutti dormono».</p></div>' },
        { id: 'n_demo2', titolo: 'Il sigillo dei tre anelli', categoria: 'Magia', tags: ['magia'], creatoAt: ora, aggiornatoAt: ora,
          contenuto: '<p>Ogni anello trattiene un terzo del fuoco. Quando il terzo si spezza, il vulcano erutta.</p><p>Il primo anello è già rotto: il party lo ha visto nella ' + link('luogo:Cripta della Fiamma Quieta', 'Cripta della Fiamma Quieta') + '. Chi lo ha spezzato è ' + link('png:Madre Cinerea', 'Madre Cinerea') + ', ma i personaggi non lo sanno ancora.</p><div class="wiki-callout wiki-callout-secret"><span class="wiki-callout-label">SEGRETO DM</span><p>Il sigillo si ripara solo con il sacrificio volontario di chi lo ha creato: ' + link('png:Fratello Orsino', 'Fratello Orsino') + ' lo sa, e non lo dice.</p></div>' },
        { id: 'n_demo3', titolo: 'Chi sono i Custodi', categoria: 'Fazioni', tags: ['fazioni'], creatoAt: ora, aggiornatoAt: ora,
          contenuto: '<p>I ' + link('fazione:Custodi della Cenere', 'Custodi della Cenere') + ' sono arrivati a valle con le prime scosse, offrendo preghiere e pane a chi ha perso il raccolto. Li guida ' + link('png:Madre Cinerea', 'Madre Cinerea') + ', e al ' + link('luogo:Il Tino Rovesciato', 'Tino Rovesciato') + ' c\'è già chi li difende.</p><div class="wiki-callout wiki-callout-clue"><span class="wiki-callout-label">INDIZIO</span><p>Elio, il figlio di ' + link('png:Tessa Brunvento', 'Tessa Brunvento') + ', porta il loro amuleto sotto la camicia.</p></div>' },
        { id: 'n_demo4', titolo: 'La strada per Corvara', categoria: 'Luoghi', tags: ['viaggio'], creatoAt: ora, aggiornatoAt: ora,
          contenuto: '<p>Due giorni di carro da ' + link('luogo:Valmora', 'Valmora') + ' a ' + link('luogo:Corvara', 'Corvara') + ', lungo il fiume. ' + link('png:Bertrando Viti', 'Bertrando Viti') + ' deve far passare la vendemmia prima che ' + link('png:Capitano Dalia Ferraguto', 'il capitano Ferraguto') + ' chiuda la strada.</p>' },
      ], sessioni: [] },
    });

    Toast.show('Campagna di esempio pronta: esplora Dashboard, Wiki, Calendario e Generatori', 'success', 5000);
    App.navigateTo('campagna');
  };

  // Dalla pagina di presentazione (?demo=1) si arriva direttamente nella campagna di esempio
  document.addEventListener('DOMContentLoaded', () => {
    if (!new URLSearchParams(location.search).has('demo')) return;
    setTimeout(() => {
      try { crea(); } catch (e) {}
      history.replaceState(null, '', location.pathname);
    }, 700);
  });

  return { crea, NOME };
})();

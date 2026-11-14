/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   SCRITTOIO.JS — Pagina "Scrittoio": stemmi e documenti di gioco.
   Uno stemma si assegna a una Fazione o a un Luogo: diventa la loro
   immagine (su Drive se collegato, come ogni altra immagine) e nella
   Fazione restano le sue scelte, cosi' editti e sigilli di quella
   fazione portano il suo stemma. Un documento si salva nella Lore,
   da dove la Vista giocatori lo puo' condividere.
   ============================================================ */

const Scrittoio = (() => {
  const FONT_DOC = 'assets/fonts/documenti.css';
  const FONT_BASE = 'assets/fonts/documenti-base.css';
  const $ = (id) => document.getElementById(id);
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);
  const _nuovoSeme = () => Math.random().toString(36).slice(2, 8);
  const _nome = (x) => (x?.nome || x?.name || '').trim();

  const VOCI = [['stemma', 'Stemma'], ...Object.entries(Documenti.TIPI).map(([k, v]) => [k, v.nome])];
  let _voce = 'stemma', _montata = false, _turno = 0, _timer = null;
  let _opere = {};      // stato di ogni voce: { seme, ...campi }
  let _risultato = null;
  let _storia = [];
  let _modifica = null; // documento o stemma riaperto: { tipo: 'l' (Lore) | 'f' (Fazione), id, nome, voce }

  /* ── Stato ── */
  const _nomiCampagna = () => {
    const c = _camp();
    return { png: (c?.npcs || []).map(_nome).filter(Boolean), luoghi: (c?.locations || []).map(_nome).filter(Boolean), fazioni: (c?.factions || []).map(_nome).filter(Boolean) };
  };
  const _nuovaOpera = (voce) => {
    const seme = _nuovoSeme();
    if (voce === 'stemma') return { seme, ...Araldica.casuale(seme), conMotto: true, nome: '' };
    const prima = _opere[voce] || {};
    const testi = Documenti.testi(voce, seme, _nomiCampagna());
    // Se il testo nomina una fazione che ha uno stemma, il sigillo e' il suo
    const autrice = (_camp()?.factions || []).find((f) => (f.stemma || f.immagine) && String(testi.firma || '').includes(_nome(f)));
    return { seme, carta: prima.carta || (voce === 'gazzetta' || voce === 'menu' ? 'avorio' : 'pergamena'), eta: prima.eta || 'vissuta', effetto: prima.effetto || 'nessuno', sigillo: autrice ? autrice.id : '', ...testi };
  };
  // Cambiando il sigillo cambia anche chi firma: un editto non puo' portare lo stemma di altri
  const _cambiaSigillo = (id) => {
    const op = _opera(), fazioni = _camp()?.factions || [], scelta = fazioni.find((f) => f.id === id);
    op.sigillo = id;
    if (!scelta) return;
    fazioni.filter((f) => f !== scelta && _nome(f)).forEach((f) => {
      ['firma', 'corpo'].forEach((k) => { if (op[k]) op[k] = String(op[k]).split(_nome(f)).join(_nome(scelta)); });
    });
    _controlli();
  };
  const _opera = () => (_opere[_voce] = _opere[_voce] || _nuovaOpera(_voce));
  const _stemmaDi = (idFazione) => {
    const f = (_camp()?.factions || []).find((x) => x.id === idFazione);
    return f?.stemma || null;
  };
  // Un'immagine caricata dal DM sulla Fazione puo' fare da stemma nei documenti. Va incorporata:
  // un SVG usato come immagine non puo' leggere file esterni.
  // Immagini delle schede (ritratti delle taglie, stemmi caricati delle fazioni) dentro il documento.
  // Prima si leggevano con fetch: la protezione dell'app (CSP) e Google Drive lo bloccano, e le foto
  // in formati che il disegno non sa leggere (o enormi) davano il punto interrogativo.
  // Ora l'immagine passa da un <img> e da un canvas: esce sempre un JPEG leggero e leggibile.
  const _idDrive = (url) => /drive\.google\.com|googleusercontent\.com/.test(url)
    ? ((String(url).match(/\/file\/d\/([\w-]+)/) || String(url).match(/[?&]id=([\w-]+)/) || String(url).match(/\/d\/([\w-]+)/) || [])[1] || null) : null;
  const _comeJpeg = (src, cors, png) => new Promise((ok) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    const fine = (v) => { clearTimeout(t); ok(v); };
    const t = setTimeout(() => fine(null), 15000);
    img.onload = () => {
      try {
        if (!img.naturalWidth) return fine(null);
        const f = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * f)); c.height = Math.max(1, Math.round(img.naturalHeight * f));
        const g = c.getContext('2d');
        if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); } // nel ritratto le trasparenze diventano carta, non nero
        g.drawImage(img, 0, 0, c.width, c.height);
        fine(png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88));
      } catch (e) { fine(null); } // immagine di un sito che non permette di copiarla
    };
    img.onerror = () => fine(null);
    img.src = src;
  });
  let _ultimoMotivo = '';
  // png = true per gli stemmi delle fazioni: restano trasparenti sul foglio
  const _datiImmagine = async (url, png) => {
    _ultimoMotivo = '';
    if (!url) return null;
    if (url.startsWith('data:')) {
      const d = await _comeJpeg(url, false, png);
      if (!d) _ultimoMotivo = 'il formato dell’immagine non si riesce a leggere: ricaricala nella scheda (JPG o PNG)';
      return d;
    }
    const id = _idDrive(url);
    const daBlob = async (b) => {
      if (!b || !/^image\//.test(b.type)) return null;
      const u = URL.createObjectURL(b);
      const d = await _comeJpeg(u, false, png);
      URL.revokeObjectURL(u);
      return d;
    };
    if (id) {
      // 1. Con Drive collegato: i file caricati dall'app (l'accesso di Google vale solo per quelli)
      if (typeof GDrive !== 'undefined' && GDrive.token) {
        try {
          const r = await fetch('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media', { headers: { Authorization: 'Bearer ' + GDrive.token } });
          if (r.ok) { const d = await daBlob(await r.blob()); if (d) return d; }
        } catch (e) {}
      }
      // 2. Immagini condivise con "chiunque abbia il link", anche messe su Drive a mano o da un altro account
      if (typeof DriveBackup !== 'undefined' && DriveBackup.immaginePubblica) {
        const d = await daBlob(await DriveBackup.immaginePubblica(id));
        if (d) return d;
      }
    }
    const d = await _comeJpeg(typeof DriveBackup !== 'undefined' ? DriveBackup.toEmbeddableUrl(url) : url, true, png);
    if (!d) _ultimoMotivo = id
      ? 'su Google Drive non è condivisa con «chiunque abbia il link». Aprila su Drive, tocca Condividi e scegli «Chiunque abbia il link», oppure caricala dal dispositivo nella scheda'
      : 'il sito dove sta non permette di copiarla: caricala dal dispositivo nella scheda';
    return d;
  };

  /* ── Disegno ── */
  const _occupato = (si) => { const a = $('sc-attesa'); if (a) a.hidden = !si; };
  const disegna = () => {
    const turno = ++_turno;
    clearTimeout(_timer);
    _occupato(true);
    requestAnimationFrame(() => setTimeout(async () => {
      if (turno !== _turno) return;
      const voce = _voce, op = _opera();
      try {
        const fazione = (_camp()?.factions || []).find((f) => f.id === op.sigillo);
        const propria = voce !== 'stemma' && fazione && !fazione.stemma && fazione.immagine ? await _datiImmagine(fazione.immagine, true) : null;
        if (voce !== 'stemma' && fazione && !fazione.stemma && fazione.immagine && !propria) Toast.show('L’immagine di ' + _nome(fazione) + ' non si è potuta leggere: uso uno stemma inventato.', 'warning', 5000);
        // Taglia presa da una scheda: il ritratto del PNG o PG al posto della figura incappucciata
        const scheda = voce === 'taglia' ? _scheda(op.ritrattoDa) : null;
        const ritratto = scheda && scheda.immagine ? await _datiImmagine(scheda.immagine) : null;
        if (scheda && scheda.immagine && !ritratto) Toast.show('Il ritratto di ' + _nome(scheda) + ' non si è potuto usare: ' + (_ultimoMotivo || 'immagine non leggibile') + '. Per ora c’è la figura incappucciata.', 'warning', 7000);
        const m = voce === 'stemma' ? Araldica.genera({ ...op, nome: op.nome || '' })
          : Documenti.genera({ ...op, tipo: voce, stemma: _stemmaDi(op.sigillo), stemmaImg: propria, iniziale: propria ? _nome(fazione).charAt(0) : '', ritrattoImg: ritratto });
        const S = Cartografo.strumenti;
        const css = (await S.fontDa(FONT_BASE)) + (await S.fontDa(FONT_DOC));
        if (turno !== _turno) return;
        m.svgCompleto = voce === 'stemma' || m.svg.includes('<defs>') ? S.conFont(m.svg, css) : m.svg;
        try { m.canvas = await S.inCanvas(m.svgCompleto, m.W, m.H, 2); } catch (e) { m.canvas = null; }
        if (turno !== _turno) return;
        m.voce = voce;
        _risultato = m;
        _mostra();
      } catch (e) {
        if (turno !== _turno) return;
        if (typeof Debug !== 'undefined') Debug.warn('Scrittoio: ' + e);
        Toast.show('Non è stato possibile disegnarlo. Prova con “Nuovo”.', 'error', 5000);
      }
      _occupato(false);
    }, 20));
  };
  const _mostra = () => {
    const v = $('sc-vista'), m = _risultato;
    if (!v || !m) return;
    v.innerHTML = '';
    v.style.setProperty('--sc-ar', m.W + '/' + m.H);
    if (m.canvas) { m.canvas.setAttribute('role', 'img'); m.canvas.setAttribute('aria-label', m.nome); v.appendChild(m.canvas); } else v.innerHTML = m.svg;
    const png = $('sc-png');
    if (png) png.disabled = !m.canvas;
    $('sc-precedente').disabled = !_storia.length;
  };
  const _ricorda = () => { if (_risultato) { _storia.push({ voce: _voce, op: JSON.parse(JSON.stringify(_opera())) }); if (_storia.length > 20) _storia.shift(); } };
  const nuovo = () => { _ricorda(); if (_modifica && _modifica.voce === _voce) _modifica = null; _opere[_voce] = _nuovaOpera(_voce); _controlli(); disegna(); };
  // Foglio bianco: tutti i testi vuoti, si scrive quello che si vuole
  const foglioBianco = () => {
    if (_voce === 'stemma') return;
    _ricorda();
    const op = _opera();
    ['titolo', 'soggetto', 'corpo', 'premio', 'firma'].forEach((k) => { op[k] = ''; });
    op.sigillo = '';
    _controlli(); disegna();
    setTimeout(() => $('sc-tit')?.focus(), 50);
  };
  const smettiModifica = () => { _modifica = null; _controlli(); };
  const precedente = () => {
    const f = _storia.pop();
    if (!f) return;
    _voce = f.voce; _opere[f.voce] = f.op;
    _controlli(); disegna();
  };
  const scegli = (v) => { if (v !== _voce) { _ricorda(); _voce = v; _controlli(); disegna(); } };
  const _blasone = (op = _opera()) => (op.blasoneMano ? String(op.blasone || '') : Araldica.blasona(op));
  /* ── Taglie dalle schede di PNG e PG ── */
  // v = "png:id" o "pg:id"
  const _scheda = (v) => {
    const [t, id] = String(v || '').split(/:(.*)/);
    if (!id) return null;
    const c = _camp();
    return (t === 'pg' ? (c?.pg || []) : (c?.npcs || [])).find((x) => x.id === id) || null;
  };
  const _testoPiano = (s) => (typeof Testo !== 'undefined' ? Testo.semplice(s) : String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const _daScheda = (v) => {
    const op = _opera();
    op.ritrattoDa = v || '';
    const s = _scheda(v);
    if (s) {
      const pg = v.startsWith('pg:');
      op.soggetto = _nome(s);
      // Segni particolari: chi e', piu' l'aspetto se c'e' (una riga sola, si puo' cambiare)
      const chi = [s.razza || s.race, pg ? s.classe : (s.job || s.ruolo)].filter(Boolean).join(', ');
      const aspetto = _testoPiano(s.apparenza || s.description || '').slice(0, 140);
      const segni = [chi, aspetto].filter(Boolean).join('. ');
      const accuse = String(op.corpo || '').split(/\n+/).filter((r) => !/^Segni particolari:/i.test(r)).join('\n').trim();
      op.corpo = accuse + (segni ? (accuse ? '\n' : '') + 'Segni particolari: ' + segni + (/[.!?]$/.test(segni) ? '' : '.') : '');
      // Ricompensa: cresce col GS del PNG o col livello del PG
      const gs = String(s.cr || '').includes('/') ? (() => { const [a, b] = String(s.cr).split('/'); return (+a || 0) / (+b || 1); })() : parseFloat(s.cr);
      const liv = parseInt(s.livello, 10);
      const base = pg ? (liv > 0 ? liv * 100 : 300) : (gs > 0 ? Math.max(25, Math.round(gs * 120 / 25) * 25) : 0);
      if (base) op.premio = base.toLocaleString('it-IT') + ' monete d\'oro';
    }
    _controlli();
    disegna();
  };

  const _campo = (k, val) => {
    if (k === 'sigillo') _cambiaSigillo(val); else _opera()[k] = val;
    if (_voce === 'stemma') {
      if (k === 'blasone') { if (!_opera().blasoneMano) { _opera().blasoneMano = true; _sotto(); } return; }
      const t = $('sc-blasone'); if (t && !_opera().blasoneMano) t.value = _blasone();
    }
    clearTimeout(_timer); _timer = setTimeout(disegna, 250);
  };

  /* ── Controlli ── */
  const _sel = (id, et, lista, val, k) => '<div class="form-group"><label class="form-label" for="' + id + '">' + _esc(et) + '</label><select id="' + id + '" class="form-select" onchange="Scrittoio._campo(\'' + k + '\',this.value)">' +
    lista.map(([v, l]) => '<option value="' + _esc(v) + '"' + (v === val ? ' selected' : '') + '>' + _esc(l) + '</option>').join('') + '</select></div>';
  const _testo = (id, et, val, k, ph = '') => '<div class="form-group"><label class="form-label" for="' + id + '">' + _esc(et) + '</label><input type="text" id="' + id + '" class="form-input" autocomplete="off" value="' + _esc(val) + '" placeholder="' + _esc(ph) + '" oninput="Scrittoio._campo(\'' + k + '\',this.value)"></div>';
  const _area = (id, et, val, k, righe = 8, ph = '') => '<div class="form-group"><label class="form-label" for="' + id + '">' + _esc(et) + '</label><textarea id="' + id + '" class="form-input" rows="' + righe + '" placeholder="' + _esc(ph) + '" style="resize:vertical;line-height:1.45;" oninput="Scrittoio._campo(\'' + k + '\',this.value)">' + _esc(val) + '</textarea></div>';
  const _controlli = () => {
    const tab = $('sc-voci'), box = $('sc-controlli');
    if (!tab || !box) return;
    tab.innerHTML = VOCI.map(([k, l]) => '<button type="button" role="tab" aria-selected="' + (k === _voce) + '" class="sc-scelta" onclick="Scrittoio.scegli(\'' + k + '\')">' + (typeof Scena !== 'undefined' ? Scena.icona(k) : '') + '<span>' + _esc(l) + '</span></button>').join('');
    const op = _opera();
    const inModifica = _modifica && _modifica.voce === _voce;
    const avviso = inModifica ? '<div class="sc-modifica"><span>Stai modificando <strong>' + _esc(_modifica.nome) + '</strong>' + (_modifica.tipo === 'l' ? ', dalla Lore della Wiki' : ', lo stemma della Fazione') + '.</span><button type="button" class="btn btn-ghost btn-sm" onclick="Scrittoio.smettiModifica()">Smetti</button></div>' : '';
    if (_voce === 'stemma') {
      box.innerHTML = avviso + _testo('sc-nome', 'Nome sotto lo stemma', op.nome, 'nome', 'Facoltativo') +
        '<div class="carto-griglia">' +
          _sel('sc-forma', 'Forma', Araldica.FORME_ELENCO, op.forma, 'forma') + _sel('sc-part', 'Partizione', Araldica.PARTIZIONI_ELENCO, op.partizione, 'partizione') +
          _sel('sc-s1', 'Primo colore', Araldica.SMALTI_ELENCO, op.smalto1, 'smalto1') + _sel('sc-s2', 'Secondo colore', Araldica.SMALTI_ELENCO, op.smalto2, 'smalto2') +
          _sel('sc-sim', 'Simbolo', Araldica.SIMBOLI_ELENCO, op.simbolo, 'simbolo') + _sel('sc-orn', 'Ornamento', Araldica.ORNAMENTI_ELENCO, op.ornamento, 'ornamento') +
        '</div>' + _testo('sc-motto', 'Motto', op.motto, 'motto', 'Lascia vuoto per non averlo') +
        '<label class="carto-spunta" for="sc-bordura"><input type="checkbox" id="sc-bordura"' + (op.bordura ? ' checked' : '') + ' onchange="Scrittoio._campo(\'bordura\',this.checked)"><span>Bordura</span></label>' +
        '<div class="form-hint">Hai già uno stemma tuo? Caricalo come immagine nella scheda della Fazione: verrà usato anche su editti e lettere.</div>';
    } else {
      const fazioni = (_camp()?.factions || []).filter((f) => f.stemma || f.immagine);
      const v = _voce;
      const etTit = { lettera: 'Saluto', gazzetta: 'Nome della gazzetta', menu: 'Nome della locanda' }[v] || 'Titolo';
      const phTit = { lettera: 'es. Caro amico,', gazzetta: 'es. La Voce di Porto Nebbia', contratto: 'es. Contratto di scorta', menu: 'es. Locanda del Cinghiale Zoppo' }[v] || 'es. Avviso alla cittadinanza';
      const etCorpo = { tesoro: 'Indizio', taglia: 'Accuse', gazzetta: 'Articolo', contratto: 'Clausole (una per riga)', menu: 'Piatti e prezzi (uno per riga)' }[v] || 'Testo';
      const phCorpo = { contratto: 'Una clausola per riga: si numerano da sole (I., II., III.).', menu: 'Una riga per piatto: Stufato — 6 mr. Una riga che finisce coi due punti (Da bere:) fa da titolo.' }[v] || 'Scrivi qui quello che vuoi. Una riga vuota fa un nuovo paragrafo; più testo scrivi, più piccola diventa la scrittura.';
      const etFirma = { avviso: 'A chi rivolgersi', gazzetta: 'Sotto il nome (data, prezzo)', contratto: 'Firma della prima parte', menu: 'In fondo (un motto, una regola)' }[v] || 'Firma';
      box.innerHTML = avviso + '<div class="form-hint" style="margin:0 0 10px;">Ogni testo si può cambiare: scrivi direttamente qui sotto. Con <strong>Foglio bianco</strong> parti da zero.</div>' +
        _testo('sc-tit', etTit, op.titolo, 'titolo', phTit) +
        (v === 'taglia' ? (() => {
          const c = _camp(), png = (c?.npcs || []).filter(_nome), pgs = (c?.pg || []).filter(_nome);
          if (!png.length && !pgs.length) return '';
          const opz = (l, t) => l.map((x) => '<option value="' + t + ':' + _esc(x.id) + '"' + (op.ritrattoDa === t + ':' + x.id ? ' selected' : '') + '>' + _esc(_nome(x)) + (x.immagine ? '' : ' (senza ritratto)') + '</option>').join('');
          return '<div class="form-group"><label class="form-label" for="sc-dalla">Prendi da una scheda</label><select id="sc-dalla" class="form-select" onchange="Scrittoio._daScheda(this.value)">' +
            '<option value="">Nessuna: ricercato inventato</option>' + (png.length ? '<optgroup label="PNG">' + opz(png, 'png') + '</optgroup>' : '') + (pgs.length ? '<optgroup label="PG">' + opz(pgs, 'pg') + '</optgroup>' : '') +
            '</select><div class="form-hint">Nome, segni particolari e ricompensa (dal GS o dal livello) si riempiono da soli; se la scheda ha un’immagine diventa il ritratto.</div></div>';
        })() + _testo('sc-sog', 'Ricercato', op.soggetto, 'soggetto') : v === 'gazzetta' ? _testo('sc-sog', 'Titolo dell’articolo', op.soggetto, 'soggetto', 'es. Fuoco nei magazzini del porto') : '') +
        _area('sc-corpo', etCorpo, op.corpo, 'corpo', ['lettera', 'editto', 'gazzetta', 'menu'].includes(v) ? 9 : v === 'contratto' ? 7 : 5, phCorpo) +
        (v === 'taglia' ? _testo('sc-premio', 'Ricompensa', op.premio, 'premio') : v === 'contratto' ? _testo('sc-premio', 'Firma della seconda parte', op.premio, 'premio') : v === 'gazzetta' ? _area('sc-premio', 'In breve (riquadro in fondo, vuoto per toglierlo)', op.premio, 'premio', 4) : '') +
        _testo('sc-firma', etFirma, op.firma, 'firma') +
        '<div class="carto-griglia">' +
          _sel('sc-carta', 'Carta', Object.entries(Documenti.CARTE).map(([k, v]) => [k, v.nome]), op.carta, 'carta') +
          _sel('sc-eta', 'Stato', Object.entries(Documenti.ETA).map(([k, v]) => [k, v[0]]), op.eta, 'eta') +
          _sel('sc-eff', 'Effetto', Object.entries(Documenti.EFFETTI), op.effetto || 'nessuno', 'effetto') +
          ((_voce === 'lettera' || _voce === 'editto' || _voce === 'contratto') && fazioni.length ? _sel('sc-sig', 'Stemma e sigillo', [['', 'Inventato'], ...fazioni.map((f) => [f.id, _nome(f)])], op.sigillo, 'sigillo') : '') +
        '</div>' +
        ((_voce === 'lettera' || _voce === 'editto' || _voce === 'contratto') && !fazioni.length ? '<div class="form-hint">Dai uno stemma a una Fazione, anche caricando un’immagine tua nella sua scheda, e qui potrai usarlo come sigillo.</div>' : '');
    }
    $('sc-azione').textContent = _voce === 'stemma' ? 'Assegna…' : 'Salva nella Wiki';
    $('sc-bianco').style.display = _voce === 'stemma' ? 'none' : '';
    _sotto();
    $('sc-copia').style.display = _voce === 'stemma' ? 'none' : '';
    if ($('sc-mostra')) $('sc-mostra').textContent = _voce === 'stemma' ? 'Mostra' : 'Mostra ai giocatori';
    $('sc-nuovo').title = _voce === 'stemma' ? 'Uno stemma diverso' : 'Un documento diverso, scritto con i nomi della tua campagna';
    $('sc-precedente').disabled = !_storia.length;
  };

  const _sotto = () => {
    const el = $('sc-sotto');
    if (!el) return;
    $('page-scrittoio')?.classList.toggle('sc-con-sotto', _voce === 'stemma');
    if (_voce !== 'stemma') { el.innerHTML = ''; el.hidden = true; return; }
    const op = _opera();
    el.hidden = false;
    el.innerHTML = '<div class="sc-blasone-testa"><label class="form-label" for="sc-blasone" style="margin:0;">Blasonatura</label>' +
      (op.blasoneMano ? '<button type="button" class="btn btn-ghost btn-sm" onclick="Scrittoio.riscriviBlasone()" title="Torna alla descrizione scritta dallo stemma">Riscrivi dallo stemma</button>' : '<span class="text-muted" style="font-size:0.75rem;">si scrive da sola, puoi cambiarla</span>') + '</div>' +
      '<textarea id="sc-blasone" class="form-input sc-blasone" rows="2" oninput="Scrittoio._campo(\'blasone\',this.value)">' + _esc(_blasone(op)) + '</textarea>';
  };
  const riscriviBlasone = () => { const op = _opera(); op.blasoneMano = false; op.blasone = ''; _sotto(); };

  /* ── Esportazione ── */
  // A schermo intero, senza niente dell'app intorno: si gira l'iPad verso i giocatori. Tocca per chiudere.
  const mostra = () => {
    if (!_risultato) return;
    document.getElementById('sc-schermo')?.remove();
    const o = document.createElement('div');
    o.id = 'sc-schermo';
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-label', _risultato.nome || 'Documento');
    const src = _risultato.canvas ? _risultato.canvas.toDataURL('image/png') : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(_risultato.svgCompleto || _risultato.svg);
    o.innerHTML = '<img alt="' + _esc(_risultato.nome || 'Documento') + '" src="' + src + '"><button type="button" class="sc-schermo-chiudi" aria-label="Chiudi">×</button><div class="sc-schermo-nota">Tocca per chiudere</div>';
    const chiudi = () => { try { if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {} o.remove(); document.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') chiudi(); };
    o.addEventListener('click', chiudi);
    document.addEventListener('keydown', esc);
    document.body.appendChild(o);
    try { const fs = o.requestFullscreen || o.webkitRequestFullscreen; if (fs) { const p = fs.call(o); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
    setTimeout(() => o.querySelector('.sc-schermo-nota')?.classList.add('via'), 1800);
  };

  const _nomeFile = () => (_risultato?.nome || 'documento').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'documento';
  const scaricaPng = () => {
    if (!_risultato?.canvas) return;
    _risultato.canvas.toBlob((b) => { if (b) Cartografo.strumenti.scarica(b, _nomeFile() + '.png'); else Toast.show('PNG non riuscito: prova con “Scarica SVG”.', 'error', 5000); }, 'image/png');
  };
  const scaricaSvg = () => { if (_risultato) Cartografo.strumenti.scarica(new Blob([_risultato.svgCompleto], { type: 'image/svg+xml' }), _nomeFile() + '.svg'); };
  const _testoDoc = () => {
    const o = _opera();
    return [o.titolo, o.soggetto, o.corpo, o.premio ? 'Ricompensa: ' + o.premio : '', o.firma].filter(Boolean).join('\n\n');
  };
  const copia = async () => {
    try { await navigator.clipboard.writeText(_testoDoc()); Toast.show('Testo copiato', 'success', 1800); }
    catch (e) { Toast.show('Il browser non ha permesso di copiare il testo', 'warning', 3500); }
  };

  // Un'immagine ridotta, per non appesantire la campagna
  const _ridotta = (largMax, tipo = 'image/png', qualita, fondo) => {
    const c = _risultato.canvas, f = Math.min(1, largMax / c.width), t = document.createElement('canvas');
    t.width = Math.round(c.width * f); t.height = Math.round(c.height * f);
    const g = t.getContext('2d');
    if (fondo) { g.fillStyle = fondo; g.fillRect(0, 0, t.width, t.height); }
    g.drawImage(c, 0, 0, t.width, t.height);
    return t.toDataURL(tipo, qualita);
  };

  /* ── Modale: assegna lo stemma / salva il documento ── */
  const _modale = () => {
    if ($('modal-sc-azione')) return;
    const m = document.createElement('div');
    m.className = 'modal-overlay hidden'; m.id = 'modal-sc-azione'; m.style.display = 'none';
    m.onclick = (e) => { if (e.target === m) Modal.close('sc-azione'); };
    m.innerHTML = '<div class="modal" style="max-width:460px;"><div class="modal-header"><h3 class="modal-title" id="sc-az-titolo"></h3><button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'sc-azione\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div class="modal-body" id="sc-az-corpo"></div><div class="modal-footer" id="sc-az-piede"></div></div>';
    document.body.appendChild(m);
  };
  const _senzaCampagna = (cosa) => {
    $('sc-az-titolo').textContent = cosa;
    $('sc-az-corpo').innerHTML = '<p style="margin:0;line-height:1.55;">Serve una campagna aperta: aprine una e poi torna qui. Il tuo lavoro resta dov’è.</p>';
    $('sc-az-piede').innerHTML = '<button class="btn btn-ghost" onclick="Modal.close(\'sc-azione\')">Annulla</button><button class="btn btn-primary" onclick="Modal.close(\'sc-azione\');App.navigateTo(\'home\')">Scegli una campagna</button>';
    Modal.open('sc-azione');
  };
  const azione = () => {
    if (!_risultato) return;
    _modale();
    const camp = _camp();
    if (_voce === 'stemma') {
      if (!camp) return _senzaCampagna('Assegna lo stemma');
      const faz = (camp.factions || []).filter(_nome), luo = (camp.locations || []).filter(_nome);
      $('sc-az-titolo').textContent = 'Assegna lo stemma';
      if (!faz.length && !luo.length) {
        $('sc-az-corpo').innerHTML = '<p style="margin:0;line-height:1.55;">Questa campagna non ha ancora Fazioni né Luoghi. Creane uno nella Wiki, oppure scarica lo stemma come immagine.</p>';
        $('sc-az-piede').innerHTML = '<button class="btn btn-primary" onclick="Modal.close(\'sc-azione\')">Va bene</button>';
        Modal.open('sc-azione');
        return;
      }
      const gruppo = (et, l, t) => (l.length ? '<optgroup label="' + et + '">' + l.map((x) => '<option value="' + t + ':' + _esc(x.id) + '">' + _esc(_nome(x)) + (x.immagine ? ' (ha già un’immagine)' : '') + '</option>').join('') + '</optgroup>' : '');
      $('sc-az-corpo').innerHTML = '<div class="form-group" style="margin-bottom:8px;"><label class="form-label" for="sc-az-a">A chi appartiene</label><select id="sc-az-a" class="form-select">' + gruppo('Fazioni', faz, 'f') + gruppo('Luoghi', luo, 'l') + '</select></div>' +
        '<div class="carto-nota">Diventa l’immagine della sua scheda e, se c’era già un’immagine, la sostituisce. Una Fazione potrà usarlo anche come sigillo su editti e lettere.</div>';
      $('sc-az-piede').innerHTML = '<button class="btn btn-ghost" onclick="Modal.close(\'sc-azione\')">Annulla</button><button class="btn btn-primary" id="sc-az-ok" onclick="Scrittoio._confermaStemma()">Assegna</button>';
      if (_modifica && _modifica.tipo === 'f' && faz.some((f) => f.id === _modifica.id)) $('sc-az-a').value = 'f:' + _modifica.id;
    } else {
      if (!camp) return _senzaCampagna('Salva nella Wiki');
      const drive = typeof DriveBackup !== 'undefined' && DriveBackup.isConnected();
      $('sc-az-titolo').textContent = 'Salva nella Wiki';
      $('sc-az-corpo').innerHTML = '<div class="form-group" style="margin-bottom:8px;"><label class="form-label" for="sc-az-nome">Titolo della scheda</label><input type="text" id="sc-az-nome" class="form-input" autocomplete="off" value="' + _esc(_risultato.nome) + '"></div>' +
        '<label class="carto-spunta" for="sc-az-vg" style="margin-bottom:8px;"><input type="checkbox" id="sc-az-vg"><span>Mostralo anche nella <strong>Vista giocatori</strong> (il link che mandi al gruppo)</span></label>' +
        '<div class="carto-nota">Lo trovi in Wiki, tra le schede Lore.</div>' +
        '<div class="carto-nota">' + (drive ? 'L’immagine del documento verrà salvata su Google Drive, il testo nella scheda.' : '<strong>Google Drive non è collegato:</strong> nella scheda si salva solo il testo. Scarica il PNG per avere anche l’immagine, oppure collega Drive dalle Impostazioni.') + '</div>';
      $('sc-az-piede').innerHTML = '<button class="btn btn-ghost" onclick="Modal.close(\'sc-azione\')">Annulla</button><button class="btn btn-primary" id="sc-az-ok" onclick="Scrittoio._confermaDocumento()">Salva</button>';
      const riaperta = _modifica && _modifica.tipo === 'l' && _modifica.voce === _voce && (camp.wiki?.lore || []).some((n) => n.id === _modifica.id);
      if (riaperta) {
        $('sc-az-nome').value = _modifica.nome;
        $('sc-az-corpo').insertAdjacentHTML('afterbegin', '<div class="form-group" style="margin-bottom:10px;"><label class="carto-spunta"><input type="radio" name="sc-az-dove" value="aggiorna" checked><span>Aggiorna «' + _esc(_modifica.nome) + '»</span></label><label class="carto-spunta"><input type="radio" name="sc-az-dove" value="nuova"><span>Salva come scheda nuova</span></label></div>');
      }
    }
    Modal.open('sc-azione');
  };
  const riapri = () => {
    _modale();
    const camp = _camp();
    if (!camp) return _senzaCampagna('Riapri');
    const stemmi = (camp.factions || []).filter((f) => f.stemma && _nome(f));
    const docs = (camp.wiki?.lore || []).filter((n) => n.scrittoio && n.scrittoio.op);
    const nomeVoce = (v) => (VOCI.find(([k]) => k === v) || [v, v])[1];
    $('sc-az-titolo').textContent = 'Riapri per modificare';
    const nota = '<div class="carto-nota">Si riaprono i documenti salvati nella Wiki da oggi in poi: di quelli più vecchi è rimasto solo il testo nella scheda, che puoi copiare in un Foglio bianco.</div>';
    if (!stemmi.length && !docs.length) {
      $('sc-az-corpo').innerHTML = '<p style="margin:0 0 8px;line-height:1.55;">Non c’è ancora niente da riaprire: salva un documento nella Wiki o assegna uno stemma a una Fazione.</p>' + nota;
      $('sc-az-piede').innerHTML = '<button class="btn btn-primary" onclick="Modal.close(\'sc-azione\')">Va bene</button>';
      Modal.open('sc-azione');
      return;
    }
    const prima = _voce === 'stemma' ? 'f' : 'l';
    const gruppo = (et, l, t, nm) => (l.length ? '<optgroup label="' + et + '">' + l.map((x) => '<option value="' + t + ':' + _esc(x.id) + '">' + _esc(nm(x)) + '</option>').join('') + '</optgroup>' : '');
    const gD = gruppo('Documenti nella Wiki', docs, 'l', (n) => (n.titolo || 'Senza titolo') + ' (' + nomeVoce(n.scrittoio.voce) + ')');
    const gS = gruppo('Stemmi delle Fazioni', stemmi, 'f', _nome);
    $('sc-az-corpo').innerHTML = '<div class="form-group" style="margin-bottom:8px;"><label class="form-label" for="sc-az-r">Cosa vuoi modificare</label><select id="sc-az-r" class="form-select">' + (prima === 'f' ? gS + gD : gD + gS) + '</select></div>' + nota;
    $('sc-az-piede').innerHTML = '<button class="btn btn-ghost" onclick="Modal.close(\'sc-azione\')">Annulla</button><button class="btn btn-primary" onclick="Scrittoio._confermaRiapri()">Riapri</button>';
    Modal.open('sc-azione');
  };
  const _confermaRiapri = () => {
    const [t, id] = ($('sc-az-r')?.value || '').split(/:(.*)/);
    const camp = _camp();
    if (!id || !camp) return;
    _ricorda();
    if (t === 'f') {
      const f = (camp.factions || []).find((x) => x.id === id);
      if (!f || !f.stemma) return;
      const st = JSON.parse(JSON.stringify(f.stemma));
      _voce = 'stemma';
      _opere.stemma = { seme: _nuovoSeme(), ...st, conMotto: !!st.motto, nome: st.nome || '', blasone: st.blasone || '', blasoneMano: !!st.blasoneMano };
      _modifica = { tipo: 'f', id, nome: _nome(f), voce: 'stemma' };
    } else {
      const n = (camp.wiki?.lore || []).find((x) => x.id === id);
      if (!n || !n.scrittoio) return;
      const v = n.scrittoio.voce;
      if (!Documenti.TIPI[v]) return;
      _voce = v;
      _opere[v] = JSON.parse(JSON.stringify(n.scrittoio.op));
      _modifica = { tipo: 'l', id, nome: n.titolo || 'Senza titolo', voce: v };
    }
    Modal.close('sc-azione');
    _controlli(); disegna();
  };

  const _attendi = (testo) => { const b = $('sc-az-ok'); if (b) { b.disabled = true; b.textContent = testo; } };
  const _riprova = (testo) => { const b = $('sc-az-ok'); if (b) { b.disabled = false; b.textContent = testo; } };
  const _confermaStemma = async () => {
    const [t, id] = ($('sc-az-a').value || '').split(/:(.*)/);
    if (!id || !_risultato?.canvas) { if (!_risultato?.canvas) Toast.show('Questo browser non riesce a creare l’immagine dello stemma.', 'warning', 5000); return; }
    _attendi('Salvataggio…');
    try {
      const camp = _camp(), chiave = t === 'f' ? 'factions' : 'locations', lista = camp[chiave] || [], el = lista.find((x) => x.id === id);
      const url = await DriveBackup.uploadImage(_ridotta(480), 'stemma_' + _nome(el));
      const op = { ..._risultato.opzioni, nome: _opera().nome || '', blasone: _blasone(), blasoneMano: !!_opera().blasoneMano };
      App.saveActiveCampaign({ [chiave]: lista.map((x) => (x.id !== id ? x : { ...x, immagine: url, ...(t === 'f' ? { stemma: op, simbolo: x.simbolo || (Araldica.SIMBOLI_ELENCO.find(([k]) => k === op.simbolo)?.[1] || '') + (op.motto ? ' — “' + op.motto + '”' : '') } : {}) })) });
      Modal.close('sc-azione');
      Toast.show('Stemma assegnato a ' + _nome(el), 'success', 3000);
      _controlli();
    } catch (e) {
      Toast.show('Non è stato possibile salvarlo: ' + (e?.message || 'errore sconosciuto'), 'error', 6000);
      _riprova('Assegna');
    }
  };
  // Aggiunge la scheda a quelle che vedono i giocatori; se la vista e' attiva la ripubblica subito
  const _vistaGiocatori = (id) => {
    const vg = { attiva: false, lore: [], ...(_camp()?.vistaGiocatori || {}) };
    if (!(vg.lore || []).includes(id)) vg.lore = [...(vg.lore || []), id];
    App.saveActiveCampaign({ vistaGiocatori: vg });
    if (vg.attiva && typeof VistaGiocatori !== 'undefined') setTimeout(() => VistaGiocatori.pubblica(true), 300);
    else setTimeout(() => Toast.show('Pronto per la Vista giocatori: attivala dalla Dashboard per mandare il link al gruppo.', 'info', 5000), 3200);
  };
  const _confermaDocumento = async () => {
    const titolo = ($('sc-az-nome').value || '').trim() || _risultato.nome;
    const drive = typeof DriveBackup !== 'undefined' && DriveBackup.isConnected();
    _attendi(drive ? 'Caricamento su Drive…' : 'Salvataggio…');
    try {
      const o = _opera();
      const par = [o.titolo && '<p><strong>' + _esc(o.titolo) + '</strong></p>', o.soggetto && '<p><strong>' + _esc(o.soggetto) + '</strong></p>',
        ...String(o.corpo || '').split(/\n+/).filter(Boolean).map((p) => '<p>' + _esc(p) + '</p>'), o.premio && '<p>' + (_voce === 'taglia' ? 'Ricompensa: ' : '') + _esc(o.premio).replace(/\n+/g, '<br>') + '</p>', o.firma && '<p><em>' + _esc(o.firma) + '</em></p>'].filter(Boolean).join('');
      let img = '';
      if (drive && _risultato.canvas) {
        const url = await DriveBackup.uploadImage(_ridotta(1200, 'image/jpeg', 0.88, '#2a231c'), 'documento_' + titolo);
        if (/^https?:/.test(url)) img = '<p><img src="' + _esc(DriveBackup.toEmbeddableUrl(url)) + '" alt="' + _esc(titolo) + '" style="max-width:100%;"></p>';
      }
      const cfg = WikiSections._getCfg('lore');
      const aggiorna = document.querySelector('input[name="sc-az-dove"]:checked')?.value === 'aggiorna' && _modifica;
      const item = (aggiorna && (cfg.getData(_camp()) || []).find((x) => x.id === _modifica.id)) || cfg.newItem();
      item.nome = titolo; item.contenuto = img + par;
      item.scrittoio = { voce: _voce, op: JSON.parse(JSON.stringify(o)) };
      cfg.saveItem(_camp(), item);
      try { WikiSections.renderCounters(); } catch (e) {}
      Modal.close('sc-azione');
      if ($('sc-az-vg')?.checked) _vistaGiocatori(item.id);
      _modifica = { tipo: 'l', id: item.id, nome: titolo, voce: _voce };
      _controlli();
      Toast.show(aggiorna ? '“' + titolo + '” aggiornato nella Lore' : '“' + titolo + '” è nella Lore della Wiki', 'success', 3000);
    } catch (e) {
      Toast.show('Non è stato possibile salvarlo: ' + (e?.message || 'errore sconosciuto'), 'error', 6000);
      _riprova('Salva');
    }
  };

  /* ── Pagina ── */
  const _stile = () => {
    if ($('sc-stile')) return;
    Cartografo.strumenti.stile();
    const st = document.createElement('style');
    st.id = 'sc-stile';
    st.textContent =
      '#page-scrittoio { container-type:inline-size; }' +
      '#sc-voci { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:var(--space-sm); }' +
      '#sc-stage { position:relative; display:flex; align-items:center; justify-content:center; padding:14px; height:max(460px, calc(100vh - 300px)); height:max(460px, calc(100dvh - 300px)); background:var(--bg-tertiary); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; }' +
      '#sc-vista { width:100%; height:100%; display:flex; align-items:center; justify-content:center; min-height:0; }' +
      '#sc-vista canvas, #sc-vista svg { display:block; max-width:100%; max-height:100%; width:auto; height:auto; }' +
      '#sc-attesa { position:absolute; left:50%; top:12px; transform:translateX(-50%); padding:6px 14px; background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border); border-radius:var(--radius-full); font-size:0.88rem; box-shadow:var(--shadow-md); z-index:2; white-space:nowrap; }' +
      '#sc-attesa[hidden] { display:none; }' +
      '#sc-schermo { position:fixed; inset:0; z-index:100000; background:#0d0b09; display:flex; align-items:center; justify-content:center; padding:max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)); cursor:zoom-out; }' +
      '#sc-schermo img { max-width:100%; max-height:100%; object-fit:contain; }' +
      '.sc-schermo-chiudi { position:absolute; top:max(12px, env(safe-area-inset-top)); right:12px; width:44px; height:44px; border-radius:50%; border:0; background:rgba(255,255,255,0.14); color:#fff; font-size:26px; line-height:1; cursor:pointer; }' +
      '.sc-schermo-nota { position:absolute; bottom:max(16px, env(safe-area-inset-bottom)); left:50%; transform:translateX(-50%); color:#fff; background:rgba(0,0,0,0.55); padding:6px 14px; border-radius:999px; font-size:0.85rem; transition:opacity .6s; }' +
      '.sc-schermo-nota.via { opacity:0; }' +
      '.sc-con-sotto #sc-stage { height:max(400px, calc(100vh - 430px)); height:max(400px, calc(100dvh - 430px)); }' +
      '#sc-sotto { margin-top:var(--space-sm); padding:12px 14px; } #sc-sotto[hidden] { display:none; }' +
      '.sc-blasone-testa { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; min-height:30px; }' +
      '.sc-blasone { font-family:var(--font-display, serif); font-style:italic; font-size:1rem; line-height:1.5; resize:vertical; }' +
      '.sc-modifica { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 10px; margin-bottom:12px; border-radius:var(--radius-md); background:var(--bg-tertiary); font-size:0.85rem; line-height:1.4; }' +
      '@media (max-width: 900px) { #sc-stage { height:auto; } #sc-vista { height:auto; } }' +
      '@container (max-width: 860px) { #sc-stage { height:auto; max-height:80vh; } #sc-vista { height:58vh; } }' +
      '@container (max-width: 640px) { #sc-vista { height:auto; } #sc-stage { max-height:none; } }' +
      // Mai larghezza e altezza forzate insieme: l'immagine si rimpicciolisce senza deformarsi (su iPad si allargava)
      '#sc-vista canvas, #sc-vista svg { object-fit:contain; }';
    document.head.appendChild(st);
  };
  const _monta = () => {
    const el = $('page-scrittoio');
    if (!el || _montata) return;
    _montata = true;
    _stile();
    el.innerHTML =
      '<div class="page-header"><div><h1 class="page-title">Scrittoio</h1>' +
        '<p class="page-subtitle">Stemmi per fazioni e luoghi, documenti da consegnare ai giocatori: lettere, taglie, editti, avvisi, gazzette, contratti, menu e mappe del tesoro, scritti con i nomi della tua campagna o da te.</p></div></div>' +
      '<div id="sc-voci" role="tablist" aria-label="Cosa creare"></div>' +
      '<div class="carto-comandi">' +
        '<button type="button" class="btn btn-gold btn-sm" id="sc-nuovo" onclick="Scrittoio.nuovo()">Nuovo</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" id="sc-bianco" onclick="Scrittoio.foglioBianco()" title="Tutti i testi vuoti: scrivi tu quello che vuoi">Foglio bianco</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" id="sc-riapri" onclick="Scrittoio.riapri()" title="Riapri un documento salvato nella Wiki o lo stemma di una Fazione, per modificarlo">Riapri…</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="sc-precedente" onclick="Scrittoio.precedente()" disabled title="Torna a quello di prima">← Precedente</button>' +
      '</div>' +
      '<div class="carto-corpo"><div class="card carto-pannello" id="sc-controlli"></div>' +
        '<div class="carto-anteprima"><div class="carto-azioni" style="justify-content:flex-end;">' +
            '<button type="button" class="btn btn-secondary btn-sm" id="sc-mostra" onclick="Scrittoio.mostra()" title="A schermo intero, per passarlo ai giocatori al tavolo">Mostra ai giocatori</button>' +
            '<button type="button" class="btn btn-primary btn-sm" id="sc-azione" onclick="Scrittoio.azione()"></button>' +
            '<button type="button" class="btn btn-secondary btn-sm" id="sc-copia" onclick="Scrittoio.copia()">Copia il testo</button>' +
            '<button type="button" class="btn btn-secondary btn-sm" id="sc-png" onclick="Scrittoio.scaricaPng()">Scarica PNG</button>' +
            '<button type="button" class="btn btn-secondary btn-sm" onclick="Scrittoio.scaricaSvg()">Scarica SVG</button>' +
          '</div>' +
          '<div id="sc-stage"><div id="sc-vista"></div><div id="sc-attesa" role="status">Sto disegnando…</div></div>' +
          '<div id="sc-sotto" class="card" hidden></div>' +
        '</div></div>';
    _controlli();
  };
  const apri = () => { _monta(); _controlli(); if (!_risultato) disegna(); };

  const _aggancia = () => {
    if (typeof App === 'undefined' || App._scrittoioHooked) return;
    const orig = App.navigateTo;
    App.navigateTo = function (pageId) { const r = orig.apply(App, arguments); if (pageId === 'scrittoio') apri(); return r; };
    App._scrittoioHooked = true;
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { _aggancia(); if ($('page-scrittoio')?.classList.contains('active')) apri(); }, 220));

  return { apri, nuovo, precedente, scegli, azione, copia, scaricaPng, scaricaSvg, _campo, _confermaStemma, _confermaDocumento,
    foglioBianco, riapri, _confermaRiapri, smettiModifica, riscriviBlasone, mostra, _daScheda,
    // Per js/scrittoio-scadenze.js: che documento e' aperto e quale e' stato salvato per ultimo
    stato: () => ({ voce: _voce, opera: _opera(), salvato: _modifica }) };
})();

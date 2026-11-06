/* ============================================================
   SCRITTOIO.JS — Pagina "Scrittoio": stemmi e documenti di gioco.
   Uno stemma si assegna a una Fazione o a un Luogo: diventa la loro
   immagine (su Drive se collegato, come ogni altra immagine) e nella
   Fazione restano le sue scelte, cosi' editti e sigilli di quella
   fazione portano il suo stemma. Un documento si salva nella Lore,
   da dove la Vista giocatori lo puo' condividere.
   ============================================================ */

const Scrittoio = (() => {
  const FONT_DOC = 'https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=UnifrakturMaguntia&family=La+Belle+Aurore&family=Reenie+Beanie&display=swap';
  const FONT_BASE = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap';
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
    return { seme, carta: prima.carta || 'pergamena', eta: prima.eta || 'vissuta', sigillo: autrice ? autrice.id : '', ...testi };
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
  const _datiImmagine = async (url) => {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    try {
      const b = await (await fetch(typeof DriveBackup !== 'undefined' ? DriveBackup.toEmbeddableUrl(url) : url)).blob();
      return await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(b); });
    } catch (e) { return null; }
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
        const propria = voce !== 'stemma' && fazione && !fazione.stemma && fazione.immagine ? await _datiImmagine(fazione.immagine) : null;
        if (voce !== 'stemma' && fazione && !fazione.stemma && fazione.immagine && !propria) Toast.show('L’immagine di ' + _nome(fazione) + ' non si è potuta leggere: uso uno stemma inventato.', 'warning', 5000);
        const m = voce === 'stemma' ? Araldica.genera({ ...op, nome: op.nome || '' })
          : Documenti.genera({ ...op, tipo: voce, stemma: _stemmaDi(op.sigillo), stemmaImg: propria, iniziale: propria ? _nome(fazione).charAt(0) : '' });
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
  const nuovo = () => { _ricorda(); _opere[_voce] = _nuovaOpera(_voce); _controlli(); disegna(); };
  const precedente = () => {
    const f = _storia.pop();
    if (!f) return;
    _voce = f.voce; _opere[f.voce] = f.op;
    _controlli(); disegna();
  };
  const scegli = (v) => { if (v !== _voce) { _ricorda(); _voce = v; _controlli(); disegna(); } };
  const _campo = (k, val) => {
    if (k === 'sigillo') _cambiaSigillo(val); else _opera()[k] = val;
    clearTimeout(_timer); _timer = setTimeout(disegna, 250);
  };

  /* ── Controlli ── */
  const _sel = (id, et, lista, val, k) => '<div class="form-group"><label class="form-label" for="' + id + '">' + _esc(et) + '</label><select id="' + id + '" class="form-select" onchange="Scrittoio._campo(\'' + k + '\',this.value)">' +
    lista.map(([v, l]) => '<option value="' + _esc(v) + '"' + (v === val ? ' selected' : '') + '>' + _esc(l) + '</option>').join('') + '</select></div>';
  const _testo = (id, et, val, k, ph = '') => '<div class="form-group"><label class="form-label" for="' + id + '">' + _esc(et) + '</label><input type="text" id="' + id + '" class="form-input" autocomplete="off" value="' + _esc(val) + '" placeholder="' + _esc(ph) + '" oninput="Scrittoio._campo(\'' + k + '\',this.value)"></div>';
  const _area = (id, et, val, k, righe = 8) => '<div class="form-group"><label class="form-label" for="' + id + '">' + _esc(et) + '</label><textarea id="' + id + '" class="form-input" rows="' + righe + '" style="resize:vertical;line-height:1.45;" oninput="Scrittoio._campo(\'' + k + '\',this.value)">' + _esc(val) + '</textarea></div>';
  const _controlli = () => {
    const tab = $('sc-voci'), box = $('sc-controlli');
    if (!tab || !box) return;
    tab.innerHTML = VOCI.map(([k, l]) => '<button type="button" role="tab" aria-selected="' + (k === _voce) + '" class="btn btn-sm ' + (k === _voce ? 'btn-primary' : 'btn-ghost') + '" onclick="Scrittoio.scegli(\'' + k + '\')">' + _esc(l) + '</button>').join('');
    const op = _opera();
    if (_voce === 'stemma') {
      box.innerHTML = _testo('sc-nome', 'Nome sotto lo stemma', op.nome, 'nome', 'Facoltativo') +
        '<div class="carto-griglia">' +
          _sel('sc-forma', 'Forma', Araldica.FORME_ELENCO, op.forma, 'forma') + _sel('sc-part', 'Partizione', Araldica.PARTIZIONI_ELENCO, op.partizione, 'partizione') +
          _sel('sc-s1', 'Primo colore', Araldica.SMALTI_ELENCO, op.smalto1, 'smalto1') + _sel('sc-s2', 'Secondo colore', Araldica.SMALTI_ELENCO, op.smalto2, 'smalto2') +
          _sel('sc-sim', 'Simbolo', Araldica.SIMBOLI_ELENCO, op.simbolo, 'simbolo') + _sel('sc-orn', 'Ornamento', Araldica.ORNAMENTI_ELENCO, op.ornamento, 'ornamento') +
        '</div>' + _testo('sc-motto', 'Motto', op.motto, 'motto', 'Lascia vuoto per non averlo') +
        '<label class="carto-spunta" for="sc-bordura"><input type="checkbox" id="sc-bordura"' + (op.bordura ? ' checked' : '') + ' onchange="Scrittoio._campo(\'bordura\',this.checked)"><span>Bordura</span></label>' +
        '<div class="form-hint">Hai già uno stemma tuo? Caricalo come immagine nella scheda della Fazione: verrà usato anche su editti e lettere.</div>';
    } else {
      const fazioni = (_camp()?.factions || []).filter((f) => f.stemma || f.immagine);
      box.innerHTML = _testo('sc-tit', _voce === 'lettera' ? 'Saluto' : 'Titolo', op.titolo, 'titolo') +
        (_voce === 'taglia' ? _testo('sc-sog', 'Ricercato', op.soggetto, 'soggetto') : '') +
        _area('sc-corpo', _voce === 'tesoro' ? 'Indizio' : _voce === 'taglia' ? 'Accuse' : 'Testo', op.corpo, 'corpo', _voce === 'lettera' || _voce === 'editto' ? 9 : 5) +
        (_voce === 'taglia' ? _testo('sc-premio', 'Ricompensa', op.premio, 'premio') : '') +
        _testo('sc-firma', _voce === 'avviso' ? 'A chi rivolgersi' : 'Firma', op.firma, 'firma') +
        '<div class="carto-griglia">' +
          _sel('sc-carta', 'Carta', Object.entries(Documenti.CARTE).map(([k, v]) => [k, v.nome]), op.carta, 'carta') +
          _sel('sc-eta', 'Stato', Object.entries(Documenti.ETA).map(([k, v]) => [k, v[0]]), op.eta, 'eta') +
          ((_voce === 'lettera' || _voce === 'editto') && fazioni.length ? _sel('sc-sig', 'Stemma e sigillo', [['', 'Inventato'], ...fazioni.map((f) => [f.id, _nome(f)])], op.sigillo, 'sigillo') : '') +
        '</div>' +
        ((_voce === 'lettera' || _voce === 'editto') && !fazioni.length ? '<div class="form-hint">Dai uno stemma a una Fazione, anche caricando un’immagine tua nella sua scheda, e qui potrai usarlo come sigillo.</div>' : '');
    }
    $('sc-azione').textContent = _voce === 'stemma' ? 'Assegna…' : 'Salva nella Wiki';
    $('sc-copia').style.display = _voce === 'stemma' ? 'none' : '';
    $('sc-nuovo').title = _voce === 'stemma' ? 'Uno stemma diverso' : 'Un documento diverso, scritto con i nomi della tua campagna';
    $('sc-precedente').disabled = !_storia.length;
  };

  /* ── Esportazione ── */
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
    } else {
      if (!camp) return _senzaCampagna('Salva nella Wiki');
      const drive = typeof DriveBackup !== 'undefined' && DriveBackup.isConnected();
      $('sc-az-titolo').textContent = 'Salva nella Wiki';
      $('sc-az-corpo').innerHTML = '<div class="form-group" style="margin-bottom:8px;"><label class="form-label" for="sc-az-nome">Titolo della scheda</label><input type="text" id="sc-az-nome" class="form-input" autocomplete="off" value="' + _esc(_risultato.nome) + '"></div>' +
        '<div class="carto-nota">Lo trovi in Wiki, tra le schede Lore. Da <strong>Vista giocatori</strong> puoi scegliere di condividerlo.</div>' +
        '<div class="carto-nota">' + (drive ? 'L’immagine del documento verrà salvata su Google Drive, il testo nella scheda.' : '<strong>Google Drive non è collegato:</strong> nella scheda si salva solo il testo. Scarica il PNG per avere anche l’immagine, oppure collega Drive dalle Impostazioni.') + '</div>';
      $('sc-az-piede').innerHTML = '<button class="btn btn-ghost" onclick="Modal.close(\'sc-azione\')">Annulla</button><button class="btn btn-primary" id="sc-az-ok" onclick="Scrittoio._confermaDocumento()">Salva</button>';
    }
    Modal.open('sc-azione');
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
      const op = _risultato.opzioni;
      App.saveActiveCampaign({ [chiave]: lista.map((x) => (x.id !== id ? x : { ...x, immagine: url, ...(t === 'f' ? { stemma: op, simbolo: x.simbolo || (Araldica.SIMBOLI_ELENCO.find(([k]) => k === op.simbolo)?.[1] || '') + (op.motto ? ' — “' + op.motto + '”' : '') } : {}) })) });
      Modal.close('sc-azione');
      Toast.show('Stemma assegnato a ' + _nome(el), 'success', 3000);
      _controlli();
    } catch (e) {
      Toast.show('Non è stato possibile salvarlo: ' + (e?.message || 'errore sconosciuto'), 'error', 6000);
      _riprova('Assegna');
    }
  };
  const _confermaDocumento = async () => {
    const titolo = ($('sc-az-nome').value || '').trim() || _risultato.nome;
    const drive = typeof DriveBackup !== 'undefined' && DriveBackup.isConnected();
    _attendi(drive ? 'Caricamento su Drive…' : 'Salvataggio…');
    try {
      const o = _opera();
      const par = [o.titolo && '<p><strong>' + _esc(o.titolo) + '</strong></p>', o.soggetto && '<p><strong>' + _esc(o.soggetto) + '</strong></p>',
        ...String(o.corpo || '').split(/\n+/).filter(Boolean).map((p) => '<p>' + _esc(p) + '</p>'), o.premio && '<p>Ricompensa: ' + _esc(o.premio) + '</p>', o.firma && '<p><em>' + _esc(o.firma) + '</em></p>'].filter(Boolean).join('');
      let img = '';
      if (drive && _risultato.canvas) {
        const url = await DriveBackup.uploadImage(_ridotta(1200, 'image/jpeg', 0.88, '#2a231c'), 'documento_' + titolo);
        if (/^https?:/.test(url)) img = '<p><img src="' + _esc(DriveBackup.toEmbeddableUrl(url)) + '" alt="' + _esc(titolo) + '" style="max-width:100%;"></p>';
      }
      const cfg = WikiSections._getCfg('lore'), item = cfg.newItem();
      item.nome = titolo; item.contenuto = img + par;
      cfg.saveItem(_camp(), item);
      try { WikiSections.renderCounters(); } catch (e) {}
      Modal.close('sc-azione');
      Toast.show('“' + titolo + '” è nella Lore della Wiki', 'success', 3000);
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
      '@media (max-width: 900px) { #sc-stage { height:auto; } #sc-vista { height:auto; } #sc-vista canvas, #sc-vista svg { width:100%; } }' +
      '@container (max-width: 860px) { #sc-stage { height:auto; max-height:80vh; } #sc-vista { height:58vh; } }' +
      '@container (max-width: 640px) { #sc-vista { height:auto; } #sc-vista canvas, #sc-vista svg { width:100%; } #sc-stage { max-height:none; } }';
    document.head.appendChild(st);
  };
  const _monta = () => {
    const el = $('page-scrittoio');
    if (!el || _montata) return;
    _montata = true;
    _stile();
    el.innerHTML =
      '<div class="page-header"><div><h1 class="page-title">Scrittoio</h1>' +
        '<p class="page-subtitle">Stemmi per fazioni e luoghi, documenti da consegnare ai giocatori: lettere, taglie, editti, avvisi e mappe del tesoro, scritti con i nomi della tua campagna.</p></div></div>' +
      '<div id="sc-voci" role="tablist" aria-label="Cosa creare"></div>' +
      '<div class="carto-comandi">' +
        '<button type="button" class="btn btn-gold btn-sm" id="sc-nuovo" onclick="Scrittoio.nuovo()">Nuovo</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="sc-precedente" onclick="Scrittoio.precedente()" disabled title="Torna a quello di prima">← Precedente</button>' +
      '</div>' +
      '<div class="carto-corpo"><div class="card carto-pannello" id="sc-controlli"></div>' +
        '<div class="carto-anteprima"><div class="carto-azioni" style="justify-content:flex-end;">' +
            '<button type="button" class="btn btn-primary btn-sm" id="sc-azione" onclick="Scrittoio.azione()"></button>' +
            '<button type="button" class="btn btn-secondary btn-sm" id="sc-copia" onclick="Scrittoio.copia()">Copia il testo</button>' +
            '<button type="button" class="btn btn-secondary btn-sm" id="sc-png" onclick="Scrittoio.scaricaPng()">Scarica PNG</button>' +
            '<button type="button" class="btn btn-secondary btn-sm" onclick="Scrittoio.scaricaSvg()">Scarica SVG</button>' +
          '</div>' +
          '<div id="sc-stage"><div id="sc-vista"></div><div id="sc-attesa" role="status">Sto disegnando…</div></div>' +
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

  return { apri, nuovo, precedente, scegli, azione, copia, scaricaPng, scaricaSvg, _campo, _confermaStemma, _confermaDocumento };
})();

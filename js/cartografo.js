/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   CARTOGRAFO.JS — Pagina "Cartografo": genera mappe di regni, citta',
   villaggi, caverne, dungeon ed edifici, le scarica o le manda nella
   pagina Mappa con scala e luoghi gia' impostati.

   L'anteprima e' un canvas e non l'SVG: una mappa ha migliaia di
   tracciati e sfocature, e ridisegnarli a ogni zoom sarebbe lento
   (soprattutto su iPad). La stessa immagine serve per il PNG.

   Nella campagna si salvano solo immagine (su Drive se collegato,
   come ogni altra mappa) e pin. Le preferenze della pagina stanno in
   localStorage: sono del dispositivo, non della campagna.
   ============================================================ */

const Cartografo = (() => {
  const KEY = 'dm_cartografo';
  const FONT_CSS = 'assets/fonts/mappe.css'; // font in locale: niente richieste a Google e mappe giuste anche offline
  const SCALA_IMMAGINE = 2;
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const $ = (id) => document.getElementById(id);
  const K = () => CartoCatalogo;

  let _stato = null;       // { tipo, perTipo: { [tipo]: { opzioni, seme, nome } } }
  let _mappa = null;       // risultato del generatore + svg completo di font e canvas
  let _storia = [];        // mappe precedenti, per non perdere quella bella superata col casuale
  let _turno = 0;          // una generazione superata da una piu' recente non si mostra
  let _timer = null;
  let _montata = false;
  let _contesto = null;    // { mappaId, mappaNome, pinId, nome }: la mappa che si sta creando nasce da un pin

  /* ── Stato ── */
  const _opzioniValide = (tipo, salvate) => {
    const T = K().TIPI[tipo], o = K().predefinite(tipo);
    if (salvate) {
      T.opzioni.forEach((x) => {
        if (x.c) { if (typeof salvate[x.k] === 'boolean') o[x.k] = salvate[x.k]; }
        else if (x.v.some(([v]) => v === salvate[x.k])) o[x.k] = salvate[x.k];
      });
      if (T.colori.some(([v]) => v === salvate.palette)) o.palette = salvate.palette;
      if (typeof salvate.nomi === 'boolean') o.nomi = salvate.nomi;
      if (typeof salvate.titolo === 'boolean') o.titolo = salvate.titolo;
    }
    return o;
  };
  const _carica = () => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    const tipi = Object.keys(K().TIPI), perTipo = {};
    tipi.forEach((t) => {
      const v = s && s.perTipo && s.perTipo[t];
      perTipo[t] = { opzioni: _opzioniValide(t, v && v.opzioni), seme: (v && v.seme) || K().seme(), nome: (v && v.nome) || '' };
    });
    _stato = { tipo: s && tipi.includes(s.tipo) ? s.tipo : 'regno', perTipo, tieniColori: s ? s.tieniColori !== false : true };
  };
  const _salva = () => { try { localStorage.setItem(KEY, JSON.stringify(_stato)); } catch (e) {} };
  const _attuale = () => _stato.perTipo[_stato.tipo];
  const _nomeEffettivo = () => _attuale().nome || (_contesto ? _contesto.nome : '');
  const _fotografia = () => ({ tipo: _stato.tipo, ...JSON.parse(JSON.stringify(_attuale())) });

  /* ── Font dentro l'immagine: un SVG usato come immagine non vede i font della pagina ── */
  const _fontCache = new Map();
  const _fontDa = (indirizzo) => {
    if (_fontCache.has(indirizzo)) return _fontCache.get(indirizzo);
    const promessa = (async () => {
      try {
        const css = await (await fetch(indirizzo)).text();
        const blocchi = css.match(/\/\*\s*latin\s*\*\/\s*@font-face\s*\{[^}]*\}/g) || [];
        const dati = new Map();
        const leggi = async (url) => {
          if (!dati.has(url)) {
            dati.set(url, fetch(url).then((r) => r.blob()).then((b) => new Promise((ok, no) => {
              const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(b);
            })));
          }
          return dati.get(url);
        };
        const out = await Promise.all(blocchi.map(async (b) => {
          const m = b.match(/url\(([^)]+)\)/);
          if (!m) return '';
          const assoluto = new URL(m[1].replace(/['"]/g, ''), new URL(indirizzo, location.href)).href;
          return b.replace(/\/\*[^*]*\*\//, '').replace(m[1], await leggi(assoluto));
        }));
        return out.join('');
      } catch (e) {
        _fontCache.delete(indirizzo); // senza rete si riprova la prossima volta; intanto i font di riserva
        return '';
      }
    })();
    _fontCache.set(indirizzo, promessa);
    return promessa;
  };
  const _font = () => _fontDa(FONT_CSS);
  const _conFont = (svg, css) => (css ? svg.replace('<defs>', '<defs><style>' + css + '</style>') : svg);
  const _inCanvas = (svg, W, H, scala = SCALA_IMMAGINE) => new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = W * scala; c.height = H * scala;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        ok(c);
      } catch (e) { no(e); }
    };
    img.onerror = () => no(new Error('immagine non disegnata'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });

  /* ── Generazione ── */
  const _occupato = (si) => { const el = $('carto-attesa'); if (el) el.hidden = !si; };
  const genera = () => {
    const turno = ++_turno;
    clearTimeout(_timer);
    _occupato(true);
    // Si lascia al browser il tempo di mostrare l'avviso: il generatore poi occupa il processore
    requestAnimationFrame(() => setTimeout(async () => {
      if (turno !== _turno) return;
      const a = _attuale(), tipo = _stato.tipo;
      try {
        const m = K().genera(tipo, { ...a.opzioni, seme: a.seme, nome: _nomeEffettivo() });
        const css = await _font();
        if (turno !== _turno) return;
        m.svgCompleto = _conFont(m.svg, css);
        m.tipo = tipo;
        try { m.canvas = await _inCanvas(m.svgCompleto, m.W, m.H); } catch (e) { m.canvas = null; }
        if (turno !== _turno) return;
        _mappa = m;
        _mostra();
        _salva();
      } catch (e) {
        if (turno !== _turno) return;
        if (typeof Debug !== 'undefined') Debug.warn('Cartografo: ' + e);
        const v = $('carto-vista');
        if (!_mappa && v) v.innerHTML = '';
        Toast.show('Questa mappa non è riuscita. Prova con “Nuova mappa”.', 'error', 5000);
      }
      _occupato(false);
    }, 30));
  };
  const _ricordaPrecedente = () => {
    if (!_mappa) return;
    _storia.push(_fotografia());
    if (_storia.length > 20) _storia.shift();
  };
  const nuova = () => { _ricordaPrecedente(); _attuale().seme = K().seme(); _aggiornaControlli(); genera(); };
  // Il caso resta sempre dentro il tipo di mappa scelto. I colori restano quelli del DM se lo ha
  // chiesto; "Nomi" e "Titolo" sono una preferenza di lettura, non una caratteristica della mappa.
  const aCaso = () => {
    _ricordaPrecedente();
    const a = _attuale(), prima = a.opzioni, o = K().aCaso(_stato.tipo);
    if (_stato.tieniColori) o.palette = prima.palette;
    o.nomi = prima.nomi; o.titolo = prima.titolo;
    a.opzioni = o; a.seme = K().seme(); a.nome = '';
    _aggiornaControlli(); genera();
  };
  const _tieniColori = (v) => { _stato.tieniColori = !!v; _salva(); };
  const precedente = () => {
    const f = _storia.pop();
    if (!f) return;
    _stato.tipo = f.tipo;
    _stato.perTipo[f.tipo] = { opzioni: f.opzioni, seme: f.seme, nome: f.nome };
    _aggiornaControlli(); genera();
  };
  const scegliTipo = (t) => {
    if (t === _stato.tipo) return;
    _ricordaPrecedente();
    _stato.tipo = t;
    _aggiornaControlli(); genera();
  };
  const _dopoModifica = (ritardo = 180) => { clearTimeout(_timer); _timer = setTimeout(genera, ritardo); };
  const _opzione = (k, v) => { _ricordaPrecedente(); _attuale().opzioni[k] = v; _dopoModifica(); };
  const _nome = (v) => { _attuale().nome = String(v).trim(); _dopoModifica(0); };
  const _seme = (v) => {
    const s = String(v).trim();
    if (!s) { $('carto-seme').value = _attuale().seme; return; }
    _ricordaPrecedente(); _attuale().seme = s; _dopoModifica(0);
  };

  /* ── Controlli ── */
  const _aggiornaControlli = () => {
    const tipo = _stato.tipo, T = K().TIPI[tipo], a = _attuale();
    const tab = $('carto-tipi');
    if (!tab) return;
    tab.innerHTML = Object.entries(K().TIPI).map(([k, v]) =>
      '<button type="button" role="tab" aria-selected="' + (k === tipo) + '" class="sc-scelta" onclick="Cartografo.scegliTipo(\'' + k + '\')">' + (typeof Scena !== 'undefined' ? Scena.icona(k) : '') + '<span>' + _esc(v.nome) + '</span></button>').join('');
    const sel = (id, etichetta, lista, val, azione) => '<div class="form-group"><label class="form-label" for="' + id + '">' + _esc(etichetta) + '</label>' +
      '<select id="' + id + '" class="form-select" onchange="' + azione + '">' + lista.map(([v, l]) => '<option value="' + _esc(v) + '"' + (v === val ? ' selected' : '') + '>' + _esc(l) + '</option>').join('') + '</select></div>';
    const spunta = (id, etichetta, val, azione) => '<label class="carto-spunta" for="' + id + '"><input type="checkbox" id="' + id + '"' + (val ? ' checked' : '') + ' onchange="' + azione + '"><span>' + _esc(etichetta) + '</span></label>';
    const scelte = T.opzioni.filter((x) => !x.c), spunte = T.opzioni.filter((x) => x.c);
    $('carto-controlli').innerHTML =
      '<div class="form-group"><label class="form-label" for="carto-nome">Nome sulla mappa</label>' +
        '<input type="text" id="carto-nome" class="form-input" autocomplete="off" value="' + _esc(_nomeEffettivo()) + '" placeholder="Casuale" onchange="Cartografo._nome(this.value)"></div>' +
      '<div class="carto-griglia">' +
        scelte.map((x) => sel('carto-op-' + x.k, x.l, x.v, a.opzioni[x.k], 'Cartografo._opzione(\'' + x.k + '\',this.value)')).join('') +
        sel('carto-colori', 'Colori', T.colori, a.opzioni.palette, 'Cartografo._opzione(\'palette\',this.value)') +
      '</div>' +
      '<div class="carto-gruppo" role="group" aria-label="Cosa mostrare sulla mappa"><div class="form-label">Sulla mappa</div><div class="carto-spunte">' +
        spunte.map((x) => spunta('carto-op-' + x.k, x.l, a.opzioni[x.k], 'Cartografo._opzione(\'' + x.k + '\',this.checked)')).join('') +
        spunta('carto-nomi', 'Nomi e numeri', a.opzioni.nomi, 'Cartografo._opzione(\'nomi\',this.checked)') +
        spunta('carto-titolo', 'Titolo', a.opzioni.titolo, 'Cartografo._opzione(\'titolo\',this.checked)') +
      '</div></div>' +
      '<div class="form-group" style="margin-bottom:0;"><label class="form-label" for="carto-seme">Codice della mappa</label>' +
        '<input type="text" id="carto-seme" class="form-input" autocomplete="off" value="' + _esc(a.seme) + '" onchange="Cartografo._seme(this.value)">' +
        '<div class="form-hint">Stesso codice e stesse opzioni danno la stessa mappa: annotalo per ritrovarla.</div></div>';
    const prec = $('carto-precedente');
    if (prec) prec.disabled = !_storia.length;
  };

  /* ── La mappa nasce da un pin: tipo e opzioni suggeriti, nome gia' deciso ── */
  const DA_LUOGO = {
    'Città': { tipo: 'citta', opzioni: { taglia: 'media' } }, Porto: { tipo: 'citta', opzioni: { taglia: 'media', costa: true } },
    Villaggio: { tipo: 'villaggio', opzioni: {} }, Paese: { tipo: 'villaggio', opzioni: { taglia: 'grande' } },
    Dungeon: { tipo: 'dungeon', opzioni: {} }, Tempio: { tipo: 'dungeon', opzioni: { tema: 'tempio' } }, Castello: { tipo: 'dungeon', opzioni: { tema: 'fortezza' } },
    Taverna: { tipo: 'abitazione', opzioni: { edificio: 'taverna' } }, Torre: { tipo: 'abitazione', opzioni: { edificio: 'torre' } },
    Foresta: { tipo: 'caverna', opzioni: { ambiente: 'radura' } }, Regione: { tipo: 'regno', opzioni: { forma: 'continente' } },
  };
  const _bannerContesto = () => {
    const el = $('carto-contesto');
    if (!el) return;
    el.hidden = !_contesto;
    if (_contesto) $('carto-contesto-testo').innerHTML = 'Stai creando la mappa di <strong>' + _esc(_contesto.nome) + '</strong>. Si aprirà dal suo pin su “' + _esc(_contesto.mappaNome) + '”.';
  };
  const perPin = (ctx) => {
    _monta();
    _ricordaPrecedente();
    const g = ctx.genera || DA_LUOGO[ctx.tipoLuogo] || { tipo: _stato.tipo, opzioni: {} };
    _contesto = ctx;
    _stato.tipo = K().TIPI[g.tipo] ? g.tipo : _stato.tipo;
    const a = _attuale();
    a.opzioni = _opzioniValide(_stato.tipo, { ...a.opzioni, ...g.opzioni });
    a.seme = K().seme(); a.nome = '';
    _aggiornaControlli(); _bannerContesto(); genera();
  };
  const annullaContesto = () => { _contesto = null; _bannerContesto(); _aggiornaControlli(); genera(); };

  /* ── Anteprima: spostamento e zoom ── */
  const V = { s: 1, fit: 1, x: 0, y: 0, W: 1400, H: 1000 };
  const _applica = () => {
    const v = $('carto-vista'), st = $('carto-stage');
    if (!v || !st) return;
    const sw = st.clientWidth, sh = st.clientHeight, lw = V.W * V.s, lh = V.H * V.s;
    V.x = lw <= sw ? (sw - lw) / 2 : Math.min(0, Math.max(sw - lw, V.x));
    V.y = lh <= sh ? (sh - lh) / 2 : Math.min(0, Math.max(sh - lh, V.y));
    v.style.width = V.W + 'px'; v.style.height = V.H + 'px';
    v.style.transform = 'translate(' + V.x + 'px,' + V.y + 'px) scale(' + V.s + ')';
    const ingrandita = V.s > V.fit * 1.001;
    // Non ingrandita, su telefono la pagina deve poter scorrere anche passando sopra la mappa
    st.style.touchAction = ingrandita ? 'none' : 'pan-y';
    st.style.cursor = ingrandita ? 'grab' : 'default';
    const l = $('carto-zoom');
    if (l) l.textContent = Math.round(V.s / V.fit * 100) + '%';
  };
  const _adatta = () => {
    const st = $('carto-stage');
    if (!st || !st.clientWidth) return;
    V.fit = Math.min(st.clientWidth / V.W, st.clientHeight / V.H);
    V.s = V.fit;
    _applica();
  };
  const _zoomA = (nuova, px, py) => {
    const st = $('carto-stage');
    if (!st) return;
    const s = Math.max(V.fit, Math.min(V.fit * 6, nuova));
    const cx = px ?? st.clientWidth / 2, cy = py ?? st.clientHeight / 2;
    V.x = cx - (cx - V.x) * s / V.s; V.y = cy - (cy - V.y) * s / V.s; V.s = s;
    _applica();
  };
  const zoom = (f) => _zoomA(V.s * f);
  const zoomReset = () => _adatta();
  const _agganciaStage = () => {
    const st = $('carto-stage');
    const punti = new Map();
    let inizio = null;
    st.addEventListener('wheel', (e) => {
      e.preventDefault();
      const b = st.getBoundingClientRect();
      _zoomA(V.s * (e.deltaY < 0 ? 1.18 : 1 / 1.18), e.clientX - b.left, e.clientY - b.top);
    }, { passive: false });
    st.addEventListener('dblclick', _adatta);
    st.addEventListener('gesturestart', (e) => e.preventDefault());
    st.addEventListener('pointerdown', (e) => {
      punti.set(e.pointerId, [e.clientX, e.clientY]);
      if (punti.size === 2) {
        const [a, b] = [...punti.values()];
        inizio = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, s: V.s };
      }
      if (e.pointerType === 'mouse' || V.s > V.fit * 1.001 || punti.size === 2) { try { st.setPointerCapture(e.pointerId); } catch (x) {} }
    });
    st.addEventListener('pointermove', (e) => {
      const q = punti.get(e.pointerId);
      if (!q) return;
      const dx = e.clientX - q[0], dy = e.clientY - q[1];
      punti.set(e.pointerId, [e.clientX, e.clientY]);
      if (punti.size === 2 && inizio) {
        const [a, b] = [...punti.values()], r = st.getBoundingClientRect();
        _zoomA(inizio.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / inizio.d, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
      } else if (punti.size === 1 && V.s > V.fit * 1.001) {
        V.x += dx; V.y += dy; _applica();
      }
    });
    const fine = (e) => { punti.delete(e.pointerId); if (punti.size < 2) inizio = null; };
    st.addEventListener('pointerup', fine);
    st.addEventListener('pointercancel', fine);
    if (window.ResizeObserver) new ResizeObserver(() => { if (st.offsetParent) { const era = V.s <= V.fit * 1.001; const f = Math.min(st.clientWidth / V.W, st.clientHeight / V.H); if (era) _adatta(); else { V.fit = f; _applica(); } } }).observe(st);
  };

  const _scala = (km) => {
    if (km >= 1) return (km >= 100 ? Math.round(km).toLocaleString('it-IT') : (Math.round(km * 10) / 10).toLocaleString('it-IT')) + ' km';
    return Math.round(km * 1000) + ' metri';
  };
  const _mostra = () => {
    const v = $('carto-vista'), m = _mappa;
    if (!v || !m) return;
    V.W = m.W; V.H = m.H;
    $('carto-stage').style.setProperty('--carto-ar', m.W + '/' + m.H);
    v.innerHTML = '';
    v.setAttribute('aria-label', 'Mappa: ' + m.nome);
    if (m.canvas) { m.canvas.style.cssText = 'display:block;width:100%;height:100%;'; v.appendChild(m.canvas); }
    else v.innerHTML = m.svg;
    _adatta();
    const T = K().TIPI[m.tipo];
    $('carto-titolo-mappa').textContent = m.nome;
    const n = m.pin.length;
    $('carto-info').textContent = T.nome + ' · ' + _scala(m.larghezzaKm) + ' da un lato all’altro · ' + n + (n === 1 ? ' luogo' : ' luoghi');
    const nomeEl = $('carto-nome');
    if (nomeEl && !nomeEl.value) nomeEl.placeholder = 'Casuale: ' + m.nome;
    const png = $('carto-png');
    if (png) { png.disabled = !m.canvas; png.title = m.canvas ? '' : 'Questo browser non riesce a creare il PNG: usa “Scarica SVG”.'; }
    const prec = $('carto-precedente');
    if (prec) prec.disabled = !_storia.length;
  };

  /* ── Esportazione ── */
  const _nomeFile = () => (_mappa.nome || 'mappa').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'mappa';
  const _scarica = (blob, nome) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 20000);
  };
  const scaricaPng = () => {
    if (!_mappa || !_mappa.canvas) return;
    try {
      _mappa.canvas.toBlob((b) => {
        if (b) _scarica(b, _nomeFile() + '.png');
        else Toast.show('PNG non riuscito: prova con “Scarica SVG”.', 'error', 5000);
      }, 'image/png');
    } catch (e) { Toast.show('PNG non riuscito: prova con “Scarica SVG”.', 'error', 5000); }
  };
  const scaricaSvg = () => { if (_mappa) _scarica(new Blob([_mappa.svgCompleto], { type: 'image/svg+xml' }), _nomeFile() + '.svg'); };

  /* ── Mettere la mappa nelle Mappe della campagna ── */
  const _assicuraModale = () => {
    if ($('modal-carto-mappe')) return;
    const m = document.createElement('div');
    m.className = 'modal-overlay hidden';
    m.id = 'modal-carto-mappe';
    m.style.display = 'none';
    m.onclick = (e) => { if (e.target === m) Modal.close('carto-mappe'); };
    m.innerHTML = '<div class="modal" style="max-width:480px;"><div class="modal-header"><h3 class="modal-title">Metti nelle mappe</h3>' +
      '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'carto-mappe\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="modal-body" id="carto-mappe-corpo"></div><div class="modal-footer" id="carto-mappe-piede"></div></div>';
    document.body.appendChild(m);
  };
  const apriMettiNelleMappe = () => {
    if (!_mappa) return;
    _assicuraModale();
    const camp = typeof App !== 'undefined' ? App.getActiveCampaign() : null, corpo = $('carto-mappe-corpo'), piede = $('carto-mappe-piede');
    if (!camp) {
      corpo.innerHTML = '<p style="margin:0;line-height:1.55;">Le mappe appartengono a una campagna: aprine una e poi torna qui. Questa mappa resta dov’è.</p>';
      piede.innerHTML = '<button class="btn btn-ghost" onclick="Modal.close(\'carto-mappe\')">Annulla</button><button class="btn btn-primary" onclick="Modal.close(\'carto-mappe\');App.navigateTo(\'home\')">Scegli una campagna</button>';
      Modal.open('carto-mappe');
      return;
    }
    const n = _mappa.pin.length, schede = _mappa.pin.filter((p) => p.tipoLuogo).length;
    const drive = typeof DriveBackup !== 'undefined' && DriveBackup.isConnected();
    corpo.innerHTML =
      '<div class="form-group"><label class="form-label" for="carto-mappe-nome">Nome della mappa</label><input type="text" id="carto-mappe-nome" class="form-input" autocomplete="off" value="' + _esc(_mappa.nome) + '"></div>' +
      (_contesto ? '<div class="carto-nota" style="margin:0 0 10px;">Il pin di <strong>' + _esc(_contesto.nome) + '</strong> su “' + _esc(_contesto.mappaNome) + '” aprirà questa mappa, e potrai tornare indietro.</div>' : '') +
      '<label class="carto-spunta" for="carto-mappe-pin"><input type="checkbox" id="carto-mappe-pin" checked onchange="var s=document.getElementById(\'carto-mappe-schede\');if(s){s.disabled=!this.checked;if(!this.checked)s.checked=false;}"><span>Segna i luoghi con i pin (' + n + '), con le loro note</span></label>' +
      (schede ? '<label class="carto-spunta" for="carto-mappe-schede"><input type="checkbox" id="carto-mappe-schede"><span>Crea anche le schede nella Wiki (' + schede + (schede === 1 ? ' Luogo' : ' Luoghi') + ')</span></label><div class="form-hint" style="margin:0 0 10px 26px;">Ogni pin aprirà la sua scheda. Se un Luogo con lo stesso nome esiste già, si collega a quello.</div>' : '') +
      '<div class="carto-nota"><strong>Distanze pronte:</strong> la scala è già impostata (' + _esc(_scala(_mappa.larghezzaKm)) + ' da un lato all’altro), quindi puoi misurare subito tra due pin.</div>' +
      '<div class="carto-nota">' + (drive ? 'L’immagine verrà salvata su Google Drive.' : '<strong>Google Drive non è collegato:</strong> l’immagine resta solo su questo dispositivo, un po’ compressa per non riempire lo spazio del browser. Collega Drive dalle Impostazioni per vederla ovunque.') + '</div>';
    piede.innerHTML = '<button class="btn btn-ghost" onclick="Modal.close(\'carto-mappe\')">Annulla</button><button class="btn btn-primary" id="carto-mappe-ok" onclick="Cartografo._confermaMappe()">Metti nelle mappe</button>';
    Modal.open('carto-mappe');
  };
  // JPEG: una mappa in PNG pesa diversi MB. Senza Drive resta entro il limite della pagina Mappa (1,5 MB).
  const _immagine = (drive) => {
    const c = _mappa.canvas;
    if (!c) return null;
    if (drive) return c.toDataURL('image/jpeg', 0.92);
    for (const f of [0.75, 0.6, 0.5, 0.4]) {
      const t = document.createElement('canvas');
      t.width = Math.round(c.width * f); t.height = Math.round(c.height * f);
      t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
      const d = t.toDataURL('image/jpeg', 0.82);
      if (d.length * 0.75 < 1.4 * 1024 * 1024) return d;
    }
    return null;
  };
  const _luogo = (camp, p) => {
    const cfg = WikiSections._getCfg('luoghi');
    const uguale = (cfg.getData(camp) || []).find((x) => (x.nome || '').toLowerCase() === p.label.toLowerCase());
    if (uguale) return uguale.id;
    const item = cfg.newItem();
    item.nome = p.label; item.tipo = p.tipoLuogo; item.atmosfera = p.note || '';
    cfg.saveItem(camp, item);
    return item.id;
  };
  const _confermaMappe = async () => {
    if (!_mappa) return;
    const btn = $('carto-mappe-ok');
    const nome = ($('carto-mappe-nome').value || '').trim() || _mappa.nome;
    const conPin = $('carto-mappe-pin').checked, conSchede = !!($('carto-mappe-schede') && $('carto-mappe-schede').checked);
    const drive = typeof DriveBackup !== 'undefined' && DriveBackup.isConnected();
    btn.disabled = true; btn.textContent = drive ? 'Caricamento su Drive…' : 'Salvataggio…';
    const ripristina = () => { btn.disabled = false; btn.textContent = 'Metti nelle mappe'; };
    try {
      const dati = _immagine(drive);
      if (!dati) {
        Toast.show(_mappa.canvas ? 'Immagine troppo pesante per salvarla senza Drive: collega Google Drive dalle Impostazioni.' : 'Questo browser non riesce a creare l’immagine della mappa.', 'warning', 6000);
        ripristina();
        return;
      }
      const immagine = typeof DriveBackup !== 'undefined' ? await DriveBackup.uploadImage(dati, nome) : dati;
      const camp = App.getActiveCampaign();
      const m = _mappa;
      const pin = conPin ? m.pin.map((p) => {
        const entita = conSchede && p.tipoLuogo ? _luogo(camp, p) : null;
        return {
          id: 'pin_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          x: Math.max(0, Math.min(1, p.x / m.W)), y: Math.max(0, Math.min(1, p.y / m.H)),
          tipo: entita ? 'luoghi' : null, entitaId: entita, label: entita ? '' : p.label,
          sottotipo: entita ? '' : (p.sottotipo || ''), note: entita ? '' : (p.note || ''), colore: '#8b2635',
          ...(p.genera ? { genera: { ...p.genera, opzioni: { popolo: _attuale().opzioni.popolo, ...p.genera.opzioni } } } : {}),
        };
      }) : [];
      const id = MappaUI.aggiungiDaImmagine({ nome, immagine, scalaKm: Math.round(m.larghezzaKm * 1000) / 1000, pins: pin, daPin: _contesto ? { mappaId: _contesto.mappaId, pinId: _contesto.pinId } : null });
      const salvata = (App.getActiveCampaign().mappe || []).some((x) => x.id === id);
      if (!salvata) throw new Error('spazio esaurito');
      if (conSchede) { try { WikiSections.renderCounters(); } catch (e) {} }
      Modal.close('carto-mappe');
      _contesto = null; _bannerContesto();
      App.navigateTo('mappa');
      Toast.show('“' + nome + '” è nelle tue mappe', 'success', 3000);
    } catch (e) {
      Toast.show('Non è stato possibile salvare la mappa: ' + (e && e.message ? e.message : 'errore sconosciuto'), 'error', 6000);
      ripristina();
    }
  };

  /* ── Pagina ── */
  const _stile = () => {
    if ($('carto-stile')) return;
    const st = document.createElement('style');
    st.id = 'carto-stile';
    // Una colonna sola quando manca lo spazio VERO: con il menu laterale aperto un iPad ha molto meno
    // della larghezza della finestra. Per questo si guarda la pagina (container), non lo schermo.
    const stretto =
      '.carto-corpo { grid-template-columns:minmax(0,1fr); }' +
      '.carto-anteprima { order:-1; }' +
      '#carto-stage, #carto-contesto:not([hidden]) ~ .carto-corpo #carto-stage { height:auto; aspect-ratio:var(--carto-ar, 7/5); }' +
      // Sulla mappa intera in alto c'e' il titolo: lo zoom non lo deve coprire
      '.carto-zoom { top:auto; bottom:8px; right:8px; }';
    const telefono =
      '.carto-comandi > .btn, .carto-azioni > .btn { flex:1 1 auto; min-height:40px; }' +
      '.carto-azioni { width:100%; }';
    st.textContent =
      '#page-cartografo { container-type:inline-size; }' +
      '#carto-tipi { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:var(--space-sm); }' +
      '#carto-contesto { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:6px 12px; padding:8px 12px; margin-bottom:var(--space-sm); background:var(--bg-tertiary); border:1px solid var(--border-strong); border-radius:var(--radius-md); color:var(--text-primary); font-size:0.92rem; }' +
      '#carto-contesto[hidden] { display:none; }' +
      '.carto-comandi { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-bottom:var(--space-md); }' +
      '.carto-corpo { display:grid; grid-template-columns:minmax(280px,320px) minmax(0,1fr); gap:var(--space-md); align-items:start; }' +
      '.carto-pannello { margin:0; }' +
      '.carto-pannello:hover { box-shadow:var(--shadow-sm); }' +
      '.carto-griglia { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); column-gap:10px; }' +
      '.carto-griglia > :last-child:nth-child(odd) { grid-column:1 / -1; }' +
      '.carto-gruppo { margin-bottom:var(--space-md); }' +
      '.carto-spunta { display:flex; align-items:center; gap:8px; min-height:34px; cursor:pointer; color:var(--text-primary); font-size:0.92rem; line-height:1.3; }' +
      '.carto-spunta input { width:18px; height:18px; flex-shrink:0; accent-color:var(--accent-primary); cursor:pointer; }' +
      '.carto-spunte { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); column-gap:10px; }' +
      '.carto-nota { font-size:0.88rem; line-height:1.5; color:var(--text-secondary); padding:8px 10px; margin-top:8px; background:var(--bg-tertiary); border-radius:var(--radius-md); }' +
      '.carto-anteprima { min-width:0; display:flex; flex-direction:column; gap:8px; }' +
      '.carto-barra { display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; justify-content:space-between; }' +
      '.carto-nome-mappa { font-family:var(--font-display); font-size:1.05rem; color:var(--text-primary); line-height:1.25; overflow-wrap:anywhere; }' +
      '#carto-info { font-size:0.85rem; color:var(--text-muted); }' +
      '.carto-azioni { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }' +
      '#carto-stage { position:relative; overflow:hidden; height:max(440px, calc(100vh - 300px)); height:max(440px, calc(100dvh - 300px)); background:var(--bg-tertiary); border:1px solid var(--border); border-radius:var(--radius-lg); user-select:none; -webkit-user-select:none; }' +
      '#carto-contesto:not([hidden]) ~ .carto-corpo #carto-stage { height:max(440px, calc(100vh - 352px)); height:max(440px, calc(100dvh - 352px)); }' +
      '#carto-vista { position:absolute; left:0; top:0; transform-origin:0 0; }' +
      '#carto-vista svg { display:block; width:100%; height:100%; }' +
      '#carto-attesa { position:absolute; left:50%; top:14px; transform:translateX(-50%); padding:6px 14px; background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border); border-radius:var(--radius-full); font-size:0.88rem; box-shadow:var(--shadow-md); z-index:2; white-space:nowrap; }' +
      '#carto-attesa[hidden] { display:none; }' +
      '.carto-zoom { position:absolute; right:10px; top:10px; display:flex; gap:2px; padding:3px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); box-shadow:var(--shadow-sm); z-index:2; }' +
      '#carto-zoom { min-width:52px; }' +
      '@media (max-width: 900px) {' + stretto + '}' +
      '@media (max-width: 640px) {' + telefono + '}' +
      '@container (max-width: 860px) {' + stretto + '}' +
      '@container (max-width: 640px) {' + telefono + '}';
    document.head.appendChild(st);
  };
  const _monta = () => {
    const el = $('page-cartografo');
    if (!el || _montata) return;
    _montata = true;
    _stile();
    if (!_stato) _carica();
    el.innerHTML =
      '<div class="page-header"><div><h1 class="page-title">Cartografo</h1>' +
        '<p class="page-subtitle">Crea mappe di regni, città, villaggi, caverne, dungeon ed edifici. Scaricale o mettile nelle tue mappe, con i luoghi già segnati.</p></div></div>' +
      '<div id="carto-tipi" role="tablist" aria-label="Tipo di mappa"></div>' +
      '<div id="carto-contesto" hidden role="status"><span id="carto-contesto-testo"></span><button type="button" class="btn btn-ghost btn-sm" onclick="Cartografo.annullaContesto()">Non collegarla</button></div>' +
      '<div class="carto-comandi">' +
        '<button type="button" class="btn btn-gold btn-sm" onclick="Cartografo.nuova()" title="Una mappa diversa, con le stesse opzioni">Nuova mappa</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="Cartografo.aCaso()" title="Stesso tipo di mappa, con forma, dimensione e opzioni scelte a caso">A caso</button>' +
        '<label class="carto-spunta" for="carto-tieni-colori" style="margin:0 6px;"><input type="checkbox" id="carto-tieni-colori"' + (_stato.tieniColori ? ' checked' : '') + ' onchange="Cartografo._tieniColori(this.checked)"><span>Tieni i miei colori</span></label>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="carto-precedente" onclick="Cartografo.precedente()" disabled title="Torna alla mappa di prima">← Mappa precedente</button>' +
      '</div>' +
      '<div class="carto-corpo">' +
        '<div class="card carto-pannello" id="carto-controlli"></div>' +
        '<div class="carto-anteprima">' +
          '<div class="carto-barra"><div style="min-width:0;"><div class="carto-nome-mappa" id="carto-titolo-mappa"></div><div id="carto-info" aria-live="polite"></div></div>' +
            '<div class="carto-azioni">' +
              '<div class="carto-zoom"><button type="button" class="btn btn-ghost btn-icon-sm" onclick="Cartografo.zoom(1/1.4)" aria-label="Riduci">−</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" id="carto-zoom" onclick="Cartografo.zoomReset()" title="Adatta allo spazio">100%</button>' +
              '<button type="button" class="btn btn-ghost btn-icon-sm" onclick="Cartografo.zoom(1.4)" aria-label="Ingrandisci">+</button></div>' +
              '<button type="button" class="btn btn-primary btn-sm" onclick="Cartografo.apriMettiNelleMappe()">Metti nelle mappe</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" id="carto-png" onclick="Cartografo.scaricaPng()">Scarica PNG</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" onclick="Cartografo.scaricaSvg()">Scarica SVG</button>' +
            '</div></div>' +
          '<div id="carto-stage"><div id="carto-vista" role="img"></div>' +
            '<div id="carto-attesa" role="status">Sto disegnando la mappa…</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    _agganciaStage();
    _aggiornaControlli();
  };
  const apri = () => {
    _monta();
    if (_mappa) { requestAnimationFrame(_applica); return; }
    genera();
  };

  const _aggancia = () => {
    if (typeof App === 'undefined' || App._cartografoHooked) return;
    const orig = App.navigateTo;
    App.navigateTo = function (pageId) {
      const r = orig.apply(App, arguments);
      if (pageId === 'cartografo') apri();
      return r;
    };
    App._cartografoHooked = true;
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { _aggancia(); if ($('page-cartografo')?.classList.contains('active')) apri(); }, 200));

  const strumenti = { fontDa: _fontDa, conFont: _conFont, inCanvas: _inCanvas, scarica: _scarica, stile: _stile };
  return { strumenti, perPin, annullaContesto, apri, nuova, aCaso, _tieniColori, precedente, scegliTipo, zoom, zoomReset, scaricaPng, scaricaSvg, apriMettiNelleMappe, _confermaMappe, _opzione, _nome, _seme };
})();

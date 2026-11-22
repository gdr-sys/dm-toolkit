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
        else if (x.m) { if (Array.isArray(salvate[x.k])) o[x.k] = salvate[x.k].filter((v) => x.v.some(([k]) => k === v)); }
        else if (x.v.some(([v]) => v === salvate[x.k])) o[x.k] = salvate[x.k];
      });
      if (T.colori.some(([v]) => v === salvate.palette)) o.palette = salvate.palette;
      if (typeof salvate.nomi === 'boolean') o.nomi = salvate.nomi;
      if (typeof salvate.titolo === 'boolean') o.titolo = salvate.titolo;
      // Oggetti spostati a mano sulla battle map: { chiave: [u, w, rotazione?] } in quadretti
      if (salvate.pos && typeof salvate.pos === 'object') {
        const pos = {};
        Object.entries(salvate.pos).forEach(([k, v]) => { if (Array.isArray(v) && v.length >= 2 && v.slice(0, 4).every(Number.isFinite)) pos[k] = v.slice(0, 4); });
        if (Object.keys(pos).length) o.pos = pos;
      }
      // Oggetti della scena spostati o ruotati: { numero: [du, dw, gradi] }
      if (salvate.sposta && typeof salvate.sposta === 'object') {
        const sp = {};
        Object.entries(salvate.sposta).forEach(([k, v]) => { if (/^\d+$/.test(k) && Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)) sp[k] = v; });
        if (Object.keys(sp).length) o.sposta = sp;
      }
      if (Array.isArray(salvate.togli)) { const t = salvate.togli.filter((n) => Number.isInteger(n) && n >= 0); if (t.length) o.togli = t; }
      if (Array.isArray(salvate.copie)) {
        const c = salvate.copie.filter((x) => x && (typeof x.f === 'string' || (Array.isArray(x.f) && x.f.length && x.f.every(Number.isInteger))) && [x.u, x.w, x.g].every(Number.isFinite)).slice(0, 80)
          .map((x) => ({ f: Array.isArray(x.f) ? x.f.slice() : x.f, u: x.u, w: x.w, g: x.g }));
        if (c.length) o.copie = c;
      }
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
    _stato = { tipo: s && tipi.includes(s.tipo) ? s.tipo : 'regno', perTipo, tieniColori: s ? s.tieniColori !== false : true,
      aperti: { aggiungi: !!(s && s.aperti && s.aperti.aggiungi), altre: !!(s && s.aperti && s.aperti.altre) } };
  };
  // Le sezioni a scomparsa del menu restano come il DM le ha lasciate
  const _apri = (k, v) => { if (!_stato.aperti) _stato.aperti = {}; _stato.aperti[k] = !!v; _salva(); };
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
        // Le battle map usano immagini dipinte: si caricano una volta, la prima volta che servono
        if (tipo === 'battaglia' && typeof CartoBattaglia !== 'undefined' && !CartoBattaglia.pronta()) { await CartoBattaglia.carica(); if (turno !== _turno) return; }
        const m = K().genera(tipo, { ...a.opzioni, seme: a.seme, nome: _nomeEffettivo() });
        if (typeof CartoRitocchi !== 'undefined') CartoRitocchi.applica(m, a); // nomi cambiati e scritte aggiunte
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
  const nuova = () => { _ricordaPrecedente(); const a = _attuale(); a.seme = K().seme(); delete a.opzioni.pos; delete a.opzioni.sposta; delete a.opzioni.togli; delete a.opzioni.copie; _sel = null; _aggiornaControlli(); genera(); };
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
    _stato.perTipo[f.tipo] = { opzioni: f.opzioni, seme: f.seme, nome: f.nome, ...(f.ritocchi ? { ritocchi: f.ritocchi } : {}) };
    _aggiornaControlli(); genera();
  };
  const scegliTipo = (t) => {
    if (t === _stato.tipo) return;
    _ricordaPrecedente();
    _stato.tipo = t;
    _aggiornaControlli(); genera();
  };
  const _dopoModifica = (ritardo = 180) => { clearTimeout(_timer); _timer = setTimeout(genera, ritardo); };
  const _opzione = (k, v) => {
    _ricordaPrecedente();
    const T = K().TIPI[_stato.tipo], a = _attuale(), x = T.opzioni.find((q) => q.k === k);
    a.opzioni[k] = v;
    if (['scena', 'impianto', 'taglia'].includes(k)) { delete a.opzioni.pos; _sel = null; }
    // Gli oggetti della scena si riconoscono dall'ordine in cui sono posati: cambiando la scena non valgono piu'
    if (!['palette', 'nomi', 'titolo', 'griglia', 'legenda'].includes(k)) { delete a.opzioni.sposta; delete a.opzioni.togli; delete a.opzioni.copie; if (_sel && _sel.tipo !== 'agg') _sel = null; }
    // Le opzioni che dipendono da questa (es. la variante dipende dalla scena) tornano al valore iniziale
    if (x && x.azzera) x.azzera.forEach((d) => { const y = T.opzioni.find((q) => q.k === d); if (y) a.opzioni[d] = Array.isArray(y.d) ? y.d.slice() : y.d; });
    if (T.opzioni.some((q) => q.se || q.dip)) _aggiornaControlli();
    _dopoModifica();
  };
  // Scelta multipla (es. oggetti da aggiungere alla battle map): accende o spegne una voce
  const _multi = (k, v) => {
    _ricordaPrecedente();
    const a = _attuale(), l = Array.isArray(a.opzioni[k]) ? a.opzioni[k].slice() : [], i = l.indexOf(v);
    if (i >= 0) { l.splice(i, 1); if (a.opzioni.pos) { delete a.opzioni.pos[v]; if (!Object.keys(a.opzioni.pos).length) delete a.opzioni.pos; } } else l.push(v);
    a.opzioni[k] = l;
    const b = document.querySelector('[data-multi="' + k + ':' + v + '"]'); if (b) b.setAttribute('aria-pressed', String(i < 0));
    const n = document.querySelector('[data-conta="' + k + '"]'); if (n) { n.textContent = l.length; n.hidden = !l.length; }
    _dopoModifica();
  };
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
    const vis = (x) => !x.se || x.se(a.opzioni);
    const scelte = T.opzioni.filter((x) => !x.c && !x.m && vis(x)), spunte = T.opzioni.filter((x) => x.c), multi = T.opzioni.filter((x) => x.m && vis(x));
    const valori = (x) => x.dip ? x.dip(a.opzioni) : x.v;
    const chip = (x, [v, l]) => { const on = (a.opzioni[x.k] || []).includes(v); return '<button type="button" class="carto-chip" data-multi="' + _esc(x.k + ':' + v) + '" aria-pressed="' + on + '" onclick="Cartografo._multi(\'' + x.k + '\',\'' + v + '\')">' + _esc(l) + '</button>'; };
    // In vista le scelte che cambiano la mappa; a scomparsa gli oggetti da aggiungere e le preferenze
    // (nomi, impaginazione, colori, codice), cosi' su iPad non si scorre per mezza pagina.
    const SECONDARIE = ['popolo', 'impagina'], ARIA = (x) => '<svg class="carto-freccia" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' + x;
    const selDi = (x) => sel('carto-op-' + x.k, x.l, valori(x), a.opzioni[x.k], 'Cartografo._opzione(\'' + x.k + '\',this.value)');
    const sezione = (k, titolo, extra, corpo) => '<details class="carto-sezione"' + (_stato.aperti && _stato.aperti[k] ? ' open' : '') + ' ontoggle="Cartografo._apri(\'' + k + '\',this.open)">' +
      '<summary>' + ARIA('<span>' + _esc(titolo) + '</span>') + extra + '</summary><div class="carto-sezione-corpo">' + corpo + '</div></details>';
    const principali = scelte.filter((x) => !SECONDARIE.includes(x.k)), secondarie = scelte.filter((x) => SECONDARIE.includes(x.k));
    $('carto-controlli').innerHTML =
      '<div class="carto-griglia carto-principali">' + principali.map(selDi).join('') + '</div>' +
      (spunte.length ? '<div class="carto-spunte carto-gruppo" role="group" aria-label="Cosa mettere sulla mappa">' +
        spunte.map((x) => spunta('carto-op-' + x.k, x.l, a.opzioni[x.k], 'Cartografo._opzione(\'' + x.k + '\',this.checked)')).join('') + '</div>' : '') +
      multi.map((x) => { const n = (a.opzioni[x.k] || []).length; return sezione('aggiungi', x.l, '<span class="carto-conta" data-conta="' + _esc(x.k) + '"' + (n ? '' : ' hidden') + '>' + n + '</span>',
        '<div class="carto-chips" role="group" aria-label="' + _esc(x.l) + '">' + valori(x).map((e) => chip(x, e)).join('') + '</div>' +
        '<div class="carto-suggerimento"><span>Per spostarli o ruotarli, usa “Sposta e ruota” sopra la mappa.</span>' +
          (a.opzioni.pos ? '<button type="button" class="btn btn-ghost btn-sm" onclick="Cartografo.rimettiACaso()">Rimettili a caso</button>' : '') + '</div>'); }).join('') +
      sezione('altre', 'Nome, colori e altro', '',
        '<div class="form-group"><label class="form-label" for="carto-nome">Nome sulla mappa</label>' +
          '<input type="text" id="carto-nome" class="form-input" autocomplete="off" value="' + _esc(_nomeEffettivo()) + '" placeholder="Casuale" onchange="Cartografo._nome(this.value)"></div>' +
        '<div class="carto-griglia">' + secondarie.map(selDi).join('') +
          sel('carto-colori', 'Colori', T.colori, a.opzioni.palette, 'Cartografo._opzione(\'palette\',this.value)') + '</div>' +
        '<div class="carto-spunte carto-gruppo" role="group" aria-label="Scritte sulla mappa">' +
          spunta('carto-nomi', 'Nomi e numeri', a.opzioni.nomi, 'Cartografo._opzione(\'nomi\',this.checked)') +
          spunta('carto-titolo', 'Titolo', a.opzioni.titolo, 'Cartografo._opzione(\'titolo\',this.checked)') + '</div>' +
        '<div class="form-group" style="margin-bottom:0;"><label class="form-label" for="carto-seme">Codice della mappa</label>' +
          '<input type="text" id="carto-seme" class="form-input" autocomplete="off" value="' + _esc(a.seme) + '" onchange="Cartografo._seme(this.value)">' +
          '<div class="form-hint">Stesso codice e stesse opzioni danno la stessa mappa: annotalo per ritrovarla.</div></div>');
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
    v.style.setProperty('--inv', String(1 / V.s));
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
    let tocco = null;
    st.addEventListener('pointerdown', (e) => {
      tocco = punti.size ? null : { x: e.clientX, y: e.clientY };
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
    st.addEventListener('pointerup', (e) => {
      const t = tocco;
      tocco = null;
      if (t && punti.size === 1 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 8 && typeof CartoRitocchi !== 'undefined' && CartoRitocchi.inAttesa()) {
        const b = st.getBoundingClientRect();
        CartoRitocchi.tocco((e.clientX - b.left - V.x) / V.s, (e.clientY - b.top - V.y) / V.s);
      }
      fine(e);
    });
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
    _maniglie(m);
    const T = K().TIPI[m.tipo];
    { const bv = $('carto-vtt'), bs = $('carto-stampa'), b4 = $('carto-a4'); if (bv) bv.hidden = !VTT_TIPI.includes(m.tipo); if (bs) bs.hidden = !VTT_TIPI.includes(m.tipo); if (b4) b4.hidden = m.tipo !== 'battaglia'; }
    $('carto-titolo-mappa').textContent = m.nome;
    const n = m.pin.length;
    $('carto-info').textContent = T.nome + ' · ' + _scala(m.larghezzaKm) + ' da un lato all’altro · ' + n + (n === 1 ? ' luogo' : ' luoghi');
    if (m.nonMessi && m.nonMessi.length) {
      const voce = K().TIPI[m.tipo].opzioni.find((q) => q.m), nomi = m.nonMessi.map((k) => { const e = voce && voce.v.find((x) => x[0] === k); return e ? e[1] : k; });
      $('carto-info').textContent += ' · Non c’è posto per: ' + nomi.join(', ');
    }
    const nomeEl = $('carto-nome');
    if (nomeEl && !nomeEl.value) nomeEl.placeholder = 'Casuale: ' + m.nome;
    const png = $('carto-png');
    if (png) { png.disabled = !m.canvas; png.title = m.canvas ? '' : 'Questo browser non riesce a creare il PNG: usa “Scarica SVG”.'; }
    const prec = $('carto-precedente');
    if (prec) prec.disabled = !_storia.length;
    // Altri moduli che vogliono sapere quale mappa e' in vista (es. js/dungeon-chiave.js)
    _dopoMostra.forEach((f) => { try { f(m); } catch (e) {} });
  };
  /* ── Sposta e ruota (battle map) ──
     Con il pulsante acceso ogni oggetto si prende: trascinato si sposta, toccato resta scelto e si
     ruota (pulsanti o maniglia da girare). Mentre lo si muove si vede solo l'oggetto, non la mappa
     intorno. Oggetti aggiunti: opzioni.pos = { chiave: [u, w, giro, rotazione del carro?] };
     oggetti della scena: opzioni.sposta = { numero: [du, dw, gradi] }, in quadretti. */
  let _modoSposta = false, _sel = null; // _sel: { tipo: 'agg', k } oppure { tipo: 'scena', ids: [...] }
  const _r1 = (x) => Math.round(x * 10) / 10;
  const _gradi = (g) => Math.round(((g % 360) + 360) % 360);
  const _nomeAgg = (m, k) => { const voce = K().TIPI[m.tipo].opzioni.find((q) => q.m), e = voce && voce.v.find((q) => q[0] === k); return e ? e[1] : k; };
  const ICONE = {
    copia: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M16 4H6a2 2 0 0 0-2 2v10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    cestino: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sx: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    dx: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  // Spostandone uno, gli altri oggetti aggiunti restano dove sono: si fissano tutti
  const _posizioni = () => {
    const pos = {};
    ((_mappa && _mappa.aggiunti) || []).forEach((x) => { pos[x.k] = [_r1(x.u), _r1(x.w), _gradi(x.giro || 0)].concat(x.rot != null ? [Math.round(x.rot)] : []); });
    return pos;
  };
  const _dopoSpostamento = () => { _aggiornaControlli(); _dopoModifica(0); };
  const _muoviAgg = (k, du, dw, dg = 0) => {
    if (!_mappa || !(_mappa.aggiunti || []).some((q) => q.k === k)) return;
    _ricordaPrecedente();
    const a = _attuale(), pos = _posizioni(), v = pos[k];
    v[0] = _r1(v[0] + du); v[1] = _r1(v[1] + dw); v[2] = _gradi(v[2] + dg);
    a.opzioni.pos = pos;
    _dopoSpostamento();
  };
  // Oggetti della scena (in pixel della mappa): spostati e ruotati attorno al centro di quello preso
  const _muoviScena = (ids, cx, cy, dx, dy, dg = 0) => {
    const m = _mappa, S = m.quadretto;
    _ricordaPrecedente();
    const a = _attuale(), sp = { ...(a.opzioni.sposta || {}) }, rad = dg * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
    ids.forEach((id) => {
      const q = m.oggetti.find((o) => o.id === id);
      if (!q) return;
      const px = q.x - cx, py = q.y - cy, nx = cx + px * cs - py * sn + dx, ny = cy + px * sn + py * cs + dy, d = sp[id] || [0, 0, 0];
      sp[id] = [_r1(d[0] + (nx - q.x) / S), _r1(d[1] + (ny - q.y) / S), _gradi((d[2] || 0) + dg)];
    });
    a.opzioni.sposta = sp;
    _dopoSpostamento();
  };
  const _muoviCopia = (i, du, dw, dg = 0) => {
    const a = _attuale(), c = (a.opzioni.copie || [])[i];
    if (!c) return;
    _ricordaPrecedente();
    const m = _mappa, cols = m.vtt.maxX, rows = m.vtt.maxY;
    a.opzioni.copie = a.opzioni.copie.map((x, j) => j !== i ? x : { ...x, u: _r1(Math.max(0.5, Math.min(cols - 0.5, x.u + du))), w: _r1(Math.max(0.5, Math.min(rows - 0.5, x.w + dw))), g: _gradi(x.g + dg) });
    _dopoSpostamento();
  };
  // Un'azione sull'oggetto scelto, qualunque sia il tipo
  const _applicaSel = (t, du, dw, dg) => {
    if (_sel.tipo === 'agg') _muoviAgg(_sel.k, du, dw, dg);
    else if (_sel.tipo === 'copia') _muoviCopia(_sel.i, du, dw, dg);
    else _muoviScena(_sel.ids, t.x, t.y, du * _mappa.quadretto, dw * _mappa.quadretto, dg);
  };
  const _ruotaSel = (dg) => { const t = _mappa && _bersaglio(_mappa); if (t) _applicaSel(t, 0, 0, dg); };
  // La copia nasce accanto all'originale e diventa l'oggetto scelto
  const _duplicaSel = () => {
    const m = _mappa, t = m && _bersaglio(m);
    if (!t) return;
    _ricordaPrecedente();
    const a = _attuale(), S = m.quadretto, cols = m.vtt.maxX, rows = m.vtt.maxY;
    const u0 = (t.x - m.vtt.ox) / S, w0 = (t.y - m.vtt.oy) / S, passo = Math.max(1.5, t.R / S);
    const u = u0 + passo < cols - 0.5 ? u0 + passo : u0 - passo, w = Math.max(0.5, Math.min(rows - 0.5, w0 + 0.5));
    const copie = (a.opzioni.copie || []).slice();
    if (_sel.tipo === 'copia') { const c = copie[_sel.i]; if (!c) return; copie.push({ f: Array.isArray(c.f) ? c.f.slice() : c.f, u: _r1(u), w: _r1(w), g: c.g }); }
    else {
      if (_sel.tipo === 'agg') a.opzioni.pos = _posizioni(); // l'originale resta dov'e'
      copie.push({ f: _sel.tipo === 'agg' ? _sel.k : _sel.ids.slice(), u: _r1(u), w: _r1(w), g: 0 });
    }
    a.opzioni.copie = copie;
    _sel = { tipo: 'copia', i: copie.length - 1 };
    _dopoSpostamento();
  };
  const _eliminaSel = () => {
    if (!_sel || !_mappa) return;
    const a = _attuale();
    if (_sel.tipo === 'agg') {
      const voce = K().TIPI[_mappa.tipo].opzioni.find((q) => q.m), k = _sel.k;
      a.opzioni.pos = _posizioni(); // gli altri oggetti aggiunti restano dove sono
      _sel = null;
      _multi(voce.k, k);
      _aggiornaControlli();
      return;
    }
    _ricordaPrecedente();
    if (_sel.tipo === 'copia') { const c = (a.opzioni.copie || []).slice(); c.splice(_sel.i, 1); if (c.length) a.opzioni.copie = c; else delete a.opzioni.copie; }
    else a.opzioni.togli = [...new Set((a.opzioni.togli || []).concat(_sel.ids))];
    _sel = null;
    _dopoSpostamento();
  };
  const _rimettiSel = () => {
    if (!_sel) return;
    _ricordaPrecedente();
    const a = _attuale();
    if (_sel.tipo === 'agg') { const pos = _posizioni(); delete pos[_sel.k]; a.opzioni.pos = pos; _sel = null; }
    else if (a.opzioni.sposta) { const sp = { ...a.opzioni.sposta }; _sel.ids.forEach((id) => delete sp[id]); a.opzioni.sposta = sp; }
    _dopoSpostamento();
  };
  const rimettiACaso = () => { _ricordaPrecedente(); delete _attuale().opzioni.pos; _sel = null; _aggiornaControlli(); genera(); };
  const rimettiTutto = () => { _ricordaPrecedente(); const a = _attuale(); delete a.opzioni.pos; delete a.opzioni.sposta; delete a.opzioni.togli; delete a.opzioni.copie; _sel = null; _aggiornaControlli(); genera(); };
  const spostaRuota = () => {
    _modoSposta = !_modoSposta; _sel = null;
    if (_mappa) _rifaiManiglie();
  };
  // Quello che e' scelto ora: centro, raggio e disegno (solo le sue immagini)
  const _bersaglio = (m) => {
    if (!_sel) return null;
    if (_sel.tipo === 'agg') {
      const x = (m.aggiunti || []).find((q) => q.k === _sel.k);
      return x && { x: x.x, y: x.y, R: Math.max(x.r * 1.1, 24 / V.s), disegno: x.disegno, giro: x.giro || 0, nome: _nomeAgg(m, x.k) };
    }
    if (_sel.tipo === 'copia') {
      const c = (m.copie || []).find((q) => q.i === _sel.i);
      return c && { x: c.x, y: c.y, R: Math.max(c.r * 1.05, 24 / V.s), disegno: c.disegno, giro: 0, nome: 'Copia' };
    }
    const membri = _sel.ids.map((id) => (m.oggetti || []).find((q) => q.id === id)).filter(Boolean);
    if (!membri.length) return null;
    const c = membri[0], R = Math.max(24 / V.s, ...membri.map((q) => Math.hypot(q.x - c.x, q.y - c.y) + q.r));
    return { x: c.x, y: c.y, R, disegno: membri.map((q) => q.disegno).join(''), giro: 0, nome: 'Oggetto' };
  };
  // L'oggetto da solo, per vederlo muovere senza la mappa intorno
  const _fantasma = (t) => {
    const nomi = [...new Set([...t.disegno.matchAll(/href="#bm-([^"]+)"/g)].map((q) => q[1]))];
    const defs = nomi.map((n) => { const im = CartoBattaglia.immagine(n); return im ? '<image id="bm-' + n + '" href="' + im.url + '" x="' + (-im.w / 2) + '" y="' + (-im.h / 2) + '" width="' + im.w + '" height="' + im.h + '"/>' : ''; }).join('');
    const d = document.createElement('div');
    d.className = 'carto-fantasma';
    d.style.cssText = 'left:' + (t.x - t.R) + 'px;top:' + (t.y - t.R) + 'px;width:' + 2 * t.R + 'px;height:' + 2 * t.R + 'px;';
    d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (t.x - t.R) + ' ' + (t.y - t.R) + ' ' + 2 * t.R + ' ' + 2 * t.R + '" width="100%" height="100%" style="overflow:visible"><defs>' + defs + '</defs><g transform="rotate(' + t.giro + ' ' + t.x + ' ' + t.y + ')">' + t.disegno + '</g></svg>';
    return d;
  };
  // Oggetto della scena sotto il dito: il piu' piccolo (cosi' si prende anche cio' che sta sotto un albero);
  // un tavolo si porta dietro le sue sedie (oggetti piu' piccoli posati subito prima o dopo, li' attorno)
  const _prendi = (m, px, py) => {
    const tol = 14 / V.s;
    const c = (m.oggetti || []).filter((q) => Math.hypot(q.x - px, q.y - py) < Math.max(q.r * 0.8, tol));
    if (!c.length) return null;
    c.sort((a, b) => a.r - b.r || b.id - a.id);
    const p = c[0], ids = [p.id];
    if (!p.albero) m.oggetti.forEach((q) => { if (q.id !== p.id && !q.albero && Math.abs(q.id - p.id) <= 8 && q.r < p.r && Math.hypot(q.x - p.x, q.y - p.y) < p.r + 0.45 * m.quadretto) ids.push(q.id); });
    return ids;
  };
  // Trascinare: si muove solo l'oggetto; al rilascio la mappa si ridisegna con l'oggetto nel posto nuovo
  const _trascina = (ev, m, strato) => {
    ev.stopPropagation(); ev.preventDefault();
    const t = _bersaglio(m), el = ev.currentTarget;
    if (!t) return;
    try { el.setPointerCapture(ev.pointerId); } catch (z) {}
    const S = m.quadretto, x0 = ev.clientX, y0 = ev.clientY;
    const minX = m.vtt.ox + S * 0.5 - t.x, maxX = m.vtt.ox + (m.vtt.maxX - 0.5) * S - t.x, minY = m.vtt.oy + S * 0.5 - t.y, maxY = m.vtt.oy + (m.vtt.maxY - 0.5) * S - t.y;
    let dx = 0, dy = 0, f = null;
    const muovi = (e) => {
      e.stopPropagation();
      dx = Math.max(minX, Math.min(maxX, (e.clientX - x0) / V.s)); dy = Math.max(minY, Math.min(maxY, (e.clientY - y0) / V.s));
      if (!f && Math.hypot(e.clientX - x0, e.clientY - y0) > 6) {
        f = _fantasma(t); strato.appendChild(f);
        strato.classList.add('carto-in-mano');
      }
      if (f) f.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    };
    const fine = (e) => {
      e.stopPropagation();
      el.removeEventListener('pointermove', muovi); el.removeEventListener('pointerup', fine); el.removeEventListener('pointercancel', fine);
      if (!f) return; // solo un tocco: l'oggetto resta scelto
      _applicaSel(t, dx / S, dy / S, 0);
    };
    el.addEventListener('pointermove', muovi); el.addEventListener('pointerup', fine); el.addEventListener('pointercancel', fine);
  };
  // Cerchio intorno all'oggetto scelto, maniglia per ruotarlo e pulsanti
  const _disegnaSel = (m, strato) => {
    strato.querySelectorAll('.carto-sel, .carto-strumenti, .carto-giro').forEach((e) => e.remove());
    const t = _bersaglio(m);
    if (!t) return;
    const anello = document.createElement('div');
    anello.className = 'carto-sel';
    anello.style.cssText = 'left:' + (t.x - t.R) + 'px;top:' + (t.y - t.R) + 'px;width:' + 2 * t.R + 'px;height:' + 2 * t.R + 'px;';
    strato.appendChild(anello);
    // Maniglia: si gira intorno all'oggetto
    const giro = document.createElement('button');
    giro.type = 'button'; giro.className = 'carto-giro';
    giro.setAttribute('aria-label', 'Ruota: trascina intorno all’oggetto');
    giro.title = 'Trascina per ruotare';
    giro.style.cssText = 'left:' + t.x + 'px;top:' + (t.y - t.R) + 'px;';
    giro.innerHTML = ICONE.dx;
    giro.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      try { giro.setPointerCapture(ev.pointerId); } catch (z) {}
      const b = anello.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const a0 = Math.atan2(ev.clientY - cy, ev.clientX - cx);
      const f = _fantasma(t); strato.appendChild(f); strato.classList.add('carto-in-mano');
      let dg = 0;
      const muovi = (e) => { e.stopPropagation(); dg = Math.round((Math.atan2(e.clientY - cy, e.clientX - cx) - a0) * 180 / Math.PI / 5) * 5; f.style.transform = 'rotate(' + dg + 'deg)'; };
      const fine = (e) => {
        e.stopPropagation();
        giro.removeEventListener('pointermove', muovi); giro.removeEventListener('pointerup', fine); giro.removeEventListener('pointercancel', fine);
        if (Math.abs(dg) < 1) { f.remove(); strato.classList.remove('carto-in-mano'); return; }
        _applicaSel(t, 0, 0, dg);
      };
      giro.addEventListener('pointermove', muovi); giro.addEventListener('pointerup', fine); giro.addEventListener('pointercancel', fine);
    });
    strato.appendChild(giro);
    // Pulsanti sotto l'oggetto (sopra, se l'oggetto e' in fondo alla mappa)
    const sotto = t.y + t.R + 70 / V.s < m.H;
    const bar = document.createElement('div');
    bar.className = 'carto-strumenti' + (sotto ? '' : ' carto-strumenti-su');
    bar.style.cssText = 'left:' + t.x + 'px;top:' + (sotto ? t.y + t.R : t.y - t.R) + 'px;';
    bar.innerHTML =
      '<button type="button" class="btn btn-ghost btn-sm" onclick="Cartografo._ruotaSel(-45)" aria-label="Ruota a sinistra di 45 gradi" title="Ruota a sinistra">' + ICONE.sx + '</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" onclick="Cartografo._ruotaSel(45)" aria-label="Ruota a destra di 45 gradi" title="Ruota a destra">' + ICONE.dx + '</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" onclick="Cartografo._duplicaSel()" aria-label="Duplica" title="Duplica">' + ICONE.copia + '</button>' +
      '<button type="button" class="btn btn-ghost btn-sm carto-elimina" onclick="Cartografo._eliminaSel()" aria-label="Elimina" title="Elimina">' + ICONE.cestino + '</button>' +
      (_sel.tipo === 'copia' ? '' : '<button type="button" class="btn btn-ghost btn-sm" onclick="Cartografo._rimettiSel()">Com’era</button>');
    bar.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    strato.appendChild(bar);
  };
  const _rifaiManiglie = () => {
    const v = $('carto-vista');
    if (v) v.querySelectorAll('.carto-maniglie').forEach((e) => e.remove());
    _maniglie(_mappa);
  };
  const _maniglie = (m) => {
    const v = $('carto-vista'), bt = $('carto-sposta'), st = $('carto-stage'), barra = $('carto-sposta-barra');
    const attivo = _modoSposta && m.tipo === 'battaglia';
    if (bt) { bt.hidden = m.tipo !== 'battaglia'; bt.setAttribute('aria-pressed', String(attivo)); }
    if (st) st.classList.toggle('carto-modo-sposta', attivo);
    if (barra) {
      barra.hidden = !attivo;
      const oa = _attuale().opzioni, qualcosa = !!(oa.pos || oa.sposta || oa.togli || oa.copie);
      barra.innerHTML = '<span>Trascina un oggetto per spostarlo. Toccalo per ruotarlo.</span>' +
        (qualcosa ? '<button type="button" class="btn btn-ghost btn-sm" onclick="Cartografo.rimettiTutto()">Rimetti tutto com’era</button>' : '');
    }
    if (!v || !attivo) return;
    const strato = document.createElement('div');
    strato.className = 'carto-maniglie';
    // Il piano prende gli oggetti della scena; se sotto il dito non c'e' niente, il tocco passa alla mappa
    const piano = document.createElement('div');
    piano.className = 'carto-piano';
    piano.addEventListener('pointerdown', (ev) => {
      const b = v.getBoundingClientRect(), ids = _prendi(m, (ev.clientX - b.left) / V.s, (ev.clientY - b.top) / V.s);
      if (!ids) { if (_sel) { _sel = null; _disegnaSel(m, strato); } return; }
      _sel = { tipo: 'scena', ids };
      _disegnaSel(m, strato);
      _trascina(ev, m, strato);
    });
    strato.appendChild(piano);
    // Gli oggetti aggiunti dal menu hanno un cerchio tratteggiato: si prendono sempre come un pezzo unico
    (m.aggiunti || []).forEach((x) => {
      const R = Math.max(x.r * 1.05, 24 / V.s), nome = _nomeAgg(m, x.k);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'carto-maniglia';
      b.style.cssText = 'left:' + (x.x - R) + 'px;top:' + (x.y - R) + 'px;width:' + 2 * R + 'px;height:' + 2 * R + 'px;';
      b.setAttribute('aria-label', nome + ': trascina per spostare, frecce per spostare di un quadretto, R per ruotare');
      b.title = nome;
      b.addEventListener('pointerdown', (ev) => { _sel = { tipo: 'agg', k: x.k }; _disegnaSel(m, strato); _trascina(ev, m, strato); });
      b.addEventListener('keydown', (ev) => {
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
        if (d) { ev.preventDefault(); _sel = { tipo: 'agg', k: x.k }; _muoviAgg(x.k, d[0], d[1]); }
        else if (ev.key === 'r' || ev.key === 'R') { ev.preventDefault(); _sel = { tipo: 'agg', k: x.k }; _muoviAgg(x.k, 0, 0, ev.shiftKey ? -15 : 15); }
      });
      strato.appendChild(b);
    });
    (m.copie || []).forEach((c) => {
      const R = Math.max(c.r * 1.05, 24 / V.s);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'carto-maniglia';
      b.style.cssText = 'left:' + (c.x - R) + 'px;top:' + (c.y - R) + 'px;width:' + 2 * R + 'px;height:' + 2 * R + 'px;';
      b.setAttribute('aria-label', 'Copia: trascina per spostare');
      b.title = 'Copia';
      b.addEventListener('pointerdown', (ev) => { _sel = { tipo: 'copia', i: c.i }; _disegnaSel(m, strato); _trascina(ev, m, strato); });
      strato.appendChild(b);
    });
    v.appendChild(strato);
    _disegnaSel(m, strato);
  };
  const _dopoMostra = [];
  const dopoMostra = (f) => { if (typeof f === 'function') _dopoMostra.push(f); };
  const mappaAttuale = () => _mappa;

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

  /* ── Tavoli virtuali: Universal VTT (.dd2vtt), letto da Foundry, Roll20, Fantasy Grounds e altri ── */
  // Si rigenera la stessa mappa diritta, senza legenda, titolo e griglia disegnata (la griglia la
  // mette il tavolo virtuale) e la si ritaglia lungo i quadretti: cosi' la griglia del tavolo
  // cade esattamente su quella del dungeon. Muri e porte arrivano gia' pronti per la visuale.
  const VTT_TIPI = ['dungeon', 'abitazione', 'battaglia'];
  const PPG = 100; // pixel per quadretto nel file esportato
  // Ritaglio comune a tavolo virtuale e stampa: la stessa mappa diritta, senza legenda e titolo,
  // tagliata lungo i quadretti (un quadretto in piu' di margine), a ppg pixel per quadretto.
  const _ritaglio = async (piano, ppg, opz = {}) => {
    const casa = _mappa.tipo === 'abitazione', a = _attuale();
    const livelli = _mappa.tipo === 'dungeon' && (_mappa.pianiVtt || []).length > 1;
    const extra = casa ? { soloPiano: piano, tetto: false } : { rotazione: 'dritto', ...(livelli ? { soloLivello: piano || 0 } : {}) };
    const m = K().genera(_mappa.tipo, { ...a.opzioni, seme: a.seme, nome: _nomeEffettivo(), legenda: false, titolo: false, griglia: false, nomi: !!opz.numeri, ...extra });
    const v = m.vtt;
    if (!v || v.ang !== 0) throw new Error('dati dei quadretti mancanti');
    const scala = ppg / v.S;
    const mg = _mappa.tipo === 'battaglia' ? 0 : 1; // la battle map arriva gia' al bordo dei quadretti
    const x0 = v.minX - mg, y0 = v.minY - mg, larghi = v.maxX + mg - x0, alti = v.maxY + mg - y0;
    const sorgente = await _inCanvas(_conFont(m.svg, await _font()), m.W, m.H, scala);
    const c = document.createElement('canvas');
    c.width = larghi * ppg; c.height = alti * ppg;
    const g = c.getContext('2d');
    g.drawImage(sorgente, (v.ox + x0 * v.S) * scala, (v.oy + y0 * v.S) * scala, c.width, c.height, 0, 0, c.width, c.height);
    if (opz.griglia) {
      // Griglia di combattimento: un quadretto = 1,5 metri, linee sottili che non coprono il disegno
      g.strokeStyle = 'rgba(40,30,20,0.42)'; g.lineWidth = Math.max(1, ppg / 60);
      // solo sul pavimento: niente inchiostro sprecato sulla roccia
      g.beginPath();
      (v.celle || []).forEach(([cx, cy]) => g.rect((cx - x0) * ppg, (cy - y0) * ppg, ppg, ppg));
      g.stroke();
    }
    const piene = new Set((v.celle || []).map(([cx, cy]) => (cx - x0) + "," + (cy - y0)));
    return { c, v, x0, y0, larghi, alti, piene };
  };

  // Scelte prima di esportare o stampare: piano (case su piu' piani), griglia e numeri (solo stampa)
  const _apriScelta = (azione) => {
    let m = $('modal-carto-vtt');
    if (!m) {
      m = document.createElement('div');
      m.className = 'modal-overlay hidden'; m.id = 'modal-carto-vtt'; m.style.display = 'none';
      m.onclick = (e) => { if (e.target === m) Modal.close('carto-vtt'); };
      document.body.appendChild(m);
    }
    const piani = _mappa.pianiVtt || [];
    const stampa = azione === 'stampa';
    const scelte = (piani.length > 1
      ? '<label class="form-label" for="carto-vtt-piano">' + (_mappa.tipo === 'dungeon' ? 'Livello' : 'Piano') + '</label><select id="carto-vtt-piano" class="form-select" style="margin-bottom:12px;">' + piani.map((n, i) => '<option value="' + i + '">' + n + '</option>').join('') + '</select>'
      : '') +
      (stampa
        ? '<label style="display:flex;gap:8px;align-items:center;min-height:36px;"><input type="checkbox" id="carto-vtt-griglia" checked> Griglia di combattimento (1 quadretto = 1,5 m)</label>' +
          '<label style="display:flex;gap:8px;align-items:center;min-height:36px;"><input type="checkbox" id="carto-vtt-numeri"> Numeri delle stanze (per il master)</label>' +
          '<p style="margin:10px 0 0;font-size:0.8rem;color:var(--text-muted);">Ogni quadretto esce di 2,5 cm, la misura delle miniature. La mappa si divide su più fogli A4 numerati da unire.</p>'
        : '<p style="margin:0;font-size:0.85rem;color:var(--text-muted);">Ogni ' + (_mappa.tipo === 'dungeon' ? 'livello' : 'piano') + ' diventa una mappa a sé per il tavolo virtuale.</p>');
    m.innerHTML = '<div class="modal" style="max-width:420px;"><div class="modal-header"><h3 class="modal-title">' + (stampa ? 'Stampa in scala' : 'Tavolo virtuale') + '</h3>' +
      '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'carto-vtt\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="modal-body">' + scelte + '</div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-primary" style="width:100%;" onclick="Cartografo._confermaScelta(\'' + azione + '\')">' + (stampa ? 'Prepara i fogli' : 'Scarica il file') + '</button></div></div>';
    Modal.open('carto-vtt');
  };
  const _confermaScelta = (azione) => {
    const sel = $('carto-vtt-piano');
    const piano = sel ? parseInt(sel.value, 10) || 0 : 0;
    const opz = { griglia: !!($('carto-vtt-griglia') || {}).checked, numeri: !!($('carto-vtt-numeri') || {}).checked };
    Modal.close('carto-vtt');
    if (azione === 'stampa') stampaScala(piano, opz); else scaricaVtt(piano);
  };

  const scaricaVtt = async (piano) => {
    if (!_mappa || !VTT_TIPI.includes(_mappa.tipo)) return;
    const casa = (_mappa.pianiVtt || []).length > 1;
    if (casa && !Number.isInteger(piano)) {
      if ((_mappa.pianiVtt || []).length > 1) { _apriScelta('vtt'); return; }
      piano = 0;
    }
    const btn = $('carto-vtt');
    if (btn) btn.disabled = true;
    try {
      const { c, v, x0, y0, larghi, alti } = await _ritaglio(piano, PPG);
      const immagine = c.toDataURL('image/png').split(',')[1];
      const p = (x, y) => ({ x: Math.round((x - x0) * 1000) / 1000, y: Math.round((y - y0) * 1000) / 1000 });
      const dati = {
        format: 0.3,
        resolution: { map_origin: { x: 0, y: 0 }, map_size: { x: larghi, y: alti }, pixels_per_grid: PPG },
        line_of_sight: v.muri.map(([ax, ay, bx, by]) => [p(ax, ay), p(bx, by)]),
        objects_line_of_sight: [],
        portals: v.porte.map(({ seg: [ax, ay, bx, by] }) => ({
          position: p((ax + bx) / 2, (ay + by) / 2),
          bounds: [p(ax, ay), p(bx, by)],
          rotation: ax === bx ? Math.PI / 2 : 0,
          closed: true,
          freestanding: false,
        })),
        environment: { baked_lighting: true, ambient_light: 'ffffffff' },
        lights: [],
        image: immagine,
        software: 'Pocket GM Screen',
      };
      const suffisso = casa && (_mappa.pianiVtt || []).length > 1 ? ' - ' + _mappa.pianiVtt[piano] : '';
      _scarica(new Blob([JSON.stringify(dati)], { type: 'application/json' }), _nomeFile() + suffisso + '.dd2vtt');
      Toast.show('File per il tavolo virtuale pronto: ' + v.muri.length + ' tratti di muro e ' + v.porte.length + ' porte.', 'success', 4000);
    } catch (e) {
      if (typeof Debug !== 'undefined') Debug.warn('Cartografo VTT: ' + e);
      Toast.show('Il file per il tavolo virtuale non è riuscito. Riprova con “Nuova mappa”.', 'error', 5000);
    }
    if (btn) btn.disabled = false;
  };

  /* ── Stampa in scala: 1 quadretto = 2,5 cm, su fogli A4 numerati ── */
  const PPG_STAMPA = 120; // circa 120 punti per pollice: nitida su carta
  const _fogliDi = (larghi, alti) => {
    // A4 con 10 mm di margine: 7 x 10 quadretti in verticale, 10 x 7 in orizzontale; vince chi usa meno fogli
    const vert = Math.ceil(larghi / 7) * Math.ceil(alti / 10), oriz = Math.ceil(larghi / 10) * Math.ceil(alti / 7);
    return oriz < vert ? { cw: 10, ch: 7, orient: 'landscape' } : { cw: 7, ch: 10, orient: 'portrait' };
  };
  const stampaScala = async (piano, opz) => {
    if (!_mappa || !VTT_TIPI.includes(_mappa.tipo)) return;
    if (!opz) { _apriScelta('stampa'); return; }
    // La finestra si apre subito, nel gesto dell'utente: dopo l'attesa il browser la bloccherebbe
    const w = window.open('', '_blank');
    if (!w) { Toast.show('Il browser ha bloccato la finestra di stampa: permetti le finestre per questo sito e riprova.', 'warning', 6000); return; }
    w.document.write('<!doctype html><meta charset="utf-8"><title>Preparo i fogli…</title><body style="font:16px system-ui;padding:24px;">Preparo i fogli…</body>');
    try {
      const { c, larghi, alti, piene } = await _ritaglio(piano || 0, PPG_STAMPA, opz);
      const conPavimento = (k0, r0, qw, qh) => { for (let y = r0; y < r0 + qh; y++) for (let x = k0; x < k0 + qw; x++) if (piene.has(x + "," + y)) return true; return false; };
      const { cw, ch, orient } = _fogliDi(larghi, alti);
      const colonne = Math.ceil(larghi / cw), righe = Math.ceil(alti / ch), tot = colonne * righe;
      const lettere = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let fogli = '', stampati = 0;
      for (let r = 0; r < righe; r++) for (let k = 0; k < colonne; k++) {
        const qw = Math.min(cw, larghi - k * cw), qh = Math.min(ch, alti - r * ch);
        if (piene.size && !conPavimento(k * cw, r * ch, qw, qh)) continue; // foglio vuoto: non si stampa
        stampati++;
        const t = document.createElement('canvas');
        t.width = qw * PPG_STAMPA; t.height = qh * PPG_STAMPA;
        t.getContext('2d').drawImage(c, k * cw * PPG_STAMPA, r * ch * PPG_STAMPA, t.width, t.height, 0, 0, t.width, t.height);
        const nome = lettere[r] + (k + 1);
        fogli += '<section class="foglio"><img src="' + t.toDataURL('image/jpeg', 0.92) + '" style="width:' + (qw * 25.4) + 'mm;height:' + (qh * 25.4) + 'mm;" alt="Foglio ' + nome + '">' +
          '<p>Foglio ' + nome + ' · riga ' + lettere[r] + ', colonna ' + (k + 1) + ' di ' + colonne + '</p></section>';
      }
      const titolo = (_mappa.nome || 'Mappa') + ((_mappa.pianiVtt || []).length > 1 ? ' - ' + _mappa.pianiVtt[piano || 0] : '');
      const esc = (x) => String(x).replace(/[&<>"]/g, (q) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[q]));
      w.document.open();
      w.document.write('<!doctype html><html lang="it"><head><meta charset="utf-8"><title>' + esc(titolo) + ' · stampa in scala</title><style>' +
        '@page { size: A4 ' + orient + '; margin: 10mm; }' +
        'body { margin: 0; font-family: system-ui, sans-serif; color: #2a2420; }' +
        '.guida { max-width: 640px; margin: 24px auto; padding: 0 16px; line-height: 1.5; }' +
        '.guida button { font: 600 16px system-ui; padding: 12px 22px; border-radius: 999px; border: 0; background: #8a4f1f; color: #fff; cursor: pointer; }' +
        '.foglio { break-after: page; page-break-after: always; }' +
        '.foglio img { display: block; }' +
        '.foglio p { margin: 3mm 0 0; font-size: 9pt; color: #6b605a; }' +
        '@media screen { .foglio { margin: 24px auto; width: max-content; box-shadow: 0 2px 12px rgba(0,0,0,.18); padding: 10mm; background: #fff; } body { background: #e9e4dc; } }' +
        '@media print { .guida { display: none; } }' +
        '</style></head><body>' +
        '<div class="guida"><h1 style="font-size:24px;margin:0 0 8px;">' + esc(titolo) + '</h1>' +
        '<p>' + stampati + (stampati === 1 ? ' foglio A4' : ' fogli A4') + ' (i fogli che resterebbero vuoti non si stampano), ' + (orient === 'landscape' ? 'in orizzontale' : 'in verticale') + '. Ogni quadretto è 1,5 metri e misura 2,5 cm, la base di una miniatura.</p>' +
        '<p><b>Nella finestra di stampa scegli «Dimensioni effettive» o scala 100%</b>, non «Adatta alla pagina», altrimenti i quadretti escono più piccoli. Poi unisci i fogli seguendo lettere e numeri: A1 in alto a sinistra.</p>' +
        '<p><button type="button" onclick="window.print()">Stampa</button></p></div>' +
        fogli + '</body></html>');
      w.document.close();
    } catch (e) {
      if (typeof Debug !== 'undefined') Debug.warn('Cartografo stampa: ' + e);
      try { w.close(); } catch (er) {}
      Toast.show('La stampa non è riuscita. Riprova con “Nuova mappa”.', 'error', 5000);
    }
  };

  /* ── Battle map su un A4 intero: la mappa da mettere sul tavolo, poi la legenda per il master ── */
  const stampaA4 = async () => {
    if (!_mappa || _mappa.tipo !== 'battaglia') return;
    const w = window.open('', '_blank');
    if (!w) { Toast.show('Il browser ha bloccato la finestra di stampa: permetti le finestre per questo sito e riprova.', 'warning', 6000); return; }
    w.document.write('<!doctype html><meta charset="utf-8"><title>Preparo il foglio…</title><body style="font:16px system-ui;padding:24px;">Preparo il foglio…</body>');
    try {
      const a = _attuale();
      const m = K().genera('battaglia', { ...a.opzioni, seme: a.seme, nome: _nomeEffettivo(), impagina: 'foglio' });
      const c = await _inCanvas(_conFont(m.svg, await _font()), m.W, m.H, 1);
      const esc = (x) => String(x).replace(/[&<>"]/g, (q) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[q]));
      const voci = m.legenda || [];
      const legenda = voci.length ? '<section class="foglio legenda"><h1>' + esc(m.nome) + '</h1><p class="sotto">Per il master · un quadretto = 1,5 metri</p><ol>' +
        voci.map((v) => '<li><b>' + esc(v.titolo) + '</b> ' + esc(v.testo) + '</li>').join('') + '</ol></section>' : '';
      w.document.open();
      w.document.write('<!doctype html><html lang="it"><head><meta charset="utf-8"><title>' + esc(m.nome) + ' · A4</title><style>' +
        '@page { size: A4 landscape; margin: 5mm; }' +
        'body { margin: 0; font-family: system-ui, sans-serif; color: #2a2420; }' +
        '.guida { max-width: 640px; margin: 24px auto; padding: 0 16px; line-height: 1.5; }' +
        '.guida button { font: 600 16px system-ui; padding: 12px 22px; border-radius: 999px; border: 0; background: #8a4f1f; color: #fff; cursor: pointer; }' +
        '.foglio { break-after: page; page-break-after: always; width: 287mm; height: 200mm; display: flex; align-items: center; justify-content: center; overflow: hidden; }' +
        '.foglio img { max-width: 287mm; max-height: 200mm; display: block; }' +
        '.legenda { display: block; box-sizing: border-box; padding: 6mm 8mm; columns: 2; column-gap: 10mm; }' +
        '.legenda h1 { column-span: all; font: 600 20pt Georgia, serif; margin: 0; } .legenda .sotto { column-span: all; margin: 1mm 0 5mm; color: #6b605a; font-size: 10pt; }' +
        '.legenda ol { margin: 0; padding-left: 7mm; font-size: 11pt; line-height: 1.45; } .legenda li { margin-bottom: 2.5mm; break-inside: avoid; }' +
        '@media screen { .foglio { margin: 24px auto; box-shadow: 0 2px 12px rgba(0,0,0,.18); background: #fff; } body { background: #e9e4dc; } }' +
        '@media print { .guida { display: none; } }' +
        '</style></head><body>' +
        '<div class="guida"><h1 style="font-size:24px;margin:0 0 8px;">' + esc(m.nome) + '</h1>' +
        '<p>La mappa occupa tutto un foglio A4 in orizzontale' + (legenda ? '; nel secondo foglio ci sono i numeri spiegati, per il master' : '') + '. Ogni quadretto è 1,5 metri.</p>' +
        '<p>Nella finestra di stampa scegli <b>orizzontale</b> e margini <b>minimi</b> o <b>nessuno</b>, così la mappa arriva quasi al bordo del foglio.</p>' +
        '<p><button type="button" onclick="window.print()">Stampa</button></p></div>' +
        '<section class="foglio"><img src="' + c.toDataURL('image/jpeg', 0.93) + '" alt="' + esc(m.nome) + '"></section>' + legenda + '</body></html>');
      w.document.close();
    } catch (e) {
      if (typeof Debug !== 'undefined') Debug.warn('Cartografo A4: ' + e);
      try { w.close(); } catch (er) {}
      Toast.show('La stampa non è riuscita. Riprova con “Nuova mappa”.', 'error', 5000);
    }
  };

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
      // Mappa sopra e ferma in alto mentre si scorrono le impostazioni: ogni modifica si vede subito
      '.carto-anteprima { display:contents; }' +
      '.carto-barra { order:-2; }' +
      '#carto-stage { order:-1; position:sticky; top:calc(var(--carto-sopra, 56px) + 8px); z-index:3; box-shadow:0 6px 16px -8px rgba(0,0,0,.45); }' +
      '#carto-stage, #carto-contesto:not([hidden]) ~ .carto-corpo #carto-stage { height:auto; aspect-ratio:var(--carto-ar, 7/5); max-height:calc(100dvh - var(--carto-sopra, 56px) - 300px); min-height:200px; }' +
      '.carto-principali { grid-template-columns:repeat(3,minmax(0,1fr)); }' +
      // Sulla mappa intera in alto c'e' il titolo: lo zoom non lo deve coprire
      '.carto-zoom { top:auto; bottom:8px; right:8px; }';
    const telefono =
      '.carto-comandi > .btn, .carto-azioni > .btn { flex:1 1 auto; min-height:40px; }' +
      '.carto-azioni { width:100%; }' +
      '.carto-principali { grid-template-columns:repeat(2,minmax(0,1fr)); }';
    st.textContent =
      // overflow:clip invece di auto: la pagina non scorre da sola (scorre il documento) e cosi' la mappa puo' restare ferma in alto
      '#page-cartografo { container-type:inline-size; overflow:clip; }' +
      '#carto-tipi { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:var(--space-sm); }' +
      '#carto-contesto { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:6px 12px; padding:8px 12px; margin-bottom:var(--space-sm); background:var(--bg-tertiary); border:1px solid var(--border-strong); border-radius:var(--radius-md); color:var(--text-primary); font-size:0.92rem; }' +
      '#carto-contesto[hidden] { display:none; }' +
      '.carto-comandi { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-bottom:var(--space-md); }' +
      '.carto-corpo { display:grid; grid-template-columns:minmax(280px,320px) minmax(0,1fr); gap:var(--space-md); align-items:start; }' +
      '.carto-pannello { margin:0; }' +
      '.carto-pannello:hover { box-shadow:var(--shadow-sm); }' +
      '.carto-griglia { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); column-gap:10px; }' +
      '.carto-griglia > :last-child:nth-child(odd) { grid-column:1 / -1; }' +
      '.carto-gruppo { margin-bottom:var(--space-md); }' +
      '.carto-spunta { display:flex; align-items:center; gap:8px; min-height:34px; cursor:pointer; color:var(--text-primary); font-size:0.92rem; line-height:1.3; }' +
      '.carto-spunta input { width:18px; height:18px; flex-shrink:0; accent-color:var(--accent-primary); cursor:pointer; }' +
      '.carto-chips { display:flex; flex-wrap:wrap; gap:6px; }' +
      '.carto-chip { min-height:36px; padding:6px 12px; border-radius:999px; border:1px solid var(--border-strong); background:var(--bg-secondary); color:var(--text-primary); font:inherit; font-size:0.88rem; line-height:1.2; cursor:pointer; }' +
      '.carto-chip[aria-pressed="true"] { background:var(--accent-primary); border-color:var(--accent-primary); color:var(--text-on-accent, #fff); }' +
      '.carto-chip:focus-visible { outline:2px solid var(--accent-primary); outline-offset:2px; }' +
      '.carto-principali > :last-child:nth-child(odd) { grid-column:auto; }' +
      '.carto-sezione { border-top:1px solid var(--border); }' +
      '.carto-sezione:last-child { margin-bottom:calc(-1 * var(--space-sm)); }' +
      '.carto-sezione > summary { display:flex; align-items:center; gap:8px; min-height:48px; cursor:pointer; list-style:none; color:var(--text-primary); font-weight:600; font-size:0.95rem; -webkit-user-select:none; user-select:none; }' +
      '.carto-sezione > summary::-webkit-details-marker { display:none; }' +
      '.carto-sezione > summary:focus-visible { outline:2px solid var(--accent-primary); outline-offset:2px; border-radius:var(--radius-sm); }' +
      '.carto-freccia { flex-shrink:0; color:var(--text-muted); transition:transform .15s ease; }' +
      '.carto-sezione[open] .carto-freccia { transform:rotate(90deg); }' +
      '.carto-conta { min-width:22px; height:22px; padding:0 7px; border-radius:999px; background:var(--accent-primary); color:var(--text-on-accent, #fff); font-size:0.8rem; line-height:22px; text-align:center; }' +
      '.carto-conta[hidden] { display:none; }' +
      '.carto-sezione-corpo { padding-bottom:var(--space-md); }' +
      '.carto-suggerimento { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:6px 10px; margin-top:10px; font-size:0.88rem; color:var(--text-secondary); }' +
      '.carto-maniglie { position:absolute; inset:0; }' +
      '.carto-piano { position:absolute; inset:0; touch-action:none; cursor:pointer; }' +
      '.carto-maniglia { position:absolute; padding:0; border-radius:50%; border:calc(2px * var(--inv, 1)) dashed rgba(255,255,255,.9); background:transparent; box-shadow:0 0 0 calc(1px * var(--inv, 1)) rgba(0,0,0,.4); cursor:grab; touch-action:none; }' +
      '.carto-maniglia:hover, .carto-maniglia:focus-visible { border-style:solid; border-color:var(--accent-primary); outline:none; }' +
      '.carto-sel { position:absolute; pointer-events:none; border-radius:50%; border:calc(3px * var(--inv, 1)) solid var(--accent-primary); box-shadow:0 0 0 calc(2px * var(--inv, 1)) rgba(0,0,0,.35); }' +
      '.carto-in-mano .carto-sel { border-style:dashed; border-color:rgba(255,255,255,.9); background:rgba(20,14,10,.62); }' +
      '.carto-in-mano .carto-strumenti, .carto-in-mano .carto-giro { visibility:hidden; }' +
      '.carto-fantasma { position:absolute; pointer-events:none; z-index:3; filter:drop-shadow(0 calc(10px * var(--inv, 1)) calc(10px * var(--inv, 1)) rgba(0,0,0,.6)); }' +
      '.carto-giro { position:absolute; width:36px; height:36px; padding:0; display:grid; place-items:center; border-radius:50%; border:2px solid #fff; background:var(--accent-primary); color:var(--text-on-accent, #fff); box-shadow:0 2px 8px rgba(0,0,0,.45); transform:translate(-50%,-50%) scale(var(--inv, 1)); cursor:grab; touch-action:none; z-index:2; }' +
      '.carto-strumenti { position:absolute; display:flex; gap:4px; padding:4px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); box-shadow:var(--shadow-md); white-space:nowrap; transform-origin:top center; transform:translate(-50%, calc(10px * var(--inv, 1))) scale(var(--inv, 1)); z-index:2; }' +
      '.carto-strumenti-su { transform-origin:bottom center; transform:translate(-50%, calc(-100% - 46px * var(--inv, 1))) scale(var(--inv, 1)); }' +
      '.carto-strumenti .carto-elimina { color:var(--danger, #d9534f); }' +
      '.carto-strumenti .btn { min-height:40px; min-width:40px; display:inline-flex; align-items:center; justify-content:center; }' +
      '#carto-sposta[aria-pressed="true"] { background:var(--accent-primary) !important; border-color:var(--accent-primary) !important; color:var(--text-on-accent, #fff) !important; }' +
      '#carto-sposta-barra { position:absolute; left:8px; bottom:8px; right:8px; display:flex; flex-wrap:wrap; align-items:center; gap:4px 10px; width:max-content; max-width:calc(100% - 16px); padding:6px 6px 6px 12px; background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border); border-radius:var(--radius-md); box-shadow:var(--shadow-md); font-size:0.88rem; z-index:2; }' +
      '#carto-sposta-barra[hidden] { display:none; }' +
      '.carto-spunte { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); column-gap:10px; }' +
      '.carto-nota { font-size:0.88rem; line-height:1.5; color:var(--text-secondary); padding:8px 10px; margin-top:8px; background:var(--bg-tertiary); border-radius:var(--radius-md); }' +
      '.carto-anteprima { min-width:0; display:flex; flex-direction:column; gap:8px; }' +
      '.carto-barra { display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; justify-content:space-between; }' +
      '.carto-nome-mappa { font-family:var(--font-display); font-size:1.05rem; color:var(--text-primary); line-height:1.25; overflow-wrap:anywhere; }' +
      '#carto-info { font-size:0.85rem; color:var(--text-muted); }' +
      '.carto-azioni { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }' +
      '#carto-stage.carto-posa { cursor:crosshair !important; outline:3px dashed var(--accent-primary); outline-offset:-3px; }' +
      '.carto-rit-lista { display:grid; gap:6px; max-height:42vh; overflow-y:auto; padding-right:2px; }' +
      '.carto-rit-riga { display:flex; gap:8px; align-items:center; }' +
      '.carto-rit-riga .form-input { flex:1; min-width:0; font-size:0.85rem; }' +
      '.carto-rit-riga .form-select { width:auto !important; font-size:0.8rem; }' +
      '.carto-rit-nascondi { display:inline-flex; align-items:center; gap:6px; font-size:0.8rem; white-space:nowrap; cursor:pointer; }' +
      '.carto-rit-scritta { margin-bottom:6px; }' +
      '.carto-rit-nuova { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:4px; }' +
      '.carto-rit-nuova .form-input { flex:1 1 200px; } .carto-rit-nuova .form-select { width:auto !important; }' +
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
              '<button type="button" class="btn btn-secondary btn-sm" id="carto-sposta" hidden aria-pressed="false" onclick="Cartografo.spostaRuota()" title="Prendi gli oggetti della mappa per spostarli e ruotarli">Sposta e ruota</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" onclick="Cartografo.ritocca()" title="Rinomina o nascondi i nomi, aggiungi scritte tue">Ritocca</button>' +
              '<button type="button" class="btn btn-primary btn-sm" onclick="Cartografo.apriMettiNelleMappe()">Metti nelle mappe</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" id="carto-png" onclick="Cartografo.scaricaPng()">Scarica PNG</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" onclick="Cartografo.scaricaSvg()">Scarica SVG</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" id="carto-vtt" hidden onclick="Cartografo.scaricaVtt()" title="Per Foundry, Roll20, Fantasy Grounds e altri tavoli virtuali: mappa con muri e porte">Tavolo virtuale</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" id="carto-a4" hidden onclick="Cartografo.stampaA4()" title="La battle map su un foglio A4 intero, più la legenda per il master">Stampa A4</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" id="carto-stampa" hidden onclick="Cartografo.stampaScala()" title="Quadretti da 2,5 cm su fogli A4, per giocare con le miniature">Stampa in scala</button>' +
            '</div></div>' +
          '<div id="carto-stage"><div id="carto-vista" role="img"></div>' +
            '<div id="carto-attesa" role="status">Sto disegnando la mappa…</div>' +
            '<div id="carto-sposta-barra" hidden></div>' +
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
  const ritocca = () => {
    if (!_mappa || typeof CartoRitocchi === 'undefined') return;
    CartoRitocchi.apri({ stato: () => ({ a: _attuale(), mappa: _mappa }), salvaStato: _salva, rigenera: genera });
  };
  return { strumenti, ritocca, perPin, annullaContesto, apri, nuova, aCaso, _tieniColori, precedente, scegliTipo, zoom, zoomReset, scaricaPng, scaricaSvg, scaricaVtt, stampaScala, stampaA4, _confermaScelta, apriMettiNelleMappe, _confermaMappe, _opzione, _multi, _apri, rimettiACaso, rimettiTutto, spostaRuota, _ruotaSel, _rimettiSel, _duplicaSel, _eliminaSel, _nome, _seme, dopoMostra, mappaAttuale };
})();

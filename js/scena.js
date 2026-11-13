/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   SCENA.JS — La scena disegnata in cima alle pagine (nuova grafica).
   Non servono illustrazioni: il paesaggio nasce dal nome (stesso nome,
   stessa scena) e prende i colori dalla tavolozza scelta nelle
   Impostazioni, quindi cambia con tema e colore senza ridisegnarlo.
   Qui stanno anche i due segni del gioco usati nelle tessere:
   la ruota a spicchi dei clock e i pallini di avanzamento.
   Stili in css/scena.css.
   ============================================================ */

const Scena = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  let _n = 0;

  // Generatore casuale ripetibile: dallo stesso testo escono sempre gli stessi numeri
  const _seme = (s) => {
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  };
  const _el = (n, a, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const _cresta = (r, base, amp, rug) => {
    const f1 = r() * 6.28, f2 = r() * 6.28, f3 = r() * 6.28;
    let d = 'M0 620V' + base;
    for (let x = 0; x <= 1440; x += 24) {
      const y = base - amp * (.5 + .5 * Math.sin(x / 260 + f1)) - amp * .45 * Math.sin(x / 97 + f2) - rug * Math.sin(x / 31 + f3) - rug * (r() - .5);
      d += 'L' + x + ' ' + y.toFixed(1);
    }
    return d + 'V620Z';
  };

  // Il tipo di paesaggio si intuisce dalle parole del nome o della descrizione; altrimenti lo sceglie il nome
  // Paesaggi conosciuti: ognuno puo' avere la sua immagine in img/scene/<nome>.webp
  const PAESAGGI = [
    ['vulcano', 'Vulcano', /vulcan|cener|lava|fuoco|fiamm|brac|drag/],
    ['gelo', 'Nord gelido', /gel|ghiacc|nev|invern|tundr|nord/],
    ['montagne', 'Montagne', /mont|picc|vett|nan[io]\b|rocc|passo/],
    ['costa', 'Costa', /mar[ei]?\b|cost|port[oi]\b|isol|nav[ei]|onde|scogl/],
    ['deserto', 'Deserto', /desert|sabbi|dun[ae]|oasi/],
    ['palude', 'Palude', /palud|acquitrin|stagn|marcit/],
    ['foresta', 'Foresta', /bosc|forest|selv|alber|elf/],
    ['rovine', 'Rovine', /rovin|tempi|antic|perdut|tomb|cripta/],
    ['citta', 'Città', /citt|regn|castel|corona|re\b|regina|mura/],
    ['colline', 'Colline', /vall|coll|villag|campagn|vign/],
  ];
  const _disegnoDi = (k) => ({ vulcano: 'vulcano', gelo: 'monti', montagne: 'monti', monti: 'monti' }[k] || 'colline');
  const tipo = (testo) => {
    const t = String(testo || '').toLowerCase();
    const p = PAESAGGI.find(([, , re]) => re.test(t));
    if (p) return p[0];
    return ['montagne', 'colline', 'foresta', 'costa'][Math.floor(_seme(t)() * 4)];
  };

  const disegna = (svg) => {
    const nome = svg.dataset.seme || 'x';
    const r = _seme(nome), tp = _disegnoDi(svg.dataset.tipo && svg.dataset.tipo !== 'auto' ? svg.dataset.tipo : tipo(nome)), id = 'sc' + (_n++);
    svg.setAttribute('viewBox', '0 0 1440 620'); svg.setAttribute('preserveAspectRatio', 'xMidYMid slice'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '';
    const defs = _el('defs', {}, svg);
    const g1 = _el('linearGradient', { id: id + 'c', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    _el('stop', { offset: 0, style: 'stop-color:var(--sc-c1)' }, g1); _el('stop', { offset: 1, style: 'stop-color:var(--sc-c2)' }, g1);
    const lx = 55 + r() * 25, ly = tp === 'vulcano' ? 40 : 22 + r() * 14;
    const g2 = _el('radialGradient', { id: id + 'g', cx: lx + '%', cy: ly + '%', r: '55%' }, defs);
    _el('stop', { offset: 0, style: 'stop-color:var(--sc-luce);stop-opacity:.8' }, g2); _el('stop', { offset: 1, style: 'stop-color:var(--sc-luce);stop-opacity:0' }, g2);
    _el('rect', { width: 1440, height: 620, fill: 'url(#' + id + 'c)' }, svg); _el('rect', { width: 1440, height: 620, fill: 'url(#' + id + 'g)' }, svg);
    const st = _el('g', { style: 'fill:var(--text-primary);opacity:var(--sc-stelle)' }, svg);
    for (let i = 0; i < 34; i++) _el('circle', { cx: (r() * 1440).toFixed(0), cy: (r() * 300).toFixed(0), r: (.6 + r() * 1.1).toFixed(1) }, st);
    if (tp !== 'vulcano') _el('circle', { cx: lx * 14.4, cy: ly * 6.2, r: 34 + r() * 16, style: 'fill:var(--sc-luce);opacity:.9' }, svg);
    _el('path', { d: _cresta(r, 400, 150, 10), style: 'fill:var(--sc-m0)' }, svg);
    if (tp === 'vulcano') {
      const cx = lx * 14.4, top = 235;
      _el('path', { d: 'M' + (cx - 10) + ' ' + (top - 6) + 'c18-58-28-88 8-146 10 48 58 58 40 116 28-20 38-48 34-78 38 48 20 98-10 126z', style: 'fill:var(--sc-luce);opacity:.85' }, svg);
      _el('path', { d: 'M' + (cx - 330) + ' 620 ' + (cx - 36) + ' ' + top + 'l38 20 30-16 34 18 30-22 320 400z', style: 'fill:var(--sc-m1)' }, svg);
      _el('path', { d: 'M' + (cx + 2) + ' ' + (top + 20) + 'l-24 118 44-58 20 108 24-138 40 88-10-118-30 22-34-18z', style: 'fill:var(--sc-ac);opacity:.75' }, svg);
      const br = _el('g', { style: 'fill:var(--sc-luce)' }, svg);
      for (let i = 0; i < 9; i++) _el('circle', { cx: (cx - 140 + r() * 320).toFixed(0), cy: (60 + r() * 150).toFixed(0), r: (1 + r() * 1.4).toFixed(1) }, br);
    } else _el('path', { d: _cresta(r, 470, 130, tp === 'monti' ? 26 : 6), style: 'fill:var(--sc-m1)' }, svg);
    if (tp === 'colline') { const tx = 980 + r() * 200; _el('path', { d: 'M' + tx + ' 470v-74h-8v-16h10v8h10v-8h10v8h10v-8h10v16h-8v74z', style: 'fill:var(--sc-m2)' }, svg); }
    _el('path', { d: _cresta(r, 540, 90, tp === 'monti' ? 16 : 5), style: 'fill:var(--sc-m2)' }, svg);
    _el('path', { d: _cresta(r, 600, 50, 4), style: 'fill:var(--bg-primary)' }, svg);
    svg.dataset.fatta = nome;
    _foto(svg);
  };

  // Disegna tutte le scene non ancora disegnate (o il cui nome e' cambiato)
  // (quelle gia' disegnate ricontrollano solo l'immagine: un caricamento o un cambio di campagna la cambia)
  const tutte = (radice) => (radice || document).querySelectorAll('svg.sc-scena').forEach((s) => { if (s.dataset.fatta !== (s.dataset.seme || 'x')) disegna(s); else _foto(s); });
  // chiave: 'campagna' per Home e Dashboard, altrimenti l'id della pagina; camp: id della campagna (per la Home)
  const svg = (seme, tp, chiave, camp) => '<svg class="sc-scena" data-seme="' + _attr(seme) + '" data-tipo="' + (tp || 'auto') + '"' +
    (chiave ? ' data-chiave="' + _attr(chiave) + '"' : '') + (camp ? ' data-camp="' + _attr(camp) + '"' : '') + '></svg>';
  const _attr = (t) => String(t || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  // ── Immagini al posto del disegno ──
  // Ordine: immagine caricata per questa pagina > immagine dell'app per la pagina (img/scene/<pagina>.webp) >
  // immagine caricata per la campagna > immagine dell'app per il paesaggio (img/scene/<paesaggio>.webp) > disegno.
  // Le immagini vanno bene in bianco e nero: il colore lo da' la tavolozza (css/scena.css, .sc-foto).
  const PAGINE_FILE = { 'page-wiki': 'wiki', 'page-sessione': 'sessione', 'page-mappa': 'mappa', 'page-cartografo': 'cartografo', 'page-scrittoio': 'scrittoio',
    'page-schermo': 'schermo', 'page-compendio': 'compendio', 'page-musica': 'musica', 'page-calendario': 'calendario', 'page-generatori': 'generatori', 'page-trame': 'wiki' };
  const _fileDiPagina = (chiave) => { const k = Object.keys(PAGINE_FILE).find((p) => chiave === p || chiave.indexOf(p + '-') === 0); return k ? PAGINE_FILE[k] : ''; };
  const _campDi = (svg) => {
    if (typeof App === 'undefined') return null;
    if (svg.dataset.camp && typeof Storage !== 'undefined' && Storage.getCampaign) return Storage.getCampaign(svg.dataset.camp);
    return App.getActiveCampaign ? App.getActiveCampaign() : null;
  };
  const paesaggioDi = (camp) => (camp && camp.sfondoTipo) || tipo(((camp && camp.name) || '') + ' ' + ((camp && camp.description) || ''));
  const _candidati = (svg) => {
    const camp = _campDi(svg), sf = (camp && camp.sfondi) || {};
    const chiave = svg.dataset.chiave || '';
    const lista = [];
    if (chiave && chiave !== 'campagna') {
      if (sf[chiave]) lista.push(sf[chiave]);
      const f = _fileDiPagina(chiave);
      if (f) lista.push('img/scene/' + f + '.webp');
    }
    if (chiave) {
      if (sf.campagna) lista.push(sf.campagna);
      lista.push('img/scene/' + paesaggioDi(camp) + '.webp');
    }
    return lista;
  };
  const _esiste = new Map(); // url -> true/false (le immagini mancanti non si richiedono di nuovo)
  const _prova = (url) => new Promise((ok) => {
    if (_esiste.has(url)) return ok(_esiste.get(url));
    const i = new Image();
    i.onload = () => { _esiste.set(url, true); ok(true); };
    i.onerror = () => { _esiste.set(url, false); ok(false); };
    i.src = url;
  });
  const _foto = async (svg) => {
    const lista = _candidati(svg);
    let url = '';
    for (const u of lista) { if (await _prova(u)) { url = u; break; } }
    const padre = svg.parentElement;
    if (!padre) return;
    let f = padre.querySelector(':scope > .sc-foto');
    if (!url) { if (f) f.remove(); svg.style.visibility = ''; return; }
    if (!f) { f = document.createElement('div'); f.className = 'sc-foto'; f.setAttribute('aria-hidden', 'true'); f.innerHTML = '<img alt="">'; svg.insertAdjacentElement('afterend', f); }
    const img = f.querySelector('img');
    if (img.getAttribute('src') !== url) img.setAttribute('src', url);
    svg.style.visibility = 'hidden';
  };
  // Ridisegna disegni e immagini (dopo un caricamento o un cambio di paesaggio)
  const ricarica = () => document.querySelectorAll('svg.sc-scena').forEach((s) => {
    if (s.dataset.chiave === 'campagna') s.dataset.tipo = paesaggioDi(_campDi(s));
    s.dataset.fatta = ''; disegna(s);
  });

  // ── Segni del gioco ──
  const ruota = (k, n) => {
    k = Math.max(0, +k || 0); n = Math.max(1, +n || 1);
    let h = '<svg class="sc-ruota" viewBox="-52 -52 104 104" role="img" aria-label="' + k + ' su ' + n + '">';
    if (n === 1) return h + '<circle r="50"' + (k ? ' class="on"' : '') + '/></svg>';
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.2832 - 1.5708, b = (i + 1) / n * 6.2832 - 1.5708;
      h += '<path' + (i < k ? ' class="on"' : '') + ' d="M0 0L' + (50 * Math.cos(a)).toFixed(2) + ' ' + (50 * Math.sin(a)).toFixed(2) + 'A50 50 0 0 1 ' + (50 * Math.cos(b)).toFixed(2) + ' ' + (50 * Math.sin(b)).toFixed(2) + 'Z"/>';
    }
    return h + '</svg>';
  };
  const pallini = (k, n) => {
    let h = '<div class="sc-pallini" role="img" aria-label="' + k + ' su ' + n + '">';
    for (let i = 0; i < n; i++) h += '<i' + (i < k ? ' class="on"' : '') + '></i>';
    return h + '</div>';
  };

  // ── Cambiare lo sfondo: caricare un'immagine, scegliere il paesaggio, tornare al disegno ──
  const _icoImg = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>';
  const pulsante = (eroe, chiave) => {
    if (!eroe || eroe.querySelector(':scope > .sc-cambia')) return;
    eroe.insertAdjacentHTML('beforeend', '<button type="button" class="sc-cambia" aria-haspopup="dialog" onclick="Scena.apriSfondo(\'' + _attr(chiave) + '\', this)">' + _icoImg + '<span>Sfondo</span></button>');
  };
  const _nomeChiave = (chiave) => chiave === 'campagna' ? 'della campagna' : 'di questa pagina';
  const apriSfondo = (chiave, btn) => {
    const camp = App.getActiveCampaign && App.getActiveCampaign();
    if (!camp) return;
    chiudiSfondo();
    const sf = camp.sfondi || {}, ha = !!sf[chiave], scelto = camp.sfondoTipo || '';
    const box = document.createElement('div');
    box.id = 'sc-menu-sfondo'; box.className = 'sc-menu-sfondo'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Sfondo');
    box.innerHTML = '<h3>Sfondo ' + _nomeChiave(chiave) + '</h3>' +
      '<p>Carica un\'immagine larga: va bene anche in bianco e nero, il colore lo prende dalla tavolozza.</p>' +
      '<label class="btn btn-primary btn-sm sc-carica">Carica un\'immagine<input type="file" accept="image/*" hidden onchange="Scena._file(event,\'' + _attr(chiave) + '\')"></label>' +
      (ha ? '<button type="button" class="btn btn-ghost btn-sm" onclick="Scena._togli(\'' + _attr(chiave) + '\')">Togli l\'immagine</button>' : '') +
      (chiave === 'campagna' ? '<h4>Paesaggio disegnato</h4><div class="sc-paesaggi">' +
        [['', 'Dal nome']].concat(PAESAGGI.map(([k, n]) => [k, n])).map(([k, n]) => '<button type="button" aria-pressed="' + (k === scelto) + '" onclick="Scena._paesaggio(\'' + k + '\')">' + n + '</button>').join('') + '</div>' : '') +
      (typeof DriveBackup !== 'undefined' && DriveBackup.isConnected && !DriveBackup.isConnected() ? '<p class="sc-nota">Google Drive non è collegato: l\'immagine resta solo su questo dispositivo.</p>' : '');
    document.body.appendChild(box);
    const r = btn.getBoundingClientRect();
    box.style.top = (r.bottom + window.scrollY + 8) + 'px';
    box.style.left = Math.max(12, Math.min(window.innerWidth - box.offsetWidth - 12, r.right - box.offsetWidth)) + 'px';
    box.querySelector('button, label')?.focus?.();
    setTimeout(() => document.addEventListener('click', _fuori, true), 0);
  };
  const _fuori = (e) => { const b = document.getElementById('sc-menu-sfondo'); if (b && !b.contains(e.target) && !e.target.closest('.sc-cambia')) chiudiSfondo(); };
  const chiudiSfondo = () => { document.getElementById('sc-menu-sfondo')?.remove(); document.removeEventListener('click', _fuori, true); };
  const _salva = (modifica) => {
    const camp = App.getActiveCampaign();
    if (!camp) return;
    const sfondi = Object.assign({}, camp.sfondi || {});
    const dati = modifica(sfondi, camp);
    App.saveActiveCampaign(Object.assign({ sfondi }, dati || {}));
    chiudiSfondo();
    setTimeout(ricarica, 30);
  };
  // L'immagine si riduce (larghezza massima 1800px) e si porta in scala di grigi: pesa poco e prende i colori della tavolozza
  const _file = (e, chiave) => {
    const file = e.target && e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { if (typeof Toast !== 'undefined') Toast.show('Scegli un file immagine', 'warning'); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1800 / img.width), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const x = c.getContext('2d');
      x.filter = 'grayscale(1)';
      x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let dati = c.toDataURL('image/webp', 0.8);
      if (dati.indexOf('data:image/webp') !== 0) dati = c.toDataURL('image/jpeg', 0.82);
      _salva((sf) => { sf[chiave] = dati; });
      if (typeof Toast !== 'undefined') Toast.show('Sfondo aggiornato', 'success');
    };
    img.onerror = () => { URL.revokeObjectURL(url); if (typeof Toast !== 'undefined') Toast.show('Non riesco a leggere questa immagine', 'error'); };
    img.src = url;
  };
  const _togli = (chiave) => _salva((sf) => { delete sf[chiave]; });
  const _paesaggio = (k) => _salva(() => ({ sfondoTipo: k || '' }));

  // ── Icone delle scelte di Cartografo e Scrittoio: tratto 1.6, stesso stile delle icone dell'app ──
  const ICONE = {
    regno: '<path d="M3 20l5-9 4 6 3-4 6 7z"/><path d="M8 11V4l4 2-4 2"/>',
    citta: '<path d="M3 21V10l3-2 3 2v11"/><path d="M9 21V6l4-3 4 3v15"/><path d="M17 21v-8l2-1 2 1v8"/><path d="M2 21h20"/>',
    villaggio: '<path d="M3 21v-7l5-4 5 4v7"/><path d="M13 21v-5l4-3 4 3v5"/><path d="M7 21v-3h2v3"/><path d="M2 21h20"/>',
    caverna: '<path d="M2 20c1-8 5-13 10-13s9 5 10 13"/><path d="M8 20c0-4 2-7 4-7s4 3 4 7"/><path d="M2 20h20"/>',
    dungeon: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 12h6v8"/><path d="M14 4v6h6"/><path d="M14 16h2"/>',
    abitazione: '<path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
    stemma: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M12 8v8"/><path d="M8 12h8"/>',
    lettera: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 7l9 6 9-6"/>',
    taglia: '<rect x="4" y="3" width="16" height="18" rx="1"/><circle cx="12" cy="10" r="3"/><path d="M8 17h8"/>',
    editto: '<path d="M7 3h10v16l-5-3-5 3z"/><path d="M10 8h4"/><path d="M10 11h4"/>',
    avviso: '<path d="M12 2v3"/><rect x="4" y="5" width="16" height="15" rx="1"/><path d="M8 10h8"/><path d="M8 14h5"/>',
    tesoro: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M14 10l3 3"/><path d="M17 10l-3 3"/>',
    gazzetta: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M7 8h10"/><path d="M7 12h4"/><path d="M7 16h4"/><path d="M14 12h3v4h-3z"/>',
    contratto: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 18c1-1.5 2-1.5 3 0s2 1.5 3 0"/>',
    menu: '<path d="M7 3v8a2 2 0 0 0 4 0V3"/><path d="M9 11v10"/><path d="M16 3c-1.5 1-2 3-2 6s1 3 2 3v9"/>',
  };
  const icona = (k) => '<svg class="sc-icona" aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (ICONE[k] || '<rect x="4" y="4" width="16" height="16" rx="3"/>') + '</svg>';

  // ── Intestazione con scena per le pagine che hanno un .page-header o un titolo di sezione ──
  const _camp = () => (typeof App !== 'undefined' && App.getActiveCampaign ? App.getActiveCampaign() : null);
  const _intesta = () => {
    const pag = document.querySelector('#main-content .page.active');
    if (!pag || pag.id === 'page-campagna' || pag.id === 'page-home') { tutte(); return; }
    const nome = (_camp()?.name || 'Pocket GM Screen');
    // Wiki: l'intestazione e' il primo blocco dell'elenco visibile; le altre pagine hanno .page-header
    const teste = [...pag.querySelectorAll('.page-header, [id^="wiki-"][id$="-list"] > div:first-child, .sc-testa, .hub-testa-scena')].filter((t) => t.offsetParent !== null);
    teste.forEach((t) => {
      if (!t.classList.contains('sc-hero')) {
        t.classList.add('sc-hero', 'sc-basso');
        t.insertAdjacentHTML('afterbegin', svg(t.dataset.scSeme || (nome + ' · ' + pag.id), t.dataset.scTipo || (pag.id.indexOf('wiki') >= 0 ? 'colline' : 'auto'), t.dataset.scChiave || pag.id));
        pulsante(t, t.dataset.scChiave || pag.id);
      }
      // A tutta larghezza: l'intestazione esce dai margini interni della pagina
      t.style.marginLeft = t.style.marginRight = t.style.marginTop = '0px';
      const contenitore = t.closest('[id^="wiki-"][id$="-list"]') || pag;
      const rc = contenitore.getBoundingClientRect(), rt = t.getBoundingClientRect();
      if (rt.width > 0) {
        t.style.marginLeft = -(rt.left - rc.left) + 'px';
        t.style.marginRight = -(rc.right - rt.right) + 'px';
        t.style.marginTop = -Math.max(0, rt.top - rc.top + contenitore.scrollTop) + 'px';
      }
    });
    tutte();
  };
  // Disegnare cambia la pagina: mentre si lavora l'osservatore e' spento, o ripartirebbe da solo
  let _t = null, _oss = null;
  const _giro = () => { if (_oss) _oss.disconnect(); try { _intesta(); } finally { const m = document.getElementById('main-content'); if (_oss && m) _oss.observe(m, OPZ); } };
  const OPZ = { subtree: true, attributes: true, attributeFilter: ['class', 'style'], childList: true };
  // Le pagine entrano con una breve animazione: si rimisura anche a fine animazione, o i margini restano quelli di meta' strada
  let _t2 = null, _t3 = null;
  const aggiorna = () => { clearTimeout(_t); clearTimeout(_t2); clearTimeout(_t3); _t = setTimeout(_giro, 60); _t2 = setTimeout(_giro, 450); _t3 = setTimeout(_giro, 1100); };

  const avvia = () => {
    const main = document.getElementById('main-content');
    if (main) { _oss = new MutationObserver(aggiorna); _oss.observe(main, OPZ); }
    window.addEventListener('resize', aggiorna);
    aggiorna();
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiSfondo(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();

  return { disegna, tutte, svg, tipo, paesaggioDi, ruota, pallini, aggiorna, icona, ricarica, pulsante, apriSfondo, chiudiSfondo, _file, _togli, _paesaggio };
})();

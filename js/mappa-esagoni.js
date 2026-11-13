/*
 * Pocket GM Screen — Copyright (c) 2025-2026 Noemi Marcolini. Tutti i diritti riservati.
 *
 * Esagoni sulle mappe della campagna (pagina Mappe): una griglia che si accende e si
 * spegne per ogni mappa, e l'esplorazione esagono per esagono.
 *  - la griglia e' un <pattern> SVG sopra l'immagine (leggero anche con migliaia di esagoni);
 *  - toccando un esagono lo si segna come esplorato, ci si sposta il gruppo o ci si scrive una nota;
 *  - spostando il gruppo, il tempo di viaggio si calcola con le velocita' della pagina Mappe
 *    e, se si vuole, fa avanzare l'orologio del Calendario.
 * I dati stanno sulla mappa: mappa.esagoni = { attivi, km, colonne, punta, numeri, dx, dy,
 * esplorati: { "c,r": 1 }, note: { "c,r": "testo" }, gruppo: "c,r", ore, terreno }.
 * Il modulo non tocca lo stato di MappaUI: lo riceve da MappaUI._ctxEsagoni().
 */
const MappaEsagoni = (() => {
  const R3 = Math.sqrt(3);
  let _attivo = false;      // pannello aperto (i tocchi sulla mappa vanno agli esagoni)
  let _azione = 'esplora';  // esplora | gruppo | nota
  let _notaKey = null;

  const _esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _ctx = () => (typeof MappaUI !== 'undefined' && MappaUI._ctxEsagoni) ? MappaUI._ctxEsagoni() : null;

  const DEFAULT = { attivi: false, km: 10, colonne: 24, punta: false, numeri: false, dx: 0, dy: 0, ore: 0, terreno: 'pianura' };
  const _imp = (mappa) => ({ ...DEFAULT, ...(mappa && mappa.esagoni || {}), esplorati: { ...((mappa && mappa.esagoni && mappa.esagoni.esplorati) || {}) }, note: { ...((mappa && mappa.esagoni && mappa.esagoni.note) || {}) } });
  const _salva = (modifica) => {
    const c = _ctx(); if (!c || !c.mappa) return;
    c.aggiorna((m) => { const e = _imp(m); modifica(e); m.esagoni = e; return m; });
  };

  /* ── Geometria ──
     Tutti i calcoli si fanno con esagoni "piatti in alto" in un piano (u,v); per gli
     esagoni "a punta in alto" basta scambiare x e y (la griglia trasposta e' quella giusta).
     R = dal centro a un vertice, in pixel dell'immagine. Colonne sfasate: le dispari scendono di mezzo esagono. */
  const _geo = (e, w, h, scalaKm) => {
    const passo = scalaKm > 0 ? (e.km / scalaKm) * w : w / Math.max(4, e.colonne || 24); // da centro a centro
    const R = Math.max(4, passo / R3);
    const ou = (e.dx || 0) * 2 * R, ov = (e.dy || 0) * R3 * R;
    return { R, passo, ou, ov, punta: !!e.punta, w, h, kmEsagono: scalaKm > 0 ? e.km : 0 };
  };
  const _uv = (g, x, y) => g.punta ? [y, x] : [x, y];
  const _xy = (g, u, v) => g.punta ? [v, u] : [u, v];
  const _centro = (g, col, row) => {
    const u = g.ou + 1.5 * g.R * col;
    const v = g.ov + R3 * g.R * (row + ((col & 1) ? 0.5 : 0));
    return _xy(g, u, v);
  };
  const _daPunto = (g, x, y) => {
    let [u, v] = _uv(g, x, y); u -= g.ou; v -= g.ov;
    const q = (2 / 3 * u) / g.R, r = (-1 / 3 * u + R3 / 3 * v) / g.R, s = -q - r;
    let rq = Math.round(q), rr = Math.round(r); const rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
    return [rq, rr + (rq - (rq & 1)) / 2];
  };
  const _cubo = (col, row) => { const q = col, r = row - (col - (col & 1)) / 2; return [q, r, -q - r]; };
  const _distanza = (a, b) => { const A = _cubo(a[0], a[1]), B = _cubo(b[0], b[1]); return (Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2])) / 2; };
  const _vertici = (g, col, row) => {
    const [cx, cy] = _centro(g, col, row);
    const [cu, cv] = _uv(g, cx, cy);
    const pts = [];
    for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; pts.push(_xy(g, cu + g.R * Math.cos(a), cv + g.R * Math.sin(a))); }
    return pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  };
  const _key = (c, r) => c + ',' + r;
  const _parse = (k) => String(k).split(',').map(Number);
  const _nome = (c, r) => String(c + 1).padStart(2, '0') + String(r + 1).padStart(2, '0');

  /* ── Disegno ── */
  const disegna = () => {
    const svg = document.getElementById('mappa-esagoni');
    const c = _ctx();
    if (!svg) return;
    const mappa = c && c.mappa;
    const e = _imp(mappa);
    if (!mappa || !mappa.immagine || !e.attivi || !c.img || !c.img.naturalWidth) { svg.innerHTML = ''; return; }
    const w = c.img.naturalWidth, h = c.img.naturalHeight;
    const g = _geo(e, w, h, c.scalaKm);
    const s = 1 / (c.scale || 1);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

    // Tassello del pattern (piano u,v): un esagono intero piu' i due mezzi lati orizzontali
    const R = g.R, hh = R3 * R;
    const tu = [[2.5 * R, hh / 2], [2 * R, hh], [R, hh], [0.5 * R, hh / 2], [R, 0], [2 * R, 0]];
    const P = (u, v) => _xy(g, u, v).map(n => n.toFixed(2)).join(',');
    const d = 'M' + tu.map(p => P(p[0], p[1])).join('L') + 'Z M' + P(0, hh / 2) + 'L' + P(0.5 * R, hh / 2) + ' M' + P(2.5 * R, hh / 2) + 'L' + P(3 * R, hh / 2);
    const [pw, ph] = g.punta ? [hh, 3 * R] : [3 * R, hh];
    const [px, py] = _xy(g, g.ou, g.ov);
    let out = '<defs><pattern id="esa-pat" patternUnits="userSpaceOnUse" x="' + px.toFixed(2) + '" y="' + py.toFixed(2) + '" width="' + pw.toFixed(2) + '" height="' + ph.toFixed(2) + '">' +
      // Due tratti: chiaro sotto e scuro sopra, si legge su mappe chiare e scure
      '<path d="' + d + '" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="' + (2.6 * s).toFixed(2) + '"/>' +
      '<path d="' + d + '" fill="none" stroke="#1b1610" stroke-opacity="0.7" stroke-width="' + (1 * s).toFixed(2) + '"/>' +
      '</pattern></defs>';

    // Esagoni esplorati: una velatura calda leggera (i non esplorati restano come sono: niente nebbia)
    Object.keys(e.esplorati).forEach(k => {
      const [col, row] = _parse(k);
      out += '<polygon points="' + _vertici(g, col, row) + '" fill="#f2c14e" fill-opacity="0.32"/>';
    });
    out += '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="url(#esa-pat)"/>';

    // Numeri degli esagoni (solo se si leggono: almeno 34 px sullo schermo)
    if (e.numeri && g.R * 2 / s >= 34) {
      const c0 = _daPunto(g, 0, 0), c1 = _daPunto(g, w, h);
      const [a0, a1] = g.punta ? [Math.min(c0[0], c1[0]) - 1, Math.max(c0[0], c1[0]) + 1] : [Math.min(c0[0], c1[0]) - 1, Math.max(c0[0], c1[0]) + 1];
      const [b0, b1] = [Math.min(c0[1], c1[1]) - 1, Math.max(c0[1], c1[1]) + 1];
      const fs = Math.min(R * 0.36, 11 * s);
      let n = 0;
      for (let col = a0; col <= a1 && n < 6000; col++) for (let row = b0; row <= b1 && n < 6000; row++) {
        const [cx, cy] = _centro(g, col, row);
        if (cx < 0 || cy < 0 || cx > w || cy > h) continue;
        n++;
        out += '<text x="' + cx.toFixed(1) + '" y="' + (cy - R * 0.5).toFixed(1) + '" text-anchor="middle" font-size="' + fs.toFixed(1) + '" font-family="var(--font-mono, monospace)" fill="#1b1610" stroke="#fff" stroke-width="' + (2.5 * s).toFixed(2) + '" stroke-opacity="0.7" paint-order="stroke">' + _nome(col, row) + '</text>';
      }
    }

    // Note: un puntino nell'esagono
    Object.keys(e.note).forEach(k => {
      if (!e.note[k]) return;
      const [col, row] = _parse(k);
      const [cx, cy] = _centro(g, col, row);
      out += '<g><title>' + _esc(e.note[k]) + '</title><circle cx="' + (cx + R * 0.45).toFixed(1) + '" cy="' + (cy - R * 0.3).toFixed(1) + '" r="' + Math.max(R * 0.12, 4 * s).toFixed(1) + '" fill="#2d5a6b" stroke="#fff" stroke-width="' + (1.5 * s).toFixed(2) + '"/></g>';
    });

    // Il gruppo: bordo dorato spesso attorno all'esagono e un segnalino al centro
    if (e.gruppo) {
      const [col, row] = _parse(e.gruppo);
      const [cx, cy] = _centro(g, col, row);
      const pts = _vertici(g, col, row);
      out += '<polygon points="' + pts + '" fill="none" stroke="#000" stroke-opacity="0.6" stroke-width="' + (6 * s).toFixed(2) + '" stroke-linejoin="round"/>' +
        '<polygon points="' + pts + '" fill="none" stroke="#f2c14e" stroke-width="' + (3.5 * s).toFixed(2) + '" stroke-linejoin="round"/>';
      const rr = Math.max(Math.min(R * 0.32, 14 * s), 6 * s);
      out += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + rr.toFixed(1) + '" fill="#f2c14e" stroke="#1b1610" stroke-width="' + (2 * s).toFixed(2) + '"/>' +
        // tre teste stilizzate: il party
        [-1, 0, 1].map(i => '<circle cx="' + (cx + i * rr * 0.42).toFixed(1) + '" cy="' + (cy - rr * 0.12 + (i ? rr * 0.12 : 0)).toFixed(1) + '" r="' + (rr * 0.2).toFixed(1) + '" fill="#1b1610"/>').join('');
    }
    svg.innerHTML = out;
  };

  /* ── Tempi ── */
  const _orePerEsagono = (e, c) => {
    if (!c.scalaKm || !c.viaggio) return 0;
    const t = e.terreno || 'pianura';
    const mezzo = t === 'mare' ? c.viaggio.mare : c.viaggio.terra;
    const kmGiorno = c.VEL_BASE[mezzo][c.viaggio.ritmo] * (c.TERRENO_MULT[t] || 1);
    return e.km / kmGiorno * 8; // una giornata di viaggio = 8 ore
  };
  const _kmTondi = (km) => [0.5, 1, 1.5, 2, 3, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 150, 200].reduce((a, b) => Math.abs(b - km) < Math.abs(a - km) ? b : a);
  // Il totale in viaggio: oltre le 8 ore si conta in giornate di viaggio
  const _fmtViaggio = (ore) => {
    if (ore < 8) return _fmtOre(ore);
    const g = Math.floor(ore / 8 + 1e-6), resto = ore - g * 8;
    return g + (g === 1 ? ' giornata' : ' giornate') + (resto >= 1 / 60 ? ' e ' + _fmtOre(resto) : '');
  };
  const _fmtOre = (ore) => {
    if (ore < 1) return Math.max(1, Math.round(ore * 60)) + ' min';
    const h = Math.floor(ore), m = Math.round((ore - h) * 60);
    if (m === 60) return (h + 1) + ' h';
    return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : '');
  };

  /* ── Tocchi sulla mappa ── */
  const click = (fx, fy) => {
    const c = _ctx(); if (!c || !c.mappa || !c.img) return false;
    const e = _imp(c.mappa);
    if (!e.attivi) return false;
    const g = _geo(e, c.img.naturalWidth, c.img.naturalHeight, c.scalaKm);
    const [col, row] = _daPunto(g, fx * g.w, fy * g.h);
    const k = _key(col, row);
    if (_azione === 'nota') { _apriNota(k, col, row, e.note[k] || ''); return true; }
    if (_azione === 'gruppo') {
      const da = e.gruppo ? _parse(e.gruppo) : null;
      const passi = da ? _distanza(da, [col, row]) : 0;
      const ore = passi * _orePerEsagono(e, c);
      _salva((x) => { x.gruppo = k; x.esplorati[k] = 1; x.ore = (x.ore || 0) + ore; });
      if (passi && ore && document.getElementById('esa-orologio')?.checked && typeof Calendario !== 'undefined') {
        let cal = Calendario.get();
        if (cal) {
          cal = Calendario.advance(cal, 'minuti', Math.round(ore * 60));
          Calendario.save(cal);
          try { if (typeof Schermo !== 'undefined' && Schermo._refreshTempo) Schermo._refreshTempo(); } catch (er) {}
          Toast.show(passi + (passi === 1 ? ' esagono' : ' esagoni') + ', ' + _fmtOre(ore) + ' di viaggio · ' + Calendario.getDateStr(cal) + ' ' + Calendario.getTimeStr(cal), 'info', 2600);
        }
      } else if (passi && ore) {
        Toast.show(passi + (passi === 1 ? ' esagono' : ' esagoni') + ', ' + _fmtOre(ore) + ' di viaggio', 'info', 2200);
      }
    } else {
      _salva((x) => { if (x.esplorati[k]) delete x.esplorati[k]; else x.esplorati[k] = 1; });
    }
    aggiorna();
    return true;
  };

  /* ── Note ── */
  const _apriNota = (k, col, row, testo) => {
    _notaKey = k;
    if (!document.getElementById('modal-esa-nota')) {
      const m = document.createElement('div');
      m.className = 'modal-overlay hidden'; m.id = 'modal-esa-nota'; m.style.display = 'none';
      m.onclick = (ev) => { if (ev.target === m) Modal.close('esa-nota'); };
      m.innerHTML =
        '<div class="modal" style="max-width:420px;">' +
          '<div class="modal-header"><h3 class="modal-title" id="esa-nota-titolo">Nota</h3>' +
            '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'esa-nota\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
          '<div class="modal-body"><textarea id="esa-nota-testo" class="form-textarea" rows="4" placeholder="Cosa c\'è in questo esagono? Un incontro, una rovina, un indizio…"></textarea>' +
            '<p class="text-muted" style="font-size:0.75rem;margin:8px 0 0;">Le note le vedi solo tu: sulla mappa resta un puntino, passandoci sopra si legge.</p></div>' +
          '<div class="modal-footer" style="display:flex;gap:8px;">' +
            '<button class="btn btn-ghost" onclick="MappaEsagoni._salvaNota(true)">Cancella</button>' +
            '<button class="btn btn-primary" style="flex:1;" onclick="MappaEsagoni._salvaNota()">Salva</button></div>' +
        '</div>';
      document.body.appendChild(m);
    }
    document.getElementById('esa-nota-titolo').textContent = 'Esagono ' + _nome(col, row);
    document.getElementById('esa-nota-testo').value = testo;
    Modal.open('esa-nota');
    setTimeout(() => document.getElementById('esa-nota-testo')?.focus(), 50);
  };
  const _salvaNota = (cancella) => {
    const t = cancella ? '' : (document.getElementById('esa-nota-testo')?.value || '').trim();
    const k = _notaKey;
    _salva((x) => { if (t) x.note[k] = t; else delete x.note[k]; });
    Modal.close('esa-nota');
    aggiorna();
  };

  /* ── Pannello ── */
  const apri = () => {
    const c = _ctx(); if (!c) return;
    if (!c.mappa || !c.mappa.immagine) { Toast.show('Prima carica o genera una mappa', 'warning'); return; }
    if (_attivo) { chiudi(); return; }
    _attivo = true;
    if (c.fermaPercorso) c.fermaPercorso();
    // Aprendo il pannello la griglia si accende (si puo' rispegnere da li')
    // La prima volta l'esagono si sceglie in base alla mappa: circa 30 esagoni in larghezza, con un numero tondo di km
    const prima = !(c.mappa.esagoni && c.mappa.esagoni.km);
    if (!_imp(c.mappa).attivi || prima) _salva((x) => { x.attivi = true; if (prima && c.scalaKm) x.km = _kmTondi(c.scalaKm / 30); });
    aggiorna();
  };
  const chiudi = () => { _attivo = false; aggiorna(); };
  const attivo = () => _attivo && !!(_imp((_ctx() || {}).mappa).attivi);

  const _seg = (val, label) => '<button type="button" class="btn btn-sm ' + (_azione === val ? 'btn-primary' : 'btn-ghost') + '" aria-pressed="' + (_azione === val) + '" onclick="MappaEsagoni.azione(\'' + val + '\')">' + label + '</button>';

  const aggiorna = () => {
    disegna();
    const p = document.getElementById('mappa-esagoni-pannello');
    if (!p) return;
    const c = _ctx();
    if (!_attivo || !c || !c.mappa) { p.style.display = 'none'; p.innerHTML = ''; return; }
    const e = _imp(c.mappa);
    const ore = _orePerEsagono(e, c);
    const nEspl = Object.keys(e.esplorati).length;
    const haCal = typeof Calendario !== 'undefined' && !!Calendario.get();
    const terreni = Object.keys(c.TERRENO_LABEL).map(k => '<option value="' + k + '"' + (k === e.terreno ? ' selected' : '') + '>' + c.TERRENO_LABEL[k] + '</option>').join('');
    p.style.display = 'block';
    p.innerHTML =
      '<div class="esa-riga">' +
        '<label class="esa-check"><input type="checkbox"' + (e.attivi ? ' checked' : '') + ' onchange="MappaEsagoni.imposta(\'attivi\',this.checked)"> <strong>Esagoni</strong></label>' +
        (e.attivi
          ? '<span class="esa-gruppo-seg" role="group" aria-label="Toccando un esagono">' + _seg('esplora', 'Segna esplorato') + _seg('gruppo', 'Sposta il gruppo') + _seg('nota', 'Nota') + '</span>'
          : '<span class="text-muted" style="font-size:0.8rem;">Griglia spenta su questa mappa</span>') +
        '<button type="button" class="btn btn-secondary btn-sm" style="margin-left:auto;" onclick="MappaEsagoni.chiudi()">Fine</button>' +
      '</div>' +
      (e.attivi ?
        (_azione === 'gruppo'
          ? '<div class="esa-riga esa-info">' +
              (c.scalaKm
                ? '<span>Un esagono: <strong>' + e.km.toLocaleString('it-IT') + ' km</strong>, ' + (c.viaggio && (e.terreno === 'mare' ? c.MEZZO_LABEL[c.viaggio.mare] : c.MEZZO_LABEL[c.viaggio.terra])).toLowerCase() + ' su</span>' +
                  '<select class="form-select esa-sel" aria-label="Terreno" onchange="MappaEsagoni.imposta(\'terreno\',this.value)">' + terreni + '</select>' +
                  '<span><strong>' + _fmtOre(ore) + '</strong> a esagono</span>' +
                  '<span class="text-muted">· in viaggio: <strong style="color:var(--text-primary);">' + _fmtViaggio(e.ore || 0) + '</strong></span>' +
                  ((e.ore || 0) ? '<button type="button" class="btn btn-ghost btn-sm" onclick="MappaEsagoni.imposta(\'ore\',0)">Azzera</button>' : '') +
                  (haCal ? '<label class="esa-check"><input type="checkbox" id="esa-orologio" checked> fa avanzare il Calendario</label>' : '')
                : '<span class="text-muted">Per i tempi di viaggio scrivi quanti km è larga la mappa in <em>Modifica mappa</em>.</span>') +
            '</div>'
          : '<div class="esa-riga esa-info text-muted">' +
              (_azione === 'nota' ? 'Tocca un esagono per scriverci una nota.' : 'Tocca un esagono per segnarlo come esplorato (ritocca per togliere).') +
              ' Esplorati: <strong style="color:var(--text-primary);">' + nEspl + '</strong>' +
            '</div>') +
        '<details class="esa-griglia"' + (_aperto ? ' open' : '') + ' ontoggle="MappaEsagoni._dettagli(this.open)"><summary>Griglia</summary><div class="esa-riga">' +
          (c.scalaKm
            ? '<label class="esa-campo">Lato a lato <input type="number" class="form-input esa-num" min="0.1" step="0.5" value="' + e.km + '" onchange="MappaEsagoni.imposta(\'km\',this.value)"> km</label>'
            : '<label class="esa-campo">Esagoni in larghezza <input type="number" class="form-input esa-num" min="4" max="200" step="1" value="' + e.colonne + '" onchange="MappaEsagoni.imposta(\'colonne\',this.value)"></label>') +
          '<label class="esa-campo">Orientamento <select class="form-select esa-sel" onchange="MappaEsagoni.imposta(\'punta\',this.value===\'1\')"><option value="0"' + (e.punta ? '' : ' selected') + '>Lato in alto</option><option value="1"' + (e.punta ? ' selected' : '') + '>Punta in alto</option></select></label>' +
          '<label class="esa-check"><input type="checkbox"' + (e.numeri ? ' checked' : '') + ' onchange="MappaEsagoni.imposta(\'numeri\',this.checked)"> Numeri</label>' +
          '<span class="esa-campo" role="group" aria-label="Sposta la griglia">Sposta' +
            '<button type="button" class="btn btn-ghost btn-icon-sm" title="A sinistra" aria-label="Sposta a sinistra" onclick="MappaEsagoni.sposta(-1,0)">←</button>' +
            '<button type="button" class="btn btn-ghost btn-icon-sm" title="In alto" aria-label="Sposta in alto" onclick="MappaEsagoni.sposta(0,-1)">↑</button>' +
            '<button type="button" class="btn btn-ghost btn-icon-sm" title="In basso" aria-label="Sposta in basso" onclick="MappaEsagoni.sposta(0,1)">↓</button>' +
            '<button type="button" class="btn btn-ghost btn-icon-sm" title="A destra" aria-label="Sposta a destra" onclick="MappaEsagoni.sposta(1,0)">→</button>' +
          '</span>' +
          (nEspl || e.gruppo ? '<button type="button" class="btn btn-ghost btn-sm" onclick="MappaEsagoni.azzera()">Azzera esplorazione</button>' : '') +
        '</div></details>'
      : '');
  };
  let _aperto = false;
  const _dettagli = (open) => { _aperto = open; };

  const azione = (a) => { _azione = a; aggiorna(); };
  const imposta = (chiave, val) => {
    _salva((x) => {
      if (chiave === 'km') { const n = parseFloat(String(val).replace(',', '.')); if (n > 0) x.km = Math.min(1000, n); }
      else if (chiave === 'colonne') { const n = parseInt(val, 10); if (n >= 4) x.colonne = Math.min(200, n); }
      else x[chiave] = val;
    });
    aggiorna();
  };
  // Un passo = un decimo di esagono, per allineare la griglia a quella disegnata sulla mappa
  const sposta = (ix, iy) => {
    _salva((x) => {
      const [a, b] = x.punta ? [iy, ix] : [ix, iy];
      x.dx = Math.round(((x.dx || 0) + a * 0.05) * 100) / 100;
      x.dy = Math.round(((x.dy || 0) + b * 0.1) * 100) / 100;
    });
    aggiorna();
  };
  const azzera = () => {
    _salva((x) => { x.esplorati = {}; x.gruppo = null; x.ore = 0; });
    aggiorna();
    Toast.show('Esplorazione azzerata (le note restano)', 'info', 2000);
  };

  // Cambiando mappa il pannello si chiude
  const cambioMappa = () => { _attivo = false; aggiorna(); };

  return { disegna, aggiorna, click, attivo, apri, chiudi, azione, imposta, sposta, azzera, cambioMappa, _salvaNota, _dettagli,
    _test: { _geo, _daPunto, _centro, _distanza } };
})();

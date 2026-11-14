/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   CARTOGRAFO-RITOCCHI.JS — Ritocchi a una mappa gia' generata:
   rinominare o nascondere i nomi scritti sulla mappa e aggiungere
   scritte proprie, messe con un tocco sulla mappa.

   I ritocchi stanno con la mappa a cui appartengono (stesso tipo e
   stesso seme): a.ritocchi = { seme, nomi: { originale: nuovo },
   scritte: [{ x, y, t, stile }] }. Ogni volta che la mappa si
   ridisegna (cambio di colori o di opzioni) si riapplicano; con una
   mappa nuova spariscono. Un nome vuoto vuol dire "nascosto".
   I segnaposto della mappa seguono i nomi nuovi, e ogni scritta
   aggiunta diventa anche un segnaposto quando la mappa va nelle Mappe.
   ============================================================ */

const CartoRitocchi = (() => {
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _unesc = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const $ = (id) => document.getElementById(id);
  const STILI = { nome: 'Nome di luogo', corsivo: 'Corsivo (acque, boschi)', piccola: 'Piccola nota' };
  // Scritte che non sono nomi: scala, punti cardinali, numeri
  const _nonNome = (t) => t.length < 2 || !/[A-Za-zÀ-ÿ]/.test(t) || /^(metri|km|miglia|N|S|E|O|W)$/i.test(t);
  let _posa = null;      // scritta in attesa di essere posata con un tocco
  let _ctx = null;       // { stato, rigenera, coordinate }

  const _ritocchi = (a) => (a && a.ritocchi && a.ritocchi.seme === a.seme ? a.ritocchi : null);

  // Tutte le scritte della mappa, nell'ordine in cui compaiono
  const nomiDi = (svg) => {
    const visti = new Set(), lista = [];
    String(svg).replace(/<(text|textPath)\b[^>]*>([^<]*)<\/\1>/g, (_, t, dentro) => {
      const n = _unesc(dentro).trim();
      if (!_nonNome(n) && !visti.has(n)) { visti.add(n); lista.push(n); }
      return '';
    });
    return lista;
  };

  // Chiamata dal Cartografo subito dopo aver generato la mappa
  const applica = (m, a) => {
    m.nomiOriginali = nomiDi(m.svg);
    const r = _ritocchi(a);
    if (!r) return m;
    const nomi = r.nomi || {};
    Object.keys(nomi).forEach((orig) => {
      const nuovo = nomi[orig];
      if (nuovo === orig) return;
      const e = _esc(orig), n = _esc(nuovo);
      m.svg = m.svg.split('>' + e + '</text>').join('>' + n + '</text>').split('>' + e + '</textPath>').join('>' + n + '</textPath>');
      // Nei segnaposto il nome puo' avere maiuscole diverse (sulla mappa i rioni sono in maiuscolo)
      const re = new RegExp(orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      m.pin = (m.pin || []).filter((p) => nuovo || (p.label || '').toLowerCase() !== orig.toLowerCase())
        .map((p) => (nuovo && p.label && re.test(p.label) ? { ...p, label: p.label.replace(re, nuovo) } : p));
      if (m.nome === orig && nuovo) m.nome = nuovo;
    });
    const scritte = (r.scritte || []).filter((s) => s && s.t);
    if (scritte.length) {
      const notte = (a.opzioni || {}).palette === 'notte';
      const ink = notte ? '#efe6cf' : '#2b2118', alone = notte ? '#0b1820' : '#f3ecd9';
      const st = { nome: { size: 20, peso: 700, corsivo: false, spazio: 1 }, corsivo: { size: 17, peso: 500, corsivo: true, spazio: 1.5 }, piccola: { size: 13, peso: 500, corsivo: false, spazio: 0 } };
      const testi = scritte.map((s) => {
        const o = st[s.stile] || st.nome;
        return `<text x="${(+s.x).toFixed(1)}" y="${(+s.y).toFixed(1)}" font-family="${CartoMotore.FONT_TESTO}" font-size="${o.size}" font-weight="${o.peso}"${o.corsivo ? ' font-style="italic"' : ''}${o.spazio ? ` letter-spacing="${o.spazio}"` : ''} text-anchor="middle" fill="${ink}" stroke="${alone}" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${_esc(s.t)}</text>`;
      }).join('');
      m.svg = m.svg.replace(/<\/svg>\s*$/, '<g class="carto-ritocchi">' + testi + '</g></svg>');
      m.pin = (m.pin || []).concat(scritte.filter((s) => s.stile !== 'piccola').map((s) => ({ x: +s.x, y: +s.y - 10, label: s.t, note: '', sottotipo: '' })));
    }
    return m;
  };

  /* ── Finestra dei ritocchi ── */
  const _modale = () => {
    if ($('modal-carto-ritocchi')) return;
    const m = document.createElement('div');
    m.className = 'modal-overlay hidden'; m.id = 'modal-carto-ritocchi'; m.style.display = 'none';
    m.onclick = (e) => { if (e.target === m) Modal.close('carto-ritocchi'); };
    m.innerHTML = '<div class="modal" style="max-width:560px;"><div class="modal-header"><h3 class="modal-title">Ritocca la mappa</h3>' +
      '<button type="button" class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'carto-ritocchi\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="modal-body" id="carto-rit-corpo"></div>' +
      '<div class="modal-footer" style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap;">' +
        '<button type="button" class="btn btn-ghost" onclick="CartoRitocchi.annullaTutto()">Togli i ritocchi</button>' +
        '<button type="button" class="btn btn-primary" onclick="CartoRitocchi.salva()">Applica</button></div></div>';
    document.body.appendChild(m);
  };

  const apri = (ctx) => {
    _ctx = ctx;
    const { a, mappa } = ctx.stato();
    if (!mappa) return;
    _modale();
    const r = _ritocchi(a) || { nomi: {}, scritte: [] };
    const nomi = mappa.nomiOriginali || [];
    const righe = nomi.map((n, i) => {
      const val = n in (r.nomi || {}) ? r.nomi[n] : n, nascosto = val === '';
      return '<div class="carto-rit-riga" data-orig="' + _esc(n) + '">' +
        '<input type="text" class="form-input carto-rit-nome" aria-label="Nuovo nome per ' + _esc(n) + '" value="' + _esc(nascosto ? n : val) + '"' + (nascosto ? ' disabled' : '') + '>' +
        '<label class="carto-rit-nascondi"><input type="checkbox"' + (nascosto ? ' checked' : '') + ' onchange="this.closest(\'.carto-rit-riga\').querySelector(\'.carto-rit-nome\').disabled=this.checked"><span>Nascondi</span></label></div>';
    }).join('');
    const scritte = (r.scritte || []).map((s, i) => '<div class="carto-rit-riga carto-rit-scritta" data-x="' + s.x + '" data-y="' + s.y + '">' +
      '<input type="text" class="form-input carto-rit-testo" value="' + _esc(s.t) + '" aria-label="Testo della scritta">' +
      '<select class="form-select carto-rit-stile" aria-label="Stile">' + Object.entries(STILI).map(([k, l]) => '<option value="' + k + '"' + (k === s.stile ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' +
      '<button type="button" class="btn btn-ghost btn-sm" onclick="this.closest(\'.carto-rit-riga\').remove()">Togli</button></div>').join('');
    $('carto-rit-corpo').innerHTML =
      '<div class="form-label">Nomi sulla mappa</div>' +
      '<p class="text-muted" style="font-size:0.78rem;margin:0 0 8px;">Cambia un nome scrivendoci sopra, oppure nascondilo. I segnaposto della mappa prendono i nomi nuovi.</p>' +
      '<div class="carto-rit-lista">' + (righe || '<div class="text-muted" style="font-size:0.85rem;">Questa mappa non ha nomi scritti.</div>') + '</div>' +
      '<div class="form-label" style="margin-top:16px;">Scritte tue</div>' +
      '<div id="carto-rit-scritte">' + scritte + '</div>' +
      '<div class="carto-rit-nuova">' +
        '<input type="text" id="carto-rit-nuovo" class="form-input" placeholder="es. Torre del Mago, Qui i goblin" autocomplete="off">' +
        '<select id="carto-rit-nuovo-stile" class="form-select" aria-label="Stile della scritta">' + Object.entries(STILI).map(([k, l]) => '<option value="' + k + '">' + l + '</option>').join('') + '</select>' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="CartoRitocchi.posa()">Mettila sulla mappa</button>' +
      '</div>' +
      '<p class="text-muted" style="font-size:0.75rem;margin:6px 0 0;">Dopo “Mettila sulla mappa” tocca il punto della mappa dove vuoi la scritta. Diventa anche un segnaposto quando metti la mappa nelle Mappe.</p>';
    Modal.open('carto-ritocchi');
  };

  // Legge la finestra e salva i ritocchi nella mappa attuale
  const _leggi = () => {
    const nomi = {};
    document.querySelectorAll('#carto-rit-corpo .carto-rit-riga[data-orig]').forEach((r) => {
      const orig = _unesc(r.dataset.orig), nasc = r.querySelector('input[type="checkbox"]').checked;
      const val = r.querySelector('.carto-rit-nome').value.trim();
      if (nasc) nomi[orig] = ''; else if (val && val !== orig) nomi[orig] = val;
    });
    const scritte = [...document.querySelectorAll('#carto-rit-scritte .carto-rit-scritta')].map((r) => ({
      x: +r.dataset.x, y: +r.dataset.y, t: r.querySelector('.carto-rit-testo').value.trim(), stile: r.querySelector('.carto-rit-stile').value,
    })).filter((s) => s.t);
    return { nomi, scritte };
  };
  const _metti = (dati) => {
    const { a } = _ctx.stato();
    a.ritocchi = { seme: a.seme, ...dati };
    _ctx.salvaStato();
    _ctx.rigenera();
  };
  const salva = () => { if (!_ctx) return; _metti(_leggi()); Modal.close('carto-ritocchi'); Toast.show('Ritocchi applicati', 'success', 1600); };
  const annullaTutto = () => { if (!_ctx) return; _metti({ nomi: {}, scritte: [] }); Modal.close('carto-ritocchi'); Toast.show('Mappa com’era', 'info', 1600); };

  // Si chiude la finestra, si aspetta un tocco sulla mappa, poi la si riapre con la scritta nuova
  const posa = () => {
    const t = ($('carto-rit-nuovo')?.value || '').trim();
    if (!t) { Toast.show('Scrivi prima il testo', 'warning'); $('carto-rit-nuovo')?.focus(); return; }
    _posa = { t, stile: $('carto-rit-nuovo-stile').value, dati: _leggi() };
    Modal.close('carto-ritocchi');
    const st = $('carto-stage');
    if (st) st.classList.add('carto-posa');
    Toast.show('Tocca la mappa dove vuoi “' + t + '”', 'info', 4000);
  };
  // Il Cartografo passa ogni tocco breve sull'anteprima, gia' in coordinate della mappa
  const tocco = (x, y) => {
    if (!_posa || !_ctx) return false;
    const p = _posa;
    _posa = null;
    $('carto-stage')?.classList.remove('carto-posa');
    p.dati.scritte.push({ x: Math.round(x), y: Math.round(y), t: p.t, stile: p.stile });
    _metti(p.dati);
    Toast.show('Scritta messa. Per spostarla, toglila e rimettila.', 'success', 2600);
    return true;
  };
  const inAttesa = () => !!_posa;

  return { applica, apri, salva, annullaTutto, posa, tocco, inAttesa, nomiDi };
})();

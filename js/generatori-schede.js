/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   GENERATORI-SCHEDE.JS — Barra di schede e ricerca sopra la griglia
   dei Generatori: con tutte le aggiunte la pagina era diventata una
   lista lunghissima. Si vede una categoria alla volta (o "Tutti"),
   e la ricerca trova un generatore per nome in tutte le categorie.
   Le categorie si ricavano dalle intestazioni gia' presenti nella
   griglia (anche quelle aggiunte da altri moduli), in base alla
   posizione: un generatore spostato con le frecce cambia categoria
   insieme alla sua posizione.
   ============================================================ */

const GeneratoriSchede = (() => {
  const KEY = 'dm_gen_scheda';
  let _scheda = null;
  let _cerca = '';

  const _griglia = () => document.querySelector('#page-generatori .generatori-grid');
  const _eIntestazione = (el) => !el.classList.contains('gen-card') && /grid-column:\s*1\s*\/\s*-1/.test(el.getAttribute('style') || '');
  // Le intestazioni storiche hanno un'emoji davanti: nella barra resta solo il testo
  const _pulisci = (t) => t.replace(/[^\p{L}\p{N}&,'’ ]+/gu, ' ').replace(/\s+/g, ' ').trim();
  const _visibile = (c) => c.style.display !== 'none';
  const _titolo = (c) => (c.querySelector('.card-title')?.textContent || '').trim();

  const _sezioni = () => {
    const g = _griglia();
    if (!g) return [];
    const out = [];
    let cur = null;
    [...g.children].forEach(el => {
      if (_eIntestazione(el)) {
        const nome = _pulisci(el.textContent);
        cur = { id: nome.toLowerCase(), nome, testata: el, card: [] };
        out.push(cur);
      } else if (el.classList.contains('gen-card')) {
        // Card prima di qualunque intestazione (es. "Le mie tabelle"): scheda col suo nome
        if (!cur) { const n = _titolo(el) || 'Altro'; out.push({ id: n.toLowerCase(), nome: n, testata: null, card: [el] }); }
        else cur.card.push(el);
      }
    });
    return out.filter(s => s.card.length);
  };
  // Nomi delle categorie, per il campo "Categoria" delle tabelle personali
  const categorie = () => _sezioni().filter(s => s.testata).map(s => s.nome);

  // "Le mie tabelle" (js/tabelle-casuali.js) sta sopra la griglia: e' una scheda a se',
  // e ogni tabella con una categoria compare anche nella scheda di quella categoria
  const TC = 'le mie tabelle';
  const _tabelle = () => (typeof TabelleCasuali !== 'undefined' && TabelleCasuali.filtrate) ? TabelleCasuali.filtrate({}) : [];

  const _assicuraBarra = () => {
    let barra = document.getElementById('gen-schede');
    if (barra) return barra;
    const g = _griglia();
    if (!g) return null;
    barra = document.createElement('div');
    barra.id = 'gen-schede';
    barra.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:var(--space-md);';
    barra.innerHTML =
      '<div id="gen-schede-tab" role="tablist" aria-label="Categorie di generatori" style="display:flex;flex-wrap:wrap;gap:6px;flex:1 1 auto;min-width:0;"></div>' +
      '<input id="gen-schede-cerca" type="search" class="form-input" placeholder="Cerca un generatore o una tabella…" aria-label="Cerca un generatore o una tabella" autocomplete="off" style="flex:0 1 240px;min-width:160px;font-size:0.85rem;padding:6px 10px;">';
    const tc = document.getElementById('tc-card');
    g.parentNode.insertBefore(barra, tc && tc.parentNode === g.parentNode ? tc : g);
    barra.querySelector('#gen-schede-cerca').addEventListener('input', (e) => { _cerca = e.target.value.trim().toLowerCase(); applica(); });
    return barra;
  };

  const scegli = (id) => {
    _scheda = id;
    try { localStorage.setItem(KEY, id); } catch (e) {}
    const c = document.getElementById('gen-schede-cerca');
    if (c && c.value) { c.value = ''; _cerca = ''; }
    applica();
  };

  const applica = () => {
    const barra = _assicuraBarra();
    if (!barra) return;
    const sezioni = _sezioni();
    if (_scheda === null) { try { _scheda = localStorage.getItem(KEY); } catch (e) {} }
    const tc = document.getElementById('tc-card');
    const tcOn = !!tc && _visibile(tc); // "Personalizza" puo' nasconderla
    const tabelle = tcOn ? _tabelle() : [];
    const nTab = (cat) => tabelle.filter(t => t.categoria === cat).length;
    const schede = [];
    if (tcOn) schede.push({ id: TC, nome: 'Le mie tabelle', n: tabelle.length });
    sezioni.forEach(s => { const n = s.card.filter(_visibile).length + nTab(s.nome); if (n) schede.push({ id: s.id, nome: s.nome, n }); });
    if (_scheda !== 'tutti' && !schede.some(x => x.id === _scheda)) _scheda = schede[0]?.id || 'tutti';

    const tab = barra.querySelector('#gen-schede-tab');
    const bottone = (id, nome, n) => '<button type="button" role="tab" aria-selected="' + (id === _scheda && !_cerca) + '" class="btn btn-sm ' + (id === _scheda && !_cerca ? 'btn-primary' : 'btn-ghost') + '" data-scheda="' + id.replace(/"/g, '&quot;') + '">' +
      nome.replace(/</g, '&lt;') + (n != null ? ' <span style="opacity:0.65;font-size:0.85em;">' + n + '</span>' : '') + '</button>';
    tab.innerHTML = bottone('tutti', 'Tutti', null) + schede.map(x => bottone(x.id, x.nome, x.n)).join('');
    tab.querySelectorAll('[data-scheda]').forEach(b => { b.onclick = () => scegli(b.dataset.scheda); });
    // Solo in orizzontale (scrollIntoView sposterebbe anche la pagina)
    const attiva = tab.querySelector('[aria-selected="true"]');
    if (attiva && tab.scrollWidth > tab.clientWidth) tab.scrollLeft = Math.max(0, attiva.offsetLeft - tab.offsetLeft - 12);

    // Mostra/nasconde con una classe propria, senza toccare style.display che usa "Personalizza"
    sezioni.forEach(s => {
      const inScheda = _cerca ? true : (_scheda === 'tutti' || s.id === _scheda);
      let qualcuna = false;
      s.card.forEach(c => {
        const ok = inScheda && (!_cerca || _titolo(c).toLowerCase().includes(_cerca));
        c.classList.toggle('gen-fuori-scheda', !ok);
        if (ok && _visibile(c)) qualcuna = true;
      });
      if (s.testata) s.testata.classList.toggle('gen-fuori-scheda', !qualcuna || (!_cerca && _scheda !== 'tutti'));
    });

    if (tc) {
      let filtro = null, mostra = true;
      if (_cerca) { filtro = { cerca: _cerca }; mostra = tabelle.some(t => (t.nome || '').toLowerCase().includes(_cerca)); }
      else if (_scheda !== 'tutti' && _scheda !== TC) { const sez = sezioni.find(x => x.id === _scheda); filtro = { categoria: sez?.nome || '' }; mostra = nTab(sez?.nome) > 0; }
      if (typeof TabelleCasuali !== 'undefined' && TabelleCasuali.filtra) TabelleCasuali.filtra(filtro);
      tc.classList.toggle('gen-fuori-scheda', !mostra);
    }

    let vuoto = document.getElementById('gen-schede-vuoto');
    const nessuna = _cerca && !(tc && tcOn && !tc.classList.contains('gen-fuori-scheda')) && !sezioni.some(s => s.card.some(c => _visibile(c) && !c.classList.contains('gen-fuori-scheda')));
    if (nessuna && !vuoto) {
      vuoto = document.createElement('div');
      vuoto.id = 'gen-schede-vuoto';
      vuoto.style.cssText = 'color:var(--text-muted);font-size:0.9rem;padding:12px 2px;';
      _griglia().parentNode.insertBefore(vuoto, _griglia());
    }
    if (vuoto) { vuoto.style.display = nessuna ? '' : 'none'; vuoto.textContent = 'Nessun generatore o tabella con questo nome. I generatori nascosti si riattivano da Personalizza.'; }
  };

  const _aggancia = () => {
    const st = document.createElement('style');
    st.textContent = '#page-generatori .gen-fuori-scheda { display:none !important; }' +
      // Telefono: le schede su una riga sola che scorre di lato, invece di quattro righe
      '@media (max-width: 768px) { #gen-schede-tab { flex-wrap:nowrap !important; overflow-x:auto; max-width:calc(100vw - 32px); padding-bottom:4px; scrollbar-width:thin; } #gen-schede-tab > .btn { flex-shrink:0; } #gen-schede-cerca { flex:1 1 100% !important; } }';
    document.head.appendChild(st);
    if (typeof App !== 'undefined') {
      const nav = App.navigateTo;
      App.navigateTo = function (pageId) { const r = nav.apply(App, arguments); if (pageId === 'generatori') setTimeout(applica, 120); return r; };
    }
    // Personalizza (mostra/nascondi) e frecce di spostamento cambiano conteggi e categorie
    if (typeof Generatori !== 'undefined' && Generatori.applyVisibility) {
      const av = Generatori.applyVisibility;
      Generatori.applyVisibility = function () { const r = av.apply(Generatori, arguments); setTimeout(applica, 0); return r; };
    }
    if (typeof GeneratoriDD !== 'undefined' && GeneratoriDD.move) {
      const mv = GeneratoriDD.move;
      GeneratoriDD.move = function () { const r = mv.apply(GeneratoriDD, arguments); applica(); return r; };
    }
    // Altri moduli aggiungono card e sezioni dopo l'avvio
    setTimeout(applica, 600);
    setTimeout(applica, 2000);
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(_aggancia, 300));

  return { applica, scegli, categorie };
})();

/* ============================================================
   DASHBOARD-NUOVA.JS — Impaginazione della Panoramica (nuova grafica).
   Non disegna i contenuti: le card restano dei loro moduli (sessioni,
   scadenze, segreti, Sessione Zero...). Qui si decide solo dove stanno:
   a sinistra cio' che serve per giocare, a destra cio' che si consulta,
   e le card vuote si riducono a una riga sola invece di occupare un box
   ciascuna. In "La mia dashboard" non tocca nulla: li' l'ordine lo
   sceglie il master (js/dashboard-mia.js).
   ============================================================ */

const DashboardNuova = (() => {
  const $ = (id) => document.getElementById(id);
  const _griglia = () => document.querySelector('#page-campagna .dash-grid');
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _vistaMia = () => { try { return localStorage.getItem('dm_dash_vista_' + (_camp()?.id || '')) === 'mia'; } catch (e) { return false; } };

  // Ogni card si riconosce da un elemento che solo lei contiene
  const RUOLI = [
    { k: 'passi', sel: '#dash-primi-passi', lato: 'main' },
    { k: 'ultima', sel: '#dash-ultima-sessione', lato: 'main' },
    { k: 'scadenze', sel: '#dash-scadenze-card', lato: 'coppia' },
    { k: 'clock', sel: '#dash-clocks-preview', lato: 'coppia' },
    { k: 'quest', sel: '#dash-quest-attive', lato: 'main' },
    { k: 'ganci', sel: '#dash-ganci', lato: 'main' },
    { k: 'png', sel: '#dash-png-recenti', lato: 'main' },
    { k: 'trame', sel: '#dash-trame', lato: 'main' },
    { k: 'fili', sel: '#dash-stale-card', lato: 'main' },
    { k: 'note', sel: '#dash-recent-notes', lato: 'main' },
    { k: 'prevon', sel: '#dash-prevon-card', lato: 'via' },
    { k: 'segreti', sel: '#dash-segreti-card', lato: 'side' },
    { k: 'mondo', sel: '#dash-turni-fazione', lato: 'side' },
    { k: 'zero', sel: '#dash-sz-card', lato: 'side' },
    { k: 'vista', sel: '#dash-vista-giocatori', lato: 'side' },
  ];
  const _cardDi = (sel) => { const el = document.querySelector('#page-campagna ' + sel); return el ? (el.classList.contains('card') ? el : el.closest('.card')) : null; };

  // Una card e' "vuota" quando, tolta l'intestazione, resta solo il messaggio di cortesia
  const VUOTI = /^(nessun|nessuna|tutto aggiornato|niente)/i;
  const _vuota = (card, k) => {
    if (!['ganci', 'png', 'trame', 'fili', 'quest', 'clock', 'scadenze'].includes(k)) return false;
    const corpo = [...card.children].filter((c) => !c.classList.contains('card-header'));
    const testo = corpo.map((c) => c.textContent.trim()).join(' ').replace(/\s+/g, ' ').trim();
    const elementiVeri = corpo.some((c) => c.querySelector('[data-id], .dash-q-item, .dash-n-item, .dash-t-item, input:not([type=number]), canvas, img'));
    return !elementiVeri && (testo === '' || (VUOTI.test(testo) && testo.length < 90));
  };

  let _lavoro = false, _osservatore = null;
  const organizza = () => {
    const g = _griglia(), camp = _camp();
    if (!g || !camp || _lavoro) return;
    _lavoro = true;
    // Spostare le card cambia la griglia: mentre si lavora l'osservatore e' spento, o ripartirebbe da solo
    if (_osservatore) _osservatore.disconnect();
    try {
      // "La mia dashboard": le card tornano tutte figlie dirette della griglia, nell'ordine scelto
      if (_vistaMia()) {
        g.classList.remove('dn');
        g.querySelectorAll(':scope > .dn-col, :scope .dn-split').forEach((w) => { while (w.firstChild) g.insertBefore(w.firstChild, w); w.remove(); });
        g.querySelectorAll('.card.dn-nascosta').forEach((c) => c.classList.remove('dn-nascosta'));
        $('dn-vuoti')?.remove();
        if (typeof DashboardMia !== 'undefined' && DashboardMia.applica) DashboardMia.applica();
        return;
      }
      g.classList.add('dn');
      let main = g.querySelector(':scope > .dn-col.dn-main'), side = g.querySelector(':scope > .dn-col.dn-side');
      if (!main) { main = document.createElement('div'); main.className = 'dn-col dn-main'; g.appendChild(main); }
      if (!side) { side = document.createElement('aside'); side.className = 'dn-col dn-side'; side.setAttribute('aria-label', 'Da consultare'); g.appendChild(side); }
      let coppia = main.querySelector('.dn-split');
      if (!coppia) { coppia = document.createElement('div'); coppia.className = 'dn-split'; }

      const vuote = [];
      const ordineMain = [], ordineSide = [], ordineCoppia = [];
      RUOLI.forEach((r) => {
        const card = _cardDi(r.sel);
        if (!card) return;
        card.dataset.dn = r.k;
        if (r.k === 'ultima') card.classList.add('dn-lead-card');
        const vuota = _vuota(card, r.k);
        card.classList.toggle('dn-nascosta', vuota || r.lato === 'via');
        if (vuota) vuote.push((card.querySelector('.card-title')?.textContent || '').trim());
        if (r.lato === 'side') ordineSide.push(card);
        else if (r.lato === 'coppia') ordineCoppia.push(card);
        else ordineMain.push(card);
      });
      // Card di moduli che non conosco: in fondo a sinistra, cosi' nulla sparisce
      [...g.querySelectorAll(':scope > .card')].forEach((c) => { if (!c.dataset.dn) ordineMain.push(c); });

      const visibiliCoppia = ordineCoppia.filter((c) => !c.classList.contains('dn-nascosta'));
      ordineCoppia.forEach((c) => coppia.appendChild(c));
      coppia.classList.toggle('dn-una', visibiliCoppia.length === 1);
      // Ordine a sinistra: passi, ultima sessione, scadenze+clock, quest, il resto, riga dei vuoti, note
      const pos = (k) => ordineMain.find((c) => c.dataset.dn === k);
      const seq = [pos('passi'), pos('ultima'), coppia, pos('quest'), pos('ganci'), pos('png'), pos('trame'), pos('fili'),
        ...ordineMain.filter((c) => !c.dataset.dn), null, pos('note'), pos('prevon')].filter((x) => x !== undefined);
      let riga = $('dn-vuoti');
      if (vuote.length) {
        if (!riga) { riga = document.createElement('div'); riga.id = 'dn-vuoti'; riga.className = 'dn-vuoti'; }
        riga.innerHTML = '<b>Niente in sospeso</b><span>' + vuote.map(_esc).join(' · ') + '</span>' +
          '<button type="button" onclick="WikiSections.goto(\'sessioni\')">Aggiungi un gancio alla prossima sessione</button>';
      } else if (riga) { riga.remove(); riga = null; }
      seq.forEach((el) => { if (el === null) { if (riga) main.appendChild(riga); } else main.appendChild(el); });
      ordineSide.forEach((c) => side.appendChild(c));
      side.hidden = !ordineSide.some((c) => !c.classList.contains('dn-nascosta'));

      // Intestazione: il nome della campagna e cosa e', invece di "Dashboard"
      const titolo = $('campagna-title');
      if (titolo) titolo.textContent = camp.name || 'Dashboard';
      const sub = $('dash-ultima-sess-sub');
      if (sub) {
        const giocate = (camp.sessioni_log || []).filter((s) => s.stato === 'giocata').length;
        sub.textContent = (camp.type === 'oneshot' ? 'One shot' : 'Campagna') + ' · ' + giocate + (giocate === 1 ? ' sessione giocata' : ' sessioni giocate');
      }
    } finally {
      _lavoro = false;
      if (_osservatore) _osservatore.observe(g, { childList: true, subtree: true });
    }
  };

  // Le card arrivano da moduli diversi e in momenti diversi: si riordina quando la griglia cambia
  let _timer = null;
  const _programma = () => { clearTimeout(_timer); _timer = setTimeout(organizza, 60); };
  const avvia = () => {
    const g = _griglia();
    if (!g) return;
    _osservatore = new MutationObserver(_programma);
    _osservatore.observe(g, { childList: true, subtree: true });
    // Il cambio Panoramica / La mia dashboard non tocca la griglia: si riordina subito dopo ogni cambio di vista
    if (typeof DashboardMia !== 'undefined' && DashboardMia.vista && !DashboardMia.vista._dn) {
      const vistaOriginale = DashboardMia.vista;
      DashboardMia.vista = (v) => { vistaOriginale(v); organizza(); };
      DashboardMia.vista._dn = true;
    }
    _programma();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();

  return { organizza };
})();

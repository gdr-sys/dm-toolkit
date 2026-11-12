/* ============================================================
   DASHBOARD-NUOVA.JS — Impaginazione della Panoramica (nuova grafica "scena").
   Non disegna i contenuti: le tessere restano dei loro moduli (sessioni,
   scadenze, clock, segreti, fazioni...). Qui si decide dove stanno:
   in cima la scena con l'ultima sessione, sotto le fasce
   ("Cosa incombe", "Quest attive", "Il mondo si muove", "Dalla campagna").
   Le card vuote si riducono a una riga sola. In "La mia dashboard" non
   tocca nulla: li' l'ordine lo sceglie il master (js/dashboard-mia.js).
   Stili in css/scena.css.
   ============================================================ */

const DashboardNuova = (() => {
  const $ = (id) => document.getElementById(id);
  const _griglia = () => document.querySelector('#page-campagna .dash-grid');
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _vistaMia = () => { try { return localStorage.getItem('dm_dash_vista_' + (_camp()?.id || '')) === 'mia'; } catch (e) { return false; } };

  // Ogni card si riconosce da un elemento che solo lei contiene.
  // sciolta: le sue tessere entrano direttamente nella griglia della fascia (la card non si vede)
  const RUOLI = [
    { k: 'ultima', sel: '#dash-ultima-sessione', fascia: 'scena' },
    { k: 'passi', sel: '#dash-primi-passi', fascia: 'inizio' },
    { k: 'scadenze', sel: '#dash-scadenze-card', fascia: 'incombe', sciolta: true },
    { k: 'clock', sel: '#dash-clocks-preview', fascia: 'incombe', sciolta: true },
    { k: 'segreti', sel: '#dash-segreti-card', fascia: 'incombe', sciolta: true },
    { k: 'quest', sel: '#dash-quest-attive', fascia: 'quest', sciolta: true },
    { k: 'trame', sel: '#dash-trame', fascia: 'quest', sciolta: true },
    { k: 'mondo', sel: '#dash-turni-fazione', fascia: 'mondo', sciolta: true },
    { k: 'zero', sel: '#dash-sz-card', fascia: 'mondo' },
    { k: 'vista', sel: '#dash-vista-giocatori', fascia: 'mondo' },
    { k: 'ganci', sel: '#dash-ganci', fascia: 'campagna' },
    { k: 'png', sel: '#dash-png-recenti', fascia: 'campagna', sciolta: true },
    { k: 'note', sel: '#dash-recent-notes', fascia: 'campagna', sciolta: true },
    { k: 'fili', sel: '#dash-stale-card', fascia: 'campagna' },
    { k: 'prevon', sel: '#dash-prevon-card', fascia: 'via' },
  ];
  const FASCE = [
    { k: 'inizio', titolo: '' },
    { k: 'incombe', titolo: 'Cosa incombe', azioni: [['Calendario', "App.navigateTo('calendario')"], ['Segreti', "typeof Segreti!=='undefined'&&Segreti.apri()"]] },
    { k: 'quest', titolo: 'Quest attive', azioni: [['Tutte le quest', "WikiSections.goto('quest')"]] },
    { k: 'mondo', titolo: 'Il mondo si muove', azioni: [['Muovi le fazioni', "typeof TurniFazione!=='undefined'&&TurniFazione.apri()"]] },
    { k: 'campagna', titolo: 'Dalla campagna', azioni: [['Apri la Wiki', "App.navigateTo('wiki-hub')"]] },
  ];
  const _cardDi = (sel) => { const el = document.querySelector('#page-campagna ' + sel); return el ? (el.classList.contains('card') ? el : el.closest('.card')) : null; };

  // Una card e' "vuota" quando, tolta l'intestazione, resta solo il messaggio di cortesia
  const VUOTI = /^(nessun|nessuna|tutto aggiornato|tutti i segreti|niente|annota)/i;
  const _vuota = (card, k) => {
    if (!['ganci', 'png', 'trame', 'fili', 'quest', 'clock', 'scadenze', 'segreti', 'note'].includes(k)) return false;
    const corpo = [...card.children].filter((c) => !c.classList.contains('card-header'));
    const testo = corpo.map((c) => c.textContent.trim()).join(' ').replace(/\s+/g, ' ').trim();
    const elementiVeri = card.querySelector('.sc-t, [data-id], .dash-q-item, .dash-n-item, .dash-t-item, canvas, img');
    return !elementiVeri && (testo === '' || (VUOTI.test(testo) && testo.length < 110));
  };

  const _smonta = (g, contenitore) => {
    // Le card tornano tutte figlie dirette della griglia; scena e fasce spariscono
    const eroe = $('dn-hero');
    if (eroe) {
      const barra = $('dash-mia-barra');
      if (barra && eroe.contains(barra)) contenitore.insertBefore(barra, g);
      const inc = eroe.querySelector('.dn-fascia');
      if (inc) g.insertBefore(inc, g.firstChild);
      const testa = eroe.querySelector('.dn-testa');
      if (testa) { testa.classList.remove('dn-testa'); contenitore.insertBefore(testa, contenitore.firstChild); }
      eroe.querySelectorAll('.card').forEach((c) => g.insertBefore(c, g.firstChild)); eroe.remove();
    }
    g.querySelectorAll('.dn-fascia').forEach((f) => { f.querySelectorAll('.card').forEach((c) => g.insertBefore(c, f)); f.remove(); });
    g.querySelectorAll('.card').forEach((c) => c.classList.remove('dn-nascosta', 'dn-sciolta', 'dn-lead-card'));
    $('dn-vuoti')?.remove();
    g.classList.remove('dn');
    contenitore?.classList.remove('dn-con-scena');
  };

  let _lavoro = false, _osservatore = null;
  const organizza = () => {
    const g = _griglia(), camp = _camp();
    if (!g || !camp || _lavoro) return;
    _lavoro = true;
    // Spostare le card cambia la griglia: mentre si lavora l'osservatore e' spento, o ripartirebbe da solo
    if (_osservatore) _osservatore.disconnect();
    const contenitore = g.parentElement;
    try {
      if (_vistaMia()) {
        _smonta(g, contenitore);
        const t = $('campagna-title'); if (t) t.textContent = camp.name || 'Dashboard';
        if (typeof DashboardMia !== 'undefined' && DashboardMia.applica) DashboardMia.applica();
        return;
      }
      g.classList.add('dn');
      contenitore.classList.add('dn-con-scena');

      // ── Scena con l'ultima sessione, in cima alla pagina ──
      let eroe = $('dn-hero');
      if (!eroe) {
        eroe = document.createElement('header');
        eroe.id = 'dn-hero'; eroe.className = 'sc-hero';
        contenitore.insertBefore(eroe, contenitore.firstChild);
      }
      const tipo = typeof Scena !== 'undefined' ? Scena.tipo((camp.name || '') + ' ' + (camp.description || '')) : 'auto';
      let scena = eroe.querySelector('svg.sc-scena');
      if (!scena && typeof Scena !== 'undefined') { eroe.insertAdjacentHTML('afterbegin', Scena.svg(camp.name || 'Campagna', tipo)); scena = eroe.querySelector('svg.sc-scena'); }
      if (scena && scena.dataset.seme !== (camp.name || 'Campagna')) { scena.dataset.seme = camp.name || 'Campagna'; scena.dataset.tipo = tipo; }

      // La riga col nome della campagna e "Condividi" sta dentro la scena, sopra l'ultima sessione
      const testa = $('campagna-title')?.parentElement?.parentElement;
      if (testa && testa.parentElement !== eroe) { testa.classList.add('dn-testa'); eroe.appendChild(testa); }
      const barraViste = $('dash-mia-barra');
      if (testa && barraViste && barraViste.parentElement !== testa) testa.insertBefore(barraViste, testa.children[1] || null);

      const perFascia = {};
      const vuote = [];
      RUOLI.forEach((r) => {
        const card = _cardDi(r.sel);
        if (!card) return;
        card.dataset.dn = r.k;
        if (r.fascia === 'scena') { card.classList.add('dn-lead-card'); if (card.parentElement !== eroe) eroe.appendChild(card); return; }
        const vuota = _vuota(card, r.k);
        card.classList.toggle('dn-nascosta', vuota || r.fascia === 'via');
        card.classList.toggle('dn-sciolta', !!r.sciolta && !vuota);
        if (vuota) vuote.push((card.querySelector('.card-title')?.textContent || '').trim());
        (perFascia[r.fascia === 'via' ? 'campagna' : r.fascia] ||= []).push(card);
      });
      // Card di moduli che non conosco: in fondo, cosi' nulla sparisce
      [...g.querySelectorAll(':scope > .card')].forEach((c) => { if (!c.dataset.dn) (perFascia.campagna ||= []).push(c); });

      FASCE.forEach((f) => {
        const carte = perFascia[f.k] || [];
        let sez = g.querySelector(':scope > .dn-fascia[data-f="' + f.k + '"]') || (eroe && eroe.querySelector(':scope > .dn-fascia[data-f="' + f.k + '"]'));
        if (!sez) {
          sez = document.createElement('section');
          sez.className = 'dn-fascia'; sez.dataset.f = f.k;
          sez.innerHTML = (f.titolo ? '<div class="dn-fascia-t"><h2>' + _esc(f.titolo) + '</h2>' +
            (f.azioni || []).map((a) => '<button type="button" onclick="' + a[1] + '">' + _esc(a[0]) + '</button>').join('') + '</div>' : '') +
            '<div class="sc-riga"></div>';
        }
        g.appendChild(sez);
        const riga = sez.querySelector('.sc-riga');
        carte.forEach((c) => riga.appendChild(c));
        sez.hidden = !carte.some((c) => !c.classList.contains('dn-nascosta'));
      });

      // "Cosa incombe" sta nella scena, accanto all'ultima sessione: tutto il quadro nel primo schermo
      const incombe = g.querySelector(':scope > .dn-fascia[data-f="incombe"]');
      if (incombe) eroe.appendChild(incombe);
      eroe.classList.toggle('dn-con-incombe', !!incombe && !incombe.hidden);

      // I riquadri senza contenuto: una riga sola in fondo
      let rigaVuoti = $('dn-vuoti');
      if (vuote.length) {
        if (!rigaVuoti) { rigaVuoti = document.createElement('div'); rigaVuoti.id = 'dn-vuoti'; rigaVuoti.className = 'dn-vuoti'; }
        rigaVuoti.innerHTML = '<b>Niente in sospeso</b><span>' + vuote.map(_esc).join(' · ') + '</span>' +
          '<button type="button" onclick="WikiSections.goto(\'sessioni\')">Aggiungi un gancio alla prossima sessione</button>';
        g.appendChild(rigaVuoti);
      } else if (rigaVuoti) rigaVuoti.remove();

      // Intestazione: il nome della campagna e cosa e', invece di "Dashboard"
      const titolo = $('campagna-title');
      if (titolo) titolo.textContent = camp.name || 'Dashboard';
      const sub = $('dash-ultima-sess-sub');
      if (sub) {
        const giocate = (camp.sessioni_log || []).filter((s) => s.stato === 'giocata').length;
        sub.textContent = (camp.type === 'oneshot' ? 'One shot' : 'Campagna') + ' · ' + giocate + (giocate === 1 ? ' sessione giocata' : ' sessioni giocate');
      }
      if (typeof Scena !== 'undefined') Scena.tutte(eroe);
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

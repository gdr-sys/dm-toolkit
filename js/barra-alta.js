/* ============================================================
   BARRA-ALTA.JS — Navigazione in alto su schermi larghi (nuova grafica).
   Da 900px in su il menu laterale lascia il posto a una riga in alto:
   il contenuto prende tutta la larghezza. Le voci sono le stesse del
   menu laterale (che resta nel codice e torna sotto i 900px); sul
   telefono resta la barra in basso.
   ============================================================ */

const BarraAlta = (() => {
  const LARGO = '(min-width: 900px)';
  const PRINCIPALI = [
    { id: 'campagna', nome: 'Dashboard', campagna: true },
    { id: 'wiki-hub', nome: 'Wiki', campagna: true, prefisso: 'page-wiki' },
    { id: 'mappa', nome: 'Mappe', campagna: true },
    { id: 'sessione', nome: 'Sessione', campagna: true },
  ];
  const STRUMENTI = [
    { id: 'calendario', nome: 'Calendario', campagna: true },
    { id: 'schermo', nome: 'Schermo del DM' },
    { id: 'generatori', nome: 'Generatori' },
    { id: 'cartografo', nome: 'Cartografo' },
    { id: 'scrittoio', nome: 'Scrittoio' },
    { id: 'compendio', nome: 'Compendio' },
    { id: 'musica', nome: 'Musica', campagna: true },
  ];
  const AIUTO = [
    { nome: 'Guida rapida', azione: 'Onboarding.open()' },
    { nome: 'Segnala un problema', azione: 'BugReport.open()' },
    { nome: 'Suggerisci una funzione', azione: 'Suggerisci.open()' },
    { nome: 'Altre app e informazioni', azione: "Modal.open('info-app')" },
  ];
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);
  const _freccia = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';

  const _paginaAttiva = () => (document.querySelector('#main-content .page.active')?.id || '');

  const _disegna = () => {
    const top = document.getElementById('topbar');
    if (!top) return;
    let barra = document.getElementById('ba-barra');
    if (!barra) {
      barra = document.createElement('div');
      barra.id = 'ba-barra';
      barra.className = 'ba-barra';
      top.insertBefore(barra, top.firstChild);
    }
    const camp = _camp();
    const voce = (v) => {
      const off = v.campagna && !camp;
      return `<button type="button" class="ba-voce" data-pagina="${v.id}"${v.prefisso ? ` data-prefisso="${v.prefisso}"` : ''}${off ? ' aria-disabled="true" title="Apri prima una campagna"' : ''} onclick="BarraAlta.vai('${v.id}', ${off})">${_esc(v.nome)}</button>`;
    };
    const voceMenu = (v) => {
      const off = v.campagna && !camp;
      return `<button type="button" role="menuitem" data-pagina="${v.id}"${off ? ' aria-disabled="true"' : ''} onclick="BarraAlta.vai('${v.id}', ${off})">${_esc(v.nome)}</button>`;
    };
    barra.innerHTML =
      `<button type="button" class="ba-logo" onclick="BarraAlta.vai('home')" aria-label="DM Toolkit, le tue campagne"><img src="icons/icon-192.png" alt="" width="26" height="26"><span>DM Toolkit</span></button>` +
      (camp ? `<button type="button" class="ba-campagna" onclick="CampagnaHub.apri()" title="Apri la pagina della campagna"><i aria-hidden="true"></i><span>${_esc(camp.name)}</span></button>` : '') +
      `<nav class="ba-nav" aria-label="Sezioni">${PRINCIPALI.map(voce).join('')}` +
        `<div class="ba-gruppo"><button type="button" class="ba-voce" id="ba-strumenti" aria-haspopup="menu" aria-expanded="false" onclick="BarraAlta.menu('ba-menu-strumenti', this)">Strumenti ${_freccia}</button>` +
        `<div class="ba-menu" id="ba-menu-strumenti" role="menu" hidden>${STRUMENTI.map(voceMenu).join('')}</div></div>` +
      `</nav>` +
      `<div class="ba-destra">` +
        `<div class="ba-gruppo"><button type="button" class="ba-icona" aria-label="Aiuto" aria-haspopup="menu" aria-expanded="false" onclick="BarraAlta.menu('ba-menu-aiuto', this)"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.8"/><path d="M12 17.2h.01"/></svg></button>` +
        `<div class="ba-menu ba-menu-destra" id="ba-menu-aiuto" role="menu" hidden>${AIUTO.map((a) => `<button type="button" role="menuitem" onclick="BarraAlta.chiudi();${a.azione}">${_esc(a.nome)}</button>`).join('')}</div></div>` +
        `<button type="button" class="ba-icona" aria-label="Impostazioni" onclick="Settings.open()"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></button>` +
        `<button type="button" class="ba-icona" aria-label="Cambia tema chiaro o scuro" onclick="App.toggleTheme()"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></button>` +
      `</div>`;
    _segnaAttiva();
  };

  let _ultimaPagina = '';
  const _segnaAttiva = () => {
    const pag = _paginaAttiva();
    // Cambiando pagina, in qualunque modo, i menu aperti si chiudono
    if (pag !== _ultimaPagina) { _ultimaPagina = pag; chiudi(); }
    document.querySelectorAll('#ba-barra [data-pagina]').forEach((b) => {
      const pre = b.dataset.prefisso;
      const attiva = pag === 'page-' + b.dataset.pagina || (pre && pag.startsWith(pre));
      if (attiva) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    const inStrumenti = STRUMENTI.some((v) => pag === 'page-' + v.id);
    document.getElementById('ba-strumenti')?.toggleAttribute('data-dentro', inStrumenti);
  };

  const chiudi = () => {
    document.querySelectorAll('#ba-barra .ba-menu').forEach((m) => { m.hidden = true; });
    document.querySelectorAll('#ba-barra [aria-haspopup]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  };
  const menu = (id, btn) => {
    const m = document.getElementById(id);
    if (!m) return;
    const aperto = !m.hidden;
    chiudi();
    if (aperto) return;
    m.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    m.querySelector('[role="menuitem"]:not([aria-disabled])')?.focus();
  };
  const vai = (id, off) => {
    chiudi();
    if (off) { if (typeof Toast !== 'undefined') Toast.show('Apri prima una campagna dalla Home', 'info'); return; }
    App.navigateTo(id);
  };

  const _applicaLarghezza = () => {
    const largo = window.matchMedia(LARGO).matches;
    document.body.classList.toggle('barra-alta', largo);
    if (largo) _disegna();
  };

  const avvia = () => {
    _applicaLarghezza();
    window.matchMedia(LARGO).addEventListener('change', _applicaLarghezza);
    // La pagina attiva cambia per classe: si osserva, cosi' la voce giusta resta evidenziata
    const main = document.getElementById('main-content');
    if (main) new MutationObserver(() => { _segnaAttiva(); }).observe(main, { subtree: true, attributes: true, attributeFilter: ['class'] });
    // Il nome della campagna cambia aprendone un'altra: la barra si ridisegna
    const nome = document.getElementById('sidebar-campaign-name');
    if (nome) new MutationObserver(() => { if (document.body.classList.contains('barra-alta')) _disegna(); }).observe(nome, { childList: true, characterData: true, subtree: true });
    document.addEventListener('click', (e) => { if (!e.target.closest('#ba-barra .ba-gruppo')) chiudi(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudi(); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();

  return { vai, menu, chiudi };
})();

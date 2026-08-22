/* ============================================================
   PROSSIME-SCADENZE.JS — Avviso in Dashboard per le deadline del
   Calendario in scadenza entro il numero di giorni di preavviso
   impostato su ciascuna. Modulo autonomo: costruisce la propria
   card e la inserisce nella Dashboard a runtime, senza toccare il
   markup statico di index.html (stesso pattern di fili-sospesi.js).
   ============================================================ */

const ProssimeScadenze = (() => {
  const _esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const _ensureCard = () => {
    if (document.getElementById('dash-scadenze-card')) return;
    const grid = document.querySelector('#page-campagna .dash-grid');
    if (!grid) return;

    const card = document.createElement('div');
    card.className = 'card dash-card-full';
    card.id = 'dash-scadenze-card';
    card.innerHTML =
      '<div class="card-header">' +
        '<h3 class="card-title">Prossime scadenze</h3>' +
      '</div>' +
      '<div id="dash-scadenze-list" style="padding:4px 0;"></div>';

    // Subito dopo "Fili in sospeso" se presente, altrimenti dopo la prima card a piena larghezza.
    const anchor = document.getElementById('dash-stale-card') || grid.querySelector('.dash-card-full');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(card, anchor.nextSibling);
    else grid.appendChild(card);
  };

  const _collect = (camp, cal) => {
    const oggi = { giorno: cal.giorno, mese: cal.mese, anno: cal.anno };
    return (camp.calendarioEventi || [])
      .filter(e => e.tipo === 'deadline' && !e.completata && e.data)
      .map(e => ({ ...e, giorniRimanenti: Calendario.diffGiorni(cal, oggi, e.data) }))
      .filter(e => e.giorniRimanenti !== null && e.giorniRimanenti <= (e.promemoriaGiorni ?? 3))
      .sort((a, b) => a.giorniRimanenti - b.giorniRimanenti);
  };

  const _label = (giorni) => {
    if (giorni < 0) return 'Scaduta da ' + Math.abs(giorni) + ' giorni';
    if (giorni === 0) return 'Oggi';
    if (giorni === 1) return 'Domani';
    return 'Tra ' + giorni + ' giorni';
  };

  const openItem = (id) => {
    App.navigateTo('calendario');
    setTimeout(() => { try { CalendarioUI.editEvento(id); } catch (e) {} }, 200);
  };

  const render = () => {
    const camp = App.getActiveCampaign();
    if (!camp) return;
    const cal = Calendario.get();
    const existing = document.getElementById('dash-scadenze-card');
    if (!cal) { if (existing) existing.style.display = 'none'; return; }

    _ensureCard();
    const card = document.getElementById('dash-scadenze-card');
    const list = document.getElementById('dash-scadenze-list');
    if (!card || !list) return;
    card.style.display = '';

    const items = _collect(camp, cal);
    list.innerHTML = items.length
      ? items.slice(0, 12).map(it =>
          '<div onclick="ProssimeScadenze.openItem(\'' + it.id + '\')" ' +
          'style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer;">' +
            '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + (it.giorniRimanenti <= 0 ? 'var(--accent-danger)' : '#f5a623') + ';flex-shrink:0;"></span>' +
            '<span style="flex:1;font-size:0.83rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _esc(it.titolo || 'Senza titolo') + '</span>' +
            '<span style="font-size:0.68rem;color:var(--text-muted);flex-shrink:0;">' + _label(it.giorniRimanenti) + '</span>' +
          '</div>'
        ).join('')
      : '<div class="text-muted text-sm" style="padding:6px 0;">Nessuna scadenza imminente.</div>';
  };

  // Si aggancia ad App.navigateTo per ridisegnarsi ogni volta che si apre la Dashboard,
  // senza dover modificare index.html per aggiungere la chiamata li'.
  const _hook = () => {
    if (typeof App === 'undefined' || App._prossimeScadenzeHooked) return;
    const origNavigateTo = App.navigateTo;
    App.navigateTo = function (pageId) {
      origNavigateTo.apply(App, arguments);
      if (pageId === 'campagna') setTimeout(render, 150);
    };
    App._prossimeScadenzeHooked = true;
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(_hook, 200));

  return { render, openItem };
})();

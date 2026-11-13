/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   PRIMI-PASSI.JS — Card "Primi passi" in cima alla Dashboard di
   una campagna nuova: cinque cose da fare per partire, che si
   spuntano da sole guardando i dati della campagna. Sparisce
   quando sono tutte fatte, o se la si chiude.
   Modulo autonomo, stesso aggancio ad App.navigateTo di
   fili-sospesi.js.
   ============================================================ */

const PrimiPassi = (() => {
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);

  const PASSI = [
    { id: 'zero', testo: 'Prepara la Sessione Zero con i giocatori',
      fatto: c => { const z = c.sessioneZero; return !!z && ((z.linee || []).length || (z.veli || []).length || Object.values(z.aspettative || {}).some(Boolean)); },
      azione: () => SessioneZero.apri() },
    { id: 'png', testo: 'Crea il primo PNG', fatto: c => (c.npcs || []).some(n => (n.nome || n.name || '').trim()),
      azione: () => { App.navigateTo('wiki'); setTimeout(() => { WikiSections.goto('png'); WikiSections.newCard('png'); }, 200); } },
    { id: 'luogo', testo: 'Aggiungi un luogo', fatto: c => (c.locations || []).some(l => (l.nome || l.name || '').trim()),
      azione: () => { App.navigateTo('wiki'); setTimeout(() => { WikiSections.goto('luoghi'); WikiSections.newCard('luoghi'); }, 200); } },
    { id: 'sessione', testo: 'Pianifica la prima sessione', fatto: c => (c.sessioni_log || []).length > 0,
      azione: () => App.navigateTo('sessione') },
    { id: 'generatore', testo: 'Tira un generatore o crea una tua tabella casuale', fatto: c => !!c.primiPassiGeneratore || (c.tabelleCasuali || []).length > 0,
      azione: () => App.navigateTo('generatori') },
  ];

  const _spunta = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  const render = () => {
    const griglia = document.querySelector('#page-campagna .dash-grid');
    const c = _camp();
    let card = document.getElementById('dash-primi-passi');
    const stati = c ? PASSI.map(p => { try { return !!p.fatto(c); } catch (e) { return false; } }) : [];
    const fatti = stati.filter(Boolean).length;
    if (!griglia || !c || c.primiPassiChiusi || fatti === PASSI.length) { if (card) card.remove(); return; }
    if (!card) {
      card = document.createElement('div');
      card.id = 'dash-primi-passi';
      card.className = 'card dash-card-full';
      griglia.insertBefore(card, griglia.firstChild);
    }
    card.innerHTML =
      '<div class="card-header" style="flex-wrap:wrap;gap:6px;">' +
        '<div><h2 class="card-title">Primi passi</h2>' +
          '<div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">' + fatti + ' di ' + PASSI.length + ' fatti — si spuntano da soli man mano</div></div>' +
        '<button type="button" class="btn btn-ghost btn-sm" onclick="PrimiPassi.chiudi()">Nascondi</button>' +
      '</div>' +
      '<div style="height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden;margin:2px 0 10px;"><div style="height:100%;width:' + Math.round(fatti / PASSI.length * 100) + '%;background:var(--accent-secondary);"></div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;">' +
        PASSI.map((p, i) =>
          '<button type="button" onclick="PrimiPassi.vai(' + i + ')" style="display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);background:' + (stati[i] ? 'var(--bg-secondary)' : 'var(--bg-card)') + ';color:var(--text-primary);cursor:pointer;font:inherit;font-size:0.86rem;">' +
            '<span style="flex-shrink:0;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
              (stati[i] ? 'background:var(--accent-secondary);color:#fff;' : 'border:2px solid var(--border-strong);color:var(--text-muted);font-size:0.72rem;font-weight:700;') + '">' + (stati[i] ? _spunta : (i + 1)) + '</span>' +
            '<span style="' + (stati[i] ? 'text-decoration:line-through;color:var(--text-muted);' : '') + '">' + p.testo + '</span>' +
          '</button>').join('') +
      '</div>';
  };

  const vai = (i) => { try { PASSI[i].azione(); } catch (e) {} };
  const chiudi = () => { App.saveActiveCampaign({ primiPassiChiusi: true }); render(); };

  // "Tira un generatore": qualunque pulsante premuto nella pagina Generatori
  document.addEventListener('click', (e) => {
    const c = _camp();
    if (!c || c.primiPassiGeneratore || c.primiPassiChiusi) return;
    if (e.target.closest && e.target.closest('#page-generatori button')) App.saveActiveCampaign({ primiPassiGeneratore: true });
  }, true);

  const _aggancia = () => {
    if (typeof App === 'undefined' || App._primiPassiHooked) return;
    const orig = App.navigateTo;
    App.navigateTo = function (pageId) {
      orig.apply(App, arguments);
      if (pageId === 'campagna') setTimeout(render, 170);
    };
    App._primiPassiHooked = true;
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(_aggancia, 200));

  return { render, vai, chiudi };
})();

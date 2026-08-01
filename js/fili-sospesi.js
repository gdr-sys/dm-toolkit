/* ============================================================
   FILI-SOSPESI.JS — Promemoria PNG/luoghi/fazioni/quest/trame
   non toccati da un po', per non perdere ganci lasciati a meta'.
   Modulo autonomo: costruisce la propria card e la inserisce nella
   Dashboard a runtime, senza toccare il markup statico di index.html.
   ============================================================ */

const StaleThreads = (() => {
  const THRESHOLD_DAYS = 14;

  const _daysSince = (ts) => ts ? Math.floor((Date.now() - ts) / 86400000) : null;

  const _ensureCard = () => {
    if (document.getElementById('dash-stale-card')) return;
    const grid = document.querySelector('#page-campagna .dash-grid');
    if (!grid) return;

    const card = document.createElement('div');
    card.className = 'card dash-card-full';
    card.id = 'dash-stale-card';
    card.style.display = 'none';
    card.innerHTML =
      '<div class="card-header">' +
        '<h3 class="card-title">Fili in sospeso</h3>' +
        '<span id="dash-stale-count" style="font-size:0.68rem;color:var(--text-muted);"></span>' +
      '</div>' +
      '<div id="dash-stale-list" style="padding:4px 0;"></div>';

    // Subito sotto "Ultima Sessione" (la prima card a piena larghezza), cosi' e' ben visibile
    // quando c'e' qualcosa da segnalare.
    const primaCard = grid.querySelector('.dash-card-full');
    if (primaCard && primaCard.parentNode) primaCard.parentNode.insertBefore(card, primaCard.nextSibling);
    else grid.appendChild(card);
  };

  const _collect = (camp) => {
    const items = [];

    (camp.npcs || []).forEach(n => {
      if ((n.stato || 'Vivo') === 'Morto') return;
      const days = _daysSince(n.aggiornatoAt);
      if (days !== null && days >= THRESHOLD_DAYS) {
        items.push({ tipo: 'png', nome: n.name || n.nome || 'Senza nome', days, ts: n.aggiornatoAt, id: n.id, icon: '👤' });
      }
    });
    (camp.locations || []).forEach(l => {
      const days = _daysSince(l.aggiornatoAt);
      if (days !== null && days >= THRESHOLD_DAYS) {
        items.push({ tipo: 'luoghi', nome: l.nome || l.name || 'Senza nome', days, ts: l.aggiornatoAt, id: l.id, icon: '🗺️' });
      }
    });
    (camp.factions || []).forEach(f => {
      const days = _daysSince(f.aggiornatoAt);
      if (days !== null && days >= THRESHOLD_DAYS) {
        items.push({ tipo: 'fazioni', nome: f.nome || f.name || 'Senza nome', days, ts: f.aggiornatoAt, id: f.id, icon: '⚔️' });
      }
    });
    (camp.quests || []).forEach(q => {
      if (q.stato === 'Completata' || q.stato === 'Fallita') return;
      const days = _daysSince(q.aggiornatoAt);
      if (days !== null && days >= THRESHOLD_DAYS) {
        items.push({ tipo: 'quest', nome: q.titolo || 'Senza titolo', days, ts: q.aggiornatoAt, id: q.id, icon: '📜' });
      }
    });
    (camp.trame || []).forEach(t => {
      if (t.stato === 'Completata' || t.stato === 'Abbandonata') return;
      const days = _daysSince(t.aggiornatoAt);
      if (days !== null && days >= THRESHOLD_DAYS) {
        items.push({ tipo: 'trame', nome: t.titolo || 'Senza titolo', days, ts: t.aggiornatoAt, id: t.id, icon: '🎭' });
      }
    });

    return items.sort((a, b) => b.days - a.days);
  };

  const openItem = (tipo, id) => {
    if (tipo === 'trame') {
      WikiSections.gotoTrame();
      setTimeout(() => Trame.openTrama(id), 150);
      return;
    }
    WikiSections.goto(tipo);
    setTimeout(() => WikiSections.openCard(tipo, id), 150);
  };

  const render = () => {
    const camp = App.getActiveCampaign();
    if (!camp) return;
    _ensureCard();
    const card  = document.getElementById('dash-stale-card');
    const list  = document.getElementById('dash-stale-list');
    const count = document.getElementById('dash-stale-count');
    if (!card || !list) return;

    const items = _collect(camp);
    if (!items.length) { card.style.display = 'none'; return; }
    card.style.display = '';
    if (count) count.textContent = items.length + (items.length === 1 ? ' filo da riprendere' : ' fili da riprendere');

    list.innerHTML = items.slice(0, 12).map(it =>
      '<div onclick="StaleThreads.openItem(\'' + it.tipo + '\',\'' + it.id + '\')" ' +
      'style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer;">' +
        '<span>' + it.icon + '</span>' +
        '<span style="flex:1;font-size:0.83rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + it.nome + '</span>' +
        '<span style="font-size:0.68rem;color:var(--text-muted);flex-shrink:0;">' + _timeAgo(it.ts) + '</span>' +
      '</div>'
    ).join('');
  };

  // Si aggancia ad App.navigateTo per ridisegnarsi ogni volta che si apre la Dashboard,
  // senza dover modificare index.html per aggiungere la chiamata li'.
  const _hook = () => {
    if (typeof App === 'undefined' || App._staleThreadsHooked) return;
    const origNavigateTo = App.navigateTo;
    App.navigateTo = function(pageId) {
      origNavigateTo.apply(App, arguments);
      if (pageId === 'campagna') setTimeout(render, 150);
    };
    App._staleThreadsHooked = true;
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(_hook, 200));

  return { render, openItem };
})();

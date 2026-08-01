/* ============================================================
   SCHEDA-RAPIDA.JS — Scheda PNG compatta per consultazione al volo
   durante la sessione (voce/personalita', cosa vuole, gancio,
   segreto DM), senza aprire il form di modifica completo.
   Modulo autonomo: crea da solo il pulsante in topbar e il modal,
   inserendoli a runtime senza toccare il markup statico di index.html.
   ============================================================ */

const QuickCard = (() => {
  let _injected = false;

  const _injectModal = () => {
    if (_injected) return;
    _injected = true;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay hidden';
    overlay.id = 'modal-quickcard';
    overlay.style.display = 'none';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) Modal.close('quickcard'); });
    overlay.innerHTML =
      '<div class="modal" style="max-width:420px;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title">Scheda rapida PNG</h3>' +
          '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'quickcard\')">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<input id="qc-search" type="text" class="form-input" placeholder="Cerca PNG..." oninput="QuickCard.search(this.value)" style="margin-bottom:10px;">' +
          '<div id="qc-results"></div>' +
          '<div id="qc-card" style="display:none;"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  };

  const _block = (label, text, secret) =>
    '<div style="margin-bottom:10px;' + (secret ? 'background:rgba(255,107,107,0.08);border-left:3px solid #ff6b6b;padding:8px 10px;border-radius:0 var(--radius-md) var(--radius-md) 0;' : '') + '">' +
      '<div style="font-size:0.62rem;font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.06em;color:' + (secret ? '#ff6b6b' : 'var(--text-muted)') + ';margin-bottom:3px;">' + label + '</div>' +
      '<div style="font-size:0.88rem;line-height:1.6;white-space:pre-wrap;">' + text + '</div>' +
    '</div>';

  const _renderResults = (q) => {
    const camp = App.getActiveCampaign();
    const lc = (q || '').trim().toLowerCase();
    const npcs = (camp?.npcs || []).filter(n => !lc || (n.name || n.nome || '').toLowerCase().includes(lc));
    const el = document.getElementById('qc-results');
    if (!el) return;
    if (!npcs.length) { el.innerHTML = '<div class="text-muted text-sm" style="padding:8px 0;">Nessun PNG trovato.</div>'; return; }
    el.innerHTML = npcs.slice(0, 20).map(n => {
      const sub = n.ruolo || n.job || '';
      return '<button onclick="QuickCard.show(\'' + n.id + '\')" ' +
        'style="display:block;width:100%;text-align:left;padding:7px 10px;background:none;border:none;border-radius:var(--radius-sm);cursor:pointer;color:var(--text-primary);font-size:0.85rem;" ' +
        'onmouseenter="this.style.background=\'var(--bg-tertiary)\'" onmouseleave="this.style.background=\'none\'">' +
        '👤 ' + (n.name || n.nome || '') +
        (sub ? '<span style="color:var(--text-muted);font-size:0.75rem;"> — ' + sub + '</span>' : '') +
        '</button>';
    }).join('');
  };

  const open = () => {
    _injectModal();
    Modal.open('quickcard');
    const results = document.getElementById('qc-results');
    const card = document.getElementById('qc-card');
    const inp = document.getElementById('qc-search');
    if (results) results.style.display = '';
    if (card) card.style.display = 'none';
    if (inp) { inp.value = ''; setTimeout(() => inp.focus(), 50); }
    _renderResults('');
  };

  const search = (q) => _renderResults(q);

  const show = (id) => {
    const camp = App.getActiveCampaign();
    const n = (camp?.npcs || []).find(x => x.id === id);
    if (!n) return;
    const results = document.getElementById('qc-results');
    const card = document.getElementById('qc-card');
    if (results) results.style.display = 'none';
    if (!card) return;
    card.style.display = '';

    const personalita = n.personality || n.personalita || '';
    const vuole = n.wants || n.vuole || '';
    const gancio = n.gancio || '';
    const segreto = n.secret || n.segreto || '';

    card.innerHTML =
      '<button onclick="QuickCard.back()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.8rem;margin-bottom:12px;display:flex;align-items:center;gap:4px;">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg> Cerca un altro PNG' +
      '</button>' +
      '<h3 style="font-family:var(--font-display);margin:0 0 4px;font-size:1.1rem;">' + (n.name || n.nome || '') + '</h3>' +
      '<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:14px;">' + [n.ruolo || n.job, n.razza || n.race].filter(Boolean).join(' · ') + '</div>' +
      (personalita ? _block('Voce e personalità', personalita) : '') +
      (vuole ? _block('Vuole', vuole) : '') +
      (gancio ? _block('Gancio per il party', gancio) : '') +
      (segreto ? _block('🔒 Segreto DM', segreto, true) : '') +
      (!personalita && !vuole && !gancio && !segreto ? '<div class="text-muted text-sm">Nessun dettaglio compilato per questo PNG ancora.</div>' : '');
  };

  const back = () => {
    const results = document.getElementById('qc-results');
    const card = document.getElementById('qc-card');
    const inp = document.getElementById('qc-search');
    if (card) card.style.display = 'none';
    if (results) results.style.display = '';
    if (inp) inp.focus();
  };

  // Pulsante sempre raggiungibile in topbar, accanto allo Scratchpad — stessa logica di
  // "always-accessible" gia' usata per quello, ma senza toccare index.html.
  const _injectButton = () => {
    const actions = document.querySelector('.topbar-actions');
    if (!actions || document.getElementById('quickcard-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'quickcard-btn';
    btn.title = 'Scheda rapida PNG';
    btn.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1.1rem;padding:4px 8px;border-radius:var(--radius-sm);transition:background 0.15s;';
    btn.addEventListener('mouseenter', () => btn.style.background = 'var(--bg-tertiary)');
    btn.addEventListener('mouseleave', () => btn.style.background = 'none');
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
    btn.onclick = open;
    actions.insertBefore(btn, actions.firstChild);
  };

  document.addEventListener('DOMContentLoaded', () => {
    _injectButton();
    _injectModal();
  });

  return { open, search, show, back };
})();

/* ============================================================
   FAZIONI.JS — Gestione fazioni nel Mondo con immagini
   ============================================================ */

const Fazioni = (() => {
  let _editingId = null;

  const getAll = () => {
    const camp = App.getActiveCampaign();
    // Usa fazioni dalla campagna (stessa lista della sezione Campagna)
    return camp?.factions || [];
  };

  const relColor = (v) => {
    v = Math.max(0, Math.min(100, parseInt(v || 50)));
    if (v <= 25) return `rgb(200,${Math.round(60+v/25*100)},30)`;
    if (v <= 50) return `rgb(${Math.round(200-(v-25)/25*30)},${Math.round(160+(v-25)/25*60)},30)`;
    if (v <= 75) return `rgb(${Math.round(170-(v-50)/25*120)},${Math.round(200+(v-50)/25*20)},${Math.round(30+(v-50)/25*30)})`;
    return `rgb(${Math.round(50-(v-75)/25*30)},${Math.round(220-(v-75)/25*110)},${Math.round(60+(v-75)/25*150)})`;
  };

  const filter = () => render();

  const render = () => {
    const el = document.getElementById('fazioni-list');
    if (!el) return;

    const q = document.getElementById('fazioni-search')?.value?.toLowerCase() || '';
    let list = getAll().filter(f => !q || f.name.toLowerCase().includes(q));

    if (list.length === 0) {
      el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">🏛️</div>
        <h3>${getAll().length ? 'Nessuna fazione trovata' : 'Nessuna fazione ancora'}</h3>
        <p class="text-sm text-muted">Clicca "+ Nuova Fazione" per cominciare</p>
      </div>`;
      return;
    }

    el.innerHTML = list.map(f => {
      const pct = f.power ?? 50;
      const col = relColor(pct);
      const img = f.immagine;
      return `
        <div class="npc-card" onclick="Fazioni.openView('${f.id}')">
          ${img ? `<div style="height:80px;background:url('${img}') center/cover no-repeat;border-radius:var(--radius-lg) var(--radius-lg) 0 0;flex-shrink:0;"></div>` : ''}
          <div class="npc-card-header">
            <div class="npc-avatar">${f.icon || '🏛️'}</div>
            <div style="flex:1;min-width:0;">
              <div class="npc-name">${f.name}</div>
              <div class="npc-meta">${f.influence || ''}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;" onclick="event.stopPropagation()">
              <button class="btn btn-ghost btn-icon-sm" onclick="Fazioni.openModal(Fazioni._getById('${f.id}'))">✏️</button>
              <button class="btn btn-ghost btn-icon-sm" onclick="Fazioni.delete('${f.id}')">🗑️</button>
            </div>
          </div>
          <div class="npc-card-body">
            <div class="relation-bar-wrap">
              <div class="relation-bar-labels">
                <span>Debole</span>
                <span style="color:${col};font-weight:600;">${pct}%</span>
                <span>Dominante</span>
              </div>
              <div class="relation-bar-track">
                <div class="relation-bar-fill" style="width:${pct}%;background:${col};"></div>
              </div>
            </div>
            ${f.notes ? `<div class="text-xs text-muted" style="margin-top:6px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${f.notes}</div>` : ''}
          </div>
        </div>`;
    }).join('');
  };

  const _getById = (id) => getAll().find(f => f.id === id) || null;

  const openModal = (fazione) => {
    _editingId = fazione?.id || null;
    document.getElementById('fazione-mondo-title').textContent = fazione ? 'Modifica Fazione' : 'Nuova Fazione';
    document.getElementById('fazione-mondo-id').value = fazione?.id || '';

    const fields = {
      'fazione-mondo-nome':      fazione?.name      || '',
      'fazione-mondo-icon':      fazione?.icon      || '',
      'fazione-mondo-influenza': fazione?.influence || '',
      'fazione-mondo-obiettivi': fazione?.obiettivi || '',
      'fazione-mondo-relazioni': fazione?.relazioni || '',
      'fazione-mondo-note':      fazione?.notes     || '',
      'fazione-img-url':         fazione?.immagine  || '',
    };
    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id); if (el) el.value = val;
    });

    const powerEl = document.getElementById('fazione-mondo-power');
    const powerVal = document.getElementById('fazione-mondo-power-val');
    if (powerEl) powerEl.value = fazione?.power ?? 50;
    if (powerVal) powerVal.textContent = fazione?.power ?? 50;

    setImgPreview('fazione', fazione?.immagine || '');
    Modal.open('fazione-mondo');
    setTimeout(() => document.getElementById('fazione-mondo-nome')?.focus(), 100);
  };

  const submitModal = () => {
    const nome = document.getElementById('fazione-mondo-nome')?.value?.trim();
    if (!nome) { Toast.show('Inserisci un nome', 'warning'); return; }
    const camp = App.getActiveCampaign();
    if (!camp) return;

    const factions = [...(camp.factions || [])];
    const data = {
      name:      nome,
      icon:      document.getElementById('fazione-mondo-icon')?.value?.trim()      || '🏛️',
      power:     parseInt(document.getElementById('fazione-mondo-power')?.value)   || 50,
      influence: document.getElementById('fazione-mondo-influenza')?.value?.trim() || '',
      obiettivi: document.getElementById('fazione-mondo-obiettivi')?.value?.trim() || '',
      relazioni: document.getElementById('fazione-mondo-relazioni')?.value?.trim() || '',
      notes:     document.getElementById('fazione-mondo-note')?.value?.trim()      || '',
      immagine:  document.getElementById('fazione-img-url')?.value?.trim()         || '',
    };

    if (_editingId) {
      const idx = factions.findIndex(f => f.id === _editingId);
      if (idx !== -1) factions[idx] = { ...factions[idx], ...data };
    } else {
      factions.push({ id: 'faz_' + Date.now(), ...data });
    }

    App.saveActiveCampaign({ factions });
    Modal.close('fazione-mondo');
    render();
    // Aggiorna anche la lista fazioni nella pagina Campagna
    if (window.App) App.renderFactionList();
    Toast.show(_editingId ? 'Fazione aggiornata' : 'Fazione aggiunta', 'success');
    Debug.log(`Fazione salvata: ${nome}`);
  };

  const openView = (id) => {
    const f = _getById(id);
    if (!f) return;
    const pct = f.power ?? 50;
    const col = relColor(pct);

    const content = `
      ${f.immagine ? `<img src="${f.immagine}" style="width:100%;max-height:160px;object-fit:cover;border-radius:var(--radius-md);margin-bottom:var(--space-md);">` : ''}
      <div style="margin-bottom:var(--space-md);">
        <div class="relation-bar-labels"><span>Debole</span><span style="color:${col};font-weight:600;">${pct}% potere</span><span>Dominante</span></div>
        <div class="relation-bar-track"><div class="relation-bar-fill" style="width:${pct}%;background:${col};"></div></div>
      </div>
      ${f.influence ? `<div class="text-sm" style="margin-bottom:var(--space-sm);"><strong>Zona di influenza:</strong> ${f.influence}</div>` : ''}
      ${f.obiettivi ? `<div class="card card-accent" style="padding:var(--space-sm) var(--space-md);margin-bottom:var(--space-sm);"><div class="text-xs text-muted" style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.05em;">Obiettivi</div><div class="text-sm" style="margin-top:4px;">${f.obiettivi}</div></div>` : ''}
      ${f.relazioni ? `<div class="card" style="padding:var(--space-sm) var(--space-md);margin-bottom:var(--space-sm);"><div class="text-xs text-muted" style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.05em;">Relazioni</div><div class="text-sm" style="margin-top:4px;">${f.relazioni}</div></div>` : ''}
      ${f.notes ? `<div class="card card-gold" style="padding:var(--space-sm) var(--space-md);"><div class="text-xs" style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.05em;color:var(--accent-secondary);">🔒 Note DM</div><div class="text-sm" style="margin-top:4px;">${f.notes}</div></div>` : ''}
    `;

    const titleEl = document.getElementById('comp-detail-title');
    const bodyEl  = document.getElementById('comp-detail-body');
    const btn     = document.getElementById('comp-detail-combat-btn');
    if (titleEl) titleEl.textContent = (f.icon || '🏛️') + ' ' + f.name;
    if (bodyEl)  bodyEl.innerHTML = content;
    if (btn)     btn.style.display = 'none';
    Modal.open('comp-detail');
  };

  const _delete = (id) => {
    const f = _getById(id);
    openConfirmModal(`Eliminare "${f?.name}"?`, '', () => {
      const camp = App.getActiveCampaign();
      const factions = (camp?.factions || []).filter(x => x.id !== id);
      App.saveActiveCampaign({ factions });
      render();
      if (window.App) App.renderFactionList();
      Toast.show('Fazione eliminata', 'info');
    });
  };

  const init = () => { render(); Debug.log('Fazioni.init()'); };

  return { init, render, filter, openModal, submitModal, openView, delete: _delete, _getById };
})();

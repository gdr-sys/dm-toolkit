/* ============================================================
   LUOGHI.JS — Gestione luoghi con gerarchia e immagini
   ============================================================ */

const Luoghi = (() => {
  let _editingId = null;

  const tipoIcon = {
    regno: '🌍', citta: '🏙️', villaggio: '🏘️',
    dungeon: '⚔️', locanda: '🍺', edificio: '🏛️',
    natura: '🌲', altro: '📍'
  };

  const getAll = () => App.getActiveCampaign()?.locations || [];

  const filter = () => render();

  const render = () => {
    const el = document.getElementById('luoghi-list');
    if (!el) return;
    const camp = App.getActiveCampaign();
    if (!camp) return;

    const q    = document.getElementById('luoghi-search')?.value?.toLowerCase() || '';
    const tipo = document.getElementById('luoghi-filter-tipo')?.value || '';

    let list = getAll().filter(l => {
      if (q    && !l.nome.toLowerCase().includes(q)) return false;
      if (tipo && l.tipo !== tipo) return false;
      return true;
    });

    if (list.length === 0) {
      el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">🏰</div>
        <h3>${getAll().length ? 'Nessun luogo trovato' : 'Nessun luogo ancora'}</h3>
        <p class="text-sm text-muted">Clicca "+ Nuovo Luogo" per cominciare</p>
      </div>`;
      return;
    }

    el.innerHTML = list.map(l => {
      const parent = l.parentId ? getAll().find(x => x.id === l.parentId) : null;
      const img = l.immagine
        ? `<div style="height:100px;background:url('${l.immagine}') center/cover;border-radius:var(--radius-md) var(--radius-md) 0 0;margin:-var(--space-md) -var(--space-md) var(--space-sm);"></div>`
        : '';
      return `
        <div class="npc-card" onclick="Luoghi.openView('${l.id}')">
          ${l.immagine ? `<div style="height:90px;background:url('${l.immagine}') center/cover no-repeat;border-radius:var(--radius-lg) var(--radius-lg) 0 0;flex-shrink:0;"></div>` : ''}
          <div class="npc-card-header">
            <div class="npc-avatar">${l.icon || tipoIcon[l.tipo] || '📍'}</div>
            <div style="flex:1;min-width:0;">
              <div class="npc-name">${l.nome}</div>
              <div class="npc-meta">${l.tipo || ''} ${parent ? '· in ' + parent.nome : ''}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;" onclick="event.stopPropagation()">
              <button class="btn btn-ghost btn-icon-sm" onclick="Luoghi.openModal(Luoghi._getById('${l.id}'))">✏️</button>
              <button class="btn btn-ghost btn-icon-sm" onclick="Luoghi.delete('${l.id}')">🗑️</button>
            </div>
          </div>
          <div class="npc-card-body">
            ${l.desc ? `<div class="text-sm text-muted" style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${l.desc}</div>` : ''}
          </div>
        </div>`;
    }).join('');
  };

  const _getById = (id) => getAll().find(l => l.id === id) || null;

  const openModal = (luogo) => {
    _editingId = luogo?.id || null;
    document.getElementById('luogo-modal-title').textContent = luogo ? 'Modifica Luogo' : 'Nuovo Luogo';
    document.getElementById('luogo-id').value = luogo?.id || '';

    const fields = {
      'luogo-nome': luogo?.nome || '', 'luogo-tipo': luogo?.tipo || 'locanda',
      'luogo-icon': luogo?.icon || '', 'luogo-desc': luogo?.desc || '',
      'luogo-poi':  luogo?.poi  || '', 'luogo-loot': luogo?.loot || '',
      'luogo-note': luogo?.note || '', 'luogo-img-url': luogo?.immagine || '',
    };
    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id); if (el) el.value = val;
    });

    // Immagine preview
    setImgPreview('luogo', luogo?.immagine || '');

    // Popola select parent
    const parentSel = document.getElementById('luogo-parent');
    if (parentSel) {
      parentSel.innerHTML = '<option value="">— Nessuno (luogo radice) —</option>';
      getAll().filter(l => l.id !== luogo?.id).forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.id;
        opt.textContent = (tipoIcon[l.tipo] || '📍') + ' ' + l.nome;
        opt.selected = l.id === luogo?.parentId;
        parentSel.appendChild(opt);
      });
    }

    Modal.open('luogo');
    setTimeout(() => document.getElementById('luogo-nome')?.focus(), 100);
  };

  const submitModal = () => {
    const nome = document.getElementById('luogo-nome')?.value?.trim();
    if (!nome) { Toast.show('Inserisci un nome', 'warning'); return; }
    const camp = App.getActiveCampaign();
    if (!camp) return;

    const locations = [...(camp.locations || [])];
    const data = {
      nome,
      tipo:      document.getElementById('luogo-tipo')?.value || 'altro',
      icon:      document.getElementById('luogo-icon')?.value?.trim() || '',
      parentId:  document.getElementById('luogo-parent')?.value || '',
      desc:      document.getElementById('luogo-desc')?.value?.trim() || '',
      poi:       document.getElementById('luogo-poi')?.value?.trim() || '',
      loot:      document.getElementById('luogo-loot')?.value?.trim() || '',
      note:      document.getElementById('luogo-note')?.value?.trim() || '',
      immagine:  document.getElementById('luogo-img-url')?.value?.trim() || '',
    };

    if (_editingId) {
      const idx = locations.findIndex(l => l.id === _editingId);
      if (idx !== -1) locations[idx] = { ...locations[idx], ...data };
    } else {
      locations.push({ id: 'loc_' + Date.now(), ...data });
    }

    App.saveActiveCampaign({ locations });
    Modal.close('luogo');
    render();
    Toast.show(_editingId ? 'Luogo aggiornato' : 'Luogo aggiunto', 'success');
    Debug.log(`Luogo salvato: ${nome}`);
  };

  const openView = (id) => {
    const l = _getById(id);
    if (!l) return;
    const parent = l.parentId ? _getById(l.parentId) : null;
    const figli = getAll().filter(x => x.parentId === id);

    const content = `
      ${l.immagine ? `<img src="${l.immagine}" style="width:100%;max-height:200px;object-fit:cover;border-radius:var(--radius-md);margin-bottom:var(--space-md);">` : ''}
      <div class="text-xs text-muted" style="font-family:var(--font-display);letter-spacing:0.05em;text-transform:uppercase;margin-bottom:var(--space-sm);">
        ${tipoIcon[l.tipo] || '📍'} ${l.tipo || ''} ${parent ? '· dentro ' + parent.nome : ''}
      </div>
      ${l.desc ? `<div class="text-sm" style="line-height:1.7;margin-bottom:var(--space-md);">${l.desc}</div>` : ''}
      ${l.poi ? `<div class="card card-accent" style="margin-bottom:var(--space-sm);padding:var(--space-sm) var(--space-md);"><div class="text-xs text-muted" style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.05em;">Punti di Interesse / PNG</div><div class="text-sm" style="margin-top:4px;">${l.poi}</div></div>` : ''}
      ${l.loot ? `<div class="card card-gold" style="margin-bottom:var(--space-sm);padding:var(--space-sm) var(--space-md);"><div class="text-xs" style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.05em;color:var(--accent-secondary);">🎁 Loot / Tesoro</div><div class="text-sm" style="margin-top:4px;">${l.loot}</div></div>` : ''}
      ${l.note ? `<div class="card" style="padding:var(--space-sm) var(--space-md);"><div class="text-xs text-muted" style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.05em;">Note DM 🔒</div><div class="text-sm" style="margin-top:4px;">${l.note}</div></div>` : ''}
      ${figli.length ? `<div style="margin-top:var(--space-md);"><div class="comp-cat-header">Luoghi interni</div>${figli.map(f => `<div class="comp-row" onclick="Luoghi.openView('${f.id}')"><div class="comp-row-main"><span class="comp-row-name">${tipoIcon[f.tipo] || '📍'} ${f.nome}</span></div></div>`).join('')}</div>` : ''}
    `;

    const titleEl = document.getElementById('comp-detail-title');
    const bodyEl  = document.getElementById('comp-detail-body');
    const btn     = document.getElementById('comp-detail-combat-btn');
    if (titleEl) titleEl.textContent = (l.icon || tipoIcon[l.tipo] || '📍') + ' ' + l.nome;
    if (bodyEl)  bodyEl.innerHTML = content;
    if (btn)     btn.style.display = 'none';
    Modal.open('comp-detail');
  };

  const _delete = (id) => {
    openConfirmModal('Eliminare questo luogo?', 'I luoghi interni rimarranno ma perderanno il genitore.', () => {
      const camp = App.getActiveCampaign();
      let locations = (camp?.locations || []).filter(l => l.id !== id);
      // Rimuovi parentId dai figli
      locations = locations.map(l => l.parentId === id ? { ...l, parentId: '' } : l);
      App.saveActiveCampaign({ locations });
      render();
      Toast.show('Luogo eliminato', 'info');
    });
  };

  const init = () => { render(); Debug.log('Luoghi.init()'); };

  return { init, render, filter, openModal, submitModal, openView, delete: _delete, _getById };
})();

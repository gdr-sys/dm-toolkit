/* ============================================================
   NPC.JS — Modulo PNG completo
   ============================================================ */

const NPC = (() => {
  let _editingId = null;
  let _viewingId = null;
  let _flipped    = false;

  // ── Modificatore caratteristica ──
  const mod = (v) => {
    const m = Math.floor((parseInt(v || 10) - 10) / 2);
    return (m >= 0 ? '+' : '') + m;
  };

  // ── Colore gradiente continuo rosso→giallo→verde→blu ──
  const relColor = (v) => {
    v = Math.max(0, Math.min(100, parseInt(v)));
    let r, g, b;
    if (v <= 25) {
      const t = v / 25;
      r = 200; g = Math.round(60 + t * 100); b = 30;
    } else if (v <= 50) {
      const t = (v - 25) / 25;
      r = Math.round(200 - t * 30); g = Math.round(160 + t * 60); b = 30;
    } else if (v <= 75) {
      const t = (v - 50) / 25;
      r = Math.round(170 - t * 120); g = Math.round(200 + t * 20); b = Math.round(30 + t * 30);
    } else {
      const t = (v - 75) / 25;
      r = Math.round(50 - t * 30); g = Math.round(220 - t * 110); b = Math.round(60 + t * 150);
    }
    return `rgb(${r},${g},${b})`;
  };

  // ── Label relazione ──
  const relLabel = (v) => {
    v = parseInt(v);
    if (v <= 15)  return '😡 Ostile';
    if (v <= 30)  return '😤 Diffidente';
    if (v <= 45)  return '😐 Sospettoso';
    if (v <= 55)  return '😶 Neutrale';
    if (v <= 70)  return '🙂 Cordiale';
    if (v <= 85)  return '😊 Amichevole';
    if (v <= 95)  return '😄 Fidato';
    return '💚 Alleato';
  };

  // ── Aggiorna barra preview nel modal ──
  const updateRelationPreview = (v) => {
    const bar = document.getElementById('nm-rel-bar');
    const lbl = document.getElementById('nm-rel-label');
    const val = document.getElementById('nm-rel-val');
    if (bar) { bar.style.width = v + '%'; bar.style.background = relColor(v); }
    if (lbl) lbl.textContent = relLabel(v);
    if (val) val.textContent = v;
  };

  // ── Popola select fazioni ──
  const populateFactionSelect = () => {
    const camp = App.getActiveCampaign();
    const factions = camp?.factions || [];
    ['nm-faction', 'npc-filter-faction'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const cur = sel.value;
      while (sel.options.length > 1) sel.remove(1);
      factions.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name;
        sel.appendChild(opt);
      });
      sel.value = cur;
    });
  };

  // ── Azioni nel modal combattimento ──
  const addAction = () => {
    const list = document.getElementById('nm-actions-list');
    if (!list) return;
    const id = 'act_' + Date.now();
    const row = document.createElement('div');
    row.className = 'action-item';
    row.dataset.actionId = id;
    row.innerHTML = `
      <div style="flex:1;">
        <input type="text" class="form-input action-name" placeholder="Nome azione (es. Spada corta)" style="margin-bottom:4px;">
        <input type="text" class="form-input action-desc" placeholder="Descrizione (es. +4 al colpire, 1d6+2 perforanti)">
      </div>
      <button class="btn btn-ghost btn-icon-sm" onclick="this.closest('.action-item').remove()" style="flex-shrink:0;margin-top:4px;">🗑️</button>
    `;
    list.appendChild(row);
  };

  const getActions = () => {
    const rows = document.querySelectorAll('#nm-actions-list .action-item');
    return Array.from(rows).map(r => ({
      name: r.querySelector('.action-name')?.value?.trim() || '',
      desc: r.querySelector('.action-desc')?.value?.trim() || '',
    })).filter(a => a.name);
  };

  const renderActionsInModal = (actions) => {
    const list = document.getElementById('nm-actions-list');
    if (!list) return;
    list.innerHTML = '';
    (actions || []).forEach(a => {
      const id = 'act_' + Date.now() + Math.random();
      const row = document.createElement('div');
      row.className = 'action-item';
      row.dataset.actionId = id;
      row.innerHTML = `
        <div style="flex:1;">
          <input type="text" class="form-input action-name" value="${a.name}" placeholder="Nome azione" style="margin-bottom:4px;">
          <input type="text" class="form-input action-desc" value="${a.desc}" placeholder="Descrizione">
        </div>
        <button class="btn btn-ghost btn-icon-sm" onclick="this.closest('.action-item').remove()" style="flex-shrink:0;margin-top:4px;">🗑️</button>
      `;
      list.appendChild(row);
    });
  };

  // ── Switch tab modal ──
  const switchModalTab = (tab) => {
    const ruolo  = document.getElementById('npc-modal-ruolo');
    const combat = document.getElementById('npc-modal-combat');
    const btnR   = document.getElementById('npc-tab-ruolo-btn');
    const btnC   = document.getElementById('npc-tab-combat-btn');
    if (!ruolo || !combat) return;
    if (tab === 'ruolo') {
      ruolo.style.display  = '';
      combat.style.display = 'none';
      btnR?.classList.add('active');
      btnC?.classList.remove('active');
    } else {
      ruolo.style.display  = 'none';
      combat.style.display = '';
      btnR?.classList.remove('active');
      btnC?.classList.add('active');
    }
  };

  // ── Apri modal crea / modifica ──
  const openModal = (npc) => {
    _editingId = npc ? npc.id : null;
    populateFactionSelect();
    switchModalTab('ruolo');
    document.getElementById('npc-modal-title').textContent = npc ? 'Modifica PNG' : 'Nuovo PNG';

    const fields = {
      'nm-name':  npc?.name  || '', 'nm-race': npc?.race || '',
      'nm-job':   npc?.job   || '', 'nm-icon': npc?.icon || '',
      'nm-voice': npc?.voice || '', 'nm-tic':  npc?.tic  || '',
      'nm-trait':  npc?.trait  || '', 'nm-secret': npc?.secret || '',
      'nm-wants':  npc?.wants  || '', 'nm-offers': npc?.offers || '',
      'nm-links':  npc?.links  || '',
      'nm-cr':    npc?.cr    || '', 'nm-hp':    npc?.hp    || '',
      'nm-ac':    npc?.ac    || '', 'nm-speed': npc?.speed || '',
      'nm-type':  npc?.type  || '',
      'nm-str':   npc?.str   || '', 'nm-dex': npc?.dex || '',
      'nm-con':   npc?.con   || '', 'nm-int': npc?.int_ || '',
      'nm-wis':   npc?.wis   || '', 'nm-cha': npc?.cha  || '',
      'nm-immunities':   npc?.immunities   || '',
      'nm-senses':       npc?.senses       || '',
      'nm-languages':    npc?.languages    || '',
      'nm-special':      npc?.special      || '',
      'nm-combat-notes': npc?.combatNotes  || '',
    };
    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });

    const alignEl = document.getElementById('nm-align');
    if (alignEl) alignEl.value = npc?.align || '';
    const facEl = document.getElementById('nm-faction');
    if (facEl) facEl.value = npc?.factionId || '';

    const rel = npc?.relation ?? 50;
    const relEl = document.getElementById('nm-relation');
    if (relEl) relEl.value = rel;
    updateRelationPreview(rel);
    renderActionsInModal(npc?.actions || []);

    // Immagine
    if (window.setImgPreview) setImgPreview('npc', npc?.immagine || '');
    const imgUrlEl = document.getElementById('npc-img-url');
    if (imgUrlEl) imgUrlEl.value = npc?.immagine || '';

    Modal.open('npc');
    setTimeout(() => document.getElementById('nm-name')?.focus(), 100);
    Debug.log(`NPC modal: ${npc ? npc.name : 'nuovo'}`);
  };

  // ── Salva ──
  const submitModal = () => {
    const name = document.getElementById('nm-name')?.value?.trim();
    if (!name) { Toast.show('Inserisci un nome', 'warning'); return; }

    const camp = App.getActiveCampaign();
    if (!camp) return;

    const npcs = [...(camp.npcs || [])];
    const relation = parseInt(document.getElementById('nm-relation')?.value) || 50;

    const data = {
      name,
      race:     document.getElementById('nm-race')?.value?.trim()   || '',
      job:      document.getElementById('nm-job')?.value?.trim()    || '',
      icon:     document.getElementById('nm-icon')?.value?.trim()   || '👤',
      voice:    document.getElementById('nm-voice')?.value?.trim()  || '',
      tic:      document.getElementById('nm-tic')?.value?.trim()    || '',
      trait:    document.getElementById('nm-trait')?.value?.trim()  || '',
      secret:   document.getElementById('nm-secret')?.value?.trim() || '',
      wants:    document.getElementById('nm-wants')?.value?.trim()  || '',
      offers:   document.getElementById('nm-offers')?.value?.trim() || '',
      links:    document.getElementById('nm-links')?.value?.trim()  || '',
      factionId: document.getElementById('nm-faction')?.value       || '',
      relation,
      cr:     document.getElementById('nm-cr')?.value?.trim()    || '',
      hp:     document.getElementById('nm-hp')?.value?.trim()    || '',
      ac:     document.getElementById('nm-ac')?.value?.trim()    || '',
      speed:  document.getElementById('nm-speed')?.value?.trim() || '',
      type:   document.getElementById('nm-type')?.value?.trim()  || '',
      align:  document.getElementById('nm-align')?.value         || '',
      str:    document.getElementById('nm-str')?.value           || '',
      dex:    document.getElementById('nm-dex')?.value           || '',
      con:    document.getElementById('nm-con')?.value           || '',
      int_:   document.getElementById('nm-int')?.value           || '',
      wis:    document.getElementById('nm-wis')?.value           || '',
      cha:    document.getElementById('nm-cha')?.value           || '',
      immunities:  document.getElementById('nm-immunities')?.value?.trim()   || '',
      senses:      document.getElementById('nm-senses')?.value?.trim()       || '',
      languages:   document.getElementById('nm-languages')?.value?.trim()    || '',
      special:     document.getElementById('nm-special')?.value?.trim()      || '',
      combatNotes: document.getElementById('nm-combat-notes')?.value?.trim() || '',
      actions: getActions(),
      immagine: document.getElementById('npc-img-url')?.value?.trim() || '',
    };

    if (_editingId) {
      const idx = npcs.findIndex(n => n.id === _editingId);
      if (idx !== -1) npcs[idx] = { ...npcs[idx], ...data };
    } else {
      npcs.push({ id: 'npc_' + Date.now(), ...data });
    }

    App.saveActiveCampaign({ npcs });
    Modal.close('npc');
    render();
    Toast.show(_editingId ? 'PNG aggiornato' : 'PNG aggiunto', 'success');
    Debug.log(`NPC salvato: ${name}`);
  };

  // ── Apri scheda visualizzazione ──
  const openView = (id) => {
    const camp = App.getActiveCampaign();
    const npc = (camp?.npcs || []).find(n => n.id === id);
    if (!npc) return;
    _viewingId = id;
    _flipped = false;

    document.getElementById('npc-view-icon').textContent = npc.icon || '👤';
    document.getElementById('npc-view-name').textContent = npc.name;
    document.getElementById('npc-view-meta').textContent = [npc.race, npc.job].filter(Boolean).join(' · ');

    const inner = document.getElementById('npc-flip-inner');
    if (inner) inner.classList.remove('flipped');
    const flipBtn = document.getElementById('npc-flip-btn');
    if (flipBtn) flipBtn.textContent = '⚔️ Combattimento';

    const rel = npc.relation ?? 50;
    const fill = document.getElementById('npc-view-rel-fill');
    const lbl  = document.getElementById('npc-view-rel-label');
    const val  = document.getElementById('npc-view-rel-val');
    if (fill) { fill.style.width = rel + '%'; fill.style.background = relColor(rel); }
    if (lbl)  lbl.textContent = relLabel(rel);
    if (val)  val.textContent = rel + ' / 100';

    const setText = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt || '—'; };
    setText('npc-view-trait',  npc.trait);
    setText('npc-view-secret', npc.secret);
    setText('npc-view-wants',  npc.wants);
    setText('npc-view-offers', npc.offers);
    setText('npc-view-links',  npc.links);
    setText('npc-view-voice',  [npc.voice, npc.tic].filter(Boolean).join(' · '));

    setText('sb-name',     npc.name);
    setText('sb-subtitle', [npc.type || 'Umanoide', npc.align].filter(Boolean).join(', '));
    setText('sb-ac',    npc.ac);
    setText('sb-hp',    npc.hp);
    setText('sb-speed', npc.speed);
    setText('sb-cr',    npc.cr);

    const abilities = document.getElementById('sb-abilities');
    if (abilities) {
      const stats = [['FOR', npc.str], ['DES', npc.dex], ['COS', npc.con], ['INT', npc.int_], ['SAG', npc.wis], ['CAR', npc.cha]];
      abilities.innerHTML = stats.map(([abbr, v]) => `
        <div class="stat-ability-box">
          <div class="stat-ability-name">${abbr}</div>
          <div class="stat-ability-score">${v || 10}</div>
          <div class="stat-ability-mod">${mod(v || 10)}</div>
        </div>`).join('');
    }

    const showRow = (rowId, spanId, v) => {
      const row = document.getElementById(rowId);
      const span = document.getElementById(spanId);
      if (!row || !span) return;
      row.style.display = v ? '' : 'none';
      if (v) span.textContent = v;
    };
    showRow('sb-immunities-row', 'sb-immunities', npc.immunities);
    showRow('sb-senses-row',     'sb-senses',     npc.senses);
    showRow('sb-lang-row',       'sb-languages',  npc.languages);

    const special = document.getElementById('sb-special');
    if (special) special.innerHTML = npc.special
      ? npc.special.split('\n').map(l => `<p style="margin-bottom:4px;font-size:0.85rem;">${l}</p>`).join('')
      : '';

    const actList = document.getElementById('sb-actions');
    if (actList) {
      actList.innerHTML = (npc.actions || []).map(a =>
        `<li class="action-item"><div><strong>${a.name}.</strong> ${a.desc}</div></li>`
      ).join('') || '<li class="text-muted text-sm" style="padding:6px 0;">Nessuna azione inserita</li>';
    }

    const notes = document.getElementById('sb-notes');
    if (notes) notes.textContent = npc.combatNotes || '';

    Modal.open('npc-view');
    Debug.log(`NPC view: ${npc.name}`);
  };

  // ── Flip card ──
  const flipCard = () => {
    _flipped = !_flipped;
    document.getElementById('npc-flip-inner')?.classList.toggle('flipped', _flipped);
    const btn = document.getElementById('npc-flip-btn');
    if (btn) btn.textContent = _flipped ? '🎭 Ruolo' : '⚔️ Combattimento';
  };

  // ── Modifica dalla view ──
  const editFromView = () => {
    if (!_viewingId) return;
    const camp = App.getActiveCampaign();
    const npc = (camp?.npcs || []).find(n => n.id === _viewingId);
    if (!npc) return;
    Modal.close('npc-view');
    setTimeout(() => openModal(npc), 200);
  };

  // ── Click sulla barra per cambiare relazione ──
  const quickRelChange = (e) => {
    if (!_viewingId) return;
    const track = document.getElementById('npc-view-rel-track');
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const v = Math.max(0, Math.min(100, pct));

    const camp = App.getActiveCampaign();
    const npcs = [...(camp?.npcs || [])];
    const idx = npcs.findIndex(n => n.id === _viewingId);
    if (idx === -1) return;

    npcs[idx].relation = v;
    App.saveActiveCampaign({ npcs });

    const fill = document.getElementById('npc-view-rel-fill');
    const lbl  = document.getElementById('npc-view-rel-label');
    const valEl= document.getElementById('npc-view-rel-val');
    if (fill)  { fill.style.width = v + '%'; fill.style.background = relColor(v); }
    if (lbl)   lbl.textContent = relLabel(v);
    if (valEl) valEl.textContent = v + ' / 100';

    render();
    Debug.log(`Relazione ${npcs[idx].name}: ${v}`);
  };

  // ── Elimina ──
  const deleteNPC = (id) => {
    openConfirmModal('Eliminare questo PNG?', 'I dati andranno persi.', () => {
      const camp = App.getActiveCampaign();
      const npcs = (camp?.npcs || []).filter(n => n.id !== id);
      App.saveActiveCampaign({ npcs });
      render();
      Toast.show('PNG eliminato', 'info');
    });
  };

  // ── Render lista ──
  const render = () => {
    const camp = App.getActiveCampaign();
    const el = document.getElementById('npc-list');
    if (!el) return;

    const search  = document.getElementById('npc-search')?.value?.toLowerCase() || '';
    const facFilt = document.getElementById('npc-filter-faction')?.value || '';

    let npcs = camp?.npcs || [];
    if (search)  npcs = npcs.filter(n =>
      n.name.toLowerCase().includes(search) ||
      (n.race || '').toLowerCase().includes(search) ||
      (n.job  || '').toLowerCase().includes(search)
    );
    if (facFilt) npcs = npcs.filter(n => n.factionId === facFilt);

    if (npcs.length === 0) {
      el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">👤</div>
        <h3>${camp?.npcs?.length ? 'Nessun PNG trovato' : 'Nessun PNG ancora'}</h3>
        <p class="text-sm text-muted">${camp?.npcs?.length ? 'Prova a modificare i filtri' : 'Clicca "+ Nuovo PNG" per cominciare'}</p>
      </div>`;
      return;
    }

    el.innerHTML = npcs.map(npc => {
      const rel = npc.relation ?? 50;
      const col = relColor(rel);
      const lbl = relLabel(rel);
      const facName = camp?.factions?.find(f => f.id === npc.factionId)?.name || '';
      return `
        <div class="npc-card" onclick="NPC.openView('${npc.id}')">
          ${npc.immagine ? `<div style="height:90px;background:url('${npc.immagine}') center/cover no-repeat;border-radius:var(--radius-lg) var(--radius-lg) 0 0;flex-shrink:0;"></div>` : ''}
          <div class="npc-card-header">
            <div class="npc-avatar">${npc.icon || '👤'}</div>
            <div style="flex:1;min-width:0;">
              <div class="npc-name">${npc.name}</div>
              <div class="npc-meta">${[npc.race, npc.job].filter(Boolean).join(' · ') || '—'}</div>
              ${facName ? `<span class="badge badge-muted" style="margin-top:3px;">${facName}</span>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;" onclick="event.stopPropagation()">
              <button class="btn btn-ghost btn-icon-sm" title="Modifica"
                onclick="NPC.openModal((App.getActiveCampaign()?.npcs||[]).find(n=>n.id==='${npc.id}'))">✏️</button>
              <button class="btn btn-ghost btn-icon-sm" title="Elimina"
                onclick="NPC.deleteNPC('${npc.id}')">🗑️</button>
            </div>
          </div>
          <div class="npc-card-body">
            ${npc.trait ? `<div class="text-sm text-muted" style="margin-bottom:var(--space-sm);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${npc.trait}</div>` : ''}
            <div class="relation-bar-wrap">
              <div class="relation-bar-labels">
                <span>Ostile</span>
                <span style="color:${col};font-weight:600;">${lbl}</span>
                <span>Alleato</span>
              </div>
              <div class="relation-bar-track">
                <div class="relation-bar-fill" style="width:${rel}%;background:${col};"></div>
              </div>
              <div class="relation-bar-value">${rel}/100</div>
            </div>
          </div>
        </div>`;
    }).join('');
  };

  const filter = () => render();

  const init = () => {
    populateFactionSelect();
    render();
    Debug.log('NPC.init()');
  };

  return {
    init, render, filter,
    openModal, submitModal,
    openView, flipCard, editFromView,
    quickRelChange, updateRelationPreview,
    addAction, deleteNPC, switchModalTab,
  };
})();

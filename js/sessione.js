/* ============================================================
   SESSIONE.JS — Combat Tracker + Party + Tempo
   ============================================================ */

const Sessione = (() => {

  // ── Stato ──
  let _combat = null;       // scontro attivo in memoria
  let _sortedCombatants = []; // ordinati per iniziativa

  // ── Condizioni D&D 5e ──
  const CONDIZIONI = [
    'Accecato','Affascinato','Afferrato','Assordato','Avvelenato',
    'Esausto','Incapacitato','Indebolimento','Invisibile','Paralizzato',
    'Pietrificato','Prono','Rallentato','Restrained','Spaventato','Stordito'
  ];

  // ── Helper dado ──
  const rollD = (faces) => Math.floor(Math.random() * faces) + 1;
  const rollInit = (dex_mod = 0) => rollD(20) + parseInt(dex_mod || 0);

  // ── Carica/salva stato combat ──
  const loadCombat = () => {
    const camp = App.getActiveCampaign();
    if (!camp) return null;
    return camp.activeCombat || null;
  };

  const saveCombat = (combat) => {
    _combat = combat;
    App.saveActiveCampaign({ activeCombat: combat });
  };

  const saveParty = (party) => {
    App.saveActiveCampaign({ party });
  };

  // ── Init pagina ──
  const init = () => {
    const camp = App.getActiveCampaign();
    if (!camp) { renderNoCampaign(); return; }

    // Controlla se ci sono combatant in arrivo dal Compendio
    if (camp.pendingCombatants && camp.pendingCombatants.length > 0) {
      if (_combat) {
        camp.pendingCombatants.forEach(c => addCombatantToCurrent(c));
      }
      App.saveActiveCampaign({ pendingCombatants: [] });
    }

    _combat = loadCombat();
    renderParty();
    renderCombat();
    renderSavedSessions();
    Debug.log('Sessione.init()');
  };

  // ── Render: nessuna campagna ──
  const renderNoCampaign = () => {
    const el = document.getElementById('sessione-content');
    if (el) el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚔️</div><h3>Seleziona una campagna</h3><p class="text-sm text-muted">Apri una campagna dalla home per usare il Combat Tracker</p></div>`;
  };

  // ══════════════════════════════════════════════════════
  // PARTY
  // ══════════════════════════════════════════════════════
  const renderParty = () => {
    const camp = App.getActiveCampaign();
    const party = camp?.party || [];
    const el = document.getElementById('party-list');
    if (!el) return;

    if (party.length === 0) {
      el.innerHTML = `<div class="text-muted text-sm" style="padding:var(--space-md);">Nessun personaggio nel party. Aggiungili per vedere le percezioni passive.</div>`;
      return;
    }

    el.innerHTML = party.map(pg => `
      <div class="party-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div>
            <div style="font-family:var(--font-display);font-size:0.9rem;">${pg.nome}</div>
            <div class="text-xs text-muted">${pg.giocatore || ''} · Liv. ${pg.livello || '?'}</div>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-ghost btn-icon-sm" onclick="Sessione.editPG('${pg.id}')">✏️</button>
            <button class="btn btn-ghost btn-icon-sm" onclick="Sessione.deletePG('${pg.id}')">🗑️</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;text-align:center;">
          <div class="party-stat-box" title="Percezione Passiva">
            <div class="party-stat-label">Perc.</div>
            <div class="party-stat-value">${pg.percezionePassiva || 10}</div>
          </div>
          <div class="party-stat-box" title="Investigazione Passiva">
            <div class="party-stat-label">Invest.</div>
            <div class="party-stat-value">${pg.investigazionePassiva || 10}</div>
          </div>
          <div class="party-stat-box" title="Intuizione Passiva">
            <div class="party-stat-label">Intui.</div>
            <div class="party-stat-value">${pg.intuizionePassiva || 10}</div>
          </div>
        </div>
        <div style="display:flex;gap:4px;margin-top:6px;justify-content:center;">
          <span class="comp-stat-pill">PF ${pg.hpAttuali || pg.hpMax || '?'}/${pg.hpMax || '?'}</span>
          <span class="comp-stat-pill">CA ${pg.ca || '?'}</span>
          ${pg.inspirazione ? '<span class="badge badge-gold">✨ Ispirazione</span>' : ''}
        </div>
      </div>
    `).join('');
  };

  const addPG = () => openPGModal(null);
  const editPG = (id) => {
    const camp = App.getActiveCampaign();
    const pg = (camp?.party || []).find(p => p.id === id);
    if (pg) openPGModal(pg);
  };
  const deletePG = (id) => {
    openConfirmModal('Rimuovere questo personaggio?', '', () => {
      const camp = App.getActiveCampaign();
      const party = (camp?.party || []).filter(p => p.id !== id);
      saveParty(party);
      renderParty();
      Toast.show('Personaggio rimosso', 'info');
    });
  };

  const openPGModal = (pg) => {
    const fields = {
      'pg-nome': pg?.nome || '', 'pg-giocatore': pg?.giocatore || '',
      'pg-livello': pg?.livello || '', 'pg-classe': pg?.classe || '',
      'pg-hp-max': pg?.hpMax || '', 'pg-hp-attuali': pg?.hpAttuali || '',
      'pg-ca': pg?.ca || '', 'pg-iniziativa-bonus': pg?.iniziativaBonus || '0',
      'pg-perc': pg?.percezionePassiva || '10',
      'pg-invest': pg?.investigazionePassiva || '10',
      'pg-intui': pg?.intuizionePassiva || '10',
    };
    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
    document.getElementById('pg-modal-id').value = pg?.id || '';
    document.getElementById('pg-modal-title').textContent = pg ? 'Modifica Personaggio' : 'Aggiungi Personaggio';
    document.getElementById('pg-inspirazione').checked = pg?.inspirazione || false;
    Modal.open('pg-modal');
    setTimeout(() => document.getElementById('pg-nome')?.focus(), 100);
  };

  const submitPG = () => {
    const nome = document.getElementById('pg-nome')?.value?.trim();
    if (!nome) { Toast.show('Inserisci un nome', 'warning'); return; }
    const camp = App.getActiveCampaign();
    const party = [...(camp?.party || [])];
    const id = document.getElementById('pg-modal-id')?.value;
    const hpMax = parseInt(document.getElementById('pg-hp-max')?.value) || 0;

    const data = {
      nome, id: id || 'pg_' + Date.now(),
      giocatore: document.getElementById('pg-giocatore')?.value?.trim() || '',
      livello:   parseInt(document.getElementById('pg-livello')?.value) || 1,
      classe:    document.getElementById('pg-classe')?.value?.trim() || '',
      hpMax,
      hpAttuali: parseInt(document.getElementById('pg-hp-attuali')?.value) || hpMax,
      ca:        parseInt(document.getElementById('pg-ca')?.value) || 10,
      iniziativaBonus: parseInt(document.getElementById('pg-iniziativa-bonus')?.value) || 0,
      percezionePassiva:     parseInt(document.getElementById('pg-perc')?.value)   || 10,
      investigazionePassiva: parseInt(document.getElementById('pg-invest')?.value) || 10,
      intuizionePassiva:     parseInt(document.getElementById('pg-intui')?.value)  || 10,
      inspirazione: document.getElementById('pg-inspirazione')?.checked || false,
    };

    if (id) {
      const idx = party.findIndex(p => p.id === id);
      if (idx !== -1) party[idx] = data;
    } else {
      party.push(data);
    }
    saveParty(party);
    Modal.close('pg-modal');
    renderParty();
    Toast.show(id ? 'Personaggio aggiornato' : 'Personaggio aggiunto', 'success');
    Debug.log(`PG ${id ? 'aggiornato' : 'aggiunto'}: ${nome}`);
  };

  // Aggiunge PG al combat tracker dalla lista party
  const addPGtoCombat = () => {
    const camp = App.getActiveCampaign();
    const party = camp?.party || [];
    if (!party.length) { Toast.show('Nessun personaggio nel party', 'warning'); return; }
    if (!_combat) newCombat();

    party.forEach(pg => {
      const exists = _combat.combatants.find(c => c.pgId === pg.id);
      if (!exists) {
        _combat.combatants.push({
          id: 'comb_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
          nome: pg.nome,
          tipo: 'pg',
          pgId: pg.id,
          hp: pg.hpAttuali || pg.hpMax || 0,
          maxHp: pg.hpMax || 0,
          ca: pg.ca || 10,
          iniziativa: rollInit(pg.iniziativaBonus),
          iniziativaBonus: pg.iniziativaBonus || 0,
          condizioni: [],
          note: '',
          concentrazione: false,
        });
      }
    });
    sortCombatants();
    saveCombat(_combat);
    renderCombat();
    Toast.show('Party aggiunto al combat', 'success');
  };

  // ══════════════════════════════════════════════════════
  // COMBAT TRACKER
  // ══════════════════════════════════════════════════════
  const newCombat = () => {
    const camp = App.getActiveCampaign();
    _combat = {
      id: 'scontro_' + Date.now(),
      nome: 'Scontro ' + new Date().toLocaleDateString('it-IT'),
      turno: 0,           // indice del combatant attivo
      round: 1,
      status: 'attivo',   // attivo | pausa | concluso
      combatants: [],
      iniziataAt: Date.now(),
      campagnaId: camp?.id || '',
    };
    saveCombat(_combat);
    renderCombat();
    Debug.log('Nuovo combat creato');
  };

  const sortCombatants = () => {
    if (!_combat) return;
    _sortedCombatants = [..._combat.combatants].sort((a, b) => {
      if (b.iniziativa !== a.iniziativa) return b.iniziativa - a.iniziativa;
      // parità: PG prima di mostri
      if (a.tipo === 'pg' && b.tipo !== 'pg') return -1;
      if (b.tipo === 'pg' && a.tipo !== 'pg') return 1;
      return a.nome.localeCompare(b.nome, 'it');
    });
  };

  const renderCombat = () => {
    const el = document.getElementById('combat-tracker');
    if (!el) return;

    if (!_combat || !_combat.combatants.length) {
      el.innerHTML = `
        <div class="empty-state" style="padding:var(--space-2xl);">
          <div class="empty-state-icon">⚔️</div>
          <h3>Nessuno scontro attivo</h3>
          <p class="text-sm text-muted">Inizia un nuovo scontro oppure aggiungi combatenti</p>
          <div style="display:flex;gap:var(--space-sm);justify-content:center;margin-top:var(--space-md);">
            <button class="btn btn-primary" onclick="Sessione.newCombat()">⚔️ Nuovo Scontro</button>
            <button class="btn btn-secondary" onclick="Sessione.addPGtoCombat()">👥 Aggiungi Party</button>
          </div>
        </div>`;
      return;
    }

    sortCombatants();
    const round = _combat.round || 1;
    const turnoIdx = _combat.turno || 0;
    const activeCombatant = _sortedCombatants[turnoIdx] || null;

    el.innerHTML = `
      <!-- Header combat -->
      <div class="combat-header">
        <div style="display:flex;align-items:center;gap:var(--space-md);">
          <div class="combat-round-badge">Round ${round}</div>
          <div>
            <div style="font-family:var(--font-display);font-size:1rem;">${_combat.nome}</div>
            ${activeCombatant ? `<div class="text-xs text-muted">Turno di: <strong style="color:var(--accent-secondary);">${activeCombatant.nome}</strong></div>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:var(--space-sm);">
          <button class="btn btn-primary btn-sm" onclick="Sessione.nextTurn()">▶ Avanti</button>
          <button class="btn btn-secondary btn-sm" onclick="Sessione.addMonsterQuick()">+ Mostro</button>
          <button class="btn btn-secondary btn-sm" onclick="Sessione.rollAllInitiative()">🎲 Init tutti</button>
          <button class="btn btn-ghost btn-sm" onclick="Sessione.saveCombatSession()">💾 Salva</button>
          <button class="btn btn-danger btn-sm" onclick="Sessione.endCombat()">■ Fine</button>
        </div>
      </div>

      <!-- Lista combatenti -->
      <div class="combat-list" id="combat-list">
        ${_sortedCombatants.map((c, idx) => renderCombatant(c, idx === turnoIdx)).join('')}
      </div>

      <!-- Footer: aggiungi -->
      <div class="combat-footer">
        <button class="btn btn-ghost btn-sm" onclick="Sessione.addPGtoCombat()">👥 + Party</button>
        <button class="btn btn-ghost btn-sm" onclick="Sessione.addMonsterQuick()">🐉 + Mostro</button>
        <button class="btn btn-ghost btn-sm" onclick="Sessione.addCustomCombatant()">➕ + Personaggio</button>
      </div>
    `;
  };

  const renderCombatant = (c, isActive) => {
    const hpPct = c.maxHp > 0 ? Math.max(0, Math.round((c.hp / c.maxHp) * 100)) : 100;
    const hpColor = hpPct > 66 ? 'var(--accent-success)' : hpPct > 33 ? 'var(--accent-warning)' : 'var(--accent-danger)';
    const isDead = c.hp <= 0;
    const condizioniHTML = (c.condizioni || []).map(cond =>
      `<span class="badge badge-primary" style="font-size:0.6rem;cursor:pointer;" onclick="Sessione.removeCondizione('${c.id}','${cond}')" title="Rimuovi">${cond} ✕</span>`
    ).join('');

    return `
      <div class="combat-row ${isActive ? 'combat-row-active' : ''} ${isDead ? 'combat-row-dead' : ''}" id="combatant-${c.id}">
        <!-- Iniziativa -->
        <div class="combat-init-col">
          <input type="number" class="combat-init-input" value="${c.iniziativa}"
            onchange="Sessione.updateInit('${c.id}', this.value)"
            title="Iniziativa">
        </div>

        <!-- Nome e tipo -->
        <div class="combat-name-col">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:0.9rem;">${c.tipo === 'pg' ? '👤' : c.tipo === 'mostro' ? '🐉' : '⚔️'}</span>
            <div>
              <div style="font-family:var(--font-display);font-size:0.88rem;${isDead ? 'text-decoration:line-through;opacity:0.5;' : ''}">${c.nome}</div>
              ${c.gs ? `<span class="text-xs text-muted">GS ${c.gs}</span>` : ''}
              ${c.concentrazione ? '<span class="badge badge-blue" style="font-size:0.6rem;">CONC.</span>' : ''}
            </div>
          </div>
          ${condizioniHTML ? `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;">${condizioniHTML}</div>` : ''}
        </div>

        <!-- HP -->
        <div class="combat-hp-col">
          <div style="display:flex;align-items:center;gap:4px;">
            <button class="btn btn-ghost btn-icon-sm" onclick="Sessione.changeHP('${c.id}', -1)" title="Danno">−</button>
            <div style="text-align:center;min-width:60px;">
              <input type="number" class="combat-hp-input" value="${c.hp}"
                onchange="Sessione.setHP('${c.id}', this.value)"
                style="color:${hpColor};" title="HP attuali">
              <div class="text-xs text-muted">/ ${c.maxHp || '∞'}</div>
            </div>
            <button class="btn btn-ghost btn-icon-sm" onclick="Sessione.changeHP('${c.id}', 1)" title="Cura">+</button>
          </div>
          <div class="combat-hp-bar">
            <div class="combat-hp-fill" style="width:${hpPct}%;background:${hpColor};"></div>
          </div>
        </div>

        <!-- CA -->
        <div class="combat-ca-col">
          <div class="text-xs text-muted">CA</div>
          <div style="font-family:var(--font-mono);font-size:0.9rem;">${c.ca || '—'}</div>
        </div>

        <!-- Azioni rapide -->
        <div class="combat-actions-col">
          <button class="btn btn-ghost btn-icon-sm" title="Aggiungi condizione" onclick="Sessione.openCondizioneModal('${c.id}')">🔴</button>
          <button class="btn btn-ghost btn-icon-sm" title="Concentrazione" onclick="Sessione.toggleConcentrazione('${c.id}')" style="${c.concentrazione ? 'color:var(--accent-tertiary);' : ''}">🔮</button>
          <button class="btn btn-ghost btn-icon-sm" title="Danno rapido" onclick="Sessione.quickDamage('${c.id}')">💥</button>
          <button class="btn btn-ghost btn-icon-sm" title="Note" onclick="Sessione.openNote('${c.id}')" style="${c.note ? 'color:var(--accent-secondary);' : ''}">📝</button>
          <button class="btn btn-ghost btn-icon-sm" title="Rimuovi" onclick="Sessione.removeCombatant('${c.id}')">🗑️</button>
        </div>
      </div>`;
  };

  // ── Turni ──
  const nextTurn = () => {
    if (!_combat || !_sortedCombatants.length) return;
    _combat.turno = (_combat.turno + 1) % _sortedCombatants.length;
    if (_combat.turno === 0) {
      _combat.round++;
      Toast.show(`Round ${_combat.round} iniziato`, 'info');
    }
    // Aggiorna ordine in _combat.combatants
    _combat.combatants = _sortedCombatants.map(c => {
      const orig = _combat.combatants.find(x => x.id === c.id);
      return orig || c;
    });
    saveCombat(_combat);
    renderCombat();
    Debug.log(`Turno avanzato: round ${_combat.round}, turno ${_combat.turno}`);
  };

  const rollAllInitiative = () => {
    if (!_combat) return;
    _combat.combatants.forEach(c => {
      if (c.tipo !== 'pg') {
        c.iniziativa = rollInit(c.iniziativaBonus || 0);
      }
    });
    _combat.turno = 0;
    saveCombat(_combat);
    renderCombat();
    Toast.show('Iniziativa lanciata per tutti i mostri', 'success');
  };

  const updateInit = (id, val) => {
    if (!_combat) return;
    const c = _combat.combatants.find(x => x.id === id);
    if (c) { c.iniziativa = parseInt(val) || 0; saveCombat(_combat); sortCombatants(); renderCombat(); }
  };

  // ── HP ──
  const changeHP = (id, delta) => {
    const c = _combat?.combatants.find(x => x.id === id);
    if (!c) return;
    const step = delta > 0 ? 1 : -1;
    // Apre prompt veloce
    const val = prompt(`${delta > 0 ? 'Cura' : 'Danno'} per ${c.nome} (HP attuali: ${c.hp}/${c.maxHp}):`, '');
    if (val === null) return;
    const amount = parseInt(val);
    if (isNaN(amount) || amount < 0) { Toast.show('Valore non valido', 'warning'); return; }
    c.hp = Math.max(0, Math.min(c.maxHp || 9999, c.hp + (delta > 0 ? amount : -amount)));
    if (c.hp === 0) Toast.show(`${c.nome} è a 0 PF!`, 'warning');
    saveCombat(_combat);
    renderCombat();
    Debug.log(`${c.nome}: HP ${c.hp}/${c.maxHp}`);
  };

  const setHP = (id, val) => {
    const c = _combat?.combatants.find(x => x.id === id);
    if (!c) return;
    c.hp = Math.max(0, Math.min(c.maxHp || 9999, parseInt(val) || 0));
    saveCombat(_combat);
    // Aggiorna solo la barra senza re-render completo
    const bar = document.querySelector(`#combatant-${id} .combat-hp-fill`);
    const pct = c.maxHp > 0 ? Math.round((c.hp / c.maxHp) * 100) : 100;
    const col = pct > 66 ? 'var(--accent-success)' : pct > 33 ? 'var(--accent-warning)' : 'var(--accent-danger)';
    if (bar) { bar.style.width = pct + '%'; bar.style.background = col; }
  };

  const quickDamage = (id) => {
    const c = _combat?.combatants.find(x => x.id === id);
    if (!c) return;
    const val = prompt(`Danno rapido per ${c.nome} (HP: ${c.hp}/${c.maxHp}):`, '');
    if (val === null) return;
    const amount = parseInt(val);
    if (isNaN(amount)) return;
    c.hp = Math.max(0, c.hp - amount);
    if (c.hp === 0) Toast.show(`💀 ${c.nome} è a 0 PF!`, 'warning');
    saveCombat(_combat);
    renderCombat();
  };

  // ── Condizioni ──
  const openCondizioneModal = (id) => {
    document.getElementById('cond-combatant-id').value = id;
    const c = _combat?.combatants.find(x => x.id === id);
    const attive = c?.condizioni || [];
    const el = document.getElementById('cond-list');
    if (el) {
      el.innerHTML = CONDIZIONI.map(cond => `
        <label style="display:flex;align-items:center;gap:6px;padding:4px 0;cursor:pointer;font-size:0.85rem;">
          <input type="checkbox" value="${cond}" ${attive.includes(cond) ? 'checked' : ''}>
          ${cond}
        </label>`).join('');
    }
    document.getElementById('cond-modal-title').textContent = `Condizioni — ${c?.nome || ''}`;
    Modal.open('cond-modal');
  };

  const submitCondizioni = () => {
    const id = document.getElementById('cond-combatant-id')?.value;
    const c = _combat?.combatants.find(x => x.id === id);
    if (!c) return;
    const checked = [...document.querySelectorAll('#cond-list input:checked')].map(i => i.value);
    c.condizioni = checked;
    saveCombat(_combat);
    Modal.close('cond-modal');
    renderCombat();
  };

  const removeCondizione = (id, cond) => {
    const c = _combat?.combatants.find(x => x.id === id);
    if (!c) return;
    c.condizioni = (c.condizioni || []).filter(x => x !== cond);
    saveCombat(_combat);
    renderCombat();
  };

  const toggleConcentrazione = (id) => {
    const c = _combat?.combatants.find(x => x.id === id);
    if (!c) return;
    c.concentrazione = !c.concentrazione;
    saveCombat(_combat);
    renderCombat();
  };

  // ── Note ──
  const openNote = (id) => {
    const c = _combat?.combatants.find(x => x.id === id);
    if (!c) return;
    const nota = prompt(`Note per ${c.nome}:`, c.note || '');
    if (nota === null) return;
    c.note = nota;
    saveCombat(_combat);
    renderCombat();
  };

  // ── Aggiungi combatenti ──
  const addCombatantToCurrent = (combatant) => {
    if (!_combat) newCombat();
    _combat.combatants.push({
      ...combatant,
      id: combatant.id || 'comb_' + Date.now(),
      iniziativa: rollInit(0),
      condizioni: [],
      note: '',
      concentrazione: false,
    });
  };

  const addMonsterQuick = () => {
    document.getElementById('monster-search-input').value = '';
    document.getElementById('monster-search-results').innerHTML = '<div class="text-muted text-sm">Digita per cercare...</div>';
    Modal.open('monster-search-modal');
    setTimeout(() => document.getElementById('monster-search-input')?.focus(), 100);
  };

  const searchMonster = () => {
    const q = document.getElementById('monster-search-input')?.value?.toLowerCase() || '';
    const el = document.getElementById('monster-search-results');
    if (!el) return;
    if (!q) { el.innerHTML = '<div class="text-muted text-sm">Digita per cercare...</div>'; return; }

    const monsters = Compendio?.getData()?.monsters || [];
    const results = monsters.filter(m => m.nome.toLowerCase().includes(q)).slice(0, 12);

    if (!results.length) { el.innerHTML = '<div class="text-muted text-sm">Nessun mostro trovato</div>'; return; }

    el.innerHTML = results.map(m => {
      const gs = m.grado_sfida?.raw || '?';
      const pf = m.punti_ferita?.media || '?';
      return `<div class="comp-row" onclick="Sessione.addMonsterFromCompendio('${m.id}')">
        <div class="comp-row-main">
          <span class="comp-row-name">${m.nome}</span>
          <span class="comp-row-meta">${m.tipo || ''}</span>
        </div>
        <div class="comp-row-stats">
          <span class="comp-stat-pill">GS ${gs}</span>
          <span class="comp-stat-pill">PF ${pf}</span>
        </div>
      </div>`;
    }).join('');
  };

  const addMonsterFromCompendio = (id) => {
    const monsters = Compendio?.getData()?.monsters || [];
    const m = monsters.find(x => x.id === id);
    if (!m) return;
    if (!_combat) newCombat();

    // Chiede quante copie
    const qty = parseInt(prompt(`Quanti ${m.nome} aggiungere?`, '1')) || 1;
    const pf = m.punti_ferita?.media || 10;

    for (let i = 0; i < qty; i++) {
      const suffix = qty > 1 ? ` #${i + 1}` : '';
      _combat.combatants.push({
        id: 'comb_' + Date.now() + '_' + i,
        nome: m.nome + suffix,
        tipo: 'mostro',
        monsterId: m.id,
        hp: pf,
        maxHp: pf,
        ca: m.classe_armatura || 10,
        gs: m.grado_sfida?.raw || '?',
        iniziativa: rollInit(m.caratteristiche?.destrezza?.modificatore || 0),
        iniziativaBonus: m.caratteristiche?.destrezza?.modificatore || 0,
        condizioni: [],
        note: '',
        concentrazione: false,
      });
    }
    saveCombat(_combat);
    Modal.close('monster-search-modal');
    renderCombat();
    Toast.show(`${qty > 1 ? qty + '× ' : ''}${m.nome} aggiunto`, 'success');
    Debug.log(`Mostro aggiunto al combat: ${m.nome} x${qty}`);
  };

  const addCustomCombatant = () => {
    const nome = prompt('Nome del combatente:', '');
    if (!nome) return;
    const hp = parseInt(prompt('Punti Ferita:', '10')) || 10;
    const ca = parseInt(prompt('Classe Armatura:', '10')) || 10;
    if (!_combat) newCombat();
    _combat.combatants.push({
      id: 'comb_' + Date.now(),
      nome, tipo: 'custom', hp, maxHp: hp, ca,
      iniziativa: rollD(20),
      condizioni: [], note: '', concentrazione: false,
    });
    saveCombat(_combat);
    renderCombat();
  };

  const removeCombatant = (id) => {
    if (!_combat) return;
    _combat.combatants = _combat.combatants.filter(c => c.id !== id);
    if (_combat.turno >= _combat.combatants.length) _combat.turno = 0;
    saveCombat(_combat);
    renderCombat();
  };

  // ── Salva / Fine / Sessioni salvate ──
  const saveCombatSession = () => {
    if (!_combat) return;
    const camp = App.getActiveCampaign();
    if (!camp) return;
    const sessions = [...(camp.combatSessions || [])];
    const existing = sessions.findIndex(s => s.id === _combat.id);
    const snapshot = { ..._combat, savedAt: Date.now(), status: 'salvato' };
    if (existing !== -1) sessions[existing] = snapshot;
    else sessions.push(snapshot);
    App.saveActiveCampaign({ combatSessions: sessions });
    Toast.show('Scontro salvato', 'success');
    renderSavedSessions();
    Debug.log('Combat salvato');
  };

  const endCombat = () => {
    openConfirmModal('Terminare lo scontro?', 'Lo scontro verrà salvato e l\'area combat si svuoterà.', () => {
      saveCombatSession();
      _combat.status = 'concluso';
      App.saveActiveCampaign({ activeCombat: null });
      _combat = null;
      _sortedCombatants = [];
      renderCombat();
      renderSavedSessions();
      Toast.show('Scontro concluso', 'info');
    });
  };

  const renderSavedSessions = () => {
    const el = document.getElementById('saved-sessions-list');
    if (!el) return;
    const camp = App.getActiveCampaign();
    const sessions = (camp?.combatSessions || []).slice().reverse().slice(0, 5);
    if (!sessions.length) {
      el.innerHTML = '<div class="text-muted text-sm" style="padding:8px;">Nessuno scontro salvato</div>';
      return;
    }
    el.innerHTML = sessions.map(s => {
      const data = new Date(s.savedAt || s.iniziataAt).toLocaleDateString('it-IT');
      return `<div class="comp-row" style="cursor:default;">
        <div class="comp-row-main">
          <span class="comp-row-name">${s.nome}</span>
          <span class="comp-row-meta">${data} · Round ${s.round} · ${s.combatants?.length || 0} combatenti</span>
        </div>
        <div class="comp-row-stats">
          <button class="btn btn-ghost btn-sm" onclick="Sessione.loadCombatSession('${s.id}')">Riprendi</button>
        </div>
      </div>`;
    }).join('');
  };

  const loadCombatSession = (id) => {
    const camp = App.getActiveCampaign();
    const session = (camp?.combatSessions || []).find(s => s.id === id);
    if (!session) return;
    _combat = { ...session, status: 'attivo' };
    saveCombat(_combat);
    renderCombat();
    Toast.show(`Scontro "${session.nome}" ripreso`, 'success');
  };

  return {
    init,
    // Party
    addPG, editPG, deletePG, submitPG, openPGModal, addPGtoCombat,
    // Combat
    newCombat, nextTurn, rollAllInitiative, updateInit,
    changeHP, setHP, quickDamage,
    openCondizioneModal, submitCondizioni, removeCondizione,
    toggleConcentrazione, openNote,
    addMonsterQuick, searchMonster, addMonsterFromCompendio,
    addCustomCombatant, removeCombatant,
    saveCombatSession, endCombat, loadCombatSession,
  };
})();

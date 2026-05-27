/* ============================================================
   SCHERMO.JS — Schermo del Master personalizzabile
   ============================================================ */

const Schermo = (() => {

  // ── Blocchi disponibili ──
  const BLOCK_TYPES = {
    percezioni: {
      label: 'Percezioni Passive Party',
      icon: '👁️',
      desc: 'Perc./Invest./Intuiz. di tutti i PG',
      defaultSize: 'md',
    },
    dadi: {
      label: 'Dadi Rapidi',
      icon: '🎲',
      desc: 'Lancia qualsiasi dado al volo',
      defaultSize: 'sm',
    },
    meteo: {
      label: 'Meteo',
      icon: '🌤️',
      desc: 'Genera e mostra il meteo del giorno',
      defaultSize: 'sm',
    },
    note: {
      label: 'Note Rapide',
      icon: '📝',
      desc: 'Blocco note libero per la sessione',
      defaultSize: 'md',
    },
    combat_mini: {
      label: 'Combat Mini',
      icon: '⚔️',
      desc: 'Iniziativa e HP del round attuale',
      defaultSize: 'lg',
    },
    condizioni: {
      label: 'Riferimento Condizioni',
      icon: '🔴',
      desc: 'Lista rapida delle condizioni 5e',
      defaultSize: 'md',
    },
    dc: {
      label: 'Tabella DC',
      icon: '🎯',
      desc: 'Classi di difficoltà di riferimento',
      defaultSize: 'sm',
    },
    tempo: {
      label: 'Tempo & Calendario',
      icon: '⏰',
      desc: 'Gestione del tempo di gioco',
      defaultSize: 'sm',
    },
    custom: {
      label: 'Blocco Personalizzato',
      icon: '✏️',
      desc: 'Testo libero con titolo personalizzato',
      defaultSize: 'md',
    },
  };

  const SIZES = {
    sm: { label: 'Piccolo', cols: 1 },
    md: { label: 'Medio',   cols: 2 },
    lg: { label: 'Grande',  cols: 3 },
    xl: { label: 'Intero',  cols: 4 },
  };

  let _blocks = []; // { id, type, size, title?, content? }

  // ── Storage ──
  const load = () => {
    try {
      const saved = Storage.getMasterScreen();
      _blocks = saved?.blocks || [];
    } catch (e) {
      _blocks = [];
    }
  };

  const save = () => {
    Storage.saveMasterScreen({ blocks: _blocks });
  };

  // ── Init ──
  const init = () => {
    load();
    render();
    Debug.log(`Schermo.init(): ${_blocks.length} blocchi`);
  };

  // ── Render griglia ──
  const render = () => {
    const grid = document.getElementById('schermo-grid');
    const empty = document.getElementById('schermo-empty');
    if (!grid) return;

    if (_blocks.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.style.display = '';
      return;
    }
    if (empty) empty.style.display = 'none';

    grid.innerHTML = _blocks.map((block, idx) => renderBlock(block, idx)).join('');

    // Aggiorna contenuti dinamici
    _blocks.forEach(b => updateBlockContent(b));
  };

  const renderBlock = (block, idx) => {
    const def = BLOCK_TYPES[block.type] || BLOCK_TYPES.custom;
    const size = block.size || def.defaultSize;
    const cols = SIZES[size]?.cols || 2;
    const title = block.title || def.label;

    return `
      <div class="schermo-block schermo-block-${size}" id="sblock-${block.id}" style="grid-column:span ${cols};">
        <div class="schermo-block-header">
          <span class="schermo-block-icon">${def.icon}</span>
          <span class="schermo-block-title">${title}</span>
          <div class="schermo-block-actions">
            <button class="btn btn-ghost btn-icon-sm" onclick="Schermo.resizeBlock('${block.id}')" title="Ridimensiona">⇔</button>
            <button class="btn btn-ghost btn-icon-sm" onclick="Schermo.moveBlock('${block.id}', -1)" title="Sposta su">↑</button>
            <button class="btn btn-ghost btn-icon-sm" onclick="Schermo.moveBlock('${block.id}', 1)" title="Sposta giù">↓</button>
            ${block.type === 'custom' || block.type === 'note' ? `<button class="btn btn-ghost btn-icon-sm" onclick="Schermo.editBlock('${block.id}')" title="Modifica">✏️</button>` : ''}
            <button class="btn btn-ghost btn-icon-sm" onclick="Schermo.removeBlock('${block.id}')" title="Rimuovi">✕</button>
          </div>
        </div>
        <div class="schermo-block-body" id="sbody-${block.id}">
          <!-- Popolato da updateBlockContent -->
        </div>
      </div>`;
  };

  const updateBlockContent = (block) => {
    const el = document.getElementById(`sbody-${block.id}`);
    if (!el) return;

    switch (block.type) {
      case 'percezioni':  el.innerHTML = renderPercezioni(); break;
      case 'dadi':        el.innerHTML = renderDadiMini(block.id); break;
      case 'meteo':       el.innerHTML = renderMeteoMini(block.id); break;
      case 'note':        el.innerHTML = renderNote(block); break;
      case 'combat_mini': el.innerHTML = renderCombatMini(); break;
      case 'condizioni':  el.innerHTML = renderCondizioni(); break;
      case 'dc':          el.innerHTML = renderDC(); break;
      case 'tempo':       el.innerHTML = renderTempo(); break;
      case 'custom':      el.innerHTML = renderCustom(block); break;
      default:            el.innerHTML = `<div class="text-muted text-sm">Blocco sconosciuto</div>`;
    }
  };

  // ── Contenuti blocchi ──
  const renderPercezioni = () => {
    const camp = App.getActiveCampaign();
    const party = camp?.party || [];
    if (!party.length) return `<div class="text-muted text-sm">Nessun PG nel party. Aggiungili nella Sessione.</div>`;

    return `<div style="display:flex;flex-direction:column;gap:6px;">` +
      party.map(pg => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span style="font-family:var(--font-display);font-size:0.82rem;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pg.nome}</span>
          <div style="display:flex;gap:4px;">
            <span class="schermo-stat" title="Percezione Passiva">👁️ ${pg.percezionePassiva || 10}</span>
            <span class="schermo-stat" title="Investigazione Passiva">🔍 ${pg.investigazionePassiva || 10}</span>
            <span class="schermo-stat" title="Intuizione Passiva">💡 ${pg.intuizionePassiva || 10}</span>
          </div>
        </div>`).join('') +
      `</div>`;
  };

  const renderDadiMini = (blockId) => `
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
      ${['4','6','8','10','12','20','100'].map(d => `
        <button class="btn btn-secondary btn-sm" style="padding:4px 8px;font-size:0.7rem;"
          onclick="Schermo.rollDie(${d},'${blockId}')">d${d}</button>`).join('')}
    </div>
    <div id="schermo-dice-result-${blockId}" style="font-family:var(--font-mono);font-size:1.4rem;font-weight:700;color:var(--accent-primary);text-align:center;min-height:36px;">—</div>
    <div id="schermo-dice-formula-${blockId}" style="font-size:0.7rem;color:var(--text-muted);text-align:center;"></div>`;

  const rollDie = (faces, blockId) => {
    const result = Math.floor(Math.random() * faces) + 1;
    const el = document.getElementById(`schermo-dice-result-${blockId}`);
    const formula = document.getElementById(`schermo-dice-formula-${blockId}`);
    if (el) { el.textContent = result; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = 'diceResult 0.3s ease'; }
    if (formula) formula.textContent = `d${faces}`;
    Storage.addDiceRoll(`d${faces}`, [result], result);
    Debug.log(`Schermo dice: d${faces} → ${result}`);
  };

  const renderMeteoMini = (blockId) => `
    <div id="schermo-meteo-${blockId}" class="text-sm text-muted" style="margin-bottom:8px;">Clicca per generare il meteo</div>
    <button class="btn btn-secondary btn-sm w-full" onclick="Schermo.generateMeteo('${blockId}')">🎲 Genera Meteo</button>`;

  const generateMeteo = async (blockId) => {
    const el = document.getElementById(`schermo-meteo-${blockId}`);
    if (!el) return;
    try {
      const r = await fetch('data/tabelle.json');
      const t = await r.json();
      const tipi = Object.keys(t.meteo);
      const tipo = tipi[Math.floor(Math.random() * tipi.length)];
      const pool = t.meteo[tipo];
      const desc = pool[Math.floor(Math.random() * pool.length)];
      const icons = { soleggiato: '☀️', nuvoloso: '☁️', pioggia: '🌧️', temporale: '⛈️', neve: '❄️', nebbia: '🌫️' };
      el.innerHTML = `<span style="font-size:1.2rem;">${icons[tipo] || '🌤️'}</span> <strong>${tipo}</strong><br><span class="text-muted">${desc}</span>`;
    } catch (e) {
      el.textContent = 'Errore caricamento dati';
    }
  };

  const renderNote = (block) => `
    <textarea
      style="width:100%;min-height:120px;background:transparent;border:none;resize:vertical;font-family:var(--font-body);font-size:0.85rem;color:var(--text-primary);outline:none;padding:0;"
      placeholder="Scrivi note rapide qui..."
      onchange="Schermo.saveNote('${block.id}', this.value)"
    >${block.content || ''}</textarea>`;

  const saveNote = (id, content) => {
    const block = _blocks.find(b => b.id === id);
    if (block) { block.content = content; save(); }
  };

  const renderCombatMini = () => {
    const camp = App.getActiveCampaign();
    const combat = camp?.activeCombat;
    if (!combat || !combat.combatants?.length) {
      return `<div class="text-muted text-sm">Nessuno scontro attivo. Avvia uno scontro nella Sessione.</div>
              <button class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="App.navigateTo('sessione')">→ Vai alla Sessione</button>`;
    }

    const sorted = [...combat.combatants].sort((a,b) => b.iniziativa - a.iniziativa);
    const activeIdx = combat.turno || 0;

    return `
      <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted);margin-bottom:6px;">Round ${combat.round || 1}</div>
      <div style="display:flex;flex-direction:column;gap:3px;">
        ${sorted.map((c, i) => {
          const isActive = i === activeIdx;
          const hpPct = c.maxHp > 0 ? Math.max(0, (c.hp / c.maxHp) * 100) : 100;
          const hpCol = hpPct > 66 ? 'var(--accent-success)' : hpPct > 33 ? 'var(--accent-warning)' : 'var(--accent-danger)';
          return `<div style="display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:var(--radius-sm);background:${isActive ? 'rgba(139,38,53,0.15)' : 'transparent'};border-left:2px solid ${isActive ? 'var(--accent-primary)' : 'transparent'};">
            <span style="font-family:var(--font-mono);font-size:0.75rem;width:24px;text-align:right;color:var(--accent-secondary);">${c.iniziativa}</span>
            <span style="flex:1;font-size:0.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${c.hp <= 0 ? 'opacity:0.4;text-decoration:line-through;' : ''}">${c.nome}</span>
            <div style="width:40px;height:4px;background:var(--bg-tertiary);border-radius:2px;"><div style="height:100%;width:${hpPct}%;background:${hpCol};border-radius:2px;"></div></div>
            <span style="font-family:var(--font-mono);font-size:0.7rem;color:${hpCol};">${c.hp}</span>
          </div>`;
        }).join('')}
      </div>`;
  };

  const renderCondizioni = () => {
    const condizioni = [
      ['Accecato', 'Svantaggio attacchi. Vantaggio vs lui.'],
      ['Affascinato', 'Non può attaccare la fonte.'],
      ['Afferrato', 'Velocità 0.'],
      ['Assordato', 'Non sente.'],
      ['Avvelenato', 'Svantaggio a tutto.'],
      ['Incapacitato', 'Niente azioni/reazioni.'],
      ['Invisibile', 'Vantaggio attacchi. Svantaggio vs lui.'],
      ['Paralizzato', 'Incap. + critici da mischia.'],
      ['Pietrificato', 'Pietra. Resist. tutti danni.'],
      ['Prono', 'Svant. attacchi. Vantaggi vs lui in mischia.'],
      ['Spaventato', 'Svant. se fonte visibile.'],
      ['Stordito', 'Incap. + TS FOR/DES auto-fallisce.'],
      ['Trattenuto', 'Vel. 0. Svant. attacchi. Vantaggi vs lui.'],
    ];
    return `<div style="display:flex;flex-direction:column;gap:3px;">` +
      condizioni.map(([nome, desc]) => `
        <div style="display:flex;gap:6px;align-items:baseline;padding:2px 0;border-bottom:1px solid var(--border);">
          <span style="font-family:var(--font-display);font-size:0.72rem;font-weight:600;white-space:nowrap;min-width:90px;">${nome}</span>
          <span style="font-size:0.72rem;color:var(--text-muted);">${desc}</span>
        </div>`).join('') +
      `</div>`;
  };

  const renderDC = () => {
    const dcs = [
      ['Banale', '5'], ['Facile', '10'], ['Media', '15'],
      ['Difficile', '20'], ['Molto difficile', '25'], ['Quasi impossibile', '30'],
    ];
    return `<div style="display:grid;grid-template-columns:1fr auto;gap:3px 12px;">` +
      dcs.map(([d, v]) => `
        <span style="font-size:0.82rem;">${d}</span>
        <span style="font-family:var(--font-mono);font-size:0.82rem;font-weight:700;color:var(--accent-primary);">${v}</span>`).join('') +
      `</div>`;
  };

  const renderTempo = () => {
    const camp = App.getActiveCampaign();
    const cal = camp?.calendar || { day: 1, month: 1, year: 1490, timeHours: 8, timeMinutes: 0 };
    const h = String(cal.timeHours || 0).padStart(2, '0');
    const m = String(cal.timeMinutes || 0).padStart(2, '0');
    return `
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-family:var(--font-mono);font-size:2rem;font-weight:700;color:var(--accent-primary);">${h}:${m}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);">Giorno ${cal.day} · Anno ${cal.year}</div>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;">
        <button class="btn btn-secondary btn-sm" style="font-size:0.7rem;" onclick="Schermo.advanceTime(10)">+10 min</button>
        <button class="btn btn-secondary btn-sm" style="font-size:0.7rem;" onclick="Schermo.advanceTime(60)">+1 ora</button>
        <button class="btn btn-secondary btn-sm" style="font-size:0.7rem;" onclick="Schermo.advanceTime(480)">+8 ore</button>
        <button class="btn btn-secondary btn-sm" style="font-size:0.7rem;" onclick="Schermo.advanceTime(1440)">+1 giorno</button>
      </div>`;
  };

  const advanceTime = (minutes) => {
    const camp = App.getActiveCampaign();
    if (!camp) return;
    const cal = { ...(camp.calendar || { day: 1, month: 1, year: 1490, timeHours: 8, timeMinutes: 0 }) };
    let totalMins = (cal.timeHours || 0) * 60 + (cal.timeMinutes || 0) + minutes;
    const extraDays = Math.floor(totalMins / (24 * 60));
    totalMins = totalMins % (24 * 60);
    cal.timeHours = Math.floor(totalMins / 60);
    cal.timeMinutes = totalMins % 60;
    cal.day = (cal.day || 1) + extraDays;
    App.saveActiveCampaign({ calendar: cal });
    // Aggiorna tutti i blocchi tempo
    _blocks.filter(b => b.type === 'tempo').forEach(b => updateBlockContent(b));
    Toast.show(`Tempo avanzato: ${cal.timeHours.toString().padStart(2,'0')}:${cal.timeMinutes.toString().padStart(2,'0')} Giorno ${cal.day}`, 'info');
  };

  const renderCustom = (block) => `
    <div style="font-size:0.85rem;color:var(--text-secondary);white-space:pre-wrap;line-height:1.6;">${block.content || '<span class="text-muted">Clicca ✏️ per modificare</span>'}</div>`;

  // ── Gestione blocchi ──
  const addBlock = () => {
    // Popola il select nel modal
    const sel = document.getElementById('schermo-block-type');
    if (sel) {
      sel.innerHTML = Object.entries(BLOCK_TYPES).map(([key, def]) =>
        `<option value="${key}">${def.icon} ${def.label}</option>`
      ).join('');
    }
    const sizeSel = document.getElementById('schermo-block-size');
    if (sizeSel) {
      sizeSel.innerHTML = Object.entries(SIZES).map(([key, def]) =>
        `<option value="${key}" ${key === 'md' ? 'selected' : ''}>${def.label}</option>`
      ).join('');
    }
    if (document.getElementById('schermo-block-title')) {
      document.getElementById('schermo-block-title').value = '';
    }
    if (document.getElementById('schermo-block-content')) {
      document.getElementById('schermo-block-content').value = '';
    }
    Modal.open('schermo-add-modal');
  };

  const submitAddBlock = () => {
    const type    = document.getElementById('schermo-block-type')?.value || 'note';
    const size    = document.getElementById('schermo-block-size')?.value || 'md';
    const title   = document.getElementById('schermo-block-title')?.value?.trim() || '';
    const content = document.getElementById('schermo-block-content')?.value?.trim() || '';

    const block = {
      id: 'sb_' + Date.now(),
      type, size,
      title: title || BLOCK_TYPES[type]?.label || 'Blocco',
      content,
    };

    _blocks.push(block);
    save();
    Modal.close('schermo-add-modal');
    render();
    Toast.show('Blocco aggiunto', 'success');
    Debug.log(`Schermo: blocco ${type} aggiunto`);
  };

  const removeBlock = (id) => {
    _blocks = _blocks.filter(b => b.id !== id);
    save();
    render();
  };

  const resizeBlock = (id) => {
    const block = _blocks.find(b => b.id === id);
    if (!block) return;
    const sizeKeys = Object.keys(SIZES);
    const cur = sizeKeys.indexOf(block.size || 'md');
    block.size = sizeKeys[(cur + 1) % sizeKeys.length];
    save();
    render();
  };

  const moveBlock = (id, dir) => {
    const idx = _blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= _blocks.length) return;
    [_blocks[idx], _blocks[newIdx]] = [_blocks[newIdx], _blocks[idx]];
    save();
    render();
  };

  const editBlock = (id) => {
    const block = _blocks.find(b => b.id === id);
    if (!block) return;
    const title = prompt('Titolo del blocco:', block.title || '');
    if (title === null) return;
    const content = prompt('Contenuto:', block.content || '');
    if (content === null) return;
    block.title = title || block.title;
    block.content = content;
    save();
    render();
  };

  const resetLayout = () => {
    openConfirmModal('Resettare lo schermo?', 'Tutti i blocchi verranno rimossi.', () => {
      _blocks = [];
      save();
      render();
      Toast.show('Schermo resettato', 'info');
    });
  };

  // Aggiorna schermo se il combat cambia
  const refreshCombat = () => {
    _blocks.filter(b => b.type === 'combat_mini').forEach(b => updateBlockContent(b));
  };

  return {
    init, render, addBlock, submitAddBlock,
    removeBlock, resizeBlock, moveBlock, editBlock, resetLayout,
    rollDie, generateMeteo, saveNote, advanceTime, refreshCombat,
  };
})();

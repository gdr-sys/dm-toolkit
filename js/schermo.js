/* ============================================================
   SCHERMO.JS — Schermo del Master personalizzabile
   ============================================================ */

const Schermo = (() => {

  // ── Dati condizioni completi per edizione ──
  const CONDIZIONI_2014 = [
    {
      nome: 'Accecato',
      desc: 'Non vede. Fallisce prove che richiedono la vista. Attacchi contro di lui: Vantaggio. Suoi attacchi: Svantaggio.'
    },
    {
      nome: 'Affascinato',
      desc: 'Non può attaccare o bersagliare la fonte con effetti nocivi. La fonte ha Vantaggio alle prove sociali contro di lui.'
    },
    {
      nome: 'Afferrato',
      desc: 'Velocità 0. Termina se l\'afferratore è Incapacitato o il bersaglio viene spostato fuori portata.'
    },
    {
      nome: 'Assordato',
      desc: 'Non sente. Fallisce prove che richiedono l\'udito.'
    },
    {
      nome: 'Avvelenato',
      desc: 'Svantaggio a tutte le prove di caratteristica e ai tiri per colpire.'
    },
    {
      nome: 'Esausto',
      desc: 'Liv.1: Svantaggio prove. Liv.2: Vel.÷2. Liv.3: Svant. attacchi/TS. Liv.4: Max PF÷2. Liv.5: Vel.0. Liv.6: Morte.'
    },
    {
      nome: 'Incapacitato',
      desc: 'Nessuna azione né reazione.'
    },
    {
      nome: 'Invisibile',
      desc: 'Pesantemente oscurato. Tiri per colpire contro di lui: Svantaggio. Suoi attacchi: Vantaggio.'
    },
    {
      nome: 'Paralizzato',
      desc: 'Incapacitato + immobile. Fallisce TS FOR/DES. Attacchi contro: Vantaggio. Critici automatici da mischia entro 1,5 m.'
    },
    {
      nome: 'Pietrificato',
      desc: 'Incapacitato + immobile + peso ×10. Fallisce TS FOR/DES. Attacchi contro: Vantaggio. Immune a veleni/malattie. Resistenza a tutti i danni.'
    },
    {
      nome: 'Prono',
      desc: 'Svantaggio ai tiri per colpire. Attacchi in mischia contro: Vantaggio. Attacchi a distanza contro: Svantaggio. Muoversi: costo doppio.'
    },
    {
      nome: 'Spaventato',
      desc: 'Svantaggio a prove e attacchi se la fonte è nel campo visivo. Non può avvicinarsi volontariamente alla fonte.'
    },
    {
      nome: 'Stordito',
      desc: 'Incapacitato. Fallisce TS FOR/DES. Attacchi contro: Vantaggio.'
    },
    {
      nome: 'Trattenuto',
      desc: 'Velocità 0. Attacchi contro: Vantaggio. Suoi attacchi: Svantaggio. Svantaggio ai TS DES.'
    },
  ];

  const CONDIZIONI_2024 = [
    {
      nome: 'Accecato',
      desc: 'Non vede. Fallisce prove che richiedono la vista. Attacchi contro: Vantaggio. Suoi attacchi: Svantaggio.'
    },
    {
      nome: 'Affascinato',
      desc: 'Non può attaccare o bersagliare la fonte con effetti nocivi. La fonte ha Vantaggio alle prove sociali contro di lui.'
    },
    {
      nome: 'Afferrato',
      desc: 'Velocità 0. Termina se l\'afferratore è Incapacitato o il bersaglio viene spostato fuori portata.'
    },
    {
      nome: 'Assordato',
      desc: 'Non sente. Fallisce prove che richiedono l\'udito.'
    },
    {
      nome: 'Avvelenato',
      desc: 'Svantaggio a tutte le prove di caratteristica e ai tiri per colpire.'
    },
    {
      nome: 'Esausto',
      desc: 'Ogni livello: –2 a tutti i tiri d20 e –1,5 m di velocità. Livello 6: morte. Si recupera 1 livello per Riposo Lungo.'
    },
    {
      nome: 'Incapacitato',
      desc: 'Nessuna azione né reazione. Non può parlare. Svantaggio ai tiri di Iniziativa. [NUOVO nel 2024]'
    },
    {
      nome: 'Invisibile',
      desc: 'Pesantemente oscurato. Tiri per colpire contro: Svantaggio. Suoi attacchi: Vantaggio.'
    },
    {
      nome: 'Paralizzato',
      desc: 'Incapacitato + immobile. Fallisce TS FOR/DES. Attacchi contro: Vantaggio. Critici automatici da mischia entro 1,5 m.'
    },
    {
      nome: 'Pietrificato',
      desc: 'Incapacitato + immobile + peso ×10. Fallisce TS FOR/DES. Attacchi contro: Vantaggio. Immune a veleni/malattie. Resistenza a tutti i danni.'
    },
    {
      nome: 'Privo di sensi',
      desc: 'Condizione separata da Incapacitato [NUOVO 2024]. Incapacitato + Prono + incosciente. Critico automatico da mischia entro 1,5 m. Si ottiene a 0 PF.'
    },
    {
      nome: 'Prono',
      desc: 'Svantaggio ai tiri per colpire. Attacchi in mischia contro: Vantaggio. Attacchi a distanza contro: Svantaggio. Muoversi: costo doppio.'
    },
    {
      nome: 'Spaventato',
      desc: 'Svantaggio a prove e attacchi se la fonte è nel campo visivo. Non può avvicinarsi volontariamente alla fonte.'
    },
    {
      nome: 'Stordito',
      desc: 'Incapacitato. Fallisce TS FOR/DES. Attacchi contro: Vantaggio.'
    },
    {
      nome: 'Trattenuto',
      desc: 'Velocità 0. Attacchi contro: Vantaggio. Suoi attacchi: Svantaggio. Svantaggio ai TS DES.'
    },
  ];

  // ── Tabelle XP per GS ──
  const XP_PER_GS = {
    0: 10, 0.125: 25, 0.25: 50, 0.5: 100,
    1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800,
    6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900,
    11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000,
    16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000,
    21: 33000, 22: 41000, 23: 50000, 24: 62000, 30: 155000,
  };

  // Soglie XP 2014 per difficoltà [Facile, Medio, Difficile, Mortale]
  const XP_SOGLIE_2014 = {
    1:  [25,50,75,100],    2:  [50,100,150,200],
    3:  [75,150,225,400],  4:  [125,250,375,500],
    5:  [250,500,750,1100],6:  [300,600,900,1400],
    7:  [350,750,1100,1700],8: [450,900,1400,2100],
    9:  [550,1100,1600,2400],10:[600,1200,1900,2800],
    11: [800,1600,2400,3600],12:[1000,2000,3000,4500],
    13: [1100,2200,3400,5100],14:[1250,2500,3800,5700],
    15: [1400,2800,4300,6400],16:[1600,3200,4800,7200],
    17: [2000,3900,5900,8800],18:[2100,4200,6300,9500],
    19: [2400,4900,7300,10900],20:[2800,5700,8500,12700],
  };

  // XP Budget 2024 per difficoltà [Basso, Moderato, Alto]
  const XP_BUDGET_2024 = {
    1:  [50,75,100],    2:  [100,150,200],
    3:  [150,225,400],  4:  [250,375,500],
    5:  [500,750,1100], 6:  [600,900,1400],
    7:  [750,1100,1700],8:  [900,1400,2100],
    9:  [1100,1600,2400],10:[1200,1900,2800],
    11: [1600,2400,3600],12:[2000,3000,4500],
    13: [2200,3400,5100],14:[2500,3800,5700],
    15: [2800,4300,6400],16:[3200,4800,7200],
    17: [3900,5900,8800],18:[4200,6300,9500],
    19: [4900,7300,10900],20:[5700,8500,12700],
  };

  // Moltiplicatori 2014 per numero mostri
  const MOLTIPLICATORI_2014 = [
    { max: 1, mult: 1 }, { max: 2, mult: 1.5 }, { max: 6, mult: 2 },
    { max: 10, mult: 2.5 }, { max: 14, mult: 3 }, { max: Infinity, mult: 4 },
  ];

  const getMolt2014 = (numMostri, numPG) => {
    let m = MOLTIPLICATORI_2014.find(x => numMostri <= x.max)?.mult || 4;
    if (numPG < 3) m = Math.min(m * 1.5, 4);
    if (numPG > 5) m = Math.max(m * 0.5, 0.5);
    return m;
  };

  const gsToNum = (gs) => {
    if (gs === '1/8') return 0.125;
    if (gs === '1/4') return 0.25;
    if (gs === '1/2') return 0.5;
    return parseFloat(gs) || 0;
  };

  const xpForGs = (gs) => {
    const n = gsToNum(gs);
    const keys = Object.keys(XP_PER_GS).map(Number).sort((a,b)=>a-b);
    const exact = XP_PER_GS[n];
    if (exact !== undefined) return exact;
    // Arrotonda al GS più vicino
    const closest = keys.reduce((a,b) => Math.abs(b-n) < Math.abs(a-n) ? b : a);
    return XP_PER_GS[closest] || 0;
  };

  // ── Stato calcolatore ──
  let _encMostri = []; // [{nome, gs, qty}]

  // ── Blocchi disponibili ──  // ── Blocchi disponibili ──
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
      label: 'Condizioni (Tabella Compatta)',
      icon: '🔴',
      desc: 'Effetti meccanici completi per edizione',
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
    encounter_calc: {
      label: 'Calcolatore Incontri',
      icon: '⚖️',
      desc: 'XP Budget e difficoltà incontro per edizione',
      defaultSize: 'lg',
    },
  };

  const SIZES = {
    sm: { label: 'Piccolo', cols: 1 },
    md: { label: 'Medio',   cols: 2 },
    lg: { label: 'Grande',  cols: 3 },
    xl: { label: 'Intero',  cols: 4 },
  };

  let _blocks = [];

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

  const init = () => {
    load();
    render();
    Debug.log(`Schermo.init(): ${_blocks.length} blocchi`);
  };

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
        <div class="schermo-block-body" id="sbody-${block.id}"></div>
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
      case 'condizioni':  el.innerHTML = renderCondizioni(block.id); break;
      case 'dc':          el.innerHTML = renderDC(); break;
      case 'tempo':       el.innerHTML = renderTempo(); break;
      case 'custom':        el.innerHTML = renderCustom(block); break;
      case 'encounter_calc': el.innerHTML = renderEncounterCalc(); break;
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
      return `<div class="text-muted text-sm">Nessuno scontro attivo.</div>
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
            ${c.concentrazione ? '<span style="font-size:0.6rem;color:var(--accent-tertiary);">🔮</span>' : ''}
            <div style="width:40px;height:4px;background:var(--bg-tertiary);border-radius:2px;"><div style="height:100%;width:${hpPct}%;background:${hpCol};border-radius:2px;"></div></div>
            <span style="font-family:var(--font-mono);font-size:0.7rem;color:${hpCol};">${c.hp}</span>
          </div>`;
        }).join('')}
      </div>`;
  };

  // ── CONDIZIONI — versione completa con toggle edizione ──
  const renderCondizioni = (blockId) => {
    const camp = App.getActiveCampaign();
    const system = camp?.system || '5e2024';
    const is2024 = system === '5e2024';
    const lista = is2024 ? CONDIZIONI_2024 : CONDIZIONI_2014;
    const edLabel = is2024 ? 'Edizione 2024' : 'Edizione 2014';
    const edColor = is2024 ? 'var(--accent-tertiary)' : 'var(--accent-secondary)';

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:0.7rem;font-family:var(--font-display);letter-spacing:0.05em;text-transform:uppercase;color:${edColor};">${edLabel}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:0;">
        ${lista.map(c => `
          <div style="display:grid;grid-template-columns:100px 1fr;gap:6px;align-items:baseline;padding:4px 0;border-bottom:1px solid var(--border);">
            <span style="font-family:var(--font-display);font-size:0.75rem;font-weight:700;color:var(--text-primary);letter-spacing:0.02em;">${c.nome}</span>
            <span style="font-size:0.72rem;color:var(--text-muted);line-height:1.5;">${c.desc}</span>
          </div>`).join('')}
      </div>`;
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
    _blocks.filter(b => b.type === 'tempo').forEach(b => updateBlockContent(b));
    Toast.show(`Tempo: ${cal.timeHours.toString().padStart(2,'0')}:${cal.timeMinutes.toString().padStart(2,'0')} Giorno ${cal.day}`, 'info');
  };

  const renderEncounterCalc = () => {
    const camp = App.getActiveCampaign();
    const party = camp?.party || [];
    const system = camp?.system || '5e2024';
    const is2024 = system === '5e2024';

    // Calcolo XP mostri
    const totXPMostri = _encMostri.reduce((sum, m) => sum + xpForGs(m.gs) * m.qty, 0);
    const numMostri = _encMostri.reduce((sum, m) => sum + m.qty, 0);
    const numPG = party.length || 4;

    // Calcolo difficoltà
    let difficolta = '—';
    let difficoltaColor = 'var(--text-muted)';
    let xpAggSoglia = '';

    if (totXPMostri > 0 && numPG > 0) {
      if (is2024) {
        // 2024: XP Budget per PG × numPG
        const livMedio = party.length
          ? Math.round(party.reduce((s, pg) => s + (pg.livello || 1), 0) / party.length)
          : 1;
        const lv = Math.max(1, Math.min(20, livMedio));
        const budget = XP_BUDGET_2024[lv] || XP_BUDGET_2024[1];
        const budgetTot = [budget[0] * numPG, budget[1] * numPG, budget[2] * numPG];

        if (totXPMostri < budgetTot[0]) { difficolta = 'Banale'; difficoltaColor = 'var(--text-muted)'; }
        else if (totXPMostri < budgetTot[1]) { difficolta = 'Basso'; difficoltaColor = 'var(--accent-success)'; }
        else if (totXPMostri < budgetTot[2]) { difficolta = 'Moderato'; difficoltaColor = 'var(--accent-warning)'; }
        else { difficolta = 'Alto'; difficoltaColor = 'var(--accent-danger)'; }

        xpAggSoglia = `Soglie (Lv ${lv} × ${numPG} PG): Basso ${budgetTot[0]} · Moderato ${budgetTot[1]} · Alto ${budgetTot[2]}`;
      } else {
        // 2014: XP soglie per PG + moltiplicatore
        const xpAdj = totXPMostri * getMolt2014(numMostri, numPG);
        const livMedio = party.length
          ? Math.round(party.reduce((s, pg) => s + (pg.livello || 1), 0) / party.length)
          : 1;
        const lv = Math.max(1, Math.min(20, livMedio));
        const soglie = XP_SOGLIE_2014[lv] || XP_SOGLIE_2014[1];
        const sogleTot = soglie.map(s => s * numPG);

        if (xpAdj < sogleTot[0]) { difficolta = 'Banale'; difficoltaColor = 'var(--text-muted)'; }
        else if (xpAdj < sogleTot[1]) { difficolta = 'Facile'; difficoltaColor = 'var(--accent-success)'; }
        else if (xpAdj < sogleTot[2]) { difficolta = 'Medio'; difficoltaColor = 'var(--accent-warning)'; }
        else if (xpAdj < sogleTot[3]) { difficolta = 'Difficile'; difficoltaColor = '#f97316'; }
        else { difficolta = 'Mortale'; difficoltaColor = 'var(--accent-danger)'; }

        const molt = getMolt2014(numMostri, numPG);
        xpAggSoglia = `XP raw: ${totXPMostri} × ${molt} = ${Math.round(xpAdj)} · Soglie: F${sogleTot[0]} M${sogleTot[1]} D${sogleTot[2]} Mo${sogleTot[3]}`;
      }
    }

    const gsList = ['0','1/8','1/4','1/2',...Array.from({length:30},(_,i)=>String(i+1))];

    return \`
      <div style="display:flex;flex-direction:column;gap:8px;">

        <!-- Aggiungi mostro -->
        <div style="display:flex;gap:6px;align-items:center;">
          <select id="enc-gs-select" class="form-select" style="font-size:0.8rem;flex:0 0 80px;">
            \${gsList.map(g => \`<option value="\${g}">GS \${g}</option>\`).join('')}
          </select>
          <input type="text" id="enc-nome-input" class="form-input" placeholder="Nome (opz.)" style="font-size:0.8rem;flex:1;">
          <input type="number" id="enc-qty-input" class="form-input" min="1" max="50" value="1" style="font-size:0.8rem;flex:0 0 50px;">
          <button class="btn btn-primary btn-sm" style="font-size:0.75rem;white-space:nowrap;" onclick="Schermo.addToEncounter()">+ Add</button>
        </div>

        <!-- Lista mostri aggiunti -->
        <div id="enc-mostri-list" style="display:flex;flex-direction:column;gap:3px;min-height:24px;">
          \${_encMostri.length === 0
            ? '<div class="text-muted" style="font-size:0.75rem;text-align:center;padding:4px 0;">Nessun mostro aggiunto</div>'
            : _encMostri.map((m, i) => \`
              <div style="display:flex;align-items:center;gap:6px;padding:2px 4px;border-radius:var(--radius-sm);background:var(--bg-secondary);">
                <span style="font-size:0.75rem;color:var(--accent-secondary);font-family:var(--font-mono);flex:0 0 50px;">GS \${m.gs}</span>
                <span style="font-size:0.78rem;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\${m.nome || 'Mostro'} ×\${m.qty}</span>
                <span style="font-size:0.7rem;color:var(--text-muted);font-family:var(--font-mono);">\${xpForGs(m.gs) * m.qty} XP</span>
                <button class="btn btn-ghost btn-icon-sm" style="font-size:0.65rem;" onclick="Schermo.removeFromEncounter(\${i})">✕</button>
              </div>\`).join('')
          }
        </div>

        <!-- Risultato -->
        \${totXPMostri > 0 ? \`
          <div style="border-top:1px solid var(--border);padding-top:8px;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
              <span style="font-size:0.75rem;color:var(--text-muted);">XP totale mostri</span>
              <span style="font-family:var(--font-mono);font-size:0.85rem;font-weight:700;">\${totXPMostri.toLocaleString('it-IT')}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
              <span style="font-size:0.75rem;color:var(--text-muted);">Difficoltà (\${is2024 ? '2024' : '2014'})</span>
              <span style="font-family:var(--font-display);font-size:1.1rem;font-weight:700;color:\${difficoltaColor};">\${difficolta}</span>
            </div>
            <div style="font-size:0.68rem;color:var(--text-muted);line-height:1.6;">\${xpAggSoglia}</div>
          </div>
          <button class="btn btn-ghost btn-sm" style="font-size:0.72rem;" onclick="Schermo.clearEncounter()">🗑️ Svuota</button>
        \` : ''}

        <!-- Party info -->
        <div style="font-size:0.7rem;color:var(--text-muted);border-top:1px solid var(--border);padding-top:6px;">
          Party: \${numPG} PG\${party.length ? ' · Lv medio ' + (party.reduce((s,p)=>s+(p.livello||1),0)/party.length).toFixed(1) : ''} · \${is2024 ? 'Ed. 2024' : 'Ed. 2014'}
        </div>
      </div>\`;
  };

  const addToEncounter = () => {
    const gs = document.getElementById('enc-gs-select')?.value || '1';
    const nome = document.getElementById('enc-nome-input')?.value?.trim() || '';
    const qty = Math.max(1, parseInt(document.getElementById('enc-qty-input')?.value) || 1);
    // Cerca se esiste già stesso gs+nome
    const existing = _encMostri.find(m => m.gs === gs && m.nome === nome);
    if (existing) { existing.qty += qty; }
    else { _encMostri.push({ gs, nome, qty }); }
    // Aggiorna tutti i blocchi encounter
    _blocks.filter(b => b.type === 'encounter_calc').forEach(b => updateBlockContent(b));
    Debug.log(\`Encounter: aggiunto GS \${gs} ×\${qty}\`);
  };

  const removeFromEncounter = (idx) => {
    _encMostri.splice(idx, 1);
    _blocks.filter(b => b.type === 'encounter_calc').forEach(b => updateBlockContent(b));
  };

  const clearEncounter = () => {
    _encMostri = [];
    _blocks.filter(b => b.type === 'encounter_calc').forEach(b => updateBlockContent(b));
  };

  const renderCustom = (block) => \`
    <div style="font-size:0.85rem;color:var(--text-secondary);white-space:pre-wrap;line-height:1.6;">${block.content || '<span class="text-muted">Clicca ✏️ per modificare</span>'}</div>`;

  // ── Gestione blocchi ──
  const addBlock = () => {
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
    if (document.getElementById('schermo-block-title')) document.getElementById('schermo-block-title').value = '';
    if (document.getElementById('schermo-block-content')) document.getElementById('schermo-block-content').value = '';
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

  const refreshCombat = () => {
    _blocks.filter(b => b.type === 'combat_mini').forEach(b => updateBlockContent(b));
  };

  return {
    init, render, addBlock, submitAddBlock,
    removeBlock, resizeBlock, moveBlock, editBlock, resetLayout,
    rollDie, generateMeteo, saveNote, advanceTime, refreshCombat,
    addToEncounter, removeFromEncounter, clearEncounter,
  };
})();

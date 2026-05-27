/* ============================================================
   COMPENDIO.JS — Mostri, Oggetti Magici, Equipaggiamento, Regole
   ============================================================ */

const Compendio = (() => {

  // ── Stato ──
  const _data = { monsters: [], magic_items: [], equipment: [], rules: [] };
  let _loaded = false;
  let _loading = false;
  let _activeTab = 'monsters';
  let _searchTimer = null;

  // ── Filtri per tab ──
  const _filters = {
    monsters:    { q: '', tipo: '', gs_min: '', gs_max: '' },
    magic_items: { q: '', tipo_base: '', rarita: '' },
    equipment:   { q: '', tipo: '', categoria: '' },
    rules:       { q: '', categoria: '' },
  };

  // ── Helpers ──
  const gsDisplay = (m) => {
    const gs = m.grado_sfida;
    if (!gs) return '?';
    const v = gs.valore;
    if (v === 0.125) return '1/8';
    if (v === 0.25)  return '1/4';
    if (v === 0.5)   return '1/2';
    if (v === null || v === undefined) return '?';
    return String(Number.isInteger(v) ? v : parseFloat(v));
  };

  const gsNumeric = (m) => {
    const gs = m.grado_sfida;
    if (!gs || gs.valore === null || gs.valore === undefined) return -1;
    return parseFloat(gs.valore);
  };

  const tipoPrincipale = (t) => (t || '').split('(')[0].trim();

  const normalizzaRarita = (r) => {
    r = (r || '').toLowerCase().trim();
    if (r.includes('leggend'))   return 'leggendaria';
    if (r.includes('molto rar')) return 'molto rara';
    if (r.includes('rar'))       return 'rara';
    if (r.includes('non comune'))return 'non comune';
    if (r.includes('comune'))    return 'comune';
    if (r.includes('manufatto')) return 'manufatto';
    return 'variabile';
  };

  const raritaOrder = { comune: 0, 'non comune': 1, rara: 2, 'molto rara': 3, leggendaria: 4, manufatto: 5, variabile: 6 };
  const raritaBadge = { comune: 'badge-muted', 'non comune': 'badge-success', rara: 'badge-blue', 'molto rara': 'badge-primary', leggendaria: 'badge-gold', manufatto: 'badge-warning', variabile: 'badge-muted' };

  const modStr = (v) => {
    const m = Math.floor((parseInt(v || 10) - 10) / 2);
    return (m >= 0 ? '+' : '') + m;
  };

  const highlight = (text, q) => {
    if (!q || !text) return text || '';
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return String(text).replace(re, '<mark style="background:var(--accent-secondary);color:#fff;border-radius:2px;padding:0 2px;">$1</mark>');
  };

  // ── Caricamento dati ──
  const load = async () => {
    if (_loaded || _loading) return;
    _loading = true;
    showLoading(true);
    Debug.log('Compendio: caricamento dati...');

    try {
      const base = 'data/';
      const files = [
        ['monsters',    'srd_5_2_1_monsters.json'],
        ['magic_items', 'srd_5_2_1_magic_items.json'],
        ['equipment',   'srd_5_2_1_equipment.json'],
        ['rules',       'srd_5_2_1_rules.json'],
      ];

      for (const [key, file] of files) {
        try {
          const r = await fetch(base + file);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          _data[key] = await r.json();
          Debug.log(`Compendio: ${key} caricato (${_data[key].length} voci)`);
        } catch (e) {
          Debug.error(`Compendio: errore caricamento ${file}:`, e.message);
          Toast.show(`Errore caricamento ${file}`, 'error');
        }
      }

      // Normalizza rarità oggetti magici
      _data.magic_items.forEach(i => {
        i._rarita_norm = normalizzaRarita(i.rarita);
      });

      _loaded = true;
      buildFilterOptions();
      render();
    } catch (e) {
      Debug.error('Compendio load:', e.message);
      Toast.show('Errore caricamento compendio', 'error');
    } finally {
      _loading = false;
      showLoading(false);
    }
  };

  const showLoading = (on) => {
    const el = document.getElementById('comp-loading');
    const content = document.getElementById('comp-content');
    if (el) el.style.display = on ? 'flex' : 'none';
    if (content) content.style.display = on ? 'none' : 'block';
  };

  // ── Costruisce opzioni filtri dinamicamente dai dati ──
  const buildFilterOptions = () => {
    // Tipi mostri
    const tipiMostri = [...new Set(_data.monsters.map(m => tipoPrincipale(m.tipo)))].sort();
    fillSelect('comp-filter-tipo-monsters', tipiMostri, 'Tutti i tipi');

    // GS unici (ordinati)
    const gsVals = [...new Set(_data.monsters.map(gsDisplay))].filter(v => v !== '?');
    const gsOrder = { '0': 0, '1/8': 0.125, '1/4': 0.25, '1/2': 0.5 };
    const gsSorted = gsVals.sort((a, b) => {
      const na = gsOrder[a] !== undefined ? gsOrder[a] : parseFloat(a);
      const nb = gsOrder[b] !== undefined ? gsOrder[b] : parseFloat(b);
      return na - nb;
    });
    fillSelect('comp-filter-gs-min', ['0', '1/8', '1/4', '1/2', ...gsSorted.filter(v => !['0','1/8','1/4','1/2'].includes(v))], 'GS min', false);
    fillSelect('comp-filter-gs-max', ['0', '1/8', '1/4', '1/2', ...gsSorted.filter(v => !['0','1/8','1/4','1/2'].includes(v))], 'GS max', false);

    // Tipi base oggetti magici
    const tipiMagic = [...new Set(_data.magic_items.map(i => i.tipo_base || ''))].filter(Boolean).sort();
    fillSelect('comp-filter-tipo-magic', tipiMagic, 'Tutti i tipi');

    // Categorie equipaggiamento
    const catEquip = [...new Set(_data.equipment.map(e => e.categoria || ''))].filter(Boolean).sort();
    fillSelect('comp-filter-cat-equip', catEquip, 'Tutte le categorie');

    // Tipi equipaggiamento
    const tipiEquip = [...new Set(_data.equipment.map(e => e.tipo || ''))].filter(Boolean).sort();
    fillSelect('comp-filter-tipo-equip', tipiEquip, 'Tutti i tipi');

    // Categorie regole
    const catRules = [...new Set(_data.rules.map(r => r.categoria || ''))].filter(Boolean).sort();
    fillSelect('comp-filter-cat-rules', catRules, 'Tutte le categorie');
  };

  const fillSelect = (id, options, placeholder, withEmpty = true) => {
    const el = document.getElementById(id);
    if (!el) return;
    const cur = el.value;
    el.innerHTML = withEmpty ? `<option value="">${placeholder}</option>` : `<option value="">${placeholder}</option>`;
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      el.appendChild(o);
    });
    el.value = cur;
  };

  // ── Cambio tab ──
  const switchTab = (tab) => {
    _activeTab = tab;
    const tabKeys = ['monsters', 'magic_items', 'equipment', 'rules'];
    const countIds = { monsters: 'comp-count-monsters', magic_items: 'comp-count-magic', equipment: 'comp-count-equip', rules: 'comp-count-rules' };
    tabKeys.forEach(t => {
      document.getElementById(`comp-tab-${t}`)?.classList.toggle('active', t === tab);
      document.getElementById(`comp-panel-${t}`)?.classList.toggle('active', t === tab);
      document.getElementById(`comp-filters-${t}`)?.classList.toggle('hidden', t !== tab);
      const countEl = document.getElementById(countIds[t]);
      if (countEl) countEl.style.display = t === tab ? '' : 'none';
    });
    if (!_loaded) { load(); return; }
    render();
    Debug.log(`Compendio tab: ${tab}`);
  };

  // ── Ricerca con debounce ──
  const onSearch = (tab) => {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => {
      _filters[tab].q = document.getElementById(`comp-search-${tab}`)?.value?.trim() || '';
      render();
    }, 200);
  };

  const onFilter = (tab, field, value) => {
    _filters[tab][field] = value;
    render();
  };

  // ── Render principale ──
  const render = () => {
    switch (_activeTab) {
      case 'monsters':    renderMonsters(); break;
      case 'magic_items': renderMagicItems(); break;
      case 'equipment':   renderEquipment(); break;
      case 'rules':       renderRules(); break;
    }
  };

  // ─────────────────────────────────────────────────
  // MOSTRI
  // ─────────────────────────────────────────────────
  const renderMonsters = () => {
    const el = document.getElementById('comp-list-monsters');
    if (!el) return;
    const f = _filters.monsters;
    const q = f.q.toLowerCase();

    const gsToNum = (s) => {
      if (!s) return -1;
      if (s === '1/8') return 0.125;
      if (s === '1/4') return 0.25;
      if (s === '1/2') return 0.5;
      return parseFloat(s);
    };

    let list = _data.monsters.filter(m => {
      if (q && !m.nome.toLowerCase().includes(q) && !tipoPrincipale(m.tipo).toLowerCase().includes(q)) return false;
      if (f.tipo && tipoPrincipale(m.tipo) !== f.tipo) return false;
      const gs = gsNumeric(m);
      if (f.gs_min && gs < gsToNum(f.gs_min)) return false;
      if (f.gs_max && gs > gsToNum(f.gs_max)) return false;
      return true;
    });

    list.sort((a, b) => {
      const ga = gsNumeric(a), gb = gsNumeric(b);
      if (ga !== gb) return ga - gb;
      return a.nome.localeCompare(b.nome, 'it');
    });

    const count = document.getElementById('comp-count-monsters');
    if (count) count.textContent = `${list.length} mostri`;

    if (list.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🐉</div><h3>Nessun mostro trovato</h3><p class="text-sm text-muted">Prova a modificare i filtri</p></div>`;
      return;
    }

    el.innerHTML = list.map(m => {
      const gs = gsDisplay(m);
      const tipo = tipoPrincipale(m.tipo);
      const pf = m.punti_ferita?.media || '?';
      const ca = m.classe_armatura || '?';
      return `
        <div class="comp-row" onclick="Compendio.openMonster('${m.id}')">
          <div class="comp-row-main">
            <span class="comp-row-name">${highlight(m.nome, f.q)}</span>
            <span class="comp-row-meta">${highlight(tipo, f.q)} · ${m.dimensione || ''}</span>
          </div>
          <div class="comp-row-stats">
            <span class="comp-stat-pill" title="Grado Sfida">GS ${gs}</span>
            <span class="comp-stat-pill" title="Punti Ferita">PF ${pf}</span>
            <span class="comp-stat-pill" title="Classe Armatura">CA ${ca}</span>
          </div>
        </div>`;
    }).join('');
  };

  // ─────────────────────────────────────────────────
  // OGGETTI MAGICI
  // ─────────────────────────────────────────────────
  const renderMagicItems = () => {
    const el = document.getElementById('comp-list-magic');
    if (!el) return;
    const f = _filters.magic_items;
    const q = f.q.toLowerCase();

    let list = _data.magic_items.filter(i => {
      if (q && !i.nome.toLowerCase().includes(q) && !(i.tipo_base || '').toLowerCase().includes(q)) return false;
      if (f.tipo_base && i.tipo_base !== f.tipo_base) return false;
      if (f.rarita && i._rarita_norm !== f.rarita) return false;
      return true;
    });

    list.sort((a, b) => {
      const ra = raritaOrder[a._rarita_norm] ?? 99;
      const rb = raritaOrder[b._rarita_norm] ?? 99;
      if (ra !== rb) return ra - rb;
      return a.nome.localeCompare(b.nome, 'it');
    });

    const count = document.getElementById('comp-count-magic');
    if (count) count.textContent = `${list.length} oggetti`;

    if (list.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✨</div><h3>Nessun oggetto trovato</h3></div>`;
      return;
    }

    el.innerHTML = list.map(i => `
      <div class="comp-row" onclick="Compendio.openMagicItem('${i.id}')">
        <div class="comp-row-main">
          <span class="comp-row-name">${highlight(i.nome, f.q)}</span>
          <span class="comp-row-meta">${i.tipo_base || ''} ${i.richiede_sintonia ? '· <em>richiede sintonia</em>' : ''}</span>
        </div>
        <div class="comp-row-stats">
          <span class="badge ${raritaBadge[i._rarita_norm] || 'badge-muted'}">${i._rarita_norm}</span>
        </div>
      </div>`).join('');
  };

  // ─────────────────────────────────────────────────
  // EQUIPAGGIAMENTO
  // ─────────────────────────────────────────────────
  const renderEquipment = () => {
    const el = document.getElementById('comp-list-equip');
    if (!el) return;
    const f = _filters.equipment;
    const q = f.q.toLowerCase();

    let list = _data.equipment.filter(e => {
      if (q && !e.nome.toLowerCase().includes(q) && !(e.categoria || '').toLowerCase().includes(q)) return false;
      if (f.tipo && e.tipo !== f.tipo) return false;
      if (f.categoria && e.categoria !== f.categoria) return false;
      return true;
    });

    list.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

    const count = document.getElementById('comp-count-equip');
    if (count) count.textContent = `${list.length} voci`;

    if (list.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚔️</div><h3>Nessun equipaggiamento trovato</h3></div>`;
      return;
    }

    el.innerHTML = list.map(e => `
      <div class="comp-row" onclick="Compendio.openEquipment('${e.id}')">
        <div class="comp-row-main">
          <span class="comp-row-name">${highlight(e.nome, f.q)}</span>
          <span class="comp-row-meta">${highlight(e.categoria || '', f.q)}</span>
        </div>
        <div class="comp-row-stats">
          ${e.danni ? `<span class="comp-stat-pill">${e.danni}</span>` : ''}
          ${e.costo ? `<span class="comp-stat-pill">${e.costo}</span>` : ''}
          ${e.peso  ? `<span class="comp-stat-pill">${e.peso}</span>`  : ''}
        </div>
      </div>`).join('');
  };

  // ─────────────────────────────────────────────────
  // REGOLE
  // ─────────────────────────────────────────────────
  const renderRules = () => {
    const el = document.getElementById('comp-list-rules');
    if (!el) return;
    const f = _filters.rules;
    const q = f.q.toLowerCase();

    let list = _data.rules.filter(r => {
      if (q && !r.nome.toLowerCase().includes(q) && !(r.descrizione || '').toLowerCase().includes(q)) return false;
      if (f.categoria && r.categoria !== f.categoria) return false;
      return true;
    });

    list.sort((a, b) => (a.categoria || '').localeCompare(b.categoria || '', 'it') || a.nome.localeCompare(b.nome, 'it'));

    const count = document.getElementById('comp-count-rules');
    if (count) count.textContent = `${list.length} regole`;

    if (list.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📖</div><h3>Nessuna regola trovata</h3></div>`;
      return;
    }

    let currentCat = '';
    el.innerHTML = list.map(r => {
      let catHeader = '';
      if (r.categoria !== currentCat) {
        currentCat = r.categoria;
        catHeader = `<div class="comp-cat-header">${r.categoria}</div>`;
      }
      return catHeader + `
        <div class="comp-row" onclick="Compendio.openRule('${r.id}')">
          <div class="comp-row-main">
            <span class="comp-row-name">${highlight(r.nome, f.q)}</span>
            <span class="comp-row-meta">${r.pagine_sorgente ? 'p. ' + r.pagine_sorgente : ''}</span>
          </div>
          <div class="comp-row-stats">
            <span class="comp-stat-pill">${r.capitolo || ''}</span>
          </div>
        </div>`;
    }).join('');
  };

  // ─────────────────────────────────────────────────
  // MODAL DETTAGLIO MOSTRO
  // ─────────────────────────────────────────────────
  const openMonster = (id) => {
    const m = _data.monsters.find(x => x.id === id);
    if (!m) return;
    Debug.log(`Compendio: apro mostro ${m.nome}`);

    const gs = m.grado_sfida || {};
    const pf = m.punti_ferita || {};
    const car = m.caratteristiche || {};
    const vel = m.velocita || {};

    const statAbbr = { forza: 'FOR', destrezza: 'DES', costituzione: 'COS', intelligenza: 'INT', saggezza: 'SAG', carisma: 'CAR' };

    const abilitaStr = Object.entries(m.abilita || {}).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v >= 0 ? '+' : ''}${v}`).join(', ');
    const velStr = Object.entries(vel).filter(([,v]) => v).map(([k, v]) => k === 'camminata' ? v : `${k} ${v}`).join(', ');
    const tsStr = Object.entries(car).filter(([,v]) => v.tiro_salvezza !== v.modificatore).map(([k, v]) => `${statAbbr[k] || k} ${v.tiro_salvezza >= 0 ? '+' : ''}${v.tiro_salvezza}`).join(', ');

    const renderAzioni = (lista, titolo) => {
      if (!lista || !lista.length) return '';
      return `<div class="sb-section-title">${titolo}</div>` +
        lista.map(a => `<div class="sb-action"><strong>${a.nome}.</strong> <span class="text-secondary">${a.descrizione || ''}</span></div>`).join('');
    };

    const renderAzioniLegg = (al) => {
      if (!al || !al.azioni || !al.azioni.length) return '';
      return `<div class="sb-section-title">Azioni Leggendarie</div>
        <div class="sb-action text-muted text-sm" style="margin-bottom:6px;">${al.descrizione_utilizzi || ''}</div>` +
        al.azioni.map(a => `<div class="sb-action"><strong>${a.nome}.</strong> <span class="text-secondary">${a.descrizione || ''}</span></div>`).join('');
    };

    const immunLine = (label, arr) => arr && arr.length ? `<div class="stat-row"><strong>${label}</strong> <span>${arr.join(', ')}</span></div>` : '';

    const content = `
      <div class="stat-block" style="max-height:65vh;overflow-y:auto;">
        <div class="stat-block-title">${m.nome}</div>
        <div class="stat-block-subtitle">${m.dimensione || ''} ${m.tipo || ''}${m.allineamento ? ', ' + m.allineamento : ''}</div>
        <div class="stat-block-divider"></div>
        <div class="stat-row"><strong>Classe Armatura</strong> <span>${m.classe_armatura || '—'}</span></div>
        <div class="stat-row"><strong>Punti Ferita</strong> <span>${pf.media || '—'} ${pf.formula ? '(' + pf.formula + ')' : ''}</span></div>
        <div class="stat-row"><strong>Velocità</strong> <span>${velStr || '—'}</span></div>
        <div class="stat-block-divider"></div>
        <div class="stat-abilities">
          ${Object.entries(statAbbr).map(([key, abbr]) => {
            const s = car[key] || {};
            return `<div class="stat-ability-box">
              <div class="stat-ability-name">${abbr}</div>
              <div class="stat-ability-score">${s.punteggio || 10}</div>
              <div class="stat-ability-mod">${modStr(s.punteggio || 10)}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="stat-block-divider"></div>
        ${tsStr ? `<div class="stat-row"><strong>Tiri Salvezza</strong> <span>${tsStr}</span></div>` : ''}
        ${abilitaStr ? `<div class="stat-row"><strong>Abilità</strong> <span>${abilitaStr}</span></div>` : ''}
        ${immunLine('Immunità ai Danni', m.immunita_danni)}
        ${immunLine('Resistenze', m.resistenze)}
        ${immunLine('Vulnerabilità', m.vulnerabilita)}
        ${immunLine('Immunità alle Condizioni', m.immunita_condizione)}
        <div class="stat-row"><strong>Sensi</strong> <span>${Object.entries(m.sensi || {}).filter(([,v])=>v).map(([k,v])=>k.replace(/_/g,' ')+ ' ' +v).join(', ') || '—'}</span></div>
        ${m.lingue?.length ? `<div class="stat-row"><strong>Lingue</strong> <span>${m.lingue.join(', ')}</span></div>` : ''}
        <div class="stat-row"><strong>Grado di Sfida</strong> <span>${gs.raw || gsDisplay(m)}</span></div>
        <div class="stat-row"><strong>Bonus Competenza</strong> <span>+${m.bonus_competenza || '?'}</span></div>
        <div class="stat-block-divider"></div>
        ${(m.tratti || []).map(t => `<div class="sb-action"><strong>${t.nome}.</strong> <span class="text-secondary">${t.descrizione || ''}</span></div>`).join('')}
        ${renderAzioni(m.azioni, 'Azioni')}
        ${renderAzioni(m.azioni_bonus, 'Azioni Bonus')}
        ${renderAzioni(m.reazioni, 'Reazioni')}
        ${renderAzioniLegg(m.azioni_leggendarie)}
      </div>`;

    openDetailModal(m.nome, content, () => sendToCombat(m));
  };

  // ─────────────────────────────────────────────────
  // MODAL DETTAGLIO OGGETTO MAGICO
  // ─────────────────────────────────────────────────
  const openMagicItem = (id) => {
    const i = _data.magic_items.find(x => x.id === id);
    if (!i) return;
    Debug.log(`Compendio: apro oggetto ${i.nome}`);

    const content = `
      <div style="max-height:65vh;overflow-y:auto;">
        <div style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-md);">
          <span class="badge ${raritaBadge[i._rarita_norm] || 'badge-muted'}">${i._rarita_norm}</span>
          <span class="text-sm text-muted">${i.tipo || ''}</span>
          ${i.richiede_sintonia ? '<span class="badge badge-muted">richiede sintonia</span>' : ''}
        </div>
        <div class="text-sm" style="line-height:1.7;white-space:pre-wrap;">${i.descrizione || '—'}</div>
      </div>`;

    openDetailModal(i.nome, content);
  };

  // ─────────────────────────────────────────────────
  // MODAL DETTAGLIO EQUIPAGGIAMENTO
  // ─────────────────────────────────────────────────
  const openEquipment = (id) => {
    const e = _data.equipment.find(x => x.id === id);
    if (!e) return;
    Debug.log(`Compendio: apro equipaggiamento ${e.nome}`);

    const rows = [
      e.categoria ? ['Categoria', e.categoria] : null,
      e.danni     ? ['Danni', e.danni] : null,
      e.proprieta?.length ? ['Proprietà', e.proprieta.join(', ')] : null,
      e.padronanza ? ['Padronanza', e.padronanza] : null,
      e.peso   ? ['Peso', e.peso] : null,
      e.costo  ? ['Costo', e.costo] : null,
    ].filter(Boolean);

    // Sezioni tabella (es. armature)
    const sezioniHTML = (e.sezioni || []).map(s => {
      if (!s.righe || !s.righe.length) return '';
      const keys = Object.keys(s.righe[0]);
      return `
        <div style="margin-top:var(--space-md);">
          <div class="comp-cat-header">${s.titolo}</div>
          <table style="width:100%;font-size:0.82rem;border-collapse:collapse;">
            <thead><tr>${keys.map(k => `<th style="text-align:left;padding:4px 6px;border-bottom:1px solid var(--border);font-family:var(--font-display);font-size:0.7rem;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-muted);">${k}</th>`).join('')}</tr></thead>
            <tbody>${s.righe.map(r => `<tr>${keys.map(k => `<td style="padding:4px 6px;border-bottom:1px solid var(--border);vertical-align:top;">${r[k] || ''}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>`;
    }).join('');

    const content = `
      <div style="max-height:65vh;overflow-y:auto;">
        <table style="width:100%;font-size:0.85rem;margin-bottom:var(--space-md);">
          ${rows.map(([k,v]) => `<tr><td style="color:var(--text-muted);padding:3px 0;width:110px;font-family:var(--font-display);font-size:0.75rem;letter-spacing:0.04em;text-transform:uppercase;">${k}</td><td style="padding:3px 0;">${v}</td></tr>`).join('')}
        </table>
        ${e.descrizione ? `<div class="text-sm" style="line-height:1.7;margin-bottom:var(--space-md);white-space:pre-wrap;">${e.descrizione}</div>` : ''}
        ${sezioniHTML}
      </div>`;

    openDetailModal(e.nome, content);
  };

  // ─────────────────────────────────────────────────
  // MODAL DETTAGLIO REGOLA
  // ─────────────────────────────────────────────────
  const openRule = (id) => {
    const r = _data.rules.find(x => x.id === id);
    if (!r) return;
    Debug.log(`Compendio: apro regola ${r.nome}`);

    const sezioniHTML = (r.sezioni || []).map(s => {
      if (!s.righe || !s.righe.length) return `<div class="comp-cat-header">${s.titolo}</div>`;
      const keys = Object.keys(s.righe[0]);
      return `
        <div style="margin-top:var(--space-md);">
          <div class="comp-cat-header">${s.titolo}</div>
          <table style="width:100%;font-size:0.82rem;border-collapse:collapse;">
            <thead><tr>${keys.map(k => `<th style="text-align:left;padding:4px 6px;border-bottom:1px solid var(--border);font-family:var(--font-display);font-size:0.7rem;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-muted);">${k}</th>`).join('')}</tr></thead>
            <tbody>${s.righe.map(row => `<tr>${keys.map(k => `<td style="padding:4px 6px;border-bottom:1px solid var(--border);vertical-align:top;">${row[k] || ''}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>`;
    }).join('');

    const content = `
      <div style="max-height:65vh;overflow-y:auto;">
        <div class="text-xs text-muted" style="margin-bottom:var(--space-md);font-family:var(--font-display);letter-spacing:0.05em;text-transform:uppercase;">${r.categoria} · ${r.capitolo}${r.pagine_sorgente ? ' · p. ' + r.pagine_sorgente : ''}</div>
        ${r.descrizione ? `<div class="text-sm" style="line-height:1.7;margin-bottom:var(--space-md);">${r.descrizione}</div>` : ''}
        ${sezioniHTML}
      </div>`;

    openDetailModal(r.nome, content);
  };

  // ─────────────────────────────────────────────────
  // MODAL DETTAGLIO GENERICO
  // ─────────────────────────────────────────────────
  let _currentMonsterForCombat = null;

  const openDetailModal = (title, content, onSendToCombat = null) => {
    _currentMonsterForCombat = onSendToCombat;
    const titleEl  = document.getElementById('comp-detail-title');
    const bodyEl   = document.getElementById('comp-detail-body');
    const combatBtn = document.getElementById('comp-detail-combat-btn');

    if (titleEl)  titleEl.textContent = title;
    if (bodyEl)   bodyEl.innerHTML = content;
    if (combatBtn) combatBtn.style.display = onSendToCombat ? 'inline-flex' : 'none';

    Modal.open('comp-detail');
  };

  // ─────────────────────────────────────────────────
  // INVIA AL COMBAT TRACKER
  // ─────────────────────────────────────────────────
  const sendToCombat = (m) => {
    if (!m) { if (_currentMonsterForCombat) _currentMonsterForCombat(); return; }
    Debug.log(`Compendio → Combat: ${m.nome}`);
    const pf = m.punti_ferita?.media || 10;
    const combatant = {
      id: 'comb_' + Date.now(),
      nome: m.nome,
      tipo: 'mostro',
      hp: pf,
      maxHp: pf,
      ca: m.classe_armatura || 10,
      iniziativa: 0,
      gs: m.grado_sfida ? (m.grado_sfida.raw || String(m.grado_sfida.valore)) : '?',
      monsterId: m.id,
      condizioni: [],
    };
    // Salva nella campagna attiva come "in attesa" per il combat tracker
    const camp = App.getActiveCampaign();
    if (camp) {
      const pending = camp.pendingCombatants || [];
      pending.push(combatant);
      App.saveActiveCampaign({ pendingCombatants: pending });
      Toast.show(`${m.nome} aggiunto al Combat Tracker`, 'success');
      Modal.close('comp-detail');
      App.navigateTo('sessione');
    } else {
      Toast.show('Seleziona prima una campagna', 'warning');
    }
  };

  const sendCurrentToCombat = () => {
    if (_currentMonsterForCombat) _currentMonsterForCombat();
  };

  // ── Init ──
  const init = () => {
    if (!_loaded && !_loading) load();
    else if (_loaded) render();
    Debug.log('Compendio.init()');
  };

  return {
    init, switchTab, onSearch, onFilter,
    openMonster, openMagicItem, openEquipment, openRule,
    sendCurrentToCombat,
    getData: () => _data,
  };
})();

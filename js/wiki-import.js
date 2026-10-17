/* ============================================================
   WIKI-IMPORT.JS — Importa schede Wiki (PNG, Luoghi, Fazioni, Lore,
   PG, Incontri, Quest, Sessioni) da un foglio CSV, per portare in
   dm-toolkit i dati di una campagna scritti altrove (Word, Obsidian,
   Google Sheet...) senza doverli ricreare a mano scheda per scheda.

   Le colonne "narrative" del template sono generate leggendo a runtime
   WikiSections._getCfg(tipo).fields, non duplicate qui: se lo schema
   di una scheda cambia, template e parser restano sincronizzati da
   soli. Il campo 'date_inworld' (calendario in-world) non e'
   rappresentabile in una cella di testo e viene escluso dal template.

   PNG e PG hanno ANCHE uno statblock di combattimento (CA, PF,
   caratteristiche, azioni...), ma quello vive fuori da WikiSections:
   per i PNG e' editato dal modal dedicato NPC.openModal(...,'combat')
   su camp.npcs[], per i PG dal modal Party su camp.party[] (non
   camp.pg[] — vedi _pgComeStatBlock in index.html). Per questo le
   colonne statblock sono definite qui a parte (COMBAT_COLS) invece
   che tramite WikiSections._getCfg, e scritte col loro merge dedicato
   dopo il salvataggio narrativo, invece di passare per cfg.saveItem.

   Reimportare lo stesso foglio aggiorna le schede esistenti (stesso
   Nome, maiuscole/spazi ignorati) invece di duplicarle — fonde solo
   le colonne compilate in questo giro, il resto della scheda resta
   intatto.

   Modulo autonomo: costruisce il proprio modale a runtime e aggiunge
   la propria voce nel sottomenu Wiki gia' presente in pagina, senza
   toccare altro markup statico.
   ============================================================ */

const WikiImport = (() => {
  const TIPI = ['png', 'luoghi', 'fazioni', 'lore', 'pg', 'incontri', 'quest', 'sessioni'];

  // Colonne extra di statblock, solo per png/pg. "dataKey" e' il nome reale
  // del campo sul record di destinazione quando differisce dalla label
  // (es. Azioni dei PG si chiama "azioni", quello dei PNG "actions").
  // "actionList" = testo multi-riga "Nome: descrizione" -> array {name,desc}.
  // "multiline" = testo libero, una riga per voce (tratti/talenti/note),
  // salvato cosi' com'e' (lo stat block lo spezza gia' lui riga per riga).
  const COMBAT_COLS = {
    png: [
      { key: 'cr', dataKey: 'cr', label: 'Statblock: Grado di Sfida', hint: 'es. 2 oppure 1/4' },
      { key: 'ac', dataKey: 'ac', label: 'Statblock: Classe Armatura', hint: 'es. 15' },
      { key: 'hp', dataKey: 'hp', label: 'Statblock: Punti Ferita', hint: 'es. 45 oppure 45 (6d8+12)' },
      { key: 'speed', dataKey: 'speed', label: 'Statblock: Velocita', hint: 'es. 9 m' },
      { key: 'iniziativa', dataKey: 'iniziativa', label: 'Statblock: Iniziativa', hint: 'es. +2 (vuoto = da Destrezza)' },
      { key: 'profBonus', dataKey: 'profBonus', label: 'Statblock: Bonus Competenza', hint: 'es. 2' },
      { key: 'type', dataKey: 'type', label: 'Statblock: Tipo creatura', hint: 'es. Umanoide (vuoto = Umanoide)' },
      { key: 'align', dataKey: 'align', label: 'Statblock: Allineamento', hint: 'vuoto = usa l\'Allineamento narrativo sopra' },
      { key: 'str', dataKey: 'str', label: 'Statblock: Forza', hint: 'es. 14' },
      { key: 'dex', dataKey: 'dex', label: 'Statblock: Destrezza', hint: 'es. 12' },
      { key: 'con', dataKey: 'con', label: 'Statblock: Costituzione', hint: 'es. 13' },
      { key: 'int_', dataKey: 'int_', label: 'Statblock: Intelligenza', hint: 'es. 10' },
      { key: 'wis', dataKey: 'wis', label: 'Statblock: Saggezza', hint: 'es. 11' },
      { key: 'cha', dataKey: 'cha', label: 'Statblock: Carisma', hint: 'es. 14' },
      { key: 'savingThrows', dataKey: 'savingThrows', label: 'Statblock: Tiri Salvezza', hint: 'es. Des +4, Sag +2' },
      { key: 'skills', dataKey: 'skills', label: 'Statblock: Abilita', hint: 'es. Percezione +4, Furtivita +3' },
      { key: 'immunities', dataKey: 'immunities', label: 'Statblock: Immunita/Resistenze ai danni', hint: 'es. resistenza fuoco' },
      { key: 'vulnerabilities', dataKey: 'vulnerabilities', label: 'Statblock: Vulnerabilita', hint: '' },
      { key: 'condImmunities', dataKey: 'condImmunities', label: 'Statblock: Immunita alle condizioni', hint: '' },
      { key: 'senses', dataKey: 'senses', label: 'Statblock: Sensi', hint: 'es. scurovisione 18 m' },
      { key: 'languages', dataKey: 'languages', label: 'Statblock: Linguaggi', hint: 'es. Comune, Elfico' },
      { key: 'gear', dataKey: 'gear', label: 'Statblock: Equipaggiamento', hint: '' },
      { key: 'talenti', dataKey: 'talenti', label: 'Statblock: Talenti', multiline: true, hint: 'uno per riga' },
      { key: 'special', dataKey: 'special', label: 'Statblock: Tratti', multiline: true, hint: 'uno per riga, es. "Resistenza alla magia: vantaggio ai TS contro incantesimi"' },
      { key: 'azioni', dataKey: 'actions', label: 'Statblock: Azioni', actionList: true, hint: 'una per riga: Nome: descrizione' },
      { key: 'azioniBonus', dataKey: 'azioniBonus', label: 'Statblock: Azioni bonus', actionList: true, hint: 'una per riga: Nome: descrizione' },
      { key: 'reazioni', dataKey: 'reazioni', label: 'Statblock: Reazioni', actionList: true, hint: 'una per riga: Nome: descrizione' },
      { key: 'azioniLeggendarie', dataKey: 'azioniLeggendarie', label: 'Statblock: Azioni leggendarie', actionList: true, hint: 'una per riga: Nome: descrizione' },
      { key: 'combatNotes', dataKey: 'combatNotes', label: 'Statblock: Note di combattimento', multiline: true, hint: '' },
    ],
    pg: [
      { key: 'profBonus', dataKey: 'profBonus', label: 'Statblock: Bonus Competenza', hint: 'es. 3' },
      { key: 'investigazionePassiva', dataKey: 'investigazionePassiva', label: 'Statblock: Investigazione passiva', hint: 'es. 14' },
      { key: 'intuizionePassiva', dataKey: 'intuizionePassiva', label: 'Statblock: Intuizione passiva', hint: 'es. 12' },
      { key: 'str', dataKey: 'str', label: 'Statblock: Forza', hint: 'es. 16' },
      { key: 'dex', dataKey: 'dex', label: 'Statblock: Destrezza', hint: 'es. 14' },
      { key: 'con', dataKey: 'con', label: 'Statblock: Costituzione', hint: 'es. 15' },
      { key: 'int_', dataKey: 'int_', label: 'Statblock: Intelligenza', hint: 'es. 10' },
      { key: 'wis', dataKey: 'wis', label: 'Statblock: Saggezza', hint: 'es. 12' },
      { key: 'cha', dataKey: 'cha', label: 'Statblock: Carisma', hint: 'es. 8' },
      { key: 'savingThrows', dataKey: 'savingThrows', label: 'Statblock: Tiri Salvezza', hint: 'es. For +5, Cos +4' },
      { key: 'skills', dataKey: 'skills', label: 'Statblock: Abilita', hint: 'es. Atletica +5, Percezione +3' },
      { key: 'gear', dataKey: 'gear', label: 'Statblock: Equipaggiamento', hint: '' },
      { key: 'talenti', dataKey: 'talenti', label: 'Statblock: Talenti', multiline: true, hint: 'uno per riga' },
      { key: 'azioni', dataKey: 'azioni', label: 'Statblock: Azioni', actionList: true, hint: 'una per riga: Nome: descrizione' },
      { key: 'noteCombat', dataKey: 'noteCombat', label: 'Statblock: Note di combattimento', multiline: true, hint: '' },
    ],
  };
  // Dove va scritto lo statblock fuso: PNG su camp.npcs[], PG su camp.party[]
  // (non camp.pg[] — e' camp.party[] che la Wiki legge per i PG, vedi sopra).
  const COMBAT_TARGET = { png: 'npcs', pg: 'party' };

  const _cfg = (tipo) => WikiSections._getCfg(tipo);
  const _norm = (s) => String(s || '').trim().toLowerCase();

  const _escHtml = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // Il campo 'contenuto' (solo Lore) e' HTML vero, renderizzato via innerHTML
  // nell'editor: il testo incollato va quindi escapato prima di trasformarlo
  // in paragrafi, altrimenti "<script>" in una cella diventerebbe markup.
  const _textToHtml = (s) => {
    const righe = String(s || '').trim().split(/\r?\n+/).filter(Boolean);
    return righe.map(r => '<p>' + _escHtml(r) + '</p>').join('');
  };

  // "Nome: descrizione" una voce per riga -> [{name,desc}], per le liste di
  // azioni/azioni bonus/reazioni/azioni leggendarie. Se manca ':' tutta la
  // riga diventa il nome (meglio una voce senza descrizione che perderla).
  const _parseActionList = (testo) => String(testo || '').trim().split(/\r?\n+/)
    .map(r => r.trim()).filter(Boolean)
    .map(r => {
      const i = r.indexOf(':');
      return i === -1 ? { name: r, desc: '' } : { name: r.slice(0, i).trim(), desc: r.slice(i + 1).trim() };
    });

  // Colonne del template per un tipo: sempre Nome (+ Contenuto per Lore) in
  // testa, poi i campi testuali/select/mention dello schema, poi lo
  // statblock (solo png/pg) prima di Tag.
  const _colonne = (tipo) => {
    const cfg = _cfg(tipo);
    const cols = [{ key: 'nome', label: 'Nome' }];
    if (tipo === 'lore') cols.push({ key: 'contenuto', label: 'Contenuto' });
    cfg.fields.forEach(f => {
      if (f.type === 'separator' || f.type === 'date_inworld') return;
      cols.push({ key: f.key, label: f.label, field: f });
    });
    (COMBAT_COLS[tipo] || []).forEach(c => cols.push({ ...c, combat: true }));
    cols.push({ key: 'tags', label: 'Tag' });
    return cols;
  };

  // Excel usa il separatore di lista del sistema operativo (in Italia spesso ';'
  // e non ',') per decidere come dividere le colonne quando si apre un CSV con
  // doppio click: senza aiuto, un file con virgole finisce tutto in una cella
  // sola. Rileva quale dei due e' davvero in uso guardando l'intestazione.
  const _rilevaSeparatore = (text) => {
    const primaRiga = text.split(/\r?\n/).find(l => l.trim() !== '') || '';
    const virgole = (primaRiga.match(/,/g) || []).length;
    const puntoVirgola = (primaRiga.match(/;/g) || []).length;
    return puntoVirgola > virgole ? ';' : ',';
  };

  // ── CSV: parsing tollerante a virgole/newline dentro campi tra virgolette
  // (come li esporta Excel/Google Sheets), BOM ed \r sempre ignorati ──
  const _parseCSV = (text) => {
    text = text.replace(/^﻿/, '').replace(/^sep=.\r?\n/i, '');
    const delim = _rilevaSeparatore(text);
    const rows = [];
    let row = [], cell = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '\r') continue;
      if (inQuotes) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false; }
        else cell += c;
      } else if (c === '"') inQuotes = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.length > 1 || (r[0] || '').trim() !== '');
  };

  const _csvCell = (v) => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  const scaricaTemplate = () => {
    const tipo = document.getElementById('wi-tipo')?.value;
    if (!tipo) return;
    const cols = _colonne(tipo);
    const header = cols.map(c => c.label);
    const esempio = cols.map(c => {
      if (c.key === 'nome') return 'Es. ' + _cfg(tipo).label + ' 1';
      if (c.key === 'contenuto') return 'Testo della pagina: un paragrafo per riga, quanto vuoi.';
      if (c.key === 'tags') return 'tag1, tag2';
      if (c.actionList) return 'Morso: Attacco con arma da mischia, +4 al tiro, 1d6+2 perforanti';
      const f = c.field;
      if (f?.type === 'select') return f.options.find(Boolean) || '';
      return f?.hint || c.hint || '';
    });
    // "sep=," e' una convenzione che Excel riconosce in prima riga per aprire
    // subito il file diviso in colonne, qualunque sia la lingua di Windows
    // (altrimenti in molti PC italiani il file si apre tutto in una cella sola).
    const csv = 'sep=,\r\n' + [header, esempio].map(r => r.map(_csvCell).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dmtoolkit-' + tipo + '-template.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const _setStatus = (msg, kind) => {
    const el = document.getElementById('wi-status');
    if (!el) return;
    if (!msg) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const colors = {
      error: ['rgba(139,38,53,0.15)', 'var(--accent-danger)'],
      warning: ['rgba(193,127,59,0.15)', 'var(--accent-warning)'],
      success: ['rgba(58,125,68,0.15)', 'var(--accent-success)'],
    };
    const [bg, fg] = colors[kind] || colors.success;
    el.style.background = bg; el.style.color = fg;
    el.textContent = msg;
  };

  // Scrive le colonne statblock di una riga sul record vero (camp.npcs per
  // png, camp.party per pg) — bypassa cfg.saveItem perche' quei campi non
  // fanno parte dello schema WikiSections (vedi nota in testa al file).
  // Fonde solo le chiavi compilate in questa riga: il resto della scheda
  // (e le combat col lasciate vuote) non viene toccato.
  const _applyCombat = (tipo, id, row, idxOf) => {
    const cols = COMBAT_COLS[tipo];
    const target = COMBAT_TARGET[tipo];
    if (!cols || !target) return false;
    const merge = {};
    let trovato = false;
    cols.forEach(c => {
      const idx = idxOf[c.key];
      if (idx === undefined || idx === -1) return;
      const raw = (row[idx] || '').trim();
      if (!raw) return;
      trovato = true;
      merge[c.dataKey] = c.actionList ? _parseActionList(raw) : raw;
    });
    if (!trovato) return false;
    // L'allineamento da combattimento, se non compilato, riusa quello narrativo
    // appena salvato: evita di dover scrivere la stessa cosa due volte.
    if (tipo === 'png' && !merge.align) {
      const idxAll = idxOf['allineamento'];
      const allNarrativo = idxAll !== undefined && idxAll > -1 ? (row[idxAll] || '').trim() : '';
      if (allNarrativo) merge.align = allNarrativo;
    }
    const camp = App.getActiveCampaign();
    const lista = [...(camp?.[target] || [])];
    const idx = lista.findIndex(x => x.id === id);
    if (idx === -1) return false;
    lista[idx] = { ...lista[idx], ...merge };
    App.saveActiveCampaign({ [target]: lista });
    return true;
  };

  const importa = async () => {
    const tipo = document.getElementById('wi-tipo')?.value;
    const file = document.getElementById('wi-file')?.files?.[0];
    const btn = document.getElementById('wi-importa-btn');
    const warnEl = document.getElementById('wi-avvisi');
    if (warnEl) warnEl.innerHTML = '';
    _setStatus(null);

    if (!file) { try { Toast.show('Scegli prima un file CSV', 'warning'); } catch (e) {} return; }
    const camp = App.getActiveCampaign();
    if (!camp) { _setStatus('Nessuna campagna attiva.', 'error'); return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Importazione...'; }

    try {
      const text = await file.text();
      const rows = _parseCSV(text);
      if (!rows.length) { _setStatus('Il file e\' vuoto.', 'error'); return; }

      const header = rows[0].map(_norm);
      const cols = _colonne(tipo);
      const idxOf = {};
      cols.forEach(c => { idxOf[c.key] = header.indexOf(_norm(c.label)); });

      if (idxOf.nome === -1) {
        _setStatus('Colonna "Nome" non trovata: usa il template scaricato per "' + _cfg(tipo).label + '".', 'error');
        return;
      }
      const colonneRiconosciute = cols.filter(c => c.key !== 'nome' && c.key !== 'tags' && idxOf[c.key] > -1).length;
      const avvisoMismatch = (rows[0].length > 1 && colonneRiconosciute === 0)
        ? 'Nessuna colonna dello schema "' + _cfg(tipo).label + '" riconosciuta (hai caricato il template per un altro tipo?). '
        : '';

      let creati = 0, aggiornati = 0, saltati = 0, conStatblock = 0;
      const avvisi = [];
      const cfg = _cfg(tipo);

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const nome = (row[idxOf.nome] || '').trim();
        if (!nome) { saltati++; continue; }

        // Stessa scheda gia' presente (stesso nome, maiuscole/spazi ignorati)?
        // Si aggiorna quella invece di crearne una copia. Si riparte dalla
        // versione completa esistente (non da un oggetto vuoto) cosi' le
        // colonne lasciate in bianco in questo giro non cancellano nulla.
        const esistenti = cfg.getData(App.getActiveCampaign());
        const match = esistenti.find(x => _norm(x.nome) === _norm(nome));
        const item = match ? { ...match } : cfg.newItem();
        item.nome = nome;

        if (idxOf.contenuto > -1) {
          const contRaw = (row[idxOf.contenuto] || '').trim();
          if (contRaw) item.contenuto = _textToHtml(row[idxOf.contenuto]);
        }

        cfg.fields.forEach(f => {
          if (f.type === 'separator' || f.type === 'date_inworld') return;
          const idx = idxOf[f.key];
          if (idx === undefined || idx === -1) return;
          const val = (row[idx] || '').trim();
          if (!val) return;
          if (f.type === 'select') {
            const sel = f.options.find(o => _norm(o) === _norm(val));
            if (sel) item[f.key] = sel;
            else avvisi.push('Riga ' + (r + 1) + ': valore "' + val + '" non valido per "' + f.label + '", ignorato.');
          } else {
            item[f.key] = val;
          }
        });

        if (idxOf.tags > -1) {
          const tagsRaw = (row[idxOf.tags] || '').trim();
          if (tagsRaw) item.tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
        }

        cfg.saveItem(App.getActiveCampaign(), item);
        if (_applyCombat(tipo, item.id, row, idxOf)) conStatblock++;
        if (match) aggiornati++; else creati++;
      }

      try { WikiSections.renderList(tipo); } catch (e) {}
      try { WikiSections.renderCounters(); } catch (e) {}

      const tot = creati + aggiornati;
      const msg = avvisoMismatch + tot + ' sched' + (tot === 1 ? 'a importata' : 'e importate') +
        ' (' + creati + ' nuov' + (creati === 1 ? 'a' : 'e') + ', ' + aggiornati + ' aggiornat' + (aggiornati === 1 ? 'a' : 'e') + ')' +
        (conStatblock ? ', ' + conStatblock + ' con statblock' : '') +
        (saltati ? ', ' + saltati + ' rig' + (saltati === 1 ? 'a vuota saltata' : 'he vuote saltate') : '') +
        (avvisi.length ? ', ' + avvisi.length + ' avvis' + (avvisi.length === 1 ? 'o' : 'i') + ' (sotto)' : '') + '.';
      _setStatus(msg, (avvisoMismatch || avvisi.length) ? 'warning' : 'success');
      if (warnEl) warnEl.innerHTML = avvisi.slice(0, 30).map(a => '<div>' + _escHtml(a) + '</div>').join('');
      if (tot) { try { Toast.show(tot + ' sched' + (tot === 1 ? 'a importata' : 'e importate'), 'success'); } catch (e) {} }
    } catch (e) {
      _setStatus('Importazione non riuscita: ' + (e?.message || 'errore sconosciuto') + '.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Importa'; }
    }
  };

  const _injectModal = () => {
    if (document.getElementById('modal-wiki-import')) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay hidden';
    overlay.id = 'modal-wiki-import';
    overlay.style.display = 'none';
    overlay.onclick = (e) => { if (e.target === overlay) Modal.close('wiki-import'); };

    const opzioni = TIPI.map(t => '<option value="' + t + '">' + _cfg(t).label + '</option>').join('');

    overlay.innerHTML =
      '<div class="modal" style="max-width:520px;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title">Importa da foglio</h3>' +
          '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'wiki-import\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body" style="display:flex;flex-direction:column;gap:12px;">' +
          '<div style="font-size:0.8rem;color:var(--text-secondary);line-height:1.5;">' +
            '1. Scegli il tipo di scheda e scarica il template CSV.<br>' +
            '2. Compila una riga per scheda in Excel/Google Sheets (la seconda riga e\' un esempio: sostituiscila o cancellala). Se lo apri in Google Sheets e vedi una prima riga con scritto "sep=,", cancella solo quella riga.<br>' +
            '3. Per PNG e PG il template include anche le colonne "Statblock: ..." (CA, PF, caratteristiche, azioni...): sono tutte facoltative, lascia vuote quelle che non ti servono. Nelle colonne di azioni scrivi una voce per riga nel formato "Nome: descrizione" (in Excel/Sheets premi Alt+Invio per andare a capo nella stessa cella).<br>' +
            '4. Salva/esporta come CSV e caricalo qui sotto. Se una scheda con lo stesso Nome esiste gia\', viene aggiornata invece di duplicata (le colonne lasciate vuote non cancellano quello che c\'era).' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">Tipo di scheda</label>' +
            '<select id="wi-tipo" class="form-select">' + opzioni + '</select>' +
          '</div>' +
          '<button class="btn btn-secondary btn-sm" style="align-self:flex-start;" onclick="WikiImport.scaricaTemplate()">Scarica template CSV</button>' +
          '<div class="form-group">' +
            '<label class="form-label">Foglio compilato (CSV)</label>' +
            '<input type="file" id="wi-file" accept=".csv,text/csv" class="form-input">' +
          '</div>' +
          '<div id="wi-status" style="display:none;text-align:center;font-size:0.85rem;font-weight:600;padding:8px;border-radius:var(--radius-sm);"></div>' +
          '<div id="wi-avvisi" style="font-size:0.7rem;color:var(--text-muted);max-height:120px;overflow-y:auto;"></div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-ghost" onclick="Modal.close(\'wiki-import\')">Chiudi</button>' +
          '<button id="wi-importa-btn" class="btn btn-primary" onclick="WikiImport.importa()">Importa</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  };

  const open = () => {
    _injectModal();
    const fileEl = document.getElementById('wi-file');
    if (fileEl) fileEl.value = '';
    _setStatus(null);
    const warnEl = document.getElementById('wi-avvisi');
    if (warnEl) warnEl.innerHTML = '';
    Modal.open('wiki-import');
  };

  const _injectTrigger = () => {
    const subnav = document.getElementById('wiki-subnav');
    if (!subnav || document.getElementById('wiki-import-trigger')) return;
    const btn = document.createElement('button');
    btn.id = 'wiki-import-trigger';
    btn.className = 'nav-item nav-subitem';
    btn.style.cssText = 'padding:9px 8px 5px;font-size:0.78rem;margin-top:4px;border-top:1px dashed var(--border);';
    btn.onclick = () => { WikiImport.open(); closeMobileMenu?.(); };
    btn.innerHTML =
      '<span style="color:var(--text-muted);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span>' +
      '<span class="nav-label">Importa da foglio</span>';
    subnav.appendChild(btn);
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(_injectTrigger, 200));

  return { open, importa, scaricaTemplate };
})();

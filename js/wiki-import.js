/* ============================================================
   WIKI-IMPORT.JS — Importa schede Wiki (PNG, Luoghi, Fazioni, Lore,
   PG, Incontri, Quest, Sessioni) da un foglio CSV, per portare in
   dm-toolkit i dati di una campagna scritti altrove (Word, Obsidian,
   Google Sheet...) senza doverli ricreare a mano scheda per scheda.

   Le colonne del template sono generate leggendo a runtime
   WikiSections._getCfg(tipo).fields, non duplicate qui: se lo schema
   di una scheda cambia, template e parser restano sincronizzati da
   soli. Il campo 'date_inworld' (calendario in-world) non e'
   rappresentabile in una cella di testo e viene escluso dal template.
   Modulo autonomo: costruisce il proprio modale a runtime e aggiunge
   la propria voce nel sottomenu Wiki gia' presente in pagina, senza
   toccare altro markup statico.
   ============================================================ */

const WikiImport = (() => {
  const TIPI = ['png', 'luoghi', 'fazioni', 'lore', 'pg', 'incontri', 'quest', 'sessioni'];

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

  // Colonne del template per un tipo: sempre Nome (+ Contenuto per Lore) in
  // testa, poi i campi testuali/select/mention dello schema, Tag in coda.
  const _colonne = (tipo) => {
    const cfg = _cfg(tipo);
    const cols = [{ key: 'nome', label: 'Nome' }];
    if (tipo === 'lore') cols.push({ key: 'contenuto', label: 'Contenuto' });
    cfg.fields.forEach(f => {
      if (f.type === 'separator' || f.type === 'date_inworld') return;
      cols.push({ key: f.key, label: f.label, field: f });
    });
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
      const f = c.field;
      if (f?.type === 'select') return f.options.find(Boolean) || '';
      return f?.hint || '';
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

      let creati = 0, saltati = 0;
      const avvisi = [];
      const cfg = _cfg(tipo);

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const nome = (row[idxOf.nome] || '').trim();
        if (!nome) { saltati++; continue; }

        const item = cfg.newItem();
        item.nome = nome;

        if (idxOf.contenuto > -1) item.contenuto = _textToHtml(row[idxOf.contenuto]);

        cfg.fields.forEach(f => {
          if (f.type === 'separator' || f.type === 'date_inworld') return;
          const idx = idxOf[f.key];
          if (idx === undefined || idx === -1) return;
          const val = (row[idx] || '').trim();
          if (!val) return;
          if (f.type === 'select') {
            const match = f.options.find(o => _norm(o) === _norm(val));
            if (match) item[f.key] = match;
            else avvisi.push('Riga ' + (r + 1) + ': valore "' + val + '" non valido per "' + f.label + '", ignorato.');
          } else {
            item[f.key] = val;
          }
        });

        if (idxOf.tags > -1) {
          item.tags = (row[idxOf.tags] || '').split(',').map(t => t.trim()).filter(Boolean);
        }

        cfg.saveItem(App.getActiveCampaign(), item);
        creati++;
      }

      try { WikiSections.renderList(tipo); } catch (e) {}
      try { WikiSections.renderCounters(); } catch (e) {}

      const msg = avvisoMismatch + creati + ' sched' + (creati === 1 ? 'a creata' : 'e create') +
        (saltati ? ', ' + saltati + ' rig' + (saltati === 1 ? 'a vuota saltata' : 'he vuote saltate') : '') +
        (avvisi.length ? ', ' + avvisi.length + ' avvis' + (avvisi.length === 1 ? 'o' : 'i') + ' (sotto)' : '') + '.';
      _setStatus(msg, (avvisoMismatch || avvisi.length) ? 'warning' : 'success');
      if (warnEl) warnEl.innerHTML = avvisi.slice(0, 30).map(a => '<div>' + _escHtml(a) + '</div>').join('');
      if (creati) { try { Toast.show(creati + ' sched' + (creati === 1 ? 'a importata' : 'e importate'), 'success'); } catch (e) {} }
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
            '3. Salva/esporta come CSV e caricalo qui sotto.' +
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

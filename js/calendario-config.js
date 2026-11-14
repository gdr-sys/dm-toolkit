/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   CALENDARIO-CONFIG.JS — Tab "Impostazioni" della pagina Calendario.
   Due cose che prima non si potevano fare da nessuna parte:
     1. impostare la data e l'ora correnti della campagna (la "oggi"
        da cui parte la timeline) — prima si poteva solo fare
        "+1 giorno" alla volta dallo Schermo del Master;
     2. personalizzare la struttura del calendario (nome, nome/base
        dell'anno, giorni della settimana, mesi, festivita') — utile
        soprattutto per il preset "Personalizzato", che nasceva con
        nomi segnaposto ("Mese 1", "Giorno 1") e nessun modo di
        cambiarli.
   Modulo autonomo: rende dentro #calendario-tab-config, che
   CalendarioUI.showTab mostra/nasconde come gli altri due tab.
   ============================================================ */

const CalendarioConfig = (() => {
  const _esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _int = (v, def) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : def; };

  // Bozza della struttura in corso di modifica: si popola da Calendario.get()
  // alla prima render del tab e vive finche' l'utente non salva o cambia pagina.
  let _draft = null;

  const _syncDraftFromCal = (cal) => {
    _draft = {
      nome: cal.nome || 'Calendario',
      prefisso_anno: cal.prefisso_anno || 'Anno',
      anno_base: cal.anno_base ?? 1,
      giorni_settimana: [...(cal.giorni_settimana || ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'])],
      mesi: (cal.mesi || []).map(m => ({ nome: m.nome || '', it: m.it || '', giorni: m.giorni || 30 })),
      festivita: (cal.festivita || []).map(f => ({ mese: f.mese || 0, giorno: f.giorno || 1, nome: f.nome || '' })),
      bisestile: { attivo: false, ogni: 4, mese: 1, giorni: 1, ...(cal.bisestile || {}) },
      ere: (cal.ere || []).map(e => ({ nome: e.nome || '', da: e.da ?? 1, riparte: !!e.riparte })),
    };
  };

  // ── Card 1: data e ora correnti ──────────────────────────────
  const _dataCardHTML = (cal) => {
    const meseIdx = Math.max(0, Math.min(cal.mese || 0, cal.mesi.length - 1));
    const giorniInMese = Calendario.giorniMese(cal, meseIdx, cal.anno);
    const giorno = Math.max(1, Math.min(cal.giorno || 1, giorniInMese));

    const giornoOpts = Array.from({ length: giorniInMese }, (_, i) => i + 1)
      .map(g => '<option value="' + g + '"' + (g === giorno ? ' selected' : '') + '>' + g + '</option>').join('');
    const meseOpts = cal.mesi
      .map((m, i) => '<option value="' + i + '"' + (i === meseIdx ? ' selected' : '') + '>' + _esc(m.it || m.nome || ('Mese ' + (i + 1))) + '</option>').join('');

    return '<div class="card" style="padding:16px;margin-bottom:16px;">' +
      '<div style="font-size:0.68rem;font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:4px;">Data e ora correnti</div>' +
      '<p class="text-muted" style="font-size:0.8rem;margin:0 0 12px;">Imposta il momento in cui il party comincia a giocare: eventi, deadline e timeline sono calcolati a partire da qui.</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;">' +
        '<div><label class="form-label" style="font-size:0.68rem;">Giorno</label>' +
          '<select id="ccfg-giorno" class="form-select" style="width:auto;" onchange="CalendarioConfig._onMeseChange()">' + giornoOpts + '</select></div>' +
        '<div><label class="form-label" style="font-size:0.68rem;">Mese</label>' +
          '<select id="ccfg-mese" class="form-select" style="width:auto;" onchange="CalendarioConfig._onMeseChange()">' + meseOpts + '</select></div>' +
        '<div><label class="form-label" style="font-size:0.68rem;">Anno</label>' +
          '<input id="ccfg-anno" type="number" class="form-input" style="width:100px;" value="' + (cal.anno ?? cal.anno_base ?? 1) + '"></div>' +
        '<div><label class="form-label" style="font-size:0.68rem;">Ora</label>' +
          '<input id="ccfg-ora" type="number" class="form-input" style="width:70px;" min="0" max="23" value="' + _int(cal.ora, 8) + '"></div>' +
        '<div><label class="form-label" style="font-size:0.68rem;">Minuti</label>' +
          '<input id="ccfg-minuti" type="number" class="form-input" style="width:70px;" min="0" max="59" value="' + _int(cal.minuti, 0) + '"></div>' +
        '<button class="btn btn-primary btn-sm" onclick="CalendarioConfig.applicaData()">Imposta come oggi</button>' +
      '</div>' +
    '</div>';
  };

  // ── Card 2: struttura del calendario ─────────────────────────
  const _strutturaCardHTML = () => {
    const d = _draft;
    const meseRows = d.mesi.map((m, i) =>
      '<div class="ccfg-mese-row" data-i="' + i + '" style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">' +
        '<span style="font-size:0.7rem;color:var(--text-muted);width:22px;flex-shrink:0;">' + (i + 1) + '</span>' +
        '<input class="form-input ccfg-m-nome" value="' + _esc(m.nome) + '" placeholder="Nome" style="flex:1;font-size:0.8rem;min-width:80px;">' +
        '<input class="form-input ccfg-m-it" value="' + _esc(m.it) + '" placeholder="Nome esteso (opzionale)" style="flex:1;font-size:0.8rem;min-width:80px;">' +
        '<input class="form-input ccfg-m-giorni" type="number" min="1" max="99" value="' + (m.giorni || 30) + '" title="Giorni del mese" style="width:64px;font-size:0.8rem;">' +
        '<button onclick="CalendarioConfig.rimuoviMese(' + i + ')" title="Rimuovi mese" style="background:none;border:none;cursor:pointer;color:var(--danger-text);flex-shrink:0;padding:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '</div>'
    ).join('');

    const meseOptsFest = d.mesi.map((m, i) => '<option value="' + i + '">' + _esc(m.it || m.nome || ('Mese ' + (i + 1))) + '</option>').join('');
    const festRows = d.festivita.map((f, i) => {
      const mIdx = Math.max(0, Math.min(f.mese || 0, d.mesi.length - 1));
      const opts = d.mesi.map((m, mi) => '<option value="' + mi + '"' + (mi === mIdx ? ' selected' : '') + '>' + _esc(m.it || m.nome || ('Mese ' + (mi + 1))) + '</option>').join('');
      return '<div class="ccfg-fest-row" data-i="' + i + '" style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">' +
        '<input class="form-input ccfg-f-nome" value="' + _esc(f.nome) + '" placeholder="Nome festivita\'" style="flex:1;font-size:0.8rem;min-width:80px;">' +
        '<select class="form-select ccfg-f-mese" style="width:auto;font-size:0.8rem;">' + opts + '</select>' +
        '<input class="form-input ccfg-f-giorno" type="number" min="1" max="99" value="' + (f.giorno || 1) + '" title="Giorno" style="width:64px;font-size:0.8rem;">' +
        '<button onclick="CalendarioConfig.rimuoviFest(' + i + ')" title="Rimuovi" style="background:none;border:none;cursor:pointer;color:var(--danger-text);flex-shrink:0;padding:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '</div>';
    }).join('');

    const b = d.bisestile;
    const meseOptsBis = d.mesi.map((m, i) => '<option value="' + i + '"' + (i === (b.mese || 0) ? ' selected' : '') + '>' + _esc(m.it || m.nome || ('Mese ' + (i + 1))) + '</option>').join('');
    const eraRows = d.ere.map((e, i) =>
      '<div class="ccfg-era-row" data-i="' + i + '" style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;">' +
        '<input class="form-input ccfg-e-nome" value="' + _esc(e.nome) + '" placeholder="es. Seconda Era" style="flex:1;font-size:0.8rem;min-width:120px;">' +
        '<label style="font-size:0.75rem;color:var(--text-muted);display:inline-flex;align-items:center;gap:4px;">dall\'anno <input class="form-input ccfg-e-da" type="number" value="' + e.da + '" style="width:90px;font-size:0.8rem;"></label>' +
        '<label style="font-size:0.75rem;display:inline-flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" class="ccfg-e-riparte"' + (e.riparte ? ' checked' : '') + '> riparte da 1</label>' +
        '<button onclick="CalendarioConfig.rimuoviEra(' + i + ')" title="Rimuovi era" aria-label="Rimuovi era" style="background:none;border:none;cursor:pointer;color:var(--danger-text);padding:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '</div>').join('');
    const titoletto = (t) => '<div style="margin-bottom:6px;font-size:0.72rem;font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);">' + t + '</div>';
    const bisestiliHTML = titoletto('Anni bisestili') +
      '<div style="display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;font-size:0.82rem;margin-bottom:16px;">' +
        '<label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="ccfg-bis"' + (b.attivo ? ' checked' : '') + '> Attivi</label>' +
        '<span>ogni <input id="ccfg-bis-ogni" type="number" min="2" max="100" class="form-input" value="' + (b.ogni || 4) + '" style="width:64px;display:inline-block;font-size:0.8rem;"> anni</span>' +
        '<span>il mese <select id="ccfg-bis-mese" class="form-select" style="width:auto;display:inline-block;font-size:0.8rem;">' + meseOptsBis + '</select></span>' +
        '<span>ha <input id="ccfg-bis-giorni" type="number" min="1" max="30" class="form-input" value="' + (b.giorni || 1) + '" style="width:56px;display:inline-block;font-size:0.8rem;"> giorni in più</span>' +
      '</div>';
    const ereHTML = titoletto('Ere') +
      '<p class="text-muted" style="font-size:0.76rem;margin:0 0 8px;">Dall\'anno indicato le date si scrivono con il nome dell\'era (es. Anno 12, Seconda Era). Gli eventi già inseriti non si spostano.</p>' +
      '<div id="ccfg-ere-list">' + (eraRows || '<div class="text-muted" style="font-size:0.78rem;font-style:italic;margin-bottom:6px;">Nessuna era.</div>') + '</div>' +
      '<button class="btn btn-ghost btn-sm" onclick="CalendarioConfig.aggiungiEra()" style="margin:4px 0 16px;">+ Aggiungi era</button>';
    return '<div class="card" id="ccfg-struttura" style="padding:16px;">' +
      '<div style="font-size:0.68rem;font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:4px;">Struttura del calendario</div>' +
      '<p class="text-muted" style="font-size:0.8rem;margin:0 0 14px;">Nomi e durata dei mesi, giorni della settimana e come si chiama l\'anno. Cambiare il numero dei mesi o i giorni non sposta gli eventi gia\' inseriti, ma puo\' renderne impreciso il giorno.</p>' +

      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">' +
        '<div><label class="form-label" style="font-size:0.68rem;">Nome calendario</label>' +
          '<input id="ccfg-nome" class="form-input" value="' + _esc(d.nome) + '" style="font-size:0.82rem;width:200px;"></div>' +
        '<div><label class="form-label" style="font-size:0.68rem;">Come si chiama l\'anno</label>' +
          '<input id="ccfg-prefisso" class="form-input" value="' + _esc(d.prefisso_anno) + '" placeholder="es. Anno del Drago" style="font-size:0.82rem;width:200px;"></div>' +
        '<div><label class="form-label" style="font-size:0.68rem;">Anno di partenza</label>' +
          '<input id="ccfg-annobase" type="number" class="form-input" value="' + (d.anno_base ?? 1) + '" style="font-size:0.82rem;width:110px;"></div>' +
      '</div>' +

      '<div style="margin-bottom:14px;">' +
        '<label class="form-label" style="font-size:0.68rem;">Giorni della settimana <span style="font-weight:400;color:var(--text-muted);">(separati da virgola)</span></label>' +
        '<input id="ccfg-settimana" class="form-input" value="' + _esc(d.giorni_settimana.join(', ')) + '" style="font-size:0.82rem;">' +
      '</div>' +

      '<div style="margin-bottom:6px;font-size:0.72rem;font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);">Mesi</div>' +
      '<div id="ccfg-mesi-list">' + meseRows + '</div>' +
      '<button class="btn btn-ghost btn-sm" onclick="CalendarioConfig.aggiungiMese()" style="margin:4px 0 16px;">+ Aggiungi mese</button>' +

      '<div style="margin-bottom:6px;font-size:0.72rem;font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);">Festivita\'</div>' +
      '<div id="ccfg-fest-list">' + (festRows || '<div class="text-muted" style="font-size:0.78rem;font-style:italic;margin-bottom:6px;">Nessuna festivita\'.</div>') + '</div>' +
      '<button class="btn btn-ghost btn-sm" onclick="CalendarioConfig.aggiungiFest()" style="margin:4px 0 16px;">+ Aggiungi festivita\'</button>' +
      bisestiliHTML + ereHTML +

      '<div style="border-top:1px solid var(--border);padding-top:12px;display:flex;justify-content:flex-end;">' +
        '<button class="btn btn-primary btn-sm" onclick="CalendarioConfig.salvaStruttura()">Salva struttura</button>' +
      '</div>' +
    '</div>';
  };

  const render = () => {
    const el = document.getElementById('calendario-tab-config');
    if (!el) return;
    const cal = Calendario.get();
    if (!cal || !cal.mesi?.length) {
      el.innerHTML = '<div class="module-placeholder"><h3>Calendario non attivo</h3>' +
        '<p class="text-muted" style="font-size:0.85rem;">Attiva il Calendario in-game dalle impostazioni della campagna (Modifica campagna) per configurarlo.</p></div>';
      return;
    }
    _syncDraftFromCal(cal);
    el.innerHTML = _dataCardHTML(cal) + (typeof CalendarioCielo !== 'undefined' ? CalendarioCielo.cardHTML(cal) : '') + _strutturaCardHTML();
  };

  // Rileva i valori attualmente nei campi della card struttura dentro _draft,
  // cosi' un add/remove non perde le modifiche non ancora salvate.
  const _readStrutturaInputs = () => {
    if (!_draft) return;
    const g = (id) => document.getElementById(id);
    if (g('ccfg-nome')) _draft.nome = g('ccfg-nome').value.trim() || 'Calendario';
    if (g('ccfg-prefisso')) _draft.prefisso_anno = g('ccfg-prefisso').value.trim() || 'Anno';
    if (g('ccfg-annobase')) _draft.anno_base = _int(g('ccfg-annobase').value, 1);
    if (g('ccfg-settimana')) {
      const parsed = g('ccfg-settimana').value.split(',').map(s => s.trim()).filter(Boolean);
      if (parsed.length) _draft.giorni_settimana = parsed;
    }
    document.querySelectorAll('#ccfg-mesi-list .ccfg-mese-row').forEach(row => {
      const i = _int(row.dataset.i, -1);
      if (i < 0 || !_draft.mesi[i]) return;
      _draft.mesi[i] = {
        nome: row.querySelector('.ccfg-m-nome')?.value.trim() || ('Mese ' + (i + 1)),
        it: row.querySelector('.ccfg-m-it')?.value.trim() || '',
        giorni: Math.max(1, _int(row.querySelector('.ccfg-m-giorni')?.value, 30)),
      };
    });
    if (g('ccfg-bis')) _draft.bisestile = { ..._draft.bisestile, da: _draft.bisestile.attivo ? (_draft.bisestile.da ?? Calendario.get()?.anno ?? 0) : (Calendario.get()?.anno ?? 0), attivo: g('ccfg-bis').checked, ogni: Math.max(2, _int(g('ccfg-bis-ogni').value, 4)), mese: _int(g('ccfg-bis-mese').value, 0), giorni: Math.max(1, _int(g('ccfg-bis-giorni').value, 1)) };
    document.querySelectorAll('#ccfg-ere-list .ccfg-era-row').forEach(row => {
      const i = _int(row.dataset.i, -1);
      if (i < 0 || !_draft.ere[i]) return;
      _draft.ere[i] = { nome: row.querySelector('.ccfg-e-nome')?.value.trim() || '', da: _int(row.querySelector('.ccfg-e-da')?.value, 1), riparte: !!row.querySelector('.ccfg-e-riparte')?.checked };
    });
    document.querySelectorAll('#ccfg-fest-list .ccfg-fest-row').forEach(row => {
      const i = _int(row.dataset.i, -1);
      if (i < 0 || !_draft.festivita[i]) return;
      _draft.festivita[i] = {
        nome: row.querySelector('.ccfg-f-nome')?.value.trim() || '',
        mese: _int(row.querySelector('.ccfg-f-mese')?.value, 0),
        giorno: Math.max(1, _int(row.querySelector('.ccfg-f-giorno')?.value, 1)),
      };
    });
  };

  const _rerenderStruttura = () => {
    const el = document.getElementById('calendario-tab-config');
    if (!el || !_draft) return;
    // sostituisce solo la seconda card, lasciando intatta quella della data
    const card = document.getElementById('ccfg-struttura');
    if (card) card.outerHTML = _strutturaCardHTML();
    else el.insertAdjacentHTML('beforeend', _strutturaCardHTML());
  };

  const _onMeseChange = () => {
    const cal = Calendario.get();
    if (!cal) return;
    const meseSel = document.getElementById('ccfg-mese');
    const giornoSel = document.getElementById('ccfg-giorno');
    if (!meseSel || !giornoSel) return;
    const mese = Math.max(0, Math.min(_int(meseSel.value, 0), cal.mesi.length - 1));
    const giorniInMese = Calendario.giorniMese(cal, mese, _int(document.getElementById('ccfg-anno')?.value, cal.anno));
    const cur = Math.max(1, Math.min(_int(giornoSel.value, 1), giorniInMese));
    giornoSel.innerHTML = Array.from({ length: giorniInMese }, (_, i) => i + 1)
      .map(g => '<option value="' + g + '"' + (g === cur ? ' selected' : '') + '>' + g + '</option>').join('');
  };

  const applicaData = () => {
    const cal = Calendario.get();
    if (!cal) return;
    const mese = Math.max(0, Math.min(_int(document.getElementById('ccfg-mese')?.value, 0), cal.mesi.length - 1));
    const giorniInMese = Calendario.giorniMese(cal, mese, _int(document.getElementById('ccfg-anno')?.value, cal.anno));
    const nuovo = {
      ...cal,
      giorno: Math.max(1, Math.min(_int(document.getElementById('ccfg-giorno')?.value, 1), giorniInMese)),
      mese,
      anno: _int(document.getElementById('ccfg-anno')?.value, cal.anno_base || 1),
      ora: Math.max(0, Math.min(_int(document.getElementById('ccfg-ora')?.value, 8), 23)),
      minuti: Math.max(0, Math.min(_int(document.getElementById('ccfg-minuti')?.value, 0), 59)),
    };
    Calendario.save(nuovo);
    Toast.show('Data impostata: ' + Calendario.getDateStr(nuovo) + ' — ' + Calendario.getTimeStr(nuovo), 'success', 2500);
    try { CalendarioUI.oggi(); } catch (e) {}
    try { if (typeof Schermo !== 'undefined' && Schermo._refreshTempo) Schermo._refreshTempo(); } catch (e) {}
  };

  const aggiungiMese = () => {
    _readStrutturaInputs();
    const n = _draft.mesi.length + 1;
    _draft.mesi.push({ nome: 'Mese ' + n, it: '', giorni: 30 });
    _rerenderStruttura();
  };
  const rimuoviMese = (i) => {
    _readStrutturaInputs();
    if (_draft.mesi.length <= 1) { Toast.show('Serve almeno un mese', 'warning'); return; }
    _draft.mesi.splice(i, 1);
    _draft.festivita = _draft.festivita.filter(f => f.mese !== i).map(f => ({ ...f, mese: f.mese > i ? f.mese - 1 : f.mese }));
    _rerenderStruttura();
  };
  const aggiungiEra = () => { _readStrutturaInputs(); _draft.ere.push({ nome: '', da: Calendario.get()?.anno ?? 1, riparte: false }); _rerenderStruttura(); };
  const rimuoviEra = (i) => { _readStrutturaInputs(); _draft.ere.splice(i, 1); _rerenderStruttura(); };
  const aggiungiFest = () => { _readStrutturaInputs(); _draft.festivita.push({ mese: 0, giorno: 1, nome: '' }); _rerenderStruttura(); };
  const rimuoviFest = (i) => { _readStrutturaInputs(); _draft.festivita.splice(i, 1); _rerenderStruttura(); };

  const salvaStruttura = () => {
    const cal = Calendario.get();
    if (!cal || !_draft) return;
    _readStrutturaInputs();

    const mesi = _draft.mesi.map((m, i) => ({
      nome: m.nome || ('Mese ' + (i + 1)),
      it: m.it || '',
      giorni: Math.max(1, m.giorni || 30),
    }));
    const nuovo = {
      ...cal,
      nome: _draft.nome,
      prefisso_anno: _draft.prefisso_anno,
      anno_base: _draft.anno_base,
      giorni_settimana: _draft.giorni_settimana.length ? _draft.giorni_settimana : cal.giorni_settimana,
      mesi,
      festivita: _draft.festivita
        .filter(f => f.nome)
        .map(f => ({ mese: Math.max(0, Math.min(f.mese, mesi.length - 1)), giorno: Math.max(1, Math.min(f.giorno, mesi[Math.min(f.mese, mesi.length - 1)]?.giorni || 30)), nome: f.nome })),
      bisestile: { ..._draft.bisestile, mese: Math.max(0, Math.min(_draft.bisestile.mese || 0, mesi.length - 1)) },
      ere: _draft.ere.filter(e => e.nome).map(e => ({ nome: e.nome, da: e.da, riparte: !!e.riparte })),
    };
    // clamp mese/giorno correnti alla nuova struttura
    nuovo.mese = Math.max(0, Math.min(cal.mese || 0, mesi.length - 1));
    nuovo.giorno = Math.max(1, Math.min(cal.giorno || 1, Calendario.giorniMese(nuovo, nuovo.mese, nuovo.anno)));

    Calendario.save(nuovo);
    Toast.show('Struttura del calendario salvata', 'success', 2000);
    render();
    try { CalendarioUI.oggi(); } catch (e) {}
  };

  return {
    render, applicaData, salvaStruttura,
    aggiungiMese, rimuoviMese, aggiungiFest, rimuoviFest, aggiungiEra, rimuoviEra,
    _onMeseChange,
  };
})();

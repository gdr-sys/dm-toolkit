/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   CHIUSURA-SESSIONE.JS — Chiusura della sessione in 5 domande.
   Il lavoro dopo la sessione (che di solito si salta) in due
   minuti: dalle risposte compila da solo
     - il diario della sessione (riassunto, XP, bottino, stato giocata)
     - i ganci rimasti aperti (mostrati in Dashboard)
     - la prossima sessione pianificata, con il gancio d'apertura
     - un Momento sul PG che ha avuto la scena migliore
     - l'archivio "Previously On…", pronto da leggere la volta dopo
   Modulo autonomo: pulsante accanto a "+ Nuova Sessione" e modale
   costruiti a runtime.
   ============================================================ */

const ChiusuraSessione = (() => {
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);
  const _sessioni = () => [...(_camp()?.sessioni_log || [])].sort((a, b) => (a.numero || 0) - (b.numero || 0));
  const _nuovoId = () => 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
  const _oggi = () => new Date().toISOString().slice(0, 10);

  const _dataInWorld = () => {
    try { const c = Calendario.get(); if (c && c.mesi?.length) return { anno: c.anno, mese: c.mese, giorno: c.giorno }; } catch (e) {}
    return null;
  };

  // La sessione da chiudere: quella in corso o pianificata piu' vecchia; se non ce ne sono, una nuova
  const _sessioneDefault = () => {
    const aperte = _sessioni().filter(s => s.stato !== 'giocata');
    return aperte.length ? aperte[0].id : '__nuova';
  };

  const _assicuraPulsante = () => {
    if (document.getElementById('cs-btn')) return;
    const nuova = document.querySelector('#page-sessione [onclick="SessioniLog.newSession()"]');
    if (!nuova) return;
    const b = document.createElement('button');
    b.id = 'cs-btn';
    b.type = 'button';
    b.className = 'btn btn-primary btn-sm';
    b.style.fontSize = '0.78rem';
    b.textContent = 'Chiudi la sessione';
    b.title = 'Cinque domande per chiudere la sessione: compila diario, ganci e "Previously On…"';
    b.onclick = () => apri();
    nuova.insertAdjacentElement('afterend', b);
  };

  const _assicuraModale = () => {
    if (document.getElementById('modal-chiusura-sessione')) return;
    const o = document.createElement('div');
    o.className = 'modal-overlay hidden';
    o.id = 'modal-chiusura-sessione';
    o.style.display = 'none';
    o.innerHTML =
      '<div class="modal" style="max-width:680px;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title">Chiudi la sessione</h3>' +
          '<button type="button" class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'chiusura-sessione\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body" id="cs-body"></div>' +
        '<div class="modal-footer">' +
          '<button type="button" class="btn btn-ghost" onclick="Modal.close(\'chiusura-sessione\')">Annulla</button>' +
          '<button type="button" class="btn btn-primary" style="margin-left:auto;" onclick="ChiusuraSessione.salva()">Salva e chiudi la sessione</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(o);
  };

  const _domanda = (n, titolo, aiuto, campo) =>
    '<div style="display:flex;gap:12px;margin-top:16px;">' +
      '<div style="flex-shrink:0;width:26px;height:26px;border-radius:50%;background:var(--accent-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.82rem;">' + n + '</div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-family:var(--font-display);font-size:0.95rem;color:var(--text-primary);">' + titolo + '</div>' +
        (aiuto ? '<div style="font-size:0.78rem;color:var(--text-muted);margin:2px 0 6px;line-height:1.45;">' + aiuto + '</div>' : '<div style="height:6px;"></div>') +
        campo +
      '</div>' +
    '</div>';

  const _disegna = () => {
    const el = document.getElementById('cs-body');
    if (!el) return;
    const camp = _camp();
    const sess = _sessioni();
    const sel = _sessioneDefault();
    const prossimo = Math.max(0, ...sess.map(s => s.numero || 0)) + 1;
    const s = sess.find(x => x.id === sel);
    const pg = camp.pg || [];
    el.innerHTML =
      '<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:var(--text-secondary);flex-wrap:wrap;">Sessione da chiudere' +
        '<select id="cs-sessione" class="form-select" style="width:auto;font-size:0.85rem;" onchange="ChiusuraSessione._cambiaSessione()">' +
          sess.filter(x => x.stato !== 'giocata').map(x => '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>S' + x.numero + (x.titolo ? ' — ' + _esc(x.titolo) : '') + '</option>').join('') +
          '<option value="__nuova"' + (sel === '__nuova' ? ' selected' : '') + '>Nuova: Sessione ' + prossimo + '</option>' +
          sess.filter(x => x.stato === 'giocata').reverse().map(x => '<option value="' + x.id + '">S' + x.numero + (x.titolo ? ' — ' + _esc(x.titolo) : '') + ' (già giocata)</option>').join('') +
        '</select>' +
        '<input id="cs-titolo" type="text" class="form-input" autocomplete="off" style="flex:1;min-width:180px;font-size:0.85rem;" placeholder="Titolo (facoltativo)" value="' + _esc(s?.titolo || '') + '">' +
      '</label>' +

      _domanda(1, 'Cosa è successo?', 'Due o tre frasi bastano: diventano il riassunto della sessione e il prossimo "Previously On…".',
        '<textarea id="cs-recap" class="form-textarea" rows="4" style="font-size:0.88rem;" placeholder="Il party ha raggiunto la cripta, ha respinto i Custodi e ha scoperto che il primo anello del sigillo è spezzato…">' + _esc(s?.recap || '') + '</textarea>') +

      _domanda(2, 'XP e bottino', '',
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<input id="cs-xp" type="text" class="form-input" autocomplete="off" style="width:150px;font-size:0.85rem;" placeholder="XP (es. 450 a testa)" value="' + _esc(s?.xp || '') + '">' +
          '<input id="cs-bottino" type="text" class="form-input" autocomplete="off" style="flex:1;min-width:200px;font-size:0.85rem;" placeholder="Bottino (es. 120 mo, pozione di guarigione, mappa della cripta)" value="' + _esc(s?.bottino || '') + '">' +
        '</div>') +

      _domanda(3, 'Quali fili sono rimasti aperti?', 'Uno per riga: domande senza risposta, promesse fatte, nemici sfuggiti. Compaiono nella Dashboard.',
        '<textarea id="cs-fili" class="form-textarea" rows="3" style="font-size:0.88rem;" placeholder="Chi ha spezzato il sigillo?\nElio è sparito di nuovo\nI Custodi sanno dove dorme il party">' + _esc(String(s?.ganci || '').replace(/<br\s*\/?>/gi, '\n')) + '</textarea>') +

      _domanda(4, 'Con cosa si apre la prossima sessione?', 'Il gancio d\'apertura: va nelle note di preparazione della sessione successiva.',
        '<input id="cs-gancio" type="text" class="form-input" autocomplete="off" style="font-size:0.88rem;" placeholder="Madre Cinerea bussa alla locanda all\'alba…">') +

      _domanda(5, 'Qual è stato il momento migliore?', pg.length ? 'Finisce nei Momenti del personaggio che l\'ha vissuto.' : 'Aggiungi i PG nella Wiki per collegare il momento a un personaggio.',
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          (pg.length ? '<select id="cs-pg" class="form-select" style="width:auto;font-size:0.85rem;"><option value="">Nessun PG</option>' + pg.map(p => '<option value="' + p.id + '">' + _esc(p.nome || p.name) + '</option>').join('') + '</select>' : '') +
          '<input id="cs-momento" type="text" class="form-input" autocomplete="off" style="flex:1;min-width:200px;font-size:0.88rem;" placeholder="Grun ha tenuto da solo la porta della cripta">' +
        '</div>') +

      '<label style="display:flex;align-items:center;gap:8px;margin-top:16px;font-size:0.85rem;color:var(--text-secondary);cursor:pointer;">' +
        '<input type="checkbox" id="cs-po" checked> Salva il riassunto anche come "Previously On…" per la prossima volta</label>';
  };

  const _cambiaSessione = () => {
    const id = document.getElementById('cs-sessione').value;
    const s = _sessioni().find(x => x.id === id);
    document.getElementById('cs-titolo').value = s?.titolo || '';
    document.getElementById('cs-recap').value = s?.recap || '';
    document.getElementById('cs-xp').value = s?.xp || '';
    document.getElementById('cs-bottino').value = s?.bottino || '';
    document.getElementById('cs-fili').value = String(s?.ganci || '').replace(/<br\s*\/?>/gi, '\n');
  };

  const apri = () => {
    if (!_camp()) { Toast.show('Apri prima una campagna', 'warning'); return; }
    _assicuraModale();
    _disegna();
    Modal.open('chiusura-sessione');
    setTimeout(() => document.getElementById('cs-recap')?.focus(), 50);
  };

  const salva = () => {
    const camp = _camp();
    const v = (id) => (document.getElementById(id)?.value || '').trim();
    const recap = v('cs-recap');
    if (!recap) { Toast.show('Scrivi almeno cosa è successo', 'warning'); document.getElementById('cs-recap')?.focus(); return; }

    let lista = [...(camp.sessioni_log || [])];
    let idSess = v('cs-sessione');
    if (idSess === '__nuova') {
      idSess = _nuovoId();
      lista.push({ id: idSess, numero: Math.max(0, ...lista.map(s => s.numero || 0)) + 1, creatoAt: Date.now() });
    }
    const fili = v('cs-fili').split(/\r?\n/).map(r => r.trim()).filter(Boolean);
    lista = lista.map(s => s.id !== idSess ? s : {
      ...s,
      titolo: v('cs-titolo') || s.titolo || '',
      recap, xp: v('cs-xp'), bottino: v('cs-bottino'),
      ganci: fili.join('\n'),
      stato: 'giocata',
      data: s.data || _oggi(),
      data_inworld: s.data_inworld || _dataInWorld(),
      aggiornatoAt: Date.now(),
    });
    const chiusa = lista.find(s => s.id === idSess);

    // Prossima sessione: quella pianificata successiva, o una nuova, con il gancio d'apertura
    const gancio = v('cs-gancio');
    if (gancio) {
      const succ = lista.filter(s => s.stato !== 'giocata' && (s.numero || 0) > chiusa.numero).sort((a, b) => a.numero - b.numero)[0];
      if (succ) {
        lista = lista.map(s => s.id !== succ.id ? s : { ...s, ganci_entrata: gancio, notePrep: [gancio, s.notePrep].filter(Boolean).join('\n'), aggiornatoAt: Date.now() });
      } else {
        lista.push({ id: _nuovoId(), numero: chiusa.numero + 1, titolo: '', stato: 'pianificata', ganci_entrata: gancio, notePrep: gancio, creatoAt: Date.now(), aggiornatoAt: Date.now() });
      }
    }

    const patch = { sessioni_log: lista };

    // Momento migliore sul PG
    const momento = v('cs-momento'), pgId = v('cs-pg');
    if (momento && pgId) {
      const nuovoMomento = { id: 'mo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5), tipo: 'heroico', sessioneId: idSess, testo: momento, creatoAt: Date.now() };
      patch.pg = (camp.pg || []).map(p => p.id !== pgId ? p : { ...p, momenti: [...(p.momenti || []), nuovoMomento], aggiornatoAt: Date.now() });
    }

    // "Previously On…" nello stesso formato del modulo previously-on.js
    if (document.getElementById('cs-po')?.checked) {
      const intro = 'Nella sessione precedente (S' + chiusa.numero + (chiusa.titolo ? ' — ' + chiusa.titolo : '') + (chiusa.data ? ', ' + chiusa.data : '') + '):';
      patch.previouslyOnArchive = [...(camp.previouslyOnArchive || []), { id: 'po_' + Date.now(), testo: intro + '\n\n' + recap, createdAt: Date.now(), aggiornatoAt: Date.now() }];
    }

    App.saveActiveCampaign(patch);
    Modal.close('chiusura-sessione');
    Toast.show('Sessione ' + chiusa.numero + ' chiusa: diario, ganci' + (gancio ? ', prossima sessione' : '') + (patch.previouslyOnArchive ? ' e "Previously On…"' : '') + ' aggiornati', 'success', 4000);
    try { if (typeof SessioniLog !== 'undefined') SessioniLog.renderList?.(); } catch (e) {}
    try { renderDashboard?.(); } catch (e) {}
  };

  const _aggancia = () => {
    _assicuraPulsante();
    if (typeof App === 'undefined' || App._chiusuraSessioneHooked) return;
    const orig = App.navigateTo;
    App.navigateTo = function (pageId) {
      orig.apply(App, arguments);
      if (pageId === 'sessione') setTimeout(_assicuraPulsante, 50);
    };
    App._chiusuraSessioneHooked = true;
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(_aggancia, 200));

  return { apri, salva, _cambiaSessione };
})();

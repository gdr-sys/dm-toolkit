/* ============================================================
   SEGRETI.JS — Segreti e indizi, e "cosa sa ogni PNG".
   Un solo sistema: ogni segreto ha i suoi indizi, e ogni indizio
   sta da qualche parte (un PNG, un luogo, una quest) con la
   condizione per ottenerlo ("Persuasione CD 14", "20 mo").
   - Dashboard: card "Segreti non ancora rivelati", con quanti
     indizi il party ha trovato e l'avviso della regola dei tre
     indizi (un segreto importante dovrebbe averne almeno tre).
   - Schede PNG / Luogo / Quest: riquadro "Cosa sa" / "Indizi qui",
     con le condizioni e la spunta "trovato".
   Dati in camp.segreti = [{ id, titolo, descrizione, scoperto,
     indizi: [{ id, testo, dove: {tipo, id, nome}, condizione, trovato }] }].
   ============================================================ */

const Segreti = (() => {
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);
  const _lista = () => _camp()?.segreti || [];
  const _salva = (lista) => App.saveActiveCampaign({ segreti: lista });
  const _id = (p) => p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const _nome = (x) => (x?.nome || x?.name || x?.titolo || '').trim();
  const _aggiorna = (fn) => { _salva(fn(JSON.parse(JSON.stringify(_lista())))); _ridisegna(); };

  // ── Riquadro nelle schede PNG / Luogo / Quest ──

  const blocco = (tipo, id) => {
    const qui = [];
    _lista().forEach(s => (s.indizi || []).forEach(i => { if (i.dove?.tipo === tipo && i.dove?.id === id) qui.push({ s, i }); }));
    const titolo = tipo === 'png' ? 'Cosa sa' : 'Indizi qui';
    return '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">' +
        '<div style="font-family:var(--font-display);font-size:0.85rem;color:var(--text-secondary);">' + titolo + '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm" onclick="Segreti.apri()">Segreti e indizi</button>' +
      '</div>' +
      (qui.length
        ? qui.map(({ s, i }) =>
            '<label style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;">' +
              '<input type="checkbox" style="margin-top:3px;"' + (i.trovato ? ' checked' : '') + ' onchange="Segreti.trovato(\'' + s.id + '\',\'' + i.id + '\',this.checked)">' +
              '<span style="flex:1;min-width:0;">' +
                '<span style="font-size:0.9rem;color:var(--text-primary);' + (i.trovato ? 'text-decoration:line-through;opacity:0.7;' : '') + '">' + _esc(i.testo) + '</span>' +
                (i.condizione ? '<br><span style="font-size:0.78rem;color:var(--accent-secondary-text);">Come ottenerlo: ' + _esc(i.condizione) + '</span>' : '') +
                '<br><span style="font-size:0.74rem;color:var(--text-muted);">Indizio di: ' + _esc(s.titolo) + (s.scoperto ? ' (già rivelato)' : '') + '</span>' +
              '</span>' +
            '</label>').join('')
        : '<div style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">' + (tipo === 'png' ? 'Nessuna informazione registrata. Aggiungi un indizio a un segreto e collegalo a questo PNG: qui vedrai cosa sa e come farselo dire.' : 'Nessun indizio collegato.') + '</div>') +
    '</div>';
  };

  // ── Card nella Dashboard ──

  const renderDashboard = () => {
    const griglia = document.querySelector('#page-campagna .dash-grid');
    const camp = _camp();
    if (!griglia || !camp) return;
    let card = document.getElementById('dash-segreti-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'dash-segreti-card';
      card.className = 'card';
      griglia.appendChild(card);
    }
    const aperti = _lista().filter(s => !s.scoperto);
    card.innerHTML =
      '<div class="card-header"><h3 class="card-title">Segreti non rivelati</h3>' +
        '<button type="button" class="btn btn-ghost btn-sm" onclick="Segreti.apri()">' + (_lista().length ? 'Gestisci' : 'Aggiungi') + '</button></div>' +
      (aperti.length
        ? aperti.slice(0, 8).map((s, i) => {
            const tot = (s.indizi || []).length, trovati = (s.indizi || []).filter(x => x.trovato).length;
            return '<div class="sc-t' + (i === 0 ? ' sc-larga' : '') + '" data-t="viola" role="button" tabindex="0" onclick="Segreti.apri(\'' + s.id + '\')">' +
              '<span class="sc-et">Segreto · ' + (tot ? trovati + (trovati === 1 ? ' indizio trovato' : ' indizi trovati') + ' su ' + tot : 'nessun indizio') + '</span>' +
              '<h3 class="sc-h">' + _esc(s.titolo || 'Senza titolo') + '</h3>' +
              (tot < 3 ? '<small class="sc-s">Meno di tre indizi: rischia di non essere mai scoperto</small>' : '') +
              (tot && typeof Scena !== 'undefined' ? Scena.pallini(trovati, tot) : '') +
            '</div>';
          }).join('')
        : '<div style="font-size:0.82rem;color:var(--text-muted);">' + (_lista().length ? 'Tutti i segreti sono stati rivelati.' : 'Annota i segreti della campagna e dove si trovano gli indizi per scoprirli.') + '</div>');
  };

  // ── Gestione (modale) ──

  let _aperto = null;

  const _opzioniDove = (sel) => {
    const camp = _camp();
    const gruppo = (label, tipo, arr) => arr.length ? '<optgroup label="' + label + '">' + arr.map(x => {
      const v = tipo + ':' + x.id;
      return '<option value="' + _esc(v) + '"' + (sel === v ? ' selected' : '') + '>' + _esc(_nome(x)) + '</option>';
    }).join('') + '</optgroup>' : '';
    return '<option value="">— dove si trova —</option>' +
      gruppo('PNG', 'png', (camp.npcs || []).filter(_nome)) + gruppo('Luoghi', 'luoghi', (camp.locations || []).filter(_nome)) + gruppo('Quest', 'quest', (camp.quests || []).filter(_nome));
  };

  const _disegna = () => {
    const el = document.getElementById('seg-body');
    if (!el) return;
    const lista = _lista();
    el.innerHTML =
      '<div style="font-size:0.84rem;color:var(--text-secondary);line-height:1.55;">Per ogni segreto, scrivi gli indizi che lo rivelano e dove si trovano. <strong>Regola dei tre indizi:</strong> per ogni cosa che i giocatori devono scoprire, preparane almeno tre, perché qualcuno lo mancheranno.</div>' +
      lista.map(s => {
        const aperto = _aperto === s.id;
        const indizi = s.indizi || [];
        return '<div style="border:1px solid var(--border);border-radius:var(--radius-md);margin-top:12px;' + (s.scoperto ? 'opacity:0.75;' : '') + '">' +
          '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;" onclick="Segreti._apriChiudi(\'' + s.id + '\')">' +
            '<span style="flex:1;min-width:0;font-family:var(--font-display);font-size:0.92rem;">' + _esc(s.titolo || 'Senza titolo') + '</span>' +
            '<span style="font-size:0.74rem;color:var(--text-muted);">' + indizi.filter(i => i.trovato).length + '/' + indizi.length + ' indizi</span>' +
            (s.scoperto ? '<span class="badge badge-success">Rivelato</span>' : '') +
          '</div>' +
          (aperto ?
            '<div style="padding:0 12px 12px;border-top:1px solid var(--border);">' +
              '<input type="text" class="form-input" autocomplete="off" style="margin-top:10px;font-size:0.88rem;" value="' + _esc(s.titolo) + '" placeholder="Il segreto, in breve" onchange="Segreti._campo(\'' + s.id + '\',\'titolo\',this.value)">' +
              '<textarea class="form-textarea" rows="2" style="margin-top:6px;font-size:0.85rem;" placeholder="La verità completa, solo per te" onchange="Segreti._campo(\'' + s.id + '\',\'descrizione\',this.value)">' + _esc(s.descrizione || '') + '</textarea>' +
              '<label style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:0.84rem;cursor:pointer;"><input type="checkbox"' + (s.scoperto ? ' checked' : '') + ' onchange="Segreti._campo(\'' + s.id + '\',\'scoperto\',this.checked)"> I giocatori l\'hanno scoperto</label>' +
              '<div style="font-size:0.74rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-top:12px;">Indizi</div>' +
              (indizi.length < 3 ? '<div style="font-size:0.78rem;color:var(--warning-text);margin-top:2px;">Ne servono almeno tre: ' + (3 - indizi.length) + ' ancora.</div>' : '') +
              indizi.map(i =>
                '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">' +
                  '<input type="checkbox" title="Trovato"' + (i.trovato ? ' checked' : '') + ' onchange="Segreti.trovato(\'' + s.id + '\',\'' + i.id + '\',this.checked)">' +
                  '<input type="text" class="form-input" autocomplete="off" style="flex:1 1 calc(100% - 70px);font-size:0.85rem;" value="' + _esc(i.testo) + '" placeholder="L\'indizio" onchange="Segreti._indizio(\'' + s.id + '\',\'' + i.id + '\',\'testo\',this.value)">' +
                  '<span style="width:22px;"></span><select class="form-select" style="flex:1 1 180px;font-size:0.82rem;" onchange="Segreti._indizio(\'' + s.id + '\',\'' + i.id + '\',\'dove\',this.value)">' + _opzioniDove(i.dove ? i.dove.tipo + ':' + i.dove.id : '') + '</select>' +
                  '<input type="text" class="form-input" autocomplete="off" style="flex:2 1 220px;font-size:0.82rem;" value="' + _esc(i.condizione || '') + '" placeholder="Come ottenerlo (es. Persuasione CD 14)" onchange="Segreti._indizio(\'' + s.id + '\',\'' + i.id + '\',\'condizione\',this.value)">' +
                  '<button type="button" class="btn btn-ghost btn-icon-sm" aria-label="Rimuovi indizio" onclick="Segreti._togliIndizio(\'' + s.id + '\',\'' + i.id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
                '</div>').join('') +
              '<div style="display:flex;justify-content:space-between;margin-top:8px;">' +
                '<button type="button" class="btn btn-secondary btn-sm" onclick="Segreti._nuovoIndizio(\'' + s.id + '\')">+ Indizio</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" style="color:var(--danger-text);" onclick="Segreti._elimina(\'' + s.id + '\')">Elimina segreto</button>' +
              '</div>' +
            '</div>' : '') +
        '</div>';
      }).join('') +
      '<button type="button" class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="Segreti._nuovo()">+ Nuovo segreto</button>';
  };

  const _assicuraModale = () => {
    if (document.getElementById('modal-segreti')) return;
    const o = document.createElement('div');
    o.className = 'modal-overlay hidden';
    o.id = 'modal-segreti';
    o.style.display = 'none';
    o.innerHTML =
      '<div class="modal" style="max-width:760px;">' +
        '<div class="modal-header"><h3 class="modal-title">Segreti e indizi</h3>' +
          '<button type="button" class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'segreti\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
        '<div class="modal-body" id="seg-body"></div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-primary" style="margin-left:auto;" onclick="Modal.close(\'segreti\')">Fatto</button></div>' +
      '</div>';
    document.body.appendChild(o);
  };

  const _ridisegna = () => {
    _disegna();
    renderDashboard();
    // Se una scheda PNG/Luogo/Quest e' aperta, si aggiorna il suo riquadro
    try {
      const t = WikiSections._currentType, it = WikiSections._currentItem;
      const det = t && document.getElementById('wiki-' + t + '-detail');
      if (it && det && det.style.display !== 'none' && ['png', 'luoghi', 'quest'].includes(t)) WikiSections.openCard(t, it.id);
    } catch (e) {}
  };

  const apri = (id) => {
    if (!_camp()) { Toast.show('Apri prima una campagna', 'warning'); return; }
    _aperto = id || _aperto;
    _assicuraModale(); _disegna(); Modal.open('segreti');
  };
  const _apriChiudi = (id) => { _aperto = _aperto === id ? null : id; _disegna(); };
  const _nuovo = () => { const id = _id('seg'); _aperto = id; _aggiorna(l => [...l, { id, titolo: '', descrizione: '', scoperto: false, indizi: [], creatoAt: Date.now(), aggiornatoAt: Date.now() }]); };
  const _campo = (id, k, v) => _aggiorna(l => l.map(s => s.id !== id ? s : { ...s, [k]: v, aggiornatoAt: Date.now() }));
  const _elimina = (id) => openConfirmModal('Eliminare il segreto?', 'Verranno eliminati anche i suoi indizi.', () => _aggiorna(l => l.filter(s => s.id !== id)));
  const _nuovoIndizio = (sid) => _aggiorna(l => l.map(s => s.id !== sid ? s : { ...s, indizi: [...(s.indizi || []), { id: _id('ind'), testo: '', dove: null, condizione: '', trovato: false }], aggiornatoAt: Date.now() }));
  const _togliIndizio = (sid, iid) => _aggiorna(l => l.map(s => s.id !== sid ? s : { ...s, indizi: (s.indizi || []).filter(i => i.id !== iid), aggiornatoAt: Date.now() }));
  const _indizio = (sid, iid, k, v) => {
    let val = v;
    if (k === 'dove') {
      const [tipo, id] = String(v).split(':');
      const camp = _camp();
      const fonte = tipo === 'png' ? camp.npcs : tipo === 'luoghi' ? camp.locations : camp.quests;
      const x = (fonte || []).find(e => e.id === id);
      val = x ? { tipo, id, nome: _nome(x) } : null;
    }
    _aggiorna(l => l.map(s => s.id !== sid ? s : { ...s, indizi: (s.indizi || []).map(i => i.id !== iid ? i : { ...i, [k]: val }), aggiornatoAt: Date.now() }));
  };
  const trovato = (sid, iid, on) => _indizio(sid, iid, 'trovato', !!on);

  const _aggancia = () => {
    if (typeof App === 'undefined' || App._segretiHooked) return;
    const orig = App.navigateTo;
    App.navigateTo = function (pageId) {
      orig.apply(App, arguments);
      if (pageId === 'campagna') setTimeout(renderDashboard, 180);
    };
    App._segretiHooked = true;
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(_aggancia, 200));

  return { blocco, renderDashboard, apri, trovato, _apriChiudi, _nuovo, _campo, _elimina, _nuovoIndizio, _togliIndizio, _indizio };
})();

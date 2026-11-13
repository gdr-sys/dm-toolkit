/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   TURNI-FAZIONE.JS — Il mondo si muove: dopo ogni sessione ogni
   fazione fa una mossa fuori scena e avanza (o no) verso il suo
   obiettivo. Cosi' il mondo non aspetta i PG.
     - Modale "Il mondo si muove": per ogni fazione obiettivo,
       orologio a 6 spicchi, cosa fa fuori scena (con "Idea" che
       propone una mossa usando nomi della campagna), "avanza".
       Si apre da sola dopo "Chiudi la sessione" se ci sono fazioni.
     - Card in Dashboard con avanzamento e ultima mossa.
     - Storia delle mosse nella scheda Fazione della Wiki.
     - Ultime mosse nell'avvio guidato della sessione.
   Dati in faction.turni = { progresso, max, compiuto, storia: [{ ts, sessione, testo, avanza }] }.
   ============================================================ */

const TurniFazione = (() => {
  const MAX = 6;
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);
  const _fazioni = () => _camp()?.factions || [];
  const _nome = (f) => (f?.nome || f?.name || 'Fazione').trim();
  const _pulito = (t) => String(t || '').replace(/<[^>]+>/g, ' ').replace(/@/g, '').replace(/\s+/g, ' ').trim();
  const _turni = (f) => ({ progresso: 0, max: MAX, compiuto: false, storia: [], ...(f.turni || {}) });
  const _obiettivo = (f) => _pulito(f.vero_obiettivo || f.obiettivo || f.description);
  const _caso = (a) => a[Math.floor(Math.random() * a.length)];
  const _ultimaSessione = () => {
    const g = (_camp()?.sessioni_log || []).filter(s => s.stato === 'giocata').map(s => s.numero || 0);
    return g.length ? Math.max(...g) : null;
  };

  // ── Idee per le mosse ──

  const GENERALI = [
    'Recluta nuovi membri{sede}.',
    'Mette sotto pressione {rivale}.',
    'Raccoglie informazioni sui PG: qualcuno li sta osservando.',
    'Stringe un accordo segreto con {altra}.',
    'Subisce una perdita: un membro importante viene catturato o scompare.',
    'Sposta uomini e risorse{sede}.',
    'Diffonde voci contro {rivale}.',
    'Fa un passo concreto verso il suo obiettivo{obiettivo}.',
    'Si ritira per riorganizzarsi dopo un colpo subito.',
    'Offre una ricompensa per un lavoro che potrebbe arrivare ai PG.',
    'Un suo membro tradisce e passa a {altra}.',
    'Ottiene un nuovo alleato: {png}.',
  ];
  const PER_TIPO = {
    Criminale: ['Ricatta un funzionario importante.', 'Si prende un nuovo quartiere con la forza.', 'Organizza un colpo grosso.'],
    Religiosa: ['Annuncia un presagio che agita la gente.', 'Converte qualcuno di influente.', 'Dichiara eretico un nemico.'],
    Militare: ['Sposta truppe verso i confini.', 'Addestra nuove reclute.', 'Mette sotto assedio una posizione nemica.'],
    Mercantile: ['Blocca una via commerciale.', 'Alza i prezzi di una merce essenziale.', 'Compra il silenzio di qualcuno.'],
    Arcana: ['Recupera un artefatto perduto.', 'Un esperimento sfugge di mano.', 'Studia un fenomeno magico nuovo.'],
    Governo: ['Emana un nuovo editto.', 'Aumenta le tasse o i controlli.', 'Cerca un capro espiatorio.'],
    Gilda: ['Ottiene un monopolio.', 'Espelle un membro scomodo.', 'Chiede favori in cambio dei suoi servizi.'],
    Ordine: ['Invia un campione in missione.', 'Giudica pubblicamente un colpevole.', 'Riceve una richiesta d\'aiuto.'],
  };

  const idea = (id) => {
    const f = _fazioni().find(x => x.id === id);
    if (!f) return '';
    const altre = _fazioni().filter(x => x.id !== id).map(_nome);
    const rivali = _pulito(f.nemici).split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    const png = (_camp()?.npcs || []).map(n => _nome(n)).filter(Boolean);
    const sede = _pulito(f.sede);
    const ob = _obiettivo(f);
    const testo = _caso([...GENERALI, ...(PER_TIPO[f.tipo] || []), ...(PER_TIPO[f.tipo] || [])])
      .replace('{sede}', sede ? ' a ' + sede : '')
      .replace('{rivale}', rivali.length ? _caso(rivali) : (altre.length ? _caso(altre) : 'i suoi rivali'))
      .replace('{altra}', altre.length ? _caso(altre) : 'un gruppo sconosciuto')
      .replace('{png}', png.length ? _caso(png) : 'un personaggio influente')
      .replace('{obiettivo}', ob ? ' (' + (ob.length > 80 ? ob.slice(0, 80) + '…' : ob) + ')' : '');
    const campo = document.querySelector('#tf-body [data-tf-testo="' + id + '"]');
    if (campo) { campo.value = testo; campo.focus(); }
    return testo;
  };

  // ── Orologio ──

  const _orologio = (t, id, modificabile) =>
    '<div style="display:flex;gap:3px;" role="group" aria-label="Avanzamento verso l\'obiettivo: ' + t.progresso + ' su ' + t.max + '">' +
      Array.from({ length: t.max }, (_, i) => {
        const pieno = i < t.progresso;
        const stile = 'width:18px;height:8px;border-radius:2px;border:none;padding:0;background:' + (pieno ? 'var(--accent-primary)' : 'var(--border-strong)') + ';';
        return modificabile
          ? '<button type="button" style="' + stile + 'cursor:pointer;" title="Imposta a ' + (i + 1) + '" aria-label="Imposta a ' + (i + 1) + '" onclick="TurniFazione._imposta(\'' + id + '\',' + (i + 1) + ')"></button>'
          : '<span style="' + stile + 'display:inline-block;"></span>';
      }).join('') +
      '<span style="font-size:0.72rem;color:var(--text-muted);margin-left:6px;">' + t.progresso + '/' + t.max + '</span>' +
    '</div>';

  // ── Modale ──

  let _bozza = {}; // id fazione -> progresso impostato a mano nella modale
  const _assicuraModale = () => {
    if (document.getElementById('modal-turni-fazione')) return;
    const o = document.createElement('div');
    o.className = 'modal-overlay hidden';
    o.id = 'modal-turni-fazione';
    o.style.display = 'none';
    o.innerHTML = '<div class="modal" style="max-width:760px;"><div class="modal-header"><h3 class="modal-title">Il mondo si muove</h3>' +
      '<button type="button" class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'turni-fazione\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="modal-body"><div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.55;margin-bottom:8px;">Cosa fa ogni fazione mentre i PG sono altrove? Scrivi una mossa (o premi Idea) e segna se si avvicina al suo obiettivo. Le fazioni senza mossa restano ferme.</div><div id="tf-body"></div></div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-ghost" onclick="Modal.close(\'turni-fazione\')">Salta</button>' +
        '<button type="button" class="btn btn-primary" style="margin-left:auto;" onclick="TurniFazione._salva()">Salva le mosse</button></div></div>';
    document.body.appendChild(o);
  };

  const _riga = (f) => {
    const t = { ..._turni(f), progresso: _bozza[f.id] ?? _turni(f).progresso };
    const ob = _obiettivo(f);
    const ultima = _turni(f).storia.slice(-1)[0];
    return '<div style="padding:12px 0;border-bottom:1px solid var(--border);">' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px;">' +
        '<div style="flex:1;min-width:160px;"><span style="font-family:var(--font-display);font-size:0.95rem;">' + _esc(_nome(f)) + '</span>' +
          (f.tipo ? ' <span style="font-size:0.75rem;color:var(--text-muted);">' + _esc(f.tipo) + '</span>' : '') +
          (t.compiuto ? ' <span style="font-size:0.72rem;color:var(--accent-text);">Obiettivo raggiunto</span>' : '') + '</div>' +
        _orologio(t, f.id, true) +
      '</div>' +
      (ob ? '<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:6px;">Obiettivo: ' + _esc(ob.length > 160 ? ob.slice(0, 160) + '…' : ob) + '</div>' : '') +
      (ultima ? '<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:6px;">Ultima mossa: ' + _esc(ultima.testo) + '</div>' : '') +
      '<div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;">' +
        '<textarea class="form-textarea" rows="2" data-tf-testo="' + f.id + '" placeholder="Cosa fa fuori scena?" style="flex:1;min-width:220px;font-size:0.88rem;"></textarea>' +
        '<div style="display:flex;flex-direction:column;gap:6px;">' +
          '<button type="button" class="btn btn-ghost btn-sm" onclick="TurniFazione.idea(\'' + f.id + '\')">Idea</button>' +
          '<label style="display:flex;align-items:center;gap:6px;font-size:0.8rem;cursor:pointer;white-space:nowrap;"><input type="checkbox" data-tf-avanza="' + f.id + '"> Avanza</label>' +
        '</div>' +
      '</div>' +
    '</div>';
  };

  const _disegna = () => {
    const el = document.getElementById('tf-body');
    if (!el) return;
    const lista = _fazioni();
    el.innerHTML = lista.length ? lista.map(_riga).join('')
      : '<div style="color:var(--text-muted);padding:10px 0;">Nessuna fazione nella campagna: creale nella Wiki, sezione Fazioni.</div>';
  };

  const apri = () => {
    if (!_camp()) return;
    _bozza = {};
    _assicuraModale();
    _disegna();
    Modal.open('turni-fazione');
  };

  const _imposta = (id, n) => {
    const corrente = _bozza[id] ?? _turni(_fazioni().find(f => f.id === id) || {}).progresso;
    _bozza[id] = corrente === n ? n - 1 : n; // cliccando lo spicchio pieno piu' alto lo si svuota
    // Ridisegna solo l'orologio di quella riga, senza perdere il testo scritto
    const testi = {}, avanza = {};
    document.querySelectorAll('#tf-body [data-tf-testo]').forEach(t => { testi[t.dataset.tfTesto] = t.value; });
    document.querySelectorAll('#tf-body [data-tf-avanza]').forEach(c => { avanza[c.dataset.tfAvanza] = c.checked; });
    _disegna();
    document.querySelectorAll('#tf-body [data-tf-testo]').forEach(t => { t.value = testi[t.dataset.tfTesto] || ''; });
    document.querySelectorAll('#tf-body [data-tf-avanza]').forEach(c => { c.checked = !!avanza[c.dataset.tfAvanza]; });
  };

  const _salva = () => {
    const sessione = _ultimaSessione();
    const compiute = [];
    let mosse = 0;
    const factions = _fazioni().map(f => {
      const testo = (document.querySelector('#tf-body [data-tf-testo="' + f.id + '"]')?.value || '').trim();
      const av = !!document.querySelector('#tf-body [data-tf-avanza="' + f.id + '"]')?.checked;
      const t = _turni(f);
      const manuale = _bozza[f.id];
      if (!testo && !av && manuale == null) return f;
      let progresso = manuale ?? t.progresso;
      if (av) progresso = Math.min(t.max, progresso + 1);
      const storia = testo || av ? [...t.storia, { ts: Date.now(), sessione, testo: testo || 'Avanza verso il suo obiettivo.', avanza: av }].slice(-30) : t.storia;
      if (testo || av) mosse++;
      const compiuto = progresso >= t.max;
      if (compiuto && !t.compiuto) compiute.push(_nome(f));
      return { ...f, turni: { ...t, progresso, compiuto, storia } };
    });
    App.saveActiveCampaign({ factions });
    Modal.close('turni-fazione');
    Toast.show(mosse ? 'Mosse salvate: ' + mosse + (mosse === 1 ? ' fazione' : ' fazioni') + ' si sono mosse' : 'Avanzamento aggiornato', 'success', 2500);
    compiute.forEach((n, i) => setTimeout(() => Toast.show(n + ' ha raggiunto il suo obiettivo: il mondo cambia.', 'warning', 6000), 600 + i * 400));
    renderDashboard();
  };

  // ── Scheda Fazione (Wiki) ──

  const blocco = (id) => {
    const f = _fazioni().find(x => x.id === id);
    if (!f) return '';
    const t = _turni(f);
    if (!t.storia.length && !t.progresso) return '';
    return '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:16px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:6px;">' +
        '<div style="font-family:var(--font-display);font-size:0.85rem;color:var(--text-secondary);">Mosse fuori scena</div>' + _orologio(t, id, false) + '</div>' +
      (t.storia.slice(-6).reverse().map(m => '<div style="font-size:0.85rem;line-height:1.5;padding:4px 0;border-top:1px solid var(--border);">' +
        (m.sessione ? '<span style="color:var(--text-muted);">Dopo S' + m.sessione + ':</span> ' : '') + _esc(m.testo) + (m.avanza ? ' <span style="color:var(--accent-text);font-size:0.75rem;">+1</span>' : '') + '</div>').join('')) +
    '</div>';
  };

  // ── Avvio guidato: ultime mosse ──

  const ultimeMosse = () => {
    const recenti = _fazioni().map(f => ({ f, m: _turni(f).storia.slice(-1)[0] })).filter(x => x.m).sort((a, b) => b.m.ts - a.m.ts).slice(0, 5);
    return recenti.map(x => '<div><span style="color:var(--text-primary);">' + _esc(_nome(x.f)) + ':</span> ' + _esc(x.m.testo) + '</div>').join('');
  };

  // ── Card in Dashboard ──

  const renderDashboard = () => {
    const griglia = document.querySelector('#page-campagna .dash-grid');
    if (!griglia || !_camp()) return;
    const lista = _fazioni();
    let card = document.getElementById('dash-turni-fazione');
    if (!lista.length) { card?.remove(); return; }
    if (!card) { card = document.createElement('div'); card.id = 'dash-turni-fazione'; card.className = 'card'; griglia.appendChild(card); }
    card.innerHTML = '<div class="card-header"><h2 class="card-title">Il mondo si muove</h2><button type="button" class="btn btn-ghost btn-sm" onclick="TurniFazione.apri()">Muovi le fazioni</button></div>' +
      lista.slice(0, 6).map(f => {
        const t = _turni(f), m = t.storia.slice(-1)[0];
        return '<div class="sc-t" data-t="viola" role="button" tabindex="0" onclick="TurniFazione.apri()">' +
          '<span class="sc-et">Fazione · ' + t.progresso + ' di ' + t.max + '</span>' +
          '<h3 class="sc-h">' + _esc(_nome(f)) + '</h3>' +
          (m ? '<small class="sc-s">' + _esc(m.testo) + '</small>' : '') +
          (typeof Scena !== 'undefined' ? Scena.pallini(t.progresso, t.max) : '') +
        '</div>';
      }).join('');
  };

  // ── Avvio ──

  const _aggancia = () => {
    if (typeof App !== 'undefined') {
      const nav = App.navigateTo;
      App.navigateTo = function (pageId) { const r = nav.apply(App, arguments); if (pageId === 'campagna') setTimeout(renderDashboard, 200); return r; };
    }
    // Dopo "Chiudi la sessione": e' il momento naturale per muovere il mondo
    if (typeof ChiusuraSessione !== 'undefined' && ChiusuraSessione.salva) {
      const cs = ChiusuraSessione.salva;
      ChiusuraSessione.salva = function () {
        const r = cs.apply(ChiusuraSessione, arguments);
        setTimeout(() => { if (_fazioni().length && document.getElementById('modal-chiusura-sessione')?.classList.contains('hidden')) apri(); }, 700);
        return r;
      };
    }
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(_aggancia, 300));

  return { apri, idea, blocco, ultimeMosse, renderDashboard, _imposta, _salva };
})();

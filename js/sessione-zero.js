/* ============================================================
   SESSIONE-ZERO.JS — Sessione Zero e strumenti di sicurezza:
   aspettative del tavolo, linee e veli, strumenti concordati
   (carta X, porta aperta...) e una carta X a schermo intero da
   toccare durante il gioco.

   Dati in camp.sessioneZero (sincronizzati con la campagna).
   Modulo autonomo: card nella Dashboard e modale costruiti a
   runtime, stesso aggancio ad App.navigateTo di fili-sospesi.js.
   ============================================================ */

const SessioneZero = (() => {
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);
  const _dati = () => ({ linee: [], veli: [], aspettative: {}, strumenti: ['cartaX', 'linee'], ...(_camp()?.sessioneZero || {}) });
  const _salva = (patch) => App.saveActiveCampaign({ sessioneZero: { ..._dati(), ...patch, aggiornatoAt: Date.now() } });

  const SUGGERIMENTI = ['Violenza su bambini', 'Violenza sessuale', 'Tortura esplicita', 'Ragni', 'Insetti', 'Body horror', 'Suicidio e autolesionismo', 'Razzismo nel mondo di gioco', 'Crudeltà sugli animali', 'Malattie e contagi', 'Annegamento', 'Possessione e perdita di controllo', 'Scene romantiche esplicite', 'Fobie (chiedere quali)'];

  const STRUMENTI = [
    ['cartaX', 'Carta X', 'Chiunque tocchi la carta sul tavolo può far saltare il contenuto in corso, senza dover spiegare perché. Si va avanti e basta.'],
    ['linee', 'Linee e veli', 'Le linee sono temi che non compaiono mai nel gioco. I veli possono esistere, ma fuori scena: "dissolvenza al nero".'],
    ['porta', 'Porta aperta', 'Chiunque può lasciare il tavolo, per una pausa o per sempre, senza doverlo giustificare.'],
    ['pausa', 'Pausa e controllo', 'Chiunque può chiedere una pausa per parlare fuori dal personaggio di come sta andando.'],
    ['stelle', 'Stelle e desideri', 'A fine sessione ognuno dice una cosa che gli è piaciuta (stella) e una che vorrebbe vedere (desiderio).'],
  ];

  const ASPETTATIVE = [
    ['tono', 'Tono della campagna', ['', 'Leggero e scanzonato', 'Avventura classica', 'Drammatico', 'Cupo e duro', 'Horror']],
    ['morte', 'Morte dei personaggi', ['', 'Quasi impossibile', 'Rara, solo per scelte importanti', 'Possibile', 'Frequente']],
    ['pvp', 'Conflitto tra personaggi (PvP)', ['', 'No', 'Solo con il consenso di entrambi', 'Sì']],
    ['combattimento', 'Combattimento', ['', 'Poco', 'Un po\'', 'Bilanciato', 'Molto']],
    ['esplorazione', 'Esplorazione', ['', 'Poca', 'Un po\'', 'Bilanciata', 'Molta']],
    ['interazione', 'Interazione e dialoghi', ['', 'Poca', 'Un po\'', 'Bilanciata', 'Molta']],
  ];

  // ── Card nella Dashboard ──

  const _assicuraCard = () => {
    if (document.getElementById('dash-sz-card')) return;
    const griglia = document.querySelector('#page-campagna .dash-grid');
    if (!griglia) return;
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'dash-sz-card';
    card.innerHTML =
      '<div class="card-header" style="flex-wrap:wrap;gap:6px;">' +
        '<h2 class="card-title">Sessione Zero</h2>' +
        '<div style="display:flex;gap:6px;">' +
          '<button type="button" class="btn btn-ghost btn-sm" onclick="SessioneZero.apri()">Apri</button>' +
        '</div>' +
      '</div>' +
      '<div id="dash-sz-body" style="font-size:0.85rem;line-height:1.6;"></div>';
    griglia.appendChild(card);
  };

  const render = () => {
    _assicuraCard();
    const el = document.getElementById('dash-sz-body');
    if (!el) return;
    const d = _dati();
    const a = d.aspettative || {};
    const fatta = d.linee.length || d.veli.length || Object.values(a).some(Boolean);
    if (!fatta) {
      el.innerHTML = '<div style="color:var(--text-secondary);">Prima di iniziare, concordate con i giocatori tono, limiti e strumenti di sicurezza.</div>' +
        '<button type="button" class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="SessioneZero.apri()">Prepara la Sessione Zero</button>';
      return;
    }
    const strumenti = STRUMENTI.filter(([k]) => d.strumenti.includes(k)).map(([, n]) => n);
    el.innerHTML =
      (a.tono ? '<div><span style="color:var(--text-muted);">Tono:</span> ' + _esc(a.tono) + '</div>' : '') +
      '<div><span style="color:var(--text-muted);">Linee:</span> ' + (d.linee.length ? d.linee.map(_esc).join(', ') : 'nessuna') + '</div>' +
      '<div><span style="color:var(--text-muted);">Veli:</span> ' + (d.veli.length ? d.veli.map(_esc).join(', ') : 'nessuno') + '</div>' +
      (strumenti.length ? '<div><span style="color:var(--text-muted);">Strumenti:</span> ' + strumenti.join(', ') + '</div>' : '');
  };

  // ── Modale ──

  const _assicuraModale = () => {
    if (document.getElementById('modal-sessione-zero')) return;
    const o = document.createElement('div');
    o.className = 'modal-overlay hidden';
    o.id = 'modal-sessione-zero';
    o.style.display = 'none';
    o.innerHTML =
      '<div class="modal" style="max-width:720px;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title">Sessione Zero e sicurezza</h3>' +
          '<button type="button" class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'sessione-zero\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body" id="sz-body"></div>' +
        '<div class="modal-footer">' +
          '<button type="button" class="btn btn-primary" style="margin-left:auto;" onclick="Modal.close(\'sessione-zero\')">Fatto</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(o);
  };

  const _titolo = (t, sotto) => '<h4 style="font-family:var(--font-display);font-size:0.95rem;margin:18px 0 4px;color:var(--text-primary);">' + t + '</h4>' +
    (sotto ? '<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;line-height:1.5;">' + sotto + '</div>' : '');

  const _chip = (testo, lista, i) => '<span style="display:inline-flex;align-items:center;gap:6px;padding:3px 6px 3px 10px;border-radius:var(--radius-full);background:var(--bg-secondary);border:1px solid var(--border);font-size:0.82rem;">' +
    _esc(testo) + '<button type="button" class="btn btn-ghost btn-icon-sm" style="width:20px;height:20px;padding:0;" aria-label="Rimuovi" onclick="SessioneZero.togli(\'' + lista + '\',' + i + ')"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></span>';

  const _lista = (chiave, nome, segnaposto) => {
    const d = _dati();
    return '<div style="flex:1;min-width:240px;">' +
      '<div style="font-size:0.82rem;font-weight:600;margin-bottom:6px;">' + nome + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;min-height:28px;">' +
        (d[chiave].length ? d[chiave].map((t, i) => _chip(t, chiave, i)).join('') : '<span style="font-size:0.8rem;color:var(--text-muted);">Nessuna voce</span>') +
      '</div>' +
      '<div style="display:flex;gap:6px;">' +
        '<input type="text" id="sz-nuova-' + chiave + '" class="form-input" autocomplete="off" style="font-size:0.85rem;" placeholder="' + segnaposto + '" onkeydown="if(event.key===\'Enter\'){event.preventDefault();SessioneZero.aggiungi(\'' + chiave + '\')}">' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="SessioneZero.aggiungi(\'' + chiave + '\')">Aggiungi</button>' +
      '</div>' +
    '</div>';
  };

  const _disegna = () => {
    const el = document.getElementById('sz-body');
    if (!el) return;
    const d = _dati();
    const a = d.aspettative || {};
    const usati = new Set([...d.linee, ...d.veli].map(x => x.toLowerCase()));
    el.innerHTML =
      '<div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6;">Da compilare insieme ai giocatori prima della prima sessione, e da riaprire quando serve. Tutto quello che decidete resta qui, a portata di mano.</div>' +

      _titolo('Aspettative del tavolo') +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">' +
        ASPETTATIVE.map(([k, nome, opzioni]) =>
          '<label style="display:flex;flex-direction:column;gap:4px;font-size:0.8rem;color:var(--text-secondary);">' + nome +
            '<select class="form-select" style="font-size:0.85rem;" onchange="SessioneZero.imposta(\'' + k + '\',this.value)">' +
              opzioni.map(o => '<option value="' + _esc(o) + '"' + (a[k] === o ? ' selected' : '') + '>' + (o ? _esc(o) : '— da decidere —') + '</option>').join('') +
            '</select></label>').join('') +
      '</div>' +
      '<label style="display:flex;flex-direction:column;gap:4px;font-size:0.8rem;color:var(--text-secondary);margin-top:10px;">Regole della casa, orari, cosa portare, altro' +
        '<textarea class="form-textarea" rows="3" style="font-size:0.85rem;" onchange="SessioneZero.imposta(\'note\',this.value)" placeholder="es. Ci vediamo ogni due venerdì alle 21; niente telefoni al tavolo; i tiri si fanno in vista">' + _esc(a.note || '') + '</textarea></label>' +

      _titolo('Linee e veli', 'Le <strong>linee</strong> sono temi che non compariranno mai. I <strong>veli</strong> possono esistere nella storia, ma succedono fuori scena. Chiunque può aggiungere voci, anche in privato al DM, senza spiegare il perché.') +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;">' +
        _lista('linee', 'Linee (mai)', 'es. Ragni') +
        _lista('veli', 'Veli (fuori scena)', 'es. Tortura') +
      '</div>' +
      '<div style="margin-top:10px;font-size:0.78rem;color:var(--text-muted);">Spunti frequenti — clic per aggiungere come linea o velo:</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">' +
        SUGGERIMENTI.filter(s => !usati.has(s.toLowerCase())).map(s =>
          '<span style="display:inline-flex;align-items:center;border:1px dashed var(--border-strong);border-radius:var(--radius-full);font-size:0.78rem;overflow:hidden;">' +
            '<span style="padding:3px 8px;color:var(--text-secondary);">' + _esc(s) + '</span>' +
            '<button type="button" class="btn btn-ghost btn-sm" style="padding:3px 8px;border-radius:0;font-size:0.72rem;" onclick="SessioneZero.aggiungiTesto(\'linee\',\'' + _esc(s).replace(/'/g, "\\'") + '\')">linea</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" style="padding:3px 8px;border-radius:0;font-size:0.72rem;" onclick="SessioneZero.aggiungiTesto(\'veli\',\'' + _esc(s).replace(/'/g, "\\'") + '\')">velo</button>' +
          '</span>').join('') +
      '</div>' +

      _titolo('Strumenti di sicurezza al tavolo', 'Scegliete quelli che userete, e spiegateli a tutti all\'inizio.') +
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
        STRUMENTI.map(([k, nome, desc]) =>
          '<label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);">' +
            '<input type="checkbox" style="margin-top:3px;"' + (d.strumenti.includes(k) ? ' checked' : '') + ' onchange="SessioneZero.strumento(\'' + k + '\',this.checked)">' +
            '<span><strong style="font-size:0.88rem;">' + nome + '</strong><br><span style="font-size:0.8rem;color:var(--text-secondary);line-height:1.5;">' + desc + '</span></span>' +
          '</label>').join('') +
      '</div>';
  };

  const apri = () => {
    if (!_camp()) { Toast.show('Apri prima una campagna', 'warning'); return; }
    _assicuraModale();
    _disegna();
    Modal.open('sessione-zero');
  };

  const _dopo = () => { _disegna(); render(); };
  const imposta = (k, v) => { _salva({ aspettative: { ..._dati().aspettative, [k]: v } }); render(); };
  const aggiungiTesto = (lista, testo) => {
    testo = String(testo || '').trim();
    if (!testo) return;
    const d = _dati();
    if ([...d.linee, ...d.veli].some(x => x.toLowerCase() === testo.toLowerCase())) { Toast.show('È già nell\'elenco', 'info', 1500); return; }
    _salva({ [lista]: [...d[lista], testo] });
    _dopo();
  };
  const aggiungi = (lista) => {
    const input = document.getElementById('sz-nuova-' + lista);
    aggiungiTesto(lista, input?.value);
    setTimeout(() => document.getElementById('sz-nuova-' + lista)?.focus(), 0);
  };
  const togli = (lista, i) => { const d = _dati(); _salva({ [lista]: d[lista].filter((_, j) => j !== i) }); _dopo(); };
  const strumento = (k, on) => { const s = new Set(_dati().strumenti); on ? s.add(k) : s.delete(k); _salva({ strumenti: [...s] }); render(); };

  const _aggancia = () => {
    if (typeof App === 'undefined' || App._sessioneZeroHooked) return;
    const orig = App.navigateTo;
    App.navigateTo = function (pageId) {
      orig.apply(App, arguments);
      if (pageId === 'campagna') setTimeout(render, 160);
    };
    App._sessioneZeroHooked = true;
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(_aggancia, 200));

  return { render, apri, imposta, aggiungi, aggiungiTesto, togli, strumento };
})();

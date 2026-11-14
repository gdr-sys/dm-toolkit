/* Chiave delle stanze per dungeon e caverne del Cartografo.
   Ogni stanza numerata ha gia' nome, descrizione ed eventuale trappola (dal generatore);
   qui si aggiungono "chi c'e'" (spesso nessuno, a volte un incontro della tabella Dungeon
   al livello del Party), un dettaglio da raccontare e, ogni tanto, un tesoro.
   La chiave si puo' rigenerare stanza per stanza, copiare o salvare nella scheda del Luogo
   (Wiki › Luoghi), nelle note libere, con titoli ed elenchi.
   Usa: Cartografo.dopoMostra / mappaAttuale, IncontriCasuali, WikiSections. */
const DungeonChiave = (() => {
  const ID = 'dungeon-chiave';
  const TIPI = ['dungeon', 'caverna'];
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let _chiave = null; // { nome, tipo, stanze: [{ titolo, cosa, chi, dettaglio, tesoro, sale }] }

  const VUOTE = [
    'Nessuno: la polvere è intatta, qui non passa nessuno da anni.',
    'Vuota, ma nel fango ci sono impronte fresche che vanno verso la stanza dopo.',
    'Vuota: i resti di un bivacco, la cenere è ancora tiepida.',
    'Nessuno in vista. Da una fessura nel muro arriva un respiro lento e regolare.',
    'Vuota. Un topo scappa in un buco: forse sa qualcosa che voi non sapete.',
    'Nessuno: una ragnatela enorme copre un angolo, ma chi l’ha tessuta non c’è.',
    'Vuota, se non per un odore di animale bagnato che si fa più forte.',
    'Nessuno. Si sentono passi, lontani, che si fermano quando vi fermate voi.',
  ];
  const DETTAGLI = [
    'Odore di cera bruciata e incenso andato a male.',
    'Un’iscrizione graffiata di fretta: «Non fidarti della terza porta».',
    'Gocce d’acqua cadono a ritmo regolare, come un orologio.',
    'Una corda tagliata pende dal soffitto.',
    'Il pavimento è inclinato verso una grata di scolo.',
    'Una mappa a carboncino sul muro, lasciata a metà.',
    'Le ossa di un avventuriero, con lo zaino ancora chiuso.',
    'Una corrente fredda fa tremare le fiamme: CD 10 per tenere accese le torce.',
    'Un’eco strana: ogni parola torna due volte.',
    'Segni di gesso sugli stipiti: qualcuno ha segnato la strada.',
    'Una porta dipinta sul muro, così realistica da ingannare.',
    'Muschio luminescente: una luce fioca e verdastra in tutta la stanza.',
    'Un diario fradicio: l’ultima pagina parla di «quello che dorme sotto».',
    'Catene spezzate fissate al muro, gli anelli piegati dall’interno.',
    'Una statuetta di un dio dimenticato con una moneta tra le mani.',
    'Il soffitto è coperto di pipistrelli addormentati.',
    'Una pozza d’acqua nera e immobile, più profonda di quanto sembri.',
    'Graffi profondi sul pavimento, tutti diretti verso la porta.',
    'Una tavola apparecchiata per tre: il pane è ancora morbido.',
    'Un carrello da miniera rovesciato, le ruote girano ancora piano.',
    'Un affresco sbiadito racconta la storia di chi costruì questo posto.',
    'Un rumore di ingranaggi dietro il muro, a intervalli regolari.',
    'Candele consumate disposte in cerchio intorno a una macchia scura.',
    'Un baule vuoto con il fondo forzato: qualcuno è arrivato prima.',
  ];
  const TESORI = {
    basso: ['2d10 monete d’argento in un sacchetto di cuoio', 'una pozione di guarigione', 'un pugnale d’argento (25 mo)', 'una gemma opaca (10 mo)', 'una chiave di ferro che apre qualcosa più avanti'],
    medio: ['3d6 × 10 monete d’oro in una cassetta', 'una pergamena di un incantesimo di 2° livello', 'un anello d’oro inciso (75 mo)', 'una pozione di guarigione superiore', 'una mappa del livello inferiore'],
    alto: ['4d6 × 100 monete d’oro', 'un oggetto magico non comune a tua scelta', 'gemme per 500 mo', 'una pergamena di un incantesimo di 5° livello', 'una corona d’argento con il sigillo di un regno perduto'],
  };

  // Casuale ripetibile: la stessa mappa da' la stessa chiave, "Rigenera" cambia il sale
  const _rng = (testo) => {
    let h = 2166136261;
    for (let i = 0; i < testo.length; i++) { h ^= testo.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  const _pick = (r, a) => a[Math.floor(r() * a.length)];

  const _stanza = (nomeMappa, p, i, sale, livello) => {
    const r = _rng(nomeMappa + '|' + p.label + '|' + i + '|' + sale);
    const titolo = String(p.label || '').replace(/^\d+\.\s*/, '');
    const n = parseInt(p.label, 10) || i + 1;
    let chi;
    const x = r();
    if (i === 0 || x < 0.45) chi = _pick(r, VUOTE);
    else if (x < 0.85) {
      const tab = (typeof IncontriCasuali !== 'undefined' && IncontriCasuali.TABELLA.dungeon[livello]) || [];
      chi = tab.length ? _pick(r, tab) : _pick(r, VUOTE);
    } else chi = 'Qualcuno si nasconde: CD 14 Saggezza (Percezione) per accorgersene prima che agisca.';
    const tesoro = r() < (/tesoro|votiv|baule|forziere|camera del/i.test(titolo + ' ' + (p.note || '')) ? 0.7 : 0.18) ? _pick(r, TESORI[livello] || TESORI.medio) : '';
    return { n, titolo, cosa: p.note || '', chi, dettaglio: _pick(r, DETTAGLI), tesoro, sale };
  };

  const _crea = (m) => {
    const livello = typeof IncontriCasuali !== 'undefined' ? IncontriCasuali.livelloParty() : 'medio';
    const pin = (m.pin || []).filter(p => /^\d+\./.test(p.label || ''));
    return { nome: m.nome, tipo: m.tipo, livello, stanze: pin.map((p, i) => _stanza(m.nome, p, i, 0, livello)), pin };
  };

  const _css = () => {
    if (document.getElementById('dungeon-chiave-css')) return;
    const st = document.createElement('style');
    st.id = 'dungeon-chiave-css';
    st.textContent = `
      .dk-lista { display: flex; flex-direction: column; gap: 8px; max-height: 58vh; overflow-y: auto; }
      .dk-stanza { padding: 10px 12px; border-radius: var(--radius-md); background: var(--bg-secondary); border: 1px solid var(--border); }
      .dk-testa { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
      .dk-num { flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
        background: var(--titolo, var(--accent-primary)); color: var(--bg-primary); font-weight: 700; font-size: 0.8rem; }
      .dk-titolo { flex: 1; font-family: var(--font-titoli, var(--font-display)); font-size: 1.05rem; color: var(--titolo, var(--accent-text)); }
      .dk-riga { font-size: 0.85rem; line-height: 1.5; margin: 2px 0 0 34px; }
      .dk-riga b { color: var(--text-muted); font-weight: 600; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; margin-right: 4px; }
      .dk-riga.tesoro b { color: var(--titolo-2, var(--accent-text)); }
      @media (max-width: 520px) { .dk-riga { margin-left: 0; } }
    `;
    document.head.appendChild(st);
  };

  const _modale = () => {
    if (document.getElementById('modal-' + ID)) return;
    const m = document.createElement('div');
    m.className = 'modal-overlay hidden'; m.id = 'modal-' + ID; m.style.display = 'none';
    m.onclick = (e) => { if (e.target === m) Modal.close(ID); };
    m.innerHTML = '<div class="modal" style="max-width:640px;"><div class="modal-header"><h3 class="modal-title" id="dk-titolo">Chiave delle stanze</h3>' +
      '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'' + ID + '\')" aria-label="Chiudi"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="modal-body" id="dk-corpo"></div>' +
      '<div class="modal-footer" style="display:flex;flex-wrap:wrap;gap:8px;">' +
        '<button class="btn btn-ghost" onclick="DungeonChiave.rigenera()">Rigenera tutto</button>' +
        '<button class="btn btn-secondary" style="margin-left:auto;" onclick="DungeonChiave.copia()">Copia il testo</button>' +
        '<button class="btn btn-primary" onclick="DungeonChiave.salva()">Salva nella scheda del Luogo</button>' +
      '</div></div>';
    document.body.appendChild(m);
  };

  const ICO_RIGENERA = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></svg>';

  const _render = () => {
    const el = document.getElementById('dk-corpo');
    if (!el || !_chiave) return;
    document.getElementById('dk-titolo').textContent = 'Chiave delle stanze · ' + _chiave.nome;
    const camp = typeof App !== 'undefined' && App.getActiveCampaign();
    const esiste = camp && (camp.locations || []).some(l => (l.nome || l.name || '').toLowerCase() === _chiave.nome.toLowerCase());
    el.innerHTML =
      '<p class="text-muted" style="font-size:0.8rem;margin:0 0 10px;line-height:1.5;">Mostri presi dalla tabella Dungeon per il livello del Party (' + ({ basso: '1–4', medio: '5–10', alto: '11+' }[_chiave.livello] || '') + '). ' +
        'Le frecce rigenerano una stanza sola. ' + (esiste ? 'Salvando, la chiave si aggiunge alle note della scheda «' + esc(_chiave.nome) + '».' : 'Salvando, si crea la scheda «' + esc(_chiave.nome) + '» in Wiki › Luoghi.') + '</p>' +
      '<div class="dk-lista">' + _chiave.stanze.map((s, i) =>
        '<div class="dk-stanza"><div class="dk-testa"><span class="dk-num">' + s.n + '</span><span class="dk-titolo">' + esc(s.titolo) + '</span>' +
          '<button type="button" class="btn btn-ghost btn-icon-sm" title="Rigenera questa stanza" aria-label="Rigenera la stanza ' + s.n + '" onclick="DungeonChiave.rigenera(' + i + ')">' + ICO_RIGENERA + '</button></div>' +
          (s.cosa ? '<div class="dk-riga"><b>Cosa c’è</b>' + esc(s.cosa) + '</div>' : '') +
          '<div class="dk-riga"><b>Chi c’è</b>' + esc(s.chi) + '</div>' +
          '<div class="dk-riga"><b>Dettaglio</b>' + esc(s.dettaglio) + '</div>' +
          (s.tesoro ? '<div class="dk-riga tesoro"><b>Tesoro</b>' + esc(s.tesoro) + '</div>' : '') +
        '</div>').join('') + '</div>';
  };

  const apri = () => {
    const m = typeof Cartografo !== 'undefined' && Cartografo.mappaAttuale && Cartografo.mappaAttuale();
    if (!m || !TIPI.includes(m.tipo)) { Toast.show('Genera prima un dungeon o una caverna', 'warning'); return; }
    if (!_chiave || _chiave.nome !== m.nome || _chiave.pin !== m.pin) _chiave = _crea(m);
    if (!_chiave.stanze.length) { Toast.show('Questa mappa non ha stanze numerate', 'info'); return; }
    _css(); _modale(); _render();
    Modal.open(ID);
  };

  const rigenera = (i) => {
    if (!_chiave) return;
    const idx = Number.isInteger(i) ? [i] : _chiave.stanze.map((_, k) => k);
    idx.forEach(k => {
      const p = _chiave.pin[k], vecchia = _chiave.stanze[k];
      _chiave.stanze[k] = _stanza(_chiave.nome, p, k, (vecchia.sale || 0) + 1 + Math.floor(Math.random() * 1000), _chiave.livello);
    });
    _render();
  };

  const _html = () => _chiave.stanze.map(s =>
    '<h3>' + s.n + '. ' + esc(s.titolo) + '</h3><ul>' +
      (s.cosa ? '<li><strong>Cosa c’è:</strong> ' + esc(s.cosa) + '</li>' : '') +
      '<li><strong>Chi c’è:</strong> ' + esc(s.chi) + '</li>' +
      '<li><strong>Dettaglio:</strong> ' + esc(s.dettaglio) + '</li>' +
      (s.tesoro ? '<li><strong>Tesoro:</strong> ' + esc(s.tesoro) + '</li>' : '') +
    '</ul>').join('');

  const copia = async () => {
    if (!_chiave) return;
    const testo = _chiave.nome + '\n\n' + _chiave.stanze.map(s => s.n + '. ' + s.titolo + '\n' + [s.cosa && 'Cosa c’è: ' + s.cosa, 'Chi c’è: ' + s.chi, 'Dettaglio: ' + s.dettaglio, s.tesoro && 'Tesoro: ' + s.tesoro].filter(Boolean).join('\n')).join('\n\n');
    try { await navigator.clipboard.writeText(testo); Toast.show('Chiave copiata', 'success', 1800); }
    catch (e) { Toast.show('Non riesco a copiare: tieni premuto sul testo per selezionarlo', 'warning', 3500); }
  };

  const salva = () => {
    const camp = typeof App !== 'undefined' && App.getActiveCampaign();
    if (!_chiave || !camp) { Toast.show('Apri una campagna prima', 'warning'); return; }
    const cfg = WikiSections._getCfg('luoghi');
    const esistente = (cfg.getData(camp) || []).find(x => (x.nome || '').toLowerCase() === _chiave.nome.toLowerCase());
    const item = esistente || cfg.newItem();
    if (!esistente) {
      item.nome = _chiave.nome;
      item.tipo = 'Dungeon';
      item.atmosfera = '<p>' + (_chiave.tipo === 'caverna' ? 'Caverna' : 'Dungeon') + ' di ' + _chiave.stanze.length + ' stanze. La chiave delle stanze è nelle note qui sotto.</p>';
    }
    item.note = (item.note ? item.note : '') + '<h2>Chiave delle stanze</h2>' + _html();
    cfg.saveItem(camp, item);
    try { WikiSections.renderCounters(); } catch (e) {}
    Modal.close(ID);
    Toast.show(esistente ? 'Chiave aggiunta alla scheda «' + _chiave.nome + '»' : 'Creata la scheda «' + _chiave.nome + '» in Wiki › Luoghi', 'success', 3200);
  };

  // Pulsante "Chiave delle stanze" accanto agli altri del Cartografo, solo per dungeon e caverne
  const _pulsante = (m) => {
    let b = document.getElementById('carto-chiave');
    if (!b) {
      const vicino = document.getElementById('carto-stampa') || document.getElementById('carto-vtt');
      if (!vicino) return;
      vicino.insertAdjacentHTML('afterend', '<button type="button" class="btn btn-secondary btn-sm" id="carto-chiave" hidden onclick="DungeonChiave.apri()" title="Chi c’è, un dettaglio e i tesori di ogni stanza, da salvare nella scheda del Luogo">Chiave delle stanze</button>');
      b = document.getElementById('carto-chiave');
    }
    b.hidden = !TIPI.includes(m && m.tipo);
  };
  const _aggancia = () => { if (typeof Cartografo !== 'undefined' && Cartografo.dopoMostra) Cartografo.dopoMostra(_pulsante); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _aggancia); else _aggancia();

  return { apri, rigenera, copia, salva };
})();

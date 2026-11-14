/* Viaggio sul calendario: dopo "Calcola" nel Calcolatore Viaggio (Generatori) compare
   "Parti". Si vede il viaggio giorno per giorno (data, tempo, eventi e scadenze, incontri
   della notte) e, confermando, la data del mondo va avanti dei giorni del viaggio.
   Usa: Generatori._ultimoViaggio (index.html), Calendario, CalendarioUI.eventiDelGiorno,
   CalendarioCielo (tempo), IncontriCasuali (js/incontri-casuali.js), NoteSessione. */
const ViaggioCalendario = (() => {
  const ID = 'viaggio-cal';
  const MEZZI = { piedi: 'a piedi', cavallo: 'a cavallo', barca: 'in barca', nave: 'in nave' };
  const TERRENI = { strada: 'su strada', pianura: 'in pianura', foresta: 'nella foresta', colline: 'tra le colline', montagna: 'in montagna', palude: 'nella palude', deserto: 'nel deserto', mare: 'per mare' };
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let _piano = null;

  const _cal = () => (typeof Calendario !== 'undefined' ? Calendario.get() : null);
  const _attivo = (cal) => !!(cal && cal.mesi && cal.mesi.length);
  const _abs = (cal, d) => Calendario.toAbsoluteDay(cal, d);
  const _data = (c) => ({ giorno: c.giorno, mese: c.mese, anno: c.anno });

  const _css = () => {
    if (document.getElementById('viaggio-cal-css')) return;
    const st = document.createElement('style');
    st.id = 'viaggio-cal-css';
    st.textContent = `
      .vc-parti { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
      .vc-parti .vc-oggi { font-size: 0.78rem; color: var(--text-muted); }
      .vc-testa { font-size: 0.9rem; line-height: 1.5; margin-bottom: 10px; }
      .vc-testa strong { color: var(--titolo, var(--accent-text)); }
      .vc-avviso { padding: 8px 12px; border-radius: var(--radius-md); background: color-mix(in oklch, var(--accent-danger, #c0504d) 14%, transparent);
        border: 1px solid color-mix(in oklch, var(--accent-danger, #c0504d) 40%, transparent); font-size: 0.85rem; line-height: 1.5; margin-bottom: 10px; }
      .vc-giorni { display: flex; flex-direction: column; gap: 6px; max-height: 52vh; overflow-y: auto; }
      .vc-giorno { display: grid; grid-template-columns: 92px 1fr; gap: 4px 12px; padding: 8px 10px; border-radius: var(--radius-md); background: var(--bg-secondary); border: 1px solid var(--border); }
      .vc-giorno .vc-quando { font-weight: 700; font-size: 0.85rem; line-height: 1.3; }
      .vc-giorno .vc-quando small { display: block; font-weight: 400; color: var(--text-muted); font-size: 0.72rem; }
      .vc-giorno .vc-cosa { font-size: 0.84rem; line-height: 1.5; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
      .vc-riga { display: flex; gap: 6px; align-items: flex-start; }
      .vc-riga svg { flex-shrink: 0; margin-top: 2px; }
      .vc-ev { color: var(--titolo, var(--accent-text)); font-weight: 600; }
      .vc-scad { color: var(--accent-danger, #c0504d); font-weight: 700; }
      .vc-notte { color: var(--text-secondary); }
      .vc-notte.incontro { color: var(--text-primary); }
      .vc-notte.incontro b { color: var(--accent-danger, #c0504d); }
      .vc-arrivo { grid-template-columns: 92px 1fr; border-style: dashed; }
      .vc-spunta { display: flex; gap: 8px; align-items: center; font-size: 0.85rem; margin-top: 10px; cursor: pointer; }
      @media (max-width: 520px) { .vc-giorno { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(st);
  };

  const _modale = () => {
    if (document.getElementById('modal-' + ID)) return;
    const m = document.createElement('div');
    m.className = 'modal-overlay hidden'; m.id = 'modal-' + ID; m.style.display = 'none';
    m.onclick = (e) => { if (e.target === m) Modal.close(ID); };
    m.innerHTML = '<div class="modal" style="max-width:620px;"><div class="modal-header"><h3 class="modal-title">Il viaggio giorno per giorno</h3>' +
      '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'' + ID + '\')" aria-label="Chiudi"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="modal-body" id="vc-corpo"></div>' +
      '<div class="modal-footer" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;">' +
        '<button class="btn btn-ghost" onclick="ViaggioCalendario.ritira()">Tira di nuovo gli incontri</button>' +
        '<button class="btn btn-secondary" onclick="Modal.close(\'' + ID + '\')">Annulla</button>' +
        '<button class="btn btn-primary" onclick="ViaggioCalendario.conferma()">Partite</button>' +
      '</div></div>';
    document.body.appendChild(m);
  };

  const ICO = {
    luna: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>',
    evento: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    scad: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>',
    arrivo: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4h11l-1 4 6 1-2 7H9"/></svg>',
  };

  // Incontri delle notti: d100 contro la probabilita' del calcolatore
  const _tiraNotti = (v, n) => Array.from({ length: n }, () => {
    if (Math.random() * 100 >= (v.probIncontro || 0)) return null;
    return IncontriCasuali.tira(IncontriCasuali.ambienteDi(v.terreno));
  });

  const _prepara = () => {
    const v = (typeof Generatori !== 'undefined' && Generatori._ultimoViaggio) || null;
    const cal = _cal();
    if (!v || !_attivo(cal)) return null;
    const giorni = Math.max(1, Math.min(365, v.giorni || 1));
    return { v, giorni, partenza: _data(cal), notti: _tiraNotti(v, giorni) };
  };

  const _meteo = (cal, abs) => {
    if (typeof CalendarioCielo === 'undefined') return null;
    try { return CalendarioCielo.impost(cal).meteo ? CalendarioCielo.meteo(cal, abs) : null; } catch (e) { return null; }
  };

  const _eventi = (d) => {
    try { return (typeof CalendarioUI !== 'undefined' && CalendarioUI.eventiDelGiorno) ? CalendarioUI.eventiDelGiorno(d.giorno, d.mese, d.anno) : []; } catch (e) { return []; }
  };

  const _render = () => {
    const el = document.getElementById('vc-corpo');
    const cal = _cal();
    if (!el || !_piano || !_attivo(cal)) return;
    const { v, giorni, notti } = _piano;
    const arrivoCal = Calendario.advance(cal, 'giorni', giorni);
    const arrivo = _data(arrivoCal);
    const righe = [], scadenze = [];
    for (let i = 0; i <= giorni; i++) {
      const c = i === 0 ? cal : Calendario.advance(cal, 'giorni', i);
      const d = _data(c), abs = _abs(cal, d);
      const ultimo = i === giorni;
      const cose = [];
      const fest = (cal.festivita || []).find(f => f.mese === d.mese && f.giorno === d.giorno);
      if (fest) cose.push('<div class="vc-riga vc-ev">' + ICO.evento + '<span>' + esc(fest.nome) + '</span></div>');
      _eventi(d).forEach(ev => {
        const scad = ev.tipo === 'deadline' && !ev.completata;
        if (scad) scadenze.push({ ev, giorno: i });
        cose.push('<div class="vc-riga ' + (scad ? 'vc-scad' : 'vc-ev') + '">' + (scad ? ICO.scad : ICO.evento) + '<span>' + (scad ? 'Scade: ' : '') + esc(ev.titolo) + '</span></div>');
      });
      if (!ultimo) {
        const m = _meteo(cal, abs);
        if (m) cose.unshift('<div class="vc-riga">' + (CalendarioCielo.iconaMeteo ? CalendarioCielo.iconaMeteo(m.tipo, 14) : '') + '<span>' + esc(m.testo) + ' · ' + m.tMin + '° / ' + m.tMax + '°</span></div>');
        const inc = notti[i];
        cose.push('<div class="vc-riga vc-notte' + (inc ? ' incontro' : '') + '">' + ICO.luna + '<span>' +
          (inc ? '<b>Incontro nella notte</b> (' + esc(inc.distanza.toLowerCase()) + '): ' + esc(inc.testo) : 'Notte tranquilla') + '</span></div>');
      }
      const nomeGiorno = Calendario.formatDate(cal, d);
      righe.push('<div class="vc-giorno' + (ultimo ? ' vc-arrivo' : '') + '"><div class="vc-quando">' +
        (ultimo ? 'Arrivo' : 'Giorno ' + (i + 1)) + '<small>' + esc(nomeGiorno) + '</small></div>' +
        '<div class="vc-cosa">' + (ultimo ? '<div class="vc-riga vc-ev">' + ICO.arrivo + '<span>Arrivate a destinazione</span></div>' : '') +
        (cose.join('') || (ultimo ? '' : '<span class="text-muted">Niente da segnalare</span>')) + '</div></div>');
    }
    const avviso = scadenze.length ? '<div class="vc-avviso"><strong>Attenzione:</strong> ' +
      scadenze.map(s => '«' + esc(s.ev.titolo) + '» scade ' + (s.giorno === giorni ? 'il giorno dell’arrivo' : s.giorno === 0 ? 'il giorno della partenza' : 'durante il viaggio (giorno ' + (s.giorno + 1) + ')')).join('; ') + '.</div>' : '';
    el.innerHTML =
      '<div class="vc-testa"><strong>' + giorni + (giorni === 1 ? ' giorno' : ' giorni') + '</strong> ' + esc(TERRENI[v.terreno] || '') + ', ' + esc(MEZZI[v.mezzo] || '') +
        (v.kmTotali ? ' · circa ' + v.kmTotali + ' km' : '') + '<br>Partenza: ' + esc(Calendario.formatDate(cal, _piano.partenza)) + ' · Arrivo: <strong>' + esc(Calendario.formatDate(cal, arrivo)) + '</strong>' +
        (v.probIncontro ? '<br><span class="text-muted" style="font-size:0.8rem;">Incontri: ' + v.probIncontro + '% ogni notte (tabella ' + esc(IncontriCasuali.ETICHETTE[IncontriCasuali.ambienteDi(v.terreno)] || '') + ')</span>' : '') + '</div>' +
      avviso +
      '<div class="vc-giorni">' + righe.join('') + '</div>' +
      '<label class="vc-spunta"><input type="checkbox" id="vc-nota" checked> Scrivi il viaggio e gli incontri nelle note della sessione</label>';
  };

  const apri = () => {
    _piano = _prepara();
    if (!_piano) { Toast.show(_attivo(_cal()) ? 'Calcola prima il viaggio' : 'Attiva il Calendario dalle impostazioni della campagna', 'warning'); return; }
    _css(); _modale(); _render();
    Modal.open(ID);
  };

  const ritira = () => { if (_piano) { _piano.notti = _tiraNotti(_piano.v, _piano.giorni); _render(); } };

  const conferma = () => {
    const cal = _cal();
    if (!_piano || !_attivo(cal)) return;
    const { v, giorni, notti } = _piano;
    const nuovo = Calendario.advance(cal, 'giorni', giorni);
    Calendario.save(nuovo);
    if (document.getElementById('vc-nota')?.checked && typeof NoteSessione !== 'undefined') {
      const inc = notti.map((x, i) => x ? 'notte ' + (i + 1) + ': ' + esc(x.testo) : '').filter(Boolean);
      const testo = '<b>Viaggio</b>: ' + giorni + (giorni === 1 ? ' giorno ' : ' giorni ') + esc(TERRENI[v.terreno] || '') + ', ' + esc(MEZZI[v.mezzo] || '') +
        '. Arrivo: ' + esc(Calendario.formatDate(nuovo, _data(nuovo))) + '.' + (inc.length ? ' Incontri: ' + inc.join('; ') + '.' : ' Nessun incontro.');
      const lista = NoteSessione.getData();
      App.saveActiveCampaign({ noteSessione: [...lista, { tipo: '', testo }] });
    }
    Modal.close(ID);
    try { if (typeof Schermo !== 'undefined' && Schermo._refreshTempo) Schermo._refreshTempo(); } catch (e) {}
    try { if (typeof CalendarioUI !== 'undefined' && document.getElementById('calendario-tab-mese')?.offsetParent) CalendarioUI._renderMese(); } catch (e) {}
    Toast.show('Arrivati: ' + Calendario.getDateStr(nuovo), 'success', 3500);
    _piano = null;
  };

  // Dopo "Calcola" del Calcolatore Viaggio compare il pulsante "Parti"
  const _aggancia = () => {
    if (typeof Generatori === 'undefined' || Generatori._viaggioAgganciato) return;
    Generatori._viaggioAgganciato = true;
    const orig = Generatori.calcViaggio;
    Generatori.calcViaggio = function () {
      const r = orig.apply(this, arguments);
      const el = document.getElementById('gen-viaggio-result');
      const v = Generatori._ultimoViaggio, cal = _cal();
      if (el && v) {
        _css();
        el.insertAdjacentHTML('beforeend', _attivo(cal)
          ? '<div class="vc-parti"><button type="button" class="btn btn-primary btn-sm" onclick="ViaggioCalendario.apri()">Parti: fai passare ' + v.giorni + (v.giorni === 1 ? ' giorno' : ' giorni') + '</button>' +
            '<span class="vc-oggi">Oggi nel mondo: ' + esc(Calendario.formatDate(cal, _data(cal))) + '</span></div>'
          : '<div class="vc-parti"><span class="vc-oggi">Attiva il Calendario (Modifica campagna) per far passare i giorni del viaggio.</span></div>');
      }
      return r;
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _aggancia); else _aggancia();

  return { apri, ritira, conferma };
})();

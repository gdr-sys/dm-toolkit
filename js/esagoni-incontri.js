/* "Cosa succede in questo esagono?" per le mappe a esagoni (js/mappa-esagoni.js).
   - Azione "Cosa succede?": toccando un esagono si tira un incontro per il suo terreno.
   - Spostando il gruppo con "controlla gli incontri": 1 su 6 per ogni esagono attraversato.
   La tabella: se tra le Tabelle casuali ce n'e' una che si chiama come il terreno e parla di
   incontri (es. "Incontri nella foresta") si usa quella, altrimenti quella standard
   (js/incontri-casuali.js). Il risultato si puo' salvare nella nota dell'esagono o nelle
   note della sessione. */
const EsagoniIncontri = (() => {
  const ID = 'esa-incontro';
  const LS = 'pgs-esagoni-incontri';
  const TERRENO_TESTO = { strada: 'strada', pianura: 'pianura', foresta: 'foresta', colline: 'colline', montagna: 'montagna', palude: 'palude', deserto: 'deserto', mare: 'mare' };
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let _cur = null; // { k, nome, terreno, nota, ambiente, risultato }

  const controllaAttivo = (v) => {
    try {
      if (v === undefined) return localStorage.getItem(LS) !== '0';
      localStorage.setItem(LS, v ? '1' : '0');
    } catch (e) {}
    return v !== false;
  };

  // Una tabella dell'utente per questo terreno? (nome con "incontr" e il terreno, es. "Incontri foresta")
  const _tabellaUtente = (terreno) => {
    const lista = (typeof App !== 'undefined' && App.getActiveCampaign()?.tabelleCasuali) || [];
    const t = TERRENO_TESTO[terreno] || terreno || '';
    const amb = IncontriCasuali.ambienteDi(terreno);
    return lista.find(x => /incontr/i.test(x.nome || '') && new RegExp(t, 'i').test(x.nome || ''))
      || lista.find(x => /incontr/i.test(x.nome || '') && new RegExp(amb, 'i').test(x.nome || '')) || null;
  };
  const nomeTabella = (terreno) => {
    const t = _tabellaUtente(terreno);
    return t ? '«' + t.nome + '»' : (IncontriCasuali.ETICHETTE[IncontriCasuali.ambienteDi(terreno)] || 'standard');
  };

  const _tira = () => {
    const tab = _cur.ambiente === '__utente' ? _tabellaUtente(_cur.terreno) : null;
    if (tab && typeof TabelleCasuali !== 'undefined') {
      _cur.risultato = { testo: TabelleCasuali.tiraTesto(tab.id) || 'La tabella è vuota', fonte: tab.nome };
    } else {
      const r = IncontriCasuali.tira(_cur.ambiente === '__utente' ? IncontriCasuali.ambienteDi(_cur.terreno) : _cur.ambiente);
      _cur.risultato = { testo: r.testo, ora: r.ora, distanza: r.distanza, fonte: IncontriCasuali.ETICHETTE[r.ambiente] };
    }
  };

  const _modale = () => {
    if (document.getElementById('modal-' + ID)) return;
    const m = document.createElement('div');
    m.className = 'modal-overlay hidden'; m.id = 'modal-' + ID; m.style.display = 'none';
    m.onclick = (e) => { if (e.target === m) Modal.close(ID); };
    m.innerHTML = '<div class="modal" style="max-width:460px;"><div class="modal-header"><h3 class="modal-title" id="esi-titolo">Cosa succede</h3>' +
      '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'' + ID + '\')" aria-label="Chiudi"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="modal-body" id="esi-corpo"></div>' +
      '<div class="modal-footer" style="display:flex;flex-wrap:wrap;gap:8px;">' +
        '<button class="btn btn-ghost" onclick="EsagoniIncontri.ritira()">Tira di nuovo</button>' +
        '<button class="btn btn-secondary" style="margin-left:auto;" onclick="EsagoniIncontri.salva(\'sessione\')">Nelle note della sessione</button>' +
        '<button class="btn btn-primary" onclick="EsagoniIncontri.salva(\'esagono\')">Nella nota dell’esagono</button>' +
      '</div></div>';
    document.body.appendChild(m);
  };

  const _render = () => {
    const el = document.getElementById('esi-corpo');
    if (!el || !_cur) return;
    const r = _cur.risultato || {};
    const utente = _tabellaUtente(_cur.terreno);
    const opz = (utente ? '<option value="__utente"' + (_cur.ambiente === '__utente' ? ' selected' : '') + '>La tua tabella: ' + esc(utente.nome) + '</option>' : '') +
      IncontriCasuali.AMBIENTI.map(a => '<option value="' + a + '"' + (a === _cur.ambiente ? ' selected' : '') + '>' + esc(IncontriCasuali.ETICHETTE[a]) + '</option>').join('');
    document.getElementById('esi-titolo').textContent = 'Esagono ' + _cur.nome + (_cur.passi ? ' · incontro' : ' · cosa succede');
    el.innerHTML =
      '<div style="padding:12px 14px;border-radius:var(--radius-md);background:var(--bg-secondary);border:1px solid var(--border);margin-bottom:12px;">' +
        '<div style="font-size:1rem;line-height:1.5;color:var(--text-primary);">' + esc(r.testo || '') + '</div>' +
        (r.ora || r.distanza ? '<div class="text-muted" style="font-size:0.8rem;margin-top:6px;">' + esc([r.ora, r.distanza].filter(Boolean).join(' · ')) + '</div>' : '') +
      '</div>' +
      '<div class="form-group" style="margin-bottom:6px;"><label class="form-label" for="esi-tabella">Tabella</label>' +
        '<select id="esi-tabella" class="form-select" onchange="EsagoniIncontri.cambiaTabella(this.value)">' + opz + '</select></div>' +
      (!utente ? '<div class="text-muted" style="font-size:0.78rem;line-height:1.5;">Vuoi usare una tua tabella? Creane una in <strong>Tabelle casuali</strong> con «incontri» e il terreno nel nome, per esempio <em>Incontri nella foresta</em>.</div>' : '') +
      (_cur.nota ? '<div class="text-muted" style="font-size:0.78rem;margin-top:8px;">Nota già presente su questo esagono: ' + esc(Testo.semplice(_cur.nota).slice(0, 120)) + '</div>' : '');
  };

  const apri = ({ k, nome, terreno, nota, passi }) => {
    const utente = _tabellaUtente(terreno);
    _cur = { k, nome, terreno, nota, passi: passi || 0, ambiente: utente ? '__utente' : IncontriCasuali.ambienteDi(terreno) };
    _tira();
    _modale(); _render();
    Modal.open(ID);
  };

  // Spostando il gruppo: un d6 per ogni esagono attraversato, 1 = incontro
  const controlla = (dati) => {
    const n = Math.max(1, dati.passi || 1);
    const tiri = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
    if (tiri.includes(1)) apri(dati);
    else Toast.show('Nessun incontro lungo la strada (' + n + (n === 1 ? ' tiro' : ' tiri') + ')', 'info', 2200);
  };

  const ritira = () => { if (_cur) { _tira(); _render(); } };
  const cambiaTabella = (v) => { if (_cur) { _cur.ambiente = v; _tira(); _render(); } };

  const salva = (dove) => {
    if (!_cur || !_cur.risultato) return;
    const r = _cur.risultato;
    const testo = esc(r.testo) + (r.distanza ? ' (' + esc(r.distanza.toLowerCase()) + ')' : '');
    if (dove === 'esagono') {
      MappaEsagoni.aggiungiNota(_cur.k, testo);
      Toast.show('Scritto nella nota dell’esagono ' + _cur.nome, 'success', 2200);
    } else if (typeof NoteSessione !== 'undefined') {
      App.saveActiveCampaign({ noteSessione: [...NoteSessione.getData(), { tipo: '', testo: '<b>Esagono ' + esc(_cur.nome) + '</b>: ' + testo }] });
      Toast.show('Aggiunto alle note della sessione', 'success', 2200);
    }
    Modal.close(ID);
  };

  return { apri, controlla, ritira, cambiaTabella, salva, nomeTabella, controllaAttivo };
})();

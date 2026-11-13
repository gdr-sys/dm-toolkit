/* DM Toolkit — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   TABELLE-CASUALI.JS — "Le mie tabelle": tabelle casuali create
   dal DM (d4…d100 o pesi liberi), tirate dall'app, importabili da
   CSV e collegabili ai Luoghi (es. "Incontri nella Foresta di X").

   Una tabella e' salvata nella campagna (camp.tabelleCasuali) con
   il testo delle voci cosi' come l'ha scritto il DM ("sorgente"):
   si interpreta al momento del tiro, quindi resta modificabile a
   mano senza perdere la formattazione. Sintassi di una riga:
     "1-3 Goblin"   intervallo esplicito sul dado
     "Goblin"       senza numeri: le voci si dividono il dado
     "3 Goblin"     con "Pesi liberi": peso 3 (esce 3 volte piu' spesso)
   Dentro una voce: {2d6+1} tira dei dadi, [[Nome tabella]] tira su
   un'altra tabella.

   Modulo autonomo: costruisce la sua card nella pagina Generatori e
   il suo modale a runtime. La scheda Luogo della Wiki chiama
   TabelleCasuali.bloccoLuogo(id) per mostrare le tabelle collegate.
   ============================================================ */

const TabelleCasuali = (() => {
  const DADI = [4, 6, 8, 10, 12, 20, 100];
  const MAX_ANNIDAMENTO = 5;
  const _ultimi = {}; // id tabella -> ultimo risultato (solo in memoria)
  // Filtro impostato dalle schede dei Generatori (js/generatori-schede.js): { categoria, cerca }
  let _filtro = null;
  let _editId = null;

  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);
  const _tabelle = () => _camp()?.tabelleCasuali || [];
  const _salva = (lista) => App.saveActiveCampaign({ tabelleCasuali: lista });
  const _dadoLabel = (t) => t.dado === 'pesi' ? 'Pesi' : 'd' + t.dado;

  // ── Interpretazione delle voci ──

  const _RE_INTERVALLO = /^(\d+)\s*[-–—]\s*(\d+)\s*[:.)\]|\-–—]?\s*(.+)$/;
  const _RE_NUMERO = /^(\d+)\s*(?:[:.)\]|]\s*|\s+)(.+)$/;

  // Restituisce { voci: [{testo, da, a}] o [{testo, peso}], avvisi: [...] }
  const interpreta = (sorgente, dado) => {
    const righe = String(sorgente || '').split(/\r?\n/).map(r => r.trim()).filter(r => r && !r.startsWith('#'));
    const avvisi = [];

    if (dado === 'pesi') {
      const voci = righe.map(r => {
        // Un intervallo (es. da un CSV per un dado non standard) vale quanto la sua ampiezza
        const ri = r.match(_RE_INTERVALLO);
        if (ri) return { testo: ri[3].trim(), peso: Math.abs(parseInt(ri[2], 10) - parseInt(ri[1], 10)) + 1 };
        const m = r.match(_RE_NUMERO);
        return m ? { testo: m[2].trim(), peso: Math.max(1, parseInt(m[1], 10)) } : { testo: r, peso: 1 };
      });
      return { voci, avvisi };
    }

    const N = parseInt(dado, 10) || 20;
    const num = (s) => { const v = parseInt(s, 10); return (v === 0 && N === 100) ? 100 : v; }; // "00" sul d100 = 100
    const esplicite = [], implicite = [];
    righe.forEach(r => {
      let m = r.match(_RE_INTERVALLO);
      if (m) { esplicite.push({ testo: m[3].trim(), da: num(m[1]), a: num(m[2]) }); return; }
      m = r.match(_RE_NUMERO);
      if (m) { const v = num(m[1]); esplicite.push({ testo: m[2].trim(), da: v, a: v }); return; }
      implicite.push({ testo: r });
    });

    let voci;
    if (!esplicite.length) {
      // Nessun intervallo scritto: le voci si dividono il dado in parti (quasi) uguali
      const n = implicite.length;
      if (n > N) avvisi.push('Ci sono ' + n + ' voci ma il d' + N + ' ha solo ' + N + ' facce: le ultime ' + (n - N) + ' non usciranno mai.');
      const base = Math.floor(N / Math.max(1, n)), resto = N % Math.max(1, n);
      let cur = 1;
      voci = implicite.slice(0, N).map((v, i) => {
        const largh = Math.max(1, base + (i < resto ? 1 : 0));
        const voce = { testo: v.testo, da: cur, a: cur + largh - 1 };
        cur += largh;
        return voce;
      });
    } else {
      voci = esplicite.map(v => v.da <= v.a ? v : { ...v, da: v.a, a: v.da });
      if (implicite.length) avvisi.push(implicite.length + (implicite.length > 1 ? ' righe senza intervallo vengono ignorate' : ' riga senza intervallo viene ignorata') + ': quando scrivi gli intervalli, mettilo su ogni riga.');
      const coperti = new Array(N + 1).fill(0);
      voci.forEach(v => { for (let i = Math.max(1, v.da); i <= Math.min(N, v.a); i++) coperti[i]++; });
      const fuori = voci.filter(v => v.a > N || v.da < 1);
      if (fuori.length) avvisi.push('Intervalli fuori dal d' + N + ': ' + fuori.map(v => v.da + '-' + v.a).join(', ') + '.');
      const buchi = [], doppi = [];
      for (let i = 1; i <= N; i++) { if (!coperti[i]) buchi.push(i); else if (coperti[i] > 1) doppi.push(i); }
      if (buchi.length) avvisi.push('Nessuna voce per: ' + _compatta(buchi) + ' (con quei numeri il tiro non da\' risultato).');
      if (doppi.length) avvisi.push('Numeri in piu\' voci: ' + _compatta(doppi) + ' (vince la prima).');
    }
    return { voci, avvisi };
  };

  const _compatta = (nums) => {
    const out = [];
    for (let i = 0; i < nums.length; i++) {
      let j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
      out.push(i === j ? String(nums[i]) : nums[i] + '-' + nums[j]);
      i = j;
    }
    return out.join(', ');
  };

  // ── Tiro ──

  const _d = (facce) => 1 + Math.floor(Math.random() * facce);

  const _espandi = (testo, profondita) => String(testo)
    .replace(/\{\s*(\d*)\s*d\s*(\d+)\s*([+-]\s*\d+)?\s*\}/gi, (_, n, f, mod) => {
      let tot = 0;
      for (let i = 0; i < Math.min(100, parseInt(n || '1', 10)); i++) tot += _d(parseInt(f, 10));
      return String(tot + (mod ? parseInt(mod.replace(/\s/g, ''), 10) : 0));
    })
    .replace(/\[\[([^\]]+)\]\]/g, (orig, nome) => {
      if (profondita >= MAX_ANNIDAMENTO) return nome;
      const t = _tabelle().find(x => (x.nome || '').trim().toLowerCase() === nome.trim().toLowerCase());
      if (!t) return nome;
      const r = _tiraTabella(t, profondita + 1);
      return r.testo || nome;
    });

  const _tiraTabella = (t, profondita = 0) => {
    const { voci } = interpreta(t.sorgente, t.dado);
    if (!voci.length) return { numero: null, testo: '', vuota: true };
    let numero, voce;
    if (t.dado === 'pesi') {
      const tot = voci.reduce((s, v) => s + v.peso, 0);
      numero = _d(tot);
      let acc = 0;
      voce = voci.find(v => (acc += v.peso) >= numero);
    } else {
      numero = _d(parseInt(t.dado, 10));
      voce = voci.find(v => numero >= v.da && numero <= v.a);
    }
    return { numero, testo: voce ? _espandi(voce.testo, profondita) : '', vuota: false };
  };

  const tira = (id) => {
    const t = _tabelle().find(x => x.id === id);
    if (!t) return;
    _ultimi[id] = _tiraTabella(t);
    _aggiornaRisultati(id);
  };

  // Tira e restituisce il risultato come testo (per chi lo mostra altrove, es. Entra in scena)
  const tiraTesto = (id) => {
    const t = _tabelle().find(x => x.id === id);
    if (!t) return '';
    _ultimi[id] = _tiraTabella(t);
    _aggiornaRisultati(id);
    const r = _ultimi[id];
    if (r.vuota) return '';
    return (t.dado === 'pesi' ? '' : 'd' + t.dado + ' → ' + r.numero + ': ') + (r.testo || 'nessuna voce per ' + r.numero);
  };

  const _risultatoHTML = (t) => {
    const r = _ultimi[t.id];
    if (!r) return '';
    if (r.vuota) return '<span style="color:var(--text-muted);">La tabella non ha voci.</span>';
    const tiro = t.dado === 'pesi' ? '' :
      '<span style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted);margin-right:8px;">d' + t.dado + ' → ' + r.numero + '</span>';
    return tiro + (r.testo
      ? '<span style="color:var(--text-primary);">' + _esc(r.testo) + '</span>'
      : '<span style="color:var(--warning-text);">Nessuna voce per ' + r.numero + '</span>');
  };

  // Lo stesso risultato puo' essere visibile in piu' punti (Generatori e scheda Luogo)
  const _aggiornaRisultati = (id) => {
    const t = _tabelle().find(x => x.id === id);
    if (!t) return;
    document.querySelectorAll('[data-tc-risultato="' + id + '"]').forEach(el => {
      el.innerHTML = _risultatoHTML(t);
      el.style.display = '';
    });
  };

  // ── Card nella pagina Generatori ──

  const _iconaDado = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>';
  const _iconaMatita = '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

  const _rigaTabella = (t, conLuoghi) => {
    const { voci } = interpreta(t.sorgente, t.dado);
    const luoghi = conLuoghi ? (t.luoghi || []).map(id => (_camp()?.locations || []).find(l => l.id === id)).filter(Boolean) : [];
    return '<div style="padding:10px 0;border-bottom:1px solid var(--border);">' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
        '<div style="flex:1;min-width:160px;">' +
          '<div style="font-family:var(--font-display);font-size:0.92rem;color:var(--text-primary);">' + _esc(t.nome || 'Senza nome') + '</div>' +
          '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">' + _dadoLabel(t) + ' · ' + voci.length + (voci.length === 1 ? ' voce' : ' voci') +
            (t.categoria && !_filtro?.categoria ? ' · ' + _esc(t.categoria) : '') +
            (luoghi.length ? ' · ' + luoghi.map(l => _esc(l.nome || l.name)).join(', ') : '') + '</div>' +
        '</div>' +
        '<button type="button" class="btn btn-ghost btn-icon-sm" title="Modifica tabella" aria-label="Modifica tabella" onclick="TabelleCasuali.apriEditor(\'' + t.id + '\')">' + _iconaMatita + '</button>' +
        '<button type="button" class="btn btn-primary btn-sm" style="display:inline-flex;align-items:center;gap:6px;" onclick="TabelleCasuali.tira(\'' + t.id + '\')">' + _iconaDado + 'Tira</button>' +
      '</div>' +
      '<div data-tc-risultato="' + t.id + '" style="' + (_ultimi[t.id] ? '' : 'display:none;') + 'margin-top:8px;padding:8px 12px;background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:0.92rem;line-height:1.5;">' + _risultatoHTML(t) + '</div>' +
    '</div>';
  };

  const _assicuraCard = () => {
    if (document.getElementById('tc-card')) return;
    const griglia = document.querySelector('#page-generatori .generatori-grid');
    if (!griglia) return;
    const card = document.createElement('div');
    card.id = 'tc-card';
    // gen-card + data-gen-id: si puo' nascondere da Generatori → Personalizza come gli altri
    card.className = 'card gen-card';
    card.dataset.genId = 'tabelle';
    card.style.marginBottom = 'var(--space-md)';
    card.innerHTML =
      '<div class="card-header" style="flex-wrap:wrap;gap:8px;">' +
        '<div>' +
          '<h2 class="card-title">Le mie tabelle</h2>' +
          '<div id="tc-sottotitolo" style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">Tabelle casuali del tuo mondo: le scrivi tu, l\'app le tira.</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
          '<label class="btn btn-ghost btn-sm" style="cursor:pointer;" title="Importa una tabella da un file CSV o di testo">Importa CSV' +
            '<input type="file" accept=".csv,.txt,text/csv,text/plain" style="display:none;" onchange="TabelleCasuali.importaFile(event)">' +
          '</label>' +
          '<button type="button" class="btn btn-primary btn-sm" onclick="TabelleCasuali.apriEditor()">+ Nuova tabella</button>' +
        '</div>' +
      '</div>' +
      '<div id="tc-lista"></div>';
    griglia.parentNode.insertBefore(card, griglia);
    // La card nasce dopo che i Generatori hanno applicato la visibilita': va riapplicata
    try { Generatori.applyVisibility(); } catch (e) {}
  };

  const render = () => {
    _assicuraCard();
    const el = document.getElementById('tc-lista');
    if (!el) return;
    if (!_camp()) { el.innerHTML = '<div class="text-muted text-sm" style="padding:8px 0;">Apri una campagna per creare le tue tabelle.</div>'; return; }
    const lista = filtrate();
    const sotto = document.getElementById('tc-sottotitolo');
    if (sotto) sotto.textContent = _filtro?.categoria ? 'Le tue tabelle in questa categoria.' : "Tabelle casuali del tuo mondo: le scrivi tu, l'app le tira.";
    if (!lista.length && _filtro) { el.innerHTML = ''; return; }
    el.innerHTML = lista.length
      ? lista.map(t => _rigaTabella(t, true)).join('')
      : '<div style="padding:10px 0;font-size:0.88rem;color:var(--text-secondary);line-height:1.6;max-width:760px;">' +
          'Nessuna tabella ancora. Crea per esempio <em>Incontri nella Foresta</em>, <em>Voci di taverna</em> o <em>Cosa c\'è nel forziere</em>: ' +
          'scrivi una voce per riga, scegli il dado e premi <strong>Tira</strong> quando ti serve. Puoi collegare una tabella a un Luogo per ritrovarla nella sua scheda.' +
        '</div>';
  };

  const filtrate = (f = _filtro) => [..._tabelle()]
    .filter(t => !f?.categoria || t.categoria === f.categoria)
    .filter(t => !f?.cerca || (t.nome || '').toLowerCase().includes(f.cerca))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'it'));
  const filtra = (f) => { _filtro = f || null; render(); };

  // ── Blocco nella scheda Luogo (Wiki) ──

  const bloccoLuogo = (locId) => {
    const collegate = _tabelle().filter(t => (t.luoghi || []).includes(locId));
    if (!collegate.length) return '';
    return '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:16px;">' +
      '<div style="font-family:var(--font-display);font-size:0.85rem;color:var(--text-secondary);margin-bottom:2px;">Tabelle casuali</div>' +
      collegate.map(t => _rigaTabella(t, false)).join('') +
    '</div>';
  };

  // ── Editor ──

  const _assicuraModale = () => {
    if (document.getElementById('modal-tabella-casuale')) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay hidden';
    overlay.id = 'modal-tabella-casuale';
    overlay.style.display = 'none';
    overlay.innerHTML =
      '<div class="modal" style="max-width:640px;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title" id="tc-titolo">Nuova tabella</h3>' +
          '<button type="button" class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'tabella-casuale\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">' +
            '<div class="form-group" style="flex:1;min-width:200px;margin:0;"><label class="form-label" for="tc-nome">Nome</label>' +
              '<input id="tc-nome" type="text" class="form-input" autocomplete="off" placeholder="es. Incontri nella Foresta di Velmor"></div>' +
            '<div class="form-group" style="width:150px;margin:0;"><label class="form-label" for="tc-dado">Dado</label>' +
              '<select id="tc-dado" class="form-select" onchange="TabelleCasuali._anteprima()">' +
                DADI.map(n => '<option value="' + n + '">d' + n + '</option>').join('') +
                '<option value="pesi">Pesi liberi</option>' +
              '</select></div>' +
          '</div>' +
          '<div class="form-group" style="margin-bottom:12px;"><label class="form-label" for="tc-categoria">Categoria nei Generatori</label>' +
            '<select id="tc-categoria" class="form-select"></select>' +
            '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">La tabella compare anche in quella scheda dei Generatori, oltre che in Le mie tabelle.</div></div>' +
          '<div class="form-group" style="margin-bottom:6px;"><label class="form-label" for="tc-sorgente">Voci — una per riga</label>' +
            '<textarea id="tc-sorgente" class="form-textarea" rows="9" spellcheck="false" style="font-family:var(--font-mono);font-size:0.82rem;line-height:1.6;" oninput="TabelleCasuali._anteprima()" placeholder="1-8 Un branco di lupi\n9-14 {1d4} banditi con un carro rubato\n15-19 Un druido che chiede aiuto\n20 Tira di nuovo: [[Eventi strani]]"></textarea></div>' +
          '<div style="font-size:0.78rem;color:var(--text-muted);line-height:1.55;margin-bottom:12px;">' +
            'Scrivi l\'intervallo davanti (<code>1-3 Goblin</code>) oppure solo il testo: le voci si dividono il dado in parti uguali. ' +
            'Con <strong>Pesi liberi</strong> il numero davanti è il peso (<code>3 Goblin</code> esce 3 volte più spesso). ' +
            'Dentro una voce, <code>{2d6}</code> tira dei dadi e <code>[[Nome tabella]]</code> tira su un\'altra tua tabella.' +
          '</div>' +
          '<div id="tc-anteprima" style="margin-bottom:12px;"></div>' +
          '<div class="form-group" style="margin:0;"><label class="form-label">Collega a uno o più Luoghi</label>' +
            '<div id="tc-luoghi" style="display:flex;flex-wrap:wrap;gap:6px 14px;max-height:120px;overflow-y:auto;font-size:0.85rem;"></div></div>' +
        '</div>' +
        '<div class="modal-footer" style="justify-content:space-between;">' +
          '<button type="button" class="btn btn-ghost" id="tc-elimina" style="color:var(--danger-text);" onclick="TabelleCasuali._elimina()">Elimina</button>' +
          '<div style="display:flex;gap:8px;margin-left:auto;">' +
            '<button type="button" class="btn btn-ghost" onclick="Modal.close(\'tabella-casuale\')">Annulla</button>' +
            '<button type="button" class="btn btn-primary" onclick="TabelleCasuali._salvaEditor()">Salva</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  };

  const _anteprima = () => {
    const el = document.getElementById('tc-anteprima');
    if (!el) return;
    const dado = document.getElementById('tc-dado').value;
    const { voci, avvisi } = interpreta(document.getElementById('tc-sorgente').value, dado);
    if (!voci.length) { el.innerHTML = ''; return; }
    const nomi = new Set(_tabelle().map(t => (t.nome || '').trim().toLowerCase()));
    const mancanti = [...new Set(voci.flatMap(v => [...v.testo.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1].trim())))]
      .filter(n => !nomi.has(n.toLowerCase()));
    if (mancanti.length) avvisi.push('Non hai ancora una tabella chiamata ' + mancanti.map(n => '"' + n + '"').join(', ') + ': finché non la crei, al suo posto comparirà solo il nome.');
    const totPesi = dado === 'pesi' ? voci.reduce((s, v) => s + v.peso, 0) : 0;
    const etichetta = (v) => dado === 'pesi'
      ? Math.round(v.peso / totPesi * 100) + '%'
      : (v.da === v.a ? String(v.da) : v.da + '–' + v.a);
    el.innerHTML =
      '<div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:4px;">Anteprima</div>' +
      '<div style="border:1px solid var(--border);border-radius:var(--radius-sm);max-height:170px;overflow-y:auto;">' +
        voci.map(v => '<div style="display:flex;gap:10px;padding:4px 10px;border-bottom:1px solid var(--border);font-size:0.83rem;">' +
          '<span style="font-family:var(--font-mono);color:var(--text-muted);min-width:52px;">' + etichetta(v) + '</span>' +
          '<span style="color:var(--text-primary);">' + _esc(v.testo) + '</span></div>').join('') +
      '</div>' +
      avvisi.map(a => '<div style="font-size:0.78rem;color:var(--warning-text);margin-top:6px;line-height:1.45;">' + _esc(a) + '</div>').join('');
  };

  const apriEditor = (id, bozza) => {
    if (!_camp()) { Toast.show('Apri prima una campagna', 'warning'); return; }
    _assicuraModale();
    const t = id ? _tabelle().find(x => x.id === id) : null;
    // Creata da una scheda dei Generatori: parte gia' con quella categoria
    const dati = t || bozza || { nome: '', dado: '20', sorgente: '', luoghi: [], categoria: _filtro?.categoria || '' };
    _editId = t ? t.id : null;
    document.getElementById('tc-titolo').textContent = t ? 'Modifica tabella' : 'Nuova tabella';
    document.getElementById('tc-nome').value = dati.nome || '';
    document.getElementById('tc-dado').value = String(dati.dado || '20');
    document.getElementById('tc-sorgente').value = dati.sorgente || '';
    const categorie = (typeof GeneratoriSchede !== 'undefined' && GeneratoriSchede.categorie) ? GeneratoriSchede.categorie() : [];
    if (dati.categoria && !categorie.includes(dati.categoria)) categorie.push(dati.categoria);
    document.getElementById('tc-categoria').innerHTML = '<option value="">Solo in Le mie tabelle</option>' +
      categorie.map(c => '<option value="' + _esc(c) + '"' + (c === dati.categoria ? ' selected' : '') + '>' + _esc(c) + '</option>').join('');
    document.getElementById('tc-elimina').style.visibility = t ? 'visible' : 'hidden';
    const luoghi = [...(_camp()?.locations || [])].sort((a, b) => (a.nome || a.name || '').localeCompare(b.nome || b.name || '', 'it'));
    document.getElementById('tc-luoghi').innerHTML = luoghi.length
      ? luoghi.map(l => '<label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">' +
          '<input type="checkbox" value="' + _esc(l.id) + '"' + ((dati.luoghi || []).includes(l.id) ? ' checked' : '') + '>' +
          _esc(l.nome || l.name || 'Senza nome') + '</label>').join('')
      : '<span style="color:var(--text-muted);">Nessun luogo nella campagna.</span>';
    _anteprima();
    Modal.open('tabella-casuale');
    setTimeout(() => document.getElementById('tc-nome')?.focus(), 50);
  };

  const _salvaEditor = () => {
    const nome = document.getElementById('tc-nome').value.trim();
    const sorgente = document.getElementById('tc-sorgente').value;
    if (!nome) { Toast.show('Dai un nome alla tabella', 'warning'); document.getElementById('tc-nome').focus(); return; }
    if (!interpreta(sorgente, document.getElementById('tc-dado').value).voci.length) { Toast.show('Scrivi almeno una voce', 'warning'); return; }
    const doppione = _tabelle().find(x => x.id !== _editId && (x.nome || '').trim().toLowerCase() === nome.toLowerCase());
    if (doppione) { Toast.show('Hai già una tabella con questo nome', 'warning'); return; }
    const dati = {
      nome, sorgente,
      dado: document.getElementById('tc-dado').value,
      categoria: document.getElementById('tc-categoria').value || '',
      luoghi: [...document.querySelectorAll('#tc-luoghi input:checked')].map(c => c.value),
      aggiornatoAt: Date.now(),
    };
    const lista = [..._tabelle()];
    if (_editId) {
      const i = lista.findIndex(x => x.id === _editId);
      if (i >= 0) lista[i] = { ...lista[i], ...dati };
    } else {
      lista.push({ id: 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), creatoAt: Date.now(), ...dati });
    }
    _salva(lista);
    Modal.close('tabella-casuale');
    Toast.show('Tabella salvata', 'success', 1500);
    _ridisegnaTutto();
  };

  const _elimina = () => {
    if (!_editId) return;
    const t = _tabelle().find(x => x.id === _editId);
    openConfirmModal('Eliminare la tabella?', 'La tabella "' + (t?.nome || '') + '" verrà eliminata.', () => {
      _salva(_tabelle().filter(x => x.id !== _editId));
      delete _ultimi[_editId];
      _editId = null;
      Modal.close('tabella-casuale');
      _ridisegnaTutto();
    });
  };

  // Dopo un salvataggio: lista nei Generatori e, se aperta, la scheda Luogo
  const _ridisegnaTutto = () => {
    render();
    if (typeof GeneratoriSchede !== 'undefined') GeneratoriSchede.applica();
    const dettaglio = document.getElementById('wiki-luoghi-detail');
    if (dettaglio && dettaglio.style.display !== 'none' && typeof WikiSections !== 'undefined') {
      const id = WikiSections._currentItem?.id;
      if (id) try { WikiSections.openCard('luoghi', id); } catch (e) {}
    }
  };

  // ── Import CSV / testo ──

  const _separatore = (testo) => {
    const prima = testo.split(/\r?\n/).find(r => r.trim()) || '';
    return (prima.match(/;/g) || []).length > (prima.match(/,/g) || []).length ? ';' : (prima.includes('\t') ? '\t' : ',');
  };

  const _celle = (riga, sep) => {
    const out = []; let cur = '', virgolette = false;
    for (let i = 0; i < riga.length; i++) {
      const c = riga[i];
      if (c === '"') { if (virgolette && riga[i + 1] === '"') { cur += '"'; i++; } else virgolette = !virgolette; }
      else if (c === sep && !virgolette) { out.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    out.push(cur.trim());
    return out.filter(c => c !== '');
  };

  // Accetta: "risultato" / "1-3,risultato" / "peso,risultato", con o senza riga d'intestazione.
  // Restituisce una bozza di tabella da rivedere nell'editor prima di salvarla.
  const daCSV = (testo, nomeFile) => {
    const righe = String(testo || '').replace(/^﻿/, '').split(/\r?\n/).filter(r => r.trim() && !/^sep=/i.test(r));
    const sep = _separatore(righe.join('\n'));
    const celleRighe = righe.map(r => _celle(r, sep)).filter(c => c.length);
    if (celleRighe.length && !/^\d/.test(celleRighe[0][0]) && celleRighe[0].length > 1 &&
        /^(tiro|d\d+|n|#|numero|range|intervallo|da|peso|risultato|voce)$/i.test(celleRighe[0][0])) celleRighe.shift();
    const conNumeri = celleRighe.filter(c => c.length > 1 && /^\d+(\s*[-–—]\s*\d+)?$/.test(c[0]));
    const righeSorgente = celleRighe.map(c => (c.length > 1 && /^\d+(\s*[-–—]\s*\d+)?$/.test(c[0]))
      ? c[0].replace(/\s/g, '') + ' ' + c.slice(1).join(' — ')
      : c.join(' — '));
    // Dado: dal numero piu' alto negli intervalli, se corrisponde a un dado vero
    let dado = '20';
    const max = Math.max(0, ...conNumeri.map(c => parseInt(c[0].split(/[-–—]/).pop(), 10) || 100)); // "00" = 100
    const haIntervalli = conNumeri.some(c => /[-–—]/.test(c[0]));
    if (conNumeri.length && haIntervalli) dado = DADI.includes(max) ? String(max) : (max === 0 ? '100' : 'pesi');
    else if (conNumeri.length) dado = conNumeri.length === celleRighe.length && DADI.includes(max) && max === conNumeri.length ? String(max) : 'pesi';
    else dado = DADI.includes(celleRighe.length) ? String(celleRighe.length) : (celleRighe.length > 20 ? '100' : '20');
    return { nome: String(nomeFile || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim(), dado, sorgente: righeSorgente.join('\n'), luoghi: [] };
  };

  const importaFile = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const lettore = new FileReader();
    lettore.onload = () => {
      const bozza = daCSV(lettore.result, file.name);
      if (!bozza.sorgente.trim()) { Toast.show('Il file non contiene voci leggibili', 'warning'); return; }
      apriEditor(null, bozza);
      Toast.show('Controlla l\'anteprima e premi Salva', 'info', 3000);
    };
    lettore.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // Si ridisegna ogni volta che si apre la pagina Generatori (stesso aggancio di fili-sospesi.js)
  const _aggancia = () => {
    if (typeof App === 'undefined' || App._tabelleCasualiHooked) return;
    const orig = App.navigateTo;
    App.navigateTo = function (pageId) {
      orig.apply(App, arguments);
      if (pageId === 'generatori') setTimeout(render, 50);
    };
    App._tabelleCasualiHooked = true;
  };

  // Registrata subito (lo script e' in fondo al body): cosi' e' nell'elenco di Personalizza gia'
  // quando i Generatori applicano la visibilita' all'avvio.
  if (typeof Generatori !== 'undefined' && Generatori._GEN_DEFS && !Generatori._GEN_DEFS.tabelle) {
    Generatori._GEN_DEFS = { tabelle: { label: 'Le mie tabelle', emoji: '' }, ...Generatori._GEN_DEFS };
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { _aggancia(); render(); }, 200));

  return { render, filtra, filtrate, tira, tiraTesto, apriEditor, importaFile, bloccoLuogo, interpreta, daCSV, _anteprima, _salvaEditor, _elimina };
})();

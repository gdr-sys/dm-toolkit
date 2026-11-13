/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   VISTA-GIOCATORI.JS — Pagina di sola lettura per i giocatori,
   aperta da un link, con SOLO cio' che il DM sceglie di mostrare:
   riassunti delle sessioni, "Previously On…", ordine di iniziativa
   dello scontro in corso (in diretta), luoghi, PNG, documenti della
   Wiki e mappe.

   Sicurezza: non si condivide mai la campagna. Si pubblica una COPIA
   separata e ridotta (solo testo e link a immagini) sotto un codice
   lungo e non indovinabile, nel percorso Firebase campagne/pub_xxx —
   leggibile con l'accesso anonimo che la pagina fa da sola, senza
   cambiare le regole del database. Dalla copia sono sempre esclusi:
   riquadri "Segreto DM" delle note, campi segreti, motivazioni e
   personalita' dei PNG, PF dei mostri, immagini base64 (pesanti e
   solo locali).

   DM: card "Vista giocatori" in Dashboard e finestra di scelta.
   Giocatori: indirizzo dell'app con ?giocatori=<codice>.
   ============================================================ */

const VistaGiocatori = (() => {
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _nome = (x) => (x?.nome || x?.name || x?.titolo || '').trim();
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);
  const _impost = () => ({ attiva: false, riassunti: true, previously: true, iniziativa: true, luoghi: [], png: [], lore: [], mappe: [], ...(_camp()?.vistaGiocatori || {}) });
  const _salvaImpost = (patch) => App.saveActiveCampaign({ vistaGiocatori: { ..._impost(), ...patch } });
  const _link = (id) => location.origin + location.pathname + '?giocatori=' + id;
  const _immagine = (u) => (typeof u === 'string' && /^https?:\/\//.test(u)) ? (typeof DriveBackup !== 'undefined' ? DriveBackup.toEmbeddableUrl(u) : u) : '';
  const PARAM = new URLSearchParams(location.search).get('giocatori');

  // ── Copia pubblica ──

  const _testoSicuro = (html) => {
    const d = document.createElement('div');
    d.innerHTML = String(html || '');
    d.querySelectorAll('.wiki-callout-secret, script, style, iframe').forEach(n => n.remove());
    d.querySelectorAll('img').forEach(img => { if (!/^https?:\/\//.test(img.getAttribute('src') || '')) img.remove(); });
    d.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name)) n.removeAttribute(a.name); }));
    return d.innerHTML.replace(/\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, '$1');
  };

  const _istantanea = () => {
    const c = _camp(), s = _impost();
    const snap = { vista: true, ownerId: (typeof firebase !== 'undefined' && firebase.auth().currentUser || {}).uid || null, nome: c.name, aggiornatoAt: Date.now() }; // vista: le regole la rendono leggibile ai giocatori
    if (s.previously) {
      const po = [...(c.previouslyOnArchive || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
      if (po) snap.previously = String(po.testo || '').slice(0, 4000);
    }
    if (s.riassunti) {
      snap.sessioni = (c.sessioni_log || []).filter(x => x.stato === 'giocata' && x.recap)
        .sort((a, b) => (b.numero || 0) - (a.numero || 0)).slice(0, 10)
        .map(x => ({ numero: x.numero, titolo: x.titolo || '', data: x.data || '', recap: String(x.recap).slice(0, 3000) }));
    }
    if (s.iniziativa && c.activeCombat?.combatants?.length) {
      const ord = [...c.activeCombat.combatants].sort((a, b) => (b.iniziativa ?? 0) - (a.iniziativa ?? 0) || (a.tipo === 'pg' ? -1 : 1));
      snap.iniziativa = { round: c.activeCombat.round || 1, turno: c.activeCombat.turno || 0, ordine: ord.map(x => ({ nome: x.nome || x.name || '?', pg: x.tipo === 'pg', ko: (x.hp ?? 1) <= 0 })) };
    }
    const luoghi = (c.locations || []).filter(l => s.luoghi.includes(l.id));
    snap.luoghi = luoghi.map(l => ({ nome: _nome(l), tipo: l.tipo || '', descrizione: String(l.atmosfera || l.description || '').slice(0, 2000), immagine: _immagine(l.immagine) }));
    snap.png = (c.npcs || []).filter(n => s.png.includes(n.id)).map(n => ({ nome: _nome(n), ruolo: n.ruolo || n.job || '', razza: n.razza || n.race || '', aspetto: String(n.apparenza || '').slice(0, 1500), immagine: _immagine(n.immagine) }));
    snap.documenti = (c.wiki?.lore || []).filter(n => s.lore.includes(n.id)).map(n => ({ titolo: n.titolo || '', html: _testoSicuro(n.contenuto).slice(0, 20000) }));
    const nomiLuoghi = new Set(luoghi.map(l => l.id));
    snap.mappe = (c.mappe || []).filter(m => s.mappe.includes(m.id) && _immagine(m.immagine)).map(m => ({
      nome: m.nome || 'Mappa', immagine: _immagine(m.immagine),
      pins: (m.pins || []).filter(p => p.entitaId && nomiLuoghi.has(p.entitaId)).map(p => ({ x: p.x, y: p.y, nome: _nome(luoghi.find(l => l.id === p.entitaId)) })),
    }));
    return snap;
  };

  let _timer = null;
  const pubblica = async (silenzioso) => {
    const c = _camp(), s = _impost();
    if (!c || !s.attiva || !s.id) return;
    const user = typeof firebase !== 'undefined' && firebase.apps?.length ? firebase.auth().currentUser : null;
    if (!user) { if (!silenzioso) Toast.show('Per condividere con i giocatori serve l\'accesso (Accedi in alto a destra)', 'warning', 4000); return; }
    try {
      if (typeof FirebaseSync !== 'undefined' && FirebaseSync.assicuraMembro) await FirebaseSync.assicuraMembro(s.id, true);
      await firebase.database().ref('campagne/' + s.id + '/data').set(_istantanea());
      if (!silenzioso) Toast.show('Vista giocatori aggiornata', 'success', 1800);
    } catch (e) {
      if (!silenzioso) Toast.show('Pubblicazione non riuscita: ' + e.message, 'error', 4000);
    }
  };
  const _pianifica = () => { clearTimeout(_timer); _timer = setTimeout(() => pubblica(true), 4000); };

  // ── Lato DM: card e finestra ──

  const renderDashboard = () => {
    const griglia = document.querySelector('#page-campagna .dash-grid');
    if (!griglia || !_camp()) return;
    let card = document.getElementById('dash-vista-giocatori');
    if (!card) { card = document.createElement('div'); card.id = 'dash-vista-giocatori'; card.className = 'card'; griglia.appendChild(card); }
    const s = _impost();
    // Pulsante sempre visibile nell'intestazione della Dashboard: la card sta in fondo alla
    // griglia e non si trova al volo quando al tavolo serve mandare il link
    const testata = document.getElementById('gdrive-btn')?.parentElement;
    if (testata) {
      let btn = document.getElementById('vg-condividi-btn');
      if (!btn) { btn = document.createElement('button'); btn.type = 'button'; btn.id = 'vg-condividi-btn'; btn.className = 'btn btn-secondary btn-sm'; testata.prepend(btn); }
      btn.onclick = () => (_impost().attiva && _impost().id ? copiaLink() : apri());
      btn.title = s.attiva ? 'Copia il link della vista giocatori' : 'Scegli cosa mostrare ai giocatori e crea il link';
      btn.innerHTML = '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> ' +
        (s.attiva ? 'Copia link giocatori' : 'Condividi con i giocatori');
    }
    card.innerHTML = '<div class="card-header"><h2 class="card-title">Vista giocatori</h2><button type="button" class="btn btn-ghost btn-sm" onclick="VistaGiocatori.apri()">' + (s.attiva ? 'Gestisci' : 'Attiva') + '</button></div>' +
      (s.attiva
        ? '<div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;">I giocatori vedono ' + [s.riassunti && 'i riassunti', s.iniziativa && 'l\'iniziativa', s.luoghi.length && s.luoghi.length + ' luoghi', s.png.length && s.png.length + ' PNG', s.lore.length && s.lore.length + ' documenti', s.mappe.length && s.mappe.length + ' mappe'].filter(Boolean).join(', ') + '.</div>' +
          '<button type="button" class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="VistaGiocatori.copiaLink()">Copia il link per i giocatori</button>'
        : '<div style="font-size:0.82rem;color:var(--text-muted);line-height:1.5;">Un link da mandare ai giocatori con solo ciò che decidi tu: riassunti, iniziativa, luoghi, PNG, documenti, mappe.</div>');
  };

  const _assicuraModale = () => {
    if (document.getElementById('modal-vista-giocatori')) return;
    const o = document.createElement('div');
    o.className = 'modal-overlay hidden';
    o.id = 'modal-vista-giocatori';
    o.style.display = 'none';
    o.innerHTML = '<div class="modal" style="max-width:720px;"><div class="modal-header"><h3 class="modal-title">Vista giocatori</h3>' +
      '<button type="button" class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'vista-giocatori\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="modal-body" id="vg-body"></div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-ghost" onclick="VistaGiocatori.anteprima()">Anteprima</button>' +
      '<button type="button" class="btn btn-primary" style="margin-left:auto;" onclick="VistaGiocatori._fatto()">Salva e pubblica</button></div></div>';
    document.body.appendChild(o);
  };

  const _lista = (titolo, chiave, voci) => voci.length
    ? '<div style="margin-top:14px;"><div style="font-family:var(--font-display);font-size:0.88rem;">' + titolo + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:4px 12px;margin-top:4px;">' +
      voci.map(v => '<label style="display:flex;align-items:center;gap:6px;font-size:0.84rem;cursor:pointer;"><input type="checkbox" data-vg="' + chiave + '" value="' + _esc(v.id) + '"' + (_impost()[chiave].includes(v.id) ? ' checked' : '') + '>' + _esc(_nome(v) || 'Senza nome') + '</label>').join('') +
      '</div></div>' : '';

  const _disegna = () => {
    const el = document.getElementById('vg-body');
    if (!el) return;
    const c = _camp(), s = _impost();
    const opz = (k, testo) => '<label style="display:flex;align-items:center;gap:8px;font-size:0.86rem;cursor:pointer;"><input type="checkbox" data-vg-opz="' + k + '"' + (s[k] ? ' checked' : '') + '>' + testo + '</label>';
    el.innerHTML =
      '<label style="display:flex;align-items:center;gap:8px;font-size:0.92rem;font-weight:600;cursor:pointer;"><input type="checkbox" id="vg-attiva"' + (s.attiva ? ' checked' : '') + '> Condividi con i giocatori</label>' +
      '<div style="font-size:0.8rem;color:var(--text-muted);line-height:1.5;margin:4px 0 10px;">I giocatori aprono un link e vedono solo quello che scegli qui, aggiornato da solo. Non vedono mai la campagna: segreti, motivazioni dei PNG e punti ferita dei mostri restano esclusi in ogni caso.</div>' +
      (s.id && s.attiva ? '<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;"><input type="text" class="form-input" readonly value="' + _esc(_link(s.id)) + '" style="font-size:0.8rem;" onclick="this.select()"><button type="button" class="btn btn-secondary btn-sm" onclick="VistaGiocatori.copiaLink()">Copia</button></div>' : '') +
      '<div style="display:flex;flex-direction:column;gap:6px;">' + opz('previously', 'Il "Previously On…" più recente') + opz('riassunti', 'I riassunti delle sessioni giocate') + opz('iniziativa', 'L\'ordine di iniziativa durante gli scontri (in diretta)') + '</div>' +
      _lista('Luoghi', 'luoghi', (c.locations || []).filter(_nome)) +
      _lista('PNG — nome, ruolo, aspetto e ritratto', 'png', (c.npcs || []).filter(_nome)) +
      _lista('Documenti della Wiki (handout) — i riquadri "Segreto DM" vengono tolti', 'lore', (c.wiki?.lore || []).filter(n => n.titolo)) +
      _lista('Mappe — con i segnaposto dei soli luoghi scelti', 'mappe', (c.mappe || []).filter(m => _immagine(m.immagine)));
  };

  const _leggiForm = () => {
    const patch = { attiva: document.getElementById('vg-attiva').checked };
    document.querySelectorAll('#vg-body [data-vg-opz]').forEach(b => { patch[b.dataset.vgOpz] = b.checked; });
    ['luoghi', 'png', 'lore', 'mappe'].forEach(k => { patch[k] = [...document.querySelectorAll('#vg-body input[data-vg="' + k + '"]:checked')].map(b => b.value); });
    if (patch.attiva && !_impost().id) {
      const caratteri = 'abcdefghijkmnpqrstuvwxyz23456789';
      const r = crypto.getRandomValues(new Uint8Array(22));
      patch.id = 'pub_' + [...r].map(x => caratteri[x % caratteri.length]).join('');
    }
    return patch;
  };

  const apri = () => { if (!_camp()) return; _assicuraModale(); _disegna(); Modal.open('vista-giocatori'); };
  const _fatto = async () => {
    const patch = _leggiForm();
    _salvaImpost(patch);
    if (patch.attiva) await pubblica(false);
    else if (_impost().id && typeof firebase !== 'undefined' && firebase.auth().currentUser) {
      try { await firebase.database().ref('campagne/' + _impost().id + '/data').set({ vista: true, chiusa: true, aggiornatoAt: Date.now() }); } catch (e) {}
    }
    _disegna();
    renderDashboard();
  };
  const copiaLink = async () => {
    const s = _impost();
    if (!s.id) return;
    try { await navigator.clipboard.writeText(_link(s.id)); Toast.show('Link copiato: mandalo ai giocatori', 'success', 2500); }
    catch (e) { Toast.show(_link(s.id), 'info', 8000); }
  };
  const anteprima = () => {
    _salvaImpost(_leggiForm());
    const fin = window.open('', '_blank');
    if (!fin) { Toast.show('Il browser ha bloccato la finestra di anteprima', 'warning'); return; }
    fin.document.write('<!doctype html><meta charset="utf-8"><title>Anteprima vista giocatori</title>' + [...document.querySelectorAll('link[rel=stylesheet]')].map(l => '<link rel="stylesheet" href="' + l.href + '">').join('') +
      '<body style="background:var(--bg-primary);color:var(--text-primary);">' + _paginaHTML(_istantanea()) + '</body>');
    fin.document.close();
  };

  // ── Lato giocatori ──

  const _sezione = (titolo, html) => html ? '<section style="margin-top:22px;"><h2 style="font-family:var(--font-display);font-size:1.05rem;border-bottom:1px solid var(--border);padding-bottom:6px;margin:0 0 10px;">' + titolo + '</h2>' + html + '</section>' : '';

  const _paginaHTML = (d) => {
    if (!d || d.chiusa) return '<div style="max-width:640px;margin:15vh auto;text-align:center;padding:20px;color:var(--text-secondary);font-family:var(--font-body);">Il master non sta condividendo nulla in questo momento.</div>';
    const ini = (d.iniziativa && (d.iniziativa.ordine || []).length) ? '<div style="display:flex;flex-direction:column;gap:6px;">' +
      '<div style="font-size:0.8rem;color:var(--text-muted);">Round ' + d.iniziativa.round + '</div>' +
      (d.iniziativa.ordine || []).map((x, i) => '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:var(--radius-sm);border:1px solid ' + (i === d.iniziativa.turno ? 'var(--accent-secondary)' : 'var(--border)') + ';background:' + (i === d.iniziativa.turno ? 'var(--bg-secondary)' : 'transparent') + ';' + (x.ko ? 'opacity:0.45;text-decoration:line-through;' : '') + '">' +
        '<span style="width:22px;color:var(--text-muted);font-family:var(--font-mono);">' + (i + 1) + '</span><span style="flex:1;' + (x.pg ? 'font-weight:600;' : '') + '">' + _esc(x.nome) + '</span>' + (i === d.iniziativa.turno ? '<span style="font-size:0.75rem;color:var(--accent-secondary-text);">Di turno</span>' : '') + '</div>').join('') + '</div>' : '';
    const card = (img, titolo, sotto, testo) => '<div style="display:flex;gap:12px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-card);">' +
      (img ? '<img src="' + _esc(img) + '" alt="" style="width:84px;height:84px;object-fit:cover;border-radius:var(--radius-sm);flex-shrink:0;" onerror="this.remove()">' : '') +
      '<div style="min-width:0;"><div style="font-family:var(--font-display);font-size:0.98rem;">' + _esc(titolo) + '</div>' + (sotto ? '<div style="font-size:0.78rem;color:var(--text-muted);">' + _esc(sotto) + '</div>' : '') +
      (testo ? '<div style="font-size:0.88rem;line-height:1.55;margin-top:4px;white-space:pre-line;">' + _esc(testo) + '</div>' : '') + '</div></div>';
    const griglia = (h) => '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">' + h + '</div>';
    return '<div style="max-width:960px;margin:0 auto;padding:20px 16px 60px;font-family:var(--font-body);">' +
      '<div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);">Per i giocatori</div>' +
      '<h1 style="font-family:var(--font-display);font-size:1.6rem;margin:2px 0 0;">' + _esc(d.nome) + '</h1>' +
      _sezione('Iniziativa', ini) +
      _sezione('Nella sessione precedente', d.previously ? '<div style="white-space:pre-line;line-height:1.65;font-size:0.95rem;">' + _esc(d.previously) + '</div>' : '') +
      _sezione('Diario delle sessioni', (d.sessioni || []).map(x => '<details style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;margin-bottom:6px;background:var(--bg-card);"><summary style="cursor:pointer;font-family:var(--font-display);">Sessione ' + x.numero + (x.titolo ? ' — ' + _esc(x.titolo) : '') + '</summary><div style="white-space:pre-line;line-height:1.6;margin-top:6px;font-size:0.9rem;">' + _esc(x.recap) + '</div></details>').join('')) +
      _sezione('Luoghi', (d.luoghi || []).length ? griglia(d.luoghi.map(l => card(l.immagine, l.nome, l.tipo, l.descrizione)).join('')) : '') +
      _sezione('Personaggi', (d.png || []).length ? griglia(d.png.map(n => card(n.immagine, n.nome, [n.razza, n.ruolo].filter(Boolean).join(' · '), n.aspetto)).join('')) : '') +
      _sezione('Documenti', (d.documenti || []).map(x => '<details style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;margin-bottom:6px;background:var(--bg-card);"><summary style="cursor:pointer;font-family:var(--font-display);">' + _esc(x.titolo) + '</summary><div style="line-height:1.6;margin-top:6px;font-size:0.92rem;">' + x.html + '</div></details>').join('')) +
      _sezione('Mappe', (d.mappe || []).map(m => '<figure style="margin:0 0 14px;"><div style="position:relative;display:inline-block;max-width:100%;"><img src="' + _esc(m.immagine) + '" alt="' + _esc(m.nome) + '" style="max-width:100%;border-radius:var(--radius-sm);display:block;">' +
        (m.pins || []).map(p => '<span title="' + _esc(p.nome) + '" style="position:absolute;left:' + (p.x * 100) + '%;top:' + (p.y * 100) + '%;transform:translate(-50%,-50%);background:var(--accent-primary);color:#fff;font-size:0.7rem;padding:2px 6px;border-radius:999px;white-space:nowrap;">' + _esc(p.nome) + '</span>').join('') +
        '</div><figcaption style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">' + _esc(m.nome) + '</figcaption></figure>').join('')) +
      '<div style="margin-top:30px;font-size:0.72rem;color:var(--text-muted);">Aggiornato ' + new Date(d.aggiornatoAt || Date.now()).toLocaleString('it-IT') + ' · Pocket GM Screen</div>' +
    '</div>';
  };

  const _avviaVistaGiocatori = () => {
    document.documentElement.classList.add('vista-giocatori');
    const st = document.createElement('style');
    st.textContent = 'html.vista-giocatori body > *:not(#vg-pagina){display:none !important;} #vg-pagina{display:block !important;min-height:100vh;background:var(--bg-primary);color:var(--text-primary);}';
    document.head.appendChild(st);
    const pag = document.createElement('div');
    pag.id = 'vg-pagina';
    pag.innerHTML = '<div style="text-align:center;margin-top:20vh;color:var(--text-muted);font-family:var(--font-body);">Caricamento…</div>';
    document.body.appendChild(pag);
    let tentativi = 0;
    const attendi = () => {
      if (typeof firebase === 'undefined' || !firebase.apps?.length) {
        if (++tentativi > 60) { pag.innerHTML = _paginaHTML(null); return; }
        return setTimeout(attendi, 250);
      }
      const auth = firebase.auth();
      const leggi = () => firebase.database().ref('campagne/' + PARAM + '/data').on('value', snap => {
        try { pag.innerHTML = _paginaHTML(snap.val()); }
        catch (e) { console.warn('[VistaGiocatori]', e); pag.innerHTML = '<div style="max-width:640px;margin:15vh auto;text-align:center;padding:20px;">Non riesco a mostrare la pagina. Chiedi al master di ripubblicarla.</div>'; }
      }, () => { pag.innerHTML = _paginaHTML(null); });
      const un = auth.onAuthStateChanged(u => {
        un();
        if (u) leggi();
        else auth.signInAnonymously().then(leggi).catch(() => { pag.innerHTML = '<div style="max-width:640px;margin:15vh auto;text-align:center;padding:20px;">Non riesco a collegarmi. Riprova tra poco.</div>'; });
      });
    };
    attendi();
  };

  // ── Avvio ──

  const _aggancia = () => {
    if (typeof App === 'undefined' || App._vistaGiocatoriHooked) return;
    const nav = App.navigateTo;
    App.navigateTo = function (pageId) { nav.apply(App, arguments); if (pageId === 'campagna') setTimeout(renderDashboard, 190); };
    // Ogni salvataggio della campagna (es. un turno di combattimento) aggiorna la copia pubblica
    const salva = App.saveActiveCampaign;
    App.saveActiveCampaign = function () {
      const r = salva.apply(App, arguments);
      try { if (_impost().attiva && !(arguments[0] && 'vistaGiocatori' in arguments[0] && Object.keys(arguments[0]).length === 1)) _pianifica(); } catch (e) {}
      return r;
    };
    App._vistaGiocatoriHooked = true;
  };

  if (PARAM && /^pub_[a-z0-9]{10,}$/.test(PARAM)) {
    document.addEventListener('DOMContentLoaded', _avviaVistaGiocatori);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(_aggancia, 200));
  }

  return { apri, pubblica, copiaLink, anteprima, renderDashboard, _fatto, _istantanea, _paginaHTML };
})();

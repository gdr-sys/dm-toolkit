/* ============================================================
   MAPPA.JS — Mappe interattive con pin collegati al Mondo.

   Una campagna puo' avere PIU' mappe (camp.mappe[]), ognuna con la sua
   immagine e i suoi pin. Ogni pin puo' essere collegato a un Luogo o
   un PNG gia' esistenti nella Wiki (click -> QuickView, lo stesso
   pannello laterale delle @menzioni), essere un'etichetta libera senza
   scheda collegata, oppure aprire UN'ALTRA mappa della campagna (mappe
   annidate: es. pin "citta'" sulla mappa del regno -> mappa della
   citta' -> pin "taverna" -> mappa della taverna). La navigazione tra
   mappe annidate usa una pila (si entra cliccando il pin, si torna
   indietro col bottone apposito) cosi' la stessa mappa puo' essere
   raggiunta da piu' pin/mappe diverse senza ambiguita'.

   Migrazione automatica e silenziosa dal vecchio formato a mappa
   singola (camp.mappa): se camp.mappe non esiste ancora ma camp.mappa
   si', viene letta come prima mappa dell'elenco al primo accesso.
   camp.mappa originale non viene mai toccato/cancellato (nessun
   rischio di perdita dati), semplicemente smette di essere usato dal
   primo salvataggio in poi.

   Immagini: si puo' sempre incollare un URL diretto (resta il modo
   preferito — nessuna dipendenza da account collegati), oppure
   caricarla dal dispositivo. Il caricamento usa DriveBackup.uploadImage
   (stesso meccanismo gia' in uso per i ritratti PNG): se Drive e'
   collegato la carica li' e usa il link pubblico risultante, altrimenti
   la salva come immagine incorporata nella campagna stessa (nessun
   account richiesto, semplicemente piu' pesante da sincronizzare).
   Un link di condivisione di Google Drive incollato a mano (quello che
   da' il bottone "Condividi", tipo drive.google.com/file/d/ID/view)
   viene riconosciuto e convertito da solo nel formato diretto che un
   tag <img> puo' davvero caricare — quello incollato cosi' com'e' non
   funziona.

   Modulo autonomo: aggiunge la propria voce di navigazione e la
   propria pagina a runtime, tranne i tre punti che toccano per forza
   il file principale (registro pagine, switch di navigazione, bottone
   statico in sidebar) — vedi index.html.
   ============================================================ */

const MappaUI = (() => {
  // Km/giorno per ritmo di viaggio — stessi valori di Generatori.calcViaggio
  // (SRD "Passo di viaggio": Veloce 45, Normale 36, Lento 27 km/giorno a piedi).
  const VEL_BASE = {
    piedi:   { lento: 24, normale: 32, veloce: 40 },
    cavallo: { lento: 32, normale: 48, veloce: 64 },
    barca:   { lento: 24, normale: 40, veloce: 56 },
    nave:    { lento: 48, normale: 80, veloce: 96 },
  };
  const TERRENO_MULT = {
    strada: 1.0, pianura: 0.9, foresta: 0.6,
    colline: 0.7, montagna: 0.5, palude: 0.5, deserto: 0.7, mare: 1.0,
  };
  const MEZZO_LABEL = { piedi: 'A piedi', cavallo: 'A cavallo', barca: 'In barca', nave: 'In nave' };
  const TERRENO_LABEL = { strada: 'Strada', pianura: 'Pianura', foresta: 'Foresta', colline: 'Colline', montagna: 'Montagna', palude: 'Palude', deserto: 'Deserto', mare: 'Mare aperto' };
  const COLORI = ['#8b2635', '#2d5a6b', '#3a7d44', '#c17f3b', '#c97bea', '#5a5248'];

  // Icona interna del pin (stesso guscio a goccia per tutti, cambia solo il
  // glifo bianco al centro) in base al "Tipo di luogo" gia' presente nella
  // scheda Wiki collegata — nessun dato nuovo da inserire, si vede subito a
  // colpo d'occhio cosa c'e' sulla mappa senza dover cliccare ogni pin.
  const ICONA_LUOGO = {
    'Città':     '<rect x="7.5" y="8" width="3" height="4.5" fill="#fff"/><rect x="11" y="5.5" width="3" height="7" fill="#fff"/><rect x="14.5" y="7" width="3" height="5.5" fill="#fff"/>',
    'Villaggio': '<path d="M12 5.5 L16 9 L16 12.5 L8 12.5 L8 9 Z" fill="#fff"/>',
    'Paese':     '<path d="M12 5.5 L16 9 L16 12.5 L8 12.5 L8 9 Z" fill="#fff"/>',
    'Dungeon':   '<path d="M9 12.5 V9 A3 3 0 0 1 15 9 V12.5 Z" fill="#fff"/>',
    'Taverna':   '<rect x="9" y="7" width="5" height="6" rx="0.5" fill="#fff"/><path d="M14 8.5 h1.3 a1.4 1.4 0 0 1 0 2.8 h-1.3" stroke="#fff" stroke-width="0.9" fill="none"/>',
    'Castello':  '<path d="M8 12.5 V8 H9.3 V6.6 H10.7 V8 H13.3 V6.6 H14.7 V8 H16 V12.5 Z" fill="#fff"/>',
    'Tempio':    '<path d="M12 5.3 L16.3 9 H7.7 Z" fill="#fff"/><rect x="8.2" y="9" width="1" height="3.5" fill="#fff"/><rect x="11.5" y="9" width="1" height="3.5" fill="#fff"/><rect x="14.8" y="9" width="1" height="3.5" fill="#fff"/>',
    'Foresta':   '<path d="M12 5.3 L15.2 10.2 H8.8 Z" fill="#fff"/><rect x="11.3" y="10.2" width="1.4" height="2.3" fill="#fff"/>',
    'Regione':   '<rect x="9" y="5.3" width="1" height="7.2" fill="#fff"/><path d="M10 5.3 L15 7 L10 8.7 Z" fill="#fff"/>',
    'Porto':     '<circle cx="12" cy="6.4" r="1" fill="none" stroke="#fff" stroke-width="1"/><path d="M12 7.4 V12.3 M9 10.3 Q9 12.5 12 12.5 Q15 12.5 15 10.3" stroke="#fff" stroke-width="1" fill="none"/>',
    'Torre':     '<rect x="10.5" y="6.3" width="3" height="6.2" fill="#fff"/><path d="M12 4.6 L13.6 6.3 H10.4 Z" fill="#fff"/>',
  };
  const ICONA_PNG = '<circle cx="12" cy="7" r="1.6" fill="#fff"/><path d="M8.5 12.5 Q8.5 9 12 9 Q15.5 9 15.5 12.5 Z" fill="#fff"/>';
  const ICONA_MAPPA = '<rect x="9" y="6" width="6" height="6" rx="1" fill="#fff"/>';
  const ICONA_DEFAULT = '<circle cx="12" cy="9" r="3" fill="#fff"/>';
  // Icone per i pin "etichetta libera" (senza scheda Wiki collegata) — per
  // segnare al volo cose come loot o pericoli direttamente sulla mappa, con
  // una nota scritta li' per li' invece di dover creare una scheda apposta.
  const ICONA_LIBERO = {
    '':        ICONA_DEFAULT,
    tesoro:    '<rect x="8" y="9" width="8" height="3.8" rx="0.5" fill="#fff"/><rect x="8" y="6.8" width="8" height="2.4" rx="0.5" fill="#fff"/>',
    pericolo:  '<path d="M12 5.8 L16 12.3 H8 Z" fill="none" stroke="#fff" stroke-width="1"/><rect x="11.55" y="8.2" width="0.9" height="2" fill="#fff"/><circle cx="12" cy="11.1" r="0.55" fill="#fff"/>',
    nota:      '<rect x="8.3" y="5.8" width="7.4" height="7.2" rx="0.6" fill="none" stroke="#fff" stroke-width="1"/><line x1="9.8" y1="8.1" x2="14.2" y2="8.1" stroke="#fff" stroke-width="0.8"/><line x1="9.8" y1="10.1" x2="14.2" y2="10.1" stroke="#fff" stroke-width="0.8"/>',
  };

  let _scale = 1, _panX = 0, _panY = 0;
  let _dragging = false, _dragMoved = false, _lastClientX = 0, _lastClientY = 0;
  let _pendingPin = null;   // {x,y} in attesa di conferma dal modal "Nuovo pin"
  let _misuraDa = null;     // id del primo pin scelto per la misura distanza
  let _pinColoreScelto = COLORI[0];
  let _navStack = [];       // pila di id mappa: [0]=radice di questa sessione di navigazione, ultimo=mappa attuale
  let _pendingUploadDataUri = null; // immagine scelta dal dispositivo, in attesa di "Salva"

  const _escHtml = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const _getCamp = () => App.getActiveCampaign();

  // Elenco mappe della campagna, con migrazione silenziosa una tantum dal
  // vecchio formato a mappa singola (vedi nota in testa al file).
  const _getMappe = () => {
    const camp = _getCamp();
    if (!camp) return [];
    if (camp.mappe) return camp.mappe;
    if (camp.mappa && camp.mappa.immagine) {
      return [{
        id: 'mappa_main', nome: 'Mappa principale',
        immagine: camp.mappa.immagine, scalaKm: camp.mappa.scalaKm || 0,
        pins: camp.mappa.pins || [],
      }];
    }
    return [];
  };
  const _saveMappe = (mappe) => App.saveActiveCampaign({ mappe });

  const _mappaAttivaId = () => _navStack[_navStack.length - 1] || null;
  const _getMappaAttiva = () => {
    const mappe = _getMappe();
    if (!mappe.length) return null;
    return mappe.find(m => m.id === _mappaAttivaId()) || mappe[0];
  };
  // Aggiorna la mappa attualmente aperta con una funzione (mappa) => mappaAggiornata;
  // le altre mappe dell'elenco restano intatte.
  const _aggiornaMappaAttiva = (updater) => {
    const mappe = _getMappe();
    const attuale = _getMappaAttiva();
    if (!attuale) return;
    _saveMappe(mappe.map(m => m.id === attuale.id ? updater({ ...m }) : m));
  };

  /* ── Pagina ── */

  const _injectPage = () => {
    const page = document.getElementById('page-mappa');
    if (!page || page.dataset.ready) return;
    page.dataset.ready = '1';
    page.innerHTML =
      '<div style="display:flex;flex-direction:column;height:100%;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:var(--space-md) var(--space-lg);border-bottom:1px solid var(--border);flex-wrap:wrap;">' +
          '<div style="min-width:0;">' +
            '<h1 class="page-title" style="margin:0;">Mappa</h1>' +
            '<div id="mappa-selettore-wrap" style="margin-top:6px;"></div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
            '<button class="btn btn-ghost btn-icon-sm" onclick="MappaUI.zoom(-0.2)" title="Riduci">−</button>' +
            '<button class="btn btn-ghost btn-sm" onclick="MappaUI.zoomReset()" id="mappa-zoom-label" style="min-width:48px;">100%</button>' +
            '<button class="btn btn-ghost btn-icon-sm" onclick="MappaUI.zoom(0.2)" title="Ingrandisci">+</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="MappaUI.apriImpostazioni()">Modifica mappa</button>' +
          '</div>' +
        '</div>' +
        '<p class="page-subtitle" style="margin:0;padding:0 var(--space-lg) var(--space-sm);">Click su uno spazio vuoto per aggiungere un pin, click su un pin per aprirlo. Un pin puo\' anche aprire un\'altra mappa (es. la mappa di una citta\' o di un dungeon).</p>' +
        '<div id="mappa-canvas" style="flex:1;position:relative;overflow:hidden;background:var(--bg-tertiary);cursor:grab;touch-action:none;">' +
          '<div id="mappa-vuota" style="display:none;position:absolute;inset:0;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:24px;">' +
            '<div style="opacity:0.4;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg></div>' +
            '<div><h3 id="mappa-vuota-titolo" style="margin:0 0 4px;">Nessuna mappa ancora</h3><p class="text-sm text-muted" style="margin:0;max-width:340px;">Carica un’immagine (un disegno, una scansione, una mappa fatta altrove) e inizia a segnare luoghi e PNG sopra.</p></div>' +
            '<button class="btn btn-primary btn-sm" onclick="MappaUI.apriImpostazioni()">Carica una mappa</button>' +
          '</div>' +
          '<div id="mappa-inner" style="position:absolute;left:0;top:0;transform-origin:0 0;">' +
            '<img id="mappa-img" src="" alt="Mappa" draggable="false" style="display:block;max-width:none;user-select:none;-webkit-user-drag:none;">' +
            '<div id="mappa-pins"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    const canvas = document.getElementById('mappa-canvas');
    canvas.addEventListener('mousedown', _onDragStart);
    window.addEventListener('mousemove', _onDragMove);
    window.addEventListener('mouseup', _onDragEnd);
    canvas.addEventListener('touchstart', _onDragStart, { passive: true });
    canvas.addEventListener('touchmove', _onDragMove, { passive: false });
    canvas.addEventListener('touchend', _onDragEnd);
    canvas.addEventListener('wheel', _onWheel, { passive: false });
    canvas.addEventListener('click', _onCanvasClick);
  };

  // Barra sopra la mappa: se si e' entrati qui navigando da un pin "apri mappa",
  // un bottone "indietro" verso la mappa precedente; sempre, un selettore a
  // tendina per saltare direttamente a una qualsiasi mappa della campagna.
  const _renderSelettore = () => {
    const wrap = document.getElementById('mappa-selettore-wrap');
    if (!wrap) return;
    const mappe = _getMappe();
    const attuale = _getMappaAttiva();
    const opzioni = mappe.map(m =>
      '<option value="' + m.id + '"' + (attuale && m.id === attuale.id ? ' selected' : '') + '>' + _escHtml(m.nome) + '</option>'
    ).join('');
    const indietro = _navStack.length > 1
      ? (() => {
          const prevId = _navStack[_navStack.length - 2];
          const prev = mappe.find(m => m.id === prevId);
          return '<button class="btn btn-ghost btn-sm" onclick="MappaUI.tornaIndietro()" style="margin-right:6px;">← ' + _escHtml(prev ? prev.nome : 'Indietro') + '</button>';
        })()
      : '';
    wrap.innerHTML = indietro +
      (mappe.length
        ? '<select id="mappa-selettore" class="form-select" style="font-size:0.78rem;padding:4px 8px;display:inline-block;width:auto;max-width:220px;" onchange="MappaUI.vaiAMappa(this.value)">' + opzioni + '</select>'
        : '') +
      '<button class="btn btn-ghost btn-icon-sm" title="Nuova mappa" onclick="MappaUI.nuovaMappa()" style="margin-left:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>';
  };

  const _render = () => {
    _injectPage();
    if (!_navStack.length) {
      const mappe = _getMappe();
      _navStack = [mappe.length ? mappe[0].id : null].filter(Boolean);
    }
    _renderSelettore();
    const mappa = _getMappaAttiva();
    const vuota = document.getElementById('mappa-vuota');
    const inner = document.getElementById('mappa-inner');
    const img = document.getElementById('mappa-img');
    if (!mappa || !mappa.immagine) {
      if (vuota) {
        vuota.style.display = 'flex';
        const t = document.getElementById('mappa-vuota-titolo');
        if (t) t.textContent = mappa ? 'Nessuna immagine per "' + mappa.nome + '"' : 'Nessuna mappa ancora';
      }
      if (inner) inner.style.display = 'none';
      return;
    }
    if (vuota) vuota.style.display = 'none';
    if (inner) inner.style.display = '';
    // Guarisce al volo link di Drive salvati nel vecchio formato uc?export=view
    // (non piu' affidabile come sorgente <img>, vedi DriveBackup.toEmbeddableUrl):
    // cosi' le mappe caricate prima di questo fix tornano a vedersi senza dover
    // essere ricaricate a mano.
    const srcSanato = (typeof DriveBackup !== 'undefined') ? DriveBackup.toEmbeddableUrl(mappa.immagine) : mappa.immagine;
    if (img.src !== srcSanato) img.src = srcSanato;
    img.onerror = () => {
      if (vuota) {
        vuota.style.display = 'flex';
        const t = document.getElementById('mappa-vuota-titolo');
        if (t) t.textContent = 'Immagine non disponibile — riapri "Modifica mappa" e ricaricala';
      }
      if (inner) inner.style.display = 'none';
    };
    zoomReset();
    _renderPins();
  };

  const vaiAMappa = (id) => {
    if (!id) return;
    _navStack = [id];
    _render();
  };

  const tornaIndietro = () => {
    if (_navStack.length > 1) _navStack.pop();
    _render();
  };

  const entraInMappa = (id) => {
    const mappe = _getMappe();
    if (!mappe.find(m => m.id === id)) { Toast.show('Quella mappa non esiste piu’', 'warning'); return; }
    document.getElementById('mappa-pin-popover').style.display = 'none';
    _navStack.push(id);
    _render();
  };

  const nuovaMappa = () => {
    const nome = (prompt('Nome della nuova mappa (es. "Citta’ di Portovento", "Dungeon del Re Verme")') || '').trim();
    if (!nome) return;
    const mappe = _getMappe();
    const nuova = { id: 'mappa_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5), nome, immagine: '', scalaKm: 0, pins: [] };
    _saveMappe([...mappe, nuova]);
    _navStack.push(nuova.id);
    _render();
    apriImpostazioni();
  };

  const _renderPins = () => {
    const mappa = _getMappaAttiva();
    const wrap = document.getElementById('mappa-pins');
    if (!mappa || !wrap) return;
    const camp = _getCamp();
    const mappe = _getMappe();
    wrap.innerHTML = (mappa.pins || []).map(p => {
      let nome = p.label || '(senza nome)';
      let centro = ICONA_DEFAULT;
      if (p.tipo === 'mappa') {
        const m = mappe.find(x => x.id === p.entitaId);
        nome = m ? m.nome : '(mappa eliminata)';
        centro = ICONA_MAPPA;
      } else if (p.tipo === 'png') {
        const cfg = WikiSections._getCfg('png');
        const item = cfg && (cfg.getData(camp) || []).find(x => x.id === p.entitaId);
        if (item) nome = item.nome;
        centro = ICONA_PNG;
      } else if (p.tipo === 'luoghi') {
        const cfg = WikiSections._getCfg('luoghi');
        const item = cfg && (cfg.getData(camp) || []).find(x => x.id === p.entitaId);
        if (item) nome = item.nome;
        // Icona in base al "Tipo di luogo" gia' scelto sulla scheda collegata
        // (Città, Villaggio, Castello...): nessun dato nuovo richiesto al DM.
        centro = (item && ICONA_LUOGO[item.tipo]) || ICONA_DEFAULT;
      } else {
        centro = ICONA_LIBERO[p.sottotipo || ''] || ICONA_DEFAULT;
      }
      const colore = p.colore || COLORI[0];
      // Il titolo al passaggio del mouse anticipa anche l'inizio della nota,
      // cosi' non serve aprire il pin solo per ricordarsi cosa c'e' scritto.
      const anteprimaNota = (!p.tipo && p.note) ? ' — ' + p.note.slice(0, 60) + (p.note.length > 60 ? '…' : '') : '';
      return (
        '<div class="mappa-pin" data-pin-id="' + p.id + '" title="' + _escHtml(nome + anteprimaNota) + '" ' +
          'style="position:absolute;left:' + (p.x * 100) + '%;top:' + (p.y * 100) + '%;transform:translate(-50%,-100%);cursor:pointer;z-index:2;" ' +
          'onclick="MappaUI.onPinClick(\'' + p.id + '\', event)">' +
          '<svg width="26" height="26" viewBox="0 0 24 24" fill="' + colore + '" stroke="#fff" stroke-width="1.2"><path d="M12 0C7 0 3 4 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-5-4-9-9-9z"/>' + centro + '</svg>' +
        '</div>'
      );
    }).join('');
  };

  /* ── Pan / zoom (stessa tecnica di ImageViewer: translate+scale su un wrapper,
     drag con soglia per distinguere un pan da un click che aggiunge un pin) ── */

  const _applyTransform = () => {
    const inner = document.getElementById('mappa-inner');
    if (inner) inner.style.transform = 'translate(' + _panX + 'px,' + _panY + 'px) scale(' + _scale + ')';
    const lbl = document.getElementById('mappa-zoom-label');
    if (lbl) lbl.textContent = Math.round(_scale * 100) + '%';
  };

  const zoom = (delta) => { _scale = Math.max(0.2, Math.min(5, _scale + delta)); _applyTransform(); };
  const zoomReset = () => { _scale = 1; _panX = 0; _panY = 0; _applyTransform(); };

  const _pt = (e) => e.touches && e.touches[0] ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };

  const _onDragStart = (e) => {
    if (!_getMappaAttiva()?.immagine) return;
    const p = _pt(e);
    _dragging = true; _dragMoved = false;
    _lastClientX = p.x; _lastClientY = p.y;
  };
  const _onDragMove = (e) => {
    if (!_dragging) return;
    const p = _pt(e);
    const dx = p.x - _lastClientX, dy = p.y - _lastClientY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) _dragMoved = true;
    if (_dragMoved) {
      _panX += dx; _panY += dy;
      _lastClientX = p.x; _lastClientY = p.y;
      _applyTransform();
      if (e.cancelable) e.preventDefault();
    }
  };
  const _onDragEnd = () => { _dragging = false; };

  const _onWheel = (e) => {
    if (!_getMappaAttiva()?.immagine) return;
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.15 : -0.15);
  };

  // Click sul canvas: se e' stato un trascinamento (pan) lo ignora; se e' stato un
  // click su un pin, ci pensa gia' il suo onclick (con stopPropagation); altrimenti
  // e' un click su sfondo vuoto -> propone di aggiungere un pin li'.
  const _onCanvasClick = (e) => {
    if (_dragMoved) { _dragMoved = false; return; }
    if (e.target.closest('.mappa-pin')) return;
    const mappa = _getMappaAttiva();
    if (!mappa || !mappa.immagine) return;
    const inner = document.getElementById('mappa-inner');
    const rect = inner.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;

    if (_misuraDa) { Toast.show('Stavi misurando una distanza: scegli un pin, non uno spazio vuoto. Click destro/Esc per annullare.', 'info', 3500); return; }
    apriModalNuovoPin(fx, fy);
  };

  /* ── Impostazioni mappa (nome, URL/upload immagine, scala) ── */

  // Riconosce i formati di link "Condividi" di Google Drive (che un tag <img>
  // non puo' caricare direttamente) e li converte nel link diretto equivalente.
  // Se l'URL non sembra un link Drive di quel tipo, lo restituisce invariato.
  const _normalizzaUrlImmagine = (url) => {
    if (!url) return url;
    return (typeof DriveBackup !== 'undefined') ? DriveBackup.toEmbeddableUrl(url) : url;
  };

  const _injectModals = () => {
    if (document.getElementById('modal-mappa-settings')) return;

    const settings = document.createElement('div');
    settings.className = 'modal-overlay hidden';
    settings.id = 'modal-mappa-settings';
    settings.style.display = 'none';
    settings.onclick = (e) => { if (e.target === settings) Modal.close('mappa-settings'); };
    settings.innerHTML =
      '<div class="modal" style="max-width:440px;">' +
        '<div class="modal-header"><h3 class="modal-title">Modifica mappa</h3>' +
          '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'mappa-settings\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="form-group">' +
            '<label class="form-label">Nome mappa</label>' +
            '<input type="text" id="mappa-set-nome" class="form-input" placeholder="es. Mappa del regno">' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">URL immagine (consigliato)</label>' +
            '<input type="text" id="mappa-set-url" class="form-input" placeholder="https://...">' +
            '<div class="form-hint">Un link DIRETTO a un’immagine (es. imgur). Un link di "Condividi" di Google Drive va bene cosi’ com’e’: viene riconosciuto e corretto in automatico.</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="btn btn-ghost btn-sm" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
              'Carica dal dispositivo' +
              '<input type="file" id="mappa-set-file" accept="image/*" style="display:none;" onchange="MappaUI._onFilePicked()">' +
            '</label>' +
            '<div class="form-hint" id="mappa-set-file-hint" style="margin-top:4px;"></div>' +
          '</div>' +
          '<div id="mappa-set-preview" style="display:none;margin-bottom:12px;border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border);"><img style="width:100%;display:block;"></div>' +
          '<div class="form-group">' +
            '<label class="form-label">Larghezza reale della mappa (km)</label>' +
            '<input type="number" id="mappa-set-scala" class="form-input" min="0.1" step="0.1" placeholder="es. 300">' +
            '<div class="form-hint">Quanti km copre l’immagine da un bordo all’altro — serve per calcolare le distanze tra i pin.</div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer" style="justify-content:space-between;">' +
          '<button class="btn btn-ghost" id="mappa-set-elimina" style="color:var(--accent-danger);" onclick="MappaUI.eliminaMappaCorrente()">Elimina mappa</button>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-ghost" onclick="Modal.close(\'mappa-settings\')">Annulla</button>' +
            '<button class="btn btn-primary" onclick="MappaUI.salvaImpostazioni()">Salva</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(settings);

    const pinModal = document.createElement('div');
    pinModal.className = 'modal-overlay hidden';
    pinModal.id = 'modal-mappa-pin';
    pinModal.style.display = 'none';
    pinModal.onclick = (e) => { if (e.target === pinModal) Modal.close('mappa-pin'); };
    pinModal.innerHTML =
      '<div class="modal" style="max-width:420px;">' +
        '<div class="modal-header"><h3 class="modal-title" id="mappa-pin-titolo">Nuovo pin</h3>' +
          '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'mappa-pin\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label class="form-label">Collegato a</label>' +
            '<select id="mappa-pin-tipo" class="form-select" onchange="MappaUI._onPinTipoChange()">' +
              '<option value="">Etichetta libera (nessuna scheda)</option>' +
              '<option value="luoghi">Un Luogo (esistente o nuovo)</option>' +
              '<option value="png">Un PNG (esistente o nuovo)</option>' +
              '<option value="mappa">Un’altra mappa (click per aprirla)</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group" id="mappa-pin-entita-wrap" style="display:none;">' +
            '<label class="form-label">Quale</label>' +
            '<select id="mappa-pin-entita" class="form-select" onchange="MappaUI._onPinEntitaChange()"></select>' +
          '</div>' +
          '<div class="form-group" id="mappa-pin-nuovo-wrap" style="display:none;">' +
            '<label class="form-label" id="mappa-pin-nuovo-label">Nome</label>' +
            '<input type="text" id="mappa-pin-nuovo-nome" class="form-input" placeholder="es. Il Gatto Ridens" style="margin-bottom:8px;">' +
            '<div id="mappa-pin-nuovo-tipo-wrap" style="display:none;">' +
              '<label class="form-label">Tipo di luogo</label>' +
              '<select id="mappa-pin-nuovo-tipo" class="form-select"></select>' +
            '</div>' +
            '<div class="form-hint" style="margin-top:4px;">Crea subito una scheda minima nella Wiki (potrai completarla con altri dettagli quando vuoi).</div>' +
          '</div>' +
          '<div id="mappa-pin-label-wrap">' +
            '<div class="form-group"><label class="form-label">Etichetta</label>' +
              '<input type="text" id="mappa-pin-label" class="form-input" placeholder="es. Loot, Trappola, Accampamento banditi...">' +
            '</div>' +
            '<div class="form-group"><label class="form-label">Icona</label>' +
              '<select id="mappa-pin-icona-libera" class="form-select">' +
                '<option value="">Generico</option>' +
                '<option value="tesoro">Tesoro / Loot</option>' +
                '<option value="pericolo">Pericolo / Trappola</option>' +
                '<option value="nota">Nota</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group"><label class="form-label">Note (facoltative)</label>' +
              '<textarea id="mappa-pin-note" class="form-input" rows="3" placeholder="es. CD 15 Percezione per notarla, scarica 2d6 danni da fulmine se innescata..." style="resize:vertical;"></textarea>' +
            '</div>' +
          '</div>' +
          '<div class="form-group"><label class="form-label">Colore</label>' +
            '<div id="mappa-pin-colori" style="display:flex;gap:6px;"></div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-ghost" onclick="Modal.close(\'mappa-pin\')">Annulla</button>' +
          '<button class="btn btn-primary" id="mappa-pin-btn-conferma" onclick="MappaUI.confermaNuovoPin()">Aggiungi pin</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(pinModal);

    const popover = document.createElement('div');
    popover.id = 'mappa-pin-popover';
    popover.style.cssText = 'position:fixed;z-index:950;display:none;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);box-shadow:var(--shadow-lg);padding:10px;min-width:200px;';
    document.body.appendChild(popover);
    document.addEventListener('click', (e) => {
      if (popover.style.display === 'none') return;
      if (!popover.contains(e.target) && !e.target.closest('.mappa-pin')) popover.style.display = 'none';
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _misuraDa) { _misuraDa = null; Toast.show('Misura annullata', 'info', 1500); }
    });
  };

  const apriImpostazioni = () => {
    _injectModals();
    const mappa = _getMappaAttiva();
    _pendingUploadDataUri = null;
    document.getElementById('mappa-set-nome').value = mappa?.nome || '';
    document.getElementById('mappa-set-url').value = mappa?.immagine || '';
    document.getElementById('mappa-set-scala').value = mappa?.scalaKm || '';
    document.getElementById('mappa-set-preview').style.display = 'none';
    document.getElementById('mappa-set-file').value = '';
    document.getElementById('mappa-set-file-hint').textContent = '';
    document.getElementById('mappa-set-elimina').style.display = _getMappe().length > 1 ? '' : 'none';
    Modal.open('mappa-settings');
  };

  const _onFilePicked = () => {
    const input = document.getElementById('mappa-set-file');
    const file = input?.files?.[0];
    if (!file) return;
    const connesso = (typeof DriveBackup !== 'undefined') && DriveBackup.isConnected();
    // Con Drive collegato i byte restano su Drive (in campagna finisce solo un
    // link), quindi una mappa pesante puo' usare un limite alto. SENZA Drive,
    // l'immagine finisce incorporata per intero nel localStorage del browser —
    // che in totale (per TUTTA l'app, tutte le campagne) e' spesso solo 5-10MB:
    // un singolo file da qualche MB puo' da solo esaurirlo. Limite basso apposta.
    const limiteMB = connesso ? 40 : 1.5;
    if (file.size > limiteMB * 1024 * 1024) {
      Toast.show(
        connesso
          ? 'Immagine troppo grande (max ' + limiteMB + 'MB)'
          : 'Immagine troppo grande per il salvataggio locale (max ' + limiteMB + 'MB senza Drive) — collega Google Drive da Impostazioni per caricare mappe piu’ pesanti senza rischiare di esaurire lo spazio del browser',
        'warning', 6000);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      _pendingUploadDataUri = e.target.result;
      const prev = document.getElementById('mappa-set-preview');
      prev.querySelector('img').src = e.target.result;
      prev.style.display = 'block';
      document.getElementById('mappa-set-file-hint').textContent = connesso
        ? 'Verra’ caricata su Google Drive al salvataggio.'
        : 'Google Drive non e’ collegato: verra’ salvata direttamente nella campagna. Per mappe piu’ pesanti, collega Drive da Impostazioni (evita di riempire lo spazio del browser).';
      // Il campo URL si apre gia' precompilato con l'immagine attuale: se non lo
      // svuotiamo qui, scegliere un file non avrebbe mai effetto (vedi
      // salvaImpostazioni, il link ha sempre la precedenza se il campo non e'
      // vuoto) e l'utente si ritroverebbe "il file caricato non cambia nulla".
      const urlField = document.getElementById('mappa-set-url');
      if (urlField) urlField.value = '';
    };
    reader.readAsDataURL(file);
  };

  const salvaImpostazioni = async () => {
    const nome = document.getElementById('mappa-set-nome')?.value?.trim() || 'Mappa senza nome';
    const urlInserito = document.getElementById('mappa-set-url')?.value?.trim() || '';
    const scala = parseFloat(document.getElementById('mappa-set-scala')?.value) || 0;
    const mappaPrecedente = _getMappaAttiva() || { id: 'mappa_' + Date.now(), pins: [] };
    const giaMappe = _getMappe();
    const btn = document.querySelector('#modal-mappa-settings .btn-primary');

    // Il link e' sempre la scelta preferita se il campo non e' vuoto (anche
    // svuotato di proposito per togliere l'immagine): un file scelto ha effetto
    // solo quando il campo URL e' vuoto (per questo _onFilePicked lo svuota da
    // solo appena si sceglie un file, cosi' le due scelte non sono ambigue).
    let immagine = '';
    if (urlInserito) {
      const normalizzato = _normalizzaUrlImmagine(urlInserito);
      if (normalizzato !== urlInserito) Toast.show('Link di Google Drive riconosciuto e corretto automaticamente', 'info', 3000);
      immagine = normalizzato;
    } else if (_pendingUploadDataUri) {
      if (btn) { btn.disabled = true; btn.textContent = 'Caricamento...'; }
      try {
        immagine = (typeof DriveBackup !== 'undefined')
          ? await DriveBackup.uploadImage(_pendingUploadDataUri, nome || 'mappa')
          : _pendingUploadDataUri;
      } catch (e) {
        Toast.show('Caricamento immagine non riuscito: ' + (e?.message || 'errore sconosciuto'), 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Salva'; }
        return;
      }
      if (btn) { btn.disabled = false; btn.textContent = 'Salva'; }
    }

    const mappaAggiornata = { ...mappaPrecedente, nome, immagine, scalaKm: scala, pins: mappaPrecedente.pins || [] };
    const esisteGia = giaMappe.some(m => m.id === mappaAggiornata.id);
    const nuoveMappe = esisteGia
      ? giaMappe.map(m => m.id === mappaAggiornata.id ? mappaAggiornata : m)
      : [...giaMappe, mappaAggiornata];
    _saveMappe(nuoveMappe);
    if (!_navStack.includes(mappaAggiornata.id)) _navStack = [mappaAggiornata.id];
    _pendingUploadDataUri = null;
    Modal.close('mappa-settings');
    _render();
    Toast.show('Mappa aggiornata', 'success');
  };

  const eliminaMappaCorrente = () => {
    const mappa = _getMappaAttiva();
    const mappe = _getMappe();
    if (!mappa || mappe.length <= 1) return;
    Modal.close('mappa-settings');
    openConfirmModal('Eliminare "' + mappa.nome + '"?', 'I pin di questa mappa andranno persi. I pin su altre mappe che la aprivano diventeranno etichette libere.', () => {
      const restanti = mappe.filter(m => m.id !== mappa.id);
      // I pin "apri mappa" che puntavano a quella eliminata diventano etichette
      // libere invece di restare link rotti verso una mappa che non esiste piu'.
      const pulite = restanti.map(m => ({
        ...m,
        pins: (m.pins || []).map(p => p.tipo === 'mappa' && p.entitaId === mappa.id
          ? { ...p, tipo: null, entitaId: null, label: p.label || '(mappa eliminata)' }
          : p),
      }));
      _saveMappe(pulite);
      _navStack = _navStack.filter(id => id !== mappa.id);
      if (!_navStack.length && pulite.length) _navStack = [pulite[0].id];
      _render();
      Toast.show('Mappa eliminata', 'info');
    });
  };

  /* ── Nuovo pin / modifica pin esistente ── */

  let _editingPinId = null;

  const apriModalNuovoPin = (fx, fy) => {
    _injectModals();
    _editingPinId = null;
    _pendingPin = { x: fx, y: fy };
    document.getElementById('mappa-pin-titolo').textContent = 'Nuovo pin';
    document.getElementById('mappa-pin-btn-conferma').textContent = 'Aggiungi pin';
    document.getElementById('mappa-pin-tipo').value = '';
    document.getElementById('mappa-pin-tipo').disabled = false;
    document.getElementById('mappa-pin-entita-wrap').style.display = 'none';
    document.getElementById('mappa-pin-nuovo-wrap').style.display = 'none';
    document.getElementById('mappa-pin-label-wrap').style.display = '';
    document.getElementById('mappa-pin-label').value = '';
    document.getElementById('mappa-pin-icona-libera').value = '';
    document.getElementById('mappa-pin-note').value = '';
    document.getElementById('mappa-pin-nuovo-nome').value = '';
    _pinColoreScelto = COLORI[0];
    _renderColoriPin(COLORI[0]);
    Modal.open('mappa-pin');
  };

  // Riapre lo stesso modale precompilato coi dati del pin esistente: oggi
  // l'unico modo per "cambiare idea" su un pin era cancellarlo e rifarlo da
  // zero, perdendo posizione e dati — specialmente scomodo per i pin con
  // nota (loot, trappole...) pensati per essere aggiornati nel tempo.
  const modificaPin = (pinId) => {
    const pin = _trovaPin(pinId);
    if (!pin) return;
    _injectModals();
    document.getElementById('mappa-pin-popover').style.display = 'none';
    _editingPinId = pinId;
    _pendingPin = null;
    document.getElementById('mappa-pin-titolo').textContent = 'Modifica pin';
    document.getElementById('mappa-pin-btn-conferma').textContent = 'Salva';
    // Il tipo di collegamento (Luogo/PNG/mappa/libero) non si cambia qui:
    // significherebbe ricreare il pin da un'altra categoria di dati. Si puo'
    // sempre rimuoverlo e farne uno nuovo se serve collegarlo diversamente.
    document.getElementById('mappa-pin-tipo').value = pin.tipo || '';
    document.getElementById('mappa-pin-tipo').disabled = true;
    _onPinTipoChange();
    if (pin.tipo && pin.tipo !== 'mappa') {
      const sel = document.getElementById('mappa-pin-entita');
      if (sel.querySelector('option[value="' + pin.entitaId + '"]')) sel.value = pin.entitaId;
      // _onPinTipoChange() sopra ha gia' richiamato _onPinEntitaChange() una
      // volta, ma col primo valore di default della lista appena ricostruita
      // ("+ Crea nuovo...") — va rifatto ora che il valore vero e' impostato,
      // altrimenti il blocco "crea nuovo" resta visibile per errore.
      _onPinEntitaChange();
    } else if (pin.tipo === 'mappa') {
      document.getElementById('mappa-pin-entita').value = pin.entitaId || '';
    }
    document.getElementById('mappa-pin-label').value = pin.label || '';
    document.getElementById('mappa-pin-icona-libera').value = pin.sottotipo || '';
    document.getElementById('mappa-pin-note').value = pin.note || '';
    _pinColoreScelto = pin.colore || COLORI[0];
    _renderColoriPin(_pinColoreScelto);
    Modal.open('mappa-pin');
  };

  const _renderColoriPin = (selezionato) => {
    const colWrap = document.getElementById('mappa-pin-colori');
    colWrap.innerHTML = COLORI.map(c =>
      '<span class="mappa-pin-colore-opt" data-colore="' + c + '" onclick="MappaUI._pickColore(this)" style="width:22px;height:22px;border-radius:50%;background:' + c + ';cursor:pointer;border:2px solid ' + (c === selezionato ? 'var(--text-primary)' : 'transparent') + ';display:inline-block;"></span>'
    ).join('');
  };

  const _pickColore = (el) => {
    document.querySelectorAll('.mappa-pin-colore-opt').forEach(o => o.style.border = '2px solid transparent');
    el.style.border = '2px solid var(--text-primary)';
    _pinColoreScelto = el.dataset.colore;
  };

  const _onPinTipoChange = () => {
    const tipo = document.getElementById('mappa-pin-tipo').value;
    const entitaWrap = document.getElementById('mappa-pin-entita-wrap');
    const nuovoWrap = document.getElementById('mappa-pin-nuovo-wrap');
    const labelWrap = document.getElementById('mappa-pin-label-wrap');
    nuovoWrap.style.display = 'none';
    if (!tipo) {
      entitaWrap.style.display = 'none';
      labelWrap.style.display = '';
      return;
    }
    entitaWrap.style.display = '';
    labelWrap.style.display = 'none';
    const sel = document.getElementById('mappa-pin-entita');
    if (tipo === 'mappa') {
      const attuale = _getMappaAttiva();
      const altre = _getMappe().filter(m => m.id !== attuale?.id).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
      sel.innerHTML = altre.length
        ? altre.map(m => '<option value="' + m.id + '">' + _escHtml(m.nome) + '</option>').join('')
        : '<option value="">Nessun’altra mappa ancora — creane una prima</option>';
      return;
    }
    // Per Luoghi/PNG si può sempre creare una scheda minima al volo, non serve
    // che esista già nella Wiki prima di poterla segnare sulla mappa.
    const cfg = WikiSections._getCfg(tipo);
    const items = (cfg.getData(_getCamp()) || []).slice().sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    const opzioneNuovo = '<option value="__nuovo__">+ Crea nuovo ' + (tipo === 'luoghi' ? 'Luogo' : 'PNG') + '...</option>';
    sel.innerHTML = opzioneNuovo + items.map(x => '<option value="' + x.id + '">' + _escHtml(x.nome) + '</option>').join('');
    _onPinEntitaChange();
  };

  const _onPinEntitaChange = () => {
    const tipo = document.getElementById('mappa-pin-tipo').value;
    const valore = document.getElementById('mappa-pin-entita')?.value;
    const nuovoWrap = document.getElementById('mappa-pin-nuovo-wrap');
    if (tipo === 'mappa' || valore !== '__nuovo__') { nuovoWrap.style.display = 'none'; return; }
    nuovoWrap.style.display = '';
    document.getElementById('mappa-pin-nuovo-label').textContent = 'Nome del nuovo ' + (tipo === 'luoghi' ? 'Luogo' : 'PNG');
    const tipoLuogoWrap = document.getElementById('mappa-pin-nuovo-tipo-wrap');
    if (tipo === 'luoghi') {
      tipoLuogoWrap.style.display = '';
      const campoTipo = WikiSections._getCfg('luoghi').fields.find(f => f.key === 'tipo');
      const sel = document.getElementById('mappa-pin-nuovo-tipo');
      sel.innerHTML = (campoTipo?.options || []).map(o => '<option value="' + _escHtml(o) + '">' + _escHtml(o) + '</option>').join('');
    } else {
      tipoLuogoWrap.style.display = 'none';
    }
  };

  const confermaNuovoPin = () => {
    const modifica = !!_editingPinId;
    if (!modifica && !_pendingPin) return;
    const tipo = document.getElementById('mappa-pin-tipo').value || null;
    const colore = _pinColoreScelto || COLORI[0];
    let entitaId = null, label = '', sottotipo = '', note = '';
    if (tipo) {
      entitaId = document.getElementById('mappa-pin-entita')?.value || null;
      if (!entitaId) { Toast.show('Scegli a cosa collegare il pin', 'warning'); return; }

      if (entitaId === '__nuovo__') {
        const nomeNuovo = document.getElementById('mappa-pin-nuovo-nome')?.value?.trim() || '';
        if (!nomeNuovo) { Toast.show('Scrivi un nome per la nuova scheda', 'warning'); return; }
        const cfg = WikiSections._getCfg(tipo);
        const item = cfg.newItem();
        item.nome = nomeNuovo;
        if (tipo === 'luoghi') {
          const tipoLuogo = document.getElementById('mappa-pin-nuovo-tipo')?.value;
          if (tipoLuogo) item.tipo = tipoLuogo;
        }
        cfg.saveItem(_getCamp(), item);
        try { WikiSections.renderCounters(); } catch(e) {}
        entitaId = item.id;
        Toast.show((tipo === 'luoghi' ? 'Luogo' : 'PNG') + ' "' + nomeNuovo + '" creato nella Wiki', 'success', 2500);
      }
    } else {
      label = document.getElementById('mappa-pin-label')?.value?.trim() || '';
      if (!label) { Toast.show('Scrivi un’etichetta per il pin', 'warning'); return; }
      sottotipo = document.getElementById('mappa-pin-icona-libera')?.value || '';
      note = document.getElementById('mappa-pin-note')?.value?.trim() || '';
    }

    if (modifica) {
      _aggiornaMappaAttiva(m => ({
        ...m,
        pins: (m.pins || []).map(p => p.id === _editingPinId
          ? { ...p, entitaId, label, sottotipo, note, colore }
          : p),
      }));
      _editingPinId = null;
      Modal.close('mappa-pin');
      _renderPins();
      Toast.show('Pin aggiornato', 'success', 1500);
      return;
    }

    const nuovoPin = {
      id: 'pin_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      x: _pendingPin.x, y: _pendingPin.y, tipo, entitaId, label, sottotipo, note, colore,
    };
    _aggiornaMappaAttiva(m => ({ ...m, pins: [...(m.pins || []), nuovoPin] }));
    _pendingPin = null;
    Modal.close('mappa-pin');
    _renderPins();
    Toast.show('Pin aggiunto', 'success', 1500);
  };

  /* ── Click su un pin esistente: popover, oppure completa una misura in corso ── */

  const onPinClick = (pinId, ev) => {
    ev.stopPropagation();
    if (_misuraDa) {
      if (_misuraDa === pinId) { _misuraDa = null; return; }
      _completaMisura(_misuraDa, pinId);
      _misuraDa = null;
      return;
    }
    _apriPopoverPin(pinId, ev);
  };

  const _trovaPin = (pinId) => (_getMappaAttiva()?.pins || []).find(p => p.id === pinId);

  const _apriPopoverPin = (pinId, ev) => {
    const pin = _trovaPin(pinId);
    if (!pin) return;
    const camp = _getCamp();
    let nome = pin.label || '(senza nome)';
    let cfg = null, item = null, mappaCollegata = null;
    if (pin.tipo === 'mappa') {
      mappaCollegata = _getMappe().find(m => m.id === pin.entitaId);
      nome = mappaCollegata ? mappaCollegata.nome : '(mappa eliminata)';
    } else if (pin.tipo) {
      cfg = WikiSections._getCfg(pin.tipo);
      item = cfg && (cfg.getData(camp) || []).find(x => x.id === pin.entitaId);
      if (item) nome = item.nome;
    }
    const pop = document.getElementById('mappa-pin-popover');
    pop.innerHTML =
      '<div style="font-family:var(--font-display);font-size:0.9rem;margin-bottom:' + (pin.note ? '4' : '8') + 'px;">' + _escHtml(nome) + '</div>' +
      (pin.note ? '<div class="text-sm text-muted" style="margin-bottom:8px;white-space:pre-wrap;max-width:220px;">' + _escHtml(pin.note) + '</div>' : '') +
      '<div style="display:flex;flex-direction:column;gap:4px;">' +
        (item ? '<button class="btn btn-secondary btn-sm" onclick="QuickView.open(\'' + pin.tipo + '\',\'' + pin.entitaId + '\');document.getElementById(\'mappa-pin-popover\').style.display=\'none\';">Apri scheda</button>' : '') +
        (mappaCollegata ? '<button class="btn btn-secondary btn-sm" onclick="MappaUI.entraInMappa(\'' + mappaCollegata.id + '\')">Apri questa mappa</button>' : '') +
        '<button class="btn btn-ghost btn-sm" onclick="MappaUI.modificaPin(\'' + pinId + '\')">Modifica pin</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="MappaUI.iniziaMisuraDaPin(\'' + pinId + '\')">Misura distanza da qui</button>' +
        '<button class="btn btn-ghost btn-sm" style="color:var(--accent-danger);" onclick="MappaUI.rimuoviPin(\'' + pinId + '\')">Rimuovi pin</button>' +
      '</div>';
    const rect = ev.target.closest('.mappa-pin').getBoundingClientRect();
    pop.style.left = Math.min(rect.left, window.innerWidth - 220) + 'px';
    pop.style.top = (rect.bottom + 6) + 'px';
    pop.style.display = 'block';
  };

  const rimuoviPin = (pinId) => {
    document.getElementById('mappa-pin-popover').style.display = 'none';
    openConfirmModal('Rimuovere il pin?', '', () => {
      _aggiornaMappaAttiva(m => ({ ...m, pins: (m.pins || []).filter(p => p.id !== pinId) }));
      _renderPins();
      Toast.show('Pin rimosso', 'info', 1500);
    });
  };

  /* ── Distanza e tempo di viaggio ── */

  const iniziaMisuraDaPin = (pinId) => {
    document.getElementById('mappa-pin-popover').style.display = 'none';
    _misuraDa = pinId;
    Toast.show('Ora clicca un secondo pin per misurare la distanza (Esc per annullare)', 'info', 3500);
  };

  const _completaMisura = (id1, id2) => {
    const mappa = _getMappaAttiva();
    const p1 = _trovaPin(id1), p2 = _trovaPin(id2);
    if (!mappa || !p1 || !p2) return;
    const scalaKm = mappa.scalaKm || 0;
    if (!scalaKm) { Toast.show('Imposta prima la larghezza reale della mappa in "Modifica mappa"', 'warning', 3500); return; }

    const img = document.getElementById('mappa-img');
    const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
    const dxKm = (p2.x - p1.x) * scalaKm;
    const dyKm = (p2.y - p1.y) * scalaKm * (h / w);
    const distanzaKm = Math.sqrt(dxKm * dxKm + dyKm * dyKm);

    _mostraRisultatoMisura(p1, p2, distanzaKm);
  };

  const _nomePin = (p) => {
    if (!p.tipo) return p.label || '(senza nome)';
    if (p.tipo === 'mappa') return (_getMappe().find(m => m.id === p.entitaId) || {}).nome || '(mappa eliminata)';
    const cfg = WikiSections._getCfg(p.tipo);
    const item = cfg && (cfg.getData(_getCamp()) || []).find(x => x.id === p.entitaId);
    return item ? item.nome : (p.label || '(senza nome)');
  };

  const _mostraRisultatoMisura = (p1, p2, distanzaKm) => {
    if (!document.getElementById('modal-mappa-distanza')) {
      const m = document.createElement('div');
      m.className = 'modal-overlay hidden';
      m.id = 'modal-mappa-distanza';
      m.style.display = 'none';
      m.onclick = (e) => { if (e.target === m) Modal.close('mappa-distanza'); };
      m.innerHTML =
        '<div class="modal" style="max-width:420px;">' +
          '<div class="modal-header"><h3 class="modal-title" id="mappa-dist-titolo">Distanza</h3>' +
            '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'mappa-distanza\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div id="mappa-dist-km" style="font-family:var(--font-mono);font-size:1.3rem;color:var(--accent-primary);margin-bottom:12px;"></div>' +
            '<div class="form-group"><label class="form-label">Terreno</label><select id="mappa-dist-terreno" class="form-select" onchange="MappaUI._ricalcolaMisura()"></select></div>' +
            '<div id="mappa-dist-tabella"></div>' +
          '</div>' +
          '<div class="modal-footer"><button class="btn btn-primary" style="width:100%;" onclick="Modal.close(\'mappa-distanza\')">Chiudi</button></div>' +
        '</div>';
      document.body.appendChild(m);
      const sel = m.querySelector('#mappa-dist-terreno');
      sel.innerHTML = Object.keys(TERRENO_LABEL).map(t => '<option value="' + t + '"' + (t === 'strada' ? ' selected' : '') + '>' + TERRENO_LABEL[t] + '</option>').join('');
    }
    _misuraCorrente = { p1, p2, distanzaKm };
    document.getElementById('mappa-dist-titolo').textContent = _nomePin(p1) + ' → ' + _nomePin(p2);
    document.getElementById('mappa-dist-km').textContent = Math.round(distanzaKm * 10) / 10 + ' km in linea d’aria';
    _ricalcolaMisura();
    Modal.open('mappa-distanza');
  };

  let _misuraCorrente = null;

  const _ricalcolaMisura = () => {
    if (!_misuraCorrente) return;
    const terreno = document.getElementById('mappa-dist-terreno')?.value || 'strada';
    const mult = TERRENO_MULT[terreno] || 1;
    const righe = Object.keys(VEL_BASE).map(mezzo => {
      const kmGiorno = VEL_BASE[mezzo].normale * mult;
      const giorni = _misuraCorrente.distanzaKm / kmGiorno;
      const giorniStr = giorni < 1 ? Math.round(giorni * 24 * 10) / 10 + ' ore' : Math.round(giorni * 10) / 10 + ' giorni';
      return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:0.85rem;">' +
        '<span>' + MEZZO_LABEL[mezzo] + '</span>' +
        '<span style="font-family:var(--font-mono);color:var(--text-secondary);">' + giorniStr + ' <span class="text-muted" style="font-size:0.75rem;">(' + Math.round(kmGiorno) + ' km/g)</span></span>' +
      '</div>';
    }).join('');
    document.getElementById('mappa-dist-tabella').innerHTML = righe;
  };

  const init = () => {
    _injectModals();
    if (!_navStack.length) {
      const mappe = _getMappe();
      if (mappe.length) _navStack = [mappe[0].id];
    }
    _render();
  };

  return {
    init, zoom, zoomReset,
    vaiAMappa, tornaIndietro, entraInMappa, nuovaMappa, eliminaMappaCorrente,
    apriImpostazioni, salvaImpostazioni, _onFilePicked,
    apriModalNuovoPin, confermaNuovoPin, modificaPin, _onPinTipoChange, _onPinEntitaChange, _pickColore,
    onPinClick, rimuoviPin, iniziaMisuraDaPin, _ricalcolaMisura,
  };
})();

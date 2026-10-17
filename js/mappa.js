/* ============================================================
   MAPPA.JS — Mappa interattiva con pin collegati al Mondo.

   Una campagna puo' avere una mappa (un'immagine a scelta: disegno,
   scansione, mappa generata altrove) con sopra dei pin. Ogni pin puo'
   essere collegato a un Luogo o un PNG gia' esistenti nella Wiki
   (click -> QuickView, lo stesso pannello laterale delle @menzioni)
   oppure essere un'etichetta libera senza scheda collegata.

   E' anche possibile calcolare la distanza tra due pin e il tempo di
   viaggio a piedi/cavallo/barca/nave, riusando gli stessi ritmi di
   viaggio ufficiali (Normale/Veloce/Lento) gia' presenti nei dati SRD
   del Compendio — gli stessi numeri di Generatori.calcViaggio.

   Solo UNA mappa per campagna in questa prima versione (niente mappe
   multiple o "mappa dentro la mappa"): se servisse di piu' si estende
   in un secondo momento senza toccare il resto.

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

  let _scale = 1, _panX = 0, _panY = 0;
  let _dragging = false, _dragMoved = false, _lastClientX = 0, _lastClientY = 0;
  let _pendingPin = null;   // {x,y} in attesa di conferma dal modal "Nuovo pin"
  let _misuraDa = null;     // id del primo pin scelto per la misura distanza
  let _pinColoreScelto = COLORI[0];

  const _escHtml = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const _getCamp = () => App.getActiveCampaign();
  const _getMappa = () => _getCamp()?.mappa || null;
  const _saveMappa = (mappa) => App.saveActiveCampaign({ mappa });

  /* ── Pagina ── */

  const _injectPage = () => {
    const page = document.getElementById('page-mappa');
    if (!page || page.dataset.ready) return;
    page.dataset.ready = '1';
    page.innerHTML =
      '<div style="display:flex;flex-direction:column;height:100%;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:var(--space-md) var(--space-lg);border-bottom:1px solid var(--border);flex-wrap:wrap;">' +
          '<div>' +
            '<h1 class="page-title" style="margin:0;">Mappa</h1>' +
            '<p class="page-subtitle" style="margin:2px 0 0;">Click su uno spazio vuoto per aggiungere un pin, click su un pin per aprirlo</p>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
            '<button class="btn btn-ghost btn-icon-sm" onclick="MappaUI.zoom(-0.2)" title="Riduci">−</button>' +
            '<button class="btn btn-ghost btn-sm" onclick="MappaUI.zoomReset()" id="mappa-zoom-label" style="min-width:48px;">100%</button>' +
            '<button class="btn btn-ghost btn-icon-sm" onclick="MappaUI.zoom(0.2)" title="Ingrandisci">+</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="MappaUI.apriImpostazioni()">Modifica mappa</button>' +
          '</div>' +
        '</div>' +
        '<div id="mappa-canvas" style="flex:1;position:relative;overflow:hidden;background:var(--bg-tertiary);cursor:grab;touch-action:none;">' +
          '<div id="mappa-vuota" style="display:none;position:absolute;inset:0;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:24px;">' +
            '<div style="opacity:0.4;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg></div>' +
            '<div><h3 style="margin:0 0 4px;">Nessuna mappa caricata</h3><p class="text-sm text-muted" style="margin:0;max-width:340px;">Carica un’immagine (un disegno, una scansione, una mappa fatta altrove) e inizia a segnare luoghi e PNG sopra.</p></div>' +
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

  const _render = () => {
    _injectPage();
    const mappa = _getMappa();
    const vuota = document.getElementById('mappa-vuota');
    const inner = document.getElementById('mappa-inner');
    const img = document.getElementById('mappa-img');
    if (!mappa || !mappa.immagine) {
      if (vuota) vuota.style.display = 'flex';
      if (inner) inner.style.display = 'none';
      return;
    }
    if (vuota) vuota.style.display = 'none';
    if (inner) inner.style.display = '';
    if (img.src !== mappa.immagine) img.src = mappa.immagine;
    _renderPins();
  };

  const _renderPins = () => {
    const mappa = _getMappa();
    const wrap = document.getElementById('mappa-pins');
    if (!mappa || !wrap) return;
    const camp = _getCamp();
    wrap.innerHTML = (mappa.pins || []).map(p => {
      let nome = p.label || '(senza nome)';
      if (p.tipo) {
        const cfg = WikiSections._getCfg(p.tipo);
        const item = cfg && (cfg.getData(camp) || []).find(x => x.id === p.entitaId);
        if (item) nome = item.nome;
      }
      const colore = p.colore || COLORI[0];
      return (
        '<div class="mappa-pin" data-pin-id="' + p.id + '" title="' + _escHtml(nome) + '" ' +
          'style="position:absolute;left:' + (p.x * 100) + '%;top:' + (p.y * 100) + '%;transform:translate(-50%,-100%);cursor:pointer;z-index:2;" ' +
          'onclick="MappaUI.onPinClick(\'' + p.id + '\', event)">' +
          '<svg width="26" height="26" viewBox="0 0 24 24" fill="' + colore + '" stroke="#fff" stroke-width="1.2"><path d="M12 0C7 0 3 4 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-5-4-9-9-9z"/><circle cx="12" cy="9" r="3" fill="#fff"/></svg>' +
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
    if (!_getMappa()?.immagine) return;
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
    if (!_getMappa()?.immagine) return;
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.15 : -0.15);
  };

  // Click sul canvas: se e' stato un trascinamento (pan) lo ignora; se e' stato un
  // click su un pin, ci pensa gia' il suo onclick (con stopPropagation); altrimenti
  // e' un click su sfondo vuoto -> propone di aggiungere un pin li'.
  const _onCanvasClick = (e) => {
    if (_dragMoved) { _dragMoved = false; return; }
    if (e.target.closest('.mappa-pin')) return;
    const mappa = _getMappa();
    if (!mappa || !mappa.immagine) return;
    const inner = document.getElementById('mappa-inner');
    const rect = inner.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;

    if (_misuraDa) { Toast.show('Stavi misurando una distanza: scegli un pin, non uno spazio vuoto. Click destro/Esc per annullare.', 'info', 3500); return; }
    apriModalNuovoPin(fx, fy);
  };

  /* ── Impostazioni mappa (URL immagine + scala) ── */

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
            '<label class="form-label">URL immagine</label>' +
            '<input type="text" id="mappa-set-url" class="form-input" placeholder="https://...">' +
            '<div class="form-hint">Un link a un’immagine (imgur, drive condiviso...). Il caricamento da dispositivo qui sotto e’ solo anteprima e non si salva.</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="btn btn-ghost btn-sm" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
              'Carica dal dispositivo (anteprima)' +
              '<input type="file" id="mappa-set-file" accept="image/*" style="display:none;" onchange="MappaUI._onFilePicked()">' +
            '</label>' +
          '</div>' +
          '<div id="mappa-set-preview" style="display:none;margin-bottom:12px;border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border);"><img style="width:100%;display:block;"></div>' +
          '<div class="form-group">' +
            '<label class="form-label">Larghezza reale della mappa (km)</label>' +
            '<input type="number" id="mappa-set-scala" class="form-input" min="0.1" step="0.1" placeholder="es. 300">' +
            '<div class="form-hint">Quanti km copre l’immagine da un bordo all’altro — serve per calcolare le distanze tra i pin.</div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-ghost" onclick="Modal.close(\'mappa-settings\')">Annulla</button>' +
          '<button class="btn btn-primary" onclick="MappaUI.salvaImpostazioni()">Salva</button>' +
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
        '<div class="modal-header"><h3 class="modal-title">Nuovo pin</h3>' +
          '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'mappa-pin\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label class="form-label">Collegato a</label>' +
            '<select id="mappa-pin-tipo" class="form-select" onchange="MappaUI._onPinTipoChange()">' +
              '<option value="">Etichetta libera (nessuna scheda)</option>' +
              '<option value="luoghi">Un Luogo esistente</option>' +
              '<option value="png">Un PNG esistente</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group" id="mappa-pin-entita-wrap" style="display:none;">' +
            '<label class="form-label">Quale</label>' +
            '<select id="mappa-pin-entita" class="form-select"></select>' +
          '</div>' +
          '<div class="form-group" id="mappa-pin-label-wrap"><label class="form-label">Etichetta</label>' +
            '<input type="text" id="mappa-pin-label" class="form-input" placeholder="es. Ponte crollato, Accampamento banditi...">' +
          '</div>' +
          '<div class="form-group"><label class="form-label">Colore</label>' +
            '<div id="mappa-pin-colori" style="display:flex;gap:6px;"></div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-ghost" onclick="Modal.close(\'mappa-pin\')">Annulla</button>' +
          '<button class="btn btn-primary" onclick="MappaUI.confermaNuovoPin()">Aggiungi pin</button>' +
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
    const mappa = _getMappa();
    document.getElementById('mappa-set-url').value = mappa?.immagine || '';
    document.getElementById('mappa-set-scala').value = mappa?.scalaKm || '';
    document.getElementById('mappa-set-preview').style.display = 'none';
    document.getElementById('mappa-set-file').value = '';
    Modal.open('mappa-settings');
  };

  const _onFilePicked = () => {
    const input = document.getElementById('mappa-set-file');
    const file = input?.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { Toast.show('Immagine troppo grande (max 4MB)', 'warning'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const prev = document.getElementById('mappa-set-preview');
      prev.querySelector('img').src = e.target.result;
      prev.style.display = 'block';
      Toast.show('Anteprima temporanea — serve un URL esterno per salvarla davvero', 'info', 4000);
    };
    reader.readAsDataURL(file);
  };

  const salvaImpostazioni = () => {
    const url = document.getElementById('mappa-set-url')?.value?.trim() || '';
    const scala = parseFloat(document.getElementById('mappa-set-scala')?.value) || 0;
    const mappaPrecedente = _getMappa() || { pins: [] };
    const mappa = { ...mappaPrecedente, immagine: url, scalaKm: scala, pins: mappaPrecedente.pins || [] };
    _saveMappa(mappa);
    Modal.close('mappa-settings');
    zoomReset();
    _render();
    Toast.show('Mappa aggiornata', 'success');
  };

  /* ── Nuovo pin ── */

  const apriModalNuovoPin = (fx, fy) => {
    _injectModals();
    _pendingPin = { x: fx, y: fy };
    document.getElementById('mappa-pin-tipo').value = '';
    document.getElementById('mappa-pin-entita-wrap').style.display = 'none';
    document.getElementById('mappa-pin-label-wrap').style.display = '';
    document.getElementById('mappa-pin-label').value = '';
    _pinColoreScelto = COLORI[0];
    const colWrap = document.getElementById('mappa-pin-colori');
    colWrap.innerHTML = COLORI.map((c, i) =>
      '<span class="mappa-pin-colore-opt" data-colore="' + c + '" onclick="MappaUI._pickColore(this)" style="width:22px;height:22px;border-radius:50%;background:' + c + ';cursor:pointer;border:2px solid ' + (i === 0 ? 'var(--text-primary)' : 'transparent') + ';display:inline-block;"></span>'
    ).join('');
    Modal.open('mappa-pin');
  };

  const _pickColore = (el) => {
    document.querySelectorAll('.mappa-pin-colore-opt').forEach(o => o.style.border = '2px solid transparent');
    el.style.border = '2px solid var(--text-primary)';
    _pinColoreScelto = el.dataset.colore;
  };

  const _onPinTipoChange = () => {
    const tipo = document.getElementById('mappa-pin-tipo').value;
    const entitaWrap = document.getElementById('mappa-pin-entita-wrap');
    const labelWrap = document.getElementById('mappa-pin-label-wrap');
    if (!tipo) {
      entitaWrap.style.display = 'none';
      labelWrap.style.display = '';
      return;
    }
    entitaWrap.style.display = '';
    labelWrap.style.display = 'none';
    const cfg = WikiSections._getCfg(tipo);
    const items = (cfg.getData(_getCamp()) || []).slice().sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    const sel = document.getElementById('mappa-pin-entita');
    sel.innerHTML = items.length
      ? items.map(x => '<option value="' + x.id + '">' + _escHtml(x.nome) + '</option>').join('')
      : '<option value="">Nessuno ancora nella Wiki</option>';
  };

  const confermaNuovoPin = () => {
    if (!_pendingPin) return;
    const tipo = document.getElementById('mappa-pin-tipo').value || null;
    const colore = _pinColoreScelto || COLORI[0];
    let entitaId = null, label = '';
    if (tipo) {
      entitaId = document.getElementById('mappa-pin-entita')?.value || null;
      if (!entitaId) { Toast.show('Scegli a cosa collegare il pin', 'warning'); return; }
    } else {
      label = document.getElementById('mappa-pin-label')?.value?.trim() || '';
      if (!label) { Toast.show('Scrivi un’etichetta per il pin', 'warning'); return; }
    }
    const mappa = _getMappa() || { pins: [] };
    const pins = [...(mappa.pins || []), {
      id: 'pin_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      x: _pendingPin.x, y: _pendingPin.y, tipo, entitaId, label, colore,
    }];
    _saveMappa({ ...mappa, pins });
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

  const _trovaPin = (pinId) => (_getMappa()?.pins || []).find(p => p.id === pinId);

  const _apriPopoverPin = (pinId, ev) => {
    const pin = _trovaPin(pinId);
    if (!pin) return;
    const camp = _getCamp();
    let nome = pin.label || '(senza nome)';
    let cfg = null, item = null;
    if (pin.tipo) {
      cfg = WikiSections._getCfg(pin.tipo);
      item = cfg && (cfg.getData(camp) || []).find(x => x.id === pin.entitaId);
      if (item) nome = item.nome;
    }
    const pop = document.getElementById('mappa-pin-popover');
    pop.innerHTML =
      '<div style="font-family:var(--font-display);font-size:0.9rem;margin-bottom:8px;">' + _escHtml(nome) + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:4px;">' +
        (item ? '<button class="btn btn-secondary btn-sm" onclick="QuickView.open(\'' + pin.tipo + '\',\'' + pin.entitaId + '\');document.getElementById(\'mappa-pin-popover\').style.display=\'none\';">Apri scheda</button>' : '') +
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
      const mappa = _getMappa();
      if (!mappa) return;
      _saveMappa({ ...mappa, pins: (mappa.pins || []).filter(p => p.id !== pinId) });
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
    const mappa = _getMappa();
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
    _render();
  };

  return {
    init, zoom, zoomReset,
    apriImpostazioni, salvaImpostazioni, _onFilePicked,
    apriModalNuovoPin, confermaNuovoPin, _onPinTipoChange, _pickColore,
    onPinClick, rimuoviPin, iniziaMisuraDaPin, _ricalcolaMisura,
  };
})();

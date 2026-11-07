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
  let _percorso = null;     // percorso in corso: { mappaId, punti: [{ x, y, pinId? }] } (coordinate 0..1)
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
            '<button class="btn btn-secondary btn-sm" onclick="MappaUI.iniziaPercorso()" title="Misura un percorso a tappe e i tempi di viaggio">Percorso</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="MappaUI.apriImpostazioni()">Modifica mappa</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="App.navigateTo(\'cartografo\')">Genera una mappa</button>' +
          '</div>' +
        '</div>' +
        '<p class="page-subtitle" style="margin:0;padding:0 var(--space-lg) var(--space-sm);">Click su uno spazio vuoto per aggiungere un pin, click su un pin per aprirlo. Un pin puo\' anche aprire un\'altra mappa (es. la mappa di una citta\' o di un dungeon). Con Percorso misuri un viaggio a tappe.</p>' +
        '<div id="mappa-canvas" style="flex:1;position:relative;overflow:hidden;background:var(--bg-tertiary);cursor:grab;touch-action:none;">' +
          '<div id="mappa-vuota" style="display:none;position:absolute;inset:0;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:24px;">' +
            '<div style="opacity:0.4;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg></div>' +
            '<div><h3 id="mappa-vuota-titolo" style="margin:0 0 4px;">Nessuna mappa ancora</h3><p id="mappa-vuota-testo" class="text-sm text-muted" style="margin:0 auto;max-width:420px;line-height:1.55;">Carica un’immagine (un disegno, una scansione, una mappa fatta altrove) e inizia a segnare luoghi e PNG sopra.</p></div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">' +
              '<button class="btn btn-primary btn-sm" onclick="MappaUI.apriImpostazioni()">Carica una mappa</button>' +
              '<button class="btn btn-secondary btn-sm" onclick="App.navigateTo(\'cartografo\')">Genera una mappa</button>' +
            '</div>' +
          '</div>' +
          '<div id="mappa-inner" style="position:absolute;left:0;top:0;transform-origin:0 0;">' +
            '<img id="mappa-img" src="" alt="Mappa" draggable="false" style="display:block;max-width:none;user-select:none;-webkit-user-drag:none;">' +
            // Sotto i pin e trasparente ai click: i pin restano cliccabili anche sopra la linea
            '<svg id="mappa-percorso" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;"></svg>' +
            '<div id="mappa-pins"></div>' +
          '</div>' +
          // I suoi click non arrivano alla mappa: premere un pulsante non aggiunge una tappa
          '<div id="mappa-percorso-pannello" role="status" aria-live="polite" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()" ' +
            'style="display:none;position:absolute;left:50%;bottom:12px;transform:translateX(-50%);z-index:5;width:max-content;max-width:calc(100% - 24px);background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);box-shadow:var(--shadow-lg);padding:10px 12px;cursor:default;"></div>' +
        '</div>' +
      '</div>';

    const canvas = document.getElementById('mappa-canvas');
    canvas.addEventListener('mousedown', _onDragStart);
    window.addEventListener('mousemove', _onDragMove);
    window.addEventListener('mouseup', _onDragEnd);
    canvas.addEventListener('touchstart', _onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', _onTouchMove, { passive: false });
    canvas.addEventListener('touchend', _onTouchEnd);
    canvas.addEventListener('touchcancel', _onTouchEnd);
    // Safari iOS: senza questo il pizzico zooma l'intera pagina invece della mappa
    canvas.addEventListener('gesturestart', (e) => e.preventDefault());
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

  const TESTO_VUOTA = 'Carica un’immagine (un disegno, una scansione, una mappa fatta altrove) e inizia a segnare luoghi e PNG sopra.';
  const _testoVuota = (t) => { const el = document.getElementById('mappa-vuota-testo'); if (el) el.textContent = t || TESTO_VUOTA; };

  const _render = () => {
    _injectPage();
    _testoVuota();
    if (!_navStack.length) {
      const mappe = _getMappe();
      _navStack = [mappe.length ? mappe[0].id : null].filter(Boolean);
    }
    _renderSelettore();
    const mappa = _getMappaAttiva();
    // Un percorso appartiene alla sua mappa: cambiandola si chiude
    if (_percorso && (!mappa || mappa.id !== _percorso.mappaId)) fermaPercorso();
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
    // Immagine caricata su un altro dispositivo senza Drive collegato: e' rimasta solo li', qui
    // arriva il segnaposto (vedi _alleggerisci in FirebaseSync). Si spiega cosa fare invece del
    // generico "immagine non disponibile".
    if (mappa.immagine === 'dm-solo-sul-dispositivo') {
      if (vuota) {
        vuota.style.display = 'flex';
        const t = document.getElementById('mappa-vuota-titolo');
        if (t) t.textContent = 'Immagine rimasta su un altro dispositivo';
        _testoVuota('L’immagine di “' + mappa.nome + '” è stata caricata su un dispositivo senza Drive collegato ed è rimasta solo lì. ' +
          'Se quel dispositivo ce l’ha ancora, aprilo con Drive collegato e fai una modifica qualsiasi: verrà caricata su Drive da sola. Altrimenti ricaricala da “Modifica mappa”.');
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
    // Le mappe del Cartografo sono grandi: si aprono intere, adattate allo spazio disponibile
    if (mappa.adatta) {
      const adatta = () => {
        const c = document.getElementById('mappa-canvas');
        if (!c || !img.naturalWidth || !c.clientWidth) return;
        _scale = Math.min(c.clientWidth / img.naturalWidth, c.clientHeight / img.naturalHeight);
        _panX = (c.clientWidth - img.naturalWidth * _scale) / 2;
        _panY = (c.clientHeight - img.naturalHeight * _scale) / 2;
        _applyTransform();
      };
      if (img.complete && img.naturalWidth) requestAnimationFrame(adatta);
      else img.onload = () => { img.onload = null; adatta(); };
    }
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

  // Mappa gia' pronta, con immagine, scala e pin (dal Cartografo): la si apre subito
  const aggiungiDaImmagine = ({ nome, immagine, scalaKm, pins, daPin }) => {
    const nuova = { id: 'mappa_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5), nome, immagine, scalaKm: scalaKm || 0, pins: pins || [], adatta: true };
    // Nata da un pin: quel pin la apre (e resta collegato alla sua scheda), e si puo' tornare indietro
    const tutte = _getMappe().map((m) => (daPin && m.id === daPin.mappaId
      ? { ...m, pins: (m.pins || []).map((p) => (p.id === daPin.pinId ? { ...p, apreMappa: nuova.id } : p)) }
      : m));
    _saveMappe([...tutte, nuova]);
    _navStack = daPin ? [daPin.mappaId, nuova.id] : [nuova.id];
    return nuova.id;
  };

  // Dal pin al Cartografo: apre il generatore gia' impostato su quel luogo
  const generaDaPin = (pinId) => {
    const pin = _trovaPin(pinId), mappa = _getMappaAttiva();
    if (!pin || !mappa) return;
    document.getElementById('mappa-pin-popover').style.display = 'none';
    let tipoLuogo = null;
    if (pin.tipo === 'luoghi') tipoLuogo = (WikiSections._getCfg('luoghi').getData(_getCamp()) || []).find((x) => x.id === pin.entitaId)?.tipo || null;
    App.navigateTo('cartografo');
    Cartografo.perPin({ mappaId: mappa.id, mappaNome: mappa.nome, pinId, nome: _nomePin(pin).replace(/^\d+\.\s*/, ''), genera: pin.genera || null, tipoLuogo });
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
      if (p.apreMappa && mappe.some((m) => m.id === p.apreMappa)) centro = ICONA_MAPPA;
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
    if (_percorso) _disegnaPercorso(); // spessori e scritte restano uguali a ogni zoom
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

  // Zoom a due dita (tablet/telefono): la scala segue la distanza tra le dita e il punto
  // della mappa che stava sotto il centro del pizzico resta sotto le dita, cosi' si puo'
  // ingrandire e spostare nello stesso gesto. Il transform ha origine 0 0, quindi un punto
  // della mappa c finisce sullo schermo in pan + scale * c.
  let _pinch = null;
  const _touchDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const _touchMid = (t, rect) => ({
    x: (t[0].clientX + t[1].clientX) / 2 - rect.left,
    y: (t[0].clientY + t[1].clientY) / 2 - rect.top,
  });

  const _onTouchStart = (e) => {
    if (e.touches.length === 2 && _getMappaAttiva()?.immagine) {
      const rect = e.currentTarget.getBoundingClientRect();
      const m = _touchMid(e.touches, rect);
      _pinch = {
        dist: _touchDist(e.touches) || 1, scale: _scale,
        cx: (m.x - _panX) / _scale, cy: (m.y - _panY) / _scale,
      };
      _dragging = false;
      _dragMoved = true; // il tap che chiude il gesto non deve proporre un nuovo pin
      return;
    }
    _onDragStart(e);
  };

  const _onTouchMove = (e) => {
    if (_pinch && e.touches.length === 2) {
      const rect = e.currentTarget.getBoundingClientRect();
      const m = _touchMid(e.touches, rect);
      _scale = Math.max(0.2, Math.min(5, _pinch.scale * _touchDist(e.touches) / _pinch.dist));
      _panX = m.x - _scale * _pinch.cx;
      _panY = m.y - _scale * _pinch.cy;
      _applyTransform();
      if (e.cancelable) e.preventDefault();
      return;
    }
    _onDragMove(e);
  };

  const _onTouchEnd = (e) => {
    if (_pinch) {
      _pinch = null;
      // Se resta un dito appoggiato si continua a spostare la mappa da li', senza salti
      if (e.touches.length === 1) {
        const p = _pt(e);
        _dragging = true;
        _lastClientX = p.x; _lastClientY = p.y;
      }
      return;
    }
    _onDragEnd();
  };

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

    if (_percorso) { _aggiungiTappa({ x: fx, y: fy }); return; }
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
            '<input type="number" id="mappa-set-scala" class="form-input" min="0" step="any" placeholder="es. 300">' +
            '<div class="form-hint">Quanti km copre l’immagine da un bordo all’altro — serve per calcolare le distanze tra i pin.</div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer" style="justify-content:space-between;">' +
          '<button class="btn btn-ghost" id="mappa-set-elimina" style="color:var(--danger-text);" onclick="MappaUI.eliminaMappaCorrente()">Elimina mappa</button>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">' +
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
      if (e.key !== 'Escape' || !_percorso) return;
      // Con una finestra aperta (i tempi, o un'altra) Esc chiude solo quella, ci pensa Modal: il
      // percorso resta. Il controllo avviene in cattura, prima che Modal la chiuda.
      if ([...document.querySelectorAll('.modal-overlay')].some(m => m.style.display === 'flex')) return;
      fermaPercorso();
    }, true);
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
        : 'Google Drive non è collegato: la mappa resta solo su questo dispositivo (non arriva agli altri né sul cloud). Collega Drive dalle Impostazioni per vederla ovunque e non riempire lo spazio del browser.';
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
          : (p.apreMappa === mappa.id ? { ...p, apreMappa: null } : p)),
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
    if (_percorso) {
      const pin = _trovaPin(pinId);
      if (pin) _aggiungiTappa({ x: pin.x, y: pin.y, pinId });
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
        (pin.tipo === 'mappa' ? '' : (_getMappe().some((m) => m.id === pin.apreMappa)
          ? '<button class="btn btn-primary btn-sm" onclick="MappaUI.entraInMappa(\'' + pin.apreMappa + '\')">Apri la sua mappa</button>'
          : '<button class="btn btn-secondary btn-sm" onclick="MappaUI.generaDaPin(\'' + pinId + '\')">Genera la sua mappa</button>')) +
        '<button class="btn btn-ghost btn-sm" onclick="MappaUI.modificaPin(\'' + pinId + '\')">Modifica pin</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="MappaUI.iniziaPercorso(\'' + pinId + '\')">Misura o percorso da qui</button>' +
        '<button class="btn btn-ghost btn-sm" style="color:var(--danger-text);" onclick="MappaUI.rimuoviPin(\'' + pinId + '\')">Rimuovi pin</button>' +
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

  // Un percorso e' una serie di tappe: segnaposto o punti qualsiasi della mappa (una curva della
  // strada, un passo di montagna). Con due tappe e' la vecchia misura in linea d'aria.
  const iniziaPercorso = (pinId) => {
    const pop = document.getElementById('mappa-pin-popover');
    if (pop) pop.style.display = 'none';
    const mappa = _getMappaAttiva();
    if (!mappa || !mappa.immagine) return;
    if (!mappa.scalaKm) { Toast.show('Imposta prima la larghezza reale della mappa in "Modifica mappa"', 'warning', 3500); return; }
    _percorso = { mappaId: mappa.id, punti: [] };
    const pin = pinId ? _trovaPin(pinId) : null;
    if (pin) _percorso.punti.push({ x: pin.x, y: pin.y, pinId });
    _disegnaPercorso();
  };

  const _aggiungiTappa = (pt) => {
    const ultimo = _percorso.punti[_percorso.punti.length - 1];
    if (ultimo && Math.abs(ultimo.x - pt.x) < 1e-4 && Math.abs(ultimo.y - pt.y) < 1e-4) return; // doppio clic sullo stesso punto
    _percorso.punti.push(pt);
    _disegnaPercorso();
  };

  const annullaTappa = () => { if (_percorso) { _percorso.punti.pop(); _disegnaPercorso(); } };
  const fermaPercorso = () => { _percorso = null; _disegnaPercorso(); };

  const _kmTra = (a, b) => {
    const mappa = _getMappaAttiva();
    const img = document.getElementById('mappa-img');
    const w = img?.naturalWidth || 1, h = img?.naturalHeight || 1;
    const scalaKm = mappa?.scalaKm || 0;
    const dx = (b.x - a.x) * scalaKm, dy = (b.y - a.y) * scalaKm * (h / w);
    return Math.sqrt(dx * dx + dy * dy);
  };
  const _kmPercorso = () => (_percorso?.punti || []).reduce((tot, p, i, arr) => i ? tot + _kmTra(arr[i - 1], p) : 0, 0);
  // Le mappe di citta', dungeon e case misurano pochi metri: in km sarebbero "0.1"
  const _fmtDist = (km) => km < 1 ? Math.round(km * 1000) + ' metri' : (Math.round(km * 10) / 10).toLocaleString('it-IT') + ' km';
  const _nomeTappa = (p, senzaNome) => { const pin = p.pinId && _trovaPin(p.pinId); return pin ? _nomePin(pin) : senzaNome; };

  const _disegnaPercorso = () => {
    const svg = document.getElementById('mappa-percorso');
    const pannello = document.getElementById('mappa-percorso-pannello');
    if (!svg || !pannello) return;
    if (!_percorso) { svg.innerHTML = ''; pannello.style.display = 'none'; return; }
    const img = document.getElementById('mappa-img');
    const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    // Misure in pixel dello schermo, divise per lo zoom: la linea non diventa un nastro ingrandendo
    const s = 1 / (_scale || 1);
    const pts = _percorso.punti.map(p => [p.x * w, p.y * h]);
    const linea = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    let disegno = '';
    if (pts.length > 1) {
      disegno += '<polyline points="' + linea + '" fill="none" stroke="#000" stroke-opacity="0.55" stroke-width="' + (6 * s) + '" stroke-linecap="round" stroke-linejoin="round"/>';
      // Un tratto alla volta: quelli in mare sono azzurri, gli altri dorati
      for (let i = 1; i < pts.length; i++) {
        const mare = _percorso.punti[i].terreno === 'mare';
        disegno += '<line x1="' + pts[i - 1][0] + '" y1="' + pts[i - 1][1] + '" x2="' + pts[i][0] + '" y2="' + pts[i][1] + '" stroke="' + (mare ? '#7cc4f5' : '#f2c14e') + '" stroke-width="' + (3 * s) + '" stroke-dasharray="' + (10 * s) + ' ' + (6 * s) + '" stroke-linecap="round"/>';
      }
      // La lunghezza di ogni tratto, a meta' del tratto
      for (let i = 1; i < pts.length; i++) {
        const mx = (pts[i - 1][0] + pts[i][0]) / 2, my = (pts[i - 1][1] + pts[i][1]) / 2;
        disegno += '<text x="' + mx + '" y="' + (my - 8 * s) + '" text-anchor="middle" font-size="' + (13 * s) + '" font-family="var(--font-mono, monospace)" fill="#fff" stroke="#000" stroke-width="' + (3 * s) + '" stroke-opacity="0.75" paint-order="stroke">' + _fmtDist(_kmTra(_percorso.punti[i - 1], _percorso.punti[i])) + '</text>';
      }
    }
    pts.forEach((p, i) => {
      const estremo = i === 0 || i === pts.length - 1;
      disegno += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + ((estremo ? 6 : 4.5) * s) + '" fill="' + (estremo ? '#f2c14e' : '#fff') + '" stroke="#000" stroke-opacity="0.7" stroke-width="' + (1.5 * s) + '"/>';
    });
    svg.innerHTML = disegno;

    const n = _percorso.punti.length;
    const tratti = n - 1;
    pannello.style.display = 'block';
    pannello.innerHTML =
      '<div style="font-size:0.85rem;line-height:1.4;margin-bottom:8px;">' +
        (n < 2
          ? '<strong>Percorso</strong>: ' + (n ? 'ora clicca la tappa successiva' : 'clicca un segnaposto o un punto della mappa per partire')
          : '<strong>' + _fmtDist(_kmPercorso()) + '</strong> in ' + tratti + (tratti === 1 ? ' tratto' : ' tratti') + ' <span class="text-muted">· continua a cliccare per aggiungere tappe</span>') +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
        (n ? '<button type="button" class="btn btn-ghost btn-sm" onclick="MappaUI.annullaTappa()">Annulla ultima tappa</button>' : '') +
        (n > 1 ? '<button type="button" class="btn btn-primary btn-sm" onclick="MappaUI.mostraTempiPercorso()">Tempi di viaggio</button>' : '') +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="MappaUI.fermaPercorso()">Fine</button>' +
      '</div>';
  };

  const mostraTempiPercorso = () => {
    if (!_percorso || _percorso.punti.length < 2) return;
    const punti = _percorso.punti;
    const intermedie = punti.length - 2;
    const titolo = _nomeTappa(punti[0], 'Partenza') + ' → ' + _nomeTappa(punti[punti.length - 1], 'Arrivo') + (intermedie ? ' (' + intermedie + (intermedie === 1 ? ' tappa' : ' tappe') + ' in mezzo)' : '');
    _mostraRisultatoMisura(titolo, _kmPercorso(), intermedie ? 'lungo il percorso' : 'in linea d’aria');
  };

  const _nomePin = (p) => {
    if (!p.tipo) return p.label || '(senza nome)';
    if (p.tipo === 'mappa') return (_getMappe().find(m => m.id === p.entitaId) || {}).nome || '(mappa eliminata)';
    const cfg = WikiSections._getCfg(p.tipo);
    const item = cfg && (cfg.getData(_getCamp()) || []).find(x => x.id === p.entitaId);
    return item ? item.nome : (p.label || '(senza nome)');
  };

  const _mostraRisultatoMisura = (titolo, distanzaKm, come) => {
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
            '<div id="mappa-dist-km" style="font-family:var(--font-mono);font-size:1.3rem;color:var(--accent-text);margin-bottom:12px;"></div>' +
            '<div id="mappa-dist-corpo"></div>' +
          '</div>' +
          '<div class="modal-footer"><button class="btn btn-primary" style="width:100%;" onclick="Modal.close(\'mappa-distanza\')">Chiudi</button></div>' +
        '</div>';
      document.body.appendChild(m);
    }
    document.getElementById('mappa-dist-titolo').textContent = titolo;
    document.getElementById('mappa-dist-km').textContent = _fmtDist(distanzaKm) + ' ' + come;
    _ricalcolaMisura();
    Modal.open('mappa-distanza');
  };

  // Mezzi e passo scelti nella finestra dei tempi: restano per i percorsi successivi
  const _viaggio = { terra: 'piedi', mare: 'nave', ritmo: 'normale' };
  const RITMO_LABEL = { lento: 'Lento', normale: 'Normale', veloce: 'Veloce' };

  // Una giornata di viaggio e' di 8 ore (SRD). Prima le frazioni di giorno si contavano su 24 ore:
  // 16 km a piedi risultavano 12 ore invece di 4.
  const _fmtTempo = (giorni) => {
    const ore = giorni * 8;
    if (ore < 1) return Math.max(1, Math.round(ore * 60)) + ' min';
    if (giorni < 1) return (Math.round(ore * 10) / 10).toLocaleString('it-IT') + ' ore';
    let g = Math.floor(giorni), h = Math.round((giorni - g) * 8);
    if (h === 8) { g++; h = 0; }
    return g + (g === 1 ? ' giorno' : ' giorni') + (h ? ' e ' + h + (h === 1 ? ' ora' : ' ore') : '');
  };

  const _scelta = (etichetta, opzioni, valore, onchange) =>
    '<div class="form-group" style="margin:0;"><label class="form-label">' + etichetta + '</label>' +
      '<select class="form-select" onchange="' + onchange + '">' +
        Object.entries(opzioni).map(([k, v]) => '<option value="' + k + '"' + (k === valore ? ' selected' : '') + '>' + v + '</option>').join('') +
      '</select></div>';

  // Ogni tratto ha il suo terreno (sta sulla tappa d'arrivo): in mare si va in barca o in nave,
  // sulla terraferma a piedi o a cavallo.
  const _ricalcolaMisura = () => {
    const corpo = document.getElementById('mappa-dist-corpo');
    if (!corpo || !_percorso || _percorso.punti.length < 2) return;
    const punti = _percorso.punti;
    const tratti = punti.slice(1).map((p, i) => {
      const terreno = p.terreno || 'strada';
      const mezzo = terreno === 'mare' ? _viaggio.mare : _viaggio.terra;
      const kmGiorno = VEL_BASE[mezzo][_viaggio.ritmo] * (TERRENO_MULT[terreno] || 1);
      const km = _kmTra(punti[i], p);
      return { n: i + 1, km, terreno, mezzo, giorni: km / kmGiorno };
    });
    const haMare = tratti.some(t => t.terreno === 'mare'), haTerra = tratti.some(t => t.terreno !== 'mare');
    const totale = tratti.reduce((s, t) => s + t.giorni, 0);
    corpo.innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:14px;">' +
        (haTerra ? _scelta('Via terra', { piedi: MEZZO_LABEL.piedi, cavallo: MEZZO_LABEL.cavallo }, _viaggio.terra, "MappaUI._sceltaViaggio('terra',this.value)") : '') +
        (haMare ? _scelta('Via mare', { barca: MEZZO_LABEL.barca, nave: MEZZO_LABEL.nave }, _viaggio.mare, "MappaUI._sceltaViaggio('mare',this.value)") : '') +
        _scelta('Passo', RITMO_LABEL, _viaggio.ritmo, "MappaUI._sceltaViaggio('ritmo',this.value)") +
      '</div>' +
      '<div class="form-label">' + (tratti.length > 1 ? 'Il terreno di ogni tratto' : 'Terreno') + '</div>' +
      tratti.map(t =>
        '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:0.85rem;">' +
          '<span style="flex:1 1 110px;">' + (tratti.length > 1 ? 'Tratto ' + t.n + ' · ' : '') + _fmtDist(t.km) + '</span>' +
          '<select class="form-select" aria-label="Terreno del tratto ' + t.n + '" style="width:auto;flex:0 1 150px;font-size:0.82rem;padding:4px 8px;" onchange="MappaUI._terrenoTratto(' + t.n + ',this.value)">' +
            Object.keys(TERRENO_LABEL).map(k => '<option value="' + k + '"' + (k === t.terreno ? ' selected' : '') + '>' + TERRENO_LABEL[k] + '</option>').join('') +
          '</select>' +
          '<span style="flex:0 0 auto;min-width:96px;text-align:right;font-family:var(--font-mono);color:var(--text-secondary);" title="' + MEZZO_LABEL[t.mezzo] + '">' + _fmtTempo(t.giorni) + '</span>' +
        '</div>').join('') +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;padding-top:10px;font-size:0.95rem;">' +
        '<strong>Totale</strong><strong style="font-family:var(--font-mono);color:var(--accent-text);">' + _fmtTempo(totale) + '</strong>' +
      '</div>' +
      '<p class="text-muted" style="font-size:0.72rem;line-height:1.5;margin:8px 0 0;">Una giornata di viaggio è di 8 ore, con le velocità del passo di viaggio delle regole.</p>';
  };

  const _terrenoTratto = (n, terreno) => {
    if (!_percorso || !_percorso.punti[n] || !TERRENO_LABEL[terreno]) return;
    _percorso.punti[n].terreno = terreno;
    _ricalcolaMisura();
    _disegnaPercorso(); // i tratti in mare si vedono azzurri sulla mappa
  };
  const _sceltaViaggio = (chiave, valore) => { _viaggio[chiave] = valore; _ricalcolaMisura(); };

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
    vaiAMappa, tornaIndietro, entraInMappa, nuovaMappa, eliminaMappaCorrente, aggiungiDaImmagine, generaDaPin,
    apriImpostazioni, salvaImpostazioni, _onFilePicked,
    apriModalNuovoPin, confermaNuovoPin, modificaPin, _onPinTipoChange, _onPinEntitaChange, _pickColore,
    onPinClick, rimuoviPin, _ricalcolaMisura, _terrenoTratto, _sceltaViaggio,
    iniziaPercorso, annullaTappa, fermaPercorso, mostraTempiPercorso,
    iniziaMisuraDaPin: iniziaPercorso, // nome vecchio, se qualcosa lo chiama ancora
  };
})();

/* DM Toolkit — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   UPDATE-BANNER.JS — Avviso "È disponibile una nuova versione"
   quando viene pubblicato un aggiornamento mentre l'app è già
   aperta. Riaprendo l'app la versione nuova arriva già da sola
   (service worker network-first), ma su tablet/telefono l'app
   installata resta spesso aperta in background per giorni senza
   mai ricaricarsi: senza questo avviso si continuava a usare la
   versione vecchia senza saperlo.

   Come capisce che c'è una versione nuova: chiede a GitHub l'ultimo
   commit del ramo main; se è stato pubblicato dopo il caricamento
   della pagina, è una versione nuova. Tornando nell'app (dal
   multitasking del tablet) si aggiorna da sola, se non si sta
   scrivendo e non c'è una finestra aperta; mentre la si usa compare
   il banner. Un commit viene considerato solo dopo
   qualche minuto, il tempo che GitHub Pages pubblichi davvero i file
   (altrimenti "Aggiorna" ricaricherebbe ancora la versione vecchia).
   Offline o con GitHub non raggiungibile semplicemente non fa nulla.
   ============================================================ */

const UpdateBanner = (() => {
  const API = 'https://api.github.com/repos/gdr-sys/dm-toolkit/commits/main';
  const INTERVALLO_MS = 15 * 60 * 1000;   // controllo periodico ad app aperta
  const MIN_TRA_CONTROLLI_MS = 60 * 1000; // al ritorno sull'app, non piu' spesso di cosi'
  const ATTESA_PUBBLICAZIONE_MS = 3 * 60 * 1000;
  // Versione per cui si e' gia' ricaricato: evita di ricaricare due volte per lo stesso commit
  const KEY_APPLICATA = 'dm_versione_applicata';
  const KEY_APPENA = 'dm_appena_aggiornata';
  // Momento in cui e' stato caricato il codice che sta girando
  const CARICATA = Date.now();

  let _ultimoControllo = 0;
  let _mostrato = false;
  let _nuova = null; // sha di una versione piu' recente di quella in uso

  const _ultimoCommit = async () => {
    try {
      const res = await fetch(API, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) return null;
      const c = await res.json();
      const data = Date.parse(c?.commit?.committer?.date || '');
      return c?.sha ? { sha: c.sha, data } : null;
    } catch (e) {
      return null;
    }
  };

  const _leggi = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const _scrivi = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  // Si puo' ricaricare senza disturbare: nessun campo in cui si sta scrivendo, nessuna finestra aperta
  const _puoAggiornare = () => {
    const a = document.activeElement;
    if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return false;
    return ![...document.querySelectorAll('.modal-overlay')].some(m => !m.classList.contains('hidden') && m.style.display !== 'none');
  };

  // Prima la versione "in uso" era la prima vista dopo l'apertura: se l'app veniva aperta mentre
  // GitHub stava ancora pubblicando, il codice in esecuzione era quello vecchio ma risultava
  // aggiornato, e il banner non compariva piu'. Ora conta quando e' stata caricata la pagina:
  // un commit pubblicato dopo il caricamento e' una versione nuova.
  const controlla = async (alRientro) => {
    if (!navigator.onLine) return;
    _ultimoControllo = Date.now();
    const c = await _ultimoCommit();
    if (!c) return;
    const pubblicato = !c.data || (Date.now() - c.data) > ATTESA_PUBBLICAZIONE_MS;
    if (!pubblicato) return;
    const caricataDopo = c.data && (c.data + ATTESA_PUBBLICAZIONE_MS) <= CARICATA;
    if (caricataDopo || c.sha === _leggi(KEY_APPLICATA)) { _scrivi(KEY_APPLICATA, c.sha); return; }
    _nuova = c.sha;
    // Al rientro nell'app (tablet in multitasking, app installata) si aggiorna da sola
    if (alRientro === true && _puoAggiornare()) aggiorna(true);
    else _mostra();
  };

  const _iconaSvg =
    '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--accent-secondary-text);">' +
      '<path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/>' +
    '</svg>';

  const _mostra = () => {
    if (_mostrato || document.getElementById('update-banner')) return;
    _mostrato = true;
    const el = document.createElement('div');
    el.id = 'update-banner';
    el.setAttribute('role', 'status');
    // Su tablet/telefono in basso c'e' la barra di navigazione: il banner va sopra, alla stessa
    // altezza dei toast (stessa media query di .toast-container in components.css).
    const conBarraInBasso = matchMedia('(max-width: 768px), (max-width: 1024px) and (hover: none)').matches;
    // Centrato in basso, sotto lo strato dei toast (9999) e sopra i contenuti; su schermi
    // stretti occupa tutta la larghezza meno 16px per lato.
    el.style.cssText =
      'position:fixed;left:50%;transform:translateX(-50%);' +
      'bottom:calc(' + (conBarraInBasso ? 76 : 16) + 'px + env(safe-area-inset-bottom, 0px));' +
      'z-index:9000;width:max-content;max-width:calc(100% - 32px);box-sizing:border-box;' +
      'display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 14px 12px 16px;' +
      'background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border-strong);' +
      'border-left:3px solid var(--accent-secondary);border-radius:var(--radius-md);box-shadow:var(--shadow-lg);' +
      'font-family:var(--font-body);font-size:0.95rem;line-height:1.4;';
    el.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1 1 220px;">' +
        _iconaSvg +
        '<span>È disponibile una nuova versione di DM Toolkit.</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-left:auto;">' +
        '<button type="button" class="btn btn-ghost btn-sm" data-azione="dopo">Più tardi</button>' +
        '<button type="button" class="btn btn-primary btn-sm" data-azione="aggiorna">Aggiorna</button>' +
      '</div>';
    el.querySelector('[data-azione="dopo"]').onclick = () => el.remove();
    el.querySelector('[data-azione="aggiorna"]').onclick = aggiorna;
    document.body.appendChild(el);
  };

  // Prima di ricaricare fa finire l'eventuale salvataggio in coda o in corso (Drive/Firebase):
  // ricaricando a meta' si perdeva l'ultima modifica fatta.
  const aggiorna = async () => {
    const btn = document.querySelector('#update-banner [data-azione="aggiorna"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvataggio…'; }
    try { if (typeof FirebaseSync !== 'undefined' && FirebaseSync.flushAndWait) await FirebaseSync.flushAndWait(); } catch (e) {}
    if (_nuova) _scrivi(KEY_APPLICATA, _nuova);
    try { sessionStorage.setItem(KEY_APPENA, '1'); } catch (e) {}
    location.reload();
  };

  const _alRientro = () => {
    if (document.visibilityState !== 'visible') return;
    if (_nuova && _puoAggiornare()) { aggiorna(true); return; }
    if (Date.now() - _ultimoControllo > MIN_TRA_CONTROLLI_MS) controlla(true);
  };

  // Data di pubblicazione della versione che sta girando (GitHub Pages la manda come
  // Last-Modified di index.html): in Impostazioni, per controllare se un dispositivo e' aggiornato.
  const _mostraVersione = () => {
    const modale = document.querySelector('#modal-settings .modal-body');
    if (!modale) return;
    let el = document.getElementById('versione-app');
    if (!el) {
      el = document.createElement('div');
      el.id = 'versione-app';
      el.style.cssText = 'font-size:0.75rem;color:var(--text-muted);border-top:1px solid var(--border);padding-top:10px;margin-top:14px;';
      modale.appendChild(el);
    }
    const d = new Date(document.lastModified);
    el.textContent = 'Versione in uso: pubblicata il ' + (isNaN(d) ? '—' : d.toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })) +
      '. Se un altro dispositivo mostra una data più vecchia, chiudi del tutto l’app e riaprila.';
  };

  const init = () => {
    if (typeof Settings !== 'undefined' && Settings.open) {
      const so = Settings.open;
      Settings.open = function () { const r = so.apply(Settings, arguments); setTimeout(_mostraVersione, 50); return r; };
    }
    setTimeout(controlla, 5000);
    setInterval(controlla, INTERVALLO_MS);
    // Riaprendo l'app dal multitasking del tablet non c'e' nessun caricamento di pagina:
    // si controlla al ritorno in primo piano.
    document.addEventListener('visibilitychange', _alRientro);
    window.addEventListener('pageshow', _alRientro);
    window.addEventListener('focus', _alRientro);
    window.addEventListener('online', () => controlla());
    let appena = false;
    try { appena = sessionStorage.getItem(KEY_APPENA) === '1'; sessionStorage.removeItem(KEY_APPENA); } catch (e) {}
    if (appena) setTimeout(() => { try { Toast.show('DM Toolkit è stato aggiornato all’ultima versione', 'success', 3500); } catch (e) {} }, 1200);
  };

  document.addEventListener('DOMContentLoaded', init);

  return { controlla, aggiorna, _mostra };
})();

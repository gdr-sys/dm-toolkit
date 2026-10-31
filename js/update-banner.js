/* ============================================================
   UPDATE-BANNER.JS — Avviso "È disponibile una nuova versione"
   quando viene pubblicato un aggiornamento mentre l'app è già
   aperta. Riaprendo l'app la versione nuova arriva già da sola
   (service worker network-first), ma su tablet/telefono l'app
   installata resta spesso aperta in background per giorni senza
   mai ricaricarsi: senza questo avviso si continuava a usare la
   versione vecchia senza saperlo.

   Come capisce che c'è una versione nuova: chiede a GitHub l'ultimo
   commit del ramo main. Il primo controllo dopo l'apertura fissa la
   versione "in uso"; se in un controllo successivo il commit è
   cambiato, compare il banner. Un commit viene considerato solo dopo
   qualche minuto, il tempo che GitHub Pages pubblichi davvero i file
   (altrimenti "Aggiorna" ricaricherebbe ancora la versione vecchia).
   Offline o con GitHub non raggiungibile semplicemente non fa nulla.
   ============================================================ */

const UpdateBanner = (() => {
  const API = 'https://api.github.com/repos/gdr-sys/dm-toolkit/commits/main';
  const INTERVALLO_MS = 15 * 60 * 1000;   // controllo periodico ad app aperta
  const MIN_TRA_CONTROLLI_MS = 5 * 60 * 1000; // al ritorno sull'app, non piu' spesso di cosi'
  const ATTESA_PUBBLICAZIONE_MS = 3 * 60 * 1000;

  let _inUso = null;
  let _ultimoControllo = 0;
  let _mostrato = false;

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

  const controlla = async () => {
    if (_mostrato || !navigator.onLine) return;
    _ultimoControllo = Date.now();
    const c = await _ultimoCommit();
    if (!c) return;
    const pubblicato = !c.data || (Date.now() - c.data) > ATTESA_PUBBLICAZIONE_MS;
    if (!_inUso) { if (pubblicato) _inUso = c.sha; return; }
    if (c.sha !== _inUso && pubblicato) _mostra();
  };

  const _iconaSvg =
    '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--accent-secondary);">' +
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
    location.reload();
  };

  const init = () => {
    setTimeout(controlla, 5000);
    setInterval(controlla, INTERVALLO_MS);
    // Riaprendo l'app dal multitasking del tablet non c'e' nessun caricamento di pagina:
    // si controlla al ritorno in primo piano.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - _ultimoControllo > MIN_TRA_CONTROLLI_MS) controlla();
    });
    window.addEventListener('online', () => controlla());
  };

  document.addEventListener('DOMContentLoaded', init);

  return { controlla, aggiorna, _mostra };
})();

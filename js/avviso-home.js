/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   AVVISO-HOME.JS — Campagne al sicuro su iPad e iPhone.
   Safari può cancellare i dati di un sito non aperto per 7 giorni,
   a meno che l'app sia aggiunta alla schermata Home. Chi gioca ogni
   due settimane senza Drive rischia di perdere la campagna.
   Un piccolo riquadro in basso, solo se:
   - iPad o iPhone, aperta da Safari (non dalla schermata Home);
   - Drive mai collegato su questo dispositivo;
   - c'è almeno una campagna vera (non quella di esempio).
   "Più tardi" lo rimanda di 14 giorni, "Non mostrarlo più" per sempre.
   ============================================================ */

const AvvisoHome = (() => {
  const K_DOPO = 'pgsAvvisoHomeDopo';
  const K_MAI = 'pgsAvvisoHomeMai';
  const RIMANDO = 14 * 24 * 60 * 60 * 1000;

  const _leggi = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const _scrivi = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  // iPadOS si presenta come un Mac: lo distingue lo schermo tattile
  const _apple = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const _daHome = () => navigator.standalone === true
    || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  const _conDrive = () => _leggi('dm_drive_connected') === 'true'
    || (typeof DriveBackup !== 'undefined' && DriveBackup.isConnected && DriveBackup.isConnected());
  const _campagneVere = () => {
    try { return (Storage.getCampaigns() || []).some((c) => c && !c.demo); } catch (e) { return false; }
  };

  const serve = () => {
    if (!_apple() || _daHome() || _conDrive() || !_campagneVere()) return false;
    if (_leggi(K_MAI)) return false;
    const dopo = parseInt(_leggi(K_DOPO), 10) || 0;
    return Date.now() >= dopo;
  };

  const ICONA = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  const CONDIVIDI = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Condividi" style="vertical-align:-2px;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';

  const _chiudi = () => { const el = document.getElementById('avviso-home'); if (el) el.remove(); };

  const mostra = () => {
    if (document.getElementById('avviso-home') || document.getElementById('supporto-riquadro')) return;
    const el = document.createElement('div');
    el.id = 'avviso-home';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<div class="supporto-testa">' +
        '<span class="supporto-icona">' + ICONA + '</span>' +
        '<strong>Metti al sicuro le tue campagne</strong>' +
        '<button type="button" class="btn btn-ghost btn-icon-sm supporto-x" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '</div>' +
      '<p>Su iPad e iPhone, Safari può cancellare i dati di un sito che non apri per 7 giorni. ' +
        'Aggiungi l’app alla schermata Home (tocca ' + CONDIVIDI + ' e poi “Aggiungi alla schermata Home”) e aprila sempre da lì, oppure collega Google Drive per avere una copia.</p>' +
      '<div class="supporto-azioni">' +
        '<button type="button" class="btn btn-primary btn-sm avviso-drive">Collega Drive</button>' +
        '<button type="button" class="btn btn-ghost btn-sm avviso-dopo">Più tardi</button>' +
        '<button type="button" class="btn btn-ghost btn-sm avviso-mai">Non mostrarlo più</button>' +
      '</div>';
    const dopo = () => { _scrivi(K_DOPO, String(Date.now() + RIMANDO)); _chiudi(); };
    el.querySelector('.supporto-x').onclick = dopo;
    el.querySelector('.avviso-dopo').onclick = dopo;
    el.querySelector('.avviso-mai').onclick = () => { _scrivi(K_MAI, '1'); _chiudi(); };
    el.querySelector('.avviso-drive').onclick = () => {
      _scrivi(K_DOPO, String(Date.now() + RIMANDO));
      _chiudi();
      try { DriveBackup.connect(); } catch (e) {}
    };
    document.body.appendChild(el);
  };

  const _finestraAperta = () =>
    [...document.querySelectorAll('.modal-overlay')].some((o) => o.style.display && o.style.display !== 'none');

  // Dopo l'avvio (benvenuto, novità, riconnessione a Drive) e solo senza altre finestre aperte
  const _prova = (tentativi) => {
    if (!serve()) return;
    if (_finestraAperta()) { if (tentativi > 0) setTimeout(() => _prova(tentativi - 1), 5000); return; }
    mostra();
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(() => _prova(24), 12000));

  return { serve, mostra };
})();

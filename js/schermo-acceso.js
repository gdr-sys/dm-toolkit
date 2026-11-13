/* DM Toolkit — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   SCHERMO-ACCESO.JS — Tiene lo schermo acceso (Screen Wake Lock)
   su tablet e telefono, cosi' non si spegne a meta' scontro.

   Tre modalita' (Impostazioni → Aspetto), salvate sul dispositivo
   perche' dipendono dal dispositivo, non dalla campagna:
     scontri (predefinita) — solo mentre c'e' uno scontro in corso
     sempre                — finche' l'app e' aperta in primo piano
     mai
   Il browser rilascia il blocco da solo quando la pagina va in
   background: lo si richiede di nuovo al ritorno in primo piano.
   ============================================================ */

const SchermoAcceso = (() => {
  const LS_KEY = 'dm_wake_lock';
  const supportato = 'wakeLock' in navigator;
  let _blocco = null;
  let _richiesta = null;

  const _modo = () => {
    try { return localStorage.getItem(LS_KEY) || 'scontri'; } catch (e) { return 'scontri'; }
  };

  const _scontroInCorso = () => {
    const c = typeof App !== 'undefined' ? App.getActiveCampaign()?.activeCombat : null;
    return !!(c && Array.isArray(c.combatants) && c.combatants.length);
  };

  const _serve = () => {
    const m = _modo();
    return document.visibilityState === 'visible' && (m === 'sempre' || (m === 'scontri' && _scontroInCorso()));
  };

  const aggiorna = async () => {
    if (!supportato) return;
    if (_serve()) {
      if (_blocco || _richiesta) return;
      try {
        _richiesta = navigator.wakeLock.request('screen');
        _blocco = await _richiesta;
        _blocco.addEventListener('release', () => { _blocco = null; });
      } catch (e) {
        _blocco = null; // es. batteria scarica o permesso negato: si riprova al prossimo controllo
      } finally {
        _richiesta = null;
      }
    } else if (_blocco) {
      try { await _blocco.release(); } catch (e) {}
      _blocco = null;
    }
  };

  const _aggiornaUI = () => {
    const m = _modo();
    document.querySelectorAll('.wake-lock-btn').forEach(b => {
      b.className = 'btn btn-sm wake-lock-btn ' + (b.dataset.modo === m ? 'btn-primary' : 'btn-ghost');
      b.disabled = !supportato;
    });
    const desc = document.getElementById('wake-lock-desc');
    if (desc && !supportato) desc.textContent = 'Questo browser non permette di tenere lo schermo acceso (serve iPadOS/iOS 16.4 o un Chrome/Edge recente)';
  };

  const imposta = (modo) => {
    try { localStorage.setItem(LS_KEY, modo); } catch (e) {}
    _aggiornaUI();
    aggiorna();
  };

  document.addEventListener('visibilitychange', aggiorna);
  document.addEventListener('DOMContentLoaded', () => {
    _aggiornaUI();
    aggiorna();
    // L'inizio e la fine di uno scontro passano da molti punti dell'app (Sessione, Schermo del
    // DM, sincronizzazione da un altro dispositivo): un controllo leggero ogni pochi secondi
    // li copre tutti senza agganciarsi a ciascuno.
    setInterval(aggiorna, 5000);
  });

  return { imposta, aggiorna, get attivo() { return !!_blocco; } };
})();

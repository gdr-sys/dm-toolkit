/* ============================================================
   BUG-REPORT.JS — "Segnala un bug": invia la segnalazione direttamente
   dal sito via Web3Forms (api.web3forms.com), senza aprire un client
   di posta. Servizio gratuito: richiede una Access Key legata a
   un'email di destinazione, generata su web3forms.com. Niente
   allegati: sul piano gratuito Web3Forms li rifiuta con "You are
   trying to use a Pro feature" (verificato via chiamata diretta
   all'API), quindi non vengono proposti in UI. Modulo autonomo:
   costruisce il proprio modale a runtime, non tocca il markup
   statico di index.html.
   ============================================================ */

const BugReport = (() => {
  const ACCESS_KEY = 'c022699a-f9ba-47f6-87f7-c9725aeab6b7';

  // Tiene traccia della pagina visitata prima di quella corrente: se l'utente
  // lascia la pagina col problema prima di aprire "Segnala un bug" (es. per
  // raggiungere la voce in sidebar), l'informazione sulla pagina "corrente"
  // da sola sarebbe fuorviante — qui si registra anche quella precedente.
  // #topbar-title e' l'unico elemento aggiornato da App.navigateTo ad ogni
  // cambio pagina (page.label): a differenza di .page-title, che compare
  // ripetuto — uno per ciascuna sezione #page-* sempre presente nel DOM —
  // e non e' un indicatore di navigazione affidabile.
  let _prevPage = null;

  const _hookNav = () => {
    if (typeof App === 'undefined' || App._bugReportNavHooked) return;
    const origNavigateTo = App.navigateTo;
    App.navigateTo = function () {
      const before = document.getElementById('topbar-title')?.textContent?.trim();
      if (before) _prevPage = before;
      return origNavigateTo.apply(this, arguments);
    };
    App._bugReportNavHooked = true;
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(_hookNav, 200));

  const _pageLabel = () =>
    document.getElementById('topbar-title')?.textContent?.trim() ||
    document.title ||
    'sconosciuta';

  const _infoTecniche = () => {
    const tema = document.documentElement.getAttribute('data-theme') || 'automatico (sistema)';
    const pagina = _pageLabel();
    return [
      'Pagina: ' + pagina + (_prevPage && _prevPage !== pagina ? ' (prima: ' + _prevPage + ')' : ''),
      'Data/ora: ' + new Date().toLocaleString('it-IT'),
      'Finestra: ' + window.innerWidth + 'x' + window.innerHeight,
      'Tema: ' + tema,
      'Browser: ' + navigator.userAgent,
    ].join('\n');
  };

  const _injectModal = () => {
    if (document.getElementById('modal-bugreport')) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay hidden';
    overlay.id = 'modal-bugreport';
    overlay.style.display = 'none';
    overlay.onclick = (e) => { if (e.target === overlay) Modal.close('bugreport'); };
    overlay.innerHTML =
      '<div class="modal" style="max-width:480px;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title">Segnala un bug</h3>' +
          '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'bugreport\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body" style="display:flex;flex-direction:column;gap:12px;">' +
          '<div class="form-group">' +
            '<label class="form-label">Cosa hai trovato?</label>' +
            '<input id="bugreport-titolo" type="text" class="form-input" placeholder="es. Il calendario non salva la data">' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">Descrizione</label>' +
            '<textarea id="bugreport-descrizione" class="form-textarea" rows="4" placeholder="Cosa stavi facendo, cosa ti aspettavi, cosa è successo invece..."></textarea>' +
          '</div>' +
          '<div style="font-size:0.7rem;color:var(--text-muted);padding-top:4px;border-top:1px solid var(--border);">Vengono inviate automaticamente pagina corrente, browser, dimensioni finestra e tema — utili per capire il problema più in fretta.</div>' +
          '<div id="bugreport-status" style="display:none;text-align:center;font-size:0.85rem;font-weight:600;padding:8px;border-radius:var(--radius-sm);"></div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-ghost" onclick="Modal.close(\'bugreport\')">Annulla</button>' +
          '<button id="bugreport-invia-btn" class="btn btn-primary" onclick="BugReport.invia()">Invia segnalazione</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  };

  const _setStatus = (msg, kind) => {
    const el = document.getElementById('bugreport-status');
    if (!el) return;
    if (!msg) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.style.background = kind === 'error' ? 'rgba(139,38,53,0.15)' : 'rgba(58,125,68,0.15)';
    el.style.color = kind === 'error' ? 'var(--accent-danger)' : 'var(--accent-success)';
    el.textContent = msg;
  };

  const open = () => {
    _injectModal();
    const titoloEl = document.getElementById('bugreport-titolo');
    const descEl = document.getElementById('bugreport-descrizione');
    if (titoloEl) titoloEl.value = '';
    if (descEl) descEl.value = '';
    _setStatus(null);
    Modal.open('bugreport');
  };

  const invia = async () => {
    const titolo = document.getElementById('bugreport-titolo')?.value?.trim();
    const descrizione = document.getElementById('bugreport-descrizione')?.value?.trim();
    const btn = document.getElementById('bugreport-invia-btn');

    _setStatus(null);
    if (!titolo) { try { Toast.show('Scrivi almeno un titolo breve', 'warning'); } catch (e) {} return; }
    if (!ACCESS_KEY || ACCESS_KEY.indexOf('INSERISCI_QUI') === 0) {
      _setStatus('Invio non configurato: manca la Access Key Web3Forms', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('access_key', ACCESS_KEY);
    formData.append('subject', 'DM Toolkit - Bug: ' + titolo);
    formData.append('from_name', 'DM Toolkit - Segnalazione bug');
    formData.append('message', (descrizione || '(nessuna descrizione)') +
      '\n\n---\nInformazioni tecniche (aggiunte automaticamente):\n' + _infoTecniche());

    if (btn) { btn.disabled = true; btn.textContent = 'Invio in corso...'; }

    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        _setStatus('✓ Segnalazione inviata, grazie!', 'success');
        if (btn) btn.style.display = 'none';
        setTimeout(() => { Modal.close('bugreport'); if (btn) btn.style.display = ''; }, 1600);
      } else {
        _setStatus('Invio non riuscito, riprova più tardi.', 'error');
      }
    } catch (e) {
      _setStatus('Invio non riuscito: controlla la connessione.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Invia segnalazione'; }
    }
  };

  return { open, invia };
})();

/* ============================================================
   BUG-REPORT.JS — "Segnala un bug": invia la segnalazione (con
   eventuale screenshot allegato) direttamente dal sito via
   Web3Forms (api.web3forms.com), senza aprire un client di posta.
   Servizio gratuito: richiede una Access Key legata a un'email di
   destinazione, generata su web3forms.com. Modulo autonomo:
   costruisce il proprio modale a runtime, non tocca il markup
   statico di index.html.
   ============================================================ */

const BugReport = (() => {
  const ACCESS_KEY = 'c022699a-f9ba-47f6-87f7-c9725aeab6b7';

  const _pageLabel = () =>
    document.querySelector('.page-title')?.textContent?.trim() ||
    document.title ||
    'sconosciuta';

  const _infoTecniche = () => {
    const tema = document.documentElement.getAttribute('data-theme') || 'automatico (sistema)';
    return [
      'Pagina: ' + _pageLabel(),
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
          '<div class="form-group">' +
            '<label class="form-label">Screenshot (opzionale)</label>' +
            '<input id="bugreport-file" type="file" accept="image/*" class="form-input" onchange="BugReport._onFileChange()">' +
            '<div id="bugreport-file-info" style="display:none;align-items:center;gap:8px;margin-top:6px;">' +
              '<span id="bugreport-file-name" style="font-size:0.75rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>' +
              '<button type="button" class="btn btn-ghost btn-sm" onclick="BugReport._clearFile()" style="padding:2px 8px;flex-shrink:0;">Rimuovi</button>' +
            '</div>' +
            '<span style="font-size:0.7rem;color:var(--text-muted);">Viene allegato automaticamente all\'invio (max 5MB).</span>' +
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

  const _onFileChange = () => {
    const file = document.getElementById('bugreport-file')?.files?.[0];
    const info = document.getElementById('bugreport-file-info');
    const nameEl = document.getElementById('bugreport-file-name');
    if (file) {
      if (nameEl) nameEl.textContent = file.name;
      if (info) info.style.display = 'flex';
    } else if (info) {
      info.style.display = 'none';
    }
  };

  const _clearFile = () => {
    const fileEl = document.getElementById('bugreport-file');
    const info = document.getElementById('bugreport-file-info');
    if (fileEl) fileEl.value = '';
    if (info) info.style.display = 'none';
  };

  const open = () => {
    _injectModal();
    const titoloEl = document.getElementById('bugreport-titolo');
    const descEl = document.getElementById('bugreport-descrizione');
    if (titoloEl) titoloEl.value = '';
    if (descEl) descEl.value = '';
    _clearFile();
    _setStatus(null);
    Modal.open('bugreport');
  };

  const invia = async () => {
    const titolo = document.getElementById('bugreport-titolo')?.value?.trim();
    const descrizione = document.getElementById('bugreport-descrizione')?.value?.trim();
    const file = document.getElementById('bugreport-file')?.files?.[0];
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
    if (file) formData.append('attachment', file);

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

  return { open, invia, _onFileChange, _clearFile };
})();

/* ============================================================
   BUG-REPORT.JS — "Segnala un bug", raggiungibile dal modale Guida
   rapida (onboarding.js): apre un mailto: precompilato con
   titolo/descrizione dell'utente piu' info tecniche raccolte
   automaticamente (pagina corrente, browser, finestra, tema).
   mailto: non puo' includere un vero allegato (e' un limite del
   browser, non aggirabile senza un servizio esterno): se l'utente
   sceglie uno screenshot, viene solo ricordato di trascinarlo a mano
   nella mail che si apre. Modulo autonomo: costruisce il proprio
   modale a runtime, non tocca il markup statico di index.html.
   ============================================================ */

const BugReport = (() => {
  const DEST_EMAIL = 'noemi.marcolini@gmail.com';

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

  // Niente icona propria in sidebar: con "Guida rapida" (onboarding.js) il footer arriva
  // gia' a 4 icone e non c'e' piu' spazio in riga (overflow:hidden taglia la 5a anche da
  // espansa, non solo da compressa). "Segnala un bug" si raggiunge da un link in fondo
  // al modale Guida rapida invece di aggiungere un altro bottone li' accanto.
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
            '<input id="bugreport-file" type="file" accept="image/*" class="form-input">' +
            '<span style="font-size:0.7rem;color:var(--text-muted);">La mail non può allegarlo da sola: te lo ricordiamo al momento di inviare, trascinalo tu nella mail che si apre.</span>' +
          '</div>' +
          '<div style="font-size:0.7rem;color:var(--text-muted);padding-top:4px;border-top:1px solid var(--border);">Nella mail vengono aggiunte automaticamente pagina corrente, browser, dimensioni finestra e tema — utili per capire il problema più in fretta.</div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-ghost" onclick="Modal.close(\'bugreport\')">Annulla</button>' +
          '<button class="btn btn-primary" onclick="BugReport.invia()">Apri la mail</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  };

  const open = () => {
    _injectModal();
    const titoloEl = document.getElementById('bugreport-titolo');
    const descEl = document.getElementById('bugreport-descrizione');
    const fileEl = document.getElementById('bugreport-file');
    if (titoloEl) titoloEl.value = '';
    if (descEl) descEl.value = '';
    if (fileEl) fileEl.value = '';
    Modal.open('bugreport');
  };

  const invia = () => {
    const titolo = document.getElementById('bugreport-titolo')?.value?.trim();
    const descrizione = document.getElementById('bugreport-descrizione')?.value?.trim();
    const file = document.getElementById('bugreport-file')?.files?.[0];

    if (!titolo) { try { Toast.show('Scrivi almeno un titolo breve', 'warning'); } catch (e) {} return; }

    const oggetto = 'DM Toolkit - Bug: ' + titolo;
    const corpo = (descrizione || '(nessuna descrizione)') +
      '\n\n---\nInformazioni tecniche (aggiunte automaticamente):\n' + _infoTecniche() +
      (file ? '\n\nAllegato da aggiungere a mano: ' + file.name : '');

    window.location.href = 'mailto:' + DEST_EMAIL + '?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(corpo);

    if (file) {
      try { Toast.show('Non dimenticare di allegare "' + file.name + '" alla mail che si è aperta', 'info', 6000); } catch (e) {}
    }
    Modal.close('bugreport');
  };

  return { open, invia };
})();

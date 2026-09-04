/* ============================================================
   NEWSLETTER-POPUP.JS — Invito all'iscrizione alla newsletter
   (form Brevo). Compare una sola volta per browser dopo un breve
   ritardo, poi non si ripropone piu' (localStorage). Modulo
   autonomo: costruisce il proprio modale a runtime riusando le
   classi .modal-overlay/.modal/.btn* del sito, cosi' segue tema
   chiaro/scuro e tipografia senza markup statico in index.html.
   ============================================================ */

const NewsletterPopup = (() => {
  const STORAGE_KEY = 'dmToolkitNewsletterSeen';
  const DELAY_MS = 3000;
  const BREVO_URL = 'https://bda22242.sibforms.com/serve/MUIFANQD-R-fXZOh55Ed_3xjzfpFK5BftmRd_W_tvi687quPt8riLssWxvWLak7RyGwBbQmqxfGrRDskOgm4b80p_Ozpkp2IngdHuwIm-XMEbR5YW_5vgLwU3ElgBbuqzpyAjaFhw9hCjBbc1g0bg5R3cjwthicVm7uBTiF8Uykh5LE7_1HqGnSKaiFhgrWNlJvevQopjtyEVXRK2Q==';

  const _injectModal = () => {
    if (document.getElementById('modal-newsletter')) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay hidden';
    overlay.id = 'modal-newsletter';
    overlay.style.display = 'none';
    overlay.onclick = (e) => { if (e.target === overlay) Modal.close('newsletter'); };
    overlay.innerHTML =
      '<div class="modal" style="max-width:400px;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title">Novita\' DM Toolkit</h3>' +
          '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'newsletter\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body" style="text-align:center;">' +
          '<div style="color:var(--accent-secondary);margin-bottom:12px;"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 21 8 21 16 12 22 3 16 3 8 Z"/><path d="M12 2 12 22"/><path d="M3 8 12 12 21 8"/><path d="M3 16 12 12 21 16"/></svg></div>' +
          '<p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.5;">Nuovi strumenti, aggiornamenti e funzioni per DM Toolkit, via email, senza spam.</p>' +
        '</div>' +
        '<div class="modal-footer" style="justify-content:center;">' +
          '<button class="btn btn-ghost" onclick="Modal.close(\'newsletter\')">No grazie</button>' +
          '<a href="' + BREVO_URL + '" target="_blank" rel="noopener" class="btn btn-gold" onclick="Modal.close(\'newsletter\')">Iscrivimi alla newsletter</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  };

  const _tryShow = () => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    setTimeout(() => {
      // Segnato come visto all'apertura, non alla chiusura: cosi' il
      // popup non si ripropone qualunque sia il modo in cui viene
      // chiuso (X, "No grazie", CTA, ESC, click fuori).
      localStorage.setItem(STORAGE_KEY, '1');
      _injectModal();
      Modal.open('newsletter');
    }, DELAY_MS);
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(_tryShow, 200));

  return {};
})();

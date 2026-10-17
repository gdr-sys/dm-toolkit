/* ============================================================
   UPDATE-POPUP.JS — Avviso "cosa è stato corretto", mostrato una sola
   volta a chi ha già usato il tool (cioè ha almeno una campagna
   salvata in locale) dopo un aggiornamento con fix importanti. Non
   compare a chi apre DM Toolkit per la prima volta: non ha ancora
   incontrato i bug elencati, quindi l'avviso non gli serve.

   Per annunciare un nuovo giro di fix in futuro: aggiorna VERSION e
   la lista CORREZIONI qui sotto. Cambiare VERSION fa ricomparire il
   popup una volta anche a chi ha già chiuso una versione precedente.
   Modulo autonomo sul modello di newsletter-popup.js: costruisce il
   proprio modale a runtime, senza toccare il markup statico.
   ============================================================ */

const UpdatePopup = (() => {
  const VERSION = '2026-10-17';
  const STORAGE_KEY = 'dmtk_update_seen';
  const DELAY_MS = 1200; // prima del popup newsletter (3000ms), cosi' non si accavallano

  const CORREZIONI = [
    'Compendio dei mostri: in D&D 5e (2014) mancavano molte creature (goblin, lupi e altre) e i Gradi di Sfida di parecchi mostri erano sbagliati — ora il bestiario è completo e corretto.',
    'Sincronizzazione cloud: aprendo la stessa campagna da un altro dispositivo, i contenuti aggiunti di recente potevano sparire — ora vengono sempre uniti correttamente invece di andare persi.',
    'Eliminare un PG, una Quest o un Incontro dalla Wiki: a volte la voce restava anche dopo aver confermato la cancellazione — ora viene rimossa davvero.',
    'Scheda PG: ora puoi inserire caratteristiche, tiri salvezza, abilità, equipaggiamento e talenti anche per i Personaggi Giocanti, non solo per i PNG.',
  ];

  const _checkSvg = () =>
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" stroke-width="2.5" style="flex-shrink:0;margin-top:2px;"><polyline points="20 6 9 17 4 12"/></svg>';

  const _injectModal = () => {
    if (document.getElementById('modal-update-popup')) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay hidden';
    overlay.id = 'modal-update-popup';
    overlay.style.display = 'none';
    overlay.onclick = (e) => { if (e.target === overlay) Modal.close('update-popup'); };
    overlay.innerHTML =
      '<div class="modal" style="max-width:460px;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title">Alcuni bug sono stati corretti</h3>' +
          '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'update-popup\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<p style="font-size:0.85rem;color:var(--text-muted);line-height:1.6;margin:0 0 14px;">Grazie alle segnalazioni, in questo aggiornamento sono stati risolti:</p>' +
          '<div style="background:var(--bg-secondary);border-radius:var(--radius-md);padding:12px 16px;">' +
            '<div style="display:flex;flex-direction:column;gap:12px;">' +
              CORREZIONI.map(testo =>
                '<div style="display:flex;align-items:flex-start;gap:10px;font-size:0.82rem;line-height:1.5;">' +
                  _checkSvg() +
                  '<span>' + testo + '</span>' +
                '</div>'
              ).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-primary" style="width:100%;" onclick="Modal.close(\'update-popup\')">Ho capito</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  };

  const open = () => {
    _injectModal();
    Modal.open('update-popup');
  };

  // Compare solo a chi ha già almeno una campagna salvata: chi apre DM Toolkit
  // per la prima volta non ha mai incontrato questi bug, quindi l'avviso non lo
  // riguarda (vedrà invece l'onboarding).
  const _tryShow = () => {
    if (localStorage.getItem(STORAGE_KEY) === VERSION) return;
    let hasCampaigns = false;
    try { hasCampaigns = (Storage.getCampaigns() || []).length > 0; } catch (e) {}
    if (!hasCampaigns) { localStorage.setItem(STORAGE_KEY, VERSION); return; }

    setTimeout(() => {
      // Segnato come visto all'apertura, non alla chiusura: cosi' non si ripropone
      // qualunque sia il modo in cui viene chiuso (X, "Ho capito", ESC, click fuori).
      localStorage.setItem(STORAGE_KEY, VERSION);
      open();
    }, DELAY_MS);
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(_tryShow, 200));

  return { open };
})();

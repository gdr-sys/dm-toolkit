/* ============================================================
   WIKI-TRASH-UI.JS — Interfaccia per il Cestino della Wiki.

   WikiTrash (in index.html) salva e ripristina le voci cancellate,
   ma prima di questo modulo non c'era alcun modo di VEDERLE o
   ripristinarle dall'app: la promessa "sarà nel cestino per 30
   giorni" mostrata al momento della cancellazione non era mantenuta
   — i dati finivano in localStorage ma restavano irraggiungibili.

   Modulo autonomo sul modello di wiki-import.js: aggiunge la propria
   voce nel sottomenu Wiki già in pagina (#wiki-subnav) e costruisce
   il proprio modale a runtime, senza toccare altro markup statico.
   ============================================================ */

const WikiTrashUI = (() => {
  const LABELS = {
    png: 'PNG', luoghi: 'Luogo', fazioni: 'Fazione', lore: 'Lore',
    pg: 'PG', incontri: 'Incontro', quest: 'Quest', sessioni: 'Sessione',
  };

  const _escHtml = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const _fmtData = (ts) => {
    try { return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch (e) { return ''; }
  };

  const _injectModal = () => {
    if (document.getElementById('modal-wiki-trash')) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay hidden';
    overlay.id = 'modal-wiki-trash';
    overlay.style.display = 'none';
    overlay.onclick = (e) => { if (e.target === overlay) Modal.close('wiki-trash'); };
    overlay.innerHTML =
      '<div class="modal" style="max-width:520px;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title">Cestino</h3>' +
          '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'wiki-trash\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body" style="max-height:60vh;overflow-y:auto;">' +
          '<p class="text-sm text-muted" style="margin-bottom:12px;">Le voci eliminate dalla Wiki restano qui (fino a 50 alla volta). Puoi ripristinarle o rimuoverle per sempre.</p>' +
          '<div id="wiki-trash-list"></div>' +
        '</div>' +
        '<div class="modal-footer" style="justify-content:space-between;">' +
          '<button class="btn btn-ghost" style="color:var(--accent-danger);" onclick="WikiTrashUI.svuota()">Svuota cestino</button>' +
          '<button class="btn btn-primary" onclick="Modal.close(\'wiki-trash\')">Chiudi</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  };

  const _render = () => {
    const list = document.getElementById('wiki-trash-list');
    if (!list) return;
    const voci = WikiTrash.getAll();
    if (!voci.length) {
      list.innerHTML = '<div class="text-muted text-sm" style="padding:24px 0;text-align:center;">Il cestino è vuoto.</div>';
      return;
    }
    list.innerHTML = voci.map(v => {
      const nome = _escHtml(v.nome || v.titolo || '(senza nome)');
      const tipo = LABELS[v._sec] || v._sec || '?';
      return (
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">' +
          '<div style="min-width:0;">' +
            '<div style="font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + nome + '</div>' +
            '<div class="text-xs text-muted">' + tipo + ' · eliminata il ' + _fmtData(v.deletedAt) + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:4px;flex-shrink:0;">' +
            '<button class="btn btn-ghost btn-sm" onclick="WikiTrashUI.ripristina(\'' + v.id + '\')">Ripristina</button>' +
            '<button class="btn btn-ghost btn-icon-sm" title="Elimina definitivamente" aria-label="Elimina definitivamente" style="color:var(--accent-danger);" onclick="WikiTrashUI.eliminaDefinitivamente(\'' + v.id + '\')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  };

  const open = () => {
    _injectModal();
    _render();
    Modal.open('wiki-trash');
  };

  const ripristina = (id) => {
    WikiTrash.restore(id);
    _render();
  };

  const eliminaDefinitivamente = (id) => {
    openConfirmModal('Eliminare per sempre?', 'Questa voce non potrà più essere ripristinata.', () => {
      WikiTrash.removeOne(id);
      _render();
    });
  };

  const svuota = () => WikiTrash.empty(_render);

  // Punto d'accesso in sidebar, nello stesso sottomenu Wiki e sullo stesso modello
  // della voce "Importa da foglio" (icona neutra: e' un'azione di servizio, non un
  // tipo di contenuto). Script caricato dopo wiki-import.js, cosi' compare sotto.
  const _injectTrigger = () => {
    const subnav = document.getElementById('wiki-subnav');
    if (!subnav || document.getElementById('wiki-trash-trigger')) return;
    const btn = document.createElement('button');
    btn.id = 'wiki-trash-trigger';
    btn.className = 'nav-item nav-subitem';
    btn.style.cssText = 'padding:9px 8px 5px;font-size:0.78rem;';
    btn.onclick = () => { open(); closeMobileMenu?.(); };
    btn.innerHTML =
      '<span style="color:var(--text-muted);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></span>' +
      '<span class="nav-label">Cestino</span>';
    subnav.appendChild(btn);
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(_injectTrigger, 200));

  return { open, ripristina, eliminaDefinitivamente, svuota };
})();

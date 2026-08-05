/* ============================================================
   PREVIOUSLY-ON.JS — Genera un riassunto narrativo delle ultime
   sessioni (recap, beat principali, PNG coinvolti) pronto da
   condividere con il gruppo tra una sessione e l'altra.
   Modulo autonomo: crea da solo la card in Dashboard e il modal,
   inserendoli a runtime senza toccare il markup statico di index.html.
   ============================================================ */

const PreviouslyOn = (() => {
  let _injected = false;

  const _esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const _svgTrash = '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
  const _svgClose = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  const _tipoLabel = (t) => ({
    apertura: 'una scena di apertura', sociale: 'una scena sociale', esplorazione: 'esplorazione',
    combattimento: 'un combattimento', rivelazione: 'una rivelazione', cliffhanger: 'un cliffhanger',
    riposo: 'un riposo', libero: 'una scena libera',
  })[t] || t || 'una scena';

  // Solo sessioni con qualcosa da raccontare: giocate, o comunque con un recap scritto
  // (utile a chi non aggiorna sempre lo stato a "giocata").
  const _sessionsWithContent = (camp) =>
    (camp.sessioni_log || []).filter(s => s.stato === 'giocata' || (s.recap && s.recap.trim()));

  const _npcNames = (s, camp) =>
    (s.npcs || []).map(id => {
      const n = (camp.npcs || []).find(x => x.id === id);
      return n ? (n.name || n.nome || '') : '';
    }).filter(Boolean);

  const _sessionParagraph = (s, camp) => {
    const npcNames = _npcNames(s, camp);
    const beats = s.beats || [];
    const mainBeat = beats.find(b => b.principale);

    let core;
    if (s.recap && s.recap.trim()) {
      core = s.recap.trim();
    } else if (beats.length) {
      const ordered = mainBeat ? [mainBeat, ...beats.filter(b => b !== mainBeat)] : beats;
      core = 'Il party ha vissuto ' + ordered.map(b => b.titolo || _tipoLabel(b.tipo)).join(', ') + '.';
    } else {
      core = 'Nessun recap registrato per questa sessione.';
    }

    const parts = [core];
    if (npcNames.length) parts.push('PNG coinvolti: ' + npcNames.join(', ') + '.');
    return parts.join(' ');
  };

  // ── Generazione testo ──
  const generate = (n) => {
    const camp = App.getActiveCampaign();
    if (!camp) return '';
    const pool = _sessionsWithContent(camp).sort((a, b) => (a.numero || 0) - (b.numero || 0));
    const picked = pool.slice(-n);
    if (!picked.length) {
      return 'Nessuna sessione con recap o beat trovata: gioca o compila almeno una sessione nel Log Sessioni prima di generare un riepilogo.';
    }

    if (picked.length === 1) {
      const s = picked[0];
      const label = 'S' + (s.numero || '?') + (s.titolo ? ' — ' + s.titolo : '');
      return 'Nella sessione precedente (' + label + (s.data ? ', ' + s.data : '') + '):\n\n' + _sessionParagraph(s, camp);
    }

    const intro = 'Riepilogo delle ultime ' + picked.length + ' sessioni:';
    const body = picked.map(s => {
      const label = 'S' + (s.numero || '?') + (s.titolo ? ' — ' + s.titolo : '') + (s.data ? ' (' + s.data + ')' : '');
      return '**' + label + '**\n' + _sessionParagraph(s, camp);
    }).join('\n\n');
    return intro + '\n\n' + body;
  };

  // ── Archivio ──
  const _getArchive = () => {
    const camp = App.getActiveCampaign();
    return (camp?.previouslyOnArchive || []).slice().sort((a, b) => b.createdAt - a.createdAt);
  };

  const saveToArchive = () => {
    const ta = document.getElementById('po-text');
    const text = ta?.value?.trim();
    if (!text) { Toast.show('Niente da salvare', 'warning'); return; }
    const camp = App.getActiveCampaign();
    const archive = [...(camp?.previouslyOnArchive || [])];
    archive.push({ id: 'po_' + Date.now(), testo: text, createdAt: Date.now() });
    App.saveActiveCampaign({ previouslyOnArchive: archive });
    Toast.show('Salvato in archivio', 'success', 1500);
    _renderArchive();
  };

  const loadFromArchive = (id) => {
    const item = _getArchive().find(x => x.id === id);
    if (!item) return;
    const ta = document.getElementById('po-text');
    if (ta) ta.value = item.testo;
  };

  const deleteFromArchive = (id) => {
    openConfirmModal('Eliminare questo riepilogo?', 'Verrà rimosso dall\'archivio.', () => {
      const camp = App.getActiveCampaign();
      const archive = (camp?.previouslyOnArchive || []).filter(x => x.id !== id);
      App.saveActiveCampaign({ previouslyOnArchive: archive });
      _renderArchive();
      Toast.show('Eliminato', 'info');
    });
  };

  const copyText = () => {
    const ta = document.getElementById('po-text');
    const text = ta?.value || '';
    if (!text.trim()) { Toast.show('Niente da copiare', 'warning'); return; }
    const done = () => Toast.show('Copiato negli appunti', 'success', 1500);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => { ta.select(); document.execCommand('copy'); done(); });
    } else {
      ta.select();
      document.execCommand('copy');
      done();
    }
  };

  const _renderArchive = () => {
    const el = document.getElementById('po-archive-list');
    if (!el) return;
    const archive = _getArchive();
    if (!archive.length) {
      el.innerHTML = '<div class="text-muted text-sm" style="padding:6px 0;">Nessun riepilogo salvato ancora.</div>';
      return;
    }
    el.innerHTML = archive.map(a => {
      const date = new Date(a.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const preview = _esc(a.testo.slice(0, 90)) + (a.testo.length > 90 ? '…' : '');
      return '<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);">' +
        '<div style="flex:1;min-width:0;cursor:pointer;" onclick="PreviouslyOn.loadFromArchive(\'' + a.id + '\')">' +
          '<div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:2px;">' + date + '</div>' +
          '<div style="font-size:0.8rem;line-height:1.4;">' + preview + '</div>' +
        '</div>' +
        '<button class="btn btn-ghost btn-icon-sm" title="Elimina" onclick="PreviouslyOn.deleteFromArchive(\'' + a.id + '\')">' + _svgTrash + '</button>' +
      '</div>';
    }).join('');
  };

  // ── Modal ──
  const _injectModal = () => {
    if (_injected) return;
    _injected = true;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay hidden';
    overlay.id = 'modal-previously-on';
    overlay.style.display = 'none';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) Modal.close('previously-on'); });
    overlay.innerHTML =
      '<div class="modal" style="max-width:560px;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title">Previously On...</h3>' +
          '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'previously-on\')">' + _svgClose + '</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">' +
            '<label class="text-sm" style="color:var(--text-muted);">Ultime</label>' +
            '<select id="po-n" class="form-input" style="width:70px;padding:4px;" onchange="PreviouslyOn.regenerate()">' +
              '<option value="1">1</option><option value="2">2</option><option value="3">3</option>' +
            '</select>' +
            '<label class="text-sm" style="color:var(--text-muted);">sessioni</label>' +
            '<button class="btn btn-primary btn-sm" onclick="PreviouslyOn.regenerate()" style="margin-left:auto;">Genera</button>' +
          '</div>' +
          '<textarea id="po-text" class="form-textarea" rows="9" placeholder="Clicca Genera per creare il riepilogo..." style="font-size:0.85rem;line-height:1.6;width:100%;"></textarea>' +
          '<div style="display:flex;gap:8px;margin-top:8px;">' +
            '<button class="btn btn-secondary btn-sm" onclick="PreviouslyOn.copyText()">Copia</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="PreviouslyOn.saveToArchive()">Salva in archivio</button>' +
          '</div>' +
          '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);">' +
            '<h4 style="font-family:var(--font-display);font-size:0.85rem;margin:0 0 6px;color:var(--text-muted);">Archivio</h4>' +
            '<div id="po-archive-list"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  };

  const regenerate = () => {
    const n = parseInt(document.getElementById('po-n')?.value, 10) || 1;
    const ta = document.getElementById('po-text');
    if (ta) ta.value = generate(n);
  };

  const open = () => {
    _injectModal();
    Modal.open('previously-on');
    regenerate();
    _renderArchive();
  };

  // ── Card in Dashboard ──
  const _ensureCard = () => {
    if (document.getElementById('dash-prevon-card')) return;
    const grid = document.querySelector('#page-campagna .dash-grid');
    if (!grid) return;

    const card = document.createElement('div');
    card.className = 'card dash-card-full';
    card.id = 'dash-prevon-card';
    card.innerHTML =
      '<div class="card-header"><h3 class="card-title">Previously On...</h3></div>' +
      '<div style="padding:6px 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">' +
        '<div style="font-size:0.82rem;color:var(--text-muted);">Riassunto narrativo delle ultime sessioni, pronto da condividere con il gruppo.</div>' +
        '<button class="btn btn-primary btn-sm" onclick="PreviouslyOn.open()">Genera</button>' +
      '</div>';

    // Subito dopo "Fili in sospeso" se c'e' gia', altrimenti dopo la prima card a piena
    // larghezza (Ultima Sessione) — stesso criterio di inserimento di StaleThreads.
    const anchor = document.getElementById('dash-stale-card') || grid.querySelector('.dash-card-full');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(card, anchor.nextSibling);
    else grid.appendChild(card);
  };

  const render = () => _ensureCard();

  const _hook = () => {
    if (typeof App === 'undefined' || App._prevOnHooked) return;
    const origNavigateTo = App.navigateTo;
    App.navigateTo = function (pageId) {
      origNavigateTo.apply(App, arguments);
      if (pageId === 'campagna') setTimeout(render, 150);
    };
    App._prevOnHooked = true;
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(_hook, 200));

  return { open, regenerate, copyText, saveToArchive, loadFromArchive, deleteFromArchive };
})();

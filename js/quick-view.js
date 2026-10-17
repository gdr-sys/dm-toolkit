/* ============================================================
   QUICK-VIEW.JS — Pannello "vista rapida" affiancato.

   Finora un click su una @menzione o un [[Link]] sostituiva sempre la
   pagina che si stava guardando (WikiSections._jumpToEntity naviga e
   basta): per controllare un PNG citato a meta' sessione si doveva
   abbandonare quello che si stava leggendo. Questo modulo aggiunge
   un pannello laterale, non invasivo (non copre il resto della
   pagina, si chiude da solo), che mostra una scheda in sola lettura
   senza spostarsi da dove si e'.

   Si apre con Ctrl/Cmd+click su una @menzione o un [[Link]] (il click
   semplice continua a navigare come sempre), oppure da altri punti
   dell'app — es. i pin della Mappa — chiamando QuickView.open(tipo,id)
   direttamente.

   Modulo autonomo: costruisce il proprio pannello a runtime, nessun
   markup statico in index.html.
   ============================================================ */

const QuickView = (() => {
  let _open = false;

  const _escHtml = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // I campi 'long'/'secret' sono HTML (editor ricco): per la vista rapida basta
  // il testo, niente formattazione — e' un riepilogo, non l'editor.
  const _plainText = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = String(html);
    return (tmp.textContent || '').trim();
  };

  const _injectPanel = () => {
    if (document.getElementById('quick-view-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'quick-view-panel';
    panel.innerHTML =
      '<div id="qv-header">' +
        '<div style="min-width:0;">' +
          '<div id="qv-type" style="font-size:0.68rem;font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);"></div>' +
          '<div id="qv-title" style="font-family:var(--font-display);font-size:1.05rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>' +
        '</div>' +
        '<button class="btn btn-ghost btn-icon-sm" onclick="QuickView.close()" aria-label="Chiudi" style="flex-shrink:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '</div>' +
      '<div id="qv-body"></div>' +
      '<div id="qv-footer">' +
        '<button class="btn btn-primary btn-sm" id="qv-open-full" style="width:100%;">Apri scheda completa</button>' +
      '</div>';
    document.body.appendChild(panel);

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && _open) close(); });
  };

  const _renderFields = (cfg, item) => {
    const rows = (cfg.fields || []).map(f => {
      let val = item[f.key];
      if (val === undefined || val === null || val === '') return '';
      if (f.type === 'date_inworld') {
        if (!val || typeof val !== 'object') return '';
        val = [val.giorno, val.mese, val.anno].filter(v => v !== undefined && v !== null).join('/');
        if (!val) return '';
      } else if (f.type === 'long' || f.type === 'secret') {
        val = _plainText(val);
        if (!val) return '';
      } else if (Array.isArray(val)) {
        val = val.join(', ');
        if (!val) return '';
      } else {
        val = _plainText(String(val));
      }
      const isSecret = f.type === 'secret';
      return (
        '<div class="' + (isSecret ? 'wiki-callout wiki-callout-secret' : '') + '" style="margin-bottom:10px;' + (isSecret ? 'padding:8px 10px;border-radius:var(--radius-sm);' : '') + '">' +
          '<div style="font-size:0.68rem;font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:2px;">' + _escHtml(f.label) + '</div>' +
          '<div style="font-size:0.85rem;line-height:1.5;color:var(--text-secondary);white-space:pre-wrap;">' + _escHtml(val) + '</div>' +
        '</div>'
      );
    }).join('');
    return rows || '<div class="text-muted text-sm">Nessun dettaglio compilato.</div>';
  };

  const open = (type, id) => {
    if (typeof WikiSections === 'undefined') return;
    const cfg = WikiSections._getCfg(type);
    if (!cfg) return;
    const camp = App.getActiveCampaign();
    const item = (cfg.getData(camp) || []).find(x => x.id === id);
    if (!item) { Toast.show('Voce non trovata', 'warning'); return; }

    _injectPanel();
    document.getElementById('qv-type').textContent = cfg.label || type;
    document.getElementById('qv-title').textContent = item.nome || '(senza nome)';
    document.getElementById('qv-body').innerHTML = _renderFields(cfg, item);
    document.getElementById('qv-open-full').onclick = () => {
      close();
      WikiSections.goto(type);
      setTimeout(() => WikiSections.openCard(type, id), 150);
    };

    const panel = document.getElementById('quick-view-panel');
    panel.classList.add('qv-visible');
    _open = true;
  };

  const close = () => {
    const panel = document.getElementById('quick-view-panel');
    if (panel) panel.classList.remove('qv-visible');
    _open = false;
  };

  return { open, close };
})();

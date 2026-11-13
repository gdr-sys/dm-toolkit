/* DM Toolkit — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   MUSICA.JS — Pagina "Musica": playlist della campagna da
   preparare prima e avere a portata di mano al tavolo. Ogni
   playlist ha nome, descrizione e brani; un brano e' un link a
   YouTube, Spotify, Tabletop Audio, un file su Google Drive o
   qualunque pagina. Nessun file audio passa dall'app o da
   Firebase: si salvano solo i link (camp.playlist).
   I link YouTube si possono ascoltare dentro la pagina ("Ascolta
   qui"), gli altri si aprono in una nuova scheda.
   Il blocco "Musica e atmosfere" dello Schermo del DM mostra le
   stesse playlist (Musica.bloccoSchermo).
   ============================================================ */

const Musica = (() => {
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);
  const _id = (p) => p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  let _inAscolto = null; // id del brano YouTube aperto nel lettore

  // I link salvati prima nel blocco dello Schermo (camp.musica, per categoria) diventano playlist
  const _playlist = () => {
    const camp = _camp();
    if (!camp) return [];
    if (!camp.playlist && (camp.musica || []).length) {
      const perCat = {};
      camp.musica.forEach(m => { (perCat[m.categoria || 'Altro'] = perCat[m.categoria || 'Altro'] || []).push({ id: _id('tr'), nome: m.nome, url: m.url }); });
      const migrate = Object.entries(perCat).map(([nome, tracce]) => ({ id: _id('pl'), nome, descrizione: '', tracce }));
      App.saveActiveCampaign({ playlist: migrate });
      return migrate;
    }
    return camp.playlist || [];
  };
  const _salva = (lista) => App.saveActiveCampaign({ playlist: lista });
  const _aggiorna = (fn) => { _salva(fn(JSON.parse(JSON.stringify(_playlist())))); render(); try { Schermo.render(); } catch (e) {} };

  const _youtube = (url) => {
    const s = String(url || '');
    const lista = s.match(/[?&]list=([\w-]+)/);
    const video = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{6,})/);
    if (video) return 'https://www.youtube-nocookie.com/embed/' + video[1] + '?autoplay=1' + (lista ? '&list=' + lista[1] : '');
    if (lista) return 'https://www.youtube-nocookie.com/embed/videoseries?list=' + lista[1] + '&autoplay=1';
    return null;
  };
  const _fonte = (url) => {
    const s = String(url || '');
    if (/youtu/.test(s)) return 'YouTube';
    if (/spotify/.test(s)) return 'Spotify';
    if (/tabletopaudio/.test(s)) return 'Tabletop Audio';
    if (/drive\.google/.test(s)) return 'Drive';
    try { return new URL(s).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  };

  const _iconaPlay = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>';
  const _iconaApri = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  const _iconaX = '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  const _cardPlaylist = (p) =>
    '<div class="card" style="flex:1 1 340px;min-width:0;margin:0;">' +
      '<div class="card-header" style="flex-wrap:wrap;gap:6px;align-items:flex-start;">' +
        '<div style="flex:1;min-width:160px;">' +
          '<input type="text" class="form-input" autocomplete="off" value="' + _esc(p.nome) + '" aria-label="Nome della playlist" style="font-family:var(--font-display);font-size:1rem;background:transparent;border-color:transparent;padding:2px 4px;" onchange="Musica._campo(\'' + p.id + '\',\'nome\',this.value)">' +
          // La descrizione va a capo e cresce col testo, invece di essere tagliata su una riga
          '<textarea class="form-input musica-desc" rows="1" autocomplete="off" placeholder="Quando usarla (es. combattimenti contro i Custodi)" aria-label="Descrizione" oninput="this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\'" onchange="Musica._campo(\'' + p.id + '\',\'descrizione\',this.value)">' + _esc(p.descrizione || '') + '</textarea>' +
        '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm" style="color:var(--danger-text);" onclick="Musica._elimina(\'' + p.id + '\')">Elimina</button>' +
      '</div>' +
      ((p.tracce || []).length
        ? (p.tracce || []).map(t => {
            const yt = _youtube(t.url);
            return '<div style="border-bottom:1px solid var(--border);padding:8px 0;">' +
              // Il nome ha la sua larghezza e va a capo per parole; se lo spazio non basta, sono i
              // pulsanti a scendere sotto, invece di stringere il nome fino a spezzarlo.
              '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;">' +
                '<div style="flex:1 1 170px;min-width:0;"><div style="font-size:0.9rem;line-height:1.3;overflow-wrap:break-word;">' + _esc(t.nome) + '</div>' +
                  '<div style="font-size:0.72rem;color:var(--text-muted);">' + _esc(_fonte(t.url)) + '</div></div>' +
                '<div style="display:flex;align-items:center;gap:8px;margin-left:auto;">' +
                (yt ? '<button type="button" class="btn ' + (_inAscolto === t.id ? 'btn-primary' : 'btn-secondary') + ' btn-sm" style="display:inline-flex;gap:5px;align-items:center;" onclick="Musica.ascolta(\'' + t.id + '\')">' + _iconaPlay + (_inAscolto === t.id ? 'In ascolto' : 'Ascolta qui') + '</button>' : '') +
                '<a class="btn btn-ghost btn-sm" style="display:inline-flex;gap:5px;align-items:center;" href="' + _esc(t.url) + '" target="_blank" rel="noopener">' + _iconaApri + 'Apri</a>' +
                '<button type="button" class="btn btn-ghost btn-icon-sm" aria-label="Rimuovi brano" onclick="Musica._togliTraccia(\'' + p.id + '\',\'' + t.id + '\')">' + _iconaX + '</button>' +
                '</div>' +
              '</div>' +
              (yt && _inAscolto === t.id ? '<div style="max-width:420px;margin-top:8px;"><div style="position:relative;padding-top:56.25%;border-radius:var(--radius-sm);overflow:hidden;background:#000;"><iframe src="' + _esc(yt) + '" title="' + _esc(t.nome) + '" allow="autoplay; encrypted-media" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0;"></iframe></div></div>' : '') +
            '</div>';
          }).join('')
        : '<div style="font-size:0.82rem;color:var(--text-muted);padding:6px 0;">Ancora nessun brano.</div>') +
      '<button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="Musica._aggiungiTraccia(\'' + p.id + '\')">+ Aggiungi brano o link</button>' +
    '</div>';

  const render = () => {
    const el = document.getElementById('page-musica');
    if (!el) return;
    const lista = _playlist();
    // Safari (iPad) non conosce field-sizing: l'altezza delle descrizioni si calcola dopo il disegno
    requestAnimationFrame(() => el.querySelectorAll('.musica-desc').forEach((t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }));
    el.innerHTML =
      '<div class="page-header">' +
        '<div><h1 class="page-title">Musica e atmosfere</h1>' +
          '<p class="page-subtitle">Prepara le playlist della campagna: al tavolo le hai pronte, qui e nello Schermo del DM.</p></div>' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="Musica._nuova()">+ Nuova playlist</button>' +
      '</div>' +
      (lista.length
        ? '<div style="display:flex;flex-wrap:wrap;gap:var(--space-md);align-items:flex-start;">' + lista.map(_cardPlaylist).join('') + '</div>'
        : '<div class="card" style="max-width:760px;"><div style="font-size:0.9rem;color:var(--text-secondary);line-height:1.65;">' +
            'Crea una playlist per ogni atmosfera — <em>Battaglia</em>, <em>Taverna</em>, <em>Esplorazione</em>, <em>Tensione</em>, il tema di un nemico — e aggiungi i link ai brani: YouTube, Spotify, Tabletop Audio, file su Google Drive. ' +
            'I video di YouTube si possono ascoltare direttamente qui. Si salvano solo i link: nessun file audio passa dall\'app.' +
          '</div><button type="button" class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="Musica._nuova()">Crea la prima playlist</button></div>');
  };

  const ascolta = (trId) => { _inAscolto = _inAscolto === trId ? null : trId; render(); };
  const _nuova = () => openInputModal('Nome della playlist (es. Battaglia, Taverna)', '', (nome) => {
    if (!String(nome || '').trim()) return;
    _aggiorna(l => [...l, { id: _id('pl'), nome: nome.trim(), descrizione: '', tracce: [] }]);
  });
  const _campo = (id, k, v) => _aggiorna(l => l.map(p => p.id === id ? { ...p, [k]: String(v).trim() } : p));
  const _elimina = (id) => openConfirmModal('Eliminare la playlist?', 'Verranno eliminati anche i suoi link.', () => _aggiorna(l => l.filter(p => p.id !== id)));
  const _togliTraccia = (pid, tid) => _aggiorna(l => l.map(p => p.id !== pid ? p : { ...p, tracce: (p.tracce || []).filter(t => t.id !== tid) }));
  const _aggiungiTraccia = (pid) => openInputModal('Link del brano o della playlist', 'https://', (url) => {
    url = String(url || '').trim();
    if (!/^https?:\/\/\S+$/.test(url)) { Toast.show('Serve un link che inizi con https://', 'warning'); return; }
    openInputModal('Nome (es. Tema dei Custodi)', '', (nome) => {
      _aggiorna(l => l.map(p => p.id !== pid ? p : { ...p, tracce: [...(p.tracce || []), { id: _id('tr'), nome: String(nome || '').trim() || _fonte(url) || 'Brano', url }] }));
    });
  });

  // Contenuto del blocco "Musica e atmosfere" dello Schermo del DM
  const bloccoSchermo = () => {
    const lista = _playlist();
    if (!lista.length) return '<div style="font-size:0.82rem;color:var(--text-muted);line-height:1.5;">Nessuna playlist ancora.</div>' +
      '<button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="App.navigateTo(\'musica\')">Prepara le playlist</button>';
    return lista.map(p =>
      '<div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin:8px 0 4px;">' + _esc(p.nome) + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + ((p.tracce || []).map(t =>
        '<a href="' + _esc(t.url) + '" target="_blank" rel="noopener" style="padding:4px 10px;font-size:0.82rem;color:var(--text-primary);text-decoration:none;border:1px solid var(--border);border-radius:var(--radius-full);">' + _esc(t.nome) + '</a>').join('') || '<span style="font-size:0.78rem;color:var(--text-muted);">vuota</span>') +
      '</div>').join('') +
      '<button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="App.navigateTo(\'musica\')">Gestisci le playlist</button>';
  };

  const _aggancia = () => {
    if (typeof App === 'undefined' || App._musicaHooked) return;
    const orig = App.navigateTo;
    App.navigateTo = function (pageId) {
      orig.apply(App, arguments);
      // La musica continua mentre si usano le altre pagine (la pagina e' solo nascosta): tornando
      // qui non si ridisegna se il lettore e' in funzione, altrimenti ripartirebbe da capo.
      if (pageId === 'musica' && !(_inAscolto && document.querySelector('#page-musica iframe'))) render();
    };
    App._musicaHooked = true;
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { _aggancia(); if (document.getElementById('page-musica')?.classList.contains('active')) render(); }, 200));

  return { render, ascolta, bloccoSchermo, _nuova, _campo, _elimina, _togliTraccia, _aggiungiTraccia };
})();

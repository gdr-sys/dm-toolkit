/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   TRASLOCO.JS — Passaggio dal vecchio indirizzo (gdr-sys.github.io/dm-toolkit)
   al nuovo (pocketgmscreen.pages.dev).

   Ogni indirizzo ha la sua memoria del browser: al nuovo indirizzo l'app
   partirebbe vuota. Qui, sul vecchio indirizzo, una barra invita a spostarsi
   e il pulsante "Porta le campagne" apre il nuovo indirizzo e gli consegna,
   con postMessage, campagne e impostazioni salvate nel browser. Sul nuovo
   indirizzo, aperto con ?trasloco=1, si chiedono i dati alla finestra che
   l'ha aperto (solo se viene dal vecchio indirizzo), si uniscono a quelli
   eventualmente gia' presenti e si ricarica la pagina.
   ============================================================ */

const Trasloco = (() => {
  const VECCHIO = 'https://gdr-sys.github.io';
  const NUOVO = 'https://pocketgmscreen.pages.dev';
  const ATTIVO = true; // barra sul vecchio indirizzo
  const CHIAVI = /^(dmtoolkit_|dm_|pgs_)/;
  const FATTO = 'pgs_trasloco_fatto';

  const sulVecchio = location.origin === VECCHIO;
  const sulNuovo = location.origin === NUOVO;

  const _leggi = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const _scrivi = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  const _dati = () => {
    const o = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (CHIAVI.test(k) && k !== FATTO) o[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return o;
  };

  const _haCampagne = () => {
    try { return (JSON.parse(_leggi('dmtoolkit_campaigns') || '[]') || []).length > 0; } catch (e) { return false; }
  };

  // ── Nuovo indirizzo: riceve e unisce ──
  const _unisci = (dati) => {
    let arrivate = [];
    try { arrivate = JSON.parse(dati.dmtoolkit_campaigns || '[]') || []; } catch (e) {}
    let qui = [];
    try { qui = JSON.parse(_leggi('dmtoolkit_campaigns') || '[]') || []; } catch (e) {}
    // Campagne: per id, vince la versione aggiornata piu' di recente
    const mappa = new Map(qui.map((c) => [c.id, c]));
    for (const c of arrivate) {
      const g = mappa.get(c.id);
      if (!g || (c.updatedAt || 0) > (g.updatedAt || 0)) mappa.set(c.id, c);
    }
    if (arrivate.length) _scrivi('dmtoolkit_campaigns', JSON.stringify([...mappa.values()]));
    // Il resto: solo cio' che qui manca (impostazioni gia' scelte al nuovo indirizzo restano)
    for (const [k, v] of Object.entries(dati)) {
      if (k === 'dmtoolkit_campaigns') continue;
      if (_leggi(k) === null) _scrivi(k, v);
    }
    return arrivate.length;
  };

  const _ricevi = () => {
    if (!window.opener) return;
    const onMsg = (e) => {
      if (e.origin !== VECCHIO || !e.data || e.data.tipo !== 'pgs-trasloco-dati') return;
      window.removeEventListener('message', onMsg);
      const n = _unisci(e.data.dati || {});
      try { window.opener.postMessage({ tipo: 'pgs-trasloco-fatto', campagne: n }, VECCHIO); } catch (err) {}
      _scrivi('pgs_trasloco_arrivato', String(n));
      location.replace(location.pathname);
    };
    window.addEventListener('message', onMsg);
    try { window.opener.postMessage({ tipo: 'pgs-trasloco-pronto' }, VECCHIO); } catch (e) {}
  };

  const _benvenuto = () => {
    const n = _leggi('pgs_trasloco_arrivato');
    if (n === null) return;
    try { localStorage.removeItem('pgs_trasloco_arrivato'); } catch (e) {}
    setTimeout(() => {
      try { Toast.show(Number(n) ? 'Campagne arrivate: ' + n + '. Se usavi l’accesso o Google Drive, ricollegali da qui.' : 'Impostazioni arrivate al nuovo indirizzo.', 'success', 7000); } catch (e) {}
    }, 1500);
  };

  // ── Vecchio indirizzo: consegna ──
  const porta = () => {
    const w = window.open(NUOVO + '/?trasloco=1', '_blank');
    if (!w) { location.href = NUOVO + '/'; return; } // finestre bloccate: almeno si arriva al nuovo indirizzo
    const onMsg = (e) => {
      if (e.origin !== NUOVO || e.source !== w || !e.data) return;
      if (e.data.tipo === 'pgs-trasloco-pronto') w.postMessage({ tipo: 'pgs-trasloco-dati', dati: _dati() }, NUOVO);
      if (e.data.tipo === 'pgs-trasloco-fatto') {
        window.removeEventListener('message', onMsg);
        _scrivi(FATTO, '1');
        _barra();
      }
    };
    window.addEventListener('message', onMsg);
  };

  const _barra = () => {
    let b = document.getElementById('pgs-trasloco');
    if (!b) {
      b = document.createElement('div');
      b.id = 'pgs-trasloco';
      b.setAttribute('role', 'region');
      b.setAttribute('aria-label', 'Nuovo indirizzo');
      b.style.cssText = 'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:10001;width:min(640px,calc(100vw - 24px));background:var(--bg-card,#221c19);color:var(--text-primary,#f1e9e3);border:1px solid var(--border,#3a302b);border-radius:18px;padding:14px 16px;box-shadow:0 12px 36px rgba(0,0,0,.35);display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;font:500 .9rem/1.45 var(--font-body,system-ui)';
      document.body.appendChild(b);
    }
    const fatto = _leggi(FATTO) === '1';
    const campagne = _haCampagne();
    const testo = fatto
      ? 'Fatto: le tue campagne sono al nuovo indirizzo. Da ora apri Pocket GM Screen da lì.'
      : campagne
        ? 'Pocket GM Screen ha un nuovo indirizzo. Porta lì le tue campagne con un clic: qui restano comunque una copia.'
        : 'Pocket GM Screen ha un nuovo indirizzo: da ora lo trovi lì.';
    b.innerHTML = '<span style="flex:1 1 260px;min-width:0;">' + testo + ' <b style="white-space:nowrap;">pocketgmscreen.pages.dev</b></span>' +
      '<span style="display:flex;gap:8px;flex-wrap:wrap;">' +
      (campagne && !fatto
        ? '<button type="button" class="btn btn-primary btn-sm" style="min-height:36px;" onclick="Trasloco.porta()">Porta le campagne</button>'
        : '<a class="btn btn-primary btn-sm" style="min-height:36px;display:inline-flex;align-items:center;text-decoration:none;" href="' + NUOVO + '/">Apri il nuovo indirizzo</a>') +
      '<button type="button" class="btn btn-ghost btn-sm" style="min-height:36px;" onclick="document.getElementById(\'pgs-trasloco\').remove()">Più tardi</button>' +
      '</span>';
  };

  const init = () => {
    if (sulNuovo) {
      if (new URLSearchParams(location.search).has('trasloco')) _ricevi();
      else _benvenuto();
    } else if (sulVecchio && ATTIVO && !new URLSearchParams(location.search).has('giocatori')) {
      setTimeout(_barra, 2500);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  return { porta };
})();

/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   SUPPORTO.JS — Ko-fi, senza disturbare.
   - Voce "Offrimi un caffè" nel menu Aiuto (apre Ko-fi).
   - Dopo "Salva e chiudi la sessione" (il momento in cui l'app
     ha appena servito), un piccolo riquadro in basso, non un
     modale: alla 3a sessione chiusa e poi ogni 8. Mai nella
     campagna di esempio, mai sopra un'altra finestra aperta.
     "Non chiederlo più" lo spegne per sempre su quel dispositivo.
   Nessuno script esterno: è solo un link, niente cookie.
   ============================================================ */

const Supporto = (() => {
  const URL_KOFI = 'https://ko-fi.com/noemimarcolini';
  const K_CONTA = 'pgsSupportoChiusure';
  const K_MAI = 'pgsSupportoMai';
  const PRIMA_VOLTA = 3;
  const OGNI = 8;

  const _leggi = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const _scrivi = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  const ICONA_CAFFE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><path d="M7 2v3M11 2v3M15 2v3"/></svg>';

  const apriKofi = () => { window.open(URL_KOFI, '_blank', 'noopener'); };

  // ── Voce nel menu Aiuto, sotto "Altre app e informazioni" ──
  const _voceMenu = () => {
    if (document.getElementById('supporto-voce')) return;
    const info = document.querySelector('#nav-aiuto button[onclick*="info-app"]');
    if (!info) return;
    const a = document.createElement('a');
    a.id = 'supporto-voce';
    a.className = 'nav-item nav-subitem';
    a.href = URL_KOFI;
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.textDecoration = 'none';
    a.onclick = () => { try { closeMobileMenu(); } catch (e) {} };
    a.innerHTML = '<span class="nav-icon">' + ICONA_CAFFE + '</span><span class="nav-label">Offrimi un caffè</span>';
    info.insertAdjacentElement('afterend', a);
  };

  // ── Riquadro dopo la chiusura della sessione ──
  const _chiudiRiquadro = () => {
    const el = document.getElementById('supporto-riquadro');
    if (el) el.remove();
  };

  const _nonPiu = () => { _scrivi(K_MAI, '1'); _chiudiRiquadro(); };

  const _mostraRiquadro = () => {
    if (document.getElementById('supporto-riquadro')) return;
    const el = document.createElement('div');
    el.id = 'supporto-riquadro';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<div class="supporto-testa">' +
        '<span class="supporto-icona">' + ICONA_CAFFE + '</span>' +
        '<strong>Ti è utile al tavolo?</strong>' +
        '<button type="button" class="btn btn-ghost btn-icon-sm supporto-x" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '</div>' +
      '<p>Pocket GM Screen è gratuito e lo resterà. Lo porto avanti da sola: se vuoi, puoi offrirmi un caffè su Ko-fi.</p>' +
      '<div class="supporto-azioni">' +
        '<a class="btn btn-primary btn-sm" href="' + URL_KOFI + '" target="_blank" rel="noopener">Offrimi un caffè</a>' +
        '<button type="button" class="btn btn-ghost btn-sm supporto-mai">Non chiederlo più</button>' +
      '</div>';
    el.querySelector('.supporto-x').onclick = _chiudiRiquadro;
    el.querySelector('.supporto-mai').onclick = _nonPiu;
    el.querySelector('a').addEventListener('click', () => setTimeout(_chiudiRiquadro, 300));
    document.body.appendChild(el);
  };

  const _finestraAperta = () =>
    [...document.querySelectorAll('.modal-overlay')].some(o => o.style.display && o.style.display !== 'none');

  // Aspetta che non ci siano finestre aperte (es. il turno delle fazioni che parte dopo la chiusura)
  const _quandoLibero = (tentativi) => {
    if (_finestraAperta()) {
      if (tentativi > 0) setTimeout(() => _quandoLibero(tentativi - 1), 3000);
      return;
    }
    _mostraRiquadro();
  };

  const _dopoChiusura = () => {
    if (_leggi(K_MAI)) return;
    try { if (App.getActiveCampaign()?.demo) return; } catch (e) {}
    const n = (parseInt(_leggi(K_CONTA), 10) || 0) + 1;
    _scrivi(K_CONTA, String(n));
    if (n === PRIMA_VOLTA || (n > PRIMA_VOLTA && (n - PRIMA_VOLTA) % OGNI === 0)) {
      setTimeout(() => _quandoLibero(40), 5000); // dopo il messaggio "Sessione chiusa"
    }
  };

  const _aggancia = () => {
    _voceMenu();
    if (typeof ChiusuraSessione === 'undefined' || !ChiusuraSessione.salva || ChiusuraSessione._supporto) return;
    const orig = ChiusuraSessione.salva;
    ChiusuraSessione.salva = function () {
      const r = orig.apply(ChiusuraSessione, arguments);
      const o = document.getElementById('modal-chiusura-sessione');
      if (o && o.style.display === 'none') _dopoChiusura(); // salvata davvero (non bloccata dai controlli)
      return r;
    };
    ChiusuraSessione._supporto = true;
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(_aggancia, 400));

  return { apriKofi, _mostraRiquadro };
})();

/* ============================================================
   SCENA.JS — La scena disegnata in cima alle pagine (nuova grafica).
   Non servono illustrazioni: il paesaggio nasce dal nome (stesso nome,
   stessa scena) e prende i colori dalla tavolozza scelta nelle
   Impostazioni, quindi cambia con tema e colore senza ridisegnarlo.
   Qui stanno anche i due segni del gioco usati nelle tessere:
   la ruota a spicchi dei clock e i pallini di avanzamento.
   Stili in css/scena.css.
   ============================================================ */

const Scena = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  let _n = 0;

  // Generatore casuale ripetibile: dallo stesso testo escono sempre gli stessi numeri
  const _seme = (s) => {
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  };
  const _el = (n, a, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const _cresta = (r, base, amp, rug) => {
    const f1 = r() * 6.28, f2 = r() * 6.28, f3 = r() * 6.28;
    let d = 'M0 620V' + base;
    for (let x = 0; x <= 1440; x += 24) {
      const y = base - amp * (.5 + .5 * Math.sin(x / 260 + f1)) - amp * .45 * Math.sin(x / 97 + f2) - rug * Math.sin(x / 31 + f3) - rug * (r() - .5);
      d += 'L' + x + ' ' + y.toFixed(1);
    }
    return d + 'V620Z';
  };

  // Il tipo di paesaggio si intuisce dalle parole del nome o della descrizione; altrimenti lo sceglie il nome
  const tipo = (testo) => {
    const t = String(testo || '').toLowerCase();
    if (/vulcan|cener|lava|fuoco|fiamm|brac|drag/.test(t)) return 'vulcano';
    if (/mont|picc|vett|nev|ghiacc|nan[io]\b|rocc/.test(t)) return 'monti';
    if (/vall|coll|villag|bosc|forest|torre|castel|regno|citt/.test(t)) return 'colline';
    return ['monti', 'colline', 'vulcano', 'colline'][Math.floor(_seme(t)() * 4)];
  };

  const disegna = (svg) => {
    const nome = svg.dataset.seme || 'x';
    const r = _seme(nome), tp = svg.dataset.tipo && svg.dataset.tipo !== 'auto' ? svg.dataset.tipo : tipo(nome), id = 'sc' + (_n++);
    svg.setAttribute('viewBox', '0 0 1440 620'); svg.setAttribute('preserveAspectRatio', 'xMidYMid slice'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '';
    const defs = _el('defs', {}, svg);
    const g1 = _el('linearGradient', { id: id + 'c', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    _el('stop', { offset: 0, style: 'stop-color:var(--sc-c1)' }, g1); _el('stop', { offset: 1, style: 'stop-color:var(--sc-c2)' }, g1);
    const lx = 55 + r() * 25, ly = tp === 'vulcano' ? 40 : 22 + r() * 14;
    const g2 = _el('radialGradient', { id: id + 'g', cx: lx + '%', cy: ly + '%', r: '55%' }, defs);
    _el('stop', { offset: 0, style: 'stop-color:var(--sc-luce);stop-opacity:.8' }, g2); _el('stop', { offset: 1, style: 'stop-color:var(--sc-luce);stop-opacity:0' }, g2);
    _el('rect', { width: 1440, height: 620, fill: 'url(#' + id + 'c)' }, svg); _el('rect', { width: 1440, height: 620, fill: 'url(#' + id + 'g)' }, svg);
    const st = _el('g', { style: 'fill:var(--text-primary);opacity:var(--sc-stelle)' }, svg);
    for (let i = 0; i < 34; i++) _el('circle', { cx: (r() * 1440).toFixed(0), cy: (r() * 300).toFixed(0), r: (.6 + r() * 1.1).toFixed(1) }, st);
    if (tp !== 'vulcano') _el('circle', { cx: lx * 14.4, cy: ly * 6.2, r: 34 + r() * 16, style: 'fill:var(--sc-luce);opacity:.9' }, svg);
    _el('path', { d: _cresta(r, 400, 150, 10), style: 'fill:var(--sc-m0)' }, svg);
    if (tp === 'vulcano') {
      const cx = lx * 14.4, top = 235;
      _el('path', { d: 'M' + (cx - 10) + ' ' + (top - 6) + 'c18-58-28-88 8-146 10 48 58 58 40 116 28-20 38-48 34-78 38 48 20 98-10 126z', style: 'fill:var(--sc-luce);opacity:.85' }, svg);
      _el('path', { d: 'M' + (cx - 330) + ' 620 ' + (cx - 36) + ' ' + top + 'l38 20 30-16 34 18 30-22 320 400z', style: 'fill:var(--sc-m1)' }, svg);
      _el('path', { d: 'M' + (cx + 2) + ' ' + (top + 20) + 'l-24 118 44-58 20 108 24-138 40 88-10-118-30 22-34-18z', style: 'fill:var(--sc-ac);opacity:.75' }, svg);
      const br = _el('g', { style: 'fill:var(--sc-luce)' }, svg);
      for (let i = 0; i < 9; i++) _el('circle', { cx: (cx - 140 + r() * 320).toFixed(0), cy: (60 + r() * 150).toFixed(0), r: (1 + r() * 1.4).toFixed(1) }, br);
    } else _el('path', { d: _cresta(r, 470, 130, tp === 'monti' ? 26 : 6), style: 'fill:var(--sc-m1)' }, svg);
    if (tp === 'colline') { const tx = 980 + r() * 200; _el('path', { d: 'M' + tx + ' 470v-74h-8v-16h10v8h10v-8h10v8h10v-8h10v16h-8v74z', style: 'fill:var(--sc-m2)' }, svg); }
    _el('path', { d: _cresta(r, 540, 90, tp === 'monti' ? 16 : 5), style: 'fill:var(--sc-m2)' }, svg);
    _el('path', { d: _cresta(r, 600, 50, 4), style: 'fill:var(--bg-primary)' }, svg);
    svg.dataset.fatta = nome;
  };

  // Disegna tutte le scene non ancora disegnate (o il cui nome e' cambiato)
  const tutte = (radice) => (radice || document).querySelectorAll('svg.sc-scena').forEach((s) => { if (s.dataset.fatta !== (s.dataset.seme || 'x')) disegna(s); });
  const svg = (seme, tp) => '<svg class="sc-scena" data-seme="' + String(seme || '').replace(/"/g, '&quot;').replace(/</g, '&lt;') + '" data-tipo="' + (tp || 'auto') + '"></svg>';

  // ── Segni del gioco ──
  const ruota = (k, n) => {
    k = Math.max(0, +k || 0); n = Math.max(1, +n || 1);
    let h = '<svg class="sc-ruota" viewBox="-52 -52 104 104" role="img" aria-label="' + k + ' su ' + n + '">';
    if (n === 1) return h + '<circle r="50"' + (k ? ' class="on"' : '') + '/></svg>';
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.2832 - 1.5708, b = (i + 1) / n * 6.2832 - 1.5708;
      h += '<path' + (i < k ? ' class="on"' : '') + ' d="M0 0L' + (50 * Math.cos(a)).toFixed(2) + ' ' + (50 * Math.sin(a)).toFixed(2) + 'A50 50 0 0 1 ' + (50 * Math.cos(b)).toFixed(2) + ' ' + (50 * Math.sin(b)).toFixed(2) + 'Z"/>';
    }
    return h + '</svg>';
  };
  const pallini = (k, n) => {
    let h = '<div class="sc-pallini" role="img" aria-label="' + k + ' su ' + n + '">';
    for (let i = 0; i < n; i++) h += '<i' + (i < k ? ' class="on"' : '') + '></i>';
    return h + '</div>';
  };

  // ── Intestazione con scena per le pagine che hanno un .page-header o un titolo di sezione ──
  const _camp = () => (typeof App !== 'undefined' && App.getActiveCampaign ? App.getActiveCampaign() : null);
  const _intesta = () => {
    const pag = document.querySelector('#main-content .page.active');
    if (!pag || pag.id === 'page-campagna' || pag.id === 'page-home') { tutte(); return; }
    const nome = (_camp()?.name || 'DM Toolkit');
    // Wiki: l'intestazione e' il primo blocco dell'elenco visibile; le altre pagine hanno .page-header
    const teste = [...pag.querySelectorAll('.page-header, [id^="wiki-"][id$="-list"] > div:first-child, .sc-testa, .hub-testa-scena')].filter((t) => t.offsetParent !== null);
    teste.forEach((t) => {
      if (!t.classList.contains('sc-hero')) {
        t.classList.add('sc-hero', 'sc-basso');
        t.insertAdjacentHTML('afterbegin', svg(t.dataset.scSeme || (nome + ' · ' + pag.id), t.dataset.scTipo || (pag.id.indexOf('wiki') >= 0 ? 'colline' : 'auto')));
      }
      // A tutta larghezza: l'intestazione esce dai margini interni della pagina
      t.style.marginLeft = t.style.marginRight = t.style.marginTop = '0px';
      const contenitore = t.closest('[id^="wiki-"][id$="-list"]') || pag;
      const rc = contenitore.getBoundingClientRect(), rt = t.getBoundingClientRect();
      if (rt.width > 0) {
        t.style.marginLeft = -(rt.left - rc.left) + 'px';
        t.style.marginRight = -(rc.right - rt.right) + 'px';
        t.style.marginTop = -Math.max(0, rt.top - rc.top + contenitore.scrollTop) + 'px';
      }
    });
    tutte();
  };
  // Disegnare cambia la pagina: mentre si lavora l'osservatore e' spento, o ripartirebbe da solo
  let _t = null, _oss = null;
  const _giro = () => { if (_oss) _oss.disconnect(); try { _intesta(); } finally { const m = document.getElementById('main-content'); if (_oss && m) _oss.observe(m, OPZ); } };
  const OPZ = { subtree: true, attributes: true, attributeFilter: ['class', 'style'], childList: true };
  // Le pagine entrano con una breve animazione: si rimisura anche a fine animazione, o i margini restano quelli di meta' strada
  let _t2 = null, _t3 = null;
  const aggiorna = () => { clearTimeout(_t); clearTimeout(_t2); clearTimeout(_t3); _t = setTimeout(_giro, 60); _t2 = setTimeout(_giro, 450); _t3 = setTimeout(_giro, 1100); };

  const avvia = () => {
    const main = document.getElementById('main-content');
    if (main) { _oss = new MutationObserver(aggiorna); _oss.observe(main, OPZ); }
    window.addEventListener('resize', aggiorna);
    aggiorna();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();

  return { disegna, tutte, svg, tipo, ruota, pallini, aggiorna };
})();

/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   CARTOGRAFO-BATTAGLIA.JS — Battle map illustrate: piccole scene da
   scontro con la griglia da 1,5 m, fatte con elementi dipinti
   (assets/battlemap: terreni a piastrella e oggetti visti dall'alto).
   Tutto nasce in quadretti (le posizioni non dipendono da legenda o
   titolo), poi si disegna in pixel. Le immagini si caricano una volta,
   la prima volta che si sceglie "Battle map" (CartoBattaglia.carica).
   Scene: strada nel bosco, ponte sul fiume, interno di una locanda.
   I punti numerati dicono cosa danno al tavolo: copertura, terreno
   difficile, acqua. Stampa in scala e tavolo virtuale come i dungeon.
   ============================================================ */

const CartoBattaglia = (() => {
  const M = CartoMotore, n1 = M.n1;
  // Quadretti nelle proporzioni di un A4 orizzontale (297 x 210 mm = 1,414)
  const DIM = { piccola: [17, 12], media: [24, 17], grande: [31, 22] };
  const NOMI = [
    'alberello-1', 'alberello-2', 'albero-morto', 'altare', 'alveare', 'ancora', 'anfore', 'balle-fieno', 'bancarella-blu', 'bancarella-gialla',
    'bancarella-rossa', 'banco-frutta', 'banco-pesce', 'bancone', 'barca', 'barca-vela', 'barile', 'baule', 'botti', 'braciere', 'camino',
    'cancellata', 'canneto-1', 'canneto-2', 'capanno', 'cappella', 'carro', 'carro-fieno', 'carro-rovesciato', 'cartello', 'casa-ardesia',
    'casa-paglia', 'casa-tegole', 'cassa', 'ceppo', 'cerchio-funghi', 'cespuglio-1', 'cespuglio-2', 'cespuglio-3', 'cespuglio-bianco',
    'cespuglio-giallo', 'cima', 'colonna-crollata', 'cristalli-1', 'cristalli-2', 'croce-celtica', 'fattoria', 'fontana', 'forno', 'forziere',
    'fossa', 'funghi-1', 'funghi-2', 'fuoco-campo', 'gabbia', 'lanterna', 'lapide-1', 'lapide-2', 'lapide-3', 'legnaia', 'letto', 'macerie',
    'masso-1', 'masso-2', 'masso-3', 'mausoleo', 'molo', 'muretto-rotto', 'nasse', 'ninfee-1', 'ninfee-2', 'ossa', 'panca', 'pino-1', 'pino-2',
    'pino-3', 'ponte-legno', 'ponte-pietra', 'pozza-caverna', 'pozzo', 'quercia-1', 'quercia-2', 'quercia-3', 'rastrelliera', 'reti', 'roccia-grande',
    'rovi-1', 'rovi-2', 'ruota', 'sacchi', 'sarcofago', 'sassi-guado', 'sasso-1', 'sasso-2', 'sasso-3', 'scaffale', 'scale', 'scheletro', 'scoglio-1',
    'scoglio-2', 'sedia', 'sgabello', 'spaventapasseri', 'staccionata', 'stagno', 'stalagmiti-1', 'stalagmiti-2', 'stalagmiti-3', 'statua-angelo',
    'statua-cavaliere', 'tappeto', 'tavolo-lungo', 'tavolo-tondo-1', 'tavolo-tondo-2', 'tenda', 'terreno-acqua-bassa', 'terreno-acqua-profonda',
    'terreno-ciottolato', 'terreno-erba', 'terreno-erba-secca', 'terreno-fango', 'terreno-legno', 'terreno-pietra', 'terreno-terra', 'tesoro',
    'tronco-caduto',
    // Deserto, neve e carrozza (generati con ChatGPT il 2026-11-22)
    'cactus-1', 'cactus-2', 'cactus-3', 'palma-1', 'palma-2', 'roccia-arenaria', 'rotolacampo', 'teschio', 'sassi-deserto', 'pino-neve-1', 'pino-neve-2', 'pino-neve-3', 'albero-spoglio-neve', 'cespuglio-neve', 'masso-neve', 'stagno-ghiacciato', 'cumulo-neve', 'legna-neve', 'carrozza', 'carrozza-cavalli', 'cavalli', 'terreno-sabbia', 'terreno-neve', 'terreno-neve-calpestata'];

  /* ── Immagini: si leggono una volta come data URL, cosi' finiscono dentro l'SVG ── */
  const _img = {};
  let _carico = null;
  const _leggi = (nome) => fetch('assets/battlemap/' + nome + '.webp')
    .then((r) => { if (!r.ok) throw new Error(nome); return r.blob(); })
    .then((b) => new Promise((ok, no) => { const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = no; f.readAsDataURL(b); }))
    .then((url) => new Promise((ok, no) => { const i = new Image(); i.onload = () => { _img[nome] = { url, w: i.naturalWidth, h: i.naturalHeight, el: i }; ok(); }; i.onerror = no; i.src = url; }));
  const carica = () => {
    if (!_carico) _carico = Promise.all(NOMI.map(_leggi)).catch((e) => { _carico = null; throw e; });
    return _carico;
  };
  const pronta = () => NOMI.every((n) => _img[n]);

  /* ── Terreni e oggetti derivati (deserto, neve): ricolorati una volta dalle immagini dipinte ──
     Le piastrelle si ricolorano pixel per pixel (restano senza giunte); gli oggetti innevati
     ricevono macchie bianche a rumore, piu' fitte sulle parti in luce. */
  const _hash = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const _vn = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, s = (t) => t * t * (3 - 2 * t);
    const a = _hash(xi, yi), b = _hash(xi + 1, yi), c = _hash(xi, yi + 1), d = _hash(xi + 1, yi + 1);
    return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
  };
  const _lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const _ricolora = (da, nuovo, f, opaco) => {
    if (_img[nuovo] || !_img[da]) return;
    const im = _img[da], c = document.createElement('canvas'); c.width = im.w; c.height = im.h;
    const g = c.getContext('2d'); g.drawImage(im.el, 0, 0);
    const d = g.getImageData(0, 0, im.w, im.h), p = d.data;
    // Luminosita' normalizzata sui valori reali dell'immagine, cosi' la trama resta leggibile
    let lo = 1, hi = 0;
    for (let i = 0; i < p.length; i += 16) { if (p[i + 3] < 128) continue; const L = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / 255; if (L < lo) lo = L; if (L > hi) hi = L; }
    const span = Math.max(0.05, hi - lo);
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const L = Math.max(0, Math.min(1, ((p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / 255 - lo) / span));
      const q = i / 4, o = f([p[i], p[i + 1], p[i + 2]], L, q % im.w, (q / im.w) | 0, im.w, im.h);
      p[i] = o[0]; p[i + 1] = o[1]; p[i + 2] = o[2];
    }
    g.putImageData(d, 0, 0);
    _img[nuovo] = { url: opaco ? c.toDataURL('image/jpeg', 0.88) : c.toDataURL('image/webp', 0.86), w: im.w, h: im.h };
  };
  const _scala = (c0, c1) => (rgb, L) => _lerp(c0, c1, L);
  const _innevato = (forza) => (rgb, L, x, y, W) => {
    const sc = Math.max(6, W / 7), n = 0.65 * _vn(x / sc, y / sc) + 0.35 * _vn(x / sc * 2.3 + 7, y / sc * 2.3 + 3);
    const t = Math.max(0, Math.min(1, (n + (L - 0.5) * 0.55 - 0.4 - (1 - forza) * 0.25) / 0.18)) * 0.92 * forza;
    return _lerp(rgb, [236 + 16 * L, 242 + 11 * L, 248 + 7 * L], t);
  };
  const DA_INNEVARE = ['quercia-1', 'quercia-2', 'quercia-3', 'pino-1', 'pino-2', 'pino-3', 'alberello-1', 'alberello-2', 'cespuglio-1', 'cespuglio-2', 'cespuglio-3',
    'masso-1', 'masso-2', 'masso-3', 'sasso-1', 'sasso-2', 'sasso-3', 'roccia-grande', 'scoglio-1', 'scoglio-2', 'rovi-1', 'rovi-2', 'ceppo', 'tronco-caduto', 'albero-morto'];
  const _derivati = { deserto: false, neve: false };
  const _deriva = (bioma) => {
    if (_derivati[bioma] || typeof document === 'undefined') return;
    if (bioma === 'deserto') {
      _ricolora('terreno-sabbia', 'gen-sabbia', _scala([196, 150, 92], [250, 230, 184]), true);
      // Cespugli secchi: stessa forma dei cespugli, colori della steppa
      ['cespuglio-1', 'cespuglio-2', 'cespuglio-3'].forEach((n) => _ricolora(n, 'gen-' + n + '-secco', _scala([92, 72, 40], [196, 170, 108])));
      _ricolora('terreno-sabbia', 'gen-sabbia-scura', _scala([160, 116, 68], [224, 184, 126]), true);
    }
    if (bioma === 'neve') {
      _ricolora('terreno-fango', 'gen-neve', _scala([192, 204, 220], [252, 253, 255]), true);
      _ricolora('terreno-neve', 'gen-neve-calpestata', _scala([170, 180, 196], [232, 236, 244]), true);
      _ricolora('terreno-fango', 'gen-neve-strada', _scala([112, 104, 100], [206, 204, 206]), true);
      DA_INNEVARE.forEach((n) => _ricolora(n, 'gen-' + n + '-neve', _innevato(/masso|sasso|roccia|scoglio/.test(n) ? 0.55 : 1)));
    }
    _derivati[bioma] = true;
  };
  // Che terreno usa ogni piastrella in ogni ambiente (l'id del pattern resta lo stesso: le scene non cambiano)
  const BIOMI = {
    prato: {},
    secco: { 'terreno-erba': 'terreno-erba-secca', 'terreno-erba-secca': 'terreno-terra' },
    deserto: { 'terreno-erba': 'gen-sabbia', 'terreno-erba-secca': 'gen-sabbia-scura', 'terreno-terra': 'gen-sabbia-scura', 'terreno-fango': 'gen-sabbia-scura' },
    neve: { 'terreno-erba': 'terreno-neve', 'terreno-erba-secca': 'gen-neve-calpestata', 'terreno-terra': 'terreno-neve-calpestata', 'terreno-fango': 'gen-neve-calpestata' },
    fango: { 'terreno-erba': 'terreno-fango', 'terreno-fango': 'terreno-erba-secca' },
  };
  const AL_CHIUSO = ['caverna', 'cripta', 'locanda'];
  // Spezza una linea nei tratti dove "tieni" e' vero: i pezzi non si ricollegano sopra l'acqua
  const spezza = (l, tieni) => {
    const out = []; let cur = [];
    l.forEach((p) => { if (tieni(p[0], p[1])) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } });
    if (cur.length > 1) out.push(cur);
    return out;
  };

  // Curva liscia che attraversa la mappa (in quadretti), da un lato all'altro
  const _attraversa = (r, rn, cols, rows, verticale, ampiezza, seme) => {
    const pts = [];
    const lung = verticale ? rows : cols, larg = verticale ? cols : rows;
    const base = larg * r.range(0.38, 0.62);
    for (let i = -1; i <= lung + 1; i += 0.5) {
      const off = (rn(i * 0.09 + seme, seme * 0.37) - 0.5) * ampiezza * 2;
      const c = Math.max(3, Math.min(larg - 3, base + off));
      pts.push(verticale ? [c, i] : [i, c]);
    }
    return pts;
  };
  const _distSpezzata = (p, l) => {
    let min = Infinity;
    for (let i = 1; i < l.length; i++) min = Math.min(min, M.distSeg(p, l[i - 1], l[i]));
    return min;
  };
  const _vicino = (l, w, asse) => l.reduce((b, p, i) => Math.abs(p[asse] - w) < Math.abs(l[b][asse] - w) ? i : b, 0);

  const battaglia = (o) => {
    if (!pronta()) throw new Error('immagini delle battle map non ancora caricate');
    const r = M.rng('battaglia:' + o.seme), rn = M.rumore(r);
    const EXTRA = typeof CartoBattagliaScene !== 'undefined' ? CartoBattagliaScene : {};
    const SCENE = ['bosco', 'ponte', 'locanda'].concat(Object.keys(EXTRA).filter((k) => !k.includes('_')));
    const scelta = SCENE.includes(o.scena) ? o.scena : SCENE.includes(String(o.scena).split('_')[0]) ? String(o.scena).split('_')[0] : 'bosco';
    // Ogni scena ha piu' impianti: varianti con una pianta diversa, non gli stessi oggetti spostati
    const impianti = [scelta].concat(Object.keys(EXTRA).filter((k) => k.startsWith(scelta + '_')));
    // La variante si sceglie dal menu (o.impianto) o col nome completo (o.scena = 'bosco_bivio'); altrimenti a caso
    const imp = o.impianto && o.impianto !== 'caso' ? o.impianto : null;
    const scena = imp ? (EXTRA[scelta + '_' + imp] ? scelta + '_' + imp : scelta)
      : EXTRA[o.scena] && o.scena.includes('_') ? o.scena : String(o.scena).endsWith('_base') ? scelta : r.pick(impianti);
    const chiuso = AL_CHIUSO.includes(scelta);
    const bioma = !chiuso && BIOMI[o.terreno] ? o.terreno : 'auto';
    if (bioma === 'deserto' || bioma === 'neve') _deriva(bioma);
    const mappa = BIOMI[bioma] || {};
    const VEG = chiuso ? 1 : ({ nessuna: 0, rada: 0.5, normale: 1, fitta: 1.7 })[o.vegetazione] ?? 1;
    const notte = o.palette === 'notte';
    const t = M.TONI_INTERNI[notte ? 'notte' : 'colori'];
    const carta = M.cartaInterni(t);
    const ink = t.ink;
    const [cols, rows] = DIM[o.taglia] || DIM.media;
    // Foglio intero: la mappa riempie tutta l'immagine, nelle proporzioni di un A4 orizzontale
    // (i quadretti 17x12, 24x17, 31x22 sono scelti per questo); niente titolo, legenda e cornice.
    const foglio = o.impagina !== 'scheda';
    const conLegenda = !foglio && o.legenda !== false;

    /* ── Impaginazione: quanto e' grande un quadretto ── */
    const areaW = conLegenda ? 1400 - 40 - 392 : 1400 - 80, top = o.titolo !== false ? 118 : 46, areaH = 1000 - top - 74;
    const S = foglio ? Math.round(1754 / cols) : Math.floor(Math.min(areaW / cols, areaH / rows)); // 1754 px = A4 a 150 punti per pollice
    const W = foglio ? cols * S : 1400, H = foglio ? rows * S : 1000;
    const ox = foglio ? 0 : Math.round(40 + (areaW - cols * S) / 2), oy = foglio ? 0 : Math.round(top + (areaH - rows * S) / 2);
    const X = (u) => ox + u * S, Y = (u) => oy + u * S;
    const P = ([u, w]) => [X(u), Y(w)];
    const linea = (l) => 'M' + l.map((p) => P(p).map(n1).join(' ')).join('L');

    /* ── Strumenti di disegno ── */
    const usate = new Set();
    const QUERCE = ['quercia-1', 'quercia-2', 'quercia-3'], PINI = ['pino-1', 'pino-2', 'pino-3'], CESPUGLI = ['cespuglio-1', 'cespuglio-2', 'cespuglio-3'];
    const MASSI = ['masso-1', 'masso-2', 'masso-3'], SASSI = ['sasso-1', 'sasso-2', 'sasso-3'];
    const ALBERI = new Set(QUERCE.concat(PINI, ['alberello-1', 'alberello-2']));
    const PINI_NEVE = ['pino-neve-1', 'pino-neve-2', 'pino-neve-3'], PALME = ['palma-1', 'palma-2'], CACTUS = ['cactus-1', 'cactus-2', 'cactus-3'];
    // Misure diverse da quella dell'oggetto che sostituiscono (un cactus non e' grande come una quercia)
    const MISURA = { 'cactus-1': 0.5, 'cactus-2': 0.42, 'cactus-3': 0.5, 'palma-1': 0.95, 'palma-2': 0.8, rotolacampo: 0.75, teschio: 0.8, 'sassi-deserto': 1.1, 'cumulo-neve': 1.2, 'albero-spoglio-neve': 0.95 };
    // Gli oggetti cambiano con l'ambiente: pini innevati, cespugli secchi nel deserto, meno alberi se la vegetazione e' rada
    const sostituto = (nome) => {
      if (chiuso) return nome;
      if (ALBERI.has(nome)) {
        if (VEG === 0 || (VEG < 1 && r.chance(1 - VEG))) return null;
        if (bioma === 'neve') { const t = r.f(); return t < 0.62 ? r.pick(PINI_NEVE) : t < 0.84 ? 'albero-spoglio-neve' : 'gen-' + r.pick(PINI) + '-neve'; }
        if (bioma === 'deserto') { const t = r.f(); return t < 0.22 ? r.pick(PALME) : t < 0.5 ? r.pick(CACTUS) : t < 0.55 ? 'albero-morto' : null; }
        if (bioma === 'secco' && QUERCE.includes(nome) && r.chance(0.25)) return 'albero-morto';
        if (bioma === 'fango' && QUERCE.includes(nome) && r.chance(0.45)) return 'albero-morto';
        return nome;
      }
      if (bioma === 'neve') {
        if (['cespuglio-bianco', 'cespuglio-giallo'].includes(nome) || (CESPUGLI.includes(nome) && r.chance(0.5))) return r.chance(0.6) ? 'cespuglio-neve' : 'gen-' + r.pick(CESPUGLI) + '-neve';
        if ((MASSI.includes(nome) || nome === 'roccia-grande') && r.chance(0.5)) return 'masso-neve';
        if (nome === 'stagno') return 'stagno-ghiacciato';
        if (nome === 'legnaia') return 'legna-neve';
        if (nome === 'ceppo') return r.chance(0.5) ? 'cumulo-neve' : 'gen-ceppo-neve';
        if (['funghi-1', 'funghi-2', 'cerchio-funghi', 'ninfee-1', 'ninfee-2', 'alveare'].includes(nome)) return null;
        return _img['gen-' + nome + '-neve'] ? 'gen-' + nome + '-neve' : nome;
      }
      if (bioma === 'deserto') {
        if (CESPUGLI.includes(nome) || ['cespuglio-bianco', 'cespuglio-giallo', 'rovi-1', 'rovi-2'].includes(nome)) { const t = r.f(); return t < 0.35 ? 'rotolacampo' : t < 0.6 ? 'gen-' + r.pick(CESPUGLI) + '-secco' : t < 0.8 ? 'sassi-deserto' : null; }
        if (MASSI.includes(nome) || nome === 'roccia-grande' || SASSI.includes(nome)) return SASSI.includes(nome) ? 'sassi-deserto' : 'roccia-arenaria';
        if (nome === 'ceppo') return r.chance(0.35) ? 'teschio' : 'sassi-deserto';
        if (nome === 'ossa' && r.chance(0.5)) return 'teschio';
        if (['funghi-1', 'funghi-2', 'cerchio-funghi', 'alveare'].includes(nome)) return null;
      }
      if (bioma === 'secco' && CESPUGLI.includes(nome) && r.chance(0.4)) return 'cespuglio-giallo';
      return nome;
    };
    // Un oggetto: centro in quadretti, lato lungo in quadretti, rotazione in gradi
    // Ogni immagine posata ha un numero: a parita' di mappa e opzioni e' sempre lo stesso oggetto,
    // cosi' il DM puo' spostarlo e ruotarlo (o.sposta = { numero: [du, dw, gradi] })
    let nSpr = 0, ultimoSpr = -1;
    const sprInfo = [];
    const spr = (nome0, u, w, lato, rot = 0) => {
      const id = nSpr++; ultimoSpr = id;
      const d = o.sposta && o.sposta[id];
      if (d) { u += d[0] || 0; w += d[1] || 0; rot += d[2] || 0; }
      const nome = sostituto(nome0);
      if (!nome || !_img[nome]) return '';
      if (nome !== nome0 && MISURA[nome]) lato *= MISURA[nome];
      const im = _img[nome]; usate.add(nome);
      const k = (lato * S) / Math.max(im.w, im.h);
      const use = `<use href="#bm-${nome}" transform="translate(${n1(X(u))} ${n1(Y(w))}) rotate(${n1(rot)}) scale(${(Math.round(k * 10000) / 10000)})"/>`;
      const tolto = !!(o.togli && o.togli.includes(id));
      sprInfo.push({ id, u, w, r: lato / 2, nome, use, tolto, albero: QUERCE.includes(nome0) || PINI.includes(nome0) || CESPUGLI.includes(nome0) });
      return tolto ? '' : use;
    };
    // Piastrella di terreno: un'immagine ogni "lato" quadretti (l'ambiente puo' cambiarne l'immagine, non l'id)
    const fatti = new Set();
    const pattern = (nome, lato, ruota = 0) => {
      if (fatti.has(nome)) return ''; fatti.add(nome);
      const src = _img[mappa[nome]] ? mappa[nome] : nome; usate.add(src);
      return `<pattern id="bm-p-${nome}" patternUnits="userSpaceOnUse" x="${ox}" y="${oy}"${ruota ? ` patternTransform="rotate(${ruota} ${ox} ${oy})"` : ''} width="${n1(lato * S)}" height="${n1(lato * S)}"><use href="#bm-${src}" transform="translate(${n1(lato * S / 2)} ${n1(lato * S / 2)}) scale(${(Math.round(lato * S / _img[src].w * 10000) / 10000)})"/></pattern>`;
    };
    // Tipo di strada scelto (sterrata o selciata): vale per strade, sentieri e piazze che ne seguono il tipo
    const viaPat = (pat) => {
      if (pat !== 'terreno-terra' && pat !== 'terreno-ciottolato') return pat;
      const p = o.strada === 'sterrata' ? 'terreno-terra' : o.strada === 'selciata' ? 'terreno-ciottolato' : pat;
      L.defs += p === 'terreno-terra' ? pattern(p, 6, 90) : pattern(p, 3);
      return p;
    };
    // Zone dove non si posano gli oggetti aggiunti: acqua e strade (le scene le registrano)
    const zone = { acqua: [], strada: [] }, strade = [];
    const zona = (tipo, f) => zone[tipo].push(f);
    let interno = null; // al chiuso senza pianta (locanda): dove si puo' posare
    const punti = [];
    const segna = (u, w, titolo, testo) => punti.push({ u, w, titolo, testo });
    const occupati = []; // [u, w, raggio, mobile?]
    // oltreMobili: alberi e cespugli non contano (lasciano il posto agli oggetti scelti dal DM)
    const libero = (u, w, rr, oltreMobili) => occupati.every(([a, b, q, m]) => (oltreMobili && m != null) || Math.hypot(a - u, b - w) > rr + q);
    const occupa = (u, w, rr, m) => occupati.push([u, w, rr, m]);
    // Alberi e cespugli si scrivono come segnaposto: se un oggetto aggiunto ha bisogno del loro posto, spariscono
    const mobili = [];
    const tieni = (svg) => mobili.push({ svg, via: false }) - 1;
    const segnaposto = (i) => '\u0001' + i + '\u0001';
    const sgombra = (u, w, rr) => {
      for (let i = occupati.length - 1; i >= 0; i--) { const [a, b, q, m] = occupati[i]; if (m != null && Math.hypot(a - u, b - w) < rr + q) { mobili[m].via = true; occupati.splice(i, 1); } }
    };
    const muri = [], porte = [];
    const L = { defs: '', terra: '', sotto: '', sopra: '', alto: '', luci: '' };
    let nome;
    const c = (nomi) => r.pick(nomi.filter((n) => _img[n]));
    // Macchia irregolare (stagno, radura, chiazza) come percorso in pixel
    const macchia = (cu, cw, ru, rw, irr = 0.25) => {
      const q = [], n = 28, ph = r.range(0, 9);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 + (rn(Math.cos(a) * 1.3 + ph, Math.sin(a) * 1.3 + ph) - 0.5) * irr * 2; q.push([X(cu + Math.cos(a) * ru * k), Y(cw + Math.sin(a) * rw * k)]); }
      return M.via(M.morbida(q, 2, true));
    };
    // Bosco: alberi ovunque "ok(u, w)" lo permette, piu' o meno fitti
    const bosco = (ok, fitto = 1, pini = 0.45) => {
      const lista = [];
      for (let tent = 0; tent < cols * rows * 1.3 * fitto * Math.max(1, VEG); tent++) {
        const u = r.range(-0.6, cols + 0.6), w = r.range(-0.6, rows + 0.6), lato = r.range(2.1, 3);
        if (!ok(u, w) || !libero(u, w, lato * 0.42)) continue;
        const i = tieni('');
        lista.push([u, w, lato, i]); occupa(u, w, lato * 0.42, i);
      }
      lista.sort((a, b) => a[1] - b[1]).forEach(([u, w, lato, i]) => { mobili[i].svg = spr(c(r.chance(pini) ? PINI : QUERCE), u, w, lato, r.range(0, 360)); mobili[i].id = ultimoSpr; L.alto += segnaposto(i); });
      return lista;
    };
    // Oggetti sparsi a terra (cespugli, sassi, ceppi...)
    const sparsi = (quanti, ok, nomi, min, max) => {
      for (let i = 0, messi = 0; i < quanti * 8 && messi < quanti; i++) {
        const u = r.range(0.5, cols - 0.5), w = r.range(0.5, rows - 0.5), lato = r.range(min, max);
        if (!ok(u, w) || !libero(u, w, lato * 0.45)) continue;
        const i = tieni(spr(c(nomi), u, w, lato, r.range(0, 360))); mobili[i].id = ultimoSpr;
        L.sotto += segnaposto(i); occupa(u, w, lato * 0.45, i); messi++;
      }
    };
    const luce = (u, w, raggio, colore = '#ffb347', forza = 0.45) => { L.luci += `<circle cx="${n1(X(u))}" cy="${n1(Y(w))}" r="${n1(S * raggio)}" fill="${colore}" opacity="${forza}" filter="url(#carto-b40)" style="mix-blend-mode:screen"/>`; };
    // Riempie con un terreno solo dove la maschera e' bianca
    const maschera = (id, dentro) => { L.defs += `<mask id="bm-m-${id}" maskUnits="userSpaceOnUse">${dentro}</mask>`; };
    const riempi = (pat, id, extra = '') => `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="url(#bm-p-${pat})"${id ? ` mask="url(#bm-m-${id})"` : ''}${extra}/>`;
    // Quadretti calpestabili (grotte, cripte): il resto e' roccia o muro per il tavolo virtuale
    let celleOk = null;
    const pianta = (ok, muriAuto = true) => {
      celleOk = ok;
      if (!muriAuto) return;
      const den = (u, w) => u >= 0 && w >= 0 && u < cols && w < rows && ok(u + 0.5, w + 0.5);
      for (let w = 0; w < rows; w++) for (let u = 0; u < cols; u++) {
        if (u + 1 < cols && den(u, w) !== den(u + 1, w)) muri.push([u + 1, w, u + 1, w + 1]);
        if (w + 1 < rows && den(u, w) !== den(u, w + 1)) muri.push([u, w + 1, u + 1, w + 1]);
      }
    };
    // Muri di pietra disegnati (e porte di legno), allineati alla griglia
    const murature = (lista, listaPorte = [], pat = 'terreno-pietra') => {
      L.defs += pattern(pat, 3);
      const spM = Math.max(8, S * 0.36);
      const dM = lista.map(([a, b, c2, d]) => `M${n1(X(a))} ${n1(Y(b))}L${n1(X(c2))} ${n1(Y(d))}`).join('');
      // Muro scuro con la pietra sopra, piu' scura del pavimento: si distingue anche quando il pavimento e' di pietra
      L.alto += `<path d="${dM}" stroke="#000" stroke-width="${n1(spM * 2.4)}" opacity="0.35" filter="url(#carto-b12)"/><path d="${dM}" stroke="#1c1712" stroke-width="${n1(spM + Math.max(4, S * 0.08))}" stroke-linecap="square"/><path d="${dM}" stroke="url(#bm-p-${pat})" stroke-width="${n1(spM)}" stroke-linecap="square"/><path d="${dM}" stroke="#2b241d" stroke-width="${n1(spM)}" stroke-linecap="square" opacity="0.45"/>`;
      listaPorte.forEach(({ seg: [a, b, c2] }) => {
        const vert = a === c2, x = X(a), y = Y(b);
        L.alto += vert ? `<rect x="${n1(x - spM / 2)}" y="${n1(y + 2)}" width="${n1(spM)}" height="${n1(S - 4)}" fill="#8a5a32" stroke="#2a221c" stroke-width="1.6"/>`
          : `<rect x="${n1(x + 2)}" y="${n1(y - spM / 2)}" width="${n1(S - 4)}" height="${n1(spM)}" fill="#8a5a32" stroke="#2a221c" stroke-width="1.6"/>`;
      });
    };
    const kit = () => ({ o, r, rn, M, n1, cols, rows, S, X, Y, P, linea, notte, L, muri, porte, spr, pattern, segna, libero, occupa, occupati, macchia, bosco, sparsi, tutto, luce, maschera, riempi, c, QUERCE, PINI, CESPUGLI, MASSI, SASSI, attraversa: (vert, amp, seme) => _attraversa(r, rn, cols, rows, vert, amp, seme), dist: _distSpezzata, vicino: _vicino, pianta, murature, img: _img, viaPat, zona, strade, spezza, bioma, VEG, imp });
    const tutto = (pat) => `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="url(#bm-p-${pat})"/>`;

    if (scena === 'bosco') {
      /* ═════ Strada nel bosco: l'imboscata ═════ */
      nome = o.nome || r.pick(['La strada per ', 'Imboscata sulla via di ', 'Il sentiero di ']) + M.nomeLuogo(r, o.popolo);
      const strada = _attraversa(r, rn, cols, rows, false, rows * 0.16, 3);
      const dS = (u, w) => _distSpezzata([u, w], strada);
      L.defs += pattern('terreno-erba', 5) + pattern('terreno-terra', 6, 90) + pattern('terreno-fango', 4);
      L.defs += `<mask id="bm-m-strada" maskUnits="userSpaceOnUse"><path d="${linea(strada)}" fill="none" stroke="#fff" stroke-width="${n1(3.2 * S)}" stroke-linecap="round" filter="url(#carto-b4)"/></mask>`;
      L.terra += `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="url(#bm-p-terreno-erba)"/>`;
      // Chiazze di fango ai bordi della strada
      let chiazze = '';
      for (let i = 0; i < 5; i++) { const k = r.int(2, strada.length - 3), [u, w] = strada[k]; chiazze += `<ellipse cx="${n1(X(u + r.range(-1, 1)))}" cy="${n1(Y(w + r.range(-1.4, 1.4)))}" rx="${n1(S * r.range(0.8, 1.6))}" ry="${n1(S * r.range(0.5, 1))}"/>`; }
      L.terra += `<g fill="url(#bm-p-terreno-fango)" opacity="0.55" filter="url(#carto-b4)">${chiazze}</g>`;
      L.terra += `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="url(#bm-p-${viaPat('terreno-terra')})" mask="url(#bm-m-strada)"/>`;
      zona('strada', (u, w) => dS(u, w) < 1.9); strade.push(strada);

      // Il carro rovesciato sulla strada, con la ruota staccata e le casse cadute
      const iC = Math.floor(strada.length * r.range(0.4, 0.6)), [cu, cw] = strada[iC], q2 = strada[iC + 1];
      const angStrada = Math.atan2(q2[1] - cw, q2[0] - cu) * 180 / Math.PI;
      L.sopra += spr('carro-rovesciato', cu, cw, 3.2, angStrada + r.range(20, 50));
      L.sopra += spr('ruota', cu + r.range(1.4, 2), cw + r.range(1, 1.6), 0.95, r.range(0, 360));
      for (let i = 0; i < 3; i++) { const u = cu + r.range(-2, 2), w = cw + (r.chance(0.5) ? 1 : -1) * r.range(1.2, 1.8); L.sopra += spr(r.pick(['cassa', 'barile', 'sacchi']), u, w, r.range(0.75, 1), r.range(0, 360)); }
      occupa(cu, cw, 2.4);
      segna(cu, cw - 1.6, 'Carro rovesciato', 'Tre quarti di copertura per chi sta dietro.');

      // Albero caduto di traverso sulla strada
      for (let tent = 0; tent < 40; tent++) {
        const u = r.range(3, cols - 3), w = r.range(2, rows - 2);
        if (dS(u, w) > 1 || Math.hypot(u - cu, w - cw) < 5.5) continue;
        L.sopra += spr('tronco-caduto', u, w, 5, angStrada + 90 + r.range(-25, 25));
        occupa(u, w, 1.6);
        segna(u + 1.2, w, 'Albero caduto', 'Mezza copertura; scavalcarlo costa movimento extra.');
        break;
      }
      // Massi ai bordi della strada
      let nM = 0;
      for (let tent = 0; tent < 80 && nM < 3; tent++) {
        const u = r.range(1.5, cols - 1.5), w = r.range(1.5, rows - 1.5), d = dS(u, w);
        if (d < 2.2 || d > 4.2 || !libero(u, w, 1)) continue;
        L.sopra += spr(r.pick(['masso-1', 'masso-2', 'masso-3']), u, w, r.range(1.4, 1.9), r.range(0, 360));
        occupa(u, w, 0.9);
        if (!nM) segna(u, w - 1.2, 'Massi', 'Mezza copertura.');
        nM++;
      }
      // Rovi: terreno difficile
      for (let tent = 0; tent < 80; tent++) {
        const u = r.range(2, cols - 2), w = r.range(2, rows - 2), d = dS(u, w);
        if (d < 2.4 || d > 5 || !libero(u, w, 1.6)) continue;
        L.sopra += spr('rovi-1', u - 0.5, w, 2, r.range(0, 360)) + spr('rovi-2', u + 0.7, w + 0.3, 1.8, r.range(0, 360));
        occupa(u, w, 1.6);
        segna(u, w - 1.5, 'Rovi', 'Terreno difficile; chi ci finisce dentro resta impigliato.');
        break;
      }
      // Cespugli e sassi sparsi
      for (let i = 0; i < cols * rows * 0.03; i++) {
        const u = r.range(0.5, cols - 0.5), w = r.range(0.5, rows - 0.5);
        if (dS(u, w) < 2 || !libero(u, w, 0.6)) continue;
        L.sotto += r.chance(0.6) ? spr(r.pick(['cespuglio-1', 'cespuglio-2', 'cespuglio-3']), u, w, r.range(1, 1.4), r.range(0, 360)) : spr(r.pick(['sasso-1', 'sasso-2', 'sasso-3', 'ceppo']), u, w, r.range(0.6, 0.9), r.range(0, 360));
        occupa(u, w, 0.5);
      }
      // Alberi: fitti ai margini, radi vicino alla strada
      const alberi = [];
      for (let tent = 0; tent < cols * rows * 1.2 * Math.max(1, VEG); tent++) {
        const u = r.range(-0.5, cols + 0.5), w = r.range(-0.5, rows + 0.5), d = dS(u, w);
        if (d < 2.6) continue;
        const lato = r.range(2.2, 3);
        if (!libero(u, w, lato * 0.42) || (d < 4.2 && r.chance(VEG > 1 ? 0.3 : 0.6))) continue;
        alberi.push([u, w, lato]); occupa(u, w, lato * 0.42);
      }
      alberi.sort((a, b) => a[1] - b[1]).forEach(([u, w, lato]) => { L.alto += spr(r.chance(0.55) ? r.pick(['quercia-1', 'quercia-2', 'quercia-3']) : r.pick(['pino-1', 'pino-2', 'pino-3']), u, w, lato, r.range(0, 360)); });
      if (r.chance(0.5)) { const a = alberi.find(([u, w]) => u > 2 && w > 2 && u < cols - 2 && w < rows - 2); if (a) L.alto += spr('albero-morto', a[0] + 3, a[1], 2.2, r.range(0, 360)); }
      const vicino = alberi.filter(([u, w]) => u > 2 && u < cols - 2 && w > 2 && w < rows - 2).sort((a, b) => dS(a[0], a[1]) - dS(b[0], b[1]))[0];
      if (vicino && VEG > 0 && bioma !== 'deserto') segna(vicino[0], vicino[1], 'Alberi', 'Tre quarti di copertura dietro il tronco; ci si può arrampicare.');
    } else if (scena === 'ponte') {
      /* ═════ Ponte sul fiume ═════ */
      nome = o.nome || r.pick(['Il ponte di ', 'Il guado di ', 'Il passo di ']) + M.nomeLuogo(r, o.popolo);
      const fiume = _attraversa(r, rn, cols, rows, true, cols * 0.08, 7);
      const larg = 5.4;
      const dF = (u, w) => _distSpezzata([u, w], fiume);
      L.defs += pattern('terreno-erba', 5) + pattern('terreno-terra', 6, 90) + pattern('terreno-fango', 3) + pattern('terreno-acqua-bassa', 4) + pattern('terreno-acqua-profonda', 5);
      const lf = linea(fiume);
      L.defs += `<mask id="bm-m-riva" maskUnits="userSpaceOnUse"><path d="${lf}" fill="none" stroke="#fff" stroke-width="${n1((larg + 1.2) * S)}" stroke-linecap="round" filter="url(#carto-b4)"/></mask>` +
        `<mask id="bm-m-bassa" maskUnits="userSpaceOnUse"><path d="${lf}" fill="none" stroke="#fff" stroke-width="${n1(larg * S)}" stroke-linecap="round" filter="url(#carto-b4)"/></mask>` +
        `<mask id="bm-m-fonda" maskUnits="userSpaceOnUse"><path d="${lf}" fill="none" stroke="#fff" stroke-width="${n1((larg - 2.4) * S)}" stroke-linecap="round" filter="url(#carto-b12)"/></mask>`;
      L.terra += `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="url(#bm-p-terreno-erba)"/>` +
        `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="url(#bm-p-terreno-fango)" mask="url(#bm-m-riva)"/>` +
        `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="url(#bm-p-terreno-acqua-bassa)" mask="url(#bm-m-bassa)"/>` +
        `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="url(#bm-p-terreno-acqua-profonda)" mask="url(#bm-m-fonda)"/>`;
      // La strada che porta al ponte
      const wP = Math.round(rows * r.range(0.35, 0.65));
      const strada = [[-1, wP + r.range(-1, 1)], [cols * 0.25, wP + r.range(-0.6, 0.6)], [cols * 0.5, wP], [cols * 0.75, wP + r.range(-0.6, 0.6)], [cols + 1, wP + r.range(-1, 1)]];
      // La strada si ferma sulle rive: sull'acqua c'e' solo il ponte
      L.defs += `<mask id="bm-m-strada" maskUnits="userSpaceOnUse"><path d="${linea(strada)}" fill="none" stroke="#fff" stroke-width="${n1(2.6 * S)}" stroke-linecap="round" filter="url(#carto-b4)"/><path d="${lf}" fill="none" stroke="#000" stroke-width="${n1((larg + 0.8) * S)}" stroke-linecap="round" filter="url(#carto-b4)"/></mask>`;
      L.terra += `<g mask="url(#bm-m-strada)"><rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="url(#bm-p-${viaPat('terreno-terra')})"/></g>`;
      zona('acqua', (u, w) => dF(u, w) < larg / 2 + 0.5);
      zona('strada', (u, w) => _distSpezzata([u, w], strada) < 1.7); strade.push(strada);
      // Come si passa: solo il ponte, solo il guado, o tutti e due (si sceglie dalla variante)
      const passaggio = ['ponte', 'guado', 'entrambi'].includes(imp) ? imp : r.pick(['ponte', 'ponte', 'entrambi', 'guado']);
      const iF = _vicino(fiume, wP, 1), cU = fiume[iF][0];
      if (passaggio !== 'guado') {
        const pietra = r.chance(0.45);
        L.sopra += spr(pietra ? 'ponte-pietra' : 'ponte-legno', cU, wP, larg + 2.6, 0);
        occupa(cU, wP, 3.4);
        segna(cU, wP - 1.9, 'Ponte', pietra ? 'I parapetti di pietra danno tre quarti di copertura.' : 'Il parapetto dà mezza copertura; si passa in due affiancati.');
      }
      // Il guado: dove arriva la strada se non c'e' il ponte, altrimenti piu' a valle o a monte
      const wG = passaggio === 'guado' ? wP : wP > rows / 2 ? Math.max(2.2, wP - 5) : Math.min(rows - 2.2, wP + 5);
      if (passaggio !== 'ponte') {
        const gU = fiume[_vicino(fiume, wG, 1)][0];
        for (let k = -larg / 2 + 0.6; k <= larg / 2 - 0.5; k += 0.85) L.sopra += spr(r.pick(['sasso-1', 'sasso-2', 'sasso-3']), gU + k, wG + r.range(-0.18, 0.18), r.range(0.7, 0.85), r.range(0, 360));
        occupa(gU, wG, larg / 2);
        segna(gU - larg / 2 - 0.4, wG + (passaggio === 'guado' ? -1.6 : 0), 'Guado', 'Acqua bassa: terreno difficile. I sassi reggono una persona alla volta.');
      }
      segna(cU + 0.4, wP + (wP > rows / 2 ? 3.4 : -3.4), 'Acqua profonda', 'Si nuota: ogni metro costa il doppio. La corrente spinge a valle.');
      // Canneti e ninfee lungo le rive, e una barca ormeggiata
      let nCanne = 0;
      for (let tent = 0; tent < 40 && nCanne < 3; tent++) {
        const w = r.range(1.5, rows - 1.5); if (Math.abs(w - wP) < 2.6 || Math.abs(w - wG) < 1.8) continue;
        const lato = r.chance(0.5) ? 1 : -1, u = fiume[_vicino(fiume, w, 1)][0] + lato * (larg / 2 - 0.2);
        if (!libero(u, w, 1)) continue;
        L.sopra += spr(r.pick(['canneto-1', 'canneto-2']), u, w, r.range(1.6, 2.1), r.range(-20, 20)); occupa(u, w, 1);
        if (!nCanne) segna(u + lato * 1.5, w, 'Canneto', 'Chi ci si nasconde è difficile da vedere; terreno difficile.');
        nCanne++;
      }
      for (let i = 0; i < 4; i++) {
        const w = r.range(1, rows - 1); if (Math.abs(w - wP) < 2 || Math.abs(w - wG) < 1.2) continue;
        const u = fiume[_vicino(fiume, w, 1)][0] + (r.chance(0.5) ? 1 : -1) * r.range(1.2, 2);
        L.sotto += spr(r.pick(['ninfee-1', 'ninfee-2']), u, w, r.range(0.9, 1.3), r.range(0, 360));
      }
      if (r.chance(0.7)) {
        const w = wP + (wG > wP ? -3.2 : 3.2); if (w > 1.5 && w < rows - 1.5) { const lato = r.chance(0.5) ? 1 : -1, u = fiume[_vicino(fiume, w, 1)][0] + lato * (larg / 2 - 1.1); L.sopra += spr('barca', u, w, 2.4, r.range(-15, 15)); occupa(u, w, 1.1); }
      }
      // Massi, cespugli e alberi sulle rive, lontani dall'acqua e dalla strada
      let nM = 0;
      for (let tent = 0; tent < 60 && nM < 2; tent++) {
        const u = r.range(1.5, cols - 1.5), w = r.range(1.5, rows - 1.5);
        if (dF(u, w) < larg / 2 + 1 || Math.abs(w - wP) < 2 || !libero(u, w, 1)) continue;
        L.sopra += spr(r.pick(['masso-1', 'masso-2', 'masso-3']), u, w, r.range(1.4, 1.8), r.range(0, 360)); occupa(u, w, 0.9);
        if (!nM) segna(u, w - 1.2, 'Massi', 'Mezza copertura.');
        nM++;
      }
      for (let i = 0; i < cols * rows * 0.025; i++) {
        const u = r.range(0.5, cols - 0.5), w = r.range(0.5, rows - 0.5);
        if (dF(u, w) < larg / 2 + 0.8 || Math.abs(w - wP) < 1.8 || !libero(u, w, 0.6)) continue;
        L.sotto += spr(r.pick(['cespuglio-1', 'cespuglio-2', 'cespuglio-3', 'sasso-1', 'sasso-2', 'ceppo']), u, w, r.range(0.8, 1.3), r.range(0, 360)); occupa(u, w, 0.5);
      }
      const alberi = [];
      for (let tent = 0; tent < cols * rows * 0.9 * Math.max(1, VEG); tent++) {
        const u = r.range(-0.5, cols + 0.5), w = r.range(-0.5, rows + 0.5), lato = r.range(2.2, 2.9);
        if (dF(u, w) < larg / 2 + 1.4 || Math.abs(w - wP) < 2.4 || !libero(u, w, lato * 0.42) || r.chance(VEG > 1 ? 0.1 : 0.4)) continue;
        alberi.push([u, w, lato]); occupa(u, w, lato * 0.42);
      }
      alberi.sort((a, b) => a[1] - b[1]).forEach(([u, w, lato]) => { L.alto += spr(r.chance(0.6) ? r.pick(['quercia-1', 'quercia-2', 'quercia-3']) : r.pick(['pino-1', 'pino-2', 'pino-3']), u, w, lato, r.range(0, 360)); });
    } else if (typeof CartoBattagliaScene !== 'undefined' && CartoBattagliaScene[scena]) {
      nome = CartoBattagliaScene[scena](kit());
    } else {
      /* ═════ Interno di una locanda ═════ */
      nome = o.nome || 'Locanda ' + r.pick(['del Cinghiale Allegro', 'del Gallo Nero', 'del Boccale Rotto', 'del Corvo Bianco', 'della Botte Storta', 'del Drago Spezzato', 'dei Tre Pozzi']);
      const c0 = 1, r0 = 1, c1 = cols - 1, r1 = rows - 1;
      const cucinaW = Math.max(4, Math.round((c1 - c0) * 0.26)), cx = c1 - cucinaW;
      interno = (u, w, rr) => u - rr > c0 + 0.4 && u + rr < c1 - 0.4 && w - rr > r0 + 0.4 && w + rr < r1 - 0.4 && Math.abs(u - cx) > rr + 0.4;
      L.defs += pattern('terreno-legno', 3) + pattern('terreno-pietra', 3) + pattern('terreno-erba', 5);
      L.terra += `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="url(#bm-p-terreno-erba)"/>` +
        `<rect x="${X(c0)}" y="${Y(r0)}" width="${(cx - c0) * S}" height="${(r1 - r0) * S}" fill="url(#bm-p-terreno-legno)"/>` +
        `<rect x="${X(cx)}" y="${Y(r0)}" width="${(c1 - cx) * S}" height="${(r1 - r0) * S}" fill="url(#bm-p-terreno-pietra)"/>`;
      // Ombra lungo i muri, dentro la sala
      L.terra += `<rect x="${X(c0)}" y="${Y(r0)}" width="${(c1 - c0) * S}" height="${(r1 - r0) * S}" fill="none" stroke="#000" stroke-width="${n1(S * 0.6)}" opacity="0.28" filter="url(#carto-b12)"/>`;
      // Muri e porte (servono anche al tavolo virtuale)
      const portaF = Math.round((c0 + cx) / 2), portaR = r.int(r0 + 1, r1 - 2), portaC = r.int(r0 + 1, r1 - 2);
      for (let u = c0; u < c1; u++) { muri.push([u, r0, u + 1, r0]); if (u !== portaF) muri.push([u, r1, u + 1, r1]); }
      for (let w = r0; w < r1; w++) { muri.push([c0, w, c0, w + 1]); if (w !== portaR) muri.push([c1, w, c1, w + 1]); if (w !== portaC) muri.push([cx, w, cx, w + 1]); }
      porte.push({ tipo: 'porta', seg: [portaF, r1, portaF + 1, r1] }, { tipo: 'porta', seg: [c1, portaR, c1, portaR + 1] }, { tipo: 'porta', seg: [cx, portaC, cx, portaC + 1] });
      const spM = Math.max(8, S * 0.36);
      const dM = muri.map(([a, b, c, d]) => `M${n1(X(a))} ${n1(Y(b))}L${n1(X(c))} ${n1(Y(d))}`).join('');
      L.alto += `<path d="${dM}" stroke="#2a221c" stroke-width="${n1(spM + 3)}" stroke-linecap="square"/><path d="${dM}" stroke="url(#bm-p-terreno-pietra)" stroke-width="${n1(spM)}" stroke-linecap="square"/>`;
      porte.forEach(({ seg: [a, b, c, d] }) => {
        const vert = a === c, x = X(a), y = Y(b);
        L.alto += vert ? `<rect x="${n1(x - spM / 2)}" y="${n1(y + 2)}" width="${n1(spM)}" height="${n1(S - 4)}" fill="#8a5a32" stroke="#2a221c" stroke-width="1.6"/>`
          : `<rect x="${n1(x + 2)}" y="${n1(y - spM / 2)}" width="${n1(S - 4)}" height="${n1(spM)}" fill="#8a5a32" stroke="#2a221c" stroke-width="1.6"/>`;
      });
      for (let u = c0 + 2; u < cx - 1; u += 4) L.alto += `<rect x="${n1(X(u) + 4)}" y="${n1(Y(r0) - spM * 0.3)}" width="${n1(S * 1.2)}" height="${n1(spM * 0.6)}" fill="${notte ? '#7ebad8' : '#cfe0e6'}" stroke="#2a221c" stroke-width="1"/>`;
      // Bancone lungo il muro della cucina
      const bU = cx - 0.75, bW = r0 + 1 + r.range(0, 1.5), bLung = Math.min(5.5, (r1 - r0) * 0.5);
      L.sopra += spr('bancone', bU, bW + bLung / 2, bLung, 90);
      for (let i = 0; i < Math.floor(bLung / 1.3); i++) L.sopra += spr('sgabello', bU - 1.15, bW + 0.7 + i * 1.3, 0.62, r.range(0, 360));
      occupa(bU - 0.6, bW + bLung / 2, bLung / 2 + 0.6);
      segna(bU, bW - 0.6, 'Bancone', 'Tre quarti di copertura per chi sta dietro.');
      // Camino sul muro di sinistra, con il tappeto davanti
      const camW = Math.round((r0 + r1) / 2);
      L.sotto += spr('tappeto', c0 + 2.3, camW, 2.8, 90);
      L.sopra += spr('camino', c0 + 0.55, camW, 2.4, -90);
      occupa(c0 + 1.5, camW, 2.4);
      segna(c0 + 1.6, camW - 1.6, 'Camino', 'Chi ci finisce dentro prende danni da fuoco.');
      // Tavoli con le sedie girate verso il tavolo
      const tavoli = [];
      for (let tent = 0; tent < 260 && tavoli.length < Math.round((cx - c0) * (r1 - r0) / 15); tent++) {
        const u = r.range(c0 + 1.8, cx - 2.2), w = r.range(r0 + 1.8, r1 - 1.8);
        if (Math.hypot(u - (portaF + 0.5), w - r1) < 2.4 || !libero(u, w, 1.5)) continue;
        tavoli.push([u, w]); occupa(u, w, 1.5);
      }
      tavoli.forEach(([u, w]) => {
        const lungo = r.chance(0.3), rot = lungo ? r.pick([0, 90]) : r.range(0, 360);
        const sedie = lungo ? (rot === 0 ? [[-0.8, -1.25, 0], [0.8, -1.25, 0], [-0.8, 1.25, 180], [0.8, 1.25, 180]] : [[-1.25, -0.8, 270], [-1.25, 0.8, 270], [1.25, -0.8, 90], [1.25, 0.8, 90]])
          : [0, 1, 2, 3].map((k) => { const a = k / 4 * Math.PI * 2 + 0.6; return [Math.cos(a) * 1.15, Math.sin(a) * 1.15, a * 180 / Math.PI + 90]; });
        sedie.forEach(([du, dw, ang]) => { if (r.chance(0.85)) L.sotto += spr('sedia', u + du, w + dw, 0.78, (lungo ? ang + 180 : ang) + r.range(-12, 12)); });
        L.sopra += lungo ? spr('tavolo-lungo', u, w, 2.4, rot + 90) : spr(r.pick(['tavolo-tondo-1', 'tavolo-tondo-2']), u, w, 1.7, rot);
      });
      if (tavoli.length) segna(tavoli[0][0], tavoli[0][1] - 1.7, 'Tavoli', 'Mezza copertura; si possono rovesciare per farne un riparo.');
      // Botti e baule negli angoli
      L.sopra += spr('botti', c0 + 1.1, r1 - 1.1, 1.9, r.range(0, 360));
      segna(c0 + 2.6, r1 - 1, 'Botti', 'Mezza copertura; una botte rotta allaga il pavimento (terreno difficile).');
      L.sopra += spr('baule', c0 + 0.8, r0 + 0.8, 1, 0);
      // Cucina: scale, scaffale, forno, tavolo da lavoro e sacchi
      L.sopra += spr('scale', c1 - 1.3, r0 + 1.3, 2.4, 0);
      segna(c1 - 2.8, r0 + 1, 'Scale', 'Portano alle camere al piano di sopra.');
      L.sopra += spr('scaffale', cx + (c1 - cx - 2.4) / 2 + 0.2, r0 + 0.45, Math.min(2.4, c1 - cx - 2.8), 0);
      const fW = Math.round((r0 + r1) / 2) + 1;
      L.sopra += spr('forno', c1 - 0.9, fW, 1.8, 90);
      L.sopra += spr('tavolo-lungo', cx + (c1 - cx) / 2 - 0.4, r1 - 1.8, 2.4, 90);
      L.sopra += spr('sacchi', cx + 0.8, r1 - 0.8, 1, r.range(0, 360)) + spr('barile', cx + 0.8, r1 - 1.9, 0.8, 0);
      segna(cx + (c1 - cx) / 2 - 0.4, r1 - 3.1, 'Cucina', 'Forno acceso, coltelli e pentole a portata di mano; i sacchi danno mezza copertura.');
    }

    /* ── Vegetazione fitta: altri alberi lungo i bordi, lontano da acqua, strade e oggetti ── */
    const inAcqua = (u, w, rr = 0) => zone.acqua.some((f) => f(u, w) || (rr && (f(u + rr, w) || f(u - rr, w) || f(u, w + rr) || f(u, w - rr))));
    const inStrada = (u, w) => zone.strada.some((f) => f(u, w));
    if (!chiuso && VEG > 1 && !['mercato', 'porto', 'cimitero'].includes(scelta)) bosco((u, w) => (u < 3 || w < 3 || u > cols - 3 || w > rows - 3) && !inAcqua(u, w, 1.2) && !inStrada(u, w), 0.5, bioma === 'neve' ? 0.8 : 0.45);

    /* ── Oggetti aggiunti a mano (menu "Aggiungi"): mai in acqua, in strada o fuori dalle stanze ── */
    const ambiente = scelta === 'caverna' ? 'grotta' : chiuso ? 'chiuso' : 'aperto';
    const dentroOk = (u, w, rr) => {
      if (celleOk) return [[0, 0], [rr, 0], [-rr, 0], [0, rr], [0, -rr]].every(([a, b]) => celleOk(u + a, w + b));
      if (interno) return interno(u, w, rr);
      return u > rr + 0.4 && w > rr + 0.4 && u < cols - rr - 0.4 && w < rows - rr - 0.4;
    };
    const posOk = (u, w, rr, suStrada, oltreMobili) => libero(u, w, rr, oltreMobili) && dentroOk(u, w, rr) && !inAcqua(u, w, rr) && (suStrada || !inStrada(u, w));
    // Ogni oggetto ha il suo caso (spostarne uno non rimescola gli altri) e puo' avere un posto scelto dal DM
    let re = r, fisso = null, rotFissa = null, primo = null, rotUsata = null;
    const prendi = (p, rr) => { if (p && !primo) primo = [p[0], p[1], rr]; return p; };
    const trova = (rr, extra = () => true, tent = 260) => {
      // Posto scelto dal DM: si rispetta; se cade in acqua o dentro un muro, si va al punto buono piu' vicino
      if (fisso) {
        const [u0, w0] = fisso; fisso = null;
        const buono = (u, w) => u >= 0.3 && w >= 0.3 && u <= cols - 0.3 && w <= rows - 0.3 && !inAcqua(u, w) && (celleOk || interno ? dentroOk(u, w, 0.3) : true);
        for (let d = 0; d <= 5; d += 0.5) for (let k = 0, n = d ? Math.ceil(d * 8) : 1; k < n; k++) {
          const u = u0 + Math.cos(k / n * Math.PI * 2) * d, w = w0 + Math.sin(k / n * Math.PI * 2) * d;
          if (buono(u, w)) { sgombra(u, w, rr); return prendi([u, w], rr); }
        }
      }
      for (let i = 0; i < tent; i++) { const u = re.range(1, cols - 1), w = re.range(1, rows - 1); if (posOk(u, w, rr) && extra(u, w)) return prendi([u, w], rr); }
      // Nessuno spazio libero: alberi e cespugli lasciano il posto all'oggetto scelto; se non basta,
      // l'oggetto puo' toccare gli altri oggetti della scena e infine stare sulla strada (mai in acqua o fuori dalle stanze)
      const lasco = [(u, w) => posOk(u, w, rr, false, true), (u, w) => dentroOk(u, w, rr) && !inAcqua(u, w, rr) && !inStrada(u, w), (u, w) => dentroOk(u, w, rr) && !inAcqua(u, w, rr), (u, w) => dentroOk(u, w, rr * 0.5) && !inAcqua(u, w, rr * 0.5)];
      for (const ok of lasco) for (let i = 0; i < tent; i++) { const u = re.range(1, cols - 1), w = re.range(1, rows - 1); if (ok(u, w) && extra(u, w)) { sgombra(u, w, rr); return prendi([u, w], rr); } }
      return null;
    };
    const posa = (strato, nomeS, u, w, lato, rot, rr) => { L[strato] += spr(nomeS, u, w, lato, rot); occupa(u, w, rr); };
    // Un carro sta sulla strada, girato come la strada; se non ci sono strade, in uno spiazzo
    const suStrada = (rr) => {
      for (const l of re.shuffle(strade.slice())) for (let t = 0; t < 40; t++) {
        const i = re.int(2, l.length - 3), [u, w] = l[i], [u2, w2] = l[i + 1];
        if (u < 2 || w < 2 || u > cols - 2 || w > rows - 2 || !posOk(u, w, rr, true)) continue;
        return prendi([u, w, Math.atan2(w2 - w, u2 - u) * 180 / Math.PI], rr);
      }
      return null;
    };
    const ELEMENTI = {
      carro: { dove: ['aperto'], f: () => { const p = (!fisso && suStrada(1.5)) || (() => { const q = trova(1.6); return q && [q[0], q[1], re.pick([0, 90])]; })(); if (!p) return; rotUsata = rotFissa != null ? rotFissa : p[2] + (re.chance(0.5) ? 0 : 180); posa('sopra', re.pick(['carro', 'carro', 'carro-fieno']), p[0], p[1], 3, rotUsata, 1.5); segna(p[0], p[1] - 1.6, 'Carro', 'Tre quarti di copertura dietro le ruote; i cavalli si spaventano facilmente.'); } },
      carrozza: { dove: ['aperto'], f: () => { const coi = re.chance(0.65), lato = coi ? 5.2 : 3.2, rr = coi ? 2.2 : 1.6; const p = (!fisso && suStrada(rr)) || (() => { const q = trova(rr); return q && [q[0], q[1], re.pick([0, 90])]; })(); if (!p) return; rotUsata = rotFissa != null ? rotFissa : p[2] + (re.chance(0.5) ? 0 : 180); posa('sopra', coi ? 'carrozza-cavalli' : 'carrozza', p[0], p[1], lato, rotUsata, rr); segna(p[0], p[1] - rr - 0.2, 'Carrozza', 'Dentro, copertura totale; dietro le ruote, tre quarti. Un nobile in viaggio, o qualcuno che finge di esserlo.'); } },
      rovesciato: { dove: ['aperto'], f: () => { const p = trova(1.6, (u, w) => !strade.length || strade.some((l) => _distSpezzata([u, w], l) < 4)); if (!p) return; posa('sopra', 'carro-rovesciato', p[0], p[1], 3.2, re.range(0, 360), 1.6); posa('sopra', 'ruota', p[0] + 1.6, p[1] + 1, 0.95, re.range(0, 360), 0.4); segna(p[0], p[1] - 1.6, 'Carro rovesciato', 'Tre quarti di copertura. Le casse sparse sono terreno difficile.'); } },
      tenda: { dove: ['aperto'], f: () => { const p = trova(1.3); if (!p) return; posa('sopra', 'tenda', p[0], p[1], 2.4, re.range(0, 360), 1.3); segna(p[0], p[1] - 1.6, 'Tenda', 'Mezza copertura; chi dorme dentro è sorpreso facilmente.'); } },
      fuoco: { dove: ['aperto', 'grotta', 'chiuso'], f: () => { const p = trova(1); if (!p) return; if (ambiente === 'chiuso') { posa('sopra', 'braciere', p[0], p[1], 0.9, 0, 0.6); luce(p[0], p[1], 3); segna(p[0] + 1, p[1], 'Braciere', 'Luce fioca fino a 6 m. Rovesciato, incendia ciò che ha intorno.'); return; } posa('sopra', 'fuoco-campo', p[0], p[1], 1.3, re.range(0, 360), 0.9); luce(p[0], p[1], 4.5, '#ffb347', 0.5); segna(p[0] + 1.2, p[1] - 0.9, 'Fuoco', 'Luce fioca fino a 6 m. Chi ci finisce dentro prende danni da fuoco.'); } },
      massi: { dove: ['aperto', 'grotta'], f: () => { let primo = null; for (let i = 0; i < 3; i++) { const p = trova(0.9, primo ? (u, w) => Math.hypot(u - primo[0], w - primo[1]) < 4 : undefined); if (!p) continue; posa('sopra', re.pick(MASSI), p[0], p[1], re.range(1.4, 1.9), re.range(0, 360), 0.9); primo = primo || p; } if (primo) segna(primo[0], primo[1] - 1.2, 'Massi', 'Mezza copertura.'); } },
      tronco: { dove: ['aperto'], f: () => { const p = trova(1.8); if (!p) return; posa('sopra', 'tronco-caduto', p[0], p[1], 4.6, re.range(0, 360), 1.8); segna(p[0], p[1] - 1.3, 'Albero caduto', 'Mezza copertura; scavalcarlo costa movimento extra.'); } },
      rovi: { dove: ['aperto'], f: () => { const p = trova(1.5); if (!p) return; posa('sopra', 'rovi-1', p[0] - 0.5, p[1], 2, re.range(0, 360), 1.4); L.sopra += spr('rovi-2', p[0] + 0.7, p[1] + 0.3, 1.8, re.range(0, 360)); segna(p[0], p[1] - 1.5, 'Rovi', 'Terreno difficile; chi ci finisce dentro resta impigliato.'); } },
      stagno: { dove: ['aperto'], f: () => { const p = trova(1.6); if (!p) return; posa('sotto', 'stagno', p[0], p[1], 3, re.range(0, 360), 1.6); zona('acqua', (u, w) => Math.hypot(u - p[0], w - p[1]) < 1.4); segna(p[0] + 1.8, p[1], 'Stagno', 'Acqua alla vita: terreno difficile.'); } },
      pozzo: { dove: ['aperto'], f: () => { const p = trova(1.1); if (!p) return; posa('sopra', 'pozzo', p[0], p[1], 1.7, 0, 1.1); segna(p[0] + 1.3, p[1], 'Pozzo', 'Profondo 10 metri; la corda regge una persona.'); } },
      lapidi: { dove: ['aperto'], f: () => { const p = trova(2.4); if (!p) return; const rot = re.range(-20, 20); occupa(p[0], p[1], 2.4); for (let i = 0; i < 5; i++) { const u = p[0] + (i % 3 - 1) * 1.5 + re.range(-0.2, 0.2), w = p[1] + (i < 3 ? -0.9 : 0.9); L.sopra += spr(re.pick(['lapide-1', 'lapide-2', 'lapide-3', 'croce-celtica']), u, w, 1.1, rot + re.range(-12, 12)); } segna(p[0], p[1] - 2, 'Tombe', 'Mezza copertura. La terra è smossa davanti a una di esse.'); } },
      statua: { dove: ['aperto', 'grotta', 'chiuso'], f: () => { const p = trova(0.9); if (!p) return; posa('sopra', re.pick(['statua-angelo', 'statua-cavaliere']), p[0], p[1], 1.6, re.range(0, 360), 0.9); segna(p[0] + 1.2, p[1], 'Statua', 'Tre quarti di copertura dietro il basamento.'); } },
      rovine: { dove: ['aperto', 'grotta', 'chiuso'], f: () => { if (scelta === 'locanda') return; const p = trova(2.2); if (!p) return; occupa(p[0], p[1], 2.2); const a = re.range(0, 360); L.sopra += spr('muretto-rotto', p[0], p[1] - 1, 3, a) + spr('colonna-crollata', p[0] + 0.8, p[1] + 0.9, 2.6, a + re.range(40, 100)) + spr('macerie', p[0] - 1.2, p[1] + 0.8, 1.2, re.range(0, 360)); segna(p[0], p[1] - 2, 'Rovine', 'Muro crollato e colonne: mezza copertura, le macerie sono terreno difficile.'); } },
      casse: { dove: ['aperto', 'grotta', 'chiuso'], f: () => { const p = trova(1.1); if (!p) return; occupa(p[0], p[1], 1.1); for (let i = 0; i < 4; i++) { const a = re.range(0, Math.PI * 2), d = re.range(0, 0.9); L.sopra += spr(re.pick(['cassa', 'barile', 'sacchi', 'cassa', 'botti']), p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d, re.range(0.75, 1), re.range(0, 360)); } segna(p[0], p[1] - 1.3, 'Casse e barili', 'Mezza copertura. Una cassa rotta sparge la merce: terreno difficile.'); } },
      tesoro: { dove: ['aperto', 'grotta', 'chiuso'], f: () => { const p = trova(0.9); if (!p) return; posa('sopra', 'tesoro', p[0], p[1], 1.3, 0, 0.9); L.sopra += spr('forziere', p[0] + 0.9, p[1] + 0.5, 0.95, re.range(-20, 20)); luce(p[0], p[1], 1.8, '#ffd86b', 0.35); segna(p[0], p[1] - 1.2, 'Tesoro', 'Monete e un forziere chiuso (Scassinare CD 15). Forse è una trappola.'); } },
      ossa: { dove: ['aperto', 'grotta', 'chiuso'], f: () => { const p = trova(1); if (!p) return; occupa(p[0], p[1], 1); L.sotto += spr('scheletro', p[0], p[1], 1.4, re.range(0, 360)) + spr('ossa', p[0] + 1, p[1] + 0.6, 1.1, re.range(0, 360)); segna(p[0], p[1] - 1.2, 'Ossa', 'Qualcuno non ce l\'ha fatta. Ha ancora la borsa.'); } },
      gabbia: { dove: ['aperto', 'grotta', 'chiuso'], f: () => { const p = trova(0.9); if (!p) return; posa('sopra', 'gabbia', p[0], p[1], 1.5, re.pick([0, 90]), 0.9); segna(p[0], p[1] - 1.2, 'Gabbia', 'Dentro c\'è un prigioniero. Il lucchetto si scassina (CD 15).'); } },
      altare: { dove: ['aperto', 'grotta', 'chiuso'], f: () => { if (scelta === 'locanda') return; const p = trova(1.2); if (!p) return; posa('sopra', 'altare', p[0], p[1], 1.9, re.pick([0, 90, 180, 270]), 1.2); luce(p[0], p[1], 2.4, '#a8e6ff', 0.35); segna(p[0], p[1] - 1.5, 'Altare', 'Un sigillo inciso: chi lo tocca sente una voce.'); } },
    };
    const aggiunti = [], nonMessi = [], primoAgg = nSpr;
    (Array.isArray(o.elementi) ? o.elementi : []).forEach((k) => {
      const e = ELEMENTI[k];
      if (!e || !e.dove.includes(ambiente)) return;
      const fp = o.pos && o.pos[k], ok = Array.isArray(fp) && fp.length >= 2 && Number.isFinite(fp[0]) && Number.isFinite(fp[1]);
      re = M.rng('battaglia:' + o.seme + ':' + k);
      fisso = ok ? [Math.max(0.5, Math.min(cols - 0.5, fp[0])), Math.max(0.5, Math.min(rows - 0.5, fp[1]))] : null;
      const giro = ok && Number.isFinite(fp[2]) ? fp[2] : 0;
      rotFissa = ok && Number.isFinite(fp[3]) ? fp[3] : null;
      primo = null; rotUsata = null;
      const da = nSpr, lSotto = L.sotto.length, lSopra = L.sopra.length;
      e.f();
      if (primo && giro) {
        const g = (t) => `<g transform="rotate(${n1(giro)} ${n1(X(primo[0]))} ${n1(Y(primo[1]))})">${t}</g>`;
        L.sotto = L.sotto.slice(0, lSotto) + g(L.sotto.slice(lSotto)); L.sopra = L.sopra.slice(0, lSopra) + g(L.sopra.slice(lSopra));
      }
      const disegno = sprInfo.filter((q) => q.id >= da).map((q) => q.use).join('');
      if (primo) aggiunti.push({ k, u: primo[0], w: primo[1], rr: primo[2], rot: rotUsata, giro, disegno });
      else if (!(scelta === 'locanda' && ['rovine', 'altare'].includes(k))) nonMessi.push(k);
    });

    /* ── Copie fatte dal DM con "Duplica": stesso disegno, posto e rotazione propri ── */
    const copie = [];
    (Array.isArray(o.copie) ? o.copie : []).forEach((cp, i) => {
      let dis = '', cx = 0, cy = 0, rag = 0;
      if (typeof cp.f === 'string') {
        const a = aggiunti.find((x) => x.k === cp.f);
        if (!a) return;
        cx = X(a.u); cy = Y(a.w); rag = a.rr * S;
        dis = a.giro ? `<g transform="rotate(${n1(a.giro)} ${n1(cx)} ${n1(cy)})">${a.disegno}</g>` : a.disegno;
      } else if (Array.isArray(cp.f)) {
        const mm = cp.f.map((id) => sprInfo.find((q) => q.id === id)).filter(Boolean);
        if (!mm.length) return;
        cx = X(mm[0].u); cy = Y(mm[0].w);
        rag = Math.max(...mm.map((q) => Math.hypot(X(q.u) - cx, Y(q.w) - cy) + q.r * S));
        dis = mm.map((q) => q.use).join('');
      } else return;
      const nx = X(cp.u), ny = Y(cp.w);
      const g = `<g transform="translate(${n1(nx - cx)} ${n1(ny - cy)}) rotate(${n1(cp.g || 0)} ${n1(cx)} ${n1(cy)})">${dis}</g>`;
      L.sopra += g;
      copie.push({ i, x: nx, y: ny, r: rag, disegno: g });
    });

    /* ── Griglia di combattimento ── */
    let griglia = '';
    if (o.griglia !== false) {
      let d = '';
      for (let u = 0; u <= cols; u++) d += `M${X(u)} ${oy}V${oy + rows * S}`;
      for (let w = 0; w <= rows; w++) d += `M${ox} ${Y(w)}H${ox + cols * S}`;
      const sp = Math.max(1.4, S / 34); // linee un po' piu' spesse sui fogli grandi, cosi' si vedono anche stampate
      griglia = `<path d="${d}" fill="none" stroke="#000" stroke-width="${n1(sp)}" opacity="0.34"/><path d="${d}" fill="none" stroke="#fff" stroke-width="${n1(sp * 0.42)}" opacity="0.18"/>`;
    }
    const buio = notte ? `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="#0b1a2a" opacity="0.5"/>` : '';

    /* ── Gli oggetti della scena spostati dal DM si portano dietro il loro numero ── */
    const tolti = new Set(mobili.filter((q) => q.via).map((q) => q.id));
    const scena0 = sprInfo.filter((q) => q.id < primoAgg && !tolti.has(q.id) && !q.tolto);
    if (o.togli && o.togli.length) {
      const via = new Set();
      sprInfo.filter((q) => q.tolto && q.id < primoAgg && !q.albero).forEach((q) => {
        let best = -1, bd = q.r + 1.2;
        punti.forEach((pt, i) => { const dd = Math.hypot(pt.u - q.u, pt.w - q.w); if (dd < bd && !via.has(i)) { bd = dd; best = i; } });
        if (best >= 0) via.add(best);
      });
      for (let i = punti.length - 1; i >= 0; i--) if (via.has(i)) punti.splice(i, 1);
    }
    if (o.sposta) {
      const presi = new Set();
      Object.entries(o.sposta).forEach(([id, d]) => {
        const q = scena0.find((x) => x.id === +id);
        if (!q || (!d[0] && !d[1])) return;
        const u0 = q.u - (d[0] || 0), w0 = q.w - (d[1] || 0);
        let best = -1, bd = q.r + 1.2;
        punti.forEach((pt, i) => { const dd = Math.hypot(pt.u - u0, pt.w - w0); if (dd < bd && !presi.has(i)) { bd = dd; best = i; } });
        if (best >= 0) { presi.add(best); punti[best].u += d[0] || 0; punti[best].w += d[1] || 0; }
      });
    }

    /* ── Numeri e legenda ── */
    const voci = [], pin = [], messi = [];
    let testi = '';
    const pal = { ...carta, numeroFondo: t.numero, numeroTesto: notte ? '#0e1d26' : '#ffffff' };
    punti.forEach((p, i) => {
      let u = Math.max(0.5, Math.min(cols - 0.5, p.u)), w = Math.max(0.5, Math.min(rows - 0.5, p.w));
      for (let k = 0; k < 6 && messi.some(([a, b]) => Math.hypot(a - u, b - w) < 1.1); k++) { w = Math.max(0.5, Math.min(rows - 0.5, w + (w < rows - 1.5 ? 1 : -1))); u = Math.max(0.5, Math.min(cols - 0.5, u + (k % 2 ? 0.6 : -0.6))); }
      messi.push([u, w]);
      testi += M.numeroTondo(X(u), Y(w), i + 1, pal, Math.max(11, S * 0.36));
      voci.push({ n: i + 1, titolo: p.titolo, testo: p.testo });
      pin.push({ x: X(u), y: Y(w) - 14, label: (i + 1) + '. ' + p.titolo, note: p.testo, sottotipo: 'nota' });
    });

    // Le immagini usate, una volta sola, centrate sull'origine
    const immagini = [...usate].map((n) => { const im = _img[n]; return `<image id="bm-${n}" href="${im.url}" x="${-im.w / 2}" y="${-im.h / 2}" width="${im.w}" height="${im.h}"/>`; }).join('');
    const clip = `<clipPath id="carto-bm"><rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}"/></clipPath>`;
    let svg = M.apri(W, H, carta, o.seme) + `<defs>${immagini}${L.defs}${clip}</defs>`;
    if (!foglio) svg += `<rect x="${ox - 6}" y="${oy - 6}" width="${cols * S + 12}" height="${rows * S + 12}" rx="6" fill="#000" opacity="0.25" filter="url(#carto-b4)"/>`;
    const conMobili = (t) => t.replace(/\u0001(\d+)\u0001/g, (x, i) => mobili[i].via ? '' : mobili[i].svg);
    svg += `<g clip-path="url(#carto-bm)">${L.terra}${conMobili(L.sotto)}${conMobili(L.sopra)}${conMobili(L.alto)}${buio}${notte ? L.luci : ""}${griglia}</g>`;
    if (!foglio) svg += `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="none" stroke="${ink}" stroke-width="2.4"/>`;
    // Sul foglio intero i numeri ci sono se c'e' la legenda (che si stampa a parte, per il master)
    if (o.nomi !== false && (!foglio || o.legenda !== false)) svg += testi;
    if (conLegenda) svg += M.legenda(W - 372, 36, 340, H - 72, 'Cosa c\'è', voci, pal);
    const areaTit = conLegenda ? W - 380 : W;
    if (!foglio && o.titolo !== false) svg += M.etichetta(areaTit / 2, 74, nome, carta, { size: 44, font: M.FONT_APP_TITOLI, peso: 400, colore: t.ink, alone: t.sfondo, aloneW: 6 });
    if (!foglio) svg += M.scala(ox, H - 40, S * 2, { valore: 3, nome: 'metri' }, 2, { ...carta, carta: t.pavimento });
    svg += M.chiudi(W, H, foglio ? { ...carta, senzaCornice: true } : carta); // sul foglio intero niente cornice: la mappa arriva al bordo

    // Dati per tavolo virtuale e stampa in scala: tutti i quadretti sono calpestabili
    const celle = [];
    for (let w = 0; w < rows; w++) for (let u = 0; u < cols; u++) if (!celleOk || celleOk(u + 0.5, w + 0.5)) celle.push([u, w]);
    const vtt = { S, ang: 0, ox, oy, minX: 0, minY: 0, maxX: cols, maxY: rows, muri, porte, celle };
    // Oggetti aggiunti, in pixel della mappa: l'anteprima li rende trascinabili
    const spostabili = aggiunti.map((x) => ({ ...x, x: X(x.u), y: Y(x.w), r: x.rr * S }));
    const oggetti = scena0.map((q) => ({ id: q.id, x: X(q.u), y: Y(q.w), r: q.r * S, albero: q.albero, disegno: q.use }));
    return { nome, pin, W, H, larghezzaKm: W / S * 1.5 / 1000, svg, vtt, foglio, aggiunti: spostabili, oggetti, copie, nonMessi, quadretto: S, legenda: foglio && o.legenda !== false ? voci : null }; // un quadretto = 1,5 metri
  };

  const immagine = (nome) => _img[nome] ? { url: _img[nome].url, w: _img[nome].w, h: _img[nome].h } : null;
  return { battaglia, carica, pronta, immagine };
})();

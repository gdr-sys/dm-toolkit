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
    'tronco-caduto'];

  /* ── Immagini: si leggono una volta come data URL, cosi' finiscono dentro l'SVG ── */
  const _img = {};
  let _carico = null;
  const _leggi = (nome) => fetch('assets/battlemap/' + nome + '.webp')
    .then((r) => { if (!r.ok) throw new Error(nome); return r.blob(); })
    .then((b) => new Promise((ok, no) => { const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = no; f.readAsDataURL(b); }))
    .then((url) => new Promise((ok, no) => { const i = new Image(); i.onload = () => { _img[nome] = { url, w: i.naturalWidth, h: i.naturalHeight }; ok(); }; i.onerror = no; i.src = url; }));
  const carica = () => {
    if (!_carico) _carico = Promise.all(NOMI.map(_leggi)).catch((e) => { _carico = null; throw e; });
    return _carico;
  };
  const pronta = () => NOMI.every((n) => _img[n]);

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
    const scena = EXTRA[o.scena] && o.scena.includes('_') ? o.scena : String(o.scena).endsWith('_base') ? scelta : r.pick(impianti); // un impianto preciso si puo' chiedere per nome
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
    // Un oggetto: centro in quadretti, lato lungo in quadretti, rotazione in gradi
    const spr = (nome, u, w, lato, rot = 0) => {
      const im = _img[nome]; usate.add(nome);
      const k = (lato * S) / Math.max(im.w, im.h);
      return `<use href="#bm-${nome}" transform="translate(${n1(X(u))} ${n1(Y(w))}) rotate(${n1(rot)}) scale(${(Math.round(k * 10000) / 10000)})"/>`;
    };
    // Piastrella di terreno: un'immagine ogni "lato" quadretti
    const fatti = new Set();
    const pattern = (nome, lato, ruota = 0) => { if (fatti.has(nome)) return ''; fatti.add(nome); usate.add(nome); return `<pattern id="bm-p-${nome}" patternUnits="userSpaceOnUse" x="${ox}" y="${oy}"${ruota ? ` patternTransform="rotate(${ruota} ${ox} ${oy})"` : ''} width="${n1(lato * S)}" height="${n1(lato * S)}"><use href="#bm-${nome}" transform="translate(${n1(lato * S / 2)} ${n1(lato * S / 2)}) scale(${(Math.round(lato * S / _img[nome].w * 10000) / 10000)})"/></pattern>`; };
    const punti = [];
    const segna = (u, w, titolo, testo) => punti.push({ u, w, titolo, testo });
    const occupati = []; // [u, w, raggio]
    const libero = (u, w, rr) => occupati.every(([a, b, q]) => Math.hypot(a - u, b - w) > rr + q);
    const occupa = (u, w, rr) => occupati.push([u, w, rr]);
    const muri = [], porte = [];
    const L = { defs: '', terra: '', sotto: '', sopra: '', alto: '', luci: '' };
    let nome;
    const c = (nomi) => r.pick(nomi.filter((n) => _img[n]));
    const QUERCE = ['quercia-1', 'quercia-2', 'quercia-3'], PINI = ['pino-1', 'pino-2', 'pino-3'], CESPUGLI = ['cespuglio-1', 'cespuglio-2', 'cespuglio-3'];
    const MASSI = ['masso-1', 'masso-2', 'masso-3'], SASSI = ['sasso-1', 'sasso-2', 'sasso-3'];
    // Macchia irregolare (stagno, radura, chiazza) come percorso in pixel
    const macchia = (cu, cw, ru, rw, irr = 0.25) => {
      const q = [], n = 28, ph = r.range(0, 9);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 + (rn(Math.cos(a) * 1.3 + ph, Math.sin(a) * 1.3 + ph) - 0.5) * irr * 2; q.push([X(cu + Math.cos(a) * ru * k), Y(cw + Math.sin(a) * rw * k)]); }
      return M.via(M.morbida(q, 2, true));
    };
    // Bosco: alberi ovunque "ok(u, w)" lo permette, piu' o meno fitti
    const bosco = (ok, fitto = 1, pini = 0.45) => {
      const lista = [];
      for (let tent = 0; tent < cols * rows * 1.3 * fitto; tent++) {
        const u = r.range(-0.6, cols + 0.6), w = r.range(-0.6, rows + 0.6), lato = r.range(2.1, 3);
        if (!ok(u, w) || !libero(u, w, lato * 0.42)) continue;
        lista.push([u, w, lato]); occupa(u, w, lato * 0.42);
      }
      lista.sort((a, b) => a[1] - b[1]).forEach(([u, w, lato]) => { L.alto += spr(c(r.chance(pini) ? PINI : QUERCE), u, w, lato, r.range(0, 360)); });
      return lista;
    };
    // Oggetti sparsi a terra (cespugli, sassi, ceppi...)
    const sparsi = (quanti, ok, nomi, min, max) => {
      for (let i = 0, messi = 0; i < quanti * 8 && messi < quanti; i++) {
        const u = r.range(0.5, cols - 0.5), w = r.range(0.5, rows - 0.5), lato = r.range(min, max);
        if (!ok(u, w) || !libero(u, w, lato * 0.45)) continue;
        L.sotto += spr(c(nomi), u, w, lato, r.range(0, 360)); occupa(u, w, lato * 0.45); messi++;
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
    const kit = () => ({ o, r, rn, M, n1, cols, rows, S, X, Y, P, linea, notte, L, muri, porte, spr, pattern, segna, libero, occupa, occupati, macchia, bosco, sparsi, tutto, luce, maschera, riempi, c, QUERCE, PINI, CESPUGLI, MASSI, SASSI, attraversa: (vert, amp, seme) => _attraversa(r, rn, cols, rows, vert, amp, seme), dist: _distSpezzata, vicino: _vicino, pianta, murature, img: _img });
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
      L.terra += `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="url(#bm-p-terreno-terra)" mask="url(#bm-m-strada)"/>`;

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
      for (let tent = 0; tent < cols * rows * 1.2; tent++) {
        const u = r.range(-0.5, cols + 0.5), w = r.range(-0.5, rows + 0.5), d = dS(u, w);
        if (d < 2.6) continue;
        const lato = r.range(2.2, 3);
        if (!libero(u, w, lato * 0.42) || (d < 4.2 && r.chance(0.6))) continue;
        alberi.push([u, w, lato]); occupa(u, w, lato * 0.42);
      }
      alberi.sort((a, b) => a[1] - b[1]).forEach(([u, w, lato]) => { L.alto += spr(r.chance(0.55) ? r.pick(['quercia-1', 'quercia-2', 'quercia-3']) : r.pick(['pino-1', 'pino-2', 'pino-3']), u, w, lato, r.range(0, 360)); });
      if (r.chance(0.5)) { const a = alberi.find(([u, w]) => u > 2 && w > 2 && u < cols - 2 && w < rows - 2); if (a) L.alto += spr('albero-morto', a[0] + 3, a[1], 2.2, r.range(0, 360)); }
      const vicino = alberi.filter(([u, w]) => u > 2 && u < cols - 2 && w > 2 && w < rows - 2).sort((a, b) => dS(a[0], a[1]) - dS(b[0], b[1]))[0];
      if (vicino) segna(vicino[0], vicino[1], 'Alberi', 'Tre quarti di copertura dietro il tronco; ci si può arrampicare.');
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
      L.terra += `<g mask="url(#bm-m-strada)"><rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="url(#bm-p-terreno-terra)"/></g>`;
      // Il ponte, di legno o di pietra
      const iF = _vicino(fiume, wP, 1), cU = fiume[iF][0];
      const pietra = r.chance(0.45);
      L.sopra += spr(pietra ? 'ponte-pietra' : 'ponte-legno', cU, wP, larg + 2.6, 0);
      occupa(cU, wP, 3.4);
      segna(cU, wP - 1.9, 'Ponte', pietra ? 'I parapetti di pietra danno tre quarti di copertura.' : 'Il parapetto dà mezza copertura; si passa in due affiancati.');
      // Il guado, piu' a valle o a monte
      const wG = wP > rows / 2 ? Math.max(2.2, wP - 5) : Math.min(rows - 2.2, wP + 5);
      const gU = fiume[_vicino(fiume, wG, 1)][0];
      for (let k = -larg / 2 + 0.6; k <= larg / 2 - 0.5; k += 0.85) L.sopra += spr(r.pick(['sasso-1', 'sasso-2', 'sasso-3']), gU + k, wG + r.range(-0.18, 0.18), r.range(0.7, 0.85), r.range(0, 360));
      segna(gU - larg / 2 - 0.4, wG, 'Guado', 'Acqua bassa: terreno difficile. I sassi reggono una persona alla volta.');
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
      for (let tent = 0; tent < cols * rows * 0.9; tent++) {
        const u = r.range(-0.5, cols + 0.5), w = r.range(-0.5, rows + 0.5), lato = r.range(2.2, 2.9);
        if (dF(u, w) < larg / 2 + 1.4 || Math.abs(w - wP) < 2.4 || !libero(u, w, lato * 0.42) || r.chance(0.4)) continue;
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
    svg += `<g clip-path="url(#carto-bm)">${L.terra}${L.sotto}${L.sopra}${L.alto}${buio}${notte ? L.luci : ""}${griglia}</g>`;
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
    return { nome, pin, W, H, larghezzaKm: W / S * 1.5 / 1000, svg, vtt, foglio, legenda: foglio && o.legenda !== false ? voci : null }; // un quadretto = 1,5 metri
  };

  return { battaglia, carica, pronta };
})();

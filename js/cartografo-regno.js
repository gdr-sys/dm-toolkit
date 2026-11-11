/* ============================================================
   CARTOGRAFO-REGNO.JS — Generatore di regni, stile carta nautica
   illustrata: mare con alone lungo le coste e linee di rotta,
   montagne incise col tratteggio, foreste come masse con il bordo
   alberato, paludi, steppe, fiumi sinuosi, insediamenti disegnati
   e nomi che seguono la forma di catene e boschi.
   ============================================================ */

const CartoRegno = (() => {
  const M = CartoMotore;
  const n1 = M.n1;

  const TONI = {
    colori: {
      colore: true, carta: "#efe5cc", mare: "#9fc0ca", terra: "#ece0bc", terra2: "#e0d0a8", ink: "#33261a", chioma: "#c3d09a", chiomaPino: "#a9bc8a", monte: "#ebe1cb", muro: "#f3ebd4", tetto: "#a8382a",
      oro: "#e3c26a", testo: "#33261a", testoAlone: "#f3ead3", margine: "#e9dfc4", peso: 400,
      boschi: "#8faa6c", boschiLatif: "#a9bc75", rilievo: "#b59c78", steppa: "#e2c784", palude: "#93a67c",
      font: "'IM Fell English', Georgia, serif", fontCurvo: "'IM Fell English SC', Georgia, serif",
    },
    atlante: {
      carta: "#efe5cc", mare: "#ddd0ad", terra: "#f6efdb", terra2: "#e4d6b5", ink: "#33261a", chioma: "#f3ebd4", monte: "#f3ebd4", muro: "#f3ebd4", tetto: "#a8382a",
      oro: "#e3c26a", testo: "#33261a", testoAlone: "#f3ead3", margine: "#e9dfc4", peso: 400,
      font: "'IM Fell English', Georgia, serif", fontCurvo: "'IM Fell English SC', Georgia, serif",
    },
    notte: {
      carta: "#0b1820", mare: "#0b1820", terra: "#13303b", terraAlta: "#1d4150", terra2: "#1d4150", ink: "#0b1820", gesso: "#e8e1cf", gessoTenue: "#b9b4a6", batimetria: "#78afc4", fiume: "#7ebad8",
      bosco: "#7eb696", ambra: "#e9b84f", muro: "#c9c3b2", tetto: "#e9b84f", oro: "#e9b84f", testo: "#e8e1cf", testoAlone: "#0d1d26", mareTesto: "#8cbacc", margine: "#0b1820", peso: 600,
      font: "'Cormorant SC', Georgia, serif", fontCurvo: "'Cormorant SC', Georgia, serif",
    },
  };

  const _coda = () => {
    const h = [];
    return {
      get size() { return h.length; },
      push(v, c) { h.push([c, v]); let i = h.length - 1; while (i > 0) { const q = (i - 1) >> 1; if (h[q][0] <= h[i][0]) break; [h[q], h[i]] = [h[i], h[q]]; i = q; } },
      pop() {
        const top = h[0], ult = h.pop();
        if (h.length) {
          h[0] = ult;
          for (let i = 0; ;) {
            const a = 2 * i + 1, b = a + 1;
            let m = i;
            if (a < h.length && h[a][0] < h[m][0]) m = a;
            if (b < h.length && h[b][0] < h[m][0]) m = b;
            if (m === i) break;
            [h[m], h[i]] = [h[i], h[m]]; i = m;
          }
        }
        return top[1];
      },
    };
  };

  /* ── Glifi ── */
  const rovina = (x, y, s, t) =>
    `<path d="M${n1(x - s)} ${n1(y)}V${n1(y - s * 1.1)}L${n1(x - s * 0.62)} ${n1(y - s * 1.45)}L${n1(x - s * 0.3)} ${n1(y - s * 1.2)}V${n1(y - s * 0.55)}A${n1(s * 0.32)} ${n1(s * 0.32)} 0 0 1 ${n1(x + s * 0.3)} ${n1(y - s * 0.55)}V${n1(y - s * 0.9)}L${n1(x + s * 0.62)} ${n1(y - s * 0.7)}L${n1(x + s)} ${n1(y - s * 0.95)}V${n1(y)}H${n1(x + s * 0.3)}V${n1(y - s * 0.3)}H${n1(x - s * 0.3)}V${n1(y)}Z" fill="${t.muro}" stroke="${t.ink}" stroke-width="1.1" stroke-linejoin="round"/>` +
    `<path d="M${n1(x - s * 1.25)} ${n1(y + 1)}H${n1(x + s * 1.25)}" stroke="${t.ink}" stroke-width="1.3" stroke-linecap="round"/>`;

  const faro = (x, y, s, t) =>
    `<path d="M${n1(x - s * 0.42)} ${n1(y)}L${n1(x - s * 0.26)} ${n1(y - s * 1.55)}H${n1(x + s * 0.26)}L${n1(x + s * 0.42)} ${n1(y)}Z" fill="${t.muro}" stroke="${t.ink}" stroke-width="1"/>` +
    `<path d="M${n1(x - s * 0.34)} ${n1(y - s * 0.55)}H${n1(x + s * 0.34)}M${n1(x - s * 0.3)} ${n1(y - s * 1.05)}H${n1(x + s * 0.3)}" stroke="${t.ink}" stroke-width="1.8"/>` +
    `<rect x="${n1(x - s * 0.3)}" y="${n1(y - s * 1.92)}" width="${n1(s * 0.6)}" height="${n1(s * 0.38)}" fill="${t.oro}" stroke="${t.ink}" stroke-width="0.9"/><path d="M${n1(x - s * 0.36)} ${n1(y - s * 1.92)}L${n1(x)} ${n1(y - s * 2.3)}L${n1(x + s * 0.36)} ${n1(y - s * 1.92)}Z" fill="${t.tetto}" stroke="${t.ink}" stroke-width="0.9"/>`;

  /* ═══════════════ GENERATORE ═══════════════ */
  const regno = (o) => {
    const r = M.rng('regno:' + o.seme), rn = M.rumore(r), rm = M.rumore(r);
    const t = TONI[M.stileDi(o.palette)];
    const W = 1400, H = 1000, G = 6, w = Math.ceil(W / G) + 1, h = Math.ceil(H / G) + 1;
    const forma = o.forma || 'isola', clima = o.clima || 'temperato';
    const nome = o.nome || M.nomeLuogo(r, o.popolo);
    const kmPx = 0.75;

    /* Altitudine */
    const lato = r.range(0, Math.PI * 2);
    const quota = new Float64Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const x = i / w, y = j / h, ax = x * 1.4, n = rn(ax * 3.1 + 11, y * 3.1 + 5, 7);
      const dx = (x - 0.5) * 2, dy = (y - 0.5) * 2, d = Math.hypot(dx, dy);
      let v;
      if (forma === 'isola') v = n - Math.pow(d, 2.4) * 0.66;
      else if (forma === 'arcipelago') v = rn(ax * 5.4 + 3, y * 5.4 + 9, 6) - Math.pow(d, 2.4) * 0.3;
      else if (forma === 'costa') v = n + (dx * Math.cos(lato) + dy * Math.sin(lato)) * 0.32;
      else v = n - Math.pow(Math.max(Math.abs(dx), Math.abs(dy)), 5) * 0.28;
      quota[j * w + i] = v;
    }
    const ordinate = Float64Array.from(quota).sort();
    const liv = ordinate[Math.floor(ordinate.length * (1 - ({ isola: 0.4, arcipelago: 0.28, costa: 0.56, continente: 0.6 }[forma] || 0.4)))];
    const massimo = ordinate[ordinate.length - 1], minimo = ordinate[0];
    const terre = Array.from(ordinate).filter((q) => q >= liv);
    const rango = (q) => { let a = 0, b = terre.length - 1; while (a < b) { const m = (a + b) >> 1; if (terre[m] < q) a = m + 1; else b = m; } return a / terre.length; };
    const uni = new Float64Array(w * h);
    for (let k = 0; k < quota.length; k++) uni[k] = quota[k] >= liv ? rango(quota[k]) * 0.6 + (quota[k] - liv) / (massimo - liv) * 0.4 : (quota[k] - liv) / (liv - minimo);
    const e = (i, j) => uni[j * w + i];
    const eIn = (x, y) => e(Math.max(0, Math.min(w - 1, Math.round(x / G))), Math.max(0, Math.min(h - 1, Math.round(y / G))));
    const costa = M.contorni(w, h, e, 0, G).map((l) => M.morbida(l, 1, true));
    const tracciaTerra = costa.map((l) => M.via(l)).join('');

    /* Acqua che scende al mare */
    const C = 3, cw = Math.floor(w / C), ch = Math.floor(h / C), id = (i, j) => j * cw + i;
    const eg = new Float64Array(cw * ch);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) eg[id(i, j)] = e(i * C, j * C);
    const riempita = new Float64Array(cw * ch).fill(Infinity), valle = new Int32Array(cw * ch).fill(-1), ordine = [];
    const coda = _coda();
    for (let k = 0; k < eg.length; k++) if (eg[k] <= 0) { riempita[k] = eg[k]; coda.push(k, eg[k]); }
    const V8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
    while (coda.size) {
      const k = coda.pop(), i = k % cw, j = (k - i) / cw;
      ordine.push(k);
      for (const [a, b] of V8) {
        const u = i + a, v = j + b;
        if (u < 0 || v < 0 || u >= cw || v >= ch) continue;
        const n = id(u, v);
        if (riempita[n] !== Infinity) continue;
        riempita[n] = Math.max(eg[n], riempita[k] + 0.0006);
        valle[n] = k;
        coda.push(n, riempita[n]);
      }
    }
    const portata = new Float64Array(cw * ch).fill(1);
    for (let q = ordine.length - 1; q >= 0; q--) { const k = ordine[q]; if (valle[k] >= 0) portata[valle[k]] += portata[k]; }
    const piuFiume = new Uint8Array(cw * ch), fiumi = [];
    const xyDi = (k) => { const i = k % cw; return [i * C * G, ((k - i) / cw) * C * G]; };
    for (const s of r.shuffle([...Array(cw * ch).keys()].filter((k) => eg[k] > 0.58 && portata[k] > 6))) {
      if (fiumi.length >= (forma === 'arcipelago' ? 6 : 11)) break;
      const linea = [];
      let k = s;
      while (k >= 0 && eg[k] > 0 && !piuFiume[k]) { linea.push(xyDi(k)); k = valle[k]; }
      if (k >= 0) linea.push(xyDi(k));
      if (linea.length < 9 || fiumi.some((f) => M.dist(f[0], linea[0]) < 90)) continue;
      let q = s;
      while (q >= 0 && eg[q] > 0 && !piuFiume[q]) { piuFiume[q] = 1; q = valle[q]; }
      // Meandri: la linea ondeggia di piu' dove l'acqua scorre in piano
      const fase = r.range(0, 9), ondulata = [];
      for (let i = 0; i < linea.length - 1; i++) {
        const a = linea[i], b = linea[i + 1], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
        for (let u = 0; u < 3; u++) {
          const c = M.lerp(a, b, u / 3), piano = 1 - Math.min(1, Math.max(0, eIn(c[0], c[1])) * 1.3);
          const amp = (i === 0 ? 0 : 1) * (3 + piano * 8) * Math.sin(fase + (i * 3 + u) * 0.95) + (rn(c[0] * 0.02 + 40, c[1] * 0.02) - 0.5) * 10;
          ondulata.push([c[0] - ty / l * amp, c[1] + tx / l * amp]);
        }
      }
      ondulata.push(linea[linea.length - 1]);
      fiumi.push(M.morbida(ondulata, 2));
    }

    /* Ambienti: ogni campo vale piu' di zero dove quell'ambiente esiste */
    const sogliaBosco = clima === 'arido' ? 0.075 : 0;
    const mascheraTerra = (i, j, lo, hi) => Math.min(e(i, j) - lo, hi - e(i, j));
    const fConifera = (i, j) => Math.min(rm(i * G * 0.0043 + 40, j * G * 0.0043 + 60, 4) - (clima === 'freddo' ? 0.55 : 0.615) - sogliaBosco, mascheraTerra(i, j, 0.05, 0.76));
    const fLatifoglia = (i, j) => Math.min(rm(i * G * 0.005 + 140, j * G * 0.005 + 20, 4) - (clima === 'freddo' ? 0.68 : 0.61) - sogliaBosco, mascheraTerra(i, j, 0.05, 0.7), -fConifera(i, j) - 0.01);
    const fSteppa = (i, j) => Math.min(rm(i * G * 0.0032 + 300, j * G * 0.0032 + 90, 3) - (clima === 'arido' ? 0.42 : 0.6), mascheraTerra(i, j, 0.02, 0.74));
    const fPalude = (i, j) => Math.min(rm(i * G * 0.006 + 500, j * G * 0.006 + 200, 3) - 0.59, mascheraTerra(i, j, 0.015, 0.34));
    const anelliDi = (f, giri = 2) => M.contorni(w, h, f, 0, G).filter((l) => l.length > 18).map((l) => M.morbida(l, giri, true));
    const conifere = anelliDi(fConifera), latifoglie = anelliDi(fLatifoglia), steppe = anelliDi(fSteppa), paludi = anelliDi(fPalude);

    const inB = (f, x, y) => f(Math.max(1, Math.min(w - 2, Math.round(x / G))), Math.max(1, Math.min(h - 2, Math.round(y / G))));

    /* Insediamenti */
    const quanti = { pochi: 8, normali: 13, molti: 19 }[o.taglia] || 13;
    // Si misura ogni terra emersa: un insediamento non puo' stare su un isolotto piu' piccolo del suo disegno
    const massaDi = new Int32Array(cw * ch), massaId = new Int32Array(cw * ch);
    let contaMasse = 0;
    for (let k = 0; k < eg.length; k++) {
      if (eg[k] <= 0 || massaDi[k]) continue;
      contaMasse++;
      const pila = [k], celle = [k];
      massaDi[k] = -1;
      while (pila.length) {
        const c = pila.pop(), i = c % cw, j = (c - i) / cw;
        for (const [a, b] of V8) {
          const u = i + a, v = j + b;
          if (u < 0 || v < 0 || u >= cw || v >= ch) continue;
          const n = id(u, v);
          if (eg[n] > 0 && !massaDi[n]) { massaDi[n] = -1; pila.push(n); celle.push(n); }
        }
      }
      celle.forEach((c) => { massaDi[c] = celle.length; massaId[c] = contaMasse; });
    }
    const candidati = [];
    for (let j = 6; j < ch - 4; j++) for (let i = 4; i < cw - 4; i++) {
      const k = id(i, j);
      if (eg[k] <= 0.02 || eg[k] > 0.66 || massaDi[k] < 70) continue;
      let bonus = 0;
      if (piuFiume[k]) bonus += 0.5;
      for (const [a, b] of V8) if (eg[id(i + a * 2, j + b * 2)] <= 0) bonus += 0.08;
      const x = i * C * G, y = j * C * G;
      if (inB(fConifera, x, y) > 0.03 || inB(fLatifoglia, x, y) > 0.03) bonus -= 0.25;
      candidati.push({ x, y, k, punti: bonus + r.f() * 0.5 - eg[k] * 0.45 });
    }
    candidati.sort((a, b) => b.punti - a.punti);
    const citta = [];
    const vietata = (c) => (c.y < 150 && (c.x < 420 || c.x > W - 420)) || (c.y > H - 150 && (c.x < 430 || c.x > W - 430)) || (c.y < 110) || (c.y > H - 90) || c.x < 90 || c.x > W - 100;
    for (const distanza of [170, 125, 90, 70]) {
      for (const c of candidati) {
        if (citta.length >= quanti) break;
        if (!vietata(c) && citta.every((q) => M.dist([q.x, q.y], [c.x, c.y]) > distanza)) citta.push(c);
      }
    }
    const usati = new Set();
    const nomeNuovo = () => { let n = M.nomeLuogo(r, o.popolo); while (usati.has(n)) n = M.nomeLuogo(r, o.popolo); usati.add(n); return n; };
    citta.forEach((c, i) => {
      c.nome = nomeNuovo();
      c.rango = i < 2 ? 2 : i < Math.ceil(citta.length * 0.45) ? 1 : 0;
      c.legami = [];
    });

    /* Strade */
    const strada = (a, b) => {
      const costo = new Map([[a.k, 0]]), prec = new Map(), q = _coda(), ti = b.k % cw, tj = (b.k - ti) / cw;
      q.push(a.k, 0);
      while (q.size) {
        const k = q.pop();
        if (k === b.k) break;
        const i = k % cw, j = (k - i) / cw;
        for (const [u, v] of V8) {
          const x = i + u, y = j + v;
          if (x < 0 || y < 0 || x >= cw || y >= ch) continue;
          const n = id(x, y);
          if (eg[n] <= 0.004) continue;
          const c = costo.get(k) + Math.hypot(u, v) * (1 + Math.pow(Math.max(0, eg[n] - 0.4) * 3.2, 2) * 8 + (piuFiume[n] ? 1 : 0));
          if (c < (costo.has(n) ? costo.get(n) : Infinity)) { costo.set(n, c); prec.set(n, k); q.push(n, c + Math.hypot(x - ti, y - tj)); }
        }
      }
      if (!prec.has(b.k)) return null;
      const out = [];
      for (let k = b.k; k !== undefined; k = prec.get(k)) out.push(xyDi(k));
      return out.reverse();
    };
    const strade = [], rotteMare = [];
    const unisci = (a, b) => {
      const l = strada(a, b);
      if (!l) return false;
      const morb = M.morbida(l.map(([x, y], i) => (i && i < l.length - 1 ? [x + (rn(x * 0.02 + 70, y * 0.02) - 0.5) * 22, y + (rn(y * 0.02 + 90, x * 0.02) - 0.5) * 22] : [x, y])), 3);
      let px = 0;
      for (let i = 1; i < morb.length; i++) px += M.dist(morb[i - 1], morb[i]);
      strade.push({ linea: morb, km: px * kmPx });
      a.legami.push([b.nome, px * kmPx]); b.legami.push([a.nome, px * kmPx]);
      return true;
    };
    // Rete minima: prima le strade dentro ogni terra, dalle coppie piu' vicine. Poi le rotte via mare
    // collegano tra loro le terre rimaste separate, cosi' ogni luogo si raggiunge da ogni altro.
    const padre = citta.map((_, i) => i);
    const radice = (i) => { while (padre[i] !== i) { padre[i] = padre[padre[i]]; i = padre[i]; } return i; };
    const coppieCitta = [];
    citta.forEach((a, i) => citta.forEach((b, j) => { if (j > i) coppieCitta.push([i, j, M.dist([a.x, a.y], [b.x, b.y])]); }));
    coppieCitta.sort((a, b) => a[2] - b[2]);
    coppieCitta.forEach(([i, j]) => {
      if (massaId[citta[i].k] !== massaId[citta[j].k] || radice(i) === radice(j)) return;
      if (unisci(citta[i], citta[j])) padre[radice(i)] = radice(j);
    });
    const rotta = (a, b) => {
      const costo = new Map([[a.k, 0]]), prec = new Map(), q = _coda(), ti = b.k % cw, tj = (b.k - ti) / cw;
      q.push(a.k, 0);
      while (q.size) {
        const k = q.pop();
        if (k === b.k) break;
        const i = k % cw, j = (k - i) / cw;
        for (const [u, v] of V8) {
          const x = i + u, y = j + v;
          if (x < 0 || y < 0 || x >= cw || y >= ch) continue;
          const n = id(x, y), c = costo.get(k) + Math.hypot(u, v) * (eg[n] > 0 ? 7 : 1); // la nave lascia subito la terra
          if (c < (costo.has(n) ? costo.get(n) : Infinity)) { costo.set(n, c); prec.set(n, k); q.push(n, c + Math.hypot(x - ti, y - tj)); }
        }
      }
      if (!prec.has(b.k)) return null;
      const out = [];
      for (let k = b.k; k !== undefined; k = prec.get(k)) out.push(xyDi(k));
      return M.morbida(out.reverse(), 3);
    };
    coppieCitta.forEach(([i, j]) => {
      if (radice(i) === radice(j)) return;
      const a = citta[i], b = citta[j], l = rotta(a, b);
      if (!l) return;
      let px = 0;
      for (let u = 1; u < l.length; u++) px += M.dist(l[u - 1], l[u]);
      rotteMare.push({ linea: l, km: px * kmPx });
      a.legami.push([b.nome, px * kmPx, true]); b.legami.push([a.nome, px * kmPx, true]);
      padre[radice(i)] = radice(j);
    });
    const distStrade = M.campoDistanze(strade.map((s) => s.linea), W, H);
    const lontanoStrade = (x, y, d) => distStrade(x, y) > d;
    const lontanoCitta = (x, y, d) => citta.every((q) => Math.hypot(q.x - x, q.y - (y)) > d);

    /* Luoghi notevoli: rovine e fari */
    const NOTEVOLI = ['Torre delle Stelle', 'Biblioteca Sommersa', 'Faro degli Inganni', 'Abbazia Muta', 'Tumulo del Re Rosso', 'Osservatorio Perduto', 'Cripta dei Sette', 'Porta del Basilisco', 'Città dell\'Automa', 'Pozzo delle Voci'];
    const nomiNot = r.shuffle(NOTEVOLI), notevoli = [];
    for (const c of r.shuffle(candidati)) {
      if (notevoli.length >= Math.ceil(quanti / 3.5)) break;
      if (vietata(c) || !lontanoCitta(c.x, c.y, 80) || notevoli.some((q) => M.dist([q.x, q.y], [c.x, c.y]) < 170)) continue;
      notevoli.push({ x: c.x, y: c.y, nome: nomiNot[notevoli.length] });
    }
    const fari = [];
    citta.filter((c) => c.rango >= 1).forEach((c) => {
      for (let a = 0; a < 12 && fari.length < 3; a++) {
        const x = c.x + Math.cos(a * 0.524) * 50, y = c.y + Math.sin(a * 0.524) * 50;
        if (eIn(x, y) < -0.002 && eIn(c.x, c.y) > 0 && !fari.some((q) => M.dist(q, [x, y]) < 220)) { fari.push([x, y]); break; }
      }
    });

    /* ─── Disegno ─── */
    // Due stili: "atlante" (carta e inchiostro, di giorno) e "notte" (gesso e ambra su blu notte)
    const A = o.palette !== 'notte';
    // Il disegno ha la sua sequenza casuale: cambiare stile non cambia nomi e luoghi
    const rd = M.rng('regno-disegno:' + o.seme);

    // L'angolo di mare piu' aperto ospita la rosa dei venti
    const spazi = [[W - 140, 150], [150, 150], [W - 150, H - 150], [150, H - 150], [W * 0.5, 170], [W * 0.5, H - 170], [160, H * 0.5], [W - 170, H * 0.5]];
    const spazio = spazi.map((q) => {
      let min = 1;
      for (let a = 0; a < 16; a++) for (const d of [60, 120, 170]) min = Math.min(min, eIn(q[0] + Math.cos(a * 0.393) * d, q[1] + Math.sin(a * 0.393) * d) > 0 ? -1 : 1);
      return [q, min, -eIn(q[0], q[1])];
    }).sort((a, b) => (b[1] - a[1]) || (b[2] - a[2]));
    const [rx, ry] = spazio[0][0];

    const tratto = (d, col, sw, extra = '') => (d ? `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${extra}/>` : '');
    // Linee parallele alla costa, a distanze crescenti: increspature (atlante) o batimetria (notte)
    const dCosta = M.campoDistanze(costa, W, H, G);
    const anelliMare = (d) => M.contorni(w, h, (i, j) => d - (e(i, j) > 0 ? 0 : dCosta(i * G, j * G)), 0, G).map((l) => M.via(M.morbida(l, 1, true))).join('');
    // Il fiume si allarga verso la foce
    const fiumeAffusolato = (f, col, w0, w1) => {
      let g = '';
      const n = f.length, pezzi = 5;
      for (let k = 0; k < pezzi; k++) {
        const a = Math.floor(k * n / pezzi), b = Math.min(n, Math.floor((k + 1) * n / pezzi) + 1);
        if (b - a > 1) g += tratto(M.via(f.slice(a, b), false), col, n1(w0 + (w1 - w0) * k / (pezzi - 1)));
      }
      return g;
    };

    // Alberi uno per uno dentro i boschi (atlante); nella notte i boschi sono puntinati
    const alberi = [];
    if (A) {
      for (let y = 8; y < H; y += 10) for (let x = 8; x < W; x += 10) {
        const qx = x + rd.range(-4, 4), qy = y + rd.range(-4, 4);
        if (eIn(qx, qy) < 0.02) continue;
        const c = inB(fConifera, qx, qy) > 0, l = !c && inB(fLatifoglia, qx, qy) > 0;
        if ((!c && !l) || !lontanoCitta(qx, qy, 30) || !lontanoStrade(qx, qy, 7)) continue;
        alberi.push([qx, qy, c]);
      }
    }

    let s = '<defs>' +
      (A
        ? `<symbol id="carto-al" overflow="visible"><path d="M0 0V-4.6" stroke="${t.ink}" stroke-width="1"/><circle cx="0" cy="-8.4" r="4.7" fill="${t.chioma}" stroke="${t.ink}" stroke-width="0.85"/><path d="M1.4 -11.2a3.4 3.4 0 0 1 1 5.2" fill="none" stroke="${t.ink}" stroke-width="0.65"/></symbol>` +
          `<symbol id="carto-pn" overflow="visible"><path d="M0 -15L3.9 -5.4H1.9L5.3 0H-5.3L-1.9 -5.4H-3.9Z" fill="${t.chiomaPino || t.chioma}" stroke="${t.ink}" stroke-width="0.85" stroke-linejoin="round"/><path d="M0.7 -12.4L3.4 -1.2" stroke="${t.ink}" stroke-width="0.55"/></symbol>` +
          `<pattern id="carto-righe" width="12" height="4.4" patternUnits="userSpaceOnUse"><path d="M0 2.2H12" stroke="${t.ink}" stroke-width="0.6" opacity="0.12"/></pattern>`
        : `<pattern id="carto-puntini" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.6" cy="1.8" r="1.05" fill="${t.bosco}"/><circle cx="5.2" cy="5.3" r="1.05" fill="${t.bosco}"/></pattern>`) +
      '</defs>';

    /* Mare */
    if (A) {
      s += `<rect width="${W}" height="${H}" fill="${t.mare}" opacity="${t.colore ? 0.75 : 0.55}"/><rect width="${W}" height="${H}" fill="url(#carto-righe)"/>`;
      [[5, 0.55], [10, 0.45], [16, 0.35], [23, 0.26], [32, 0.18], [44, 0.1]].forEach(([d, op]) => { s += tratto(anelliMare(d), t.ink, 0.8, ` opacity="${op}"`); });
    } else {
      s += `<rect width="${W}" height="${H}" fill="${t.mare}"/>`;
      [[8, 0.24], [20, 0.16], [36, 0.11], [58, 0.07]].forEach(([d, op]) => { s += tratto(anelliMare(d), t.batimetria, 0.8, ` opacity="${op}"`); });
      let ret = '';
      for (let x = 200; x < W; x += 200) ret += `M${x} 0V${H}`;
      for (let y = 200; y < H; y += 200) ret += `M0 ${y}H${W}`;
      s += tratto(ret, t.gesso, 0.8, ' opacity="0.07"');
    }

    /* Terra */
    s += `<clipPath id="carto-terra"><path d="${tracciaTerra}" clip-rule="evenodd"/></clipPath>`;
    s += `<path d="${tracciaTerra}" fill="${t.terra}" fill-rule="evenodd"${A ? ` opacity="${t.colore ? 0.85 : 0.6}"` : ''}/>`;
    let dentro = '';
    const chiazza = (f, col, op) => {
      const d = M.contorni(w, h, f, 0, G).map((l) => M.via(l)).join('');
      return d ? `<path d="${d}" fill="${col}" fill-rule="evenodd" opacity="${op}" filter="url(#carto-b12)"/>` : '';
    };
    if (t.colore) {
      dentro += chiazza((i, j) => e(i, j) - 0.66, t.rilievo, 0.35) + chiazza((i, j) => e(i, j) - 0.8, t.rilievo, 0.35);
      dentro += chiazza(fConifera, t.boschi, 0.55) + chiazza(fLatifoglia, t.boschiLatif, 0.55) + chiazza(fSteppa, t.steppa, 0.55) + chiazza(fPalude, t.palude, 0.5);
    }
    if (A) {
      // Puntinato lungo la riva, come nelle tavole incise
      dentro += `<path d="${tracciaTerra}" fill="none" stroke="${t.ink}" stroke-width="9" stroke-dasharray="0.1 3.2" stroke-linecap="round" opacity="0.32"/>`;
      dentro += `<path d="${tracciaTerra}" fill="none" stroke="${t.ink}" stroke-width="20" stroke-dasharray="0.1 5.5" stroke-linecap="round" opacity="0.16"/>`;
    } else {
      dentro += chiazza((i, j) => e(i, j) - 0.45, t.terraAlta, 0.7);
      dentro += chiazza((i, j) => e(i, j) - 0.75, t.terraAlta, 0.6);
      // Curve di livello: una ogni quattro piu' marcata
      for (let k = 1; k < 14; k++) {
        const d = M.contorni(w, h, e, k / 14, G).filter((l) => l.length > 6).map((l) => M.via(M.morbida(l, 1, true))).join('');
        dentro += tratto(d, t.gesso, k % 4 === 0 ? 1.1 : 0.6, ` opacity="${k % 4 === 0 ? 0.48 : 0.2}"`);
      }
      const dBoschi = steppe_(conifere) + steppe_(latifoglie);
      if (dBoschi) dentro += `<path d="${dBoschi}" fill="url(#carto-puntini)" fill-rule="evenodd" opacity="0.75"/>`;
    }

    // Segni del terreno: ciuffi d'erba in piano, canne in palude, onde di sabbia in steppa
    let ciuffi = '', palu = '', dune = '';
    for (let y = 26; y < H - 10; y += 34) for (let x = 20; x < W - 10; x += 42) {
      const qx = x + rd.range(-16, 16), qy = y + rd.range(-13, 13), q = eIn(qx, qy);
      if (q < 0.03 || q > 0.72 || inB(fConifera, qx, qy) > -0.01 || inB(fLatifoglia, qx, qy) > -0.01) continue;
      if (inB(fSteppa, qx, qy) > 0) dune += `M${n1(qx - 13)} ${n1(qy)}q7 -6 13 -1q6 4 14 1`;
      else if (inB(fPalude, qx, qy) > 0) palu += `M${n1(qx - 9)} ${n1(qy)}h18M${n1(qx - 2)} ${n1(qy)}l-3 -9M${n1(qx)} ${n1(qy)}v-12M${n1(qx + 2)} ${n1(qy)}l3 -9M${n1(qx + 16)} ${n1(qy + 13)}h13`;
      else if (A && rd.chance(0.42)) ciuffi += `M${n1(qx - 2.5)} ${n1(qy)}l-1.4 -4.5M${n1(qx)} ${n1(qy)}v-6M${n1(qx + 2.5)} ${n1(qy)}l1.4 -4.5`;
    }
    const segno = A ? t.ink : t.gesso;
    dentro += tratto(ciuffi, segno, 0.8, ' opacity="0.6"') + tratto(palu, segno, 0.95, ` opacity="${A ? 0.75 : 0.4}"`) + tratto(dune, segno, 0.8, ` opacity="${A ? 0.55 : 0.35}"`);

    // Campi attorno agli insediamenti (solo di giorno: di notte non si vedono)
    if (A) {
      let campi = '';
      citta.forEach((c) => {
        const raggio = c.rango === 2 ? 58 : c.rango === 1 ? 44 : 32, nB = c.rango === 2 ? 8 : c.rango === 1 ? 6 : 3;
        for (let i = 0; i < nB; i++) {
          const a = rd.range(0, 6.28), d = rd.range(raggio * 0.55, raggio), x = c.x + Math.cos(a) * d * 1.2, y = c.y + Math.sin(a) * d * 0.8 + 6;
          const bw = rd.range(16, 30), bh = rd.range(14, 24);
          if (eIn(x, y) < 0.03 || inB(fConifera, x, y) > 0 || inB(fLatifoglia, x, y) > 0) continue;
          campi += M.tratteggio([[x - bw / 2, y - bh / 2], [x + bw / 2, y - bh / 2], [x + bw / 2, y + bh / 2], [x - bw / 2, y + bh / 2]], rd.chance(0.5) ? 0 : 1.5708, 3.1);
        }
      });
      dentro += tratto(campi, t.ink, 0.7, ' opacity="0.45"');
    }
    s += `<g clip-path="url(#carto-terra)">${dentro}`;
    fiumi.forEach((f) => { s += fiumeAffusolato(f, A ? t.ink : t.fiume, A ? 0.9 : 0.7, A ? 2.8 : 2.2); });
    s += '</g>';

    // Costa
    s += tratto(tracciaTerra, A ? t.ink : t.gesso, A ? 2.3 : 1.6, A ? '' : ' opacity="0.95"');

    // Strade e rotte via mare
    if (strade.length) s += tratto(strade.map((q) => M.via(q.linea, false)).join(''), A ? t.ink : t.ambra, 1.2, A ? ' stroke-dasharray="6 4" opacity="0.75"' : ' stroke-dasharray="5 5" opacity="0.65"');
    if (rotteMare.length) s += tratto(rotteMare.map((q) => M.via(q.linea, false)).join(''), A ? t.ink : t.gesso, 1.2, ' stroke-dasharray="1.5 6" opacity="0.5"');

    /* Rilievo, alberi, insediamenti: dall'alto verso il basso, cosi' si sovrappongono bene */
    const scena = [];
    const aggiungi = (y, svg) => scena.push([y, svg]);
    if (A) {
      alberi.forEach(([x, y, c]) => aggiungi(y, `<use href="#carto-${c ? 'pn' : 'al'}" xlink:href="#carto-${c ? 'pn' : 'al'}" x="${n1(x)}" y="${n1(y)}"/>`));
      // Alberi isolati in pianura
      for (let i = 0; i < 70; i++) {
        const qx = rd.range(40, W - 40), qy = rd.range(40, H - 40), q = eIn(qx, qy);
        if (q < 0.06 || q > 0.68 || inB(fConifera, qx, qy) > -0.012 || inB(fLatifoglia, qx, qy) > -0.012 || !lontanoCitta(qx, qy, 34) || !lontanoStrade(qx, qy, 8) || inB(fSteppa, qx, qy) > 0) continue;
        const c = rd.chance(0.5);
        aggiungi(qy, `<use href="#carto-${c ? 'pn' : 'al'}" xlink:href="#carto-${c ? 'pn' : 'al'}" x="${n1(qx)}" y="${n1(qy)}"/>`);
      }
      // Montagne a profilo morbido con l'ombra tratteggiata sul lato destro
      for (let y = 14; y < H; y += 27) for (let x = 10; x < W; x += 40) {
        const qx = x + (Math.floor(y / 27) % 2 ? 20 : 0) + rd.range(-16, 16), qy = y + rd.range(-10, 10), q = eIn(qx, qy);
        if (q < 0.78 || !rd.chance(0.88) || !lontanoCitta(qx, qy + 10, 34) || !lontanoStrade(qx, qy, 10)) continue;
        const m = 13 + Math.pow((q - 0.78) / 0.22, 1.2) * 26 + rd.range(-3, 5);
        const pk = [qx + rd.range(-0.17, 0.17) * m, qy - m * 1.2], lb = [qx - m * 0.95, qy], rb = [qx + m * 0.95, qy];
        const c1 = [lb[0] + m * 0.4, pk[1] + m * 0.5], c2 = [rb[0] - m * 0.45, pk[1] + m * 0.55];
        const profilo = `M${n1(lb[0])} ${n1(lb[1])}Q${n1(c1[0])} ${n1(c1[1])} ${n1(pk[0])} ${n1(pk[1])}Q${n1(c2[0])} ${n1(c2[1])} ${n1(rb[0])} ${n1(rb[1])}`;
        const ombra = [pk];
        for (let u = 0.125; u <= 1.001; u += 0.125) ombra.push([(1 - u) * (1 - u) * pk[0] + 2 * (1 - u) * u * c2[0] + u * u * rb[0], (1 - u) * (1 - u) * pk[1] + 2 * (1 - u) * u * c2[1] + u * u * rb[1]]);
        ombra.push([pk[0] + m * 0.15, qy]);
        const neve = clima === 'freddo' || q > 0.95;
        aggiungi(qy, `<path d="${profilo}Z" fill="${t.monte}"/>` +
          `<path d="${M.tratteggio(ombra, 1.23, Math.max(1.6, m * 0.065))}" stroke="${t.ink}" stroke-width="0.6"/>` +
          (neve ? `<path d="M${n1(pk[0])} ${n1(pk[1])}L${n1(pk[0] - m * 0.22)} ${n1(pk[1] + m * 0.3)}L${n1(pk[0] - m * 0.05)} ${n1(pk[1] + m * 0.24)}L${n1(pk[0] + m * 0.1)} ${n1(pk[1] + m * 0.34)}L${n1(pk[0] + m * 0.2)} ${n1(pk[1] + m * 0.22)}Z" fill="${t.monte}"/>` : '') +
          `<path d="${profilo}" fill="none" stroke="${t.ink}" stroke-width="${n1(Math.max(1.1, m * 0.05))}" stroke-linejoin="round"/>` +
          `<path d="M${n1(pk[0])} ${n1(pk[1])}Q${n1(pk[0] - m * 0.1)} ${n1(qy - m * 0.6)} ${n1(qx - m * 0.2)} ${n1(qy - m * 0.15)}" fill="none" stroke="${t.ink}" stroke-width="0.65"/>`);
      }
      // Colline ai piedi delle catene
      for (let y = 14; y < H; y += 24) for (let x = 12; x < W; x += 34) {
        const qx = x + rd.range(-11, 11), qy = y + rd.range(-9, 9), q = eIn(qx, qy);
        if (q < 0.66 || q > 0.78 || !rd.chance(0.42) || !lontanoCitta(qx, qy, 26) || !lontanoStrade(qx, qy, 7) || inB(fConifera, qx, qy) > -0.01 || inB(fLatifoglia, qx, qy) > -0.01) continue;
        const m = rd.range(8, 12);
        aggiungi(qy, `<path d="M${n1(qx - m)} ${n1(qy)}Q${n1(qx)} ${n1(qy - m * 1.15)} ${n1(qx + m)} ${n1(qy)}" fill="${t.monte}" stroke="${t.ink}" stroke-width="0.95"/>` +
          tratto([0, 1, 2].map((k) => `M${n1(qx + m * (0.15 + k * 0.22))} ${n1(qy - m * (0.45 - k * 0.12))}L${n1(qx + m * (0.3 + k * 0.22))} ${n1(qy - 0.6)}`).join(''), t.ink, 0.6));
      }
    }

    // Vette con la quota (notte): le cime piu' alte, ben distanziate
    if (!A) {
      const vette = [];
      for (let j = 4; j < h - 4; j += 2) for (let i = 4; i < w - 4; i += 2) {
        const q = e(i, j);
        if (q < 0.86) continue;
        let max = true;
        for (let b = -4; b <= 4 && max; b += 2) for (let a = -4; a <= 4; a += 2) if ((a || b) && e(i + a, j + b) > q) { max = false; break; }
        if (max) vette.push([i * G, j * G, q]);
      }
      vette.sort((a, b) => b[2] - a[2]);
      const scelte = [];
      for (const v of vette) { if (scelte.length >= 5) break; if (lontanoCitta(v[0], v[1], 60) && scelte.every((q) => M.dist(q, v) > 160)) scelte.push(v); }
      scelte.forEach(([x, y, q]) => {
        const m = Math.round(q * 3000 / 10) * 10, quota = m >= 1000 ? Math.floor(m / 1000) + '.' + String(m % 1000).padStart(3, '0') : String(m);
        aggiungi(y, `<path d="M${n1(x)} ${n1(y - 7)}L${n1(x + 6)} ${n1(y + 4)}H${n1(x - 6)}Z" fill="${t.gesso}"/>` +
          M.etichetta(x + 11, y + 4, quota + ' m', t, { size: 14, font: t.font, peso: 500, spazio: 1, ancora: 'start', colore: t.gessoTenue, alone: t.testoAlone, aloneW: 3 }));
      });
    }

    // Castello visto di fronte: mura, tre torri coi tetti a punta, porta
    const castello = (x, y, k) => {
      let g = `<rect x="${n1(x - 9 * k)}" y="${n1(y - 7 * k)}" width="${n1(18 * k)}" height="${n1(7 * k)}" fill="${t.muro}" stroke="${t.ink}" stroke-width="1"/>`;
      [[-10, -5, 13], [-3, 3, 18], [5, 10, 13]].forEach(([a, b, hh]) => {
        g += `<rect x="${n1(x + a * k)}" y="${n1(y - hh * k)}" width="${n1((b - a) * k)}" height="${n1(hh * k)}" fill="${t.muro}" stroke="${t.ink}" stroke-width="1"/>` +
          `<path d="M${n1(x + (a - 1) * k)} ${n1(y - hh * k)}L${n1(x + (a + b) / 2 * k)} ${n1(y - (hh + 6) * k)}L${n1(x + (b + 1) * k)} ${n1(y - hh * k)}Z" fill="${t.tetto}" stroke="${t.ink}" stroke-width="1" stroke-linejoin="round"/>`;
      });
      return g + `<path d="M${n1(x - 2 * k)} ${n1(y)}V${n1(y - 3 * k)}A${n1(2 * k)} ${n1(2 * k)} 0 0 1 ${n1(x + 2 * k)} ${n1(y - 3 * k)}V${n1(y)}Z" fill="${t.ink}"/>`;
    };
    citta.forEach((c) => {
      const x = c.x, y = c.y;
      let g = '';
      if (A) {
        if (c.rango === 2) g += castello(x, y + 6, 1.35);
        else if (c.rango === 1) g += castello(x, y + 5, 0.95);
        else g += `<circle cx="${x}" cy="${y}" r="5.5" fill="${t.muro}" stroke="${t.ink}" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="2.6" fill="${t.tetto}"/>`;
      } else {
        const rr = c.rango === 2 ? 5.5 : c.rango === 1 ? 4.5 : 3.6;
        g += `<circle cx="${x}" cy="${y}" r="${rr * 2.4}" fill="${t.ambra}" opacity="0.45" filter="url(#carto-b4)"/><circle cx="${x}" cy="${y}" r="${rr}" fill="${t.ambra}"/>`;
        if (c.rango === 2) g += `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${t.ambra}" stroke-width="1.3"/>`;
      }
      if (c.rango === 2 && o.stemmi !== false && typeof Araldica !== 'undefined') g += Araldica.scudo(Araldica.casuale(c.nome), x - 64, y - 42, 42, true);
      aggiungi(y + 22, g);
    });
    notevoli.forEach((c) => aggiungi(c.y + 2, A ? rovina(c.x, c.y, 11, t)
      : `<path d="M${c.x} ${c.y - 7}L${c.x + 6} ${c.y}L${c.x} ${c.y + 7}L${c.x - 6} ${c.y}Z" fill="none" stroke="${t.gesso}" stroke-width="1.4"/>`));
    if (A) {
      rotteMare.forEach((q) => {
        const m = q.linea[q.linea.length >> 1], x = m[0], y = m[1];
        aggiungi(y, `<path d="M${n1(x - 11)} ${n1(y)}H${n1(x + 11)}L${n1(x + 7)} ${n1(y + 6)}H${n1(x - 7)}Z" fill="${t.muro}" stroke="${t.ink}" stroke-width="1"/><path d="M${n1(x)} ${n1(y)}V${n1(y - 15)}" stroke="${t.ink}" stroke-width="1.1"/><path d="M${n1(x + 1)} ${n1(y - 14)}Q${n1(x + 11)} ${n1(y - 7)} ${n1(x + 1)} ${n1(y - 2)}Z" fill="${t.muro}" stroke="${t.ink}" stroke-width="0.9"/>`);
      });
    }
    fari.forEach(([x, y]) => aggiungi(y, A
      ? `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="9" ry="4.5" fill="${t.terra}" stroke="${t.ink}" stroke-width="1.3"/>` + faro(x, y, 11, t)
      : `<circle cx="${n1(x)}" cy="${n1(y)}" r="8" fill="${t.ambra}" opacity="0.5" filter="url(#carto-b4)"/><circle cx="${n1(x)}" cy="${n1(y)}" r="2.6" fill="${t.ambra}"/>` +
        tratto([0, 1, 2, 3].map((k) => { const a = k * Math.PI / 4; return `M${n1(x + Math.cos(a) * 5)} ${n1(y + Math.sin(a) * 5)}L${n1(x + Math.cos(a) * 9)} ${n1(y + Math.sin(a) * 9)}M${n1(x - Math.cos(a) * 5)} ${n1(y - Math.sin(a) * 5)}L${n1(x - Math.cos(a) * 9)} ${n1(y - Math.sin(a) * 9)}`; }).join(''), t.ambra, 1)));

    scena.sort((a, b) => a[0] - b[0]);
    s += scena.map((q) => q[1]).join('');

    if (o.confini) {
      const cap = citta.filter((c) => c.rango === 2).map((c) => [c.x, c.y]);
      if (cap.length > 1) s += `<g clip-path="url(#carto-terra)"><path d="${M.celle(cap, -50, -50, W + 50, H + 50).map((q) => M.via(q)).join('')}" fill="none" stroke="${A ? t.tetto : t.ambra}" stroke-width="2.6" stroke-dasharray="12 6 2 6" opacity="0.6"/></g>`;
    }

    /* ─── Scritte ─── */
    let testi = '';
    const riquadri = [];
    const urta = (a, b, c, d) => riquadri.some(([x0, y0, x1, y1]) => a < x1 && c > x0 && b < y1 && d > y0);
    const larghezza = (txt, size, sp = 0) => txt.length * (size * 0.5 + sp);
    const stile = (size, extra = {}) => ({ size, font: t.font, colore: t.testo, alone: t.testoAlone, aloneW: Math.max(3, size * 0.22), peso: t.peso, ...extra });
    const posa = (x, y, txt, st, passi) => {
      const size = st.size, l = larghezza(txt, size);
      for (const [dx, dy] of passi) {
        const px = x + dx, py = y + dy, x0 = px - l / 2, x1 = px + l / 2;
        if (x0 < 42 || x1 > W - 42 || py - size < 42 || py > H - 40 || urta(x0, py - size, x1, py + 3)) continue;
        riquadri.push([x0, py - size, x1, py + 3]);
        testi += M.etichetta(px, py, txt, t, { ...st, alone: st.alone });
        return true;
      }
      return false;
    };
    citta.forEach((c) => riquadri.push([c.x - 22, c.y - 22, c.x + 22, c.y + 18]));
    riquadri.push([rx - 95, ry - 100, rx + 95, ry + 95]);
    riquadri.push([rx > W / 2 ? 50 : W - 400, H - 100, rx > W / 2 ? 400 : W - 50, H - 30]);
    riquadri.push([rx > W / 2 ? 40 : W - 520, 40, rx > W / 2 ? 520 : W - 40, 160]); // il titolo // la scala, prima di ogni nome

    // Citta' per prime: sono i nomi che non devono mancare
    citta.slice().sort((a, b) => b.rango - a.rango).forEach((c) => {
      const size = c.rango === 2 ? 26 : c.rango === 1 ? 21 : 18, sotto = c.rango === 2 ? 48 : c.rango === 1 ? 38 : 30;
      posa(c.x, c.y, c.nome, stile(size), [[0, sotto], [0, sotto + 16], [0, -size * 1.3 - (c.rango === 2 ? 36 : 22)], [larghezza(c.nome, size) / 2 + 30, 6], [-larghezza(c.nome, size) / 2 - 30, 6]]);
    });
    notevoli.forEach((c) => posa(c.x, c.y, c.nome, stile(16), [[0, 19], [0, -19], [0, 35]]));

    // Nomi curvi su montagne e boschi: si misura ogni gruppo per seguirne la forma
    const gruppiDa = (f) => {
      const visti = new Uint8Array(w * h), out = [];
      for (let k = 0; k < w * h; k++) {
        const i0 = k % w, j0 = (k - i0) / w;
        if (visti[k] || i0 < 1 || j0 < 1 || i0 >= w - 1 || j0 >= h - 1 || f(i0, j0) <= 0) continue;
        const st = [k], pts = [];
        visti[k] = 1;
        while (st.length) {
          const c = st.pop(), i = c % w, j = (c - i) / w;
          pts.push([i * G, j * G]);
          for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const u = i + a, v = j + b, n = v * w + u;
            if (u < 1 || v < 1 || u >= w - 1 || v >= h - 1 || visti[n] || f(u, v) <= 0) continue;
            visti[n] = 1; st.push(n);
          }
        }
        out.push(pts);
      }
      return out.sort((a, b) => b.length - a.length);
    };
    const curvo = (pts, nomeG, size, sp, regola = null) => {
      // Ogni scritta curva viene controllata tratto per tratto (non col suo rettangolo intero, che
      // su una diagonale urterebbe quasi sempre) e, se trova un ostacolo, prova a spostarsi di lato.
      const lungTesto = nomeG.length * (size * 0.52 + sp);
      const base = M.curvaSuPunti(pts, lungTesto * 1.02, 0.09);
      const scatti = [[0, 0], [0, -34], [0, 34], [-50, 0], [50, 0], [0, -70], [0, 70], [-60, -40], [60, 40], [60, -40], [-60, 40], [0, -110], [0, 110]];
      for (const [dx, dy] of scatti) {
        const curva = base.map(([x, y]) => [x + dx, y + dy]);
        const pezzi = curva.map(([x, y]) => [x - size * 0.7, y - size * 0.9, x + size * 0.7, y + size * 0.3]);
        if (curva.some(([x, y]) => x < 50 || x > W - 50 || y < 60 || y > H - 50) || pezzi.some((b) => urta(...b))) continue;
        // Il nome deve stare sulla zona che nomina: almeno il centro della scritta e gran parte dei punti
        if (regola) {
          const sopra = curva.filter(([x, y]) => inB(regola, x, y) > 0).length;
          if (sopra < curva.length * 0.6) continue;
        }
        pezzi.forEach((b) => riquadri.push(b));
        testi += M.testoCurvo(curva, nomeG, t, { size, spazio: sp, font: t.fontCurvo, colore: t.testo, alone: t.testoAlone, aloneW: Math.max(3.5, size * 0.2), peso: t.peso });
        return true;
      }
      return false;
    };
    const gruppiMonti = gruppiDa((i, j) => e(i, j) - 0.79);
    const PRE_M = ['Monti', 'Catena di', 'Picchi di', 'Alpi di'];
    // Solo le zone davvero grandi meritano un nome: una scritta grande su un boschetto stona
    const fMonti = (i, j) => e(i, j) - 0.74;
    gruppiMonti.slice(0, 2).forEach((g, i) => { if (g.length > 260) curvo(g, r.pick(PRE_M) + ' ' + nomeNuovo(), i === 0 ? 30 : 24, i === 0 ? 7 : 5, fMonti); });
    gruppiDa(fConifera).slice(0, 2).forEach((g, i) => { if (g.length > 900) curvo(g, r.pick(['Selva di', 'Foresta di', 'Bosco di']) + ' ' + nomeNuovo(), i === 0 ? 27 : 23, 5, fConifera); });
    gruppiDa(fLatifoglia).slice(0, 1).forEach((g) => { if (g.length > 900) curvo(g, r.pick(['Bosco di', 'Querceto di', 'Macchia di']) + ' ' + nomeNuovo(), 25, 4, fLatifoglia); });
    gruppiDa(fPalude).slice(0, 1).forEach((g) => { if (g.length > 500) curvo(g, 'Paludi di ' + nomeNuovo(), 24, 8, fPalude); });
    gruppiDa(fSteppa).slice(0, 1).forEach((g) => { if (g.length > 900) curvo(g, (clima === 'arido' ? 'Deserto di ' : 'Piana di ') + nomeNuovo(), 26, 7, fSteppa); });

    if (o.distanze !== false) {
      strade.concat(rotteMare).forEach((q) => {
        if (q.km < 45) return;
        const m = q.linea[Math.floor(q.linea.length / 2)];
        const txt = (q.km >= 10 ? Math.round(q.km / 5) * 5 : Math.round(q.km)) + ' km';
        posa(m[0], m[1], txt, { size: 15, font: t.font, corsivo: A, peso: t.peso, colore: t.testo, alone: t.testoAlone, aloneW: 3 }, [[0, -6], [0, 16], [26, 5], [-26, 5]]);
      });
    }

    // Il mare ha un nome, nel tratto piu' aperto
    let mareP = null, mareD = 0;
    const nomeMare = 'Mare di ' + nomeNuovo(), mezzoMare = nomeMare.length * (A ? 10.5 : 11.5);
    for (let y = 150; y < H - 110; y += 34) for (let x = mezzoMare + 60; x < W - mezzoMare - 60; x += 34) {
      const q = eIn(x, y);
      if (q > -0.05 || urta(x - mezzoMare, y - 25, x + mezzoMare, y + 10)) continue;
      // Tutta la scritta deve stare sull'acqua, non solo il suo centro
      let tuttoMare = true;
      for (let u = -1; u <= 1; u += 0.25) if (eIn(x + u * mezzoMare, y) > -0.005 || eIn(x + u * mezzoMare, y - 16) > -0.005) tuttoMare = false;
      if (tuttoMare && -q > mareD) { mareD = -q; mareP = [x, y]; }
    }
    if (mareP) testi += A ? M.etichetta(mareP[0], mareP[1], nomeMare, t, { size: 30, font: t.font, corsivo: true, peso: 400, spazio: 6, colore: t.ink, alone: t.testoAlone, aloneW: 5 })
      : M.etichetta(mareP[0], mareP[1], nomeMare.toUpperCase(), t, { size: 26, font: t.font, peso: 500, spazio: 10, colore: t.mareTesto, aloneW: 0 });

    /* ─── Cornice, titolo, rosa dei venti, scala ─── */
    const M0 = 30, destra = rx > W / 2; // con la rosa a destra, titolo e scala vanno a sinistra
    const rett = (x, y, l, a, extra) => `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(l)}" height="${n1(a)}" ${extra}/>`;
    let cornice = `<path d="M0 0H${W}V${H}H0ZM${M0} ${M0}V${H - M0}H${W - M0}V${M0}Z" fill="${t.margine}" fill-rule="evenodd"/>`;
    if (A) {
      // Fascia graduata a tacche alterne, come i gradi di un atlante
      let tacche = '';
      for (let x = M0, k = 0; x < W - M0; x += 60, k++) if (k % 2) { const l = Math.min(60, W - M0 - x); tacche += `M${x} 15h${l}v6h${-l}ZM${x} ${H - 21}h${l}v6h${-l}Z`; }
      for (let y = M0, k = 0; y < H - M0; y += 60, k++) if (k % 2) { const l = Math.min(60, H - M0 - y); tacche += `M15 ${y}v${l}h6v${-l}ZM${W - 21} ${y}v${l}h6v${-l}Z`; }
      cornice += `<path d="${tacche}" fill="${t.ink}"/>` +
        rett(11, 11, W - 22, H - 22, `fill="none" stroke="${t.ink}" stroke-width="1.6"`) + rett(15, 15, W - 30, H - 30, `fill="none" stroke="${t.ink}" stroke-width="0.7"`) +
        rett(21, 21, W - 42, H - 42, `fill="none" stroke="${t.ink}" stroke-width="0.7"`) + rett(M0, M0, W - M0 * 2, H - M0 * 2, `fill="none" stroke="${t.ink}" stroke-width="1.8"`);
      if (o.titolo !== false) {
        const larg = Math.max(340, nome.length * 18 + 100), x0 = destra ? 56 : W - 56 - larg, y0 = 52;
        cornice += rett(x0, y0, larg, 94, `fill="${t.carta}" stroke="${t.ink}" stroke-width="1.8"`) + rett(x0 + 6, y0 + 6, larg - 12, 82, `fill="none" stroke="${t.ink}" stroke-width="0.7"`) +
          M.etichetta(x0 + larg / 2, y0 + 47, nome, t, { size: 34, font: t.fontCurvo, spazio: 2, colore: t.ink, aloneW: 0 }) +
          M.etichetta(x0 + larg / 2, y0 + 75, 'con le terre e i mari che lo circondano', t, { size: 17, font: t.font, corsivo: true, colore: t.ink, aloneW: 0 });
      }
    } else {
      cornice += rett(M0, M0, W - M0 * 2, H - M0 * 2, `fill="none" stroke="${t.gesso}" stroke-width="0.9" opacity="0.4"`);
      // Gradi del reticolo nel margine
      const lat = 38 + (r.int(0, 9)), lon = 8 + r.int(0, 9);
      for (let x = 200, k = 0; x < W; x += 200, k++) cornice += M.etichetta(x, 21, `${lon + (k >> 1)}°${k % 2 ? '30' : '00'}′`, t, { size: 12, font: t.font, peso: 500, colore: t.gessoTenue, aloneW: 0 });
      for (let y = 200, k = 0; y < H; y += 200, k++) cornice += M.etichetta(15, y + 4, `${lat - (k >> 1)}°${k % 2 ? '30' : '00'}′`, t, { size: 12, font: t.font, peso: 500, colore: t.gessoTenue, aloneW: 0, ruota: -90 });
      if (o.titolo !== false) {
        const tx = destra ? 66 : W - 66, ancora = destra ? 'start' : 'end';
        cornice += M.etichetta(tx, 94, nome.toUpperCase(), t, { size: 36, font: t.font, peso: 600, spazio: 8, ancora, colore: t.gesso, alone: t.testoAlone, aloneW: 5 }) +
          M.etichetta(tx, 126, `${lat}°${r.int(10, 59)}′ N  ·  ${lon}°${r.int(10, 59)}′ E`, t, { size: 16, font: t.font, peso: 500, spazio: 1.5, ancora, colore: t.ambra, alone: t.testoAlone, aloneW: 4 });
      }
    }

    // Rosa dei venti
    let rosa = '';
    const R0 = 82;
    if (A) {
      rosa += `<circle cx="${rx}" cy="${ry}" r="${n1(R0 * 0.78)}" fill="${t.carta}" fill-opacity="0.6" stroke="${t.ink}" stroke-width="0.9"/><circle cx="${rx}" cy="${ry}" r="${n1(R0 * 0.7)}" fill="none" stroke="${t.ink}" stroke-width="0.8"/>`;
      let tic = '';
      for (let k = 0; k < 64; k++) {
        const a = k / 64 * Math.PI * 2, r1 = R0 * 0.7, r2 = R0 * (k % 4 ? 0.74 : 0.78);
        tic += `M${n1(rx + Math.sin(a) * r1)} ${n1(ry - Math.cos(a) * r1)}L${n1(rx + Math.sin(a) * r2)} ${n1(ry - Math.cos(a) * r2)}`;
      }
      rosa += tratto(tic, t.ink, 0.7);
      const punta = (ang, len, larg) => {
        const tx = rx + Math.sin(ang) * len, ty = ry - Math.cos(ang) * len;
        const lx = rx + Math.sin(ang - Math.PI / 2) * larg, ly = ry - Math.cos(ang - Math.PI / 2) * larg;
        const qx = rx + Math.sin(ang + Math.PI / 2) * larg, qy = ry - Math.cos(ang + Math.PI / 2) * larg;
        return `<path d="M${rx} ${ry}L${n1(tx)} ${n1(ty)}L${n1(lx)} ${n1(ly)}Z" fill="${t.ink}"/><path d="M${rx} ${ry}L${n1(tx)} ${n1(ty)}L${n1(qx)} ${n1(qy)}Z" fill="${t.carta}"/>` +
          `<path d="M${n1(lx)} ${n1(ly)}L${n1(tx)} ${n1(ty)}L${n1(qx)} ${n1(qy)}L${rx} ${ry}Z" fill="none" stroke="${t.ink}" stroke-width="0.8" stroke-linejoin="round"/>`;
      };
      for (let k = 0; k < 8; k++) rosa += punta(Math.PI / 8 + k * Math.PI / 4, R0 * 0.45, R0 * 0.05);
      for (let k = 0; k < 4; k++) rosa += punta(Math.PI / 4 + k * Math.PI / 2, R0 * 0.62, R0 * 0.09);
      for (let k = 0; k < 4; k++) rosa += punta(k * Math.PI / 2, R0, R0 * 0.13);
      rosa += `<circle cx="${rx}" cy="${ry}" r="${n1(R0 * 0.07)}" fill="${t.tetto}" stroke="${t.ink}" stroke-width="0.8"/>` +
        M.etichetta(rx, ry - R0 - 12, 'N', t, { size: 26, font: t.fontCurvo, colore: t.ink, aloneW: 4 });
    } else {
      let lin = `M${rx - 76} ${ry}H${rx + 76}M${rx} ${ry + 76}V${ry - 52}`;
      for (let k = 0; k < 36; k++) {
        const a = k / 36 * Math.PI * 2, r2 = k % 9 ? 57 : 62;
        lin += `M${n1(rx + Math.sin(a) * 52)} ${n1(ry - Math.cos(a) * 52)}L${n1(rx + Math.sin(a) * r2)} ${n1(ry - Math.cos(a) * r2)}`;
      }
      rosa += `<circle cx="${rx}" cy="${ry}" r="52" fill="none" stroke="${t.gesso}" stroke-width="0.9" opacity="0.6"/>` + tratto(lin, t.gesso, 0.9, ' opacity="0.6"') +
        `<path d="M${rx} ${ry - 84}L${rx + 8} ${ry - 52}H${rx - 8}Z" fill="${t.ambra}"/>` +
        M.etichetta(rx, ry - 94, 'N', t, { size: 22, font: t.font, peso: 600, colore: t.ambra, aloneW: 0 });
    }

    // Scala: 200 km in cinque tratti
    const bx = destra ? 66 : W - 66 - 266 - 50, by = H - 64, tr = 266.6 / 5;
    let scala = '';
    for (let k = 0; k < 5; k++) scala += rett(bx + k * tr, by, tr, A ? 6 : 4, `fill="${k % 2 ? (A ? t.carta : t.mare) : (A ? t.ink : t.gesso)}"`);
    scala += rett(bx, by, 266.6, A ? 6 : 4, `fill="none" stroke="${A ? t.ink : t.gesso}" stroke-width="0.9"`);
    for (let k = 0; k <= 5; k++) scala += M.etichetta(bx + k * tr, by - 8, String(k * 40), t, { size: 14, font: t.font, peso: A ? 400 : 500, colore: A ? t.ink : t.gesso, alone: A ? t.carta : t.testoAlone, aloneW: 3 });
    scala += M.etichetta(bx + 266.6 + 12, by + 6, 'km', t, { size: 15, font: t.font, peso: A ? 400 : 500, ancora: 'start', colore: A ? t.ink : t.gesso, alone: A ? t.carta : t.testoAlone, aloneW: 3 });

    const pin = citta.map((c) => {
      const ruolo = c.rango === 2 ? 'Capoluogo' : c.rango === 1 ? 'Cittadina' : 'Villaggio';
      const km5 = (km) => (km >= 10 ? Math.round(km / 5) * 5 : Math.round(km)) + ' km';
      const vie = c.legami.filter((q) => !q[2]).map(([n, km]) => n + ': ' + km5(km) + ' (' + Math.max(1, Math.round(km / 32)) + ' g a piedi)').join('; ');
      const mare = c.legami.filter((q) => q[2]).map(([n, km]) => n + ': ' + km5(km) + ' (' + Math.max(1, Math.round(km / 80)) + ' g in nave)').join('; ');
      // La mappa figlia eredita cio' che qui si vede gia': il mare accanto, il fiume che passa
      const ci = c.k % cw, cj = (c.k - ci) / cw;
      let sulMare = false;
      for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) { const u = ci + a, v = cj + b; if (u >= 0 && v >= 0 && u < cw && v < ch && eg[id(u, v)] <= 0) sulMare = true; }
      const conFiume = !!piuFiume[c.k];
      const genera = c.rango === 0
        ? { tipo: 'villaggio', opzioni: { taglia: 'medio', fiume: conFiume } }
        : { tipo: 'citta', opzioni: { taglia: c.rango === 2 ? 'grande' : 'media', costa: sulMare, fiume: conFiume, mura: true, castello: c.rango === 2 } };
      return { x: c.x, y: c.y, label: c.nome, sottotipo: '', genera, tipoLuogo: c.rango >= 1 ? 'Città' : 'Villaggio', note: ruolo + '.' + (vie ? ' Strade per ' + vie + '.' : '') + (mare ? ' Via mare per ' + mare + '.' : '') };
    }).concat(notevoli.map((c) => ({ x: c.x, y: c.y, label: c.nome, sottotipo: 'pericolo', tipoLuogo: 'Dungeon', genera: { tipo: 'dungeon', opzioni: {} }, note: 'Luogo misterioso, tutto da riempire.' })));

    const svg = M.apri(W, H, A ? M.PALETTE.atlante : M.PALETTE.cartografo, o.seme) + s + (o.nomi === false ? '' : testi) + rosa + cornice + scala + '</svg>';
    return { nome, pin, W, H, larghezzaKm: W * kmPx, svg };
  };

  // Piu' anelli in un solo tracciato
  function steppe_(anelli) { return anelli.map((l) => M.via(l)).join(''); }

  return { regno };
})();

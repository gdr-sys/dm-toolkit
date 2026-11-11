/* ============================================================
   CARTOGRAFO-CAVERNA.JS — Generatore di caverne e radure.
   La forma nasce da un automa cellulare (rumore che si assesta in
   camere e gallerie). Caverna: muri neri, roccia tratteggiata, griglia
   a puntini. Radura: lo stesso bosco stratificato dei villaggi.
   ============================================================ */

const CartoCaverna = (() => {
  const M = CartoMotore, n1 = M.n1;

  const caverna = (o) => {
    const r = M.rng('caverna:' + o.seme), rn = M.rumore(r);
    const radura = o.ambiente === 'radura';
    const notte = o.palette === 'notte';
    const t = M.TONI_INTERNI[M.stileDi(o.palette)];
    const v = CartoVillaggio.TONI[M.stileDi(o.palette)];
    const carta = radura ? { ...M.cartaInterni(t), carta: notte ? v.prato : M.PALETTE.atlante.carta, inchiostro: notte ? v.testo : v.ink } : M.cartaInterni(t);
    const W = 1400, H = 1000, G = 14, w = Math.ceil(W / G) + 1, h = Math.ceil(H / G) + 1;
    const nome = o.nome || (radura ? 'Radura di ' : r.pick(['Grotta di ', 'Caverne di ', 'Antro di '])) + M.nomeLuogo(r);
    const maschera = { piccola: 0.6, media: 0.8, grande: 0.97 }[o.taglia] || 0.8;
    const conLegenda = o.legenda !== false;

    /* ── Forma ── */
    let g = new Uint8Array(w * h);
    const fuori = (i, j) => {
      const dx = (i / (w - 1) - 0.5) * 2, dy = (j / (h - 1) - 0.54) * 2.05;
      if (conLegenda && i * G > W - 385 && j * G < 560) return true;
      return Math.hypot(dx, dy) > maschera + (rn(i * 0.07, j * 0.07) - 0.5) * 0.32 || i < 4 || j < 8 || i >= w - 4 || j >= h - 4;
    };
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g[j * w + i] = fuori(i, j) || r.chance(radura ? 0.4 : 0.465) ? 1 : 0;
    for (let it = 0; it < 5; it++) {
      const n = new Uint8Array(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        if (fuori(i, j)) { n[j * w + i] = 1; continue; }
        let c = 0;
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (g[(j + b) * w + i + a]) c++;
        n[j * w + i] = c >= 5 ? 1 : 0;
      }
      g = n;
    }
    // Si tiene la regione piu' grande; le altre, se abbastanza ampie, si collegano con una galleria
    const regione = new Int32Array(w * h).fill(-1), regioni = [];
    for (let k = 0; k < g.length; k++) {
      if (g[k] || regione[k] >= 0) continue;
      const id = regioni.length, st = [k], celle = [];
      regione[k] = id;
      while (st.length) {
        const c = st.pop(), i = c % w;
        celle.push(c);
        for (const q of [c - 1, c + 1, c - w, c + w]) if (q >= 0 && q < g.length && !g[q] && regione[q] < 0 && Math.abs((q % w) - i) <= 1) { regione[q] = id; st.push(q); }
      }
      regioni.push(celle);
    }
    regioni.sort((a, b) => b.length - a.length);
    const principale = regioni[0] || [];
    regioni.slice(1).forEach((celle) => {
      if (celle.length < 14 || !principale.length) { celle.forEach((c) => { g[c] = 1; }); return; }
      const a = celle[celle.length >> 1], ax = a % w, ay = (a - ax) / w;
      let best = principale[0], min = Infinity;
      for (let q = 0; q < principale.length; q += 3) { const c = principale[q], x = c % w, y = (c - x) / w, d = Math.hypot(x - ax, y - ay); if (d < min) { min = d; best = c; } }
      const bx = best % w, by = (best - bx) / w;
      for (let u = 0; u <= 1; u += 1 / Math.max(1, min * 1.4)) {
        const x = Math.round(ax + (bx - ax) * u), y = Math.round(ay + (by - ay) * u);
        for (const [a2, b2] of [[0, 0], [1, 0], [0, 1]]) g[(y + b2) * w + x + a2] = 0;
      }
    });
    const campo = new Float64Array(w * h);
    for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
      let s = 0;
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) s += g[(j + b) * w + i + a] ? 0 : (a === 0 && b === 0 ? 4 : a === 0 || b === 0 ? 2 : 1);
      campo[j * w + i] = s / 16 + (rn(i * 0.3 + 5, j * 0.3) - 0.5) * 0.24;
    }
    const f = (i, j) => campo[j * w + i];
    const fIn = (x, y) => {
      const i = Math.max(0, Math.min(w - 2, Math.floor(x / G))), j = Math.max(0, Math.min(h - 2, Math.floor(y / G))), a = x / G - i, b = y / G - j;
      return (f(i, j) * (1 - a) + f(i + 1, j) * a) * (1 - b) + (f(i, j + 1) * (1 - a) + f(i + 1, j + 1) * a) * b;
    };
    // Nel prato i buchi minuscoli sembrerebbero macchie scure, non alberi: si tolgono
    const anelli = M.contorni(w, h, f, 0.5, G).filter((l) => !radura || l.length > 26).map((l) => M.morbida(l, 2, true));
    const dFondo = anelli.map((l) => M.via(l)).join('');

    /* ── Camere: i punti piu' lontani dalle pareti ── */
    const dista = new Int32Array(w * h).fill(9999), fila = [];
    for (let k = 0; k < g.length; k++) if (f(k % w, (k - (k % w)) / w) < 0.5) { dista[k] = 0; fila.push(k); }
    for (let q = 0; q < fila.length; q++) {
      const c = fila[q], i = c % w;
      for (const n of [c - 1, c + 1, c - w, c + w]) if (n >= 0 && n < g.length && Math.abs((n % w) - i) <= 1 && dista[n] > dista[c] + 1) { dista[n] = dista[c] + 1; fila.push(n); }
    }
    const cand = [];
    for (let k = 0; k < g.length; k++) if (dista[k] >= 2 && dista[k] < 9999) { const i = k % w; cand.push([i * G, ((k - i) / w) * G, dista[k] + r.f() * 0.5]); }
    cand.sort((a, b) => b[2] - a[2]);
    const nCamere = { piccola: 4, media: 7, grande: 10 }[o.taglia] || 7;
    const camere = [];
    for (const dMin of [190, 140, 100]) for (const c of cand) {
      if (camere.length >= nCamere) break;
      if (camere.every((q) => M.dist(q, c) > dMin) && !(c[1] < 110 && c[0] < W - 400)) camere.push(c);
    }

    /* ── Disegno ── */
    let s = '';
    const clip = `<clipPath id="carto-fondo"><path d="${dFondo}" clip-rule="evenodd"/></clipPath>`;
    const Q = 28;

    if (radura) {
      // Terreno con luci e ombre, poi il bosco che chiude la radura
      s += `<rect width="${W}" height="${H}" fill="${v.bosco}"/>` + clip;
      const trama = [];
      for (let y = -10; y < H + 20; y += 22) for (let x = -10; x < W + 20; x += 22) {
        const qx = x + r.range(-9, 9), qy = y + r.range(-9, 9);
        if (fIn(qx, qy) <= 0.14 && r.chance(0.6)) trama.push([qx, qy, r.range(15, 26)]);
      }
      let dTr = '';
      trama.forEach(([x, y, q]) => { dTr += CartoVillaggio.lobi(x, y, q, r, 7); });
      s += `<path d="${dTr}" fill="${v.chioma[0]}" fill-opacity="0.2" stroke="${v.ink}" stroke-width="0.9" stroke-opacity="0.55"/>`;
      // Il prato della radura, chiaro al centro e piu' scuro verso il bosco
      s += `<path d="${dFondo}" fill="${v.ink}" fill-rule="evenodd" transform="translate(9 12)" opacity="0.3" filter="url(#carto-b12)"/><path d="${dFondo}" fill="${v.prato}" fill-rule="evenodd"/>`;
      let chiaro = M.contorni(w, h, (i, j) => f(i, j) - 0.92, 0, G).map((l) => M.via(M.morbida(l, 2, true))).join('');
      if (chiaro) s += `<g clip-path="url(#carto-fondo)"><path d="${chiaro}" fill="${v.luce}" opacity="0.5" filter="url(#carto-b40)"/></g>`;
      if (o.griglia !== false) {
        let gr = '';
        for (let x = Q; x < W; x += Q) gr += `M${x} 0V${H}`;
        for (let y = Q; y < H; y += Q) gr += `M0 ${y}H${W}`;
        s += `<g clip-path="url(#carto-fondo)"><path d="${gr}" fill="none" stroke="${v.ink}" stroke-width="1.1" stroke-dasharray="0.1 ${Q / 4}" stroke-linecap="round" opacity="0.45"/></g>`;
      }
      // Dettagli: ciuffi, fiori, sassi
      let ciuffi = '', fiori = '', massi = '';
      for (let i = 0; i < 520; i++) {
        const x = r.range(30, W - 30), y = r.range(30, H - 30);
        if (fIn(x, y) < 0.68) continue;
        const k = r.f();
        if (k < 0.72) ciuffi += `M${n1(x - 2.5)} ${n1(y)}l-1.2 -4.5M${n1(x)} ${n1(y)}v-5.5M${n1(x + 2.5)} ${n1(y)}l1.2 -4.5`;
        else if (k < 0.9) fiori += `M${n1(x)} ${n1(y)}m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0Z`;
        else if (r.chance(0.5)) {
          const m = r.range(3, 8), lati = r.int(5, 7), q = [];
          for (let a = 0; a < lati; a++) { const b = a / lati * 6.283, u = m * r.range(0.7, 1.15); q.push([x + Math.cos(b) * u, y + Math.sin(b) * u * 0.8]); }
          massi += M.via(q);
        }
      }
      s += `<path d="${ciuffi}" fill="none" stroke="${v.ink}" stroke-width="0.8" opacity="0.5"/><path d="${fiori}" fill="${v.luce}" stroke="${v.ink}" stroke-width="0.5"/><path d="${massi}" fill="${v.stradaBordo}" stroke="${v.ink}" stroke-width="1"/>`;
    } else {
      s += `<rect width="${W}" height="${H}" fill="${t.sfondo}"/>` + clip;
      // Alone di roccia e tratteggio
      s += `<path d="${dFondo}" fill="${t.roccia}" stroke="${t.roccia}" stroke-width="44" stroke-linejoin="round" filter="url(#carto-b12)" opacity="0.92"/>`;
      let tr = '';
      anelli.forEach((l) => {
        let per = 0;
        for (let i = 0; i < l.length; i++) {
          const q = l[i], z = l[(i + 1) % l.length], tx = z[0] - q[0], ty = z[1] - q[1], u = Math.hypot(tx, ty) || 1;
          per += u;
          if (per < 10) continue;
          per = 0;
          let nx = -ty / u, ny = tx / u;
          if (fIn(q[0] + nx * 8, q[1] + ny * 8) > 0.5) { nx = -nx; ny = -ny; }
          for (let fl = 0; fl < 3; fl++) {
            if (fl === 2 && r.chance(0.6)) continue;
            const d = 9 + fl * 13 + r.range(-2, 3), cx = q[0] + nx * d + r.range(-3, 3), cy = q[1] + ny * d + r.range(-3, 3);
            if (fIn(cx, cy) > 0.3) continue;
            const a = Math.atan2(ty, tx) + r.range(-0.8, 0.8), c = Math.cos(a), sn = Math.sin(a);
            for (let k = -2; k <= 2; k++) {
              const l2 = r.range(5, 8), mx = cx - sn * k * 3, my = cy + c * k * 3;
              if (fIn(mx - c * l2, my - sn * l2) > 0.4 || fIn(mx + c * l2, my + sn * l2) > 0.4) continue;
              tr += `M${n1(mx - c * l2)} ${n1(my - sn * l2)}L${n1(mx + c * l2)} ${n1(my + sn * l2)}`;
            }
          }
        }
      });
      s += `<path d="${dFondo}" fill="none" stroke="url(#carto-tratt)" stroke-width="64" stroke-linejoin="round"/>`;
      s += `<path d="${dFondo}" fill="${t.pavimento}" fill-rule="evenodd"/>`;
      // Ombra interna: il buio si appoggia alle pareti
      s += `<g clip-path="url(#carto-fondo)"><path d="${dFondo}" fill="none" stroke="${t.ombra}" stroke-width="15" filter="url(#carto-b4)" opacity="${notte ? 0.6 : 0.3}"/>`;
      if (o.griglia !== false) {
        let gr = '';
        for (let x = Q; x < W; x += Q) gr += `M${x} 0V${H}`;
        for (let y = Q; y < H; y += Q) gr += `M0 ${y}H${W}`;
        s += `<path d="${gr}" fill="none" stroke="${t.ink}" stroke-width="1.4" stroke-dasharray="0.1 ${Q / 4}" stroke-linecap="round" opacity="0.7"/>`;
      }
      s += '</g>';
    }

    /* ── Acqua ── */
    let cameraAcqua = null;
    if (o.acqua !== false && camere.length > 1) {
      const fonte = camere[r.int(1, camere.length - 1)];
      const pozza = (i, j) => {
        const d = Math.hypot(i * G - fonte[0], j * G - fonte[1]);
        return f(i, j) * (1.25 - d / (fonte[2] * G * 1.15)) + (rn(i * 0.2 + 3, j * 0.2 + 3) - 0.5) * 0.3;
      };
      const pz = M.contorni(w, h, pozza, 0.72, G).map((l) => M.morbida(l, 2, true));
      if (pz.length) {
        const col = radura ? v.acqua : t.acqua, ink = radura ? v.acquaInk : t.acquaInk;
        s += `<g clip-path="url(#carto-fondo)"><path d="${pz.map((l) => M.via(l)).join('')}" fill="${col}" stroke="${radura ? v.ink : t.ink}" stroke-width="2.4"/>` +
          pz.map((l) => [0.78, 0.5].map((u) => `<path d="${M.via(l.map(([x, y]) => [fonte[0] + (x - fonte[0]) * u, fonte[1] + (y - fonte[1]) * u]))}" fill="none" stroke="${ink}" stroke-width="1" opacity="0.55"/>`).join('')).join('') + '</g>';
        cameraAcqua = fonte;
      }
    }

    /* ── Fondo della caverna: sassi, stalagmiti, crepe ── */
    if (!radura) {
      let massi = '', punte = '', crepe = '', funghi = '';
      for (let i = 0; i < 300; i++) {
        const x = r.range(40, W - 40), y = r.range(60, H - 40);
        if (fIn(x, y) < 0.74 || camere.some((c) => M.dist(c, [x, y]) < 26)) continue;
        const k = r.f();
        if (k < 0.4) {
          const m = r.range(2.5, 9), lati = r.int(5, 7), q = [];
          for (let a = 0; a < lati; a++) { const b = a / lati * 6.283, u = m * r.range(0.7, 1.15); q.push([x + Math.cos(b) * u, y + Math.sin(b) * u * 0.8]); }
          massi += M.via(q);
        } else if (k < 0.62) {
          const m = r.range(5, 11);
          punte += `M${n1(x - m * 0.62)} ${n1(y + m * 0.36)}L${n1(x - m * 0.08)} ${n1(y - m)}L${n1(x + m * 0.62)} ${n1(y + m * 0.36)}Z`;
        } else if (k < 0.85) {
          crepe += `M${n1(x)} ${n1(y)}l${n1(r.range(-14, 14))} ${n1(r.range(-10, 10))}l${n1(r.range(-14, 14))} ${n1(r.range(-10, 10))}`;
        } else {
          funghi += `M${n1(x - 3.4)} ${n1(y)}a3.4 3.4 0 0 1 6.8 0Z`;
        }
      }
      s += `<path d="${crepe}" fill="none" stroke="${t.ink}" stroke-width="1" opacity="0.55"/><path d="${massi}" fill="${t.pietra}" stroke="${t.ink}" stroke-width="1.3" stroke-linejoin="round"/><path d="${punte}" fill="${t.metallo}" stroke="${t.ink}" stroke-width="1.2" stroke-linejoin="round"/><path d="${funghi}" fill="${t.legno}" stroke="${t.ink}" stroke-width="1"/>`;
      s += `<path d="${dFondo}" fill="none" stroke="${t.ink}" stroke-width="4.6" stroke-linejoin="round"/>`;
    }

    /* ── Le chiome del bordo vanno sopra al prato ── */
    if (radura) {
      const fitti = [];
      for (let y = -10; y < H + 20; y += 21) for (let x = -10; x < W + 20; x += 21) {
        const qx = x + r.range(-9, 9), qy = y + r.range(-9, 9), c = fIn(qx, qy);
        if (c < 0.46 && c > 0.13) fitti.push([qx, qy, r.range(15, 28)]);
      }
      fitti.sort((a, b) => a[1] - b[1]);
      s += CartoVillaggio.chiome(fitti, v, r);
      // Alberelli isolati nel prato
      const isolati = [];
      for (let i = 0; i < 60; i++) {
        const x = r.range(40, W - 40), y = r.range(40, H - 40);
        if (fIn(x, y) > 0.8 && camere.every((c) => M.dist(c, [x, y]) > 44)) isolati.push([x, y, r.range(9, 15)]);
      }
      isolati.sort((a, b) => a[1] - b[1]);
      s += CartoVillaggio.chiome(isolati.slice(0, 14), v, r);
    }

    /* ── Numeri e legenda ── */
    camere.sort((a, b) => b[1] - a[1]);
    const VOCI = CartoTesti.vociGrotta(radura), prime = VOCI[0];
    const altre = r.shuffle(VOCI.slice(1).filter((q) => !['Sorgente', 'Lago sotterraneo'].includes(q[0])));
    const pin = [], voci = [];
    let testi = '';
    const inkT = radura ? v.ink : t.ink;
    camere.forEach((c, i) => {
      const [tit, d] = c === cameraAcqua ? (radura ? ['Sorgente', 'Acqua limpida e impronte di animali.'] : ['Lago sotterraneo', 'Acqua nera e immobile, profondità ignota.']) : i === 0 ? prime : altre[i % altre.length];
      testi += M.etichetta(c[0], c[1] + 9, String(i + 1), carta, { size: 28, font: carta.fontTitolo, peso: 600, colore: radura && !notte ? inkT : t.numero, alone: radura ? (notte ? v.testoAlone : v.luce) : t.pavimento, aloneW: 4.5 });
      voci.push({ n: i + 1, titolo: tit, testo: d });
      pin.push({ x: c[0], y: c[1] - 14, label: (i + 1) + '. ' + tit, note: d, sottotipo: 'nota' });
    });
    const areaTit = conLegenda ? W - 372 : W;
    let svg = M.apri(W, H, carta, o.seme) + s;
    if (o.nomi !== false) svg += testi;
    if (conLegenda) svg += M.legenda(W - 368, 36, 336, 520, 'Legenda', voci, { ...carta, carta: radura ? v.piazza : t.pavimento });
    if (o.titolo !== false) svg += M.etichetta(areaTit / 2, 70, notte ? nome.toUpperCase() : nome, carta, { size: notte ? 36 : 44, font: carta.fontTitolo, peso: notte ? 600 : 400, spazio: notte ? 6 : 1.5, colore: radura ? v.testo : t.ink, alone: radura ? v.testoAlone : t.sfondo, aloneW: 6 });
    svg += M.scala(50, H - 48, Q * 5, { valore: 7.5, nome: 'metri' }, 2, radura ? { ...carta, carta: v.piazza } : { ...carta, carta: t.pavimento }) + M.chiudi(W, H, carta);
    return { nome, pin, W, H, larghezzaKm: W / Q * 1.5 / 1000, svg }; // un quadretto = 1,5 metri
  };

  return { caverna };
})();

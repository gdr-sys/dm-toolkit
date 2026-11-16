/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   CARTOGRAFO-BATTAGLIA.JS — Battle map: piccole scene da scontro con
   la griglia da 1,5 m. Tutto nasce in quadretti (la posizione delle
   cose non dipende da legenda o titolo), poi si disegna in pixel.
   Scene: strada nel bosco, ponte sul fiume, interno di una locanda.
   I punti numerati dicono cosa danno al tavolo: copertura, terreno
   difficile, acqua. Stampa in scala e tavolo virtuale come i dungeon.
   ============================================================ */

const CartoBattaglia = (() => {
  const M = CartoMotore, n1 = M.n1;
  const DIM = { piccola: [18, 13], media: [24, 17], grande: [30, 21] };

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
  // Distanza da una spezzata, e il punto piu' vicino
  const _distSpezzata = (p, l) => {
    let min = Infinity;
    for (let i = 1; i < l.length; i++) min = Math.min(min, M.distSeg(p, l[i - 1], l[i]));
    return min;
  };

  const battaglia = (o) => {
    const r = M.rng('battaglia:' + o.seme), rn = M.rumore(r);
    const scena = ['bosco', 'ponte', 'locanda'].includes(o.scena) ? o.scena : 'bosco';
    const notte = o.palette === 'notte';
    const stile = M.stileDi(o.palette);
    const v = CartoVillaggio.TONI[stile];
    const t = M.TONI_INTERNI[stile];
    const interno = scena === 'locanda';
    const carta = interno ? M.cartaInterni(t) : { ...M.cartaInterni(t), carta: notte ? v.prato : M.PALETTE.atlante.carta, inchiostro: notte ? v.testo : v.ink };
    const ink = interno ? t.ink : v.ink;
    const [cols, rows] = DIM[o.taglia] || DIM.media;
    const conLegenda = o.legenda !== false;

    /* ── Impaginazione: quanto e' grande un quadretto ── */
    const W = 1400, H = 1000;
    const areaW = conLegenda ? W - 40 - 392 : W - 80, top = o.titolo !== false ? 118 : 46, areaH = H - top - 74;
    const S = Math.floor(Math.min(areaW / cols, areaH / rows));
    const ox = Math.round(40 + (areaW - cols * S) / 2 + (conLegenda ? 0 : 0)), oy = Math.round(top + (areaH - rows * S) / 2);
    const X = (u) => ox + u * S, Y = (u) => oy + u * S;
    const P = ([u, w]) => [X(u), Y(w)];

    const punti = []; // { u, w, titolo, testo }
    const segna = (u, w, titolo, testo) => punti.push({ u, w, titolo, testo });
    let s = '', sopra = '';
    const muri = [], porte = [];
    const clipId = 'carto-bm';
    const clip = `<clipPath id="${clipId}"><rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}"/></clipPath>`;

    // Ombra morbida sotto un oggetto
    const ombra = (d, op = 0.35) => `<path d="${d}" fill="${ink}" opacity="${notte ? op * 1.4 : op}" transform="translate(${n1(S * 0.08)} ${n1(S * 0.12)})" filter="url(#carto-b4)"/>`;
    // Rettangolo ruotato (in quadretti) come percorso in pixel
    const rett = (cu, cw, lu, lw, ang) => {
      const c = Math.cos(ang), sn = Math.sin(ang), q = [[-lu / 2, -lw / 2], [lu / 2, -lw / 2], [lu / 2, lw / 2], [-lu / 2, lw / 2]];
      return M.via(q.map(([a, b]) => [X(cu + a * c - b * sn), Y(cw + a * sn + b * c)]));
    };
    const masso = (cu, cw, m) => {
      const lati = r.int(6, 8), q = [];
      for (let a = 0; a < lati; a++) { const b = a / lati * 6.283, u = m * r.range(0.75, 1.12); q.push([X(cu) + Math.cos(b) * u * S, Y(cw) + Math.sin(b) * u * S * 0.82]); }
      const d = M.via(q);
      return ombra(d) + `<path d="${d}" fill="${interno ? t.pietra : (notte ? '#3a5563' : '#d8d0bf')}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>` +
        `<path d="M${n1(X(cu) - m * S * 0.3)} ${n1(Y(cw) - m * S * 0.1)}l${n1(m * S * 0.35)} ${n1(-m * S * 0.25)}" stroke="${ink}" stroke-width="1" opacity="0.5" fill="none"/>`;
    };
    // Tratteggio del terreno difficile su un'area (percorso in pixel)
    const difficile = (d) => `<path d="${d}" fill="url(#carto-bm-diff)" opacity="${notte ? 0.8 : 0.7}"/>`;
    const alberi = []; // [u, w, raggio in quadretti]
    const libero = (u, w, dmin) => alberi.every(([a, b, q]) => Math.hypot(a - u, b - w) > dmin + q * 0.6) && punti.every((p) => Math.hypot(p.u - u, p.w - w) > 1.6);

    /* ── Fondo comune all'aperto: prato con macchie di luce e ciuffi ── */
    const prato = () => {
      let out = `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="${v.prato}"/>`;
      let macchie = '';
      for (let i = 0; i < cols * rows * 0.18; i++) macchie += CartoVillaggio.lobi(X(r.range(0, cols)), Y(r.range(0, rows)), S * r.range(0.8, 2.2), r, 7);
      out += `<path d="${macchie}" fill="${v.pratoScuro}" opacity="0.45" filter="url(#carto-b12)"/>`;
      let luci = '';
      for (let i = 0; i < cols * rows * 0.08; i++) luci += CartoVillaggio.lobi(X(r.range(0, cols)), Y(r.range(0, rows)), S * r.range(0.6, 1.6), r, 6);
      out += `<path d="${luci}" fill="${v.luce}" opacity="0.35" filter="url(#carto-b12)"/>`;
      return out;
    };
    const ciuffi = (evita) => {
      let d = '', fiori = '';
      for (let i = 0; i < cols * rows * 1.1; i++) {
        const u = r.range(0.3, cols - 0.3), w = r.range(0.3, rows - 0.3);
        if (evita(u, w)) continue;
        const x = X(u), y = Y(w), k = S / 40;
        if (r.chance(0.82)) d += `M${n1(x - 3 * k)} ${n1(y)}l${n1(-1.4 * k)} ${n1(-5 * k)}M${n1(x)} ${n1(y)}v${n1(-6.5 * k)}M${n1(x + 3 * k)} ${n1(y)}l${n1(1.4 * k)} ${n1(-5 * k)}`;
        else fiori += `M${n1(x)} ${n1(y)}m-${n1(1.8 * k)} 0a${n1(1.8 * k)} ${n1(1.8 * k)} 0 1 0 ${n1(3.6 * k)} 0a${n1(1.8 * k)} ${n1(1.8 * k)} 0 1 0 ${n1(-3.6 * k)} 0Z`;
      }
      return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="0.9" opacity="0.45"/><path d="${fiori}" fill="${v.luce}" stroke="${ink}" stroke-width="0.6"/>`;
    };
    // Strada o fiume: una curva con i bordi
    const nastro = (l, larg, fondo, bordo, spessoreBordo) => {
      const d = 'M' + l.map((p) => P(p).map(n1).join(' ')).join('L');
      return `<path d="${d}" fill="none" stroke="${bordo}" stroke-width="${n1(larg * S + spessoreBordo)}" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="${d}" fill="none" stroke="${fondo}" stroke-width="${n1(larg * S)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    };
    const lineaDi = (l) => 'M' + l.map((p) => P(p).map(n1).join(' ')).join('L');

    let nome;

    if (scena === 'bosco') {
      /* ═════ Strada nel bosco: l'imboscata ═════ */
      nome = o.nome || r.pick(['La strada per ', 'Imboscata sulla via di ', 'Il sentiero di ']) + M.nomeLuogo(r, o.popolo);
      const strada = _attraversa(r, rn, cols, rows, false, rows * 0.16, 3);
      const suStrada = (u, w, m = 0) => _distSpezzata([u, w], strada) < 1.6 + m;
      s += prato();
      // Sottobosco ai margini: terreno difficile
      let sotto = '';
      for (let i = 0; i < cols * rows * 0.22; i++) {
        const u = r.range(0, cols), w = r.range(0, rows);
        if (suStrada(u, w, 1.4)) continue;
        if (Math.min(w, rows - w) > rows * 0.28 && r.chance(0.8)) continue;
        sotto += CartoVillaggio.lobi(X(u), Y(w), S * r.range(0.7, 1.3), r, 7);
      }
      s += `<path d="${sotto}" fill="${v.bosco}" opacity="0.75"/>` + difficile(sotto);
      s += nastro(strada, 3, v.strada, v.stradaBordo, 5);
      // Solchi delle ruote
      [-0.55, 0.55].forEach((k) => {
        const l = strada.map(([u, w], i) => { const q = strada[Math.min(strada.length - 1, i + 1)], p0 = strada[Math.max(0, i - 1)], tu = q[0] - p0[0], tw = q[1] - p0[1], m = Math.hypot(tu, tw) || 1; return [u - tw / m * k, w + tu / m * k]; });
        s += `<path d="${lineaDi(l)}" fill="none" stroke="${v.stradaBordo}" stroke-width="${n1(S * 0.08)}" stroke-dasharray="${n1(S * 0.9)} ${n1(S * 0.3)}" opacity="0.7"/>`;
      });
      s += ciuffi((u, w) => suStrada(u, w, 0.2));

      // Il carro rovesciato sulla strada
      const iC = Math.floor(strada.length * r.range(0.4, 0.6)), [cu, cw] = strada[iC], q2 = strada[iC + 1], angC = Math.atan2(q2[1] - cw, q2[0] - cu) + r.range(0.5, 0.9);
      const dCarro = rett(cu, cw, 2.6, 1.5, angC);
      sopra += ombra(dCarro, 0.4) + `<path d="${dCarro}" fill="${t.legno}" stroke="${ink}" stroke-width="2"/>`;
      for (let k = -1; k <= 1; k++) { const a = angC, c = Math.cos(a), sn = Math.sin(a); sopra += `<path d="M${n1(X(cu + c * k * 0.75 - sn * -0.72))} ${n1(Y(cw + sn * k * 0.75 + c * -0.72))}L${n1(X(cu + c * k * 0.75 - sn * 0.72))} ${n1(Y(cw + sn * k * 0.75 + c * 0.72))}" stroke="${ink}" stroke-width="1" opacity="0.6"/>`; }
      [[-1.1, -0.95], [1.1, 0.95]].forEach(([a, b]) => { const c = Math.cos(angC), sn = Math.sin(angC), x = X(cu + a * c - b * sn), y = Y(cw + a * sn + b * c); sopra += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(S * 0.42)}" fill="${t.legno}" stroke="${ink}" stroke-width="1.8"/><path d="M${n1(x - S * 0.42)} ${n1(y)}h${n1(S * 0.84)}M${n1(x)} ${n1(y - S * 0.42)}v${n1(S * 0.84)}" stroke="${ink}" stroke-width="1"/>`; });
      // Casse cadute
      for (let i = 0; i < 3; i++) { const u = cu + r.range(-1.8, 1.8), w = cw + r.range(1, 2) * (r.chance(0.5) ? 1 : -1), d = rett(u, w, 0.7, 0.7, r.range(0, 1.5)); sopra += ombra(d, 0.3) + `<path d="${d}" fill="${t.legno}" stroke="${ink}" stroke-width="1.4"/>`; }
      segna(cu, cw - 1.3, 'Carro rovesciato', 'Tre quarti di copertura per chi sta dietro.');

      // Albero caduto di traverso
      let tronco = null;
      for (let tent = 0; tent < 40 && !tronco; tent++) {
        const u = r.range(2, cols - 2), w = r.range(2, rows - 2);
        if (!suStrada(u, w, 1) || Math.hypot(u - cu, w - cw) < 5) continue;
        tronco = [u, w];
      }
      if (tronco) {
        const [tu, tw] = tronco, a = r.range(-0.5, 0.5) + Math.PI / 2;
        const d = rett(tu, tw, 4.4, 0.75, a);
        sopra += ombra(d, 0.4) + `<path d="${d}" fill="${t.legno}" stroke="${ink}" stroke-width="2"/>`;
        const c = Math.cos(a), sn = Math.sin(a);
        sopra += `<path d="M${n1(X(tu - c * 2))} ${n1(Y(tw - sn * 2))}L${n1(X(tu + c * 2))} ${n1(Y(tw + sn * 2))}" stroke="${ink}" stroke-width="1" opacity="0.4" stroke-dasharray="${n1(S * 0.5)} ${n1(S * 0.2)}"/>`;
        sopra += `<circle cx="${n1(X(tu + c * 2.25))}" cy="${n1(Y(tw + sn * 2.25))}" r="${n1(S * 0.38)}" fill="${notte ? '#4a3c2c' : '#e8d9b8'}" stroke="${ink}" stroke-width="1.6"/><circle cx="${n1(X(tu + c * 2.25))}" cy="${n1(Y(tw + sn * 2.25))}" r="${n1(S * 0.2)}" fill="none" stroke="${ink}" stroke-width="0.8"/>`;
        segna(tu - sn * 0.9, tw + c * 0.9, 'Albero caduto', 'Mezza copertura; scavalcarlo costa movimento extra.');
      }
      // Massi ai bordi della strada
      let nMassi = 0;
      for (let tent = 0; tent < 60 && nMassi < 3; tent++) {
        const u = r.range(1.5, cols - 1.5), w = r.range(1.5, rows - 1.5), d = _distSpezzata([u, w], strada);
        if (d < 2.2 || d > 4 || !libero(u, w, 1.2)) continue;
        sopra += masso(u, w, r.range(0.55, 0.85));
        if (nMassi === 0) segna(u, w - 1.1, 'Massi', 'Mezza copertura.');
        alberi.push([u, w, 0.6]);
        nMassi++;
      }
      // Rovi: terreno difficile
      let rovi = null;
      for (let tent = 0; tent < 60 && !rovi; tent++) {
        const u = r.range(2, cols - 2), w = r.range(2, rows - 2), d = _distSpezzata([u, w], strada);
        if (d > 2.4 && d < 5 && libero(u, w, 2)) rovi = [u, w];
      }
      let sopraRovi = '';
      if (rovi) {
        let d = '';
        for (let i = 0; i < 6; i++) d += CartoVillaggio.lobi(X(rovi[0] + r.range(-1, 1)), Y(rovi[1] + r.range(-0.7, 0.7)), S * r.range(0.6, 0.9), r, 8);
        sopraRovi += `<path d="${d}" fill="${v.chioma[2]}" stroke="${ink}" stroke-width="1.2" opacity="0.95"/>` + difficile(d);
        let spine = '';
        for (let i = 0; i < 26; i++) { const x = X(rovi[0] + r.range(-1.4, 1.4)), y = Y(rovi[1] + r.range(-1, 1)); spine += `M${n1(x)} ${n1(y)}l${n1(S * 0.12)} ${n1(-S * 0.12)}m0 ${n1(S * 0.12)}l${n1(-S * 0.12)} ${n1(-S * 0.12)}`; }
        sopraRovi += `<path d="${spine}" stroke="${ink}" stroke-width="0.9" fill="none" opacity="0.7"/>`;
        alberi.push([rovi[0], rovi[1], 2.6]);
        segna(rovi[0], rovi[1] - 1.5, 'Rovi', 'Terreno difficile; chi ci finisce dentro resta impigliato.');
      }
      // Alberi: fitti ai margini, radi vicino alla strada
      for (let tent = 0; tent < cols * rows * 1.4; tent++) {
        const u = r.range(-0.5, cols + 0.5), w = r.range(-0.5, rows + 0.5), d = _distSpezzata([u, w], strada);
        if (d < 2.3) continue;
        const q = r.range(0.7, 1.35);
        if (!libero(u, w, d < 4 ? 1.9 : 1.15)) continue;
        if (d < 4 && r.chance(0.55)) continue;
        alberi.push([u, w, q]);
      }
      const lista = alberi.filter(([, , q]) => q >= 0.7).map(([u, w, q]) => [X(u), Y(w), q * S]).sort((a, b) => a[1] - b[1]);
      sopra += CartoVillaggio.chiome(lista, v, r) + sopraRovi;
      segna(...(() => { const a = alberi.filter(([u, w, q]) => q >= 0.7 && u > 2 && u < cols - 2 && w > 2 && w < rows - 2).sort((x, y) => _distSpezzata([x[0], x[1]], strada) - _distSpezzata([y[0], y[1]], strada))[0] || [cols / 2, 1.5]; return [a[0], a[1]]; })(), 'Alberi', 'Tre quarti di copertura dietro il tronco; ci si può arrampicare.');
    } else if (scena === 'ponte') {
      /* ═════ Ponte sul fiume ═════ */
      nome = o.nome || r.pick(['Il ponte di ', 'Il guado di ', 'Il passo di ']) + M.nomeLuogo(r, o.popolo);
      const fiume = _attraversa(r, rn, cols, rows, true, cols * 0.08, 7);
      const larg = 5.2;
      const dF = (u, w) => _distSpezzata([u, w], fiume);
      s += prato();
      // Il fiume: rive di acqua bassa (terreno difficile) e corrente profonda al centro
      s += nastro(fiume, larg + 0.9, notte ? '#2a3b2e' : '#c9bb98', ink, 0);
      s += nastro(fiume, larg, v.acqua, ink, 3);
      const dRiva = lineaDi(fiume);
      s += `<path d="${dRiva}" fill="none" stroke="url(#carto-bm-diff)" stroke-width="${n1(larg * S)}" stroke-linecap="round" opacity="0.6"/>`;
      s += `<path d="${dRiva}" fill="none" stroke="${notte ? '#081822' : '#8fb3c2'}" stroke-width="${n1((larg - 2.2) * S)}" stroke-linecap="round" opacity="0.85"/>`;
      // Correnti
      for (let i = 0; i < 14; i++) {
        const k = r.int(2, fiume.length - 4), [u, w] = fiume[k], off = r.range(-1, 1);
        s += `<path d="M${n1(X(u + off))} ${n1(Y(w))}q${n1(S * 0.3)} ${n1(S * 0.5)} 0 ${n1(S)}" fill="none" stroke="${v.acquaInk}" stroke-width="1.2" opacity="0.6"/>`;
      }
      // La strada che attraversa il ponte
      const wP = Math.round(rows * r.range(0.35, 0.65));
      const strada = [[-1, wP + r.range(-1, 1)], [cols * 0.25, wP + r.range(-0.6, 0.6)], [cols * 0.5, wP], [cols * 0.75, wP + r.range(-0.6, 0.6)], [cols + 1, wP + r.range(-1, 1)]];
      s += nastro(strada, 2.4, v.strada, v.stradaBordo, 5);
      s += ciuffi((u, w) => dF(u, w) < larg / 2 + 0.6 || Math.abs(w - wP) < 1.6);
      // Il ponte di legno
      const iF = fiume.reduce((b, p, i) => Math.abs(p[1] - wP) < Math.abs(fiume[b][1] - wP) ? i : b, 0), cU = fiume[iF][0];
      const lungP = larg + 2.4, x0 = X(cU - lungP / 2), y0 = Y(wP - 1.1), wpx = lungP * S, hpx = 2.2 * S;
      sopra += ombra(`M${x0} ${y0}h${wpx}v${hpx}h${-wpx}Z`, 0.45) + `<rect x="${n1(x0)}" y="${n1(y0)}" width="${n1(wpx)}" height="${n1(hpx)}" fill="${t.legno}" stroke="${ink}" stroke-width="2"/>`;
      let assi = '';
      for (let x = x0 + S * 0.33; x < x0 + wpx - 2; x += S * 0.33) assi += `M${n1(x)} ${n1(y0)}v${n1(hpx)}`;
      sopra += `<path d="${assi}" stroke="${ink}" stroke-width="0.8" opacity="0.5"/>`;
      // Parapetti e pali
      [y0 + S * 0.12, y0 + hpx - S * 0.12].forEach((y) => { sopra += `<path d="M${n1(x0)} ${n1(y)}h${n1(wpx)}" stroke="${ink}" stroke-width="${n1(S * 0.16)}" stroke-linecap="round"/>`; });
      for (let x = x0; x <= x0 + wpx + 1; x += wpx / 4) [y0, y0 + hpx].forEach((y) => { sopra += `<rect x="${n1(x - S * 0.13)}" y="${n1(y - S * 0.13)}" width="${n1(S * 0.26)}" height="${n1(S * 0.26)}" fill="${t.legno}" stroke="${ink}" stroke-width="1.4"/>`; });
      segna(cU, wP - 1.9, 'Ponte', 'Il parapetto dà mezza copertura; sul ponte si passa in due affiancati.');
      segna(cU + 0.4, wP + (wP > rows / 2 ? 3.2 : -3.2), 'Acqua profonda', 'Si nuota: ogni metro costa il doppio. La corrente spinge a valle.');
      // Il guado: sassi in fila nell'acqua bassa, piu' a valle
      const wG = wP > rows / 2 ? Math.max(2, wP - 5) : Math.min(rows - 2, wP + 5);
      const iG = fiume.reduce((b, p, i) => Math.abs(p[1] - wG) < Math.abs(fiume[b][1] - wG) ? i : b, 0), gU = fiume[iG][0];
      for (let k = -2.4; k <= 2.4; k += 0.8) sopra += masso(gU + k, wG + r.range(-0.25, 0.25), r.range(0.28, 0.36));
      segna(gU - larg / 2 - 0.6, wG, 'Guado', 'Acqua bassa: terreno difficile. I sassi reggono una persona alla volta.');
      // Canneto sulla riva
      const lato = r.chance(0.5) ? 1 : -1, wC = r.range(2, rows - 2);
      const iCn = fiume.reduce((b, p, i) => Math.abs(p[1] - wC) < Math.abs(fiume[b][1] - wC) ? i : b, 0);
      if (Math.abs(wC - wP) > 2.5 && Math.abs(wC - wG) > 2) {
        const cuC = fiume[iCn][0] + lato * (larg / 2 - 0.3);
        let canne = '';
        for (let i = 0; i < 70; i++) { const x = X(cuC + r.range(-0.9, 0.9)), y = Y(wC + r.range(-1.6, 1.6)); canne += `M${n1(x)} ${n1(y)}l${n1(r.range(-2, 2))} ${n1(-S * 0.35)}`; }
        sopra += `<path d="${canne}" stroke="${v.chiomaL}" stroke-width="1.6" stroke-linecap="round"/><path d="${canne}" stroke="${ink}" stroke-width="0.5" opacity="0.6"/>`;
        segna(cuC + lato * 1.4, wC, 'Canneto', 'Chi ci si nasconde è difficile da vedere; terreno difficile.');
      }
      // Alberi sulle rive, lontani dall'acqua e dalla strada
      for (let tent = 0; tent < cols * rows * 0.9; tent++) {
        const u = r.range(-0.5, cols + 0.5), w = r.range(-0.5, rows + 0.5);
        if (dF(u, w) < larg / 2 + 1.2 || Math.abs(w - wP) < 2.2) continue;
        if (!libero(u, w, 1.3) || r.chance(0.45)) continue;
        alberi.push([u, w, r.range(0.7, 1.25)]);
      }
      let nM = 0;
      for (let tent = 0; tent < 50 && nM < 2; tent++) {
        const u = r.range(1.5, cols - 1.5), w = r.range(1.5, rows - 1.5);
        if (dF(u, w) < larg / 2 + 0.8 || Math.abs(w - wP) < 2 || !libero(u, w, 1.4)) continue;
        sopra += masso(u, w, r.range(0.6, 0.85)); alberi.push([u, w, 0.5]);
        if (!nM) segna(u, w - 1.1, 'Massi', 'Mezza copertura.');
        nM++;
      }
      sopra += CartoVillaggio.chiome(alberi.filter(([, , q]) => q >= 0.7).map(([u, w, q]) => [X(u), Y(w), q * S]).sort((a, b) => a[1] - b[1]), v, r);
    } else {
      /* ═════ Interno di una locanda ═════ */
      nome = o.nome || 'Locanda ' + r.pick(['del Cinghiale Allegro', 'del Gallo Nero', 'del Boccale Rotto', 'del Corvo Bianco', 'della Botte Storta', 'del Drago Spezzato', 'dei Tre Pozzi']);
      const m0 = 1, c0 = m0, r0 = m0, c1 = cols - m0, r1 = rows - m0; // muri esterni (in quadretti)
      const cucinaW = Math.max(4, Math.round((c1 - c0) * 0.26)), cx = c1 - cucinaW; // muro della cucina
      s += `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="${t.sfondo}"/>`;
      // Fuori: terra battuta a sassolini
      s += `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="url(#carto-sassi)" opacity="0.6"/>`;
      // Pavimento di assi (sala) e di pietra (cucina)
      s += `<rect x="${X(c0)}" y="${Y(r0)}" width="${(cx - c0) * S}" height="${(r1 - r0) * S}" fill="${t.pavimento}"/>`;
      let assi = '';
      for (let w = r0 + 0.5; w < r1; w += 0.5) { assi += `M${X(c0)} ${n1(Y(w))}H${X(cx)}`; }
      for (let w = r0; w < r1; w += 0.5) for (let u = c0 + r.range(0, 2); u < cx; u += r.range(2, 3.5)) assi += `M${n1(X(u))} ${n1(Y(w))}v${n1(S * 0.5)}`;
      s += `<path d="${assi}" stroke="${t.legno}" stroke-width="1" opacity="0.5"/>`;
      s += `<rect x="${X(cx)}" y="${Y(r0)}" width="${(c1 - cx) * S}" height="${(r1 - r0) * S}" fill="${t.pietra}"/>`;
      let lastre = '';
      for (let w = r0; w < r1; w += 1) for (let u = cx; u < c1; u += 1) lastre += `M${X(u)} ${Y(w)}h${S}v${S}`;
      s += `<path d="${lastre}" fill="none" stroke="${t.ink}" stroke-width="0.8" opacity="0.35"/>`;
      // Muri: esterni e della cucina, con le porte
      const portaF = Math.round((c0 + cx) / 2), portaR = r.int(r0 + 1, r1 - 2), portaC = r.int(r0 + 1, r1 - 2);
      const segMuro = (a, b, c, d) => muri.push([a, b, c, d]);
      for (let u = c0; u < c1; u++) { segMuro(u, r0, u + 1, r0); if (u !== portaF) segMuro(u, r1, u + 1, r1); }
      for (let w = r0; w < r1; w++) { segMuro(c0, w, c0, w + 1); if (w !== portaR) segMuro(c1, w, c1, w + 1); if (w !== portaC) segMuro(cx, w, cx, w + 1); }
      porte.push({ tipo: 'porta', seg: [portaF, r1, portaF + 1, r1] }, { tipo: 'porta', seg: [c1, portaR, c1, portaR + 1] }, { tipo: 'porta', seg: [cx, portaC, cx, portaC + 1] });
      const spM = Math.max(6, S * 0.3);
      let dM = '';
      muri.forEach(([a, b, c, d]) => { dM += `M${n1(X(a))} ${n1(Y(b))}L${n1(X(c))} ${n1(Y(d))}`; });
      sopra += `<path d="${dM}" stroke="${t.ink}" stroke-width="${n1(spM)}" stroke-linecap="square"/>`;
      // Porte disegnate
      porte.forEach(({ seg: [a, b, c, d] }) => {
        const vert = a === c, x = X(a), y = Y(b);
        sopra += vert
          ? `<rect x="${n1(x - spM / 2)}" y="${n1(y + 2)}" width="${n1(spM)}" height="${n1(S - 4)}" fill="${t.legno}" stroke="${t.ink}" stroke-width="1.4"/>`
          : `<rect x="${n1(x + 2)}" y="${n1(y - spM / 2)}" width="${n1(S - 4)}" height="${n1(spM)}" fill="${t.legno}" stroke="${t.ink}" stroke-width="1.4"/>`;
      });
      // Finestre sul muro in alto
      for (let u = c0 + 2; u < cx - 1; u += 4) sopra += `<rect x="${n1(X(u) + 4)}" y="${n1(Y(r0) - spM * 0.3)}" width="${n1(S * 1.2)}" height="${n1(spM * 0.6)}" fill="${notte ? '#7ebad8' : '#cfe0e6'}" stroke="${t.ink}" stroke-width="1"/>`;
      // Bancone a L vicino alla cucina
      const bU = cx - 2.2, bW0 = r0 + 1.2, bLung = Math.min(6, (r1 - r0) * 0.55);
      const dBanc = `M${n1(X(bU))} ${n1(Y(bW0))}h${n1(S * 0.9)}v${n1(bLung * S)}h${n1(-S * 3)}v${n1(-S * 0.9)}h${n1(S * 2.1)}Z`;
      sopra += ombra(dBanc, 0.35) + `<path d="${dBanc}" fill="${t.legno}" stroke="${t.ink}" stroke-width="2"/>`;
      for (let i = 0; i < 4; i++) sopra += `<circle cx="${n1(X(bU - 0.55))}" cy="${n1(Y(bW0 + 0.8 + i * 1.1))}" r="${n1(S * 0.2)}" fill="${t.legno}" stroke="${t.ink}" stroke-width="1"/>`;
      segna(bU + 0.45, bW0 - 0.55, 'Bancone', 'Tre quarti di copertura per chi sta dietro.');
      // Camino sul muro di sinistra
      const camW = Math.round((r0 + r1) / 2) - 1;
      sopra += `<rect x="${X(c0)}" y="${Y(camW)}" width="${n1(S * 0.9)}" height="${n1(S * 2)}" fill="${t.pietra}" stroke="${t.ink}" stroke-width="2"/>` +
        `<path d="M${n1(X(c0 + 0.2))} ${n1(Y(camW + 0.5))}q${n1(S * 0.5)} ${n1(S * 0.5)} 0 ${n1(S)}" fill="#e9b84f" stroke="#a8452a" stroke-width="2" opacity="0.95"/>` +
        `<circle cx="${n1(X(c0 + 0.45))}" cy="${n1(Y(camW + 1))}" r="${n1(S * 1.6)}" fill="#e9b84f" opacity="${notte ? 0.22 : 0.12}" filter="url(#carto-b12)"/>`;
      segna(c0 + 1.4, camW + 1, 'Camino', 'Chi ci finisce dentro prende danni da fuoco.');
      // Tavoli con le sedie, lontani da bancone, camino e porte
      const tavoli = [];
      for (let tent = 0; tent < 200 && tavoli.length < Math.round((cx - c0) * (r1 - r0) / 16); tent++) {
        const u = r.range(c0 + 2.2, bU - 1.8), w = r.range(r0 + 1.6, r1 - 1.6);
        if (Math.hypot(u - (portaF + 0.5), w - r1) < 2.4 || (u < c0 + 4.6 && Math.abs(w - camW - 1) < 3.2)) continue;
        if (u > bU - 3.6 && w > bW0 + bLung - 2.4 && w < bW0 + bLung + 1.6) continue; // il braccio del bancone
        if (u < c0 + 2.6 && w > r1 - 3) continue; // le botti
        if (tavoli.some(([a, b]) => Math.hypot(a - u, b - w) < 2.9)) continue;
        tavoli.push([u, w, r.chance(0.5)]);
      }
      tavoli.forEach(([u, w, tondo]) => {
        const rT = S * 0.62;
        for (let k = 0; k < 4; k++) { const a = k / 4 * 6.283 + (tondo ? 0.785 : 0); sopra += `<rect x="${n1(X(u) + Math.cos(a) * S * 0.95 - S * 0.2)}" y="${n1(Y(w) + Math.sin(a) * S * 0.95 - S * 0.2)}" width="${n1(S * 0.4)}" height="${n1(S * 0.4)}" rx="${n1(S * 0.08)}" fill="${t.legno}" stroke="${t.ink}" stroke-width="1.1"/>`; }
        const d = tondo ? `M${n1(X(u) - rT)} ${n1(Y(w))}a${n1(rT)} ${n1(rT)} 0 1 0 ${n1(rT * 2)} 0a${n1(rT)} ${n1(rT)} 0 1 0 ${n1(-rT * 2)} 0Z` : `M${n1(X(u) - rT)} ${n1(Y(w) - rT)}h${n1(rT * 2)}v${n1(rT * 2)}h${n1(-rT * 2)}Z`;
        sopra += ombra(d, 0.3) + `<path d="${d}" fill="${t.legno}" stroke="${t.ink}" stroke-width="1.8"/>` +
          `<circle cx="${n1(X(u) + S * 0.15)}" cy="${n1(Y(w) - S * 0.1)}" r="${n1(S * 0.1)}" fill="${t.metallo}" stroke="${t.ink}" stroke-width="0.6"/>`;
      });
      if (tavoli.length) segna(tavoli[0][0], tavoli[0][1] - 1.5, 'Tavoli', 'Mezza copertura; si possono rovesciare per farne un riparo.');
      // Botti nell'angolo
      const bt = [c0 + 0.6, r1 - 0.6];
      for (let i = 0; i < 4; i++) { const x = X(bt[0] + (i % 2) * 0.85), y = Y(bt[1] - Math.floor(i / 2) * 0.85); sopra += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(S * 0.4)}" fill="${t.legno}" stroke="${t.ink}" stroke-width="1.6"/><circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(S * 0.24)}" fill="none" stroke="${t.ink}" stroke-width="0.8"/>`; }
      segna(bt[0] + 1.8, bt[1] - 0.4, 'Botti', 'Mezza copertura; una botte rotta allaga il pavimento (terreno difficile).');
      // Scale per il piano di sopra, in cucina vicino al muro
      const sU = c1 - 1.5, sW = r0 + 0.2;
      let gradini = '';
      for (let k = 0; k <= 4; k++) gradini += `M${n1(X(sU))} ${n1(Y(sW + k * 0.6))}h${n1(S * 1.3)}`;
      sopra += `<rect x="${n1(X(sU))}" y="${n1(Y(sW))}" width="${n1(S * 1.3)}" height="${n1(S * 2.4)}" fill="${t.legno}" stroke="${t.ink}" stroke-width="1.6"/><path d="${gradini}" stroke="${t.ink}" stroke-width="1.2"/>`;
      segna(sU - 0.6, sW + 1.2, 'Scale', 'Portano alle camere al piano di sopra.');
      // Cucina: tavolo da lavoro e focolare
      const tl = rett(cx + (c1 - cx) / 2, r1 - 2, (c1 - cx) - 1.6, 0.9, 0);
      sopra += ombra(tl, 0.3) + `<path d="${tl}" fill="${t.legno}" stroke="${t.ink}" stroke-width="1.6"/>`;
      // Forno di pietra sul muro di fondo, scaffali e sacchi
      const fU = cx + 0.1, fW = r1 - 1.6;
      sopra += `<rect x="${n1(X(cx))}" y="${n1(Y(r0 + 0.1))}" width="${n1((c1 - cx - 2) * S)}" height="${n1(S * 0.6)}" fill="${t.legno}" stroke="${t.ink}" stroke-width="1.4"/>`;
      for (let u = cx + 0.5; u < c1 - 2; u += 0.9) sopra += `<circle cx="${n1(X(u))}" cy="${n1(Y(r0 + 0.4))}" r="${n1(S * 0.16)}" fill="${t.metallo}" stroke="${t.ink}" stroke-width="0.8"/>`;
      const wForno = Math.round((r0 + r1) / 2) - 1;
      sopra += `<rect x="${n1(X(c1) - S * 1.3)}" y="${n1(Y(wForno))}" width="${n1(S * 1.3)}" height="${n1(S * 1.8)}" rx="${n1(S * 0.3)}" fill="${t.pietra}" stroke="${t.ink}" stroke-width="2"/>` +
        `<path d="M${n1(X(c1) - S * 0.9)} ${n1(Y(wForno + 0.5))}a${n1(S * 0.4)} ${n1(S * 0.4)} 0 0 1 0 ${n1(S * 0.8)}" fill="#e9b84f" stroke="#a8452a" stroke-width="1.6"/>`;
      for (let i = 0; i < 3; i++) { const x = X(fU + 0.5 + i * 0.7), y = Y(fW - 2.2); sopra += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(S * 0.32)}" ry="${n1(S * 0.4)}" fill="${notte ? '#6b5a44' : '#e3d3ad'}" stroke="${t.ink}" stroke-width="1.2"/>`; }
      segna(cx + (c1 - cx) / 2, r1 - 3.1, 'Cucina', 'Forno acceso, coltelli e pentole a portata di mano; i sacchi danno mezza copertura.');
      // Tappeto davanti al camino
      sopra = `<rect x="${n1(X(c0 + 1.3))}" y="${n1(Y(camW - 0.3))}" width="${n1(S * 2.2)}" height="${n1(S * 2.6)}" rx="${n1(S * 0.2)}" fill="${carta.ambra || '#a8452a'}" opacity="0.35" stroke="${t.ink}" stroke-width="1"/>` + sopra;
    }

    /* ── Griglia di combattimento ── */
    let griglia = '';
    if (o.griglia !== false) {
      let d = '';
      for (let u = 0; u <= cols; u++) d += `M${X(u)} ${oy}V${oy + rows * S}`;
      for (let w = 0; w <= rows; w++) d += `M${ox} ${Y(w)}H${ox + cols * S}`;
      griglia = `<path d="${d}" fill="none" stroke="${ink}" stroke-width="1" opacity="${notte ? 0.32 : 0.28}"/>`;
    }

    /* ── Numeri e legenda ── */
    const voci = [], pin = [];
    let testi = '';
    const pal = { ...carta, numeroFondo: t.numero, numeroTesto: notte ? '#0e1d26' : '#ffffff' };
    const messi = [];
    punti.forEach((p, i) => {
      let u = Math.max(0.5, Math.min(cols - 0.5, p.u)), w = Math.max(0.5, Math.min(rows - 0.5, p.w));
      // Due numeri troppo vicini si leggono male: il secondo si sposta un po'
      for (let k = 0; k < 6 && messi.some(([a, b]) => Math.hypot(a - u, b - w) < 1.1); k++) { w = w + (w < rows - 1.5 ? 1 : -1); u = u + (k % 2 ? 0.6 : -0.6); u = Math.max(0.5, Math.min(cols - 0.5, u)); w = Math.max(0.5, Math.min(rows - 0.5, w)); }
      messi.push([u, w]);
      testi += M.numeroTondo(X(u), Y(w), i + 1, pal, Math.max(11, S * 0.36));
      voci.push({ n: i + 1, titolo: p.titolo, testo: p.testo });
      pin.push({ x: X(u), y: Y(w) - 14, label: (i + 1) + '. ' + p.titolo, note: p.testo, sottotipo: 'nota' });
    });
    if (!interno) voci.push({ titolo: 'Zone tratteggiate', testo: 'Terreno difficile: ogni metro costa il doppio.' });

    const defs = `<defs><pattern id="carto-bm-diff" width="${n1(S * 0.28)}" height="${n1(S * 0.28)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 ${n1(S * 0.14)}H${n1(S * 0.28)}" stroke="${ink}" stroke-width="${n1(Math.max(0.8, S * 0.035))}" opacity="0.55"/></pattern>${clip}</defs>`;
    let svg = M.apri(W, H, carta, o.seme) + defs;
    svg += `<rect x="${ox - 6}" y="${oy - 6}" width="${cols * S + 12}" height="${rows * S + 12}" rx="6" fill="${ink}" opacity="0.18" filter="url(#carto-b4)"/>`;
    svg += `<g clip-path="url(#${clipId})">${s}${sopra}${griglia}</g>`;
    svg += `<rect x="${ox}" y="${oy}" width="${cols * S}" height="${rows * S}" fill="none" stroke="${ink}" stroke-width="2.4"/>`;
    if (o.nomi !== false) svg += testi;
    if (conLegenda) svg += M.legenda(W - 372, 36, 340, H - 72, 'Cosa c\'è', voci, pal);
    const areaTit = conLegenda ? W - 380 : W;
    if (o.titolo !== false) svg += M.etichetta(areaTit / 2, 74, nome, carta, { size: 44, font: M.FONT_APP_TITOLI, peso: 400, colore: interno ? t.ink : v.testo, alone: interno ? t.sfondo : v.testoAlone, aloneW: 6 });
    svg += M.scala(ox, H - 40, S * 2, { valore: 3, nome: 'metri' }, 2, interno ? { ...carta, carta: t.pavimento } : { ...carta, carta: v.piazza }) + M.chiudi(W, H, carta);

    // Dati per tavolo virtuale e stampa in scala: tutti i quadretti sono pavimento
    const celle = [];
    for (let w = 0; w < rows; w++) for (let u = 0; u < cols; u++) celle.push([u, w]);
    const vtt = { S, ang: 0, ox, oy, minX: 0, minY: 0, maxX: cols, maxY: rows, muri, porte, celle };
    return { nome, pin, W, H, larghezzaKm: W / S * 1.5 / 1000, svg, vtt }; // un quadretto = 1,5 metri
  };

  return { battaglia };
})();

/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   CARTOGRAFO-INSEDIAMENTI.JS — Generatore di citta'.
   La citta' e' un borgo a raggiera: vie maestre dalla piazza alle
   porte, anelli di strade, isolati con le case in fila sulla strada,
   mura curve con torri tonde e campi a ventaglio tutt'attorno.
   Fuori dalle mura, a scelta: il cimitero tra due strade e le
   baracche addossate alle mura vicino alle porte.
   ============================================================ */

const CartoInsediamenti = (() => {
  const M = CartoMotore;
  const W = 1400, H = 1000;

  // Spezzata che attraversa tutta la mappa con un andamento naturale
  const _traversa = (rn, cx, cy, ang, scarto, ampiezza, passo = 34) => {
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, punti = [];
    const fase = rn(cx * 0.01, cy * 0.01) * 100;
    for (let t = -1150; t <= 1150; t += passo) {
      const o = scarto + (rn(t * 0.0022 + fase, fase) - 0.5) * ampiezza;
      punti.push([cx + dx * t + nx * o, cy + dy * t + ny * o]);
    }
    return M.morbida(punti, 2);
  };

  const _lontanoDaTutti = (p, lista, d) => lista.every((q) => M.dist(p, q) >= d);

  // Disegna strade con bordo: prima tutti i bordi, poi tutti i riempimenti, cosi' gli incroci restano puliti
  const _strade = (linee, p, larg) => {
    const d = linee.map((l) => M.via(l, false)).join('');
    return `<path d="${d}" fill="none" stroke="${p.stradaBordo}" stroke-width="${larg + 2.4}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${p.strada}" stroke-width="${larg}" stroke-linecap="round" stroke-linejoin="round"/>`;
  };

  const _barca = (x, y, ang, p) => {
    const c = Math.cos(ang), s = Math.sin(ang), T = (u, v) => M.n1(x + u * c - v * s) + ' ' + M.n1(y + u * s + v * c);
    return `<path d="M${T(-12, 0)}Q${T(-4, -6)} ${T(12, 0)}Q${T(-4, 6)} ${T(-12, 0)}Z" fill="${p.tetti[3]}" stroke="${p.inchiostro}" stroke-width="0.8"/>` +
      `<path d="M${T(2, -8)}L${T(2, 8)}" stroke="${p.carta}" stroke-width="2.4"/>`;
  };

  /* ═══════════════ CITTA' ═══════════════
     Borgo a raggiera: la citta' cresce attorno alla piazza. Le vie maestre partono dal centro verso
     le porte, gli anelli di strade girano attorno a distanze crescenti, e gli isolati stanno tra
     una via e l'altra. Tutto si costruisce in coordinate (u, v): u gira attorno al centro (ogni
     intero e' una via maestra), v va dalla piazza (0) alle mura (1) e oltre, nei campi.
     Ogni punto (u, v) ha una sola posizione: due isolati vicini condividono sempre il bordo. */
  const citta = (o) => {
    const r = M.rng('citta:' + o.seme), rn = M.rumore(r), p = { atlante: M.PALETTE.atlante, colori: M.PALETTE.colori, notte: M.PALETTE.cartografo }[M.stileDi(o.palette)];
    const taglia = { piccola: 'piccola', media: 'media', grande: 'grande' }[o.taglia] || 'media';
    const R = { piccola: 245, media: 335, grande: 385 }[taglia];
    const nInterne = { piccola: 34, media: 68, grande: 108 }[taglia];
    const N0 = { piccola: 4, media: 5, grande: 6 }[taglia];                                   // vie maestre
    const BANDE = { piccola: [0.2, 0.56, 1], media: [0.17, 0.43, 0.71, 1], grande: [0.14, 0.36, 0.58, 0.8, 1] }[taglia];
    const nome = o.nome || M.nomeLuogo(r, o.popolo);

    const angMare = r.range(0, Math.PI * 2);
    const mx = Math.cos(angMare), my = Math.sin(angMare);
    const cx = 700 - (o.costa ? mx * 80 : r.range(-30, 30)), cy = 556 - (o.costa ? my * 18 : r.range(-8, 12));
    const dalCentro = (q) => Math.hypot((q[0] - cx) / 1.2, (q[1] - cy) / 0.94);
    const D = R * r.range(0.62, 0.8);
    const mare = (q) => (o.costa ? (q[0] - cx) * mx + (q[1] - cy) * my - D + (rn(q[0] * 0.0052 + 7, q[1] * 0.0052) - 0.5) * 210 : -999);

    const angFiume = o.costa ? angMare + r.range(-0.25, 0.25) : r.range(0, Math.PI);
    const scartoFiume = R * r.range(0.16, 0.42) * (r.chance(0.5) ? 1 : -1);
    const fiume = o.fiume ? _traversa(rn, cx, cy, angFiume, scartoFiume, 300) : null;
    const largFiume = { piccola: 22, media: 28, grande: 36 }[taglia];
    const inAcqua = (q, m) => mare(q) > -m || (fiume && M.distLinea(q, fiume) < largFiume / 2 + m);

    /* ── Coordinate (u, v) ── */
    const ang0 = r.range(0, Math.PI * 2);
    const A = [];
    for (let k = 0; k < N0; k++) A.push(ang0 + Math.PI * 2 * (k + r.range(-0.17, 0.17)) / N0);
    const angoloU = (u) => {
      const k = Math.floor(u), f = u - k, k0 = ((k % N0) + N0) % N0, giri = Math.floor(k / N0) * Math.PI * 2;
      const a1 = A[k0], a2 = k0 + 1 < N0 ? A[k0 + 1] : A[0] + Math.PI * 2;
      return giri + a1 + (a2 - a1) * f;
    };
    // Le vie ondeggiano un poco, di piu' verso l'esterno; tutto dipende da (u, v), quindi i bordi combaciano
    const ondaVia = (u, v) => { const f = Math.PI * 2 * u / N0; return (rn(Math.cos(f) * 1.6 + 11, Math.sin(f) * 1.6 + v * 2.1) - 0.5) * 0.42 * Math.min(1, v * 1.4) / Math.sqrt(N0 / 4); };
    // Raggio delle mura in ogni direzione; verso il mare si fermano alla riva
    const limiteMare = new Float32Array(720);
    for (let b = 0; b < 720; b++) {
      const th = b / 720 * Math.PI * 2;
      let rho = 0;
      if (o.costa) { while (rho < R * 3 && mare([cx + Math.cos(th) * rho * 1.2, cy + Math.sin(th) * rho * 0.94]) < -34) rho += 5; }
      limiteMare[b] = o.costa ? rho : 1e9;
    }
    const raggio = (th) => {
      const base = R * (1 + (rn(Math.cos(th) * 1.4 + 5, Math.sin(th) * 1.4 + 9) - 0.5) * 0.34);
      const b = Math.floor(((th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 720) % 720;
      return Math.min(base, limiteMare[b] * 0.97);
    };
    const anello = (th, v) => (v <= 1.001 && v > 0.05 ? v * (1 + (rn(Math.cos(th) * 2.2 + v * 5, Math.sin(th) * 2.2 + v * 5) - 0.5) * 0.11) : v);
    const P = (u, v) => {
      const th = angoloU(u) + ondaVia(u, v), rho = raggio(th) * anello(th, v);
      return [cx + Math.cos(th) * rho * 1.2, cy + Math.sin(th) * rho * 0.94];
    };
    // Contorno di una cella (u0..u1, v0..v1), con i lati rientrati di quanto servono le strade (in pixel)
    const cella = (u0, u1, v0, v1, rientri = [0, 0, 0, 0]) => {
      const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
      const perV = (v1 - v0) / (M.dist(P(um, v0), P(um, v1)) || 1), perU = (u1 - u0) / (M.dist(P(u0, vm), P(u1, vm)) || 1);
      const [dIn, dB, dOut, dA] = rientri;
      const a = u0 + dA * perU, b = u1 - dB * perU, c = v0 + dIn * perV, d = v1 - dOut * perV;
      if (b <= a || d <= c) return [];
      const nu = Math.max(2, Math.ceil(Math.max(M.dist(P(a, c), P(b, c)), M.dist(P(a, d), P(b, d))) / 9));
      const nv = Math.max(2, Math.ceil(M.dist(P(a, c), P(a, d)) / 11));
      const pts = [];
      for (let i = 0; i < nu; i++) pts.push(P(a + (b - a) * i / nu, c));
      for (let i = 0; i < nv; i++) pts.push(P(b, c + (d - c) * i / nv));
      for (let i = 0; i < nu; i++) pts.push(P(b - (b - a) * i / nu, d));
      for (let i = 0; i < nv; i++) pts.push(P(a, d - (d - c) * i / nv));
      return pts;
    };
    const giroA = (v, passi = 240) => Array.from({ length: passi }, (_, i) => P(i / passi * N0, v));

    /* ── Isolati ── */
    const MURO = o.mura ? 9 : 3;
    const isolati = [];
    for (let j = 0; j < BANDE.length - 1; j++) {
      const v0 = BANDE[j], v1 = BANDE[j + 1], perSettore = j + 2;
      for (let k = 0; k < N0; k++) {
        // Le vie minori di un anello non continuano in quello dopo: ogni anello ha i suoi tagli
        const tagli = [k];
        for (let i = 1; i < perSettore; i++) tagli.push(k + (i + r.range(-0.18, 0.18)) / perSettore);
        tagli.push(k + 1);
        for (let i = 0; i < tagli.length - 1; i++) {
          const u0 = tagli[i], u1 = tagli[i + 1];
          const lato = (u) => (Number.isInteger(u) ? 5.5 : 2.4);
          const rientri = [j === 0 ? 4.5 : 3.2, lato(u1), v1 >= 1 ? MURO : 3.2, lato(u0)];
          const poly = cella(u0, u1, v0, v1, rientri);
          if (poly.length < 4) continue;
          const centro = M.centro(poly);
          if (poly.some((q) => mare(q) > -4) || mare(centro) > -20) continue;
          isolati.push({ poly, centro, banda: j, settore: k, u0, u1, v0, v1, tipo: 'normale', area: Math.abs(M.area(poly)) });
        }
      }
    }
    const interne = isolati; // per i nomi dei rioni
    const piazzaPoly = giroA(BANDE[0] - 4.5 / R, 90);
    const piazza = { poly: piazzaPoly, centro: M.centro(piazzaPoly), tipo: 'piazza' };
    const muraPoly = giroA(1, 260);
    const anelloMura = muraPoly.concat([muraPoly[0]]);

    // Funzioni degli isolati
    const asciutti = isolati.filter((c) => !inAcqua(c.centro, 22));
    const tempio = asciutti.filter((c) => c.banda === 0).sort((a, b) => b.area - a.area)[0] || null;
    if (tempio) tempio.tipo = 'tempio';
    let castello = null;
    if (o.castello) {
      const dentroFoglio = (c) => c.poly.every((v) => v[0] > 70 && v[0] < W - 70 && v[1] > 120 && v[1] < H - 90);
      castello = asciutti.filter((c) => c.banda === BANDE.length - 2 && c.tipo === 'normale' && dentroFoglio(c))
        .sort((a, b) => (b.area - mare(b.centro) * 30) - (a.area - mare(a.centro) * 30))[0] || null;
      if (castello) castello.tipo = 'castello';
    }
    // Un rione per ogni spicchio tra due vie maestre
    const semiRioni = Array.from({ length: N0 }, () => ({ celle: [], carattere: 'normale' }));
    isolati.forEach((c) => semiRioni[c.settore].celle.push(c));
    semiRioni.forEach((q, k) => {
      q.centro = q.celle.length ? M.centro(q.celle.map((c) => c.centro).length > 2 ? q.celle.map((c) => c.centro) : [P(k + 0.5, 0.5), P(k + 0.6, 0.6), P(k + 0.4, 0.6)]) : P(k + 0.5, 0.6);
      const conCastello = castello && castello.settore === k;
      q.carattere = conCastello || r.chance(0.25) ? 'nobile' : r.chance(0.35) ? 'poveri' : 'normale';
    });
    isolati.forEach((c) => {
      if (c.tipo !== 'normale') return;
      if (mare(c.centro) > -80 && r.chance(0.7)) c.tipo = 'magazzini';
      else if (r.chance(0.035)) c.tipo = 'parco';
      else c.tipo = semiRioni[c.settore].carattere;
    });

    /* ── Strade ── */
    const viaMaestra = (k, da, a, passo = 0.02) => { const l = []; for (let v = da; v <= a + 1e-6; v += passo) l.push(P(k, v)); return l; };
    const maestreDentro = Array.from({ length: N0 }, (_, k) => viaMaestra(k, BANDE[0], 1));
    const viePrincipali = maestreDentro.flatMap((l) => l.slice(0, -1).map((q, i) => [q, l[i + 1]]));
    const porte = [];
    for (let k = 0; k < N0; k++) {
      const g = P(k, 1);
      if (mare(g) > -35 || (fiume && M.distLinea(g, fiume) < largFiume) || (castello && (castello.u0 === k || castello.u1 === k))) continue;
      porte.push({ k, g });
    }
    const stradeFuori = porte.map(({ k }) => {
      const l = [];
      for (let v = 1; v < 4; v += 0.03) {
        const q = P(k, v);
        if (mare(q) > -12 || q[0] < -40 || q[1] < -40 || q[0] > W + 40 || q[1] > H + 40) break;
        l.push(q);
      }
      return M.morbida(l, 1);
    }).filter((l) => l.length > 1);

    /* ── Campagna: campi a ventaglio attorno alle mura ── */
    let svg = `<rect x="0" y="0" width="${W}" height="${H}" fill="${p.erba}" opacity="0.6"/>`;
    const bosco = (q) => rn(q[0] * 0.0048 + 91, q[1] * 0.0048 + 13, 3);
    // Cimitero: fuori dalle mura, tra due strade che escono dalle porte, con il suo muretto
    let cimitero = null;
    if (o.cimitero) {
      const posti = [];
      for (let k = 0; k < N0; k++) {
        const poly = cella(k + 0.3, k + 0.7, 1.13, 1.4, [0, 0, 0, 0]);
        if (poly.length < 4) continue;
        const geo = { u0: k + 0.3, u1: k + 0.7, v0: 1.13, v1: 1.4, fuori: true };
        const c = M.centro(poly);
        if (poly.some((q) => inAcqua(q, 10) || q[0] < 50 || q[1] < 110 || q[0] > W - 50 || q[1] > H - 50)) continue;
        if (stradeFuori.some((l) => l.some((q) => M.dentro(q, poly)))) continue;
        posti.push({ poly, centro: c, ...geo });
      }
      cimitero = posti.length ? r.pick(posti) : null;
      // Nessun posto fuori (citta' grande che riempie il foglio): un camposanto dentro le mura, nell'anello esterno
      if (!cimitero) {
        const c = r.shuffle(isolati.filter((x) => x.banda === BANDE.length - 2 && ['normale', 'poveri'].includes(x.tipo) && x.area > 2500 && !inAcqua(x.centro, 20)))[0];
        if (c) { c.tipo = 'cimitero'; cimitero = { poly: c.poly, centro: c.centro, u0: c.u0, u1: c.u1, v0: c.v0, v1: c.v1, fuori: false }; }
      }
    }
    const nelCimitero = (q, m = 0) => !!cimitero && (M.dentro(q, cimitero.poly) || M.distLinea(q, cimitero.poly.concat([cimitero.poly[0]])) < m);
    const CAMPI = [1.16, 1.48, 1.84, 2.26, 2.74, 3.3];
    const nSpicchi = N0 * 7;
    for (let j = 0; j < CAMPI.length - 1; j++) {
      for (let i = 0; i < nSpicchi; i++) {
        const u0 = i * N0 / nSpicchi, u1 = (i + 1) * N0 / nSpicchi;
        // A volte due spicchi vicini sono un campo solo, a volte uno spicchio e' diviso in strisce
        const pezzi = r.chance(0.35) ? 2 : 1;
        for (let s = 0; s < pezzi; s++) {
          const a = u0 + (u1 - u0) * s / pezzi, b = u0 + (u1 - u0) * (s + 1) / pezzi;
          const poly = cella(a, b, CAMPI[j], CAMPI[j + 1], [3, 3, 3, 3]);
          if (poly.length < 4) continue;
          const c = M.centro(poly);
          if (c[0] < -60 || c[1] < -60 || c[0] > W + 60 || c[1] > H + 60) continue;
          if (poly.some((q) => inAcqua(q, 3)) || bosco(c) > 0.57 || stradeFuori.some((l) => M.distLinea(c, l) < 18)) continue;
          if (cimitero && (poly.some((q) => nelCimitero(q, 4)) || cimitero.poly.some((q) => M.dentro(q, poly)))) continue;
          const dir = P((a + b) / 2, CAMPI[j + 1]), dir0 = P((a + b) / 2, CAMPI[j]);
          svg += M.campo(poly, r.pick(p.campi), Math.atan2(dir[1] - dir0[1], dir[0] - dir0[0]), 6.5, p);
        }
      }
    }

    /* ── Terreno della citta': il fondo e' la strada, gli isolati ci stanno sopra ── */
    svg += `<path d="${M.via(muraPoly)}" fill="${p.strada}" stroke="${p.stradaBordo}" stroke-width="1"/>`;
    svg += isolati.map((c) => `<path d="${M.via(c.poly)}" fill="${p.terra}" stroke="${p.stradaBordo}" stroke-width="0.7"/>`).join('');
    svg += _strade([...stradeFuori, ...maestreDentro], p, 7.5);

    // Acqua
    if (fiume) svg += M.fiumeSvg(fiume, largFiume, p);
    if (o.costa) {
      const G = 40, gw = Math.ceil((W + 320) / G), gh = Math.ceil((H + 320) / G);
      const f = (i, j) => mare([i * G - 160, j * G - 160]);
      const costa = M.contorni(gw, gh, f, 0, G, -160, -160).map((l) => M.morbida(l, 2, true));
      svg += costa.map((l) => `<path d="${M.via(l)}" fill="${p.acqua}" stroke="${p.acquaInk}" stroke-width="1.8"/>`).join('');
      [14, 30].forEach((s, i) => {
        M.contorni(gw, gh, f, s, G, -160, -160).forEach((l) => {
          svg += `<path d="${M.via(M.morbida(l, 2, true))}" fill="none" stroke="${p.acquaInk}" stroke-width="${0.9 - i * 0.25}" opacity="${0.5 - i * 0.18}"/>`;
        });
      });
      // Moli e barche lungo la riva piu' vicina alla citta'
      const riva = costa.flat().filter((q) => M.dist(q, [cx, cy]) < R * 1.25);
      for (let i = 0; i < riva.length; i += 14) {
        const q = riva[i];
        if (q[0] < 40 || q[1] < 40 || q[0] > W - 40 || q[1] > H - 40) continue;
        const l = r.range(26, 46);
        svg += `<path d="${M.via(M.rettangolo(q[0] + mx * l / 2, q[1] + my * l / 2, l, 7, angMare))}" fill="${p.stradaBordo}" stroke="${p.inchiostro}" stroke-width="0.9"/>`;
        if (r.chance(0.5)) svg += _barca(q[0] + mx * (l + 18) + r.range(-14, 14), q[1] + my * (l + 18) + r.range(-14, 14), angMare + Math.PI / 2 + r.range(-0.4, 0.4), p);
      }
    }
    // Ponti dove una via maestra passa il fiume
    if (fiume) {
      const tratti = [...viePrincipali, ...stradeFuori.flatMap((l) => l.slice(0, -1).map((v, i) => [v, l[i + 1]]))];
      const fatti = [];
      tratti.forEach(([a, b]) => {
        for (let i = 0; i < fiume.length - 1; i++) {
          const t = M.incrocio(a, b, fiume[i], fiume[i + 1]);
          if (!t || !_lontanoDaTutti(t, fatti, 26)) continue;
          fatti.push(t);
          const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), l = largFiume + 18;
          svg += `<path d="${M.via(M.rettangolo(t[0], t[1], l, 16, ang))}" fill="${p.stradaBordo}" stroke="${p.inchiostro}" stroke-width="1.1"/>` +
            `<path d="${M.via(M.rettangolo(t[0], t[1], l + 2, 10, ang))}" fill="${p.strada}"/>`;
        }
      });
    }

    /* ── Case: una fila continua lungo la strada, cortili e orti dietro ── */
    const case_ = [], casePregiate = [], alberi = [];
    if (cimitero) {
      const q = cimitero.poly, d = M.via(q), ci = cimitero, ang = angoloU((ci.u0 + ci.u1) / 2);
      svg += `<path d="${d}" fill="${p.erba2}" stroke="${p.inchiostro}" stroke-width="2.2" stroke-linejoin="round"/>`;
      // Lapidi in file, orientate come il cimitero; una cappella e qualche cipresso
      const interno = cella(ci.u0, ci.u1, ci.v0, ci.v1, ci.fuori ? [7, 7, 7, 7] : [5, 5, 5, 5]);
      const [kx, ky] = cimitero.centro, cap = M.rettangolo(kx, ky, 16, 22, ang);
      let lapidi = '';
      const vm = (ci.v0 + ci.v1) / 2, um = (ci.u0 + ci.u1) / 2;
      for (let uu = ci.u0; uu < ci.u1; uu += (ci.u1 - ci.u0) / Math.max(6, M.dist(P(ci.u0, vm), P(ci.u1, vm)) / 9)) {
        for (let vv = ci.v0; vv < ci.v1; vv += (ci.v1 - ci.v0) / Math.max(4, M.dist(P(um, ci.v0), P(um, ci.v1)) / 10)) {
          const [x, y] = P(uu, vv);
          if (!interno.length || !M.dentro([x, y], interno) || M.dist([x, y], [kx, ky]) < 20 || r.chance(0.12)) continue;
          lapidi += `<path d="${M.via(M.rettangolo(x, y, 3.2, 5.2, ang))}"/>`;
        }
      }
      svg += `<g fill="${p.carta}" stroke="${p.inchiostro}" stroke-width="0.7">${lapidi}</g>`;
      casePregiate.push({ poly: cap, colore: p.tettoNobile });
      for (let i = 0; i < 7; i++) { const v = [kx + r.range(-55, 55), ky + r.range(-45, 45)]; if (interno.length && M.dentro(v, interno) && M.dist(v, [kx, ky]) > 18) alberi.push([v[0], v[1], 0.55]); }
    }
    // Baraccopoli: casupole storte e fitte addossate alle mura, accanto a una o due porte
    const baracche = [], zoneBaracche = [];
    if (o.baracche) {
      const scelte = r.shuffle(porte.slice()).slice(0, taglia === 'piccola' ? 1 : 2);
      scelte.forEach(({ k }) => {
        const lato = r.chance(0.5) ? 1 : -1, u0 = k + lato * 0.06, u1 = k + lato * r.range(0.32, 0.46);
        const a = Math.min(u0, u1), b = Math.max(u0, u1), messe = [];
        for (let i = 0; i < 260 && messe.length < (taglia === 'grande' ? 70 : 50); i++) {
          const uu = r.range(a, b), vv = 1.035 + Math.pow(r.f(), 1.6) * 0.15, [x, y] = P(uu, vv);
          const l = r.range(6, 10), w = r.range(5, 8), ang = angoloU(uu) + r.range(-0.5, 0.5), poly = M.rettangolo(x, y, l, w, ang);
          if (poly.some((v) => inAcqua(v, 2) || M.dentro(v, muraPoly)) || M.distLinea([x, y], anelloMura) < 9 || nelCimitero([x, y], 8)) continue;
          if (stradeFuori.some((s) => M.distLinea([x, y], s) < 9) || x < 30 || y < 90 || x > W - 30 || y > H - 30) continue;
          if (messe.some((m) => M.dist(m, [x, y]) < 7.5)) continue;
          messe.push([x, y]);
          baracche.push({ poly, colore: r.pick([p.stradaBordo, p.tetti[r.int(0, p.tetti.length - 1)]]) });
        }
        if (messe.length > 8) zoneBaracche.push({ centro: M.centro(messe), punti: messe });
      });
    }
    let speciali = '', castelloSvg = '';
    const PROFILI = {
      poveri: { prof: [10, 14], larg: [7, 11], pieno: 0.97 }, normale: { prof: [13, 18], larg: [9, 15], pieno: 0.93 },
      nobile: { prof: [18, 26], larg: [17, 27], pieno: 0.62 }, magazzini: { prof: [20, 28], larg: [18, 30], pieno: 0.88 },
    };
    const fronte = (c, prof) => {
      const q = c.poly, n = q.length, lunghi = [];
      let tot = 0;
      for (let i = 0; i < n; i++) { const l = M.dist(q[i], q[(i + 1) % n]); lunghi.push(l); tot += l; }
      const puntoA = (s) => {
        let i = 0;
        while (s > lunghi[i] && i < n - 1) { s -= lunghi[i]; i++; }
        const a = q[i], b = q[(i + 1) % n], t = Math.min(1, s / (lunghi[i] || 1));
        return { pt: M.lerp(a, b, t), ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
      };
      const periferia = o.mura ? 1 : Math.max(0.35, 1 - Math.max(0, c.v1 - 0.75) * 2.4);
      const mie = [];
      for (let s = r.range(0, 4); s < tot;) {
        const larg = r.range(prof.larg[0], prof.larg[1]), alta = r.range(prof.prof[0], prof.prof[1]);
        const { pt, ang } = puntoA(s + larg / 2);
        let nx = -Math.sin(ang), ny = Math.cos(ang);
        if (!M.dentro([pt[0] + nx * 3, pt[1] + ny * 3], q)) { nx = -nx; ny = -ny; }
        const x = pt[0] + nx * (alta / 2 + 0.6), y = pt[1] + ny * (alta / 2 + 0.6), casa = M.rettangolo(x, y, larg - 0.8, alta, ang);
        const ok = r.chance(prof.pieno * periferia) && casa.every((v) => M.dentro(v, q)) && !casa.some((v) => inAcqua(v, 1)) &&
          mie.every((m) => M.dist(m.c, [x, y]) > (Math.min(m.l, larg) + Math.min(m.a, alta)) * 0.42);
        if (ok) { mie.push({ c: [x, y], l: larg, a: alta }); case_.push({ poly: casa, colore: r.pick(p.tetti) }); }
        s += larg + (r.chance(0.07) ? r.range(5, 9) : 0); // ogni tanto un vicolo tra le case
      }
      return mie;
    };
    const dentroCortile = (c, margine) => cella(c.u0, c.u1, c.v0, c.v1, [margine + 3.2, margine + 2.4, margine + 3.2, margine + 2.4]);

    // Piazza con fontana e banchi del mercato
    {
      const [px, py] = piazza.centro;
      speciali += `<path d="${M.via(piazzaPoly)}" fill="${p.pavimento}" stroke="${p.stradaBordo}" stroke-width="0.8"/>`;
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2, d = r.range(24, 46), x = px + Math.cos(a) * d * 1.2, y = py + Math.sin(a) * d * 0.94, b = M.rettangolo(x, y, 10, 7, a);
        if (r.chance(0.72) && b.every((v) => M.dentro(v, piazzaPoly))) speciali += `<path d="${M.via(b)}" fill="${r.pick(p.tetti)}" stroke="${p.inchiostro}" stroke-width="0.7"/>`;
      }
      speciali += `<circle cx="${M.n1(px)}" cy="${M.n1(py)}" r="11" fill="${p.acqua}" stroke="${p.inchiostro}" stroke-width="1.4"/><circle cx="${M.n1(px)}" cy="${M.n1(py)}" r="3.2" fill="${p.carta}" stroke="${p.inchiostro}" stroke-width="1"/>`;
    }

    isolati.forEach((c) => {
      const q = c.poly;
      if (c.tipo === 'tempio') {
        speciali += `<path d="${M.via(q)}" fill="${p.pavimento}" stroke="${p.stradaBordo}" stroke-width="0.8"/>`;
        const [tx, ty] = c.centro;
        const dirV = P((c.u0 + c.u1) / 2, c.v1), dirV0 = P((c.u0 + c.u1) / 2, c.v0), ang = Math.atan2(dirV[1] - dirV0[1], dirV[0] - dirV0[0]);
        let s = Math.sqrt(c.area) * 0.95;
        while (s > 24 && !M.rettangolo(tx, ty, s, s * 0.8, ang).every((v) => M.dentro(v, q))) s *= 0.88;
        const c0 = Math.cos(ang), s0 = Math.sin(ang);
        // La navata punta verso la piazza: l'abside sta dalla parte opposta
        casePregiate.push({ poly: M.rettangolo(tx, ty, s, s * 0.32, ang), colore: p.tettoNobile });
        casePregiate.push({ poly: M.rettangolo(tx + c0 * s * 0.16, ty + s0 * s * 0.16, s * 0.26, s * 0.74, ang), colore: p.tettoNobile });
        speciali += `<circle cx="${M.n1(tx + c0 * s * 0.5)}" cy="${M.n1(ty + s0 * s * 0.5)}" r="${M.n1(s * 0.16)}" fill="${p.tettoNobile}" stroke="${p.inchiostro}" stroke-width="1"/>`;
        for (let i = 0; i < 10; i++) {
          const v = [tx + r.range(-1, 1) * s * 0.7, ty + r.range(-1, 1) * s * 0.7];
          if (M.dentro(v, q) && Math.abs((v[0] - tx) * -s0 + (v[1] - ty) * c0) > s * 0.42) alberi.push([v[0], v[1], 0.8]);
        }
      } else if (c.tipo === 'cimitero') {
        // disegnato a parte, con lapidi e cappella
      } else if (c.tipo === 'parco') {
        speciali += `<path d="${M.via(q)}" fill="${p.erba2}" stroke="${p.stradaBordo}" stroke-width="0.8"/>`;
        for (let i = 0; i < c.area / 240; i++) { const v = [c.centro[0] + r.range(-60, 60), c.centro[1] + r.range(-60, 60)]; if (M.dentro(v, q) && !inAcqua(v, 6)) alberi.push([v[0], v[1], r.range(0.85, 1.3)]); }
      } else if (c.tipo === 'castello') {
        const rec = dentroCortile(c, 4);
        if (rec.length < 3) return;
        const d = M.via(rec);
        castelloSvg += `<path d="${d}" fill="${p.pavimento}"/><path d="${d}" fill="none" stroke="${p.inchiostro}" stroke-width="5" stroke-linejoin="round" opacity="0.88"/>`;
        const [kx, ky] = M.centro(rec);
        let s = Math.sqrt(Math.abs(M.area(rec))) * 0.5;
        const ang = angoloU((c.u0 + c.u1) / 2);
        while (s > 18 && !M.rettangolo(kx, ky, s, s, ang).every((v) => M.dentro(v, rec))) s *= 0.88;
        castelloSvg += M.edifici([{ poly: M.rettangolo(kx, ky, s, s, ang), colore: p.tettoNobile }], p, 3.5);
        M.rettangolo(kx, ky, s, s, ang).forEach(([x, y]) => { castelloSvg += `<path d="${M.via(M.rettangolo(x, y, s * 0.24 + 4, s * 0.24 + 4, ang))}" fill="${p.tettoNobile}"/>`; });
        // Bastioni quadrati agli angoli della cinta del castello
        [0, 0.25, 0.5, 0.75].map((f) => Math.floor(f * rec.length)).forEach((k) => { const [x, y] = rec[k], q = rec[(k + 1) % rec.length]; castelloSvg += `<path d="${M.via(M.rettangolo(x, y, 12, 12, Math.atan2(q[1] - y, q[0] - x)))}" fill="${p.inchiostro}"/>`; });
      } else {
        const prof = PROFILI[c.tipo] || PROFILI.normale;
        fronte(c, prof);
        // Dietro le case: cortili, qualche orto e gli alberi dei giardini
        const cortile = dentroCortile(c, prof.prof[1] + 3);
        if (cortile.length > 3 && Math.abs(M.area(cortile)) > 500) {
          if (c.tipo !== 'magazzini' && r.chance(c.tipo === 'nobile' ? 0.7 : 0.45)) {
            const lato = Math.sqrt(Math.abs(M.area(cortile))) * 0.42, [ox, oy] = M.centro(cortile), orto = M.rettangolo(ox, oy, lato, lato * 0.7, angoloU((c.u0 + c.u1) / 2));
            if (orto.every((v) => M.dentro(v, cortile)) && !orto.some((v) => inAcqua(v, 2))) svg += M.campo(orto, r.pick(p.campi), angoloU(c.u0), 4.5, p);
          }
          const nAlb = c.tipo === 'nobile' ? 6 : c.tipo === 'poveri' ? 1 : 3;
          for (let i = 0; i < nAlb; i++) {
            const v = [c.centro[0] + r.range(-40, 40), c.centro[1] + r.range(-40, 40)];
            if (M.dentro(v, cortile) && !inAcqua(v, 5) && r.chance(0.7)) alberi.push([v[0], v[1], c.tipo === 'nobile' ? 0.85 : 0.65]);
          }
        }
      }
    });

    /* ── Sobborghi fuori dalle porte e case sparse ── */
    const fuori = [], suolo = [];
    const libera = (x, y, s) => suolo.every(([a, b, c]) => Math.hypot(a - x, b - y) > c + s) && !nelCimitero([x, y], s + 6) && !zoneBaracche.some((z) => z.punti.some((m) => Math.hypot(m[0] - x, m[1] - y) < s + 8));
    stradeFuori.forEach((l) => {
      let percorsa = 0;
      const limite = r.range(170, 330) * (R / 305);
      for (let i = 1; i < l.length - 1 && percorsa < limite; i++) {
        percorsa += M.dist(l[i], l[i - 1]);
        const ang = Math.atan2(l[i + 1][1] - l[i][1], l[i + 1][0] - l[i][0]), dens = 1 - percorsa / limite;
        for (const lato of [1, -1]) for (let fila = 0; fila < 2; fila++) {
          if (!r.chance((fila === 0 ? 0.9 : 0.4) * (0.35 + dens))) continue;
          const lung = r.range(14, 23), larg = r.range(10, 14), off = 11 + larg / 2 + fila * r.range(17, 22), lungo = r.range(-5, 5);
          const x = l[i][0] - Math.sin(ang) * off * lato + Math.cos(ang) * lungo, y = l[i][1] + Math.cos(ang) * off * lato + Math.sin(ang) * lungo;
          if (inAcqua([x, y], 9) || M.dentro([x, y], muraPoly) || M.distLinea([x, y], anelloMura) < 18 || !libera(x, y, lung * 0.5)) continue;
          if (stradeFuori.some((s) => s !== l && M.distLinea([x, y], s) < 11)) continue;
          suolo.push([x, y, lung * 0.55]);
          fuori.push({ poly: M.rettangolo(x, y, lung, larg, ang + r.range(-0.08, 0.08)), colore: r.pick(p.tetti) });
        }
      }
    });
    for (let i = 0; i < nInterne * 0.22; i++) {
      const u = r.range(0, N0), v = r.range(1.3, 2.6), [x, y] = P(u, v);
      if (x < 40 || y < 100 || x > W - 40 || y > H - 40 || inAcqua([x, y], 12) || !libera(x, y, 16) || bosco([x, y]) > 0.55) continue;
      suolo.push([x, y, 12]);
      fuori.push({ poly: M.rettangolo(x, y, r.range(14, 22), r.range(10, 13), angoloU(u) + r.range(-0.2, 0.2)), colore: r.pick(p.tetti) });
    }
    svg += speciali + M.edifici(case_.concat(fuori), p) + (baracche.length ? M.edifici(baracche, p, 0.6) : '') + M.edifici(casePregiate, p, 3.5) + castelloSvg;

    // Boschi oltre i campi
    for (let y = 30; y < H - 20; y += 21) for (let x = 30; x < W - 20; x += 21) {
      const q = [x + r.range(-9, 9), y + r.range(-9, 9)], d = dalCentro(q);
      const fitto = bosco(q) > 0.56 || (d > R * 2.6 && bosco(q) > 0.47);
      if (!(fitto || r.chance(0.012)) || inAcqua(q, 8) || (fitto && r.chance(0.12))) continue;
      if (M.dentro(q, muraPoly) || M.distLinea(q, anelloMura) < 22 || nelCimitero(q, 10) || zoneBaracche.some((z) => z.punti.some((m) => M.dist(m, q) < 14))) continue;
      if (stradeFuori.some((l) => M.distLinea(q, l) < 15) || fuori.some((c) => M.dist(q, M.centro(c.poly)) < 18)) continue;
      alberi.push([q[0], q[1], r.range(0.9, 1.5)]);
    }
    alberi.sort((a, b) => a[1] - b[1]);
    svg += M.alberi(alberi, p, r);

    /* ── Mura curve, bastioni quadrati a passo regolare, porte sulle vie maestre ── */
    if (o.mura) {
      const d = M.via(muraPoly);
      // Mura piene, senza doppio contorno; bastioni quadrati orientati lungo il muro
      svg += `<path d="${d}" fill="none" stroke="${p.inchiostro}" stroke-width="6" stroke-linejoin="round" opacity="0.88"/>`;
      const bastione = (x, y, ang, lato) => `<path d="${M.via(M.rettangolo(x, y, lato, lato, ang))}" fill="${p.inchiostro}"/>`;
      let passo = 0;
      for (let i = 0; i < muraPoly.length; i++) {
        passo += M.dist(muraPoly[i], muraPoly[(i + 1) % muraPoly.length]);
        if (passo < 64) continue;
        const v = muraPoly[i];
        if (porte.some(({ g }) => M.dist(g, v) < 30) || inAcqua(v, 2)) continue;
        passo = 0;
        const v2 = muraPoly[(i + 1) % muraPoly.length];
        svg += bastione(v[0], v[1], Math.atan2(v2[1] - v[1], v2[0] - v[0]), 13);
      }
      porte.forEach(({ k, g }) => {
        const a = P(k, 1.06), ang = Math.atan2(a[1] - g[1], a[0] - g[0]);
        // Porta: due torri tonde ai lati del varco
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        [1, -1].forEach((s) => { const x = g[0] + nx * 13 * s, y = g[1] + ny * 13 * s; svg += bastione(x, y, ang, 15); });
        svg += `<path d="${M.via(M.rettangolo(g[0], g[1], 16, 16, ang))}" fill="${p.strada}" stroke="${p.stradaBordo}" stroke-width="0.8"/>`;
      });
    }

    /* ── Etichette ── */
    let testi = '';
    const usate = [], pin = [];
    const metti = (x, y, t, st, nota, sottotipo) => {
      testi += M.etichetta(x, y, t, p, { aloneW: 4.5, ...st });
      const mezza = t.length * (st.size || 15) * 0.29;
      for (let u = -mezza; u < mezza; u += 22) usate.push([x + u, y - 5]);
      usate.push([x + mezza, y - 5]);
      pin.push({ x, y, label: t, note: nota || '', sottotipo: sottotipo || '' });
    };
    const SANTI = ['Sant\'Elmo', 'San Tarcisio', 'Santa Ilaria', 'San Bruno', 'Santa Oriana', 'San Leandro'];
    const tempioSotto = tempio && tempio.centro[1] > piazza.centro[1];
    metti(piazza.centro[0], piazza.centro[1] + (tempioSotto ? -26 : 36), 'Piazza del Mercato', { size: 17, peso: 600 }, 'Il cuore della città: mercato e fontana. Tutte le vie maestre partono da qui.');
    Object.assign(pin[pin.length - 1], { x: piazza.centro[0], y: piazza.centro[1] });
    if (tempio) metti(tempio.centro[0], tempio.centro[1] + (tempioSotto ? 40 : -32), 'Tempio di ' + (() => { const s = r.pick(SANTI); return o.popolo && o.popolo !== 'italiano' ? M.nomeLuogo(M.rng('dio:' + o.seme), o.popolo) : s; })(), { size: 16, peso: 600, corsivo: true }, 'Il tempio principale, accanto alla piazza.');
    if (tempio) Object.assign(pin[pin.length - 1], { x: tempio.centro[0], y: tempio.centro[1], tipoLuogo: 'Tempio', genera: { tipo: 'dungeon', opzioni: { tema: 'tempio' } } });
    if (castello) metti(castello.centro[0], castello.centro[1] + 6, 'Castello', { size: 18, font: p.fontTitolo, peso: 600 }, 'Sede del potere cittadino, con cinta muraria propria.');
    if (castello) Object.assign(pin[pin.length - 1], { tipoLuogo: 'Castello', y: castello.centro[1] - 12, genera: { tipo: 'dungeon', opzioni: { tema: 'fortezza' } } });
    if (o.mura) porte.forEach(({ g }) => usate.push(g));
    if (cimitero) {
      const [x, y] = cimitero.centro, ys = cimitero.poly.map((q) => q[1]), giu = Math.max(...ys) + 18, su = Math.min(...ys) - 9;
      metti(x, giu < H - 40 ? giu : su, 'Cimitero', { size: 15, corsivo: true, peso: 600 }, 'Fuori dalle mura, come vuole l\'usanza: lapidi, una cappella, i cipressi. Di notte qualcuno giura di vedere lanterne.');
      Object.assign(pin[pin.length - 1], { x, y, tipoLuogo: 'Cimitero', genera: { tipo: 'dungeon', opzioni: { tema: 'cripta' } } });
    }
    zoneBaracche.forEach((z, i) => {
      const [x, y] = z.centro, nomeB = ['Le Baracche', 'Borgo Fango', 'Fuoriporta'][i % 3];
      const ex = Math.max(70, Math.min(W - 70, x)), ey = Math.max(110, Math.min(H - 40, y + 4));
      if (!usate.some((u) => Math.hypot(u[0] - ex, u[1] - ey) < 34)) metti(ex, ey, nomeB, { size: 14, corsivo: true, peso: 600 }, 'Casupole di legno e fango addossate alle mura: chi non può permettersi la città vive qui. Poche guardie, molte voci.');
      else pin.push({ x, y, label: nomeB, note: 'Casupole di legno e fango addossate alle mura: chi non può permettersi la città vive qui. Poche guardie, molte voci.', sottotipo: '' });
    });
    // Nomi dei rioni: lungo l'anello di mezzo del loro spicchio
    const RIONI = ['Conciatori', 'Tintori', 'Fabbri', 'Pescatori', 'Vasai', 'Tessitori', 'Mercanti', 'Falegnami', 'Sellai', 'Corvi', 'Cordai', 'Speziali', 'Candelai', 'Bottai', 'Vecchia Porta', 'Pozzo Nero', 'Tre Ponti', 'Colle Alto'];
    const nomiRioni = r.shuffle(RIONI);
    const size = { piccola: 19, media: 23, grande: 25 }[taglia], sp = 6;
    semiRioni.forEach((q, k) => {
      if (q.celle.length < 2) return;
      const eti = (q.carattere === 'nobile' ? 'Alti ' : '') + nomiRioni[k % nomiRioni.length];
      const nota = { nobile: 'Palazzi e giardini delle famiglie ricche.', poveri: 'Case piccole e fitte, vicoli stretti.' }[q.carattere] || 'Quartiere di botteghe e abitazioni.';
      const lungo = eti.length * (size * 0.6 + sp) + size;
      let messa = null;
      // Si prova sugli anelli dal piu' esterno: la scritta segue la curva della strada
      for (const vv of [0.86, 0.62, 0.5, 0.74, 0.38]) {
        const centro = P(k + 0.5, vv), arco = M.dist(P(k, vv), P(k + 1, vv));
        if (arco < lungo * 0.9) continue;
        const du = lungo / arco / 2;
        const curva = [];
        for (let t = -1; t <= 1.001; t += 0.125) curva.push(P(k + 0.5 + t * du, vv));
        // Sui fianchi della citta' l'anello e' quasi verticale: li' la scritta non si leggerebbe
        const inclinata = Math.abs(Math.atan2(curva[curva.length - 1][1] - curva[0][1], curva[curva.length - 1][0] - curva[0][0]));
        if (Math.min(inclinata, Math.PI - inclinata) > 0.6) continue;
        if (curva.some(([x, y]) => x < 60 || x > W - 60 || y < 110 || y > H - 40 || (x < 340 && y > H - 110) || (x > W - 190 && y > H - 190) || usate.some((u) => Math.hypot(u[0] - x, u[1] - y) < 40) || inAcqua([x, y], 4))) continue;
        testi += M.testoCurvo(curva, p.stile ? eti : eti.toUpperCase(), p, { size, spazio: sp, colore: p.inchiostro, alone: p.carta, aloneW: 4.5, peso: 500, font: p.fontTitolo || M.FONT_TESTO });
        curva.forEach((u) => usate.push(u));
        messa = centro;
        break;
      }
      if (!messa) {
        // Nessun tratto adatto: il nome si scrive dritto in mezzo al rione, se c'e' posto
        for (const vv of [0.62, 0.5, 0.75]) {
          const [x, y] = P(k + 0.5, vv), mezza = eti.length * size * 0.33;
          if (x - mezza < 60 || x + mezza > W - 60 || y < 110 || y > H - 50 || inAcqua([x, y], 4)) continue;
          const tratto = [-1, -0.5, 0, 0.5, 1].map((f) => [x + f * mezza, y - 6]);
          if (tratto.some((u) => usate.some((w) => Math.hypot(w[0] - u[0], w[1] - u[1]) < 40))) continue;
          testi += M.etichetta(x, y, eti, p, { size: size * 0.85, font: p.fontTitolo, spazio: 4, aloneW: 4.5 });
          tratto.forEach((u) => usate.push(u));
          messa = [x, y];
          break;
        }
      }
      const c = messa || q.centro;
      pin.push({ x: c[0], y: c[1] - 22, label: 'Rione ' + eti, note: nota, sottotipo: '', genera: { tipo: 'abitazione', opzioni: { edificio: q.carattere === 'nobile' ? 'casa' : 'bottega' } } });
    });
    if (o.mura) {
      const ALTRE = r.shuffle(['Porta del Sale', 'Porta Vecchia', 'Porta dei Mercanti', 'Porta Reale', 'Porta delle Vigne']);
      const giaUsate = new Set();
      porte.forEach(({ g: v }) => {
        const dx = v[0] - cx, dy = v[1] - cy, l = Math.hypot(dx, dy) || 1;
        let lab = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'Porta Est' : 'Porta Ovest') : (dy > 0 ? 'Porta Sud' : 'Porta Nord');
        if (giaUsate.has(lab)) lab = ALTRE.pop();
        giaUsate.add(lab);
        const x = Math.max(78, Math.min(W - 78, v[0] + dx / l * 52)), y = Math.max(46, Math.min(H - 42, v[1] + dy / l * 38 + 4));
        if (!(x < 340 && y > H - 110)) testi += M.etichetta(x, y, lab, p, { size: 15, corsivo: true, peso: 600 });
        pin.push({ x: v[0], y: v[1], label: lab, note: 'Porta nelle mura, con la strada che esce verso la campagna.', sottotipo: '', genera: { tipo: 'abitazione', opzioni: { edificio: 'torre' } } });
      });
    }
    if (fiume) {
      const adatto = (q) => dalCentro(q) > R * 1.25 && q[0] > 90 && q[0] < W - 90 && q[1] > 120 && q[1] < H - 70 && mare(q) < -30;
      let fuoriCitta = [], corrente = [];
      fiume.forEach((q) => { if (adatto(q)) { corrente.push(q); if (corrente.length > fuoriCitta.length) fuoriCitta = corrente; } else corrente = []; });
      if (fuoriCitta.length > 30) {
        const inizio = Math.floor((fuoriCitta.length - Math.min(34, fuoriCitta.length)) / 2), tratto = fuoriCitta.slice(inizio, inizio + 34);
        testi += M.testoCurvo(tratto, 'Fiume ' + M.nomeLuogo(r, o.popolo), p, { size: 17, spazio: 2, corsivo: true, colore: p.acquaInk, alone: p.carta, aloneW: 2.5, peso: 500 });
      }
    }
    if (o.costa) {
      const sx = Math.max(150, Math.min(W - 150, 700 + mx * 500)), sy = Math.max(150, Math.min(H - 110, 500 + my * 370));
      if (mare([sx, sy]) > 30) testi += M.etichetta(sx, sy, 'Mare di ' + M.nomeLuogo(r, o.popolo), p, { size: 21, corsivo: true, colore: p.acquaInk, spazio: 3, alone: p.acqua, aloneW: 3 });
    }

    // Reticolo leggero, come sulle piante catastali antiche (un quadrato = 200 metri)
    if (o.griglia !== false) {
      let reticolo = '';
      for (let x = 133; x < W; x += 133.3) reticolo += `M${M.n1(x)} 0V${H}`;
      for (let y = 100; y < H; y += 133.3) reticolo += `M0 ${M.n1(y)}H${W}`;
      svg += `<path d="${reticolo}" fill="none" stroke="${p.inchiostro}" stroke-width="0.55" opacity="0.28"/>`;
    }
    return {
      nome, pin, W, H,
      larghezzaKm: W * 1.5 / 1000, // 1 pixel = 1,5 metri
      svg: M.componi({ W, H, p, o, nome, sotto: { piccola: 'Cittadina', media: 'Città', grande: 'Grande città' }[taglia], corpo: svg, testi, rosa: true, scala: [66.7, { valore: 100, nome: 'metri' }, 3] }),
    };
  };

  return { citta };
})();

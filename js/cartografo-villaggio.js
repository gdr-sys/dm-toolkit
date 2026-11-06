/* ============================================================
   CARTOGRAFO-VILLAGGIO.JS — Generatore di villaggi visti dall'alto,
   come una foto aerea dipinta: luci e ombre del terreno, foreste
   a chiome stratificate con ombre lunghe, campi arati dagli angoli
   arrotondati, tetti a scandole, piazza e stradine.
   ============================================================ */

const CartoVillaggio = (() => {
  const M = CartoMotore;
  const n1 = M.n1;

  const TONI = {
    naturale: {
      prato: '#7fa877', pratoScuro: '#2f5a4a', luce: '#e9f7cf', chioma: ['#3f6f62', '#35635a', '#4a7d6d'], chiomaL: '#5e9682', bosco: '#264d47', boscoProfondo: '#163530', ink: '#10211e',
      campo: ['#8f6f66', '#9c7a6e', '#85665f', '#a58478'], solco: '#4d3a36', strada: '#d2c9ae', stradaBordo: '#8c8a70', piazza: '#d9d0b6', tetti: ['#a8694e', '#9a5f47', '#b57658', '#8f5a48'], ardesia: ['#6d8396', '#607689'], acqua: '#8db8c9', acquaInk: '#3f6f80', testo: '#f6f2df', testoAlone: '#10211e',
    },
    pergamena: {
      prato: '#c3bf88', pratoScuro: '#7e7a48', luce: '#f6f0cf', chioma: ['#7d8a52', '#6d7b47', '#8c9a5e'], chiomaL: '#a4b072', bosco: '#5f6c3e', boscoProfondo: '#465230', ink: '#2c2619',
      campo: ['#c9a874', '#bb9a68', '#d4b57f', '#b08f60'], solco: '#6e5534', strada: '#efe6c9', stradaBordo: '#9a8a62', piazza: '#efe6c9', tetti: ['#ab6a45', '#9c5f3e', '#ba7a52', '#8f5a3c'], ardesia: ['#737680', '#676a75'], acqua: '#a4c4bf', acquaInk: '#4f7c7a', testo: '#2c2619', testoAlone: '#f3ead0',
    },
    autunno: {
      prato: '#a8a266', pratoScuro: '#5a5a30', luce: '#f6e7b6', chioma: ['#b5683a', '#c28a3c', '#8f4f33'], chiomaL: '#dcae58', bosco: '#6e4326', boscoProfondo: '#46301c', ink: '#22170e',
      campo: ['#a98a55', '#937748', '#bd9c62', '#7f6840'], solco: '#4a3820', strada: '#e0d5b2', stradaBordo: '#8a7c58', piazza: '#e0d5b2', tetti: ['#9c5a3e', '#8c5238', '#a8664a', '#7e4a33'], ardesia: ['#646f78', '#58626b'], acqua: '#8fb0b5', acquaInk: '#456c74', testo: '#fbf1d8', testoAlone: '#22170e',
    },
    inverno: {
      prato: '#e4ebee', pratoScuro: '#9db0bd', luce: '#ffffff', chioma: ['#4f6b6a', '#5a7675', '#44605f'], chiomaL: '#dfeaec', bosco: '#3e5655', boscoProfondo: '#2c403f', ink: '#1a2729',
      campo: ['#d2dade', '#c8d1d6', '#dae1e4', '#bfc9ce'], solco: '#7f909a', strada: '#b8b6a8', stradaBordo: '#7f7f76', piazza: '#c9c7ba', tetti: ['#e8ecee', '#dfe5e8', '#f0f3f4', '#d6dde0'], ardesia: ['#c6d0d6', '#bcc7ce'], acqua: '#9cc0d2', acquaInk: '#4f7a90', testo: '#1a2729', testoAlone: '#f4f7f8',
    },
    notte: {
      prato: '#2e4a4b', pratoScuro: '#122729', luce: '#7fa6a6', chioma: ['#1f3f40', '#25494a', '#183435'], chiomaL: '#3d6a69', bosco: '#112a2c', boscoProfondo: '#0a1c1e', ink: '#040b0c',
      campo: ['#40464a', '#4a4f50', '#383e42', '#535757'], solco: '#1c2022', strada: '#6f7670', stradaBordo: '#2c3230', piazza: '#7a817a', tetti: ['#6e5048', '#604640', '#7a5a50', '#553f3a'], ardesia: ['#4f6073', '#465668'], acqua: '#203f55', acquaInk: '#6d9dbd', testo: '#f0ead2', testoAlone: '#040b0c',
    },
  };

  // Spezzata curva da un punto verso una direzione, fino al bordo della mappa
  const _via = (rn, da, ang, W, H, passo = 30, giro = 0.5, max = 70) => {
    const l = [da];
    let q = da, a = ang;
    for (let i = 0; i < max; i++) {
      a += (rn(q[0] * 0.0048 + 13, q[1] * 0.0048 + 77) - 0.5) * giro;
      q = [q[0] + Math.cos(a) * passo, q[1] + Math.sin(a) * passo];
      l.push(q);
      if (q[0] < -60 || q[1] < -60 || q[0] > W + 60 || q[1] > H + 60) break;
    }
    return M.morbida(l, 2);
  };
  const _lung = (l) => { let s = 0; for (let i = 1; i < l.length; i++) s += M.dist(l[i - 1], l[i]); return s; };
  const _punto = (l, d) => {
    let s = 0;
    for (let i = 1; i < l.length; i++) {
      const q = M.dist(l[i - 1], l[i]);
      if (s + q >= d) { const p = M.lerp(l[i - 1], l[i], (d - s) / (q || 1)); return { p, ang: Math.atan2(l[i][1] - l[i - 1][1], l[i][0] - l[i - 1][0]) }; }
      s += q;
    }
    return null;
  };

  // Tetto rettangolare a due falde, con le scandole: quello che da' il dettaglio da vicino
  const _tetti = (lista, t) => {
    const perColore = new Map();
    let ombre = '', scure = '', scandole = '', colmi = '';
    lista.forEach((e) => {
      const { x, y, l, h, ang, colore } = e, poly = M.rettangolo(x, y, l, h, ang);
      if (!perColore.has(colore)) perColore.set(colore, '');
      perColore.set(colore, perColore.get(colore) + M.via(poly));
      const sh = Math.min(l, h) * 0.22 + 2.5;
      ombre += M.via(poly.map(([u, v]) => [u + sh, v + sh * 1.15]));
      const c = Math.cos(ang), s = Math.sin(ang);
      let nx = -s, ny = c;
      const a = [x - c * l / 2, y - s * l / 2], b = [x + c * l / 2, y + s * l / 2];
      const falda1 = [poly[0], poly[1], b, a], falda2 = [a, b, poly[2], poly[3]];
      // La falda piu' scura e' quella che guarda a sud-est
      scure += M.via(nx + ny * 1.1 > 0 ? falda2 : falda1);
      scandole += M.tratteggio(falda1, ang + Math.PI / 2, 2.5, 0.6) + M.tratteggio(falda2, ang + Math.PI / 2, 2.5, 0.6);
      colmi += `M${n1(a[0])} ${n1(a[1])}L${n1(b[0])} ${n1(b[1])}`;
    });
    let out = `<path d="${ombre}" fill="${t.ink}" opacity="0.42" fill-rule="nonzero"/>`;
    perColore.forEach((d, col) => { out += `<path d="${d}" fill="${col}" stroke="${t.ink}" stroke-width="1.05" stroke-linejoin="round"/>`; });
    return out + `<path d="${scure}" fill="${t.ink}" opacity="0.2"/><path d="${scandole}" fill="none" stroke="${t.ink}" stroke-width="0.55" opacity="0.5"/><path d="${colmi}" fill="none" stroke="${t.ink}" stroke-width="1.15"/>`;
  };

  // Chioma a lobi: tre strati (ombra, massa, luce) per il volume
  const _lobi = (x, y, q, r, lati) => {
    let d = '';
    const inizio = r.range(0, 6.28), g = q * 0.42;
    let px = 0, py = 0;
    for (let i = 0; i <= lati; i++) {
      const a = inizio + i / lati * Math.PI * 2, m = q * r.range(0.86, 1.08), vx = x + Math.cos(a) * m, vy = y + Math.sin(a) * m;
      if (i === 0) d = `M${n1(vx)} ${n1(vy)}`;
      else d += `A${n1(g)} ${n1(g)} 0 0 1 ${n1(i === lati ? parseFloat(d.slice(1)) : vx)} ${n1(i === lati ? parseFloat(d.split(' ')[1]) : vy)}`;
      px = vx; py = vy;
    }
    return d + 'Z';
  };
  const _chiome = (lista, t, r) => {
    let ombre = '', strati = t.chioma.map(() => ''), luci = '', segni = '';
    lista.forEach(([x, y, q]) => {
      ombre += `M${n1(x + q * 0.55 - q)} ${n1(y + q * 0.7)}a${n1(q)} ${n1(q)} 0 1 0 ${n1(q * 2)} 0a${n1(q)} ${n1(q)} 0 1 0 ${n1(-q * 2)} 0Z`;
      const k = Math.floor(r.f() * t.chioma.length);
      strati[k] += _lobi(x, y, q, r, 7);
      luci += _lobi(x - q * 0.2, y - q * 0.24, q * 0.58, r, 5);
      const a = r.range(0.4, 1.4);
      segni += `M${n1(x + Math.cos(a) * q * 0.5)} ${n1(y + Math.sin(a) * q * 0.5)}a${n1(q * 0.5)} ${n1(q * 0.5)} 0 0 1 ${n1(-q * 0.42)} ${n1(q * 0.18)}`;
    });
    let out = `<path d="${ombre}" fill="${t.ink}" opacity="0.38"/>`;
    strati.forEach((d, i) => { if (d) out += `<path d="${d}" fill="${t.chioma[i]}" stroke="${t.ink}" stroke-width="1.05"/>`; });
    return out + `<path d="${luci}" fill="${t.chiomaL}" opacity="0.28"/><path d="${segni}" fill="none" stroke="${t.ink}" stroke-width="0.8" opacity="0.45"/>`;
  };

  const villaggio = (o) => {
    const r = M.rng('villaggio:' + o.seme), rn = M.rumore(r), rf = M.rumore(r);
    const t = TONI[o.palette] || TONI.naturale;
    const W = 1600, H = 900;
    const nome = o.nome || M.nomeLuogo(r);
    const nCase = { piccolo: 28, medio: 50, grande: 80 }[o.taglia] || 50;
    const raggioB = { piccolo: 200, medio: 270, grande: 340 }[o.taglia] || 270;
    const pianta = o.pianta && o.pianta !== 'caso' ? o.pianta : (r.chance(0.5) ? 'piazza' : 'lungo');
    const cx = W / 2 + r.range(-90, 90), cy = H / 2 + r.range(-40, 50), centro = [cx, cy];

    /* Strade: l'ossatura del villaggio */
    const principali = [], vicoli = [], sentieri = [];
    let raggioPiazza = 0;
    if (pianta === 'piazza') {
      raggioPiazza = { piccolo: 38, medio: 48, grande: 56 }[o.taglia] || 48;
      const n = r.int(3, 5), a0 = r.range(0, 6.28);
      for (let i = 0; i < n; i++) principali.push(_via(rn, [cx, cy], a0 + i * 6.283 / n + r.range(-0.3, 0.3), W, H));
    } else {
      const a = r.range(-0.25, 0.25);
      principali.push(_via(rn, [cx, cy], a, W, H, 30, 0.34), _via(rn, [cx, cy], a + Math.PI, W, H, 30, 0.34));
    }
    /* Fiume opzionale, lontano dal centro */
    const fiume = o.fiume ? (() => {
      const a = r.range(0, 3.14), off = raggioB * r.range(0.9, 1.25) * (r.chance(0.5) ? 1 : -1), c = Math.cos(a), s = Math.sin(a), pts = [];
      for (let u = -1300; u <= 1300; u += 40) pts.push([cx + c * u - s * (off + (rn(u * 0.0022 + 41, 5) - 0.5) * 300), cy + s * u + c * (off + (rn(u * 0.0022 + 41, 5) - 0.5) * 300)]);
      return M.morbida(pts, 2);
    })() : null;
    const largF = 34;
    const distFiume = fiume ? M.campoDistanze([fiume], W, H) : null;
    const inFiume = (q, m) => !!fiume && distFiume(q[0], q[1]) < largF / 2 + m;

    // Traverse che partono dalle strade principali
    const nTrav = { piccolo: 5, medio: 10, grande: 16 }[o.taglia] || 10;
    for (let i = 0; i < nTrav; i++) {
      const base = principali[i % principali.length], d = (pianta === 'lungo' ? 60 : raggioPiazza + 34) + (Math.floor(i / principali.length) + 0.3) * r.range(55, 100);
      const q = _punto(base, d);
      if (!q) continue;
      const lato = (i % 2 ? 1 : -1) * (pianta === 'lungo' ? (i % 4 < 2 ? 1 : -1) : 1);
      let l = M.morbida(_via(rn, q.p, q.ang + lato * Math.PI / 2 + r.range(-0.18, 0.18), W, H, 26, 0.3, Math.floor(r.range(5, 11))), 1);
      // Una stradina si ferma prima del fiume: i ponti stanno solo sulle vie principali
      const stop = l.findIndex((v) => inFiume(v, 16));
      if (stop === 0) continue;
      if (stop > 0) l = l.slice(0, stop);
      if (l.length > 3 && M.dist(l[l.length - 1], centro) < raggioB * 1.7) vicoli.push(l);
    }
    const tutte = principali.concat(vicoli);
    // Di solito basta la mappa delle distanze; con una strada da ignorare si misura solo vicino al punto
    const distStrade = M.campoDistanze(tutte, W, H);
    const lontanoStrade = (q, d, esclusa) => {
      if (!esclusa) return distStrade(q[0], q[1]) > d;
      if (distStrade(q[0], q[1]) > d) return true;
      return tutte.every((l) => {
        if (l === esclusa) return true;
        for (let i = 0; i < l.length - 3; i += 3) if (M.distSeg(q, l[i], l[i + 3]) <= d) return false;
        return true;
      });
    };

    /* Foresta: cresce lontano dal centro e lascia libere le strade */
    const fForesta = (x, y) => {
      // Distanza "schiacciata": il foglio e' largo, il bosco deve restare ai margini anche in alto e in basso
      const d = Math.hypot((x - cx) / 1.45, y - cy) / raggioB;
      return rf(x * 0.0034 + 9, y * 0.0034 + 4, 4) + Math.min(0.3, Math.max(-0.28, (d - 1.5) * 0.3));
    };
    const SOGLIA = 0.6;

    /* Case */
    const edifici = [], pieni = [];
    const libero = (x, y, s) => pieni.every(([a, b, c]) => Math.hypot(a - x, b - y) > c + s);
    const occupa = (x, y, s) => pieni.push([x, y, s]);
    if (raggioPiazza) occupa(cx, cy, raggioPiazza + 6);
    const speciali = [];
    const posaSpeciale = (nomeE, lung, larg, colore, nota, partiDa) => {
      for (let g = 0; g < 80; g++) {
        const base = tutte[Math.floor(r.f() * tutte.length)], q = _punto(base, r.range(partiDa, partiDa + 120));
        if (!q) continue;
        const lato = r.chance(0.5) ? 1 : -1, off = larg / 2 + 15, x = q.p[0] - Math.sin(q.ang) * off * lato, y = q.p[1] + Math.cos(q.ang) * off * lato;
        if (!libero(x, y, lung * 0.62) || !lontanoStrade([x, y], off - 4, base) || inFiume([x, y], 18)) continue;
        edifici.push({ x, y, l: lung, h: larg, ang: q.ang, colore });
        occupa(x, y, lung * 0.66);
        speciali.push({ x, y, nome: nomeE, nota, lung, larg });
        return;
      }
    };
    posaSpeciale('Chiesa', 62, 26, t.ardesia[0], 'La chiesa del villaggio.', raggioPiazza + 26);
    {
      // Il campanile: un corpo piu' piccolo in testa alla navata
      const c = speciali[speciali.length - 1];
      if (c) { const e = edifici[edifici.length - 1]; edifici.push({ x: e.x + Math.cos(e.ang) * 39, y: e.y + Math.sin(e.ang) * 39, l: 18, h: 18, ang: e.ang, colore: t.ardesia[1] }); }
    }
    posaSpeciale('Locanda del ' + r.pick(['Cinghiale', 'Corvo', 'Barile', 'Lupo', 'Viandante', 'Falcone']), 52, 26, t.tetti[0], 'L\'unica locanda: letti, zuppa calda e pettegolezzi.', raggioPiazza + 20);
    posaSpeciale('Fienile', 50, 28, t.tetti[3], 'Il fienile più grande: qui si fanno anche le feste.', raggioPiazza + 90);

    let fatte = 0;
    const passiPer = tutte.map((l) => ({ l, d: tutte.indexOf(l) < principali.length ? raggioPiazza + 22 : 16, lungh: _lung(l) }));
    for (let giro = 0; giro < nCase * 16 && fatte < nCase; giro++) {
      const m = passiPer[giro % passiPer.length];
      if (m.d > m.lungh - 8 || m.d > raggioB * 1.6) continue;
      const q = _punto(m.l, m.d);
      m.d += r.range(21, 33);
      if (!q) continue;
      const dal = M.dist(q.p, centro) / raggioB;
      for (const lato of [1, -1]) {
        if (fatte >= nCase || !r.chance(Math.max(0.22, 1.2 - dal * 0.74))) continue;
        // Timpano sulla strada: il lato lungo va verso il retro, come nelle case di paese
        const lung = r.range(24, 36), larg = r.range(13, 18), off = lung / 2 + r.range(8, 13);
        const x = q.p[0] - Math.sin(q.ang) * off * lato, y = q.p[1] + Math.cos(q.ang) * off * lato, a = q.ang + Math.PI / 2 + r.range(-0.08, 0.08);
        if (x < 30 || y < 30 || x > W - 30 || y > H - 30 || !libero(x, y, lung * 0.46) || !lontanoStrade([x, y], off - 3, m.l) || inFiume([x, y], 14)) continue;
        const colore = r.chance(0.12) ? r.pick(t.ardesia) : r.pick(t.tetti);
        edifici.push({ x, y, l: lung, h: larg, ang: a, colore });
        occupa(x, y, lung * 0.5);
        if (r.chance(0.28)) {
          const bx = x + Math.cos(q.ang) * (larg / 2 + 7), by = y + Math.sin(q.ang) * (larg / 2 + 7);
          if (libero(bx, by, 7)) { edifici.push({ x: bx, y: by, l: 14, h: 10, ang: q.ang, colore }); occupa(bx, by, 8); }
        }
        fatte++;
      }
    }

    /* Campi: ad anello attorno alle case, con gli angoli arrotondati */
    const raggioCase = Math.max(raggioB * 0.72, edifici.reduce((m, e) => Math.max(m, M.dist([e.x, e.y], centro)), 0));
    const campi = [];
    const aggiungiCampo = (a0, a1, r0, r1) => {
      const pts = [];
      for (let u = 0; u <= 6; u++) { const a = a0 + (a1 - a0) * u / 6; pts.push([cx + Math.cos(a) * r0 * 1.3, cy + Math.sin(a) * r0]); }
      for (let u = 6; u >= 0; u--) { const a = a0 + (a1 - a0) * u / 6; pts.push([cx + Math.cos(a) * r1 * 1.3, cy + Math.sin(a) * r1]); }
      // Prima accorcia gli angoli, poi li arrotonda: bordi morbidi come quelli tracciati dall'aratro
      const poly = M.morbida(pts, 3, true);
      if (poly.some((v) => !lontanoStrade(v, 10) || inFiume(v, 8) || !libero(v[0], v[1], 2) || fForesta(v[0], v[1]) > SOGLIA - 0.012)) return false;
      campi.push({ poly, ang: (a0 + a1) / 2 + (r.chance(0.7) ? Math.PI / 2 : 0) + r.range(-0.1, 0.1), colore: r.pick(t.campo) });
      poly.forEach((v, i) => { if (i % 8 === 0) occupa(v[0], v[1], 10); });
      return true;
    };
    const anelli = o.taglia === 'piccolo' ? [[1.04, 1.6], [1.68, 2.3]] : [[1.0, 1.45], [1.52, 2.05], [2.12, 2.7]];
    anelli.forEach(([u0, u1]) => {
      let a = r.range(0, 6.28);
      const fine = a + 6.283;
      while (a < fine - 0.12) {
        // Se un campo intero urta una strada, se ne prova uno piu' stretto: i campi si infilano tra le vie
        let fatto = false;
        const r0 = raggioCase * u0 * r.range(0.97, 1.03) * 0.74, r1 = raggioCase * u1 * r.range(0.95, 1.05) * 0.74;
        for (const span of [r.range(0.36, 0.56) / u0, r.range(0.22, 0.32) / u0, 0.15 / u0]) {
          if (aggiungiCampo(a, Math.min(a + span, fine), r0, r1)) { a += span + 0.05 / u0; fatto = true; break; }
        }
        if (!fatto) a += 0.09 / u0;
      }
    });
    // Orti vicino alle case: rettangoli con gli angoli appena smussati
    const smussa = (q, m) => {
      const out = [];
      q.forEach((v, i) => {
        const a = q[(i + q.length - 1) % q.length], b = q[(i + 1) % q.length];
        out.push(M.lerp(v, a, m / M.dist(v, a)), M.lerp(v, M.lerp(a, b, 0.5), 0.1), M.lerp(v, b, m / M.dist(v, b)));
      });
      return out;
    };
    for (let i = 0; i < nCase * 0.7; i++) {
      const a = r.range(0, 6.28), d = raggioCase * r.range(0.35, 0.9), x = cx + Math.cos(a) * d * 1.2, y = cy + Math.sin(a) * d * 0.86, l = r.range(34, 66), h = r.range(24, 38), ang = r.range(0, 3.14);
      if (!libero(x, y, Math.max(l, h) * 0.5) || !lontanoStrade([x, y], Math.max(l, h) * 0.56 + 2) || inFiume([x, y], 20)) continue;
      campi.push({ poly: smussa(M.rettangolo(x, y, l, h, ang), 7), ang, colore: r.pick(t.campo), orto: true });
      occupa(x, y, Math.max(l, h) * 0.5);
    }

    /* ─── Disegno ─── */
    // Luci e ombre del terreno: colline ampie, molto sfumate
    const G = 40, gw = Math.ceil((W + 400) / G), gh = Math.ceil((H + 400) / G);
    const colle = (i, j) => rn((i * G - 200) * 0.0021 + 200, (j * G - 200) * 0.0021 + 300, 3);
    let s = `<rect width="${W}" height="${H}" fill="${t.prato}"/>`;
    const fascia = (livello, col, op, sopra) => {
      const f = sopra ? (i, j) => colle(i, j) - livello : (i, j) => livello - colle(i, j);
      const d = M.contorni(gw, gh, f, 0, G, -200, -200).map((l) => M.via(M.morbida(l, 2, true))).join('');
      return d ? `<path d="${d}" fill="${col}" fill-rule="evenodd" opacity="${op}" filter="url(#carto-b40)"/>` : '';
    };
    s += fascia(0.44, t.pratoScuro, 0.5, false) + fascia(0.37, t.pratoScuro, 0.6, false) + fascia(0.53, t.luce, 0.34, true) + fascia(0.62, t.luce, 0.42, true);
    // Curve di livello appena accennate
    let quote = '';
    for (let l = 0.34; l < 0.72; l += 0.028) {
      M.contorni(gw, gh, (i, j) => colle(i, j) - l, 0, G, -200, -200).forEach((q) => { quote += M.via(M.morbida(q, 2, true), false); });
    }
    s += `<path d="${quote}" fill="none" stroke="${t.ink}" stroke-width="0.8" stroke-dasharray="3 5" opacity="0.14"/>`;

    // Campi
    let ombreCampi = '';
    campi.forEach((c) => { ombreCampi += M.via(c.poly.map(([x, y]) => [x + 2, y + 2.5])); });
    s += `<path d="${ombreCampi}" fill="${t.ink}" opacity="0.2"/>`;
    campi.forEach((c) => {
      s += `<path d="${M.via(c.poly)}" fill="${c.colore}" stroke="${t.solco}" stroke-width="1.1"/><path d="${M.tratteggio(c.poly, c.ang, c.orto ? 6 : 8.5, 8, r)}" fill="none" stroke="${t.solco}" stroke-width="1.15" stroke-dasharray="${c.orto ? '7 4' : '18 3'}" opacity="0.72"/>`;
    });

    // Fiume sotto le strade, i ponti sopra
    if (fiume) {
      const d = M.via(fiume, false);
      s += `<path d="${d}" fill="none" stroke="${t.ink}" stroke-width="${largF + 8}" opacity="0.25" stroke-linejoin="round" filter="url(#carto-b4)"/><path d="${d}" fill="none" stroke="${t.acquaInk}" stroke-width="${largF + 2.5}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${t.acqua}" stroke-width="${largF}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="40 70" opacity="0.5" stroke-linejoin="round"/>`;
    }

    // Stradine di accesso alle case: una riga corta fino alla via piu' vicina
    let accessi = '';
    edifici.forEach((e) => {
      let m = Infinity, a = null;
      tutte.forEach((l) => { for (let i = 0; i < l.length; i += 2) { const v = M.dist(l[i], [e.x, e.y]); if (v < m) { m = v; a = l[i]; } } });
      if (a && m < 52) accessi += `M${n1(e.x)} ${n1(e.y)}L${n1(a[0])} ${n1(a[1])}`;
    });
    s += `<path d="${accessi}" fill="none" stroke="${t.strada}" stroke-width="3" opacity="0.72"/>`;

    // Strade: bordo scuro sotto, chiaro sopra. Verso i margini diventano sentieri puntinati.
    const tagliaVia = (l, frac) => l.slice(0, Math.max(2, Math.floor(l.length * frac)));
    const strutture = tutte.map((l) => l);
    const dritte = strutture.map((l, i) => (i < principali.length ? l : tagliaVia(l, 1)));
    const dPrin = dritte.slice(0, principali.length).map((l) => M.via(l, false)).join(''), dVic = dritte.slice(principali.length).map((l) => M.via(l, false)).join('');
    s += `<path d="${dVic}" fill="none" stroke="${t.stradaBordo}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="${dPrin}" fill="none" stroke="${t.stradaBordo}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="${dVic}" fill="none" stroke="${t.strada}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="${dPrin}" fill="none" stroke="${t.strada}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
    // Due sentieri che tagliano i prati
    for (let i = 0; i < 2; i++) {
      const a = r.range(0, 6.28), dr = [cx + Math.cos(a) * raggioCase * 0.7, cy + Math.sin(a) * raggioCase * 0.56];
      sentieri.push(_via(rn, dr, a, W, H, 26, 0.6, 22));
    }
    s += `<path d="${sentieri.map((l) => M.via(l, false)).join('')}" fill="none" stroke="${t.strada}" stroke-width="2.5" stroke-dasharray="0.1 8" stroke-linecap="round" opacity="0.85"/>`;

    if (fiume) {
      const fatti = [];
      tutte.forEach((l, k) => {
        for (let i = 0; i < l.length - 1; i++) for (let j = 0; j < fiume.length - 1; j += 1) {
          const x = M.incrocio(l[i], l[i + 1], fiume[j], fiume[j + 1]);
          if (!x || fatti.some((f) => M.dist(f, x) < 34)) continue;
          fatti.push(x);
          const a = Math.atan2(l[i + 1][1] - l[i][1], l[i + 1][0] - l[i][0]), g = k < principali.length ? 18 : 13;
          s += `<path d="${M.via(M.rettangolo(x[0] + 3, x[1] + 4, largF + 24, g + 3, a))}" fill="${t.ink}" opacity="0.3"/><path d="${M.via(M.rettangolo(x[0], x[1], largF + 24, g, a))}" fill="${t.stradaBordo}" stroke="${t.ink}" stroke-width="1.3"/><path d="${M.via(M.rettangolo(x[0], x[1], largF + 26, g - 6, a))}" fill="${t.strada}"/>`;
        }
      });
    }

    // Piazza con il grande albero al centro
    if (raggioPiazza) {
      s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${raggioPiazza + 2}" fill="${t.stradaBordo}"/><circle cx="${n1(cx)}" cy="${n1(cy)}" r="${raggioPiazza}" fill="${t.piazza}"/>`;
    }

    // Tutte le chiome si dispongono in un'unica passata
    const alberi = [];
    const passo = 22;
    const nessunoVicino = (x, y, q) => libero(x, y, q * 0.45) && lontanoStrade([x, y], q * 0.65 + 6) && !inFiume([x, y], q * 0.7);
    const interni = [];
    for (let y = -30; y < H + 40; y += passo) for (let x = -30; x < W + 40; x += passo) {
      const qx = x + r.range(-10, 10), qy = y + r.range(-10, 10), f = fForesta(qx, qy);
      if (f < SOGLIA - 0.008) continue;
      if (f < SOGLIA + 0.06) {
        const q = r.range(14, 24);
        if (nessunoVicino(qx, qy, q)) alberi.push([qx, qy, q]);
      } else if (r.chance(0.55)) {
        interni.push([qx, qy, r.range(15, 26)]);
      }
    }
    // Macchie sparse dentro il villaggio e lungo i fossi
    for (let i = 0; i < nCase * 0.5; i++) {
      const a = r.range(0, 6.28), d = raggioCase * r.range(0.3, 1.25), bx = cx + Math.cos(a) * d * 1.25, by = cy + Math.sin(a) * d * 0.9;
      const n = r.int(2, 6);
      for (let k = 0; k < n; k++) {
        const qx = bx + r.range(-30, 30), qy = by + r.range(-22, 22), q = r.range(10, 17);
        if (nessunoVicino(qx, qy, q) && !campi.some((c) => M.dentro([qx, qy], c.poly))) alberi.push([qx, qy, q]);
      }
    }
    if (raggioPiazza) alberi.push([cx, cy, raggioPiazza * 0.52]);

    // Il cuore del bosco e' una massa scura, con la sua ombra verso sud-est
    const contFor = M.contorni(gw, gh, (i, j) => { const x = i * G - 200, y = j * G - 200; return fForesta(x, y) - (SOGLIA + 0.02); }, 0, G, -200, -200).map((l) => M.morbida(l, 2, true));
    const dFor = contFor.map((l) => M.via(l)).join('');
    if (dFor) {
      s += `<path d="${dFor}" fill="${t.ink}" transform="translate(14 17)" opacity="0.32" fill-rule="evenodd" filter="url(#carto-b12)"/><path d="${dFor}" fill="${t.bosco}" fill-rule="evenodd"/>`;
      const prof = M.contorni(gw, gh, (i, j) => fForesta(i * G - 200, j * G - 200) - (SOGLIA + 0.12), 0, G, -200, -200).map((l) => M.via(M.morbida(l, 2, true))).join('');
      if (prof) s += `<path d="${prof}" fill="${t.boscoProfondo}" fill-rule="evenodd" filter="url(#carto-b40)" opacity="0.85"/>`;
    }
    // Dentro il bosco solo il contorno delle chiome, molto tenue: leggero da disegnare e ricco da vedere
    let trame = '';
    interni.forEach(([x, y, q]) => { trame += _lobi(x, y, q, r, 7); });
    s += `<path d="${trame}" fill="${t.chioma[0]}" fill-opacity="0.2" stroke="${t.ink}" stroke-width="0.9" stroke-opacity="0.55"/>`;
    alberi.sort((a, b) => a[1] - b[1]);
    const prima = alberi.filter((a) => a[1] < cy - 1e9);
    s += _tetti(edifici, t) + _chiome(prima.concat(alberi), t, r);

    /* Pozzo in piazza, nomi, titolo */
    let testi = '';
    const pin = [];
    if (raggioPiazza) {
      testi += M.etichetta(cx, cy + raggioPiazza + 22, 'Piazza', t, { size: 17, peso: 600, colore: t.testo, alone: t.testoAlone, aloneW: 3.5, corsivo: true });
      pin.push({ x: cx, y: cy, label: 'Piazza', note: 'Il cuore del villaggio, con il grande albero al centro.', sottotipo: '' });
    }
    speciali.forEach((e) => {
      testi += M.etichetta(e.x, e.y + Math.max(e.lung, e.larg) * 0.6 + 16, e.nome, t, { size: 17, peso: 600, colore: t.testo, alone: t.testoAlone, aloneW: 3.5 });
      pin.push({ x: e.x, y: e.y, label: e.nome, note: e.nota, sottotipo: '', tipoLuogo: /^Chiesa/.test(e.nome) ? 'Tempio' : /^Locanda/.test(e.nome) ? 'Taverna' : '', genera: /^Chiesa/.test(e.nome) ? { tipo: 'dungeon', opzioni: { tema: 'cripta' } } : { tipo: 'abitazione', opzioni: { edificio: /^Locanda/.test(e.nome) ? 'taverna' : 'casa' } } });
    });

    const abitanti = Math.round((fatte + 3) * r.range(5.2, 7.4) / 10) * 10;
    let titolo = '';
    if (o.titolo !== false) {
      titolo = M.etichetta(30, 52, nome, t, { size: 38, ancora: 'start', font: M.FONT_TITOLO, peso: 700, colore: t.testo, alone: t.testoAlone, aloneW: 5, spazio: 1 }) +
        M.etichetta(32, 78, abitanti + ' abitanti', t, { size: 18, ancora: 'start', colore: t.testo, alone: t.testoAlone, aloneW: 3.5, corsivo: true });
    }
    const svg = M.apri(W, H, M.PALETTE.pergamena, o.seme) + s + (o.nomi === false ? '' : testi) + titolo +
      M.scala(40, H - 34, 100, { valore: 50, nome: 'metri' }, 3, { ...M.PALETTE.pergamena, carta: '#f5f0dc', inchiostro: '#1c1a14' }) + '</svg>';
    return { nome, pin, W, H, larghezzaKm: W * 0.5 / 1000, svg };
  };

  return { villaggio, chiome: _chiome, lobi: _lobi, TONI };
})();

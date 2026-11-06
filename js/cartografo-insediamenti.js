/* ============================================================
   CARTOGRAFO-INSEDIAMENTI.JS — Generatore di citta'.
   Citta': i quartieri sono celle attorno a punti distribuiti a
   spirale; i lati delle celle diventano le strade, il contorno
   diventa le mura, ogni cella si divide in isolati e case.
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

  // Campi: una cella si divide in appezzamenti, ognuno arato nella direzione del suo lato lungo
  const _appezzamenti = (cella, r, p, passo, minimo) => {
    const parti = [];
    const dividi = (q) => {
      const a = Math.abs(M.area(q));
      if (a < minimo * r.range(0.7, 1.4)) { parti.push(q); return; }
      let lung = -1, ia = 0;
      q.forEach((v, i) => { const l = M.dist(v, q[(i + 1) % q.length]); if (l > lung) { lung = l; ia = i; } });
      const u = q[ia], w = q[(ia + 1) % q.length], t = r.range(0.35, 0.65), m = M.lerp(u, w, t);
      const dx = (w[0] - u[0]) / lung, dy = (w[1] - u[1]) / lung;
      dividi(M.taglia(q, m[0] - dx * 1.5, m[1] - dy * 1.5, dx, dy));
      dividi(M.taglia(q, m[0] + dx * 1.5, m[1] + dy * 1.5, -dx, -dy));
    };
    dividi(cella);
    let s = '';
    for (const q of parti) {
      if (q.length < 3) continue;
      let lung = -1, ang = 0;
      q.forEach((v, i) => { const w = q[(i + 1) % q.length], l = M.dist(v, w); if (l > lung) { lung = l; ang = Math.atan2(w[1] - v[1], w[0] - v[0]); } });
      s += M.campo(q, r.pick(p.campi), ang, passo, p);
    }
    return s;
  };

  const _barca = (x, y, ang, p) => {
    const c = Math.cos(ang), s = Math.sin(ang), T = (u, v) => M.n1(x + u * c - v * s) + ' ' + M.n1(y + u * s + v * c);
    return `<path d="M${T(-12, 0)}Q${T(-4, -6)} ${T(12, 0)}Q${T(-4, 6)} ${T(-12, 0)}Z" fill="${p.tetti[3]}" stroke="${p.inchiostro}" stroke-width="0.8"/>` +
      `<path d="M${T(2, -8)}L${T(2, 8)}" stroke="${p.carta}" stroke-width="2.4"/>`;
  };

  /* ═══════════════ CITTA' ═══════════════ */
  const citta = (o) => {
    const r = M.rng('citta:' + o.seme), rn = M.rumore(r), p = M.PALETTE[o.palette] || M.PALETTE.pergamena;
    // Tante celle piccole: ognuna e' un isolato, e sono le strade di rango diverso a disegnare i quartieri
    const dati = { piccola: [34, 245], media: [68, 335], grande: [108, 385] }[o.taglia] || [68, 335];
    const [nInterne, R] = dati;
    const nome = o.nome || M.nomeLuogo(r);

    const angMare = r.range(0, Math.PI * 2);
    const mx = Math.cos(angMare), my = Math.sin(angMare);
    const cx = 700 - (o.costa ? mx * 80 : r.range(-30, 30)), cy = 556 - (o.costa ? my * 18 : r.range(-8, 12));
    // Distanza dal centro misurata sulla forma della citta': piu' larga che alta, come il foglio
    const dalCentro = (q) => Math.hypot((q[0] - cx) / 1.2, (q[1] - cy) / 0.94);
    const D = R * r.range(0.62, 0.8);
    const mare = (q) => (o.costa ? (q[0] - cx) * mx + (q[1] - cy) * my - D + (rn(q[0] * 0.0052 + 7, q[1] * 0.0052) - 0.5) * 210 : -999);

    const angFiume = o.costa ? angMare + r.range(-0.25, 0.25) : r.range(0, Math.PI);
    const scartoFiume = R * r.range(0.16, 0.42) * (r.chance(0.5) ? 1 : -1);
    const fiume = o.fiume ? _traversa(rn, cx, cy, angFiume, scartoFiume, 300) : null;
    const largFiume = { piccola: 22, media: 28, grande: 36 }[o.taglia] || 28;

    // Punti delle celle: spirale fitta per la citta', griglia larga per la campagna
    let punti = [];
    for (let i = 0; i < nInterne; i++) {
      const raggio = R * Math.sqrt((i + 0.5) / nInterne), a = i * 2.39996;
      punti.push([cx + Math.cos(a) * raggio * 1.2 + r.range(-12, 12), cy + Math.sin(a) * raggio * 0.94 + r.range(-12, 12)]);
    }
    // Un anello di celle appena fuori dalla citta': cosi' le mura restano tonde, senza punte verso la campagna
    const latoCella = Math.sqrt(Math.PI * R * R * 1.128 / nInterne), nAnello = Math.round(2 * Math.PI * R * 1.16 * 1.07 / latoCella);
    for (let i = 0; i < nAnello; i++) {
      const a = i / nAnello * Math.PI * 2;
      punti.push([cx + Math.cos(a) * R * 1.13 * 1.2 + r.range(-5, 5), cy + Math.sin(a) * R * 1.13 * 0.94 + r.range(-5, 5)]);
    }
    for (let y = -170; y < H + 170; y += 145) for (let x = -170; x < W + 170; x += 145) {
      const q = [x + r.range(-52, 52), y + r.range(-52, 52)];
      if (dalCentro(q) > R * 1.42) punti.push(q);
    }
    for (let g = 0; g < 2; g++) {
      const cc = M.celle(punti, -260, -260, W + 260, H + 260);
      punti = punti.map((q, i) => (i < nInterne ? M.centro(cc[i]) : q));
    }
    const forme = M.celle(punti, -260, -260, W + 260, H + 260);

    // Vertici condivisi: due celle vicine devono usare lo stesso vertice per poterle collegare
    const vertici = [], indice = new Map();
    const idVertice = (q) => {
      const kx = Math.round(q[0] * 2), ky = Math.round(q[1] * 2);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const t = indice.get((kx + a) + ',' + (ky + b));
        if (t !== undefined) return t;
      }
      vertici.push(q); indice.set(kx + ',' + ky, vertici.length - 1);
      return vertici.length - 1;
    };
    const celle = forme.map((f, i) => {
      const ids = [];
      f.forEach((v) => { const t = idVertice(v); if (ids[ids.length - 1] !== t) ids.push(t); });
      if (ids.length > 1 && ids[0] === ids[ids.length - 1]) ids.pop();
      return { i, ids, poly: ids.map((t) => vertici[t]), interna: i < nInterne, tipo: 'normale' };
    });
    // Una cella con un vertice in mare resta fuori: altrimenti le mura farebbero punte sull'acqua
    celle.forEach((c) => { c.centro = M.centro(c.poly); if (c.interna && (mare(c.centro) > -6 || c.poly.some((v) => mare(v) > 4))) c.interna = false; });

    const chiave = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
    const trovaBordo = () => {
      const conta = new Map();
      celle.filter((c) => c.interna).forEach((c) => c.ids.forEach((a, k) => {
        const b = c.ids[(k + 1) % c.ids.length], e = chiave(a, b);
        if (!conta.has(e)) conta.set(e, { a, b, celle: [] });
        conta.get(e).celle.push(c);
      }));
      const adiac = new Map();
      conta.forEach((e, k) => {
        if (e.celle.length !== 1) return;
        (adiac.get(e.a) || adiac.set(e.a, []).get(e.a)).push([e.b, k]);
        (adiac.get(e.b) || adiac.set(e.b, []).get(e.b)).push([e.a, k]);
      });
      const usati = new Set();
      let migliore = [];
      adiac.forEach((_, inizio) => {
        const giro = [];
        let cur = inizio;
        for (;;) {
          const pross = (adiac.get(cur) || []).find(([, k]) => !usati.has(k));
          giro.push(cur);
          if (!pross) break;
          usati.add(pross[1]); cur = pross[0];
          if (cur === inizio) break;
        }
        if (giro.length > migliore.length) migliore = giro;
      });
      return { lati: conta, giro: migliore };
    };
    let { lati, giro } = trovaBordo();
    // Una cella staccata dal corpo principale non sta dentro le mura: torna campagna
    const polyMura = giro.map((t) => vertici[t]);
    celle.forEach((c) => { if (c.interna && !M.dentro(c.centro, polyMura)) c.interna = false; });
    ({ lati, giro } = trovaBordo());
    const muraPoly = giro.map((t) => vertici[t]);
    const latiMura = new Set(giro.map((a, k) => chiave(a, giro[(k + 1) % giro.length])));
    const interne = celle.filter((c) => c.interna);

    const vicineDi = (c) => {
      const set = new Set();
      c.ids.forEach((a, k) => { const e = lati.get(chiave(a, c.ids[(k + 1) % c.ids.length])); if (e) e.celle.forEach((x) => { if (x !== c) set.add(x); }); });
      return [...set];
    };
    const inAcqua = (q, m) => mare(q) > -m || (fiume && M.distLinea(q, fiume) < largFiume / 2 + m);

    // Funzioni dei quartieri
    const asciutte = interne.filter((c) => !inAcqua(c.centro, 22));
    const elenco = asciutte.length ? asciutte : interne;
    const piazza = elenco.slice().sort((a, b) => M.dist(a.centro, [cx, cy]) - M.dist(b.centro, [cx, cy]))[0];
    piazza.tipo = 'piazza';
    const liberaVicina = (c) => vicineDi(c).filter((x) => x.interna && x.tipo === 'normale' && !inAcqua(x.centro, 22));
    let castello = null;
    if (o.castello) {
      // Il castello sta sulle mura, ma mai contro il bordo del foglio, dove finirebbe tagliato o sotto la scala
      const dentroFoglio = (c) => c.poly.every((v) => v[0] > 70 && v[0] < W - 70 && v[1] > 120 && v[1] < H - 90);
      const suBordo = elenco.filter((c) => c.tipo === 'normale' && dentroFoglio(c) && c.ids.some((a, k) => latiMura.has(chiave(a, c.ids[(k + 1) % c.ids.length]))));
      castello = suBordo.sort((a, b) => (Math.abs(M.area(b.poly)) - mare(b.centro) * 30) - (Math.abs(M.area(a.poly)) - mare(a.centro) * 30))[0] || null;
      if (castello) castello.tipo = 'castello';
    }
    // Il tempio prende l'isolato piu' grande accanto alla piazza: deve farsi notare
    const tempio = liberaVicina(piazza).sort((a, b) => Math.abs(M.area(b.poly)) - Math.abs(M.area(a.poly)))[0] || elenco.find((c) => c.tipo === 'normale');
    if (tempio) tempio.tipo = 'tempio';
    // Rioni: gruppi di isolati vicini. Il carattere (ricco, povero...) e' del rione, non del singolo isolato.
    const nRioni = { piccola: 4, media: 7, grande: 11 }[o.taglia] || 7;
    const semiRioni = [];
    for (const dMin of [R * 0.75, R * 0.5, R * 0.3]) for (const c of r.shuffle(interne)) {
      if (semiRioni.length < nRioni && semiRioni.every((q) => M.dist(q.centro, c.centro) > dMin)) semiRioni.push({ centro: c.centro, celle: [] });
    }
    semiRioni.forEach((q) => {
      const rel = dalCentro(q.centro) / R, vicinoCastello = castello && M.dist(q.centro, castello.centro) < R * 0.42;
      q.carattere = (rel < 0.5 || vicinoCastello) && r.chance(0.5) ? 'nobile' : rel > 0.62 && r.chance(0.5) ? 'poveri' : 'normale';
    });
    interne.forEach((c) => {
      const rione = semiRioni.reduce((m, q) => (M.dist(q.centro, c.centro) < M.dist(m.centro, c.centro) ? q : m), semiRioni[0]);
      rione.celle.push(c);
      if (c.tipo !== 'normale') return;
      if (mare(c.centro) > -80 && r.chance(0.7)) c.tipo = 'magazzini';
      else if (r.chance(0.035)) c.tipo = 'parco';
      else c.tipo = rione.carattere;
    });

    // Strade principali: dalle porte alla piazza, preferendo tratti gia' percorsi
    const grafo = new Map();
    lati.forEach((e, k) => {
      (grafo.get(e.a) || grafo.set(e.a, []).get(e.a)).push([e.b, k]);
      (grafo.get(e.b) || grafo.set(e.b, []).get(e.b)).push([e.a, k]);
    });
    const principali = new Set();
    const percorso = (da, a) => {
      const costo = new Map([[da, 0]]), prec = new Map(), aperti = new Set([da]);
      while (aperti.size) {
        let cur = null, min = Infinity;
        aperti.forEach((v) => { if (costo.get(v) < min) { min = costo.get(v); cur = v; } });
        aperti.delete(cur);
        if (cur === a) break;
        for (const [n, k] of grafo.get(cur) || []) {
          const pesa = M.dist(vertici[cur], vertici[n]) * (principali.has(k) ? 0.45 : latiMura.has(k) ? 4 : 1);
          const tot = min + pesa;
          if (tot < (costo.has(n) ? costo.get(n) : Infinity)) { costo.set(n, tot); prec.set(n, [cur, k]); aperti.add(n); }
        }
      }
      if (!prec.has(a)) return [];
      const out = [];
      let cur = a;
      while (prec.has(cur)) { const [q, k] = prec.get(cur); out.push(k); cur = q; }
      return out;
    };
    const nPorte = { piccola: 3, media: 4, grande: 5 }[o.taglia] || 4;
    const porte = [];
    const inizio = r.range(0, Math.PI * 2);
    for (let i = 0; i < nPorte; i++) {
      const a = inizio + i * Math.PI * 2 / nPorte + r.range(-0.25, 0.25);
      const scelta = giro
        .filter((t) => mare(vertici[t]) < -35 && !(fiume && M.distLinea(vertici[t], fiume) < largFiume) && (!castello || !castello.ids.includes(t)))
        .map((t) => ({ t, d: Math.abs(Math.atan2(Math.sin(Math.atan2(vertici[t][1] - cy, vertici[t][0] - cx) - a), Math.cos(Math.atan2(vertici[t][1] - cy, vertici[t][0] - cx) - a))) }))
        .sort((x, y) => x.d - y.d)[0];
      if (scelta && scelta.d < 0.9 && !porte.includes(scelta.t)) porte.push(scelta.t);
    }
    const partenza = piazza.ids[0];
    porte.forEach((t) => percorso(partenza, t).forEach((k) => principali.add(k)));
    // Vie secondarie: attraversano i quartieri tra punti lontani. Le altre restano vicoli stretti.
    const secondarie = new Set();
    const idInterni = [...grafo.keys()];
    for (let i = 0; i < nInterne / 3.2; i++) {
      percorso(r.pick(idInterni), r.pick(idInterni)).forEach((k) => { if (!principali.has(k) && !latiMura.has(k)) secondarie.add(k); });
    }

    // Strade fuori dalle mura: partono dalle porte e proseguono fino al bordo o al mare
    const stradeFuori = porte.map((t) => {
      const v = vertici[t];
      let ang = Math.atan2(v[1] - cy, v[0] - cx);
      const linea = [v];
      let q = v;
      for (let i = 0; i < 50; i++) {
        ang += (rn(q[0] * 0.006 + 31, q[1] * 0.006) - 0.5) * 0.7;
        q = [q[0] + Math.cos(ang) * 34, q[1] + Math.sin(ang) * 34];
        if (mare(q) > -12 || q[0] < -40 || q[1] < -40 || q[0] > W + 40 || q[1] > H + 40) break;
        linea.push(q);
      }
      return M.morbida(linea, 2);
    });

    // Sfondo e campagna
    let svg = `<rect x="0" y="0" width="${W}" height="${H}" fill="${p.erba}" opacity="0.6"/>`;
    const bosco = (q) => rn(q[0] * 0.0048 + 91, q[1] * 0.0048 + 13, 3);
    let campiSvg = '';
    celle.forEach((c) => {
      if (c.interna || c.poly.length < 3) return;
      const d = dalCentro(c.centro);
      if (d > R * 2.1 || bosco(c.centro) > 0.57 || mare(c.centro) > 0) return;
      campiSvg += _appezzamenti(M.rientra(c.poly, 4), r, p, 6.5, 4200);
    });
    svg += campiSvg;

    // Terreno della citta' e strade
    svg += interne.map((c) => `<path d="${M.via(c.poly)}" fill="${p.terra}"/>`).join('');
    const vicoli = [], vieMedie = [], viePrincipali = [];
    lati.forEach((e, k) => {
      const seg = [vertici[e.a], vertici[e.b]];
      if (principali.has(k)) viePrincipali.push(seg);
      else if (secondarie.has(k)) vieMedie.push(seg);
      else if (!latiMura.has(k)) vicoli.push(seg);
    });
    svg += `<path d="${vicoli.map((l) => M.via(l, false)).join('')}" fill="none" stroke="${p.strada}" stroke-width="3.2" stroke-linecap="round"/>`;
    svg += `<path d="${vieMedie.map((l) => M.via(l, false)).join('')}" fill="none" stroke="${p.strada}" stroke-width="6" stroke-linecap="round"/>`;
    svg += p.muroPieno
      ? `<path d="${stradeFuori.map((l) => M.via(l, false)).join('')}" fill="none" stroke="${p.tenue}" stroke-width="7" stroke-linecap="round"/><path d="${[...stradeFuori, ...viePrincipali].map((l) => M.via(l, false)).join('')}" fill="none" stroke="${p.strada}" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/>`
      : _strade([...stradeFuori, ...viePrincipali], p, 8);

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

    // Ponti: dove una via principale attraversa il fiume
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

    // Quartieri: ogni cella si rientra di quanto servono strade e mura, poi si divide in case
    const case_ = [], casePregiate = [], alberi = [];
    const suddividi = (q, target, tieni, lista, colore) => {
      const a = Math.abs(M.area(q));
      if (q.length < 3) return;
      if (a < target * r.range(0.7, 1.45)) {
        if (a < target * 0.3 || !r.chance(tieni)) return;
        const b = M.rientra(q, 0.45);
        if (b.length < 3 || b.some((v) => inAcqua(v, 2))) return;
        // Niente schegge: i triangolini e i lotti troppo sottili non sono case
        let giroLotto = 0;
        b.forEach((v, i) => { giroLotto += M.dist(v, b[(i + 1) % b.length]); });
        if (b.length === 3 || 4 * Math.PI * Math.abs(M.area(b)) / (giroLotto * giroLotto) < 0.5) return;
        lista.push({ poly: b, colore: colore || r.pick(p.tetti) });
        return;
      }
      let lung = -1, ia = 0;
      q.forEach((v, i) => { const l = M.dist(v, q[(i + 1) % q.length]); if (l > lung) { lung = l; ia = i; } });
      const u = q[ia], w = q[(ia + 1) % q.length], m = M.lerp(u, w, r.range(0.38, 0.62));
      const ang = Math.atan2(w[1] - u[1], w[0] - u[0]) + r.range(-0.07, 0.07), dx = Math.cos(ang), dy = Math.sin(ang);
      const gap = a > target * 7 ? 1.7 : 0.1;
      suddividi(M.taglia(q, m[0] - dx * gap, m[1] - dy * gap, dx, dy), target, tieni, lista, colore);
      suddividi(M.taglia(q, m[0] + dx * gap, m[1] + dy * gap, -dx, -dy), target, tieni, lista, colore);
    };
    let speciali = '', castelloSvg = '';
    const distanze = (c, extra = 0) => c.ids.map((a, k) => {
      const e = chiave(a, c.ids[(k + 1) % c.ids.length]);
      return (latiMura.has(e) ? (o.mura ? 7.5 : 2.5) : principali.has(e) ? 5.5 : secondarie.has(e) ? 3.2 : 1.7) + extra;
    });
    const orientaArea = (c) => (M.area(c.poly) > 0 ? c.poly : c.poly);

    interne.forEach((c) => {
      const q = M.rientra(orientaArea(c), distanze(c));
      if (q.length < 3) return;
      const raggioRel = dalCentro(c.centro) / R;
      if (c.tipo === 'piazza') {
        const [px, py] = M.centro(q);
        speciali += `<path d="${M.via(q)}" fill="${p.pavimento}" stroke="${p.stradaBordo}" stroke-width="0.8"/>`;
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2, d = r.range(26, 44), x = px + Math.cos(a) * d, y = py + Math.sin(a) * d, b = M.rettangolo(x, y, 10, 7, r.range(0, 3));
          if (r.chance(0.72) && b.every((v) => M.dentro(v, q))) speciali += `<path d="${M.via(b)}" fill="${r.pick(p.tetti)}" stroke="${p.inchiostro}" stroke-width="0.7"/>`;
        }
        speciali += `<circle cx="${M.n1(px)}" cy="${M.n1(py)}" r="10" fill="${p.acqua}" stroke="${p.inchiostro}" stroke-width="1.4"/><circle cx="${M.n1(px)}" cy="${M.n1(py)}" r="3" fill="${p.carta}" stroke="${p.inchiostro}" stroke-width="1"/>`;
      } else if (c.tipo === 'tempio') {
        speciali += `<path d="${M.via(q)}" fill="${p.pavimento}" stroke="${p.stradaBordo}" stroke-width="0.8"/>`;
        const [tx, ty] = M.centro(q);
        let lung = -1, ang = 0;
        q.forEach((v, i) => { const w = q[(i + 1) % q.length], l = M.dist(v, w); if (l > lung) { lung = l; ang = Math.atan2(w[1] - v[1], w[0] - v[0]); } });
        let s = Math.sqrt(Math.abs(M.area(q))) * 0.92;
        while (s > 24 && !M.rettangolo(tx, ty, s, s * 0.8, ang).every((v) => M.dentro(v, q))) s *= 0.88;
        const c0 = Math.cos(ang), s0 = Math.sin(ang);
        casePregiate.push({ poly: M.rettangolo(tx, ty, s, s * 0.32, ang), colore: p.tettoNobile });
        casePregiate.push({ poly: M.rettangolo(tx + c0 * s * 0.16, ty + s0 * s * 0.16, s * 0.26, s * 0.74, ang), colore: p.tettoNobile });
        speciali += `<circle cx="${M.n1(tx + c0 * s * 0.5)}" cy="${M.n1(ty + s0 * s * 0.5)}" r="${M.n1(s * 0.16)}" fill="${p.tettoNobile}" stroke="${p.inchiostro}" stroke-width="1"/>`;
        for (let i = 0; i < 9; i++) {
          const v = [tx + r.range(-1, 1) * s * 0.7, ty + r.range(-1, 1) * s * 0.7];
          if (M.dentro(v, q) && Math.abs((v[0] - tx) * -s0 + (v[1] - ty) * c0) > s * 0.42) alberi.push([v[0], v[1], 0.8]);
        }
      } else if (c.tipo === 'parco') {
        speciali += `<path d="${M.via(q)}" fill="${p.erba2}" stroke="${p.stradaBordo}" stroke-width="0.8"/>`;
        const n = Math.abs(M.area(q)) / 240;
        for (let i = 0; i < n; i++) { const v = [c.centro[0] + r.range(-90, 90), c.centro[1] + r.range(-90, 90)]; if (M.dentro(v, q) && !inAcqua(v, 6)) alberi.push([v[0], v[1], r.range(0.85, 1.3)]); }
      } else if (c.tipo === 'castello') {
        const rec = M.rientra(q, 6);
        if (rec.length < 3) return;
        const d = M.via(rec);
        castelloSvg += p.muroPieno
          ? `<path d="${d}" fill="${p.pavimento}" stroke="${p.inchiostro}" stroke-width="6" stroke-linejoin="round"/>`
          : `<path d="${d}" fill="${p.pavimento}"/><path d="${d}" fill="none" stroke="${p.inchiostro}" stroke-width="10" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${p.carta2}" stroke-width="6.5" stroke-linejoin="round"/>`;
        const [kx, ky] = M.centro(rec);
        let s = Math.sqrt(Math.abs(M.area(rec))) * 0.48;
        const ang = r.range(-0.3, 0.3);
        while (s > 18 && !M.rettangolo(kx, ky, s, s, ang).every((v) => M.dentro(v, rec))) s *= 0.88;
        const mastio = [{ poly: M.rettangolo(kx, ky, s, s, ang), colore: p.tettoNobile }];
        castelloSvg += M.edifici(mastio, p, 3.5);
        if (p.muroPieno) {
          rec.forEach(([x, y]) => { castelloSvg += `<circle cx="${M.n1(x)}" cy="${M.n1(y)}" r="7.5" fill="${p.inchiostro}"/>`; });
        } else {
          M.rettangolo(kx, ky, s, s, ang).forEach(([x, y]) => { castelloSvg += `<circle cx="${M.n1(x)}" cy="${M.n1(y)}" r="${M.n1(s * 0.13 + 2)}" fill="${p.tettoNobile}" stroke="${p.inchiostro}" stroke-width="1.2"/>`; });
          rec.forEach(([x, y]) => { castelloSvg += `<circle cx="${M.n1(x)}" cy="${M.n1(y)}" r="9" fill="${p.carta2}" stroke="${p.inchiostro}" stroke-width="1.5"/><circle cx="${M.n1(x)}" cy="${M.n1(y)}" r="3.6" fill="none" stroke="${p.inchiostro}" stroke-width="0.8"/>`; });
        }
      } else {
        const profilo = { normale: [185, 0.94], poveri: [105, 0.95], nobile: [430, 0.68], magazzini: [420, 0.88] }[c.tipo] || [185, 0.94];
        const periferia = o.mura ? 1 : Math.max(0.3, 1 - Math.max(0, raggioRel - 0.7) * 2.2);
        const primaCasa = case_.length;
        // Le case si affacciano sulla strada: quelle che non toccano il bordo dell'isolato spariscono
        // quasi tutte, e al centro restano i cortili
        const lotti = [];
        suddividi(q, profilo[0], profilo[1] * periferia, lotti);
        const bordo = q.concat([q[0]]);
        const profonde = c.tipo === 'poveri' ? 0.8 : c.tipo === 'nobile' ? 0.05 : 0.3;
        lotti.forEach((l) => {
          // Si tengono due file di case dalla strada: al centro resta un cortile, non un vuoto
          if (M.distLinea(M.centro(l.poly), bordo) < 26 || r.chance(profonde)) case_.push(l);
        });
        if (c.tipo === 'nobile') {
          // Giardini solo negli spazi rimasti liberi, mai sopra un tetto
          const tetti = case_.slice(primaCasa);
          for (let i = 0; i < 12; i++) {
            const v = [c.centro[0] + r.range(-70, 70), c.centro[1] + r.range(-70, 70)];
            if (M.dentro(v, M.rientra(q, 6)) && !inAcqua(v, 5) && !tetti.some((t) => M.dist(v, M.centro(t.poly)) < 22)) alberi.push([v[0], v[1], 0.7]);
          }
        }
      }
    });

    // Case sparse lungo le strade fuori dalle mura
    const fuori = [];
    // Sobborghi: fuori dalle porte le case si infittiscono lungo la strada, su piu' file, poi si diradano
    const suolo = [];
    const anelloMura = muraPoly.concat([muraPoly[0]]);
    const libera = (x, y, s) => suolo.every(([a, b, c]) => Math.hypot(a - x, b - y) > c + s);
    stradeFuori.forEach((l) => {
      let percorsa = 0;
      const limite = r.range(170, 330) * (R / 305);
      for (let i = 1; i < l.length - 1 && percorsa < limite; i++) {
        const passo = M.dist(l[i], l[i - 1]);
        percorsa += passo;
        const ang = Math.atan2(l[i + 1][1] - l[i][1], l[i + 1][0] - l[i][0]), dens = 1 - percorsa / limite;
        for (const lato of [1, -1]) for (let fila = 0; fila < 3; fila++) {
          if (!r.chance((fila === 0 ? 0.95 : fila === 1 ? 0.55 : 0.25) * (0.35 + dens))) continue;
          const lung = r.range(14, 23), larg = r.range(10, 14), off = 11 + larg / 2 + fila * r.range(17, 22) + r.range(-1, 2), lungo = r.range(-5, 5);
          const x = l[i][0] - Math.sin(ang) * off * lato + Math.cos(ang) * lungo, y = l[i][1] + Math.cos(ang) * off * lato + Math.sin(ang) * lungo;
          if (inAcqua([x, y], 9) || M.dentro([x, y], muraPoly) || M.distLinea([x, y], anelloMura) < 16 || !libera(x, y, lung * 0.5)) continue;
          if (stradeFuori.some((s) => s !== l && M.distLinea([x, y], s) < 11)) continue;
          suolo.push([x, y, lung * 0.55]);
          fuori.push({ poly: M.rettangolo(x, y, lung, larg, ang + r.range(-0.08, 0.08)), colore: r.pick(p.tetti) });
        }
      }
    });
    // Qualche casa isolata tra i campi
    for (let i = 0; i < nInterne * 0.28; i++) {
      const a = r.range(0, 6.28), d = R * r.range(1.2, 1.85), x = cx + Math.cos(a) * d * 1.2, y = cy + Math.sin(a) * d * 0.94;
      if (x < 40 || y < 100 || x > W - 40 || y > H - 40 || inAcqua([x, y], 12) || !libera(x, y, 16) || bosco([x, y]) > 0.55) continue;
      suolo.push([x, y, 12]);
      fuori.push({ poly: M.rettangolo(x, y, r.range(14, 22), r.range(10, 13), r.range(0, 3.14)), colore: r.pick(p.tetti) });
    }

    svg += speciali + M.edifici(case_.concat(fuori), p) + M.edifici(casePregiate, p, 3.5) + castelloSvg;

    // Alberi nelle zone boscose e a macchie tra i campi
    const tutteStrade = stradeFuori;
    for (let y = 30; y < H - 20; y += 21) for (let x = 30; x < W - 20; x += 21) {
      const q = [x + r.range(-9, 9), y + r.range(-9, 9)];
      const d = dalCentro(q);
      const fitto = bosco(q) > 0.56 || (d > R * 2.1 && bosco(q) > 0.47);
      if (!(fitto || r.chance(0.018)) || inAcqua(q, 8) || (fitto && r.chance(p.muroPieno ? 0.72 : 0.12))) continue;
      // Il bosco si ferma alle mura e lascia libere le strade e le case fuori porta
      if (M.dentro(q, muraPoly) || M.distLinea(q, muraPoly.concat([muraPoly[0]])) < 20) continue;
      if (tutteStrade.some((l) => M.distLinea(q, l) < 15) || fuori.some((c) => M.dist(q, M.centro(c.poly)) < 18)) continue;
      alberi.push([q[0], q[1], r.range(0.9, 1.5)]);
    }
    alberi.sort((a, b) => a[1] - b[1]);
    svg += M.alberi(alberi, p, r);

    // Mura, torri e porte
    if (o.mura && muraPoly.length > 2 && p.muroPieno) {
      // Incisione: mura come un tratto nero pieno, torri a pallino, porte con il varco bianco
      svg += `<path d="${M.via(muraPoly)}" fill="none" stroke="${p.inchiostro}" stroke-width="7" stroke-linejoin="round"/>`;
      giro.forEach((t, k) => {
        if (porte.includes(t) || k % 2) return;
        const v = vertici[t];
        svg += `<circle cx="${M.n1(v[0])}" cy="${M.n1(v[1])}" r="8" fill="${p.inchiostro}"/>`;
      });
      porte.forEach((t, i) => {
        const v = vertici[t], l = stradeFuori[i], ang = Math.atan2(l[Math.min(5, l.length - 1)][1] - v[1], l[Math.min(5, l.length - 1)][0] - v[0]);
        svg += `<path d="${M.via(M.rettangolo(v[0], v[1], 16, 25, ang))}" fill="${p.inchiostro}"/><path d="${M.via(M.rettangolo(v[0], v[1], 18, 6.5, ang))}" fill="${p.strada}"/>`;
      });
    } else if (o.mura && muraPoly.length > 2) {
      const d = M.via(muraPoly);
      svg += `<path d="${d}" fill="none" stroke="${p.inchiostro}" stroke-width="10" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${p.carta2}" stroke-width="6.5" stroke-linejoin="round"/>`;
      giro.forEach((t, k) => {
        if (porte.includes(t)) return;
        const v = vertici[t], prec = vertici[giro[(k - 1 + giro.length) % giro.length]];
        if (M.dist(v, prec) < 14 && k) return;
        svg += `<circle cx="${M.n1(v[0])}" cy="${M.n1(v[1])}" r="8.5" fill="${p.carta2}" stroke="${p.inchiostro}" stroke-width="1.6"/><circle cx="${M.n1(v[0])}" cy="${M.n1(v[1])}" r="3.3" fill="none" stroke="${p.inchiostro}" stroke-width="0.8"/>`;
      });
      porte.forEach((t, i) => {
        const v = vertici[t], l = stradeFuori[i], ang = Math.atan2(l[Math.min(5, l.length - 1)][1] - v[1], l[Math.min(5, l.length - 1)][0] - v[0]);
        svg += `<path d="${M.via(M.rettangolo(v[0], v[1], 22, 26, ang))}" fill="${p.carta2}" stroke="${p.inchiostro}" stroke-width="1.6"/>` +
          `<path d="${M.via(M.rettangolo(v[0], v[1], 24, 9, ang))}" fill="${p.strada}" stroke="${p.stradaBordo}" stroke-width="0.8"/>`;
      });
    }

    // Etichette
    let testi = '';
    const usate = [], pin = [];
    const metti = (x, y, t, st, nota, sottotipo) => {
      testi += M.etichetta(x, y, t, p, { aloneW: 4.5, ...st });
      // Si segna tutta la larghezza della scritta: i nomi dei rioni devono starne lontani
      const mezza = t.length * (st.size || 15) * 0.27;
      for (let u = -mezza; u < mezza; u += 22) usate.push([x + u, y - 5]);
      usate.push([x + mezza, y - 5]);
      pin.push({ x, y, label: t, note: nota || '', sottotipo: sottotipo || '' });
    };
    const SANTI = ['Sant\'Elmo', 'San Tarcisio', 'Santa Ilaria', 'San Bruno', 'Santa Oriana', 'San Leandro'];
    // Piazza e tempio sono vicini: i due nomi vanno da parti opposte, cosi' non si accavallano
    const tempioSotto = tempio && tempio.centro[1] > piazza.centro[1];
    metti(piazza.centro[0], piazza.centro[1] + (tempioSotto ? -24 : 34), 'Piazza del Mercato', { size: 17, peso: 600 }, 'Il cuore della città: mercato e fontana. Tutte le vie principali portano qui.');
    // Il pin punta al luogo vero, non alla scritta: cosi' non copre il nome
    Object.assign(pin[pin.length - 1], { x: piazza.centro[0], y: piazza.centro[1] });
    if (tempio) metti(tempio.centro[0], tempio.centro[1] + (tempioSotto ? 38 : -30), 'Tempio di ' + r.pick(SANTI), { size: 16, peso: 600, corsivo: true }, 'Il tempio principale, accanto alla piazza.');
    if (tempio) Object.assign(pin[pin.length - 1], { x: tempio.centro[0], y: tempio.centro[1], tipoLuogo: 'Tempio', genera: { tipo: 'dungeon', opzioni: { tema: 'tempio' } } });
    if (castello) metti(castello.centro[0], castello.centro[1] + 6, 'Castello', { size: 18, font: M.FONT_TITOLO, peso: 700 }, 'Sede del potere cittadino, con cinta muraria propria.');
    if (castello) Object.assign(pin[pin.length - 1], { tipoLuogo: 'Castello', y: castello.centro[1] - 12, genera: { tipo: 'dungeon', opzioni: { tema: 'fortezza' } } });
    if (o.mura) porte.forEach((t) => usate.push(vertici[t]));
    // Nomi dei rioni: grandi, spaziati, curvi sulla forma del quartiere
    const RIONI = ['Conciatori', 'Tintori', 'Fabbri', 'Pescatori', 'Vasai', 'Tessitori', 'Mercanti', 'Falegnami', 'Sellai', 'Corvi', 'Cordai', 'Speziali', 'Candelai', 'Bottai', 'Vecchia Porta', 'Pozzo Nero', 'Tre Ponti', 'Colle Alto'];
    const nomiRioni = r.shuffle(RIONI);
    semiRioni.filter((q) => q.celle.length > 1).forEach((q, i) => {
      const nomeR = nomiRioni[i % nomiRioni.length];
      const eti = (q.carattere === 'nobile' ? 'Alti ' : '') + nomeR;
      const nota = { nobile: 'Palazzi e giardini delle famiglie ricche.', poveri: 'Case piccole e fitte, vicoli stretti.' }[q.carattere] || 'Quartiere di botteghe e abitazioni.';
      const punti = q.celle.map((c) => c.centro);
      const size = { piccola: 19, media: 23, grande: 25 }[o.taglia] || 23, sp = 6;
      const base = M.curvaSuPunti(punti, eti.length * (size * 0.52 + sp), 0.07);
      let primaLettera = null;
      // Non sopra piazza, tempio, castello o un altro rione: se serve la scritta si sposta di lato
      for (const [dx, dy] of [[0, 0], [0, -30], [0, 30], [-36, 0], [36, 0], [-30, -30], [30, 30], [30, -30], [-30, 30], [0, -60], [0, 60]]) {
        const curva = base.map(([x, y]) => [x + dx, y + dy]);
        if (curva.some(([x, y]) => x < 60 || x > W - 60 || y < 110 || y > H - 40 || (x < 340 && y > H - 110) || (x > W - 190 && y > H - 190) || usate.some((u) => Math.hypot(u[0] - x, u[1] - y) < 42))) continue;
        testi += M.testoCurvo(curva, eti.toUpperCase(), p, { size, spazio: sp, colore: p.inchiostro, alone: p.carta, aloneW: 4.5, peso: 500, font: M.FONT_TESTO });
        curva.forEach((u) => usate.push(u));
        // Il pin sta subito prima della scritta, cosi' non ne copre le lettere
        const [a0, a1] = [curva[0], curva[1]], lg = M.dist(a0, a1) || 1;
        primaLettera = [a0[0] + (a0[0] - a1[0]) / lg * 18, a0[1] + (a0[1] - a1[1]) / lg * 18 + 6];
        break;
      }
      const c = M.centro(punti.length > 2 ? punti : [punti[0], punti[1], [punti[0][0] + 1, punti[0][1] + 1]]);
      pin.push({ x: primaLettera ? primaLettera[0] : c[0], y: primaLettera ? primaLettera[1] : c[1], label: 'Rione ' + eti, note: nota, sottotipo: '', genera: { tipo: 'abitazione', opzioni: { edificio: q.carattere === 'nobile' ? 'casa' : 'bottega' } } });
    });
    if (o.mura) {
      // Nome per direzione; se due porte guardano dalla stessa parte la seconda prende un nome proprio
      const ALTRE = r.shuffle(['Porta del Sale', 'Porta Vecchia', 'Porta dei Mercanti', 'Porta Reale', 'Porta delle Vigne']);
      const giaUsate = new Set();
      porte.forEach((t) => {
        const v = vertici[t], dx = v[0] - cx, dy = v[1] - cy, l = Math.hypot(dx, dy) || 1;
        let lab = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'Porta Est' : 'Porta Ovest') : (dy > 0 ? 'Porta Sud' : 'Porta Nord');
        if (giaUsate.has(lab)) lab = ALTRE.pop();
        giaUsate.add(lab);
        const x = Math.max(78, Math.min(W - 78, v[0] + dx / l * 46)), y = Math.max(46, Math.min(H - 42, v[1] + dy / l * 34 + 4));
        if (!(x < 340 && y > H - 110)) testi += M.etichetta(x, y, lab, p, { size: 15, corsivo: true, peso: 600 });
        pin.push({ x: v[0], y: v[1], label: lab, note: 'Porta nelle mura, con la strada che esce verso la campagna.', sottotipo: '', genera: { tipo: 'abitazione', opzioni: { edificio: 'torre' } } });
      });
    }
    if (fiume) {
      // Il nome corre lungo il fiume, nel tratto fuori citta'
      // Si cerca il tratto continuo piu' lungo: filtrando e basta si unirebbero i due capi, attraverso la citta'
      const adatto = (q) => dalCentro(q) > R * 1.12 && q[0] > 90 && q[0] < W - 90 && q[1] > 120 && q[1] < H - 70 && mare(q) < -30;
      let fuoriCitta = [], corrente = [];
      fiume.forEach((q) => { if (adatto(q)) { corrente.push(q); if (corrente.length > fuoriCitta.length) fuoriCitta = corrente; } else corrente = []; });
      if (fuoriCitta.length > 30) {
        const inizio = Math.floor((fuoriCitta.length - Math.min(34, fuoriCitta.length)) / 2), tratto = fuoriCitta.slice(inizio, inizio + 34);
        testi += M.testoCurvo(tratto, 'Fiume ' + M.nomeLuogo(r), p, { size: 17, spazio: 2, corsivo: true, colore: p.muroPieno ? p.carta : p.acquaInk, alone: p.muroPieno ? p.acquaInk : p.carta, aloneW: 2.5, peso: 500 });
      }
    }
    if (o.costa) {
      const sx = Math.max(150, Math.min(W - 150, 700 + mx * 500)), sy = Math.max(150, Math.min(H - 110, 500 + my * 370));
      if (mare([sx, sy]) > 30) testi += M.etichetta(sx, sy, 'Mare di ' + M.nomeLuogo(r), p, { size: 21, corsivo: true, colore: p.acquaInk, spazio: 3, alone: p.acqua, aloneW: 3 });
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
      svg: M.componi({ W, H, p, o, nome, sotto: { piccola: 'Cittadina', media: 'Città', grande: 'Grande città' }[o.taglia] || 'Città', corpo: svg, testi, rosa: true, semplice: !!p.muroPieno, scala: [66.7, { valore: 100, nome: 'metri' }, 3] }),
    };
  };

  return { citta };
})();

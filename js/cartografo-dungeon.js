/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   CARTOGRAFO-DUNGEON.JS — Generatore di dungeon "a pagina singola":
   pianta a inchiostro, anche ruotata di traverso, con muri spessi,
   roccia tratteggiata a spina di pesce, griglia a puntini, stanze
   rotonde vere, porte con gli stipiti e una storia che li introduce.
   ============================================================ */

const CartoDungeon = (() => {
  const M = CartoMotore, n1 = M.n1;

  const _livello = (o) => {
    const L = Math.max(0, o.livello || 0), N = Math.max(1, o.livelli || 1), multi = N > 1;
    const r = M.rng('dungeon:' + o.seme + (L ? '-L' + L : ''));
    const t = M.TONI_INTERNI[M.stileDi(o.palette)];
    const carta = M.cartaInterni(t);
    const tema = CartoTesti.TEMI_DUNGEON[o.tema] || CartoTesti.TEMI_DUNGEON.cripta;
    const conLegenda = o.legenda !== false;
    const quante = { piccolo: 6, medio: 10, grande: 15 }[o.taglia] || 10;
    // Il nome viene dal primo livello: tutti i livelli sono lo stesso dungeon
    const nome = o.nome || (L ? (() => { const r0 = M.rng('dungeon:' + o.seme); return r0.pick(tema.nome) + ' ' + M.nomeLuogo(r0, o.popolo); })() : r.pick(tema.nome) + ' ' + M.nomeLuogo(r, o.popolo));
    const storia = r.pick(CartoTesti.STORIE[o.tema] || CartoTesti.STORIE.cripta);
    const W = conLegenda ? 1400 : 1200, H = 1000, largoMappa = conLegenda ? 1020 : W;

    /* ── Pianta ── */
    const COL = 60, RIG = 60;
    const g = new Uint8Array(COL * RIG);
    const at = (x, y) => (x < 0 || y < 0 || x >= COL || y >= RIG ? 0 : g[y * COL + x]);
    const set = (x, y, v) => { g[y * COL + x] = v; };
    const stanze = [], porte = [], giunti = [];
    const inStanza = (s, x, y) => {
      if (x < s.x || y < s.y || x >= s.x + s.w || y >= s.y + s.h) return false;
      if (s.forma !== 'tonda') return true;
      const u = (x + 0.5 - s.x - s.w / 2) / (s.w / 2), v = (y + 0.5 - s.y - s.h / 2) / (s.h / 2);
      return u * u + v * v <= 1.02;
    };
    const posaStanza = (s) => {
      for (let j = s.y; j < s.y + s.h; j++) for (let i = s.x; i < s.x + s.w; i++) if (inStanza(s, i, j)) set(i, j, 1);
      s.id = stanze.length; stanze.push(s);
    };
    // Lo spazio delle scale d'ingresso, sotto la prima stanza, resta sempre libero
    const riservata = (x, y) => x >= 28 && x <= 32 && y >= 46 && y <= 50;
    const libera = (x, y, w, h) => {
      if (x < 2 || y < 2 || x + w >= COL - 2 || y + h >= RIG - 2) return false;
      for (let j = y - 1; j <= y + h; j++) for (let i = x - 1; i <= x + w; i++) if (at(i, j) || riservata(i, j)) return false;
      return true;
    };
    posaStanza({ x: 28, y: 42, w: 5, h: 4, forma: 'rett', gen: 0 });
    const DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (let prova = 0; prova < 4000 && stanze.length < quante; prova++) {
      const base = stanze[Math.floor(Math.pow(r.f(), 0.75) * stanze.length)];
      const dirI = r.int(0, 3), [dx, dy] = DIR[dirI];
      if (dirI === 2 && base.gen === 0) continue; // sotto la prima stanza ci sono le scale d'ingresso
      const mx = base.x + (base.w >> 1), my = base.y + (base.h >> 1);
      const ux = dx ? (dx > 0 ? base.x + base.w - 1 : base.x) : (base.forma === 'rett' ? r.int(base.x, base.x + base.w - 1) : mx);
      const uy = dy ? (dy > 0 ? base.y + base.h - 1 : base.y) : (base.forma === 'rett' ? r.int(base.y, base.y + base.h - 1) : my);
      if (!at(ux, uy) || (dx && !inStanza(base, ux, uy)) || (dy && !inStanza(base, ux, uy))) continue;
      // Stanze raccolte, a volte una galleria lunga e stretta, a volte una rotonda
      const k = r.f();
      let w, h, forma = 'rett';
      if (k < 0.16) { w = h = r.pick([5, 7]); forma = 'tonda'; }
      else if (k < 0.34) { if (r.chance(0.5)) { w = r.int(7, 10); h = r.int(2, 3); } else { w = r.int(2, 3); h = r.int(7, 10); } }
      else { w = r.int(3, 6); h = r.int(3, 6); }
      const lung = r.int(1, 5), ex = ux + dx * lung, ey = uy + dy * lung;
      const nx = dx ? (dx > 0 ? ex + 1 : ex - w) : (forma === 'tonda' ? ex - (w >> 1) : ex - r.int(0, w - 1));
      const ny = dy ? (dy > 0 ? ey + 1 : ey - h) : (forma === 'tonda' ? ey - (h >> 1) : ey - r.int(0, h - 1));
      if (forma === 'tonda' && dx && ((ey - ny) !== (h >> 1))) continue;
      if (!libera(nx, ny, w, h)) continue;
      let ok = true;
      for (let q = 1; q <= lung && ok; q++) {
        const cx = ux + dx * q, cy = uy + dy * q;
        if (at(cx, cy) || at(cx + dy, cy + dx) || at(cx - dy, cy - dx) || riservata(cx, cy)) ok = false;
      }
      if (!ok) continue;
      const s = { x: nx, y: ny, w, h, forma, gen: base.gen + 1 };
      if (!inStanza(s, ex + dx, ey + dy)) continue;
      posaStanza(s);
      for (let q = 1; q <= lung; q++) set(ux + dx * q, uy + dy * q, 2);
      const tipo = r.f();
      const bordo = (cx, cy) => ({ x: dx > 0 ? cx + 1 : cx, y: dy > 0 ? cy + 1 : cy, oriz: !!dx });
      porte.push({ ...bordo(ux, uy), tipo: tipo < 0.5 ? 'porta' : tipo < 0.72 ? 'arco' : tipo < 0.88 ? 'chiusa' : 'grata' });
      if (lung > 1 && r.chance(0.5)) porte.push({ ...bordo(ex, ey), tipo: 'porta' });
      giunti.push(bordo(ux, uy), bordo(ex, ey));
    }
    // Passaggi in piu' tra stanze vicine, spesso segreti: un dungeon con una sola strada annoia
    let anelli = 0;
    for (const a of r.shuffle(stanze)) {
      if (anelli >= Math.ceil(quante / 4)) break;
      for (const [dx, dy] of r.shuffle(DIR)) {
        let x = a.x + (a.w >> 1), y = a.y + (a.h >> 1);
        while (at(x, y) === 1 && inStanza(a, x, y)) { x += dx; y += dy; }
        const tratto = [];
        while (tratto.length < 7 && !at(x, y) && !riservata(x, y) && x > 1 && y > 1 && x < COL - 2 && y < RIG - 2 && !at(x + dy, y + dx) && !at(x - dy, y - dx)) { tratto.push([x, y]); x += dx; y += dy; }
        if (tratto.length >= 1 && at(x, y) === 1) {
          tratto.forEach(([u, v]) => set(u, v, 2));
          const [q0x, q0y] = tratto[0];
          const bordoA = { x: dx < 0 ? q0x + 1 : q0x, y: dy < 0 ? q0y + 1 : q0y, oriz: !!dx };
          porte.push({ ...bordoA, tipo: r.chance(0.6) ? 'segreta' : 'porta' });
          giunti.push(bordoA, { x: dx > 0 ? x : x + 1, y: dy > 0 ? y : y + 1, oriz: !!dx });
          anelli++;
          break;
        }
      }
    }

    /* ── Impaginazione: la pianta si adatta allo spazio, anche di traverso ── */
    let minX = COL, minY = RIG, maxX = 0, maxY = 0;
    for (let y = 0; y < RIG; y++) for (let x = 0; x < COL; x++) if (at(x, y)) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + 1); maxY = Math.max(maxY, y + 1); }
    maxY += 2; // le scale d'ingresso
    const bw = maxX - minX, bh = maxY - minY;
    const ang = o.rotazione === 'dritto' ? 0 : o.rotazione === 'traverso' ? r.pick([45, -45]) : (r.chance(0.5) ? r.pick([45, -45]) : 0);
    const rad = ang * Math.PI / 180, cR = Math.cos(rad), sR = Math.sin(rad);
    const areaW = largoMappa - 90, areaH = H - 250;
    // Ingombro vero della pianta ruotata (cella per cella): di traverso non resta spazio sprecato
    let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
    const misura = (x, y) => { const u = x * cR - y * sR, v = x * sR + y * cR; uMin = Math.min(uMin, u); uMax = Math.max(uMax, u); vMin = Math.min(vMin, v); vMax = Math.max(vMax, v); };
    for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) if (at(x, y) || y >= maxY - 2) { if (at(x, y) || (x >= stanze[0].x && x <= stanze[0].x + 4)) { misura(x, y); misura(x + 1, y + 1); misura(x + 1, y); misura(x, y + 1); } }
    const S = Math.min(38, areaW / (uMax - uMin + 3.4), areaH / (vMax - vMin + 3.4));
    const cxM = largoMappa / 2, cyM = 142 + areaH / 2 + 12;
    const ccx = ((uMin + uMax) / 2) * cR + ((vMin + vMax) / 2) * sR, ccy = -((uMin + uMax) / 2) * sR + ((vMin + vMax) / 2) * cR;
    const schermo = (x, y) => {
      const u = (x - ccx) * S, v = (y - ccy) * S, c = Math.cos(rad), s = Math.sin(rad);
      return [cxM + u * c - v * s, cyM + u * s + v * c];
    };
    const px = (c) => c * S, py = (c) => c * S;
    const I = t.ink;
    const tonde = stanze.filter((s) => s.forma === 'tonda');
    const inTonda = (x, y) => tonde.find((s) => inStanza(s, x, y) && at(x, y) === 1);
    // Vero se il punto (in celle) cade su un pavimento
    const suPavimento = (x, y) => {
      const cx = Math.floor(x), cy = Math.floor(y);
      if (!at(cx, cy)) return false;
      const tn = inTonda(cx, cy);
      return tn ? Math.hypot(x - tn.x - tn.w / 2, y - tn.y - tn.h / 2) <= tn.w / 2 : true;
    };

    /* ── Roccia: grigio sfumato vicino ai muri e gruppi di tratti incrociati ── */
    const dista1 = (x, y) => { for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (at(x + a, y + b)) return true; return false; };
    let fondo = '', tratti = '', tratti2 = '';
    const gruppo = (cx, cy, ang2, n, lung, passo) => {
      const c = Math.cos(ang2), s = Math.sin(ang2);
      let d = '';
      for (let k = -n; k <= n; k++) {
        const mx = cx - s * k * passo, my = cy + c * k * passo, l = lung * r.range(0.8, 1.15);
        const a = [mx - c * l, my - s * l], b = [mx + c * l, my + s * l];
        if (suPavimento(a[0], a[1]) || suPavimento(b[0], b[1]) || suPavimento(mx, my)) continue;
        d += `M${n1(px(a[0]))} ${n1(py(a[1]))}L${n1(px(b[0]))} ${n1(py(b[1]))}`;
      }
      return d;
    };
    for (let y = minY - 2; y <= maxY + 1; y++) for (let x = minX - 2; x <= maxX + 1; x++) {
      if (at(x, y) || !dista1(x, y)) continue;
      fondo += `M${px(x)} ${py(y)}h${S}v${S}h${-S}Z`;
      const a0 = r.range(0, Math.PI);
      tratti += gruppo(x + 0.3, y + 0.3, a0, 2, 0.3, 0.13) + gruppo(x + 0.72, y + 0.68, a0 + 1.2, 2, 0.3, 0.13);
      // Una seconda frangia che sporge verso l'esterno, per un bordo irregolare
      for (const [a, b] of DIR) {
        if (dista1(x + a, y + b) || !r.chance(0.8)) continue;
        tratti2 += gruppo(x + 0.5 + a * 0.62, y + 0.5 + b * 0.62, Math.atan2(b, a) + r.range(-0.5, 0.5), 2, 0.26, 0.15);
      }
    }
    tonde.forEach((s) => {
      const cx = s.x + s.w / 2, cy = s.y + s.h / 2, rr = s.w / 2;
      fondo += `M${px(cx - rr - 1)} ${py(cy)}a${S * (rr + 1)} ${S * (rr + 1)} 0 1 0 ${S * (rr + 1) * 2} 0a${S * (rr + 1)} ${S * (rr + 1)} 0 1 0 ${-S * (rr + 1) * 2} 0Z`;
      for (let a = 0; a < 6.28; a += 0.75 / rr) {
        tratti += gruppo(cx + Math.cos(a) * (rr + 0.42), cy + Math.sin(a) * (rr + 0.42), a + r.range(-0.6, 0.6), 2, 0.28, 0.13);
      }
    });
    let g0 = `<path d="${fondo}" fill="${t.roccia}" stroke="${t.roccia}" stroke-width="${n1(S * 0.7)}" stroke-linejoin="round"/><path d="${fondo}" fill="url(#carto-sassi)" stroke="url(#carto-sassi)" stroke-width="${n1(S * 0.7)}" stroke-linejoin="round"/>`;

    /* ── Pavimenti, ombra interna, griglia ── */
    let pav = '', muri = '';
    for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) {
      if (!at(x, y)) continue;
      const tn = inTonda(x, y), a = px(x), b = py(y);
      if (tn) continue;
      pav += `M${n1(a)} ${n1(b)}h${n1(S)}v${n1(S)}h${n1(-S)}Z`;
      if (!at(x, y - 1)) muri += `M${n1(a)} ${n1(b)}h${n1(S)}`;
      if (!at(x, y + 1)) muri += `M${n1(a)} ${n1(b + S)}h${n1(S)}`;
      if (!at(x - 1, y)) muri += `M${n1(a)} ${n1(b)}v${n1(S)}`;
      if (!at(x + 1, y)) muri += `M${n1(a + S)} ${n1(b)}v${n1(S)}`;
    }
    const circoli = tonde.map((s) => { const c = s.w / 2 * S, x = px(s.x), y = py(s.y + s.h / 2); return `M${n1(x)} ${n1(y)}a${n1(c)} ${n1(c)} 0 1 0 ${n1(c * 2)} 0a${n1(c)} ${n1(c)} 0 1 0 ${n1(-c * 2)} 0Z`; }).join('');
    g0 += `<clipPath id="carto-pav"><path d="${pav}${circoli}"/></clipPath><path d="${pav}${circoli}" fill="${t.pavimento}"/>`;
    let griglia = '';
    if (o.griglia !== false) {
      for (let x = minX; x <= maxX; x++) griglia += `M${px(x)} ${py(minY)}V${py(maxY)}`;
      for (let y = minY; y <= maxY; y++) griglia += `M${px(minX)} ${py(y)}H${px(maxX)}`;
    }
    g0 += `<g clip-path="url(#carto-pav)"><path d="${muri}${circoli}" fill="none" stroke="${t.ombra}" stroke-width="${n1(S * 0.34)}" filter="url(#carto-b4)" opacity="${t.stile === 'notte' ? 0.6 : 0.3}"/><path d="${griglia}" fill="none" stroke="${I}" stroke-width="${n1(Math.max(1.3, S * 0.055))}" stroke-dasharray="0.1 ${n1(S / 5)}" stroke-linecap="round"/></g>`;

    /* ── Arredi ── */
    const elenco = r.shuffle(tema.stanze);
    const dati = stanze.map((s, i) => elenco[i % elenco.length].slice());
    const liscio = (p, f = t.pietra, sw = 1.5) => `<path d="${p}" fill="${f}" stroke="${I}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    const cerchio = (x, y, q, f = t.pietra, sw = 1.5) => `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(q)}" fill="${f}" stroke="${I}" stroke-width="${sw}"/>`;
    const quadro = (x, y, l, h, f = t.pietra, sw = 1.5) => `<rect x="${n1(x - l / 2)}" y="${n1(y - h / 2)}" width="${n1(l)}" height="${n1(h)}" fill="${f}" stroke="${I}" stroke-width="${sw}"/>`;
    const sassolino = (x, y, q) => `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(q)}" ry="${n1(q * 0.72)}" transform="rotate(${r.int(0, 170)} ${n1(x)} ${n1(y)})" fill="${t.pavimento}" stroke="${I}" stroke-width="1.1"/>`;
    const arredo = (tipo, s) => {
      const cx = px(s.x + s.w / 2), cy = py(s.y + s.h / 2), q = S * 0.9;
      switch (tipo) {
        case 'colonne': {
          let u = '';
          if (s.forma === 'tonda') { for (let a = 0; a < 6.28; a += 6.283 / 6) u += cerchio(cx + Math.cos(a) * s.w * S * 0.3, cy + Math.sin(a) * s.w * S * 0.3, S * 0.2); return u; }
          const lungo = s.w >= s.h;
          const passi = Math.max(2, Math.floor((lungo ? s.w : s.h) / 2));
          for (let i = 0; i < passi; i++) {
            const f = (i + 0.5) / passi;
            if (lungo) { u += cerchio(px(s.x + f * s.w), py(s.y + 0.6), S * 0.2); if (s.h > 2) u += cerchio(px(s.x + f * s.w), py(s.y + s.h - 0.6), S * 0.2); }
            else { u += cerchio(px(s.x + 0.6), py(s.y + f * s.h), S * 0.2); if (s.w > 2) u += cerchio(px(s.x + s.w - 0.6), py(s.y + f * s.h), S * 0.2); }
          }
          return u;
        }
        case 'bara': return liscio(`M${n1(cx - q * 0.75)} ${n1(cy - q * 0.4)}H${n1(cx + q)}V${n1(cy + q * 0.4)}H${n1(cx - q * 0.75)}L${n1(cx - q * 1.1)} ${n1(cy)}Z`) + `<path d="M${n1(cx - q * 0.3)} ${n1(cy)}H${n1(cx + q * 0.7)}M${n1(cx + q * 0.2)} ${n1(cy - q * 0.24)}V${n1(cy + q * 0.24)}" stroke="${I}" stroke-width="1.3"/>`;
        case 'altare': return `<path d="M${n1(cx - q * 1.3)} ${n1(cy + q * 0.1)}a${n1(q * 1.3)} ${n1(q * 1.3)} 0 0 1 ${n1(q * 2.6)} 0" fill="none" stroke="${I}" stroke-width="1.2"/><path d="M${n1(cx - q * 1)} ${n1(cy + q * 0.1)}a${n1(q)} ${n1(q)} 0 0 1 ${n1(q * 2)} 0" fill="none" stroke="${I}" stroke-width="1.2"/>` + quadro(cx, cy - q * 0.2, q, q * 0.56, t.pietra) + `<path d="M${n1(cx - q * 0.3)} ${n1(cy - q * 0.2)}H${n1(cx + q * 0.3)}M${n1(cx)} ${n1(cy - q * 0.4)}V${n1(cy)}" stroke="${I}" stroke-width="1.2"/>`;
        case 'statua': return quadro(cx, cy, q * 0.95, q * 0.95, t.pietra) + cerchio(cx, cy, q * 0.28, t.pavimento);
        case 'pozzo': return cerchio(cx, cy, q * 0.62, t.pietra, 1.7) + cerchio(cx, cy, q * 0.4, t.acqua, 1.5) + `<path d="M${n1(cx - q * 0.22)} ${n1(cy)}q${n1(q * 0.11)} ${n1(-q * 0.12)} ${n1(q * 0.22)} 0t${n1(q * 0.22)} 0" fill="none" stroke="${t.acquaInk}" stroke-width="1"/>`;
        case 'baule': return quadro(cx, cy, q * 0.95, q * 0.58, t.legno) + `<path d="M${n1(cx - q * 0.47)} ${n1(cy - q * 0.05)}H${n1(cx + q * 0.47)}" stroke="${I}" stroke-width="1"/>` + quadro(cx, cy - q * 0.05, q * 0.18, q * 0.22, t.metallo, 1);
        case 'tavolo': return quadro(cx, cy, q * 1.8, q * 0.74, t.legno) + [-0.6, 0, 0.6].map((f) => cerchio(cx + f * q, cy - q * 0.62, q * 0.14, t.pavimento, 1) + cerchio(cx + f * q, cy + q * 0.62, q * 0.14, t.pavimento, 1)).join('');
        case 'letti': {
          let u = '';
          const n = Math.max(1, Math.min(4, Math.floor(s.w / 1.5)));
          for (let i = 0; i < n; i++) { const x = px(s.x + (i + 0.5) * s.w / n), y = py(s.y) + S * 0.72; u += quadro(x, y, S * 0.72, S * 1.2, t.legno, 1.2) + quadro(x, y - S * 0.38, S * 0.56, S * 0.28, t.pavimento, 1); }
          return u;
        }
        case 'botti': {
          let u = '';
          // Le botti si appoggiano al muro in fondo: solo dove c'e' davvero pavimento
          for (let i = s.x; i < s.x + s.w; i++) { if (!inStanza(s, i, s.y)) continue; const x = px(i + 0.5), y = py(s.y + 0.52); u += cerchio(x, y, S * 0.33, t.legno, 1.2) + cerchio(x, y, S * 0.15, 'none', 0.9); }
          return u;
        }
        case 'macerie': {
          let u = '';
          for (let i = 0; i < 12 + s.w * s.h / 3; i++) {
            const x = s.x + r.range(0.3, s.w - 0.3), y = s.y + r.range(0.3, s.h - 0.3);
            if (suPavimento(x, y)) u += sassolino(px(x), py(y), r.range(S * 0.07, S * 0.2));
          }
          return u;
        }
        default: return '';
      }
    };
    stanze.forEach((s, i) => { g0 += arredo(dati[i][2], s); });
    // Piccoli dettagli sparsi su tutti i pavimenti, e qualche pozza in un angolo
    stanze.forEach((s) => {
      for (let i = 0; i < 3; i++) {
        const x = s.x + r.range(0.25, s.w - 0.25), y = s.y + r.range(0.25, s.h - 0.25);
        if (suPavimento(x, y)) g0 += sassolino(px(x), py(y), r.range(S * 0.05, S * 0.11));
      }
    });
    for (const s of r.shuffle(stanze).slice(0, Math.max(1, quante >> 3))) {
      if (s.forma !== 'rett' || s.w < 3 || s.h < 3 || s.gen === 0) continue;
      const q = S * Math.min(s.w, s.h) * 0.42, cx = px(r.chance(0.5) ? s.x : s.x + s.w), cy = py(r.chance(0.5) ? s.y : s.y + s.h), sx = cx === px(s.x) ? 1 : -1, sy = cy === py(s.y) ? 1 : -1;
      g0 += `<clipPath id="carto-angolo${s.id}"><rect x="${n1(px(s.x))}" y="${n1(py(s.y))}" width="${n1(s.w * S)}" height="${n1(s.h * S)}"/></clipPath><path clip-path="url(#carto-angolo${s.id})" d="M${n1(cx)} ${n1(cy)}h${n1(sx * q * 1.5)}q${n1(-sx * q * 0.1)} ${n1(sy * q * 0.55)} ${n1(-sx * q * 0.55)} ${n1(sy * q * 0.65)}t${n1(-sx * q * 0.4)} ${n1(sy * q * 0.65)}q${n1(-sx * q * 0.1)} ${n1(sy * q * 0.1)} ${n1(-sx * q * 0.55)} ${n1(sy * q * 0.1)}Z" fill="${t.acqua}" stroke="${I}" stroke-width="1.4"/>`;
    }

    /* ── Muri, varchi, porte ── */
    g0 += `<path d="${muri}" fill="none" stroke="${I}" stroke-width="${n1(Math.max(3.5, S * 0.16))}" stroke-linecap="square"/>`;
    tonde.forEach((s) => { const c = s.w / 2 * S, x = px(s.x + s.w / 2), y = py(s.y + s.h / 2); g0 += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(c)}" fill="none" stroke="${I}" stroke-width="${n1(Math.max(3.5, S * 0.16))}"/>`; });
    // I varchi tagliano il muro delle rotonde, dove un corridoio ci entra
    giunti.forEach((d) => {
      const a = px(d.x), b = py(d.y), m = S * 0.3;
      if (!inTonda(d.oriz ? d.x : d.x, d.oriz ? d.y : d.y) && !inTonda(d.oriz ? d.x - 1 : d.x, d.oriz ? d.y : d.y - 1)) return;
      g0 += d.oriz ? `<rect x="${n1(a - m)}" y="${n1(b + 2)}" width="${n1(m * 2)}" height="${n1(S - 4)}" fill="${t.pavimento}"/>` : `<rect x="${n1(a + 2)}" y="${n1(b - m)}" width="${n1(S - 4)}" height="${n1(m * 2)}" fill="${t.pavimento}"/>`;
    });
    porte.forEach((d) => {
      const a = px(d.x), b = py(d.y), w = S, sp = Math.max(4, S * 0.2);
      // Gli stipiti: due blocchi neri ai lati del varco, sporgenti, che fanno sembrare vera la porta
      const stipiti = d.oriz
        ? `<rect x="${n1(a - sp / 2)}" y="${n1(b - sp * 0.3)}" width="${n1(sp)}" height="${n1(sp * 0.9)}" fill="${I}"/><rect x="${n1(a - sp / 2)}" y="${n1(b + w - sp * 0.6)}" width="${n1(sp)}" height="${n1(sp * 0.9)}" fill="${I}"/>`
        : `<rect x="${n1(a - sp * 0.3)}" y="${n1(b - sp / 2)}" width="${n1(sp * 0.9)}" height="${n1(sp)}" fill="${I}"/><rect x="${n1(a + w - sp * 0.6)}" y="${n1(b - sp / 2)}" width="${n1(sp * 0.9)}" height="${n1(sp)}" fill="${I}"/>`;
      if (d.tipo === 'segreta') {
        g0 += d.oriz ? `<path d="M${n1(a)} ${n1(b)}v${n1(w)}" stroke="${I}" stroke-width="${n1(sp * 0.9)}"/>` : `<path d="M${n1(a)} ${n1(b)}h${n1(w)}" stroke="${I}" stroke-width="${n1(sp * 0.9)}"/>`;
        return;
      }
      if (d.tipo === 'arco') { g0 += stipiti; return; }
      const f = d.tipo === 'grata' ? t.pavimento : t.legno;
      g0 += d.oriz
        ? `<rect x="${n1(a - sp * 0.35)}" y="${n1(b + sp * 0.4)}" width="${n1(sp * 0.7)}" height="${n1(w - sp * 0.8)}" fill="${f}" stroke="${I}" stroke-width="1.2"/>`
        : `<rect x="${n1(a + sp * 0.4)}" y="${n1(b - sp * 0.35)}" width="${n1(w - sp * 0.8)}" height="${n1(sp * 0.7)}" fill="${f}" stroke="${I}" stroke-width="1.2"/>`;
      if (d.tipo === 'grata') for (let k = 1; k < 4; k++) g0 += d.oriz ? `<path d="M${n1(a - sp * 0.35)} ${n1(b + k * w / 4)}h${n1(sp * 0.7)}" stroke="${I}" stroke-width="1"/>` : `<path d="M${n1(a + k * w / 4)} ${n1(b - sp * 0.35)}v${n1(sp * 0.7)}" stroke="${I}" stroke-width="1"/>`;
      if (d.tipo === 'chiusa') g0 += `<circle cx="${n1(d.oriz ? a : a + w / 2)}" cy="${n1(d.oriz ? b + w / 2 : b)}" r="${n1(sp * 0.28)}" fill="${I}"/>`;
      g0 += stipiti;
    });

    /* ── Scale ── */
    const scala = (x, y, w, h, scende) => {
      let u = `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" fill="${t.pavimento}" stroke="${I}" stroke-width="${n1(Math.max(2, S * 0.09))}"/>`;
      for (let i = 1; i < 6; i++) u += `<path d="M${n1(x)} ${n1(y + i * h / 6)}h${n1(w)}" stroke="${I}" stroke-width="${n1(scende ? 2.4 - i * 0.3 : 0.7 + i * 0.3)}"/>`;
      return u;
    };
    const prima = stanze[0], ingX = prima.x + (prima.w >> 1);
    g0 += scala(px(ingX) - S * 0.5, py(prima.y + prima.h), S * 2, S * 1.5, false);
    const lontana = stanze.slice(1).sort((a, b) => b.gen - a.gen).find((s) => s.forma === 'rett' && s.w >= 4 && s.h >= 4) || stanze.slice(1).find((s) => s.forma === 'rett' && s.w >= 3 && s.h >= 3);
    // L'ultimo livello non scende piu'
    if (lontana && !(multi && L === N - 1)) {
      g0 += scala(px(lontana.x + lontana.w - 2), py(lontana.y + lontana.h - 1.5), S * 2, S * 1.5, true);
      dati[lontana.id][1] += multi ? ' Scale che scendono al livello ' + (L + 2) + '.' : ' Scale verso il livello inferiore.';
    }
    if (multi && L > 0) dati[0][1] += ' Qui arrivano le scale dal livello ' + L + '.';

    /* ── Testi: si scrivono diritti anche se la pianta e' ruotata ── */
    let testi = '';
    const voci = [], pin = [];
    // Di traverso la scritta resta orizzontale: va piu' lontana, per non toccare le scale
    const pIng = schermo(ingX + 0.5, prima.y + prima.h + (ang ? 3.1 : 2.2));
    testi += M.etichetta(pIng[0], pIng[1], multi && L > 0 ? 'Dal livello ' + L : 'Ingresso', carta, { size: 17, corsivo: t.stile !== 'notte', colore: I, alone: t.sfondo, aloneW: 3.5 });
    stanze.forEach((s, i) => {
      // Il numero sta dove non c'e' l'arredo: le colonne corrono lungo i muri, il resto sta al centro
      const arr = dati[i][2];
      let quartoX, quartoY;
      if (arr === 'colonne' || (s.forma === 'tonda' && arr === 'macerie')) { quartoX = s.x + s.w / 2; quartoY = s.y + s.h / 2; }
      else if (s.forma === 'tonda') { quartoX = s.x + s.w / 2; quartoY = s.y + 1; }
      else if (arr === 'letti' || arr === 'botti') { quartoX = s.x + s.w / 2; quartoY = s.y + s.h - 0.75; }
      else if (s.w >= 4 && s.h >= 4) { quartoX = s.x + 0.9; quartoY = s.y + 0.9; }
      else if (s.w >= s.h) { quartoX = s.x + 0.6; quartoY = s.y + s.h / 2; }
      else { quartoX = s.x + s.w / 2; quartoY = s.y + 0.6; }
      const [x, y] = schermo(quartoX, quartoY);
      if (conLegenda) testi += M.numeroTondo(x, y, i + 1, { numeroFondo: t.numero, numeroTesto: t.stile === 'notte' && !t.chiaro ? '#0e1d26' : '#ffffff' }, Math.max(12, S * 0.5));
      const trappola = o.trappole !== false && i > 0 && r.chance(0.26) ? ' ' + r.pick(CartoTesti.TRAPPOLE) : '';
      const titolo = i === 0 ? (multi && L > 0 ? 'Arrivo: ' : 'Ingresso: ') + dati[i][0].toLowerCase() : dati[i][0];
      voci.push({ n: i + 1, titolo, testo: dati[i][1] + trappola });
      pin.push({ x, y: y - 10, label: (i + 1) + '. ' + titolo, note: dati[i][1] + trappola, sottotipo: trappola ? 'pericolo' : (dati[i][2] === 'baule' ? 'tesoro' : 'nota') });
    });
    if (porte.some((d) => d.tipo === 'segreta')) voci.push({ titolo: 'Tratto spesso senza stipiti = porta segreta', testo: '' });

    /* ── Composizione finale ── */
    let svg = M.apri(W, H, carta, o.seme);
    svg += `<g transform="translate(${n1(cxM)} ${n1(cyM)}) rotate(${ang}) translate(${n1(-ccx * S)} ${n1(-ccy * S)})">${g0}</g>`;
    if (o.nomi !== false) svg += testi;
    if (conLegenda) svg += M.legenda(W - 348, 36, 316, H - 72, 'Le stanze', voci, { ...carta, numeroFondo: t.numero, numeroTesto: t.stile === 'notte' && !t.chiaro ? '#0e1d26' : '#ffffff' });
    if (o.titolo !== false) {
      svg += M.etichetta(cxM, 72, nome + (multi ? ' · Livello ' + (L + 1) : ''), carta, { size: 48, font: M.FONT_APP_TITOLI, peso: 400, aloneW: 6 });
      M.righe(storia, 86).forEach((riga, i) => { svg += M.etichetta(cxM, 104 + i * 24, riga, carta, { size: 17, font: M.FONT_APP_TESTO, peso: 500, colore: t.stile === 'notte' ? carta.ambra : I, aloneW: 4 }); });
    }
    svg += M.scala(50, H - 48, S * 5, { valore: 7.5, nome: 'metri' }, 2, carta) + M.chiudi(W, H, carta);
    /* ── Dati per i tavoli virtuali (Universal VTT): muri e porte in quadretti ── */
    const vtt = (() => {
      const muriV = [];
      for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) {
        if (!at(x, y) || inTonda(x, y)) continue;
        if (!at(x, y - 1)) muriV.push([x, y, x + 1, y]);
        if (!at(x, y + 1)) muriV.push([x, y + 1, x + 1, y + 1]);
        if (!at(x - 1, y)) muriV.push([x, y, x, y + 1]);
        if (!at(x + 1, y)) muriV.push([x + 1, y, x + 1, y + 1]);
      }
      // Le stanze rotonde: un poligono, interrotto dove entra un corridoio
      tonde.forEach((s) => {
        const cx = s.x + s.w / 2, cy = s.y + s.h / 2, rr = s.w / 2, n = Math.max(16, Math.round(rr * 8));
        const varchi = giunti.map((d) => d.oriz ? [d.x, d.y + 0.5] : [d.x + 0.5, d.y]);
        for (let i = 0; i < n; i++) {
          const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
          const p = [cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr, cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr];
          const mx = (p[0] + p[2]) / 2, my = (p[1] + p[3]) / 2;
          if (varchi.some(([vx, vy]) => Math.hypot(mx - vx, my - vy) < 0.6)) continue;
          muriV.push(p);
        }
      });
      // Gli archi sono varchi aperti; le altre porte diventano porte del tavolo virtuale
      const porteV = porte.filter((d) => d.tipo !== 'arco').map((d) => ({ tipo: d.tipo, seg: d.oriz ? [d.x, d.y, d.x, d.y + 1] : [d.x, d.y, d.x + 1, d.y] }));
      const celle = [];
      for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) if (at(x, y)) celle.push([x, y]);
      return { S, ang, ox: cxM - ccx * S, oy: cyM - ccy * S, minX, minY, maxX, maxY, muri: muriV, porte: porteV, celle };
    })();
    return { nome, pin, W, H, larghezzaKm: W / S * 1.5 / 1000, svg, vtt }; // un quadretto = 1,5 metri
  };

  /* ── Piu' livelli: uno accanto all'altro sulla stessa mappa; per il tavolo virtuale e la stampa, uno alla volta ── */
  const dungeon = (o) => {
    const N = Math.max(1, Math.min(3, parseInt(o.livelli, 10) || 1));
    const nomiLivelli = Array.from({ length: N }, (_, i) => 'Livello ' + (i + 1));
    if (N === 1) return _livello({ ...o, livello: 0, livelli: 1 });
    if (Number.isInteger(o.soloLivello)) return { ..._livello({ ...o, livello: Math.min(N - 1, Math.max(0, o.soloLivello)), livelli: N }), pianiVtt: nomiLivelli };
    const livelli = nomiLivelli.map((_, i) => _livello({ ...o, livello: i, livelli: N }));
    const W1 = livelli[0].W, H1 = livelli[0].H, W = W1 * N, H = H1;
    // Ogni livello e' un SVG dentro l'SVG: gli id (ritagli, filtri, curve) prendono il prefisso del livello per non confondersi
    const dentro = livelli.map((m, i) => {
      const pre = 'L' + (i + 1) + '-';
      return m.svg.replace(/id="([^"]+)"/g, (_, x) => 'id="' + pre + x + '"').replace(/url\(#([^)]+)\)/g, (_, x) => 'url(#' + pre + x + ')').replace(/href="#([^"]+)"/g, (_, x) => 'href="#' + pre + x + '"')
        .replace(/^<svg\b/, '<svg x="' + (i * W1) + '" y="0"');
    }).join('');
    // Tra un livello e l'altro, una linea sottile
    let righe = '';
    for (let i = 1; i < N; i++) righe += '<path d="M' + (i * W1) + ' 30V' + (H - 30) + '" stroke="#000" stroke-opacity="0.25" stroke-width="3" stroke-dasharray="10 8"/>';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' + dentro + righe + '</svg>';
    const pin = livelli.flatMap((m, i) => m.pin.map((p) => ({ ...p, x: p.x + i * W1, label: 'L' + (i + 1) + ' · ' + p.label })));
    return { nome: livelli[0].nome, pin, W, H, larghezzaKm: livelli[0].larghezzaKm * N, svg, pianiVtt: nomiLivelli };
  };

  return { dungeon };
})();

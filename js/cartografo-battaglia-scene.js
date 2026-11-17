/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   CARTOGRAFO-BATTAGLIA-SCENE.JS — Le scene delle battle map oltre a
   bosco, ponte e locanda (che stanno in cartografo-battaglia.js).
   Ogni chiave e' una scena; "scena_impianto" e' una variante della
   stessa scena con una pianta diversa (non gli stessi oggetti spostati):
   il generatore ne sceglie una a caso. Ogni funzione riceve gli
   strumenti di disegno (k) e restituisce il nome della mappa.
   Le misure sono in quadretti da 1,5 m.
   ============================================================ */

const CartoBattagliaScene = (() => {
  const deg = (a) => a * 180 / Math.PI;
  const DUE = Math.PI * 2;

  /* ── Strumenti comuni ── */
  // Macchia irregolare: il disegno e il controllo "e' dentro?" seguono la stessa forma
  const blob = (k, cu, cw, ru, rw, irr = 0.25) => {
    const ph = k.r.range(0, 9);
    const f = (a) => 1 + (k.rn(Math.cos(a) * 1.3 + ph, Math.sin(a) * 1.3 + ph) - 0.5) * irr * 2;
    const q = [];
    for (let i = 0; i < 32; i++) { const a = i / 32 * DUE, m = f(a); q.push([k.X(cu + Math.cos(a) * ru * m), k.Y(cw + Math.sin(a) * rw * m)]); }
    return {
      d: k.M.via(k.M.morbida(q, 2, true)), cu, cw, ru, rw,
      dentro: (u, w, marg = 0) => { const x = (u - cu) / ru, y = (w - cw) / rw; return Math.hypot(x, y) < f(Math.atan2(y, x)) + marg / Math.min(ru, rw); },
    };
  };
  // Strada o sentiero: una o piu' linee spezzate riempite con un terreno
  const via = (k, id, linee, larg, pat) => {
    k.maschera(id, linee.map((l) => `<path d="${k.linea(l)}" fill="none" stroke="#fff" stroke-width="${k.n1(larg * k.S)}" stroke-linecap="round" stroke-linejoin="round" filter="url(#carto-b4)"/>`).join(''));
    k.L.terra += k.riempi(pat, id);
    return (u, w) => Math.min(...linee.map((l) => k.dist([u, w], l)));
  };
  const lineaMorbida = (k, pts, amp, seme) => {
    // Linea da A a B con qualche curva: punti ogni mezzo quadretto
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(L / 0.6));
      const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
      for (let j = 0; j < n; j++) {
        const t = j / n, off = (k.rn(t * L * 0.12 + seme + i * 3, seme) - 0.5) * amp * 2 * Math.sin(Math.PI * t);
        out.push([a[0] + (b[0] - a[0]) * t + nx * off, a[1] + (b[1] - a[1]) * t + ny * off]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  // Un edificio visto dal tetto: blocca la vista al tavolo virtuale se e' dritto sulla griglia
  const edificio = (k, nome, u, w, lato, rot) => {
    const im = k.img[nome], corto = lato * Math.min(im.w, im.h) / Math.max(im.w, im.h);
    let fw = im.w >= im.h ? lato : corto, fh = im.w >= im.h ? corto : lato;
    const r = ((Math.round(rot) % 360) + 360) % 360;
    if (r === 90 || r === 270) [fw, fh] = [fh, fw];
    k.L.alto += k.spr(nome, u, w, lato, rot);
    k.occupa(u, w, Math.max(fw, fh) * 0.55);
    if (r % 90 === 0) {
      const cl = (v, m) => Math.max(0, Math.min(m, v));
      const a = cl(Math.round(u - fw * 0.42), k.cols), b = cl(Math.round(w - fh * 0.42), k.rows), c = cl(Math.round(u + fw * 0.42), k.cols), d = cl(Math.round(w + fh * 0.42), k.rows);
      for (let x = a; x < c; x++) k.muri.push([x, b, x + 1, b], [x, d, x + 1, d]);
      for (let y = b; y < d; y++) k.muri.push([a, y, a, y + 1], [c, y, c, y + 1]);
    }
    return { fw, fh };
  };
  // Prova a mettere un oggetto in un punto libero che soddisfa "ok"
  const metti = (k, nome, ok, lato, opz = {}) => {
    const { strato = 'sopra', raggio = lato * 0.45, rot = null, area = [0.8, 0.8, k.cols - 0.8, k.rows - 0.8], tent = 60 } = opz;
    for (let i = 0; i < tent; i++) {
      const u = k.r.range(area[0], area[2]), w = k.r.range(area[1], area[3]);
      if (!ok(u, w) || !k.libero(u, w, raggio)) continue;
      k.L[strato] += k.spr(Array.isArray(nome) ? k.c(nome) : nome, u, w, lato, rot === null ? k.r.range(0, 360) : typeof rot === 'function' ? rot(u, w) : rot);
      k.occupa(u, w, raggio);
      return [u, w];
    }
    return null;
  };
  const posto = (k, ok, raggio = 0.5, area = [0.8, 0.8, k.cols - 0.8, k.rows - 0.8], tent = 80) => {
    for (let i = 0; i < tent; i++) { const u = k.r.range(area[0], area[2]), w = k.r.range(area[1], area[3]); if (ok(u, w) && k.libero(u, w, raggio)) return [u, w]; }
    return null;
  };
  const lanterne = (k, n, ok) => { for (let i = 0; i < n; i++) { const p = posto(k, ok, 0.6); if (p) lanterna(k, p[0], p[1]); } };
  // Mucchio di merci (casse, barili, sacchi) attorno a un punto
  const merci = (k, u, w, n, nomi = ['cassa', 'barile', 'sacchi', 'cassa']) => {
    for (let i = 0, messi = 0; i < n * 5 && messi < n; i++) {
      const a = k.r.range(0, DUE), d = k.r.range(0, 1.1), x = u + Math.cos(a) * d, y = w + Math.sin(a) * d;
      if (!k.libero(x, y, 0.36)) continue;
      k.L.sopra += k.spr(k.c(nomi), x, y, k.r.range(0.72, 0.95), k.r.range(0, 360)); k.occupa(x, y, 0.36); messi++;
    }
  };
  const bordo = (k, m) => (u, w) => u < m || w < m || u > k.cols - m || w > k.rows - m;
  // Un lato della mappa a caso, con un punto fuori dal bordo
  const fuori = (k, lato, t) => [[-1.5, k.rows * t], [k.cols + 1.5, k.rows * t], [k.cols * t, -1.5], [k.cols * t, k.rows + 1.5]][lato];
  const fuoco = (k, u, w, lato = 1.3) => {
    k.L.sopra += k.spr('fuoco-campo', u, w, lato, k.r.range(0, 360)); k.occupa(u, w, lato * 0.6);
    k.luce(u, w, 4.5, '#ffb347', 0.5);
  };
  const lanterna = (k, u, w) => { k.L.sopra += k.spr('lanterna', u, w, 1.1, k.r.range(-20, 20)); k.occupa(u, w, 0.4); k.luce(u, w, 3, '#ffd27a', 0.42); };
  // Cerchio di tende o carri attorno a un punto, girati verso il centro
  const anello = (k, nome, cu, cw, ru, rw, n, lato, scarto, ok = () => true, giro = 90) => {
    const a0 = k.r.range(0, DUE), messi = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + i / n * DUE + k.r.range(-scarto, scarto), u = cu + Math.cos(a) * ru, w = cw + Math.sin(a) * rw;
      if (!ok(u, w) || !k.libero(u, w, lato * 0.45)) continue;
      k.L.sopra += k.spr(Array.isArray(nome) ? k.c(nome) : nome, u, w, lato, deg(a) + giro + k.r.range(-10, 10)); k.occupa(u, w, lato * 0.48); messi.push([u, w, a]);
    }
    return messi;
  };
  // Campo coltivato: chiazza di erba secca a solchi
  const campo = (k, u, w, lu, lw, rot) => {
    const id = 'campo' + Math.round(u * 10) + '-' + Math.round(w * 10);
    let solchi = '';
    for (let y = -lw / 2 + 0.5; y < lw / 2; y += 0.75) solchi += `<rect x="${k.n1(k.X(u - lu / 2))}" y="${k.n1(k.Y(w + y))}" width="${k.n1(lu * k.S)}" height="${k.n1(k.S * 0.22)}" fill="#5a4326" opacity="0.28"/>`;
    k.L.terra += `<g transform="rotate(${k.n1(rot)} ${k.n1(k.X(u))} ${k.n1(k.Y(w))})"><rect x="${k.n1(k.X(u - lu / 2))}" y="${k.n1(k.Y(w - lw / 2))}" width="${k.n1(lu * k.S)}" height="${k.n1(lw * k.S)}" fill="url(#bm-p-terreno-erba-secca)" rx="${k.n1(k.S * 0.4)}" filter="url(#carto-b4)" data-c="${id}"/>${solchi}</g>`;
  };
  // Staccionata lungo una spezzata (pezzi da 3 quadretti), con varchi
  const recinto = (k, pts, varchi = [], nome = 'staccionata', pezzo = 3) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / pezzo)), ang = deg(Math.atan2(b[1] - a[1], b[0] - a[0]));
      for (let j = 0; j < n; j++) {
        const t = (j + 0.5) / n, u = a[0] + (b[0] - a[0]) * t, w = a[1] + (b[1] - a[1]) * t;
        if (varchi.some(([x, y]) => Math.hypot(x - u, y - w) < pezzo * 0.6)) continue;
        k.L.sopra += k.spr(nome, u, w, L / n + 0.15, ang);
      }
    }
  };
  // Pavimento di pietra o roccia fuori dalle stanze
  const roccia = (k) => {
    k.L.defs += k.pattern('terreno-fango', 4);
    k.L.terra += k.tutto('terreno-fango') + `<rect x="${k.X(0)}" y="${k.Y(0)}" width="${k.cols * k.S}" height="${k.rows * k.S}" fill="#0f0c0a" opacity="0.8"/>`;
  };

  /* ══════════════ ACCAMPAMENTO ══════════════ */
  const accampamento = (k) => {
    const { r, cols, rows } = k;
    const chi = r.pick(['briganti', 'cacciatori', 'avventurieri']);
    const nome = k.o.nome || { briganti: 'Il covo dei briganti di ', cacciatori: 'Il bivacco dei cacciatori di ', avventurieri: 'Il campo nella radura di ' }[chi] + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-erba', 5) + k.pattern('terreno-terra', 6, 90) + k.pattern('terreno-erba-secca', 5);
    k.L.terra += k.tutto('terreno-erba');
    const R = blob(k, cols * r.range(0.4, 0.6), rows * r.range(0.42, 0.58), cols * r.range(0.24, 0.3), rows * r.range(0.28, 0.34), 0.3);
    k.L.terra += `<path d="${R.d}" fill="url(#bm-p-terreno-erba-secca)" opacity="0.9" filter="url(#carto-b12)"/>`;
    const C = blob(k, R.cu, R.cw, R.ru * 0.55, R.rw * 0.55, 0.3);
    k.L.terra += `<path d="${C.d}" fill="url(#bm-p-terreno-terra)" opacity="0.85" filter="url(#carto-b4)"/>`;
    const lato = r.int(0, 3), sent = lineaMorbida(k, [[R.cu, R.cw], fuori(k, lato, r.range(0.3, 0.7))], 1.5, 4);
    const dS = via(k, 'sent', [sent], 1.8, 'terreno-terra');
    fuoco(k, R.cu, R.cw);
    k.segna(R.cu + 1.2, R.cw - 0.9, 'Fuoco', 'Luce fioca fino a 6 m. Chi ci finisce dentro prende danni da fuoco.');
    for (let i = 0; i < 3; i++) { const a = r.range(0, DUE); k.L.sotto += k.spr(k.c(['ceppo', 'panca', 'ceppo']), R.cu + Math.cos(a) * 1.7, R.cw + Math.sin(a) * 1.7, r.range(0.8, 1.6), deg(a) + 90); }
    const tende = anello(k, 'tenda', R.cu, R.cw, R.ru * 0.66, R.rw * 0.66, r.int(4, 5), 2.4, 0.25, (u, w) => dS(u, w) > 1.6);
    if (tende[0]) k.segna(tende[0][0], tende[0][1] - 1.6, 'Tende', 'Mezza copertura; chi dorme dentro è sorpreso facilmente.');
    const pr = metti(k, 'legnaia', (u, w) => R.dentro(u, w, -1) && !C.dentro(u, w) && dS(u, w) > 1.5, 1.6);
    if (pr) merci(k, pr[0] + 1.4, pr[1], 4);
    if (pr) k.segna(pr[0], pr[1] - 1.3, 'Provviste', 'Legna, casse e barili: mezza copertura.');
    if (chi === 'briganti') {
      const g = metti(k, 'gabbia', (u, w) => R.dentro(u, w, -0.8) && dS(u, w) > 1.6, 1.5);
      if (g) k.segna(g[0], g[1] - 1.2, 'Gabbia', 'Dentro c\'è un prigioniero. Il lucchetto si scassina (CD 15).');
      metti(k, 'rastrelliera', (u, w) => R.dentro(u, w, -0.5) && dS(u, w) > 1.5, 1.6);
      metti(k, 'carro-rovesciato', (u, w) => !R.dentro(u, w, 0.5) && dS(u, w) < 3 && dS(u, w) > 1.5, 3, { raggio: 1.5 });
      metti(k, 'tesoro', (u, w) => R.dentro(u, w, -1), 1);
    } else if (chi === 'cacciatori') {
      for (let i = 0; i < 2; i++) metti(k, 'ossa', (u, w) => R.dentro(u, w, -0.5), 1.1, { strato: 'sotto' });
      metti(k, 'rastrelliera', (u, w) => R.dentro(u, w, -0.5) && dS(u, w) > 1.5, 1.6);
      metti(k, 'barile', (u, w) => R.dentro(u, w), 0.8);
    } else {
      metti(k, 'carro', (u, w) => R.dentro(u, w, 0.6) && !R.dentro(u, w, -1.2) && dS(u, w) > 2, 3, { raggio: 1.5 });
      metti(k, 'baule', (u, w) => R.dentro(u, w, -0.5), 0.9);
      metti(k, 'cartello', (u, w) => dS(u, w) < 1.6 && dS(u, w) > 1 && !R.dentro(u, w), 1.3, { rot: 0 });
    }
    // Il tavolo da campo con le panche, e la legna tagliata
    const tv = posto(k, (u, w) => R.dentro(u, w, -1.4) && !C.dentro(u, w, 0.3) && dS(u, w) > 2.2, 1.8);
    if (tv) {
      const rot = r.pick([0, 90]);
      k.L.sotto += k.spr('panca', tv[0] + (rot ? 1.15 : 0), tv[1] + (rot ? 0 : 1.15), 2, rot) + k.spr('panca', tv[0] - (rot ? 1.15 : 0), tv[1] - (rot ? 0 : 1.15), 2, rot);
      k.L.sopra += k.spr('tavolo-lungo', tv[0], tv[1], 2.4, rot + 90); k.occupa(tv[0], tv[1], 1.8);
      k.segna(tv[0], tv[1] - 1.9, 'Tavolo da campo', 'Ci sono ancora piatti e boccali: chi stava mangiando è scappato in fretta.');
    }
    metti(k, 'ceppo', (u, w) => R.dentro(u, w, -0.5) && dS(u, w) > 1.4, 1);
    metti(k, 'sacchi', (u, w) => R.dentro(u, w, -0.5) && dS(u, w) > 1.4, 1);
    for (let i = 0; i < 3; i++) metti(k, ['barile', 'cassa', 'sacchi'], (u, w) => R.dentro(u, w, -0.3) && !C.dentro(u, w, -0.5) && dS(u, w) > 1.3, 0.85);
    k.sparsi(6, (u, w) => !R.dentro(u, w) && dS(u, w) > 1.3, k.CESPUGLI.concat(k.SASSI, ['cespuglio-giallo']), 0.7, 1.3);
    k.bosco((u, w) => !R.dentro(u, w, 1) && dS(u, w) > 2, 1, 0.5);
    return nome;
  };
  // Carovana: i carri chiusi in cerchio sulla strada, come un fortino
  const accampamento_carovana = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'La carovana ferma a ' + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-erba', 5) + k.pattern('terreno-terra', 6, 90) + k.pattern('terreno-erba-secca', 5);
    k.L.terra += k.tutto('terreno-erba');
    const wS = rows * r.range(0.3, 0.7), strada = lineaMorbida(k, [[-1.5, wS + r.range(-2, 2)], [cols + 1.5, wS + r.range(-2, 2)]], 2, 9);
    const dS = via(k, 'strada', [strada], 3, 'terreno-terra');
    const cu = cols * r.range(0.35, 0.65), cw = Math.max(5, Math.min(rows - 5, wS + r.pick([-1, 1]) * r.range(2, 3.5)));
    const R = blob(k, cu, cw, 5.2, 4.4, 0.15);
    k.L.terra += `<path d="${R.d}" fill="url(#bm-p-terreno-erba-secca)" opacity="0.8" filter="url(#carto-b12)"/>`;
    fuoco(k, cu, cw);
    k.segna(cu + 1.2, cw - 0.9, 'Fuoco', 'Luce fioca fino a 6 m.');
    const carri = anello(k, ['carro', 'carro', 'carro-fieno'], cu, cw, 3.9, 3.3, r.int(5, 6), 3.2, 0.12, () => true, 90);
    if (carri[0]) k.segna(carri[0][0], carri[0][1] - 1.6, 'Cerchio di carri', 'Tre quarti di copertura; tra un carro e l\'altro si passa uno alla volta.');
    for (let i = 0; i < 3; i++) { const a = r.range(0, DUE); merci(k, cu + Math.cos(a) * 2, cw + Math.sin(a) * 1.6, 3); }
    metti(k, 'tenda', (u, w) => !R.dentro(u, w, 0.8) && dS(u, w) > 2.4, 2.4, { area: [cu - 9, cw - 7, cu + 9, cw + 7] });
    metti(k, 'tenda', (u, w) => !R.dentro(u, w, 0.8) && dS(u, w) > 2.4, 2.4, { area: [cu - 9, cw - 7, cu + 9, cw + 7] });
    for (let i = 0; i < 2; i++) metti(k, 'balle-fieno', (u, w) => !R.dentro(u, w, 0.5) && dS(u, w) > 2, 1.4);
    const sc = metti(k, 'barile', (u, w) => R.dentro(u, w, -1.5) && k.libero(u, w, 1), 0.8);
    if (sc) k.segna(sc[0], sc[1] + 1, 'Merci', 'Casse e barili: mezza copertura. C\'è chi vorrebbe rubarle.');
    k.sparsi(6, (u, w) => !R.dentro(u, w, 1) && dS(u, w) > 1.8, k.CESPUGLI.concat(k.SASSI), 0.7, 1.3);
    k.bosco((u, w) => !R.dentro(u, w, 2.5) && dS(u, w) > 3 && (Math.abs(w - wS) > 6 || r.chance(0.3)), 0.8, 0.45);
    return nome;
  };
  // Avamposto militare: palizzata rettangolare, tende in file ordinate
  const accampamento_avamposto = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'L\'avamposto di ' + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-erba', 5) + k.pattern('terreno-terra', 6, 90) + k.pattern('terreno-fango', 4);
    k.L.terra += k.tutto('terreno-erba');
    const lu = Math.min(cols - 6, 15 + r.int(0, 3)), lw = Math.min(rows - 4, 10 + r.int(0, 2));
    const u0 = Math.round((cols - lu) / 2 + r.range(-1.5, 1.5)), w0 = Math.round((rows - lw) / 2 + r.range(-1, 1)), u1 = u0 + lu, w1 = w0 + lw;
    const dentro = (u, w) => u > u0 && u < u1 && w > w0 && w < w1;
    k.L.terra += `<rect x="${k.X(u0)}" y="${k.Y(w0)}" width="${lu * k.S}" height="${lw * k.S}" fill="url(#bm-p-terreno-terra)" opacity="0.92" filter="url(#carto-b4)"/>`;
    const portaU = u0 + lu / 2 + r.range(-2, 2), portaW = r.chance(0.5) ? w1 : w0;
    const sent = lineaMorbida(k, [[portaU, portaW], [portaU + r.range(-3, 3), portaW === w1 ? rows + 1.5 : -1.5]], 1, 5);
    const dS = via(k, 'sent', [sent], 2.2, 'terreno-terra');
    recinto(k, [[u0, w0], [u1, w0], [u1, w1], [u0, w1], [u0, w0]], [[portaU, portaW]]);
    k.segna(portaU + 1.8, portaW + (portaW === w1 ? 0.8 : -0.8), 'Palizzata', 'Mezza copertura; scavalcarla costa movimento extra. L\'unico varco è il cancello.');
    // Tende in due file, il fuoco in mezzo
    const fila = r.chance(0.5);
    for (let i = 0; i < 4; i++) {
      const u = u0 + 2 + i * (lu - 4) / 3;
      [w0 + 2, w1 - 2].forEach((w) => { if (k.libero(u, w, 1.2)) { k.L.sopra += k.spr('tenda', u, w, 2.3, (w < (w0 + w1) / 2 ? 180 : 0) + r.range(-4, 4)); k.occupa(u, w, 1.2); } });
    }
    k.segna(u0 + 2, w0 + 3.6, 'Tende dei soldati', 'In file ordinate: chi le attraversa di notte rischia di svegliare qualcuno.');
    fuoco(k, (u0 + u1) / 2 + (fila ? -3 : 3), (w0 + w1) / 2);
    const ru = (u0 + u1) / 2 + (fila ? 3 : -3), rw = (w0 + w1) / 2;
    k.L.sopra += k.spr('rastrelliera', ru, rw - 0.8, 1.8, 0) + k.spr('rastrelliera', ru, rw + 0.8, 1.8, 180); k.occupa(ru, rw, 1.4);
    k.segna(ru + 1.6, rw, 'Armeria', 'Lance e spade: chi ci arriva si arma in un\'azione.');
    merci(k, u1 - 1.5, w0 + (portaW === w0 ? lw - 1.5 : 1.5), 6);
    const fu = (u0 + u1) / 2 + (fila ? 3 : -3), fw = (w0 + w1) / 2 + (portaW === w0 ? 2.6 : -2.6);
    for (let j = -1; j <= 1; j++) if (k.libero(fu + j * 1.6, fw, 0.5)) { k.L.sopra += k.spr('spaventapasseri', fu + j * 1.6, fw, 1.3, 0); k.occupa(fu + j * 1.6, fw, 0.6); }
    k.segna(fu + 2.6, fw, 'Fantocci', 'Bersagli di paglia per gli allenamenti: mezza copertura.');
    metti(k, 'carro', dentro, 3, { raggio: 1.5, rot: 90, area: [u0 + 1.6, w0 + 2, u1 - 1.6, w1 - 2] });
    merci(k, u0 + 1.5, w0 + (portaW === w0 ? lw - 1.5 : 1.5), 5, ['barile', 'sacchi', 'cassa']);
    metti(k, 'legnaia', dentro, 1.6, { area: [u0 + 1, w0 + 1, u1 - 1, w1 - 1] });
    metti(k, 'carro', (u, w) => !dentro(u, w) && dS(u, w) < 3 && dS(u, w) > 1.5, 3, { raggio: 1.5 });
    metti(k, 'braciere', (u, w) => Math.hypot(u - portaU, w - portaW) < 2.2 && dentro(u, w), 0.9, { tent: 80 });
    const b = metti(k, 'braciere', (u, w) => Math.hypot(u - portaU, w - portaW) < 2.4 && dentro(u, w), 0.9, { tent: 80 });
    if (b) k.luce(b[0], b[1], 3.2);
    k.sparsi(5, (u, w) => !dentro(u, w) && dS(u, w) > 1.5 && !(u > u0 - 2 && u < u1 + 2 && w > w0 - 2 && w < w1 + 2), k.SASSI.concat(k.CESPUGLI), 0.6, 1.2);
    k.bosco((u, w) => !(u > u0 - 3.5 && u < u1 + 3.5 && w > w0 - 3.5 && w < w1 + 3.5) && dS(u, w) > 2, 0.8, 0.6);
    return nome;
  };

  /* ══════════════ ROVINE ══════════════ */
  const _rovinePav = (k, cu, cw, lu, lw) => {
    k.L.defs += k.pattern('terreno-erba', 5) + k.pattern('terreno-pietra', 3) + k.pattern('terreno-erba-secca', 5);
    k.L.terra += k.tutto('terreno-erba');
    k.L.terra += `<rect x="${k.n1(k.X(cu - lu))}" y="${k.n1(k.Y(cw - lw))}" width="${k.n1(lu * 2 * k.S)}" height="${k.n1(lw * 2 * k.S)}" fill="url(#bm-p-terreno-pietra)"/>`;
    let erbacce = '';
    for (let i = 0; i < 14; i++) { const b = blob(k, cu + k.r.range(-lu, lu), cw + k.r.range(-lw, lw), k.r.range(0.6, 1.8), k.r.range(0.5, 1.3), 0.45); erbacce += `<path d="${b.d}"/>`; }
    k.L.terra += `<g fill="url(#bm-p-terreno-erba)" opacity="0.9" filter="url(#carto-b4)">${erbacce}</g>`;
  };
  const _muriRotti = (k, cu, cw, lu, lw, buco = 0.35, varco = -1) => {
    const lati = [[cu, cw - lw, 0, lu * 2], [cu, cw + lw, 180, lu * 2], [cu - lu, cw, 90, lw * 2], [cu + lu, cw, 270, lw * 2]];
    lati.forEach(([u, w, rot, lung], li) => {
      const pezzi = Math.max(1, Math.round(lung / 3.2));
      for (let j = 0; j < pezzi; j++) {
        const f = (j + 0.5) / pezzi - 0.5;
        if (k.r.chance(buco) || (li === varco && Math.abs(f) < 0.2)) { if (k.r.chance(0.6)) k.L.sopra += k.spr('macerie', u + (rot % 180 ? 0 : f * lung) + k.r.range(-0.6, 0.6), w + (rot % 180 ? f * lung : 0) + k.r.range(-0.6, 0.6), k.r.range(1, 1.4), k.r.range(0, 360)); continue; }
        k.L.sopra += k.spr('muretto-rotto', u + (rot % 180 ? 0 : f * lung), w + (rot % 180 ? f * lung : 0), Math.min(3.4, lung / pezzi + 0.25), rot + (k.r.chance(0.5) ? 180 : 0));
      }
    });
  };
  const rovine = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'Le rovine del tempio di ' + k.M.nomeLuogo(r, k.o.popolo);
    const cu = cols * r.range(0.44, 0.56), cw = rows * r.range(0.45, 0.55), lu = Math.min(cols * 0.32, 8.5), lw = Math.min(rows * 0.28, 5);
    _rovinePav(k, cu, cw, lu, lw);
    const verso = r.chance(0.5) ? 1 : -1; // da che parte sta l'altare
    _muriRotti(k, cu, cw, lu, lw, 0.3, verso > 0 ? 2 : 3);
    k.segna(cu - lu * 0.4, cw - lw - 0.9, 'Muri crollati', 'Tre quarti di copertura dietro i tratti in piedi; i varchi si attraversano.');
    // Navata: due file di colonne, molte cadute
    for (let j = 0; j < 5; j++) {
      const u = cu - verso * lu * 0.7 + verso * j * lu * 0.33;
      [cw - lw * 0.5, cw + lw * 0.5].forEach((w) => {
        if (r.chance(0.6)) k.L.sopra += k.spr('colonna-crollata', u + r.range(-0.4, 0.4), w + r.range(0.4, 1.3) * (w < cw ? 1 : -1), 2.8, r.range(-35, 35) + (r.chance(0.5) ? 90 : 0));
        else k.L.sopra += k.spr('macerie', u, w, 1.2, r.range(0, 360));
        k.occupa(u, w, 0.8);
      });
    }
    k.segna(cu, cw - lw * 0.5 + 1.4, 'Colonne cadute', 'Mezza copertura; scavalcarle costa movimento extra.');
    const au = cu + verso * lu * 0.78;
    k.L.sopra += k.spr('altare', au, cw, 2, verso > 0 ? 90 : -90); k.occupa(au, cw, 1.2);
    k.L.sopra += k.spr('braciere', au - verso * 0.4, cw - 1.8, 0.9, 0) + k.spr('braciere', au - verso * 0.4, cw + 1.8, 0.9, 0);
    k.luce(au, cw - 1.8, 2.6); k.luce(au, cw + 1.8, 2.6);
    k.segna(au, cw - 2.8, 'L\'altare', 'Candele ancora accese: qualcuno viene qui di recente.');
    const st = r.pick(['statua-angelo', 'statua-cavaliere']);
    k.L.sopra += k.spr(st, cu - verso * lu * 0.85, cw, 1.6, verso > 0 ? -90 : 90);
    k.segna(cu - verso * lu * 0.85, cw + 1.4, 'Statua', 'Mezza copertura. Ha gli occhi di pietra rivolti all\'altare.');
    k.sparsi(8, (u, w) => true, ['rovi-1', 'rovi-2', 'cespuglio-1', 'macerie'], 1, 1.8);
    k.bosco((u, w) => Math.abs(u - cu) > lu + 1.6 || Math.abs(w - cw) > lw + 1.6, 0.9, 0.35);
    return nome;
  };
  const rovine_chiostro = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'Il chiostro abbandonato di ' + k.M.nomeLuogo(r, k.o.popolo);
    const cu = cols * r.range(0.45, 0.55), cw = rows * r.range(0.45, 0.55), lu = Math.min(rows * 0.36, 6.5), lw = lu;
    _rovinePav(k, cu, cw, lu, lw);
    // Il giardino in mezzo, con il pozzo
    const g = blob(k, cu, cw, lu * 0.5, lw * 0.5, 0.12);
    k.L.terra += `<path d="${g.d}" fill="url(#bm-p-terreno-erba)" filter="url(#carto-b4)"/>`;
    k.L.sopra += k.spr('pozzo', cu, cw, 1.8, 0); k.occupa(cu, cw, 1.2);
    k.segna(cu + 1.4, cw, 'Pozzo', 'Profondo, con acqua ferma. In fondo luccica qualcosa.');
    _muriRotti(k, cu, cw, lu, lw, 0.28, r.int(0, 3));
    k.segna(cu - lu, cw - lw - 0.9, 'Muri del chiostro', 'Tre quarti di copertura; i crolli si attraversano.');
    // Colonnato attorno al giardino
    for (let j = 0; j < 12; j++) {
      const a = j / 12 * DUE, u = cu + Math.cos(a) * lu * 0.72, w = cw + Math.sin(a) * lw * 0.72;
      if (r.chance(0.45)) { k.L.sopra += k.spr('colonna-crollata', u, w, 2.4, deg(a) + r.range(-50, 50)); k.occupa(u, w, 0.9); }
      else if (r.chance(0.5)) k.L.sopra += k.spr('macerie', u, w, 1, r.range(0, 360));
    }
    k.segna(cu + lu * 0.72, cw + lw * 0.4, 'Colonnato', 'Mezza copertura dietro le colonne.');
    // Angoli: una cella con il letto, una con le botti, la statua
    const ang = r.shuffle([[-1, -1], [1, -1], [1, 1], [-1, 1]]);
    const [a1, a2, a3] = ang;
    k.L.sopra += k.spr('letto', cu + a1[0] * (lu - 1.4), cw + a1[1] * (lw - 1.4), 1.8, 0) + k.spr('baule', cu + a1[0] * (lu - 2.6), cw + a1[1] * (lw - 1.1), 0.9, 0);
    k.segna(cu + a1[0] * (lu - 1.4), cw + a1[1] * (lw - 2.8), 'Cella del monaco', 'Nel baule, un diario con l\'ultima pagina strappata.');
    k.L.sopra += k.spr('botti', cu + a2[0] * (lu - 1.4), cw + a2[1] * (lw - 1.4), 1.9, r.range(0, 360));
    k.L.sopra += k.spr('statua-angelo', cu + a3[0] * (lu - 1.4), cw + a3[1] * (lw - 1.4), 1.6, deg(Math.atan2(-a3[1], -a3[0])) + 90);
    k.sparsi(6, (u, w) => true, ['rovi-1', 'rovi-2', 'cespuglio-bianco'], 1, 1.7);
    k.bosco((u, w) => Math.abs(u - cu) > lu + 1.6 || Math.abs(w - cw) > lw + 1.6, 0.9, 0.3);
    return nome;
  };
  const rovine_torre = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'La torre crollata di ' + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-erba', 5) + k.pattern('terreno-pietra', 3) + k.pattern('terreno-terra', 6, 90);
    k.L.terra += k.tutto('terreno-erba');
    // Torre su un lato, crollata verso il centro: una scia di macerie
    const tu = r.chance(0.5) ? cols * 0.27 : cols * 0.73, tw = rows * r.range(0.35, 0.65), rag = 3.4;
    const T = blob(k, tu, tw, rag + 0.4, rag + 0.4, 0.06);
    k.L.terra += `<path d="${T.d}" fill="url(#bm-p-terreno-pietra)"/>`;
    for (let j = 0; j < 10; j++) { const a = j / 10 * DUE; if (r.chance(0.3)) continue; k.L.sopra += k.spr('muretto-rotto', tu + Math.cos(a) * rag, tw + Math.sin(a) * rag, 2.4, deg(a) + 90); }
    k.L.sopra += k.spr('scale', tu, tw, 2.2, r.pick([0, 90, 180, 270]));
    k.segna(tu, tw - 1.6, 'Scala nella torre', 'Gira verso il basso: porta ai sotterranei.');
    k.segna(tu, tw - rag - 0.9, 'Muro della torre', 'Tre quarti di copertura; si sale sui tratti alti (Atletica CD 12).');
    const verso = tu < cols / 2 ? 1 : -1;
    for (let j = 0; j < 14; j++) {
      const d = rag + 1 + j * 0.8, u = tu + verso * d, w = tw + r.range(-1.6, 1.6) * (1 + j * 0.08);
      if (u < 0.5 || u > cols - 0.5) break;
      k.L.sopra += k.spr(j % 4 === 3 ? 'colonna-crollata' : 'macerie', u, w, j % 4 === 3 ? 2.6 : r.range(1, 1.6), r.range(0, 360)); k.occupa(u, w, 0.6);
    }
    k.segna(tu + verso * (rag + 4), tw + 1.8, 'Macerie', 'La torre è crollata da questa parte: terreno difficile, mezza copertura.');
    // Il sentiero di guardia che passava dalla torre
    const sent = lineaMorbida(k, [[verso > 0 ? -1.5 : cols + 1.5, tw + r.range(-3, 3)], [tu - verso * rag, tw], [tu + verso * rag, tw + r.range(-4, 4)], [verso > 0 ? cols + 1.5 : -1.5, r.range(2, rows - 2)]], 1.2, 6);
    const dS = via(k, 'sent', [sent.filter(([u, w]) => !T.dentro(u, w))], 1.8, 'terreno-terra');
    metti(k, 'pozzo', (u, w) => !T.dentro(u, w, 1.5) && dS(u, w) > 1.5 && dS(u, w) < 4, 1.6);
    metti(k, 'scheletro', (u, w) => !T.dentro(u, w, 1) && Math.hypot(u - tu, w - tw) < rag + 5, 1.4, { strato: 'sotto' });
    metti(k, 'forziere', (u, w) => T.dentro(u, w, -1.2) && k.libero(u, w, 1), 0.9);
    k.sparsi(8, (u, w) => !T.dentro(u, w, 0.5) && dS(u, w) > 1.2, ['rovi-1', 'rovi-2'].concat(k.SASSI, k.CESPUGLI), 0.8, 1.6);
    k.bosco((u, w) => !T.dentro(u, w, 2) && dS(u, w) > 2.2, 0.8, 0.55);
    return nome;
  };

  /* ══════════════ PALUDE ══════════════ */
  const _palude = (k) => {
    k.L.defs += k.pattern('terreno-fango', 4) + k.pattern('terreno-erba', 5) + k.pattern('terreno-erba-secca', 5) + k.pattern('terreno-acqua-bassa', 4) + k.pattern('terreno-acqua-profonda', 5);
    k.L.terra += k.tutto('terreno-fango');
    let erba = '';
    for (let i = 0; i < 16; i++) { const b = blob(k, k.r.range(0, k.cols), k.r.range(0, k.rows), k.r.range(0.8, 2.2), k.r.range(0.6, 1.6), 0.45); erba += `<path d="${b.d}"/>`; }
    k.L.terra += `<g fill="url(#bm-p-terreno-erba-secca)" opacity="0.55" filter="url(#carto-b4)">${erba}</g>`;
  };
  // L'acqua scura della palude: bassa ai bordi, profonda al centro, un velo verdastro sopra
  const _pozza = (k, b, fonda = true) => {
    // Acqua bassa su tutta la pozza, il centro profondo se e' grande, poi un velo verde scuro: acqua di palude, non di piscina
    k.L.terra += `<path d="${b.d}" fill="url(#bm-p-terreno-acqua-bassa)" filter="url(#carto-b4)"/>`;
    if (fonda) k.L.terra += `<path d="${blob(k, b.cu, b.cw, b.ru * 0.62, b.rw * 0.62, 0.2).d}" fill="url(#bm-p-terreno-acqua-profonda)" filter="url(#carto-b12)"/>`;
    k.L.terra += `<path d="${b.d}" fill="#2f3d16" opacity="0.45" filter="url(#carto-b4)"/>`;
  };
  const _sponde = (k, b, n) => {
    for (let i = 0; i < n; i++) { const a = k.r.range(0, DUE); k.L.sopra += k.spr(k.c(['canneto-1', 'canneto-2']), b.cu + Math.cos(a) * b.ru, b.cw + Math.sin(a) * b.rw, k.r.range(1.3, 2), k.r.range(-25, 25)); }
    if (k.r.chance(0.8)) k.L.sotto += k.spr(k.c(['ninfee-1', 'ninfee-2']), b.cu + k.r.range(-b.ru, b.ru) * 0.5, b.cw + k.r.range(-b.rw, b.rw) * 0.5, k.r.range(1, 1.4), k.r.range(0, 360));
  };
  const palude = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || r.pick(['La palude di ', 'Gli acquitrini di ', 'Il pantano di ']) + k.M.nomeLuogo(r, k.o.popolo);
    _palude(k);
    const pozze = [];
    for (let t = 0; t < 60 && pozze.length < r.int(4, 6); t++) {
      const u = r.range(2, cols - 2), w = r.range(2, rows - 2), ru = r.range(1.6, 3.4), rw = r.range(1.3, 2.6);
      if (pozze.some((p) => Math.hypot(p.cu - u, p.cw - w) < p.ru + ru + 1.2)) continue;
      pozze.push(blob(k, u, w, ru, rw, 0.35));
    }
    pozze.forEach((p) => _pozza(k, p, p.ru > 2.4));
    const inPozza = (u, w, m = 0) => pozze.some((p) => p.dentro(u, w, m));
    // Il sentiero di tronchi e passerelle che la attraversa
    const sent = lineaMorbida(k, [[-1.5, r.range(3, rows - 3)], [cols * 0.5, r.range(3, rows - 3)], [cols + 1.5, r.range(3, rows - 3)]], 2.5, 11);
    let passi = 0;
    for (let i = 2; i < sent.length - 2; i += 3) {
      const [u, w] = sent[i], [u2, w2] = sent[i + 1];
      if (inPozza(u, w, 0.3)) { k.L.sopra += k.spr('ponte-legno', u, w, 2.2, deg(Math.atan2(w2 - w, u2 - u))); passi++; }
      else if (r.chance(0.5)) k.L.sotto += k.spr(k.c(k.SASSI), u, w, 0.7, r.range(0, 360));
      k.occupa(u, w, 0.6);
    }
    if (passi) { const i = sent.findIndex(([u, w]) => inPozza(u, w, 0.3)); k.segna(sent[i][0], sent[i][1] - 1.3, 'Passerella', 'Assi marce: chi corre fa un tiro di Destrezza o cade in acqua.'); }
    const g = pozze.slice().sort((a, b) => b.ru - a.ru)[0];
    k.segna(g.cu, g.cw, 'Acqua scura', 'Bassa ai bordi (terreno difficile), profonda al centro: si nuota. Qualcosa si muove sotto.');
    k.segna(r.range(2, cols - 2), 1.4, 'Fango', 'Tutta la palude è terreno difficile, tranne il sentiero.');
    pozze.forEach((p) => _sponde(k, p, 3));
    for (let i = 0, n = 0; i < 50 && n < r.int(4, 6); i++) { const u = r.range(1, cols - 1), w = r.range(1, rows - 1); if (inPozza(u, w, 0.5) || !k.libero(u, w, 1.2)) continue; k.L.alto += k.spr('albero-morto', u, w, r.range(2.2, 3), r.range(0, 360)); k.occupa(u, w, 1.1); if (!n) k.segna(u + 1.4, w, 'Alberi morti', 'Mezza copertura. I rami si muovono anche senza vento.'); n++; }
    metti(k, 'tronco-caduto', (u, w) => !inPozza(u, w, 0.3), r.range(3.6, 4.4), { raggio: 1.6 });
    metti(k, 'cerchio-funghi', (u, w) => !inPozza(u, w, 0.8), 2, { strato: 'sotto' });
    k.sparsi(8, (u, w) => !inPozza(u, w, 0.2), k.SASSI.concat(['ceppo', 'rovi-1']), 0.6, 1.3);
    k.bosco((u, w) => !inPozza(u, w, 1) && bordo(k, 2.2)(u, w) && r.chance(0.55), 0.6, 0.2);
    return nome;
  };
  // La capanna della strega: un capanno su un isolotto, collegato da passerelle
  const palude_capanna = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || r.pick(['La capanna della strega di ', 'Il rifugio nel pantano di ']) + k.M.nomeLuogo(r, k.o.popolo);
    _palude(k);
    const W = blob(k, cols * 0.5, rows * 0.5, cols * 0.36, rows * 0.36, 0.3);
    _pozza(k, W);
    const iu = W.cu + r.range(-2, 2), iw = W.cw + r.range(-1.5, 1.5), I = blob(k, iu, iw, 3.2, 2.6, 0.25);
    k.L.terra += `<path d="${I.d}" fill="url(#bm-p-terreno-fango)" filter="url(#carto-b4)"/><path d="${I.d}" fill="url(#bm-p-terreno-erba-secca)" opacity="0.6" filter="url(#carto-b4)"/>`;
    const acqua = (u, w) => W.dentro(u, w) && !I.dentro(u, w);
    edificio(k, 'capanno', iu, iw, 2.6, r.pick([0, 90, 180, 270]));
    k.segna(iu, iw - 2, 'Capanna', 'Pozioni, erbe appese e un calderone ancora caldo.');
    k.L.sopra += k.spr('braciere', iu + 2, iw + 0.6, 0.9, 0); k.luce(iu + 2, iw + 0.6, 2.8, '#9cff7a', 0.4);
    k.L.sotto += k.spr('ossa', iu - 1.8, iw + 1, 1.1, r.range(0, 360));
    k.L.sopra += k.spr('alveare', iu - 1.9, iw - 0.8, 1, 0);
    // Due passerelle verso la riva, in direzioni diverse
    const dirs = [r.range(0, DUE)]; dirs.push(dirs[0] + Math.PI + r.range(-0.8, 0.8));
    dirs.forEach((a, j) => {
      let d = 2.6; const passi = [];
      while (d < 20) { const u = iu + Math.cos(a) * d, w = iw + Math.sin(a) * d; if (!W.dentro(u, w, 0.3)) break; passi.push([u, w]); d += 2; }
      passi.forEach(([u, w]) => { k.L.sopra += k.spr('ponte-legno', u, w, 2.3, deg(a)); k.occupa(u, w, 0.7); });
      if (j === 0 && passi[1]) k.segna(passi[1][0], passi[1][1] - 1.3, 'Passerelle', 'Strette: si passa uno alla volta. Le assi scricchiolano.');
    });
    metti(k, 'barca', acqua, 2.4, { raggio: 1.1, area: [iu - 6, iw - 5, iu + 6, iw + 5] });
    metti(k, 'nasse', acqua, 1.3, { area: [iu - 5, iw - 4, iu + 5, iw + 4] });
    k.segna(W.cu + W.ru * 0.7, W.cw, 'Acqua profonda', 'Si nuota. Sotto la superficie, radici che afferrano (Forza CD 12).');
    _sponde(k, W, 9);
    for (let i = 0, n = 0; i < 60 && n < 6; i++) { const u = r.range(1, cols - 1), w = r.range(1, rows - 1); if (W.dentro(u, w, 0.6) || !k.libero(u, w, 1.2)) continue; k.L.alto += k.spr('albero-morto', u, w, r.range(2.2, 3), r.range(0, 360)); k.occupa(u, w, 1.1); n++; }
    k.sparsi(6, (u, w) => !W.dentro(u, w, 0.3), k.SASSI.concat(['ceppo', 'rovi-2', 'cerchio-funghi']), 0.6, 1.4);
    k.bosco((u, w) => !W.dentro(u, w, 1.5), 0.5, 0.15);
    return nome;
  };

  /* ══════════════ VILLAGGIO ══════════════ */
  const CASE = ['casa-paglia', 'casa-tegole', 'casa-ardesia', 'casa-paglia', 'casa-tegole'];
  // Case lungo una linea (strada), col lato lungo parallelo alla strada
  const caseLungo = (k, linea, dist, ok, passo = 5.5, salta = 0.25) => {
    let messe = 0;
    for (let i = 2; i < linea.length - 2; i += Math.max(1, Math.round(passo / 0.6))) {
      const [u, w] = linea[i], [u2, w2] = linea[i + 1], a = Math.atan2(w2 - w, u2 - u);
      [-1, 1].forEach((lato) => {
        if (k.r.chance(salta)) return;
        const nome = k.c(CASE), lungo = k.r.range(3.6, 4.4), prof = lungo * k.img[nome].h / k.img[nome].w;
        const d = dist + prof / 2, x = u - Math.sin(a) * d * lato, y = w + Math.cos(a) * d * lato;
        if (!ok(x, y) || !k.libero(x, y, lungo * 0.5)) return;
        const rot = deg(a) + (lato > 0 ? 0 : 180), drit = Math.round(rot / 90) * 90;
        edificio(k, nome, x, y, lungo, Math.abs(rot - drit) < 12 ? drit : rot); messe++;
      });
    }
    return messe;
  };
  const villaggio = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'La piazza di ' + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-erba', 5) + k.pattern('terreno-terra', 6, 90) + k.pattern('terreno-ciottolato', 3);
    k.L.terra += k.tutto('terreno-erba');
    const P = blob(k, cols * r.range(0.42, 0.58), rows * r.range(0.42, 0.58), r.range(4.2, 5.2), r.range(3.4, 4.2), 0.18);
    // Strade che partono dalla piazza verso 3 o 4 lati
    const lati = r.shuffle([0, 1, 2, 3]).slice(0, r.int(3, 4));
    const strade = lati.map((l, i) => lineaMorbida(k, [[P.cu, P.cw], fuori(k, l, r.range(0.3, 0.7))], 1.2, 13 + i * 5));
    const dS = via(k, 'strade', strade, 2.6, 'terreno-terra');
    k.L.terra += `<path d="${P.d}" fill="url(#bm-p-terreno-ciottolato)" filter="url(#carto-b4)"/>`;
    const centro = r.chance(0.5) ? 'fontana' : 'pozzo';
    k.L.sopra += k.spr(centro, P.cu, P.cw, centro === 'fontana' ? 2.6 : 1.8, 0); k.occupa(P.cu, P.cw, 1.6);
    k.segna(P.cu + 1.6, P.cw - 1, centro === 'fontana' ? 'Fontana' : 'Pozzo', centro === 'fontana' ? 'Mezza copertura. L\'acqua arriva alla vita.' : 'Profondo 10 metri; la corda regge una persona.');
    // Case attorno alla piazza, con la facciata verso il centro
    const nC = r.int(6, 8), a0 = r.range(0, DUE);
    for (let i = 0; i < nC; i++) {
      const a = a0 + i / nC * DUE + r.range(-0.15, 0.15), nm = k.c(CASE), lungo = r.range(3.6, 4.4), prof = lungo * k.img[nm].h / k.img[nm].w;
      const d = Math.hypot(Math.cos(a) * P.ru, Math.sin(a) * P.rw) + prof / 2 + 0.4, u = P.cu + Math.cos(a) * d, w = P.cw + Math.sin(a) * d;
      if (dS(u, w) < prof / 2 + 1.4 || !k.libero(u, w, lungo * 0.45)) continue;
      edificio(k, nm, u, w, lungo, deg(a) - 90);
    }
    k.segna(P.cu - P.ru - 1.5, P.cw - P.rw, 'Case', 'Porte sbarrate; dalle finestre si tira con mezza copertura.');
    // Seconda fila di case lungo le strade
    strade.forEach((s) => caseLungo(k, s.filter(([u, w]) => !P.dentro(u, w, 3)), 1.6, (u, w) => !P.dentro(u, w, 2.5) && dS(u, w) > 1.5));
    // Vita della piazza
    const b1 = metti(k, ['bancarella-rossa', 'bancarella-blu', 'bancarella-gialla'], (u, w) => P.dentro(u, w, -1.2) && Math.hypot(u - P.cu, w - P.cw) > 2.4, 2.2, { rot: (u, w) => deg(Math.atan2(w - P.cw, u - P.cu)) + 90 });
    if (b1) { merci(k, b1[0], b1[1] + 1.4, 2); k.segna(b1[0], b1[1] - 1.5, 'Bancarella', 'Mezza copertura; rovesciarla crea terreno difficile.'); }
    metti(k, ['bancarella-rossa', 'bancarella-blu', 'bancarella-gialla', 'banco-frutta'], (u, w) => P.dentro(u, w, -1.2) && Math.hypot(u - P.cu, w - P.cw) > 2.4, 2.2, { rot: (u, w) => deg(Math.atan2(w - P.cw, u - P.cu)) + 90 });
    metti(k, 'carro', (u, w) => dS(u, w) < 1 && !P.dentro(u, w, 1), 3, { raggio: 1.5, rot: 0 });
    lanterne(k, 3, (u, w) => !P.dentro(u, w) && P.dentro(u, w, 1.5));
    k.sparsi(8, (u, w) => dS(u, w) > 1.6 && !P.dentro(u, w, 1), ['cespuglio-bianco', 'cespuglio-giallo', 'legnaia', 'barile', 'balle-fieno'], 0.9, 1.5);
    k.bosco((u, w) => dS(u, w) > 2 && !P.dentro(u, w, 3) && r.chance(0.35), 0.5, 0.25);
    return nome;
  };
  // Incrocio fuori dal paese: case sparse lungo due strade, campi e orti
  const villaggio_incrocio = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'Il crocevia di ' + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-erba', 5) + k.pattern('terreno-terra', 6, 90) + k.pattern('terreno-erba-secca', 5);
    k.L.terra += k.tutto('terreno-erba');
    const xu = cols * r.range(0.35, 0.65), xw = rows * r.range(0.35, 0.65);
    const s1 = lineaMorbida(k, [[-1.5, xw + r.range(-3, 3)], [xu, xw], [cols + 1.5, xw + r.range(-3, 3)]], 1.4, 21);
    const s2 = lineaMorbida(k, [[xu + r.range(-4, 4), -1.5], [xu, xw], [xu + r.range(-4, 4), rows + 1.5]], 1.4, 27);
    const dS = via(k, 'strade', [s1, s2], 2.6, 'terreno-terra');
    k.L.sopra += k.spr('cartello', xu + 1.6, xw - 1.6, 1.5, r.range(-20, 20)); k.occupa(xu + 1.6, xw - 1.6, 0.6);
    k.segna(xu + 1.6, xw - 2.8, 'Cartello', 'Indica quattro paesi. Una freccia è stata girata apposta.');
    // Quattro quarti: campi, orti, case
    const quarti = r.shuffle([[-1, -1], [1, -1], [1, 1], [-1, 1]]);
    quarti.forEach(([su, sw], i) => {
      const qu = xu + su * r.range(5, 7), qw = xw + sw * r.range(4, 5);
      if (i < 2) {
        const lu = r.range(6, 8), lw = r.range(4, 5);
        campo(k, qu, qw, lu, lw, r.range(-8, 8));
        k.occupa(qu, qw, Math.min(lu, lw) * 0.45);
        recinto(k, [[qu - lu / 2 - 0.3, qw - lw / 2 - 0.3], [qu + lu / 2 + 0.3, qw - lw / 2 - 0.3], [qu + lu / 2 + 0.3, qw + lw / 2 + 0.3], [qu - lu / 2 - 0.3, qw + lw / 2 + 0.3], [qu - lu / 2 - 0.3, qw - lw / 2 - 0.3]], [[qu - su * lu / 2, qw]]);
        if (i === 0) { k.L.sopra += k.spr('spaventapasseri', qu, qw, 1.4, 0); k.segna(qu, qw - 1.4, 'Campo di grano', 'Spighe alte: chi ci si accuccia è nascosto. Lo spaventapasseri guarda la strada.'); }
        else for (let j = 0; j < 3; j++) k.L.sopra += k.spr('alveare', qu - 1.5 + j * 1.5, qw - lw / 2 + 0.9, 0.9, 0);
      } else {
        const nm = i === 2 ? k.c(CASE) : 'capanno';
        if (dS(qu, qw) > 3 && k.libero(qu, qw, 2)) {
          edificio(k, nm, qu, qw, i === 2 ? 4.2 : 2.6, Math.abs(qw - xw) > Math.abs(qu - xu) ? 0 : 90);
          metti(k, ['legnaia', 'barile', 'pozzo'], (u, w) => Math.hypot(u - qu, w - qw) < 4 && dS(u, w) > 1.6, 1.4, { area: [qu - 4, qw - 4, qu + 4, qw + 4] });
          if (i === 2) k.segna(qu, qw - 2.4, 'Casa', 'Un contadino diffidente: apre solo se pagato.');
        }
      }
    });
    metti(k, 'carro-fieno', (u, w) => dS(u, w) < 1 && Math.hypot(u - xu, w - xw) > 4, 3, { raggio: 1.5 });
    metti(k, 'balle-fieno', (u, w) => dS(u, w) > 2 && dS(u, w) < 4, 1.5);
    metti(k, 'stagno', (u, w) => dS(u, w) > 3, 2.6, { strato: 'sotto', raggio: 1.4 });
    k.sparsi(8, (u, w) => dS(u, w) > 1.6, ['cespuglio-giallo', 'cespuglio-bianco'].concat(k.CESPUGLI, k.SASSI), 0.8, 1.4);
    k.bosco((u, w) => dS(u, w) > 2.4 && bordo(k, 3)(u, w) && r.chance(0.6), 0.6, 0.3);
    return nome;
  };
  // Fattoria isolata: aia recintata, fienile, frutteto e campi
  const villaggio_fattoria = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'La fattoria dei ' + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-erba', 5) + k.pattern('terreno-terra', 6, 90) + k.pattern('terreno-erba-secca', 5);
    k.L.terra += k.tutto('terreno-erba');
    const lu = 10 + r.int(0, 1), lw = 8;
    const sx = r.chance(0.5), u0 = sx ? 2 + r.int(0, 2) : cols - lu - 2 - r.int(0, 2), w0 = Math.round((rows - lw) / 2 + r.range(-1, 1)), u1 = u0 + lu, w1 = w0 + lw;
    k.L.terra += `<rect x="${k.X(u0)}" y="${k.Y(w0)}" width="${lu * k.S}" height="${lw * k.S}" fill="url(#bm-p-terreno-terra)" opacity="0.9" filter="url(#carto-b4)"/>`;
    const gU = sx ? u1 : u0, gW = (w0 + w1) / 2 + r.range(-2, 2);
    // Il sentiero esce verso un angolo: il frutteto sta nell'altra meta', cosi' non lo attraversa
    const suSent = r.chance(0.5), sent = lineaMorbida(k, [[gU, gW], [sx ? cols + 1.5 : -1.5, suSent ? r.range(1.5, 3) : r.range(rows - 3, rows - 1.5)]], 1.2, 31);
    const dS = via(k, 'sent', [sent], 2.2, 'terreno-terra');
    recinto(k, [[u0, w0], [u1, w0], [u1, w1], [u0, w1], [u0, w0]], [[gU, gW]]);
    const fu = sx ? u0 + 3.4 : u1 - 3.4, fw = w0 + 3;
    edificio(k, 'fattoria', fu, fw, 5.6, sx ? 0 : 90);
    k.segna(fu, fw + 3.4, 'Casa colonica', 'Muri spessi: tre quarti di copertura dalle finestre.');
    const cu = sx ? u0 + 2 : u1 - 2, cw = w1 - 2;
    edificio(k, 'capanno', cu, cw, 2.8, 0);
    k.segna(cu + (sx ? 2 : -2), cw, 'Fienile', 'Pieno di paglia: una scintilla e prende fuoco.');
    k.L.sopra += k.spr('pozzo', (u0 + u1) / 2, (w0 + w1) / 2 + 1, 1.7, 0); k.occupa((u0 + u1) / 2, (w0 + w1) / 2 + 1, 1);
    for (let i = 0; i < 3; i++) metti(k, 'balle-fieno', (u, w) => u > u0 + 1 && u < u1 - 1 && w > w0 + 1 && w < w1 - 1, 1.4);
    metti(k, 'carro-fieno', (u, w) => u > u0 + 1.5 && u < u1 - 1.5 && w > w0 + 1.5 && w < w1 - 1.5, 3, { raggio: 1.5, rot: 0 });
    metti(k, 'legnaia', (u, w) => u > u0 + 1 && u < u1 - 1 && w > w0 + 1 && w < w1 - 1, 1.6);
    // Fuori: frutteto in file e campi
    const fx0 = sx ? u1 + 3 : 2, fx1 = sx ? cols - 2 : u0 - 3;
    const frutW = suSent ? [rows / 2, rows - 1] : [1, rows / 2];
    for (let u = fx0 + 1.2; u < fx1 - 0.6; u += 2.6) for (let w = frutW[0] + 1.2; w < frutW[1] - 0.4; w += 2.6) if (dS(u, w) > 1.8 && k.libero(u, w, 0.8)) { k.L.alto += k.spr(k.c(['quercia-1', 'quercia-2', 'cespuglio-bianco']), u + r.range(-0.2, 0.2), w + r.range(-0.2, 0.2), r.range(1.9, 2.3), r.range(0, 360)); k.occupa(u, w, 0.9); }
    k.segna((fx0 + fx1) / 2, frutW[0] + 0.6, 'Frutteto', 'Alberi in fila: mezza copertura, ci si arrampica facilmente.');
    const cw2 = frutW[0] < rows / 2 ? rows * 0.75 : rows * 0.25;
    campo(k, (fx0 + fx1) / 2, cw2, Math.abs(fx1 - fx0) - 1, 4.5, r.range(-4, 4));
    k.L.sopra += k.spr('spaventapasseri', (fx0 + fx1) / 2, cw2, 1.4, 0);
    for (let j = 0; j < 3; j++) k.L.sopra += k.spr('alveare', fx0 + 0.6 + j * 1.3, cw2 + (cw2 > rows / 2 ? -3 : 3), 0.9, 0);
    k.sparsi(5, (u, w) => dS(u, w) > 1.5 && (u < u0 - 1 || u > u1 + 1 || w < w0 - 1 || w > w1 + 1), k.CESPUGLI.concat(['stagno', 'cespuglio-giallo']), 1, 1.6);
    k.bosco((u, w) => bordo(k, 2)(u, w) && dS(u, w) > 2 && (u < u0 - 1.5 || u > u1 + 1.5 || w < w0 - 1.5 || w > w1 + 1.5) && r.chance(0.6), 0.6, 0.3);
    return nome;
  };

  /* ══════════════ MERCATO ══════════════ */
  const BANCHI = ['bancarella-rossa', 'bancarella-blu', 'bancarella-gialla', 'banco-frutta', 'banco-pesce'];
  const mercato = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'Il mercato di ' + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-ciottolato', 3) + k.pattern('terreno-terra', 6, 90);
    k.L.terra += k.tutto('terreno-ciottolato');
    // Case sui bordi, tagliate dalla cornice: la piazza e' chiusa
    for (let u = 1.5; u < cols; u += r.range(4.2, 5)) { if (r.chance(0.15)) continue; edificio(k, k.c(CASE), u, 0.6, 4.2, 180); }
    for (let u = 2; u < cols; u += r.range(4.2, 5)) { if (r.chance(0.15)) continue; edificio(k, k.c(CASE), u, rows - 0.6, 4.2, 0); }
    k.segna(cols * 0.3, 2.6, 'Case', 'Porte e finestre sulla piazza: da lì si tira con mezza copertura.');
    const fu = cols * r.range(0.4, 0.6), fw = rows * 0.5;
    k.L.sopra += k.spr('fontana', fu, fw, 2.8, 0); k.occupa(fu, fw, 1.8);
    k.segna(fu + 1.8, fw - 1.2, 'Fontana', 'Mezza copertura. Chi ci cade dentro si bagna fino alla vita.');
    // Due corsie di bancarelle, schiena contro schiena, con un passaggio in mezzo
    const corsie = [rows * 0.5 - 3.6, rows * 0.5 + 3.6];
    let primo = null;
    corsie.forEach((w, ci) => {
      for (let u = 3; u < cols - 2; u += 2.6) {
        if (Math.abs(u - fu) < 2.6 || r.chance(0.2)) continue;
        const nm = k.c(BANCHI);
        k.L.sopra += k.spr(nm, u, w, 2.2, ci === 0 ? 180 : 0); k.occupa(u, w, 1.1);
        if (r.chance(0.5)) merci(k, u, w + (ci === 0 ? -1.6 : 1.6), 2, ['cassa', 'barile', 'sacchi', 'anfore']);
        if (!primo) primo = [u, w];
      }
    });
    if (primo) k.segna(primo[0], primo[1] - 1.5, 'Bancarelle', 'Mezza copertura. Rovesciate, la merce sparsa diventa terreno difficile.');
    metti(k, 'carro', (u, w) => u < 4 || u > cols - 4, 3, { raggio: 1.5, rot: 90 });
    metti(k, 'carro-fieno', (u, w) => u < 4 || u > cols - 4, 3, { raggio: 1.5, rot: 90 });
    for (let i = 0; i < 4; i++) metti(k, ['barile', 'balle-fieno', 'anfore', 'sacchi'], (u, w) => true, r.range(0.9, 1.3));
    k.segna(fu, fw + 2.2, 'Folla', 'Nel mezzo della giornata la piazza è piena: terreno difficile ovunque.');
    lanterne(k, 3, (u, w) => w > 2.5 && w < rows - 2.5);
    return nome;
  };
  // Mercato lungo una via: bancarelle davanti alle case, un vicolo laterale
  const mercato_strada = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'La via del mercato di ' + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-ciottolato', 3) + k.pattern('terreno-terra', 6, 90) + k.pattern('terreno-erba', 5);
    k.L.terra += k.tutto('terreno-erba');
    let cortili = '';
    for (let i = 0; i < 10; i++) cortili += `<path d="${blob(k, r.range(0, cols), r.range(0, rows), r.range(1.5, 3), r.range(1.2, 2.2), 0.4).d}"/>`;
    k.L.terra += `<g fill="url(#bm-p-terreno-terra)" opacity="0.8" filter="url(#carto-b4)">${cortili}</g>`;
    const w0 = rows * r.range(0.42, 0.58), str = lineaMorbida(k, [[-1.5, w0 + r.range(-1.5, 1.5)], [cols + 1.5, w0 + r.range(-1.5, 1.5)]], 1.2, 41);
    const vu = cols * r.range(0.3, 0.7), vic = lineaMorbida(k, [[vu, w0], [vu + r.range(-2, 2), r.chance(0.5) ? -1.5 : rows + 1.5]], 0.6, 43);
    const dS = via(k, 'via', [str], 6.5, 'terreno-ciottolato');
    const dV = via(k, 'vicolo', [vic], 2.4, 'terreno-ciottolato');
    // Bancarelle ai due lati della via, rivolte verso il centro
    let primo = null;
    for (let i = 3; i < str.length - 3; i += 4) {
      const [u, w] = str[i], [u2, w2] = str[i + 1], a = Math.atan2(w2 - w, u2 - u);
      [-1, 1].forEach((lato) => {
        const x = u - Math.sin(a) * 2.2 * lato, y = w + Math.cos(a) * 2.2 * lato;
        if (dV(x, y) < 2 || r.chance(0.3) || !k.libero(x, y, 1.1)) return;
        k.L.sopra += k.spr(k.c(BANCHI), x, y, 2.1, deg(a) + (lato > 0 ? 0 : 180)); k.occupa(x, y, 1.1);
        if (r.chance(0.4)) merci(k, x - Math.sin(a) * 1.3 * lato, y + Math.cos(a) * 1.3 * lato, 2, ['cassa', 'anfore', 'sacchi']);
        if (!primo) primo = [x, y];
      });
    }
    if (primo) k.segna(primo[0], primo[1] - 1.4, 'Bancarelle', 'Mezza copertura. Un mercante urla a ogni cliente.');
    // Case dietro le bancarelle
    caseLungo(k, str, 3.5, (u, w) => dV(u, w) > 2.6, 4.2, 0.08);
    caseLungo(k, vic, 1.5, (u, w) => dS(u, w) > 4.5, 4.2, 0.1);
    for (let u = 2; u < cols; u += r.range(4.4, 5.2)) [0.6, rows - 0.6].forEach((w) => { if (dS(u, w) > 7 && dV(u, w) > 3 && k.libero(u, w, 1.8)) edificio(k, k.c(CASE), u, w, 4.2, w < 1 ? 180 : 0); });
    k.segna(vic[Math.floor(vic.length * 0.6)][0] + 1.4, vic[Math.floor(vic.length * 0.6)][1], 'Vicolo', 'Stretto: si passa uno alla volta. Ottimo per sparire tra la folla.');
    metti(k, 'carro', (u, w) => dS(u, w) < 0.8, 3, { raggio: 1.5, rot: 0 });
    metti(k, 'pozzo', (u, w) => dS(u, w) > 3.8 && dV(u, w) > 1.8 && dS(u, w) < 6, 1.6);
    lanterne(k, 4, (u, w) => dS(u, w) > 3.2 && dS(u, w) < 3.8);
    k.sparsi(5, (u, w) => dS(u, w) > 4 && dV(u, w) > 1.6, ['barile', 'legnaia', 'cespuglio-giallo', 'sacchi'], 0.9, 1.4);
    return nome;
  };
  // Fiera all'aperto: tende e bancarelle in cerchio su un prato, recinti per gli animali
  const mercato_fiera = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'La fiera di ' + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-erba', 5) + k.pattern('terreno-terra', 6, 90) + k.pattern('terreno-erba-secca', 5);
    k.L.terra += k.tutto('terreno-erba');
    const cu = cols * r.range(0.4, 0.6), cw = rows * r.range(0.42, 0.58);
    const F = blob(k, cu, cw, cols * 0.3, rows * 0.32, 0.2);
    k.L.terra += `<path d="${F.d}" fill="url(#bm-p-terreno-erba-secca)" opacity="0.85" filter="url(#carto-b12)"/>`;
    const C = blob(k, cu, cw, 3.4, 2.8, 0.2);
    k.L.terra += `<path d="${C.d}" fill="url(#bm-p-terreno-terra)" filter="url(#carto-b4)"/>`;
    const sent = lineaMorbida(k, [[cu, cw], fuori(k, r.int(0, 3), r.range(0.3, 0.7))], 1.5, 51);
    const dS = via(k, 'sent', [sent], 2.2, 'terreno-terra');
    fuoco(k, cu, cw, 1.5);
    k.segna(cu + 1.2, cw - 1, 'Falò', 'Ci ballano attorno; luce fioca fino a 9 m.');
    const banchi = anello(k, BANCHI.concat(['tenda']), cu, cw, F.ru * 0.62, F.rw * 0.62, 9, 2.3, 0.15, (u, w) => dS(u, w) > 1.6, -90);
    banchi.forEach(([u, w, a]) => { if (r.chance(0.5)) merci(k, u + Math.cos(a) * 1.6, w + Math.sin(a) * 1.6, 2, ['cassa', 'anfore', 'balle-fieno', 'sacchi']); });
    if (banchi[0]) k.segna(banchi[0][0], banchi[0][1] - 1.5, 'Bancarelle', 'Mezza copertura. Ogni banco vende una cosa diversa.');
    // Recinto degli animali fuori dal cerchio
    for (let t = 0; t < 30; t++) {
      const u = r.range(4, cols - 4), w = r.range(3.5, rows - 3.5);
      if (F.dentro(u, w, 2.6) || dS(u, w) < 4 || !k.libero(u, w, 3)) continue;
      recinto(k, [[u - 3, w - 2.2], [u + 3, w - 2.2], [u + 3, w + 2.2], [u - 3, w + 2.2], [u - 3, w - 2.2]], [[u, w + 2.2]]);
      k.L.sopra += k.spr('balle-fieno', u - 1.4, w, 1.3, r.range(0, 360)) + k.spr('barile', u + 1.6, w - 1, 0.7, 0);
      k.occupa(u, w, 3);
      k.segna(u, w - 3, 'Recinto', 'Capre e un mulo nervoso. Aprire il cancello crea il caos.');
      break;
    }
    metti(k, 'carro-fieno', (u, w) => !F.dentro(u, w, 0.5) && dS(u, w) < 4 && dS(u, w) > 1.6, 3, { raggio: 1.5 });
    metti(k, 'carro', (u, w) => !F.dentro(u, w, 0.5) && dS(u, w) > 1.6, 3, { raggio: 1.5 });
    lanterne(k, 4, (u, w) => F.dentro(u, w, -1) && !C.dentro(u, w, 0.6));
    k.sparsi(5, (u, w) => !F.dentro(u, w, 0.8) && dS(u, w) > 1.6, k.CESPUGLI.concat(k.SASSI, ['cespuglio-giallo']), 0.8, 1.3);
    k.bosco((u, w) => !F.dentro(u, w, 2.5) && dS(u, w) > 2 && r.chance(0.6), 0.6, 0.35);
    return nome;
  };

  /* ══════════════ CIMITERO ══════════════ */
  const LAPIDI = ['lapide-1', 'lapide-2', 'lapide-3', 'lapide-1', 'lapide-2', 'croce-celtica'];
  const _nebbia = (k, n) => {
    for (let i = 0; i < n; i++) k.L.luci += `<ellipse cx="${k.n1(k.X(k.r.range(0, k.cols)))}" cy="${k.n1(k.Y(k.r.range(0, k.rows)))}" rx="${k.n1(k.S * k.r.range(2.5, 5))}" ry="${k.n1(k.S * k.r.range(1, 2))}" fill="#c9d6e0" opacity="0.22" filter="url(#carto-b40)"/>`;
  };
  const cimitero = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'Il cimitero di ' + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-erba', 5) + k.pattern('terreno-terra', 6, 90) + k.pattern('terreno-ciottolato', 3) + k.pattern('terreno-erba-secca', 5);
    k.L.terra += k.tutto('terreno-erba');
    const u0 = 2, w0 = 1.6, u1 = cols - 2, w1 = rows - 1.6;
    k.L.terra += `<rect x="${k.X(u0)}" y="${k.Y(w0)}" width="${(u1 - u0) * k.S}" height="${(w1 - w0) * k.S}" fill="url(#bm-p-terreno-erba-secca)" opacity="0.45" filter="url(#carto-b12)"/>`;
    // Cancello in basso, viale fino alla cappella in fondo
    const gu = cols * r.range(0.35, 0.65), cappU = Math.max(5, Math.min(cols - 5, gu + r.range(-4, 4)));
    const viale = lineaMorbida(k, [[gu, rows + 1], [gu, w1 - 2], [cappU, 5]], 0.5, 61);
    const dS = via(k, 'viale', [viale], 2, 'terreno-ciottolato');
    recinto(k, [[u0, w0], [u1, w0], [u1, w1], [u0, w1], [u0, w0]], [[gu, w1]], 'cancellata', 3);
    k.segna(gu + 1.8, w1 + 0.5, 'Cancellata', 'Ferro arrugginito, alta 2 metri: si scavalca (Atletica CD 12).');
    const cap = r.chance(0.5) ? 'cappella' : 'mausoleo';
    edificio(k, cap, cappU, 3.6, cap === 'cappella' ? 4.6 : 3.2, cap === 'cappella' ? 0 : 180);
    k.segna(cappU + 2.8, 3.4, cap === 'cappella' ? 'Cappella' : 'Mausoleo', 'Chiuso da una porta di bronzo. Dentro, scale che scendono.');
    // Tombe in file, qualcuna storta o mancante
    let n = 0;
    for (let w = 6.5; w < w1 - 1.2; w += 2.2) for (let u = u0 + 1.6; u < u1 - 1; u += 1.7) {
      if (dS(u, w) < 1.7 || r.chance(0.18) || !k.libero(u, w, 0.6)) continue;
      const nm = k.c(LAPIDI), tomba = r.chance(0.1) ? 'sarcofago' : nm;
      k.L.sopra += k.spr(tomba, u + r.range(-0.15, 0.15), w, tomba === 'sarcofago' ? 1.8 : 1.15, r.range(-10, 10) + (r.chance(0.08) ? 40 : 0)); k.occupa(u, w, 0.6); n++;
      if (n === 4) k.segna(u, w - 1.1, 'Lapidi', 'Mezza copertura. Su una c\'è il nome di uno dei personaggi.');
    }
    const fo = metti(k, 'fossa', (u, w) => dS(u, w) > 2 && w > 6, 1.8, { strato: 'sotto', rot: 0 });
    if (fo) k.segna(fo[0] + 1.3, fo[1], 'Fossa aperta', 'Profonda 2 metri e vuota. Non dovrebbe esserlo.');
    const an = metti(k, 'statua-angelo', (u, w) => dS(u, w) < 2.4 && dS(u, w) > 1.4, 1.6, { rot: 180 });
    if (an) k.segna(an[0] - 1.4, an[1], 'Angelo di pietra', 'Tre quarti di copertura. Ogni tanto sembra aver cambiato posa.');
    lanterne(k, 3, (u, w) => dS(u, w) < 1.7 && dS(u, w) > 1.1);
    for (let i = 0; i < 4; i++) metti(k, k.c(['pino-1', 'pino-2', 'albero-morto']), (u, w) => dS(u, w) > 2, 2.4, { strato: 'alto', area: [u0 + 1, w0 + 1, u1 - 1, w1 - 1], raggio: 1.1 });
    k.bosco((u, w) => u < u0 - 0.4 || u > u1 + 0.4 || w < w0 - 0.4, 1, 0.6);
    _nebbia(k, 8);
    return nome;
  };
  // Cimitero dimenticato nel bosco: tombe sparse e storte, un mausoleo in rovina
  const cimitero_bosco = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'Le tombe dimenticate di ' + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-erba', 5) + k.pattern('terreno-terra', 6, 90) + k.pattern('terreno-fango', 4) + k.pattern('terreno-erba-secca', 5) + k.pattern('terreno-pietra', 3);
    k.L.terra += k.tutto('terreno-erba');
    const R = blob(k, cols * r.range(0.4, 0.6), rows * 0.5, cols * 0.34, rows * 0.36, 0.35);
    k.L.terra += `<path d="${R.d}" fill="url(#bm-p-terreno-erba-secca)" opacity="0.75" filter="url(#carto-b12)"/>`;
    const sent = lineaMorbida(k, [fuori(k, r.int(0, 1), r.range(0.3, 0.7)), [R.cu, R.cw]], 2, 71);
    const dS = via(k, 'sent', [sent], 1.6, 'terreno-terra');
    // Mausoleo crollato in un punto del cerchio
    const a = r.range(0, DUE), mu = R.cu + Math.cos(a) * R.ru * 0.5, mw = R.cw + Math.sin(a) * R.rw * 0.5;
    k.L.terra += `<path d="${blob(k, mu, mw, 2.7, 2.5, 0.22).d}" fill="url(#bm-p-terreno-pietra)"/>`;
    k.L.sopra += k.spr('mausoleo', mu, mw, 3, r.range(-8, 8)); k.occupa(mu, mw, 2.2);
    for (let i = 0; i < 4; i++) k.L.sopra += k.spr('macerie', mu + r.range(-2.4, 2.4), mw + r.range(-2.4, 2.4), r.range(1, 1.4), r.range(0, 360));
    k.segna(mu, mw - 2.4, 'Mausoleo', 'La porta è stata forzata dall\'interno.');
    // Tombe sparse a gruppi, storte
    let n = 0;
    for (let g = 0; g < 4; g++) {
      const gu = R.cu + r.range(-R.ru, R.ru) * 0.7, gw = R.cw + r.range(-R.rw, R.rw) * 0.7, rot = r.range(-30, 30);
      for (let i = 0; i < 5; i++) {
        const u = gu + r.range(-2.2, 2.2), w = gw + r.range(-1.6, 1.6);
        if (!R.dentro(u, w, -0.5) || dS(u, w) < 1.3 || !k.libero(u, w, 0.6)) continue;
        k.L.sopra += k.spr(k.c(LAPIDI), u, w, 1.1, rot + r.range(-25, 25)); k.occupa(u, w, 0.6); n++;
        if (n === 2) k.segna(u + 1, w, 'Tombe storte', 'Mezza copertura. La terra è smossa davanti a qualcuna.');
      }
    }
    const fo = metti(k, 'fossa', (u, w) => R.dentro(u, w, -1) && dS(u, w) > 1.5, 1.8, { strato: 'sotto' });
    if (fo) { k.L.sotto += k.spr('scheletro', fo[0] + 1.6, fo[1] + 0.4, 1.4, r.range(0, 360)); k.segna(fo[0], fo[1] - 1.3, 'Fossa scavata', 'Uno scheletro è uscito e si è accasciato lì vicino.'); }
    for (let i = 0; i < 4; i++) metti(k, 'muretto-rotto', (u, w) => R.dentro(u, w, 0.5) && !R.dentro(u, w, -1.5), 3, { raggio: 1.2, rot: (u, w) => deg(Math.atan2(w - R.cw, u - R.cu)) + 90 });
    for (let i = 0, m = 0; i < 40 && m < 4; i++) { const u = r.range(1, cols - 1), w = r.range(1, rows - 1); if (!R.dentro(u, w, -0.5) || !k.libero(u, w, 1.2)) continue; k.L.alto += k.spr('albero-morto', u, w, r.range(2.2, 2.9), r.range(0, 360)); k.occupa(u, w, 1.1); m++; }
    k.sparsi(8, (u, w) => dS(u, w) > 1.2, ['rovi-1', 'rovi-2', 'cespuglio-bianco', 'cerchio-funghi'], 1, 1.8);
    k.bosco((u, w) => !R.dentro(u, w, 0.6) && dS(u, w) > 1.8, 1, 0.6);
    _nebbia(k, 10);
    return nome;
  };

  /* ══════════════ PORTO ══════════════ */
  // Costa: la terra sta da una parte di una linea ondulata (in alto o in basso)
  const _costa = (k, giu, quota, amp, seme) => {
    const pts = [];
    for (let u = -1.5; u <= k.cols + 1.5; u += 0.6) pts.push([u, quota + (k.rn(u * 0.12 + seme, seme) - 0.5) * amp * 2]);
    const linea = (u) => { const i = Math.max(0, Math.min(pts.length - 1, Math.round((u + 1.5) / 0.6))); return pts[i][1]; };
    return { pts, mare: (u, w, m = 0) => giu ? w > linea(u) + m : w < linea(u) - m, linea };
  };
  const _mare = (k, costa, giu, larBassa) => {
    const S = k.S, X = k.X, Y = k.Y, n1 = k.n1;
    const bordo = giu ? k.rows + 2 : -2;
    const d = 'M' + costa.pts.map(([u, w]) => n1(X(u)) + ' ' + n1(Y(w))).join('L') + `L${n1(X(k.cols + 2))} ${n1(Y(bordo))}L${n1(X(-2))} ${n1(Y(bordo))}Z`;
    const d2 = 'M' + costa.pts.map(([u, w]) => n1(X(u)) + ' ' + n1(Y(w + (giu ? larBassa : -larBassa)))).join('L') + `L${n1(X(k.cols + 2))} ${n1(Y(bordo))}L${n1(X(-2))} ${n1(Y(bordo))}Z`;
    k.L.terra += `<path d="${d}" fill="url(#bm-p-terreno-acqua-bassa)" filter="url(#carto-b4)"/><path d="${d2}" fill="url(#bm-p-terreno-acqua-profonda)" filter="url(#carto-b12)"/>`;
    // Schiuma lungo la riva
    k.L.terra += `<path d="M${costa.pts.map(([u, w]) => n1(X(u)) + ' ' + n1(Y(w))).join('L')}" fill="none" stroke="#f4f8f6" stroke-width="${n1(S * 0.25)}" opacity="0.5" filter="url(#carto-b4)"/>`;
  };
  const porto = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'Il porto di ' + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-ciottolato', 3) + k.pattern('terreno-terra', 6, 90) + k.pattern('terreno-acqua-bassa', 4) + k.pattern('terreno-acqua-profonda', 5) + k.pattern('terreno-legno', 3);
    const giu = r.chance(0.5), quota = giu ? rows * 0.5 : rows * 0.5;
    k.L.terra += k.tutto('terreno-terra');
    // Banchina: dritta, di pietra, con il bordo di legno
    const costa = { pts: [[-1.5, quota], [cols + 1.5, quota]], mare: (u, w, m = 0) => giu ? w > quota + m : w < quota - m, linea: () => quota };
    const tw = giu ? quota - 4.5 : quota, bw = 4.5;
    k.L.terra += `<rect x="${k.X(0)}" y="${k.n1(k.Y(tw))}" width="${cols * k.S}" height="${k.n1(bw * k.S)}" fill="url(#bm-p-terreno-ciottolato)"/>`;
    _mare(k, costa, giu, 2.2);
    k.L.alto += `<rect x="${k.X(0)}" y="${k.n1(k.Y(quota) - k.S * 0.18)}" width="${cols * k.S}" height="${k.n1(k.S * 0.36)}" fill="url(#bm-p-terreno-legno)" stroke="#2a221c" stroke-width="1.4"/>`;
    k.segna(cols * 0.15, quota + (giu ? -1 : 1), 'Banchina', 'Il bordo è a 2 metri dall\'acqua: chi cade deve nuotare per risalire.');
    // Moli che entrano nel mare
    const nM = r.int(2, 3), moli = [];
    for (let i = 0; i < nM; i++) {
      const u = cols * (i + 0.5) / nM + r.range(-1.5, 1.5), lung = r.range(6, 7.5), w = quota + (giu ? 1 : -1) * lung / 2;
      k.L.sopra += k.spr('molo', u, w, lung, 90); k.occupa(u, w, 1.2); moli.push(u);
      const lato = r.chance(0.5) ? 1 : -1;
      if (r.chance(0.75)) { k.L.sopra += k.spr(r.chance(0.5) ? 'barca' : 'barca-vela', u + lato * 2.1, w + r.range(-1, 1), r.chance(0.5) ? 3 : 4.6, 90 + r.range(-6, 6)); k.occupa(u + lato * 2.1, w, 1.4); }
      k.L.sopra += k.spr('cima', u - lato * 0.4, quota + (giu ? 0.8 : -0.8), 0.7, 0);
    }
    k.segna(moli[0] + 1.2, quota + (giu ? 3 : -3), 'Molo', 'Assi strette: si passa in due. Sotto, l\'acqua è profonda.');
    metti(k, 'barca-vela', (u, w) => costa.mare(u, w, 8) || (giu ? w > rows - 2.2 : w < 2.2), 6, { raggio: 2.4, rot: r.range(-10, 10) });
    for (let i = 0; i < 2; i++) metti(k, ['scoglio-1', 'scoglio-2'], (u, w) => costa.mare(u, w, 3), 1.8, { raggio: 1 });
    // Magazzini dietro la banchina e merci in giro
    for (let u = 2.4; u < cols - 2; u += r.range(5, 6.2)) {
      if (r.chance(0.2)) continue;
      const w = giu ? tw - 2 : tw + bw + 2; if (w < 1 || w > rows - 1) continue;
      edificio(k, k.c(['casa-ardesia', 'casa-tegole', 'capanno']), u, w, 4.2, giu ? 180 : 0);
    }
    k.segna(3, giu ? tw - 3.4 : tw + bw + 3.4, 'Magazzini', 'Porte larghe e casse impilate dentro: un buon posto per nascondersi.');
    for (let i = 0; i < 4; i++) { const u = r.range(2, cols - 2), w = tw + r.range(1, bw - 1); if (k.libero(u, w, 1.2)) merci(k, u, w, 4); }
    metti(k, 'reti', (u, w) => w > tw + 0.6 && w < tw + bw - 0.6, 1.8, { strato: 'sotto' });
    metti(k, 'nasse', (u, w) => w > tw + 0.6 && w < tw + bw - 0.6, 1.4);
    metti(k, 'ancora', (u, w) => w > tw + 0.6 && w < tw + bw - 0.6, 1.6, { strato: 'sotto' });
    const cr = metti(k, 'carro', (u, w) => w > tw + 1 && w < tw + bw - 1, 3, { raggio: 1.5, rot: 0 });
    if (cr) k.segna(cr[0], cr[1] - 1.5, 'Merci', 'Casse, barili e un carro: mezza copertura ovunque.');
    lanterne(k, 3, (u, w) => Math.abs(w - (giu ? quota - 0.7 : quota + 0.7)) < 0.3);
    return nome;
  };
  // Cala dei contrabbandieri: spiaggia naturale tra gli scogli
  const porto_cala = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'La cala di ' + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-erba', 5) + k.pattern('terreno-terra', 6, 90) + k.pattern('terreno-acqua-bassa', 4) + k.pattern('terreno-acqua-profonda', 5) + k.pattern('terreno-erba-secca', 5);
    const giu = r.chance(0.5);
    k.L.terra += k.tutto('terreno-erba');
    const costa = _costa(k, giu, rows * (giu ? 0.62 : 0.38), 2.2, 81);
    const sabbia = _costa(k, giu, rows * (giu ? 0.36 : 0.64), 1.8, 83);
    const ds = 'M' + sabbia.pts.map(([u, w]) => k.n1(k.X(u)) + ' ' + k.n1(k.Y(w))).join('L') + `L${k.n1(k.X(cols + 2))} ${k.n1(k.Y(giu ? rows + 2 : -2))}L${k.n1(k.X(-2))} ${k.n1(k.Y(giu ? rows + 2 : -2))}Z`;
    k.L.terra += `<path d="${ds}" fill="url(#bm-p-terreno-terra)" filter="url(#carto-b12)"/>`;
    _mare(k, costa, giu, 2.6);
    const spiaggia = (u, w) => sabbia.mare(u, w, 0.6) && !costa.mare(u, w, -0.3);
    k.segna(cols * 0.5, (costa.linea(cols * 0.5) + sabbia.linea(cols * 0.5)) / 2, 'Spiaggia', 'Sabbia morbida: chi corre lascia tracce chiarissime.');
    // Scogliere ai due lati che chiudono la cala
    [1.5, cols - 1.5].forEach((u0) => { for (let i = 0; i < 4; i++) { const u = u0 + (u0 < cols / 2 ? 1 : -1) * r.range(0, 3), w = costa.linea(u) + (giu ? 1 : -1) * r.range(-1, 3); k.L.sopra += k.spr(k.c(['scoglio-1', 'scoglio-2', 'roccia-grande']), u, w, r.range(2, 3), r.range(0, 360)); k.occupa(u, w, 1.3); } });
    k.segna(2.4, costa.linea(2.4) + (giu ? 2.4 : -2.4), 'Scogli', 'Viscidi: terreno difficile. Tre quarti di copertura.');
    const bu = cols * r.range(0.3, 0.7), bw = costa.linea(bu) + (giu ? -1.4 : 1.4);
    k.L.sopra += k.spr('barca', bu, bw, 3, giu ? r.range(-30, 30) + 180 : r.range(-30, 30)); k.occupa(bu, bw, 1.4);
    k.segna(bu + 1.8, bw, 'Barca tirata in secco', 'Mezza copertura. Sotto i teli, casse senza marchio.');
    merci(k, bu + r.range(-3, 3), bw + (giu ? -2 : 2), 5);
    const f = metti(k, 'fuoco-campo', spiaggia, 1.3, { tent: 80 });
    if (f) { k.luce(f[0], f[1], 4.5); k.segna(f[0] + 1.2, f[1], 'Fuoco', 'Si vede dal mare: è un segnale.'); }
    metti(k, 'tenda', spiaggia, 2.4, { tent: 80 });
    metti(k, 'reti', spiaggia, 1.8, { strato: 'sotto', tent: 80 });
    metti(k, 'barca-vela', (u, w) => costa.mare(u, w, 4), 6, { raggio: 2.6, rot: r.range(-20, 20) });
    metti(k, 'ancora', spiaggia, 1.4, { strato: 'sotto', tent: 80 });
    k.sparsi(6, (u, w) => !sabbia.mare(u, w, -0.5), k.CESPUGLI.concat(['roccia-grande', 'cespuglio-giallo']), 1, 1.8);
    k.bosco((u, w) => !sabbia.mare(u, w, -1.2) && r.chance(0.7), 0.8, 0.8);
    return nome;
  };

  /* ══════════════ CAVERNA ══════════════ */
  // Sale collegate da gallerie: dentro si cammina, fuori e' roccia
  const _grotta = (k, sale, gallerie, largG) => {
    const { S, n1 } = k;
    roccia(k);
    k.L.defs += k.pattern('terreno-terra', 6, 90) + k.pattern('terreno-fango', 4);
    const forme = sale.map((s) => `<path d="${s.d}"/>`).join('') + gallerie.map((g) => `<path d="${k.linea(g)}" fill="none" stroke="#fff" stroke-width="${n1(largG * S)}" stroke-linecap="round"/>`).join('');
    k.maschera('grotta', `<g fill="#fff" stroke="none" filter="url(#carto-b4)">${forme.replace(/stroke="#fff"/g, 'stroke="#fff"')}</g>`);
    k.L.terra += k.riempi('terreno-fango', 'grotta') + `<rect x="${k.X(0)}" y="${k.Y(0)}" width="${k.cols * S}" height="${k.rows * S}" fill="#c8a878" opacity="0.12" mask="url(#bm-m-grotta)"/>`;
    let pozz = '';
    for (let i = 0; i < 8; i++) { const s = k.r.pick(sale); const b = blob(k, s.cu + k.r.range(-s.ru, s.ru) * 0.6, s.cw + k.r.range(-s.rw, s.rw) * 0.6, k.r.range(0.8, 1.8), k.r.range(0.6, 1.3), 0.4); pozz += `<path d="${b.d}"/>`; }
    k.L.terra += `<g mask="url(#bm-m-grotta)"><g fill="url(#bm-p-terreno-terra)" opacity="0.35" filter="url(#carto-b12)">${pozz}</g></g>`;
    // Ombra sotto le pareti, dentro la grotta
    k.L.defs += `<filter id="bm-dentro" x="0" y="0" width="100%" height="100%"><feComponentTransfer in="SourceAlpha" result="inv"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer><feGaussianBlur in="inv" stdDeviation="${n1(S * 0.5)}" result="b"/><feComposite in="b" in2="SourceAlpha" operator="in" result="o"/><feFlood flood-color="#0a0705" flood-opacity="0.9"/><feComposite in2="o" operator="in"/></filter>`;
    k.L.terra += `<g filter="url(#bm-dentro)"><rect x="${k.X(0)}" y="${k.Y(0)}" width="${k.cols * S}" height="${k.rows * S}" fill="#000" mask="url(#bm-m-grotta)"/></g>`;
    const dentro = (u, w) => sale.some((s) => s.dentro(u, w)) || gallerie.some((g) => k.dist([u, w], g) < largG / 2);
    k.pianta(dentro);
    // Stalagmiti e massi lungo le pareti
    for (let i = 0, n = 0; i < 400 && n < sale.length * 4; i++) {
      const s = k.r.pick(sale), a = k.r.range(0, DUE), u = s.cu + Math.cos(a) * s.ru * 0.92, w = s.cw + Math.sin(a) * s.rw * 0.92;
      if (!k.libero(u, w, 0.9)) continue;
      k.L.alto += k.spr(k.c(['stalagmiti-1', 'stalagmiti-2', 'stalagmiti-3', 'masso-1', 'masso-3', 'roccia-grande']), u, w, k.r.range(1.4, 2.2), k.r.range(0, 360)); k.occupa(u, w, 0.9); n++;
    }
    return dentro;
  };
  const _sale = (k, n) => {
    const { r, cols, rows } = k, sale = [];
    for (let t = 0; t < 300 && sale.length < n; t++) {
      const f = Math.min(1, rows / 17); // sui fogli piccoli sale piu' piccole, cosi' ce ne stanno di piu'
      const ru = r.range(2.8, 4.4) * f, rw = r.range(2.4, 3.6) * f, u = r.range(ru + 0.8, cols - ru - 0.8), w = r.range(rw + 0.8, rows - rw - 0.8);
      if (sale.some((s) => Math.hypot((s.cu - u) / (s.ru + ru + 2), (s.cw - w) / (s.rw + rw + 1.5)) < 1)) continue;
      sale.push(blob(k, u, w, ru, rw, 0.3));
    }
    sale.sort((a, b) => a.cu - b.cu);
    return sale;
  };
  const _gallerie = (k, sale, extra = 1) => {
    const g = [];
    for (let i = 0; i < sale.length - 1; i++) g.push(lineaMorbida(k, [[sale[i].cu, sale[i].cw], [sale[i + 1].cu, sale[i + 1].cw]], 1.2, 90 + i * 7));
    for (let i = 0; i < extra && sale.length > 2; i++) { const a = k.r.int(0, sale.length - 3); g.push(lineaMorbida(k, [[sale[a].cu, sale[a].cw], [sale[a + 2].cu, sale[a + 2].cw]], 1.5, 120 + i)); }
    const s0 = sale[0]; g.push(lineaMorbida(k, [[s0.cu, s0.cw], [-1.5, s0.cw + k.r.range(-2, 2)]], 1, 131));
    return g;
  };
  const caverna = (k) => {
    const { r } = k;
    const nome = k.o.nome || r.pick(['Le grotte di ', 'La caverna di ', 'Le gallerie di ']) + k.M.nomeLuogo(r, k.o.popolo);
    const sale = _sale(k, r.int(4, 5)), gallerie = _gallerie(k, sale, 1);
    const dentro = _grotta(k, sale, gallerie, 2.6);
    k.segna(0.8, sale[0].cw, 'Ingresso', 'Da qui entra la poca luce che c\'è. Oltre, buio totale.');
    // Ogni sala ha qualcosa di diverso
    const temi = r.shuffle(['funghi', 'cristalli', 'pozza', 'ossa', 'funghi', 'cristalli']);
    sale.slice(1).forEach((s, i) => {
      const t = temi[i], ok = (u, w) => s.dentro(u, w, -0.8), area = [s.cu - s.ru, s.cw - s.rw, s.cu + s.ru, s.cw + s.rw];
      if (t === 'funghi') { for (let j = 0; j < 3; j++) { const p = metti(k, ['funghi-1', 'funghi-2'], ok, r.range(1.3, 1.8), { area }); if (p) k.luce(p[0], p[1], 2.4, '#5fd4ff', 0.5); } k.segna(s.cu, s.cw - s.rw + 0.6, 'Funghi luminosi', 'Luce fioca azzurra fino a 3 m. Mangiarli fa vedere cose (Costituzione CD 13).'); }
      if (t === 'cristalli') { for (let j = 0; j < 3; j++) { const p = metti(k, ['cristalli-1', 'cristalli-2'], ok, r.range(1.3, 1.8), { area }); if (p) k.luce(p[0], p[1], 2.2, '#c08cff', 0.45); } k.segna(s.cu, s.cw - s.rw + 0.6, 'Cristalli', 'Taglienti: chi ci finisce contro prende 1d4 taglienti. Valgono 25 mo l\'uno.'); }
      if (t === 'pozza') { const p = metti(k, 'pozza-caverna', ok, 2.6, { area, strato: 'sotto', raggio: 1.3 }); if (p) k.segna(p[0] + 1.6, p[1], 'Pozza nera', 'Profonda e gelida. Qualcosa riflette la luce sul fondo.'); }
      if (t === 'ossa') { for (let j = 0; j < 3; j++) metti(k, ['ossa', 'scheletro', 'ossa'], ok, r.range(1.1, 1.5), { area, strato: 'sotto' }); k.segna(s.cu, s.cw - s.rw + 0.6, 'Ossa', 'Rosicchiate di fresco. Chi le calpesta fa rumore.'); }
      k.sparsi(2, (u, w) => s.dentro(u, w, -0.6), k.SASSI.concat(['macerie']), 0.6, 1);
    });
    const ul = sale[sale.length - 1];
    metti(k, 'forziere', (u, w) => ul.dentro(u, w, -1), 1, { area: [ul.cu - ul.ru, ul.cw - ul.rw, ul.cu + ul.ru, ul.cw + ul.rw] });
    k.segna(ul.cu, ul.cw + 1.4, 'In fondo', 'La sala più lontana: qualcuno ci tiene le sue cose.');
    k.sparsi(6, dentro, k.SASSI, 0.5, 0.9);
    return nome;
  };
  // Fiume sotterraneo che taglia la grotta, con un ponte di corda
  const caverna_fiume = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'Il fiume sotto ' + k.M.nomeLuogo(r, k.o.popolo);
    k.L.defs += k.pattern('terreno-acqua-profonda', 5) + k.pattern('terreno-acqua-bassa', 4);
    const sale = _sale(k, r.int(3, 4)), gallerie = _gallerie(k, sale, 0);
    const dentro = _grotta(k, sale, gallerie, 2.8);
    const fiume = k.attraversa(true, cols * 0.06, 17);
    k.maschera('fiume', `<path d="${k.linea(fiume)}" fill="none" stroke="#fff" stroke-width="${k.n1(3 * k.S)}" filter="url(#carto-b4)"/>`);
    k.L.terra += `<g mask="url(#bm-m-grotta)">${k.riempi('terreno-acqua-profonda', 'fiume')}</g>`;
    k.L.terra += `<g mask="url(#bm-m-grotta)"><path d="${k.linea(fiume)}" fill="none" stroke="#000" stroke-width="${k.n1(3.6 * k.S)}" opacity="0.35" filter="url(#carto-b12)"/></g>`;
    const inFiume = (u, w) => k.dist([u, w], fiume) < 1.5;
    // Ponte dove una galleria attraversa il fiume
    let messo = false;
    gallerie.forEach((g) => { if (messo) return; const i = g.findIndex(([u, w]) => inFiume(u, w)); if (i < 1) return; const [u, w] = g[i]; k.L.sopra += k.spr('ponte-legno', u, w, 4.6, 0); k.occupa(u, w, 2); k.segna(u, w - 1.6, 'Ponte di assi', 'Oscilla: chi corre fa un tiro di Destrezza (CD 10) o cade nel fiume.'); messo = true; });
    const fi = fiume[Math.floor(fiume.length * 0.3)];
    k.segna(fi[0] + 1.8, fi[1], 'Fiume sotterraneo', 'Corrente forte: chi ci cade viene trascinato 6 m a valle ogni round.');
    sale.forEach((s, i) => {
      const ok = (u, w) => s.dentro(u, w, -0.8) && !inFiume(u, w), area = [s.cu - s.ru, s.cw - s.rw, s.cu + s.ru, s.cw + s.rw];
      if (i % 2) { const p = metti(k, ['funghi-1', 'funghi-2'], ok, 1.5, { area }); if (p) k.luce(p[0], p[1], 2.4, '#5fd4ff', 0.5); }
      else { const p = metti(k, ['cristalli-1', 'cristalli-2'], ok, 1.5, { area }); if (p) k.luce(p[0], p[1], 2.2, '#c08cff', 0.45); }
    });
    metti(k, 'barca', (u, w) => inFiume(u, w) && dentro(u, w), 2.4, { rot: 90, raggio: 1 });
    const sk = metti(k, 'scheletro', (u, w) => dentro(u, w) && !inFiume(u, w) && k.dist([u, w], fiume) < 3, 1.4, { strato: 'sotto' });
    if (sk) k.segna(sk[0] + 1, sk[1], 'Pescatore sfortunato', 'Ha ancora la borsa: 12 mo e una chiave.');
    k.sparsi(6, (u, w) => dentro(u, w) && !inFiume(u, w), k.SASSI.concat(['ossa']), 0.5, 1);
    return nome;
  };
  // La tana: una grande sala con il nido del mostro e il suo tesoro
  const caverna_tana = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'La tana sotto ' + k.M.nomeLuogo(r, k.o.popolo);
    const grande = blob(k, cols * r.range(0.55, 0.65), rows * 0.5, cols * 0.27, rows * 0.36, 0.25);
    const atrio = blob(k, cols * 0.14, rows * r.range(0.3, 0.7), 2.8, 2.4, 0.3);
    const sale = [atrio, grande];
    const gallerie = [lineaMorbida(k, [[atrio.cu, atrio.cw], [grande.cu, grande.cw]], 1.4, 141), lineaMorbida(k, [[atrio.cu, atrio.cw], [-1.5, atrio.cw]], 0.6, 143)];
    const dentro = _grotta(k, sale, gallerie, 2.4);
    k.segna(atrio.cu, atrio.cw - 1.8, 'Ingresso', 'Graffi profondi sulla roccia, all\'altezza della testa.');
    // Il nido: anello di ossa e tesoro in mezzo
    const nu = grande.cu + r.range(1, 3), nw = grande.cw + r.range(-1, 1);
    for (let i = 0; i < 7; i++) { const a = i / 7 * DUE; k.L.sotto += k.spr(k.c(['ossa', 'ossa', 'scheletro']), nu + Math.cos(a) * 2.4, nw + Math.sin(a) * 2, r.range(1.1, 1.5), r.range(0, 360)); }
    k.L.sopra += k.spr('tesoro', nu, nw, 1.8, 0) + k.spr('forziere', nu + 1.1, nw + 0.8, 1, r.range(-20, 20)); k.occupa(nu, nw, 2.6);
    k.luce(nu, nw, 2.2, '#ffd86b', 0.35);
    k.segna(nu, nw - 2.6, 'Il nido', 'Ossa di prede e il tesoro della bestia. Dorme qui sopra.');
    for (let i = 0; i < 1; i++) metti(k, ['pozza-caverna'], (u, w) => grande.dentro(u, w, -1.5) && Math.hypot(u - nu, w - nw) > 4, 2.2, { strato: 'sotto', raggio: 1.2 });
    const p = metti(k, ['cristalli-1', 'cristalli-2'], (u, w) => grande.dentro(u, w, -0.8), 1.6);
    if (p) k.luce(p[0], p[1], 2.2, '#c08cff', 0.45);
    const g = metti(k, 'gabbia', (u, w) => grande.dentro(u, w, -1) && Math.hypot(u - nu, w - nw) > 4, 1.5);
    if (g) k.segna(g[0], g[1] - 1.2, 'Gabbia', 'Un prigioniero vivo, tenuto per dopo.');
    for (let i = 0; i < 3; i++) metti(k, ['colonna-crollata', 'macerie'], (u, w) => grande.dentro(u, w, -1.2), 2, { raggio: 0.9 });
    k.sparsi(8, dentro, k.SASSI.concat(['ossa']), 0.5, 1);
    return nome;
  };

  /* ══════════════ CRIPTA ══════════════ */
  // Stanze rettangolari sulla griglia; i corridoi sono stanze strette
  // Ogni stanza ha un gruppo (quinto valore): tra gruppi diversi c'e' un muro, tranne dove c'e' una porta
  const _stanze = (k, stanze, porteList) => {
    roccia(k);
    k.L.defs += k.pattern('terreno-pietra', 3);
    const gruppo = (u, w) => { const s = stanze.find(([a, b, c, d]) => u > a && u < c && w > b && w < d); return s ? (s[4] || 0) : -1; };
    const dentro = (u, w) => gruppo(u, w) >= 0;
    stanze.forEach(([a, b, c, d]) => { k.L.terra += `<rect x="${k.X(a)}" y="${k.Y(b)}" width="${(c - a) * k.S}" height="${(d - b) * k.S}" fill="url(#bm-p-terreno-pietra)"/>`; });
    k.pianta(dentro, false);
    const porta = (seg) => porteList.some(({ seg: p }) => p.join() === seg.join());
    const nuovi = [];
    for (let w = 0; w < k.rows; w++) for (let u = 0; u < k.cols; u++) {
      const g = gruppo(u + 0.5, w + 0.5);
      if (u + 1 <= k.cols) { const g2 = u + 1 < k.cols ? gruppo(u + 1.5, w + 0.5) : -1, seg = [u + 1, w, u + 1, w + 1]; if (g !== g2 && (g >= 0 || g2 >= 0) && !porta(seg)) nuovi.push(seg); }
      if (w + 1 <= k.rows) { const g2 = w + 1 < k.rows ? gruppo(u + 0.5, w + 1.5) : -1, seg = [u, w + 1, u + 1, w + 1]; if (g !== g2 && (g >= 0 || g2 >= 0) && !porta(seg)) nuovi.push(seg); }
      if (u === 0 && g >= 0) nuovi.push([0, w, 0, w + 1]);
      if (w === 0 && g >= 0) nuovi.push([u, 0, u + 1, 0]);
    }
    nuovi.forEach((m) => k.muri.push(m));
    k.murature(nuovi, porteList);
    porteList.forEach((p) => k.porte.push(p));
    return dentro;
  };
  const cripta = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'La cripta di ' + k.M.nomeLuogo(r, k.o.popolo);
    const hw0 = Math.round(rows / 2 - 3), hw1 = hw0 + 6, hu0 = 5, hu1 = cols - 5;
    const cu0 = Math.round(cols / 2 - 2), su = Math.round(cols / 2);
    const stanze = [
      [1, hw0 + 2, hu0, hw0 + 4], // ingresso, a sinistra
      [hu0, hw0, hu1, hw1], // sala delle tombe
      [cu0, 1, cu0 + 5, hw0, 1], // cella a nord
      [cu0 - 3, hw1, cu0 + 6, rows - 1, 2], // ossario a sud
      [hu1, hw0 + 1, cols - 1, hw1 - 1, 3], // sacello in fondo
    ];
    const porteL = [{ tipo: 'porta', seg: [cu0 + 2, hw0, cu0 + 3, hw0] }, { tipo: 'porta', seg: [su, hw1, su + 1, hw1] }, { tipo: 'porta', seg: [hu1, hw0 + 2, hu1, hw0 + 3] }];
    // Tra le stanze ci sono muri: tolgo dalla pianta automatica solo i varchi delle porte
    const dentro = _stanze(k, stanze, porteL);
    k.L.sopra += k.spr('scale', 2.4, hw0 + 3, 2.2, 90);
    k.segna(2.4, hw0 + 1.2, 'Scale', 'Salgono in superficie. In fondo alle scale, la luce del giorno.');
    // Navata: sarcofagi in due file, statue ai lati
    for (let u = hu0 + 2.5; u < hu1 - 1.5; u += 3) {
      [hw0 + 1.4, hw1 - 1.4].forEach((w) => { k.L.sopra += k.spr('sarcofago', u, w, 2.2, 90); k.occupa(u, w, 1.1); });
    }
    k.segna(hu0 + 2.5, hw0 + 2.8, 'Sarcofagi', 'Tre quarti di copertura. Il coperchio di uno è spostato.');
    k.L.sopra += k.spr('statua-cavaliere', hu0 + 1, hw0 + 3, 1.5, 90);
    k.L.sopra += k.spr('braciere', hu0 + 1, hw0 + 1, 0.9, 0) + k.spr('braciere', hu0 + 1, hw1 - 1, 0.9, 0);
    k.luce(hu0 + 1, hw0 + 1, 2.8); k.luce(hu0 + 1, hw1 - 1, 2.8);
    // Sacello: l'altare
    const au = (hu1 + cols - 1) / 2;
    k.L.sopra += k.spr('altare', au + 0.6, hw0 + 3, 2, -90);
    k.L.sopra += k.spr('braciere', au - 0.8, hw0 + 1.7, 0.8, 0) + k.spr('braciere', au - 0.8, hw1 - 1.7, 0.8, 0);
    k.luce(au, hw0 + 2, 2.4, '#ff9b5e', 0.5); k.luce(au, hw1 - 2, 2.4, '#ff9b5e', 0.5);
    k.segna(au, hw0 + 1, 'Altare', 'Un sigillo inciso: chi lo spezza sveglia i morti della sala.');
    // Cella a nord: prigione
    k.L.sopra += k.spr('gabbia', cu0 + 1.4, 2.4, 1.5, 0) + k.spr('scheletro', cu0 + 3.4, 3, 1.4, r.range(0, 360)) + k.spr('rastrelliera', cu0 + 2.5, 1.5, 1.8, 0);
    k.segna(cu0 + 2.5, hw0 - 1, 'Cella', 'Catene alle pareti. La gabbia è aperta.');
    // Ossario a sud: ossa ovunque e il forziere nascosto
    for (let i = 0; i < 6; i++) k.L.sotto += k.spr(k.c(['ossa', 'ossa', 'scheletro']), r.range(cu0 - 2, cu0 + 5), r.range(hw1 + 1, rows - 2), r.range(1.1, 1.5), r.range(0, 360));
    k.L.sopra += k.spr('forziere', cu0 + 5, rows - 2, 1, -90) + k.spr('tesoro', cu0 + 3.8, rows - 1.8, 1.1, 0);
    k.segna(cu0 - 1.5, hw1 + 1.2, 'Ossario', 'Ossa ammucchiate fino al soffitto: terreno difficile. Nascosto in fondo, un forziere.');
    k.sparsi(4, dentro, ['macerie', 'sasso-1', 'colonna-crollata'], 0.6, 1.4);
    return nome;
  };
  // Catacombe: corridoi a croce con nicchie e una sala rotonda di statue
  const cripta_catacombe = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'Le catacombe di ' + k.M.nomeLuogo(r, k.o.popolo);
    const mu = Math.round(cols / 2), mw = Math.round(rows / 2);
    const stanze = [
      [1, mw - 1, cols - 1, mw + 1], // corridoio est-ovest
      [mu - 1, 1, mu + 1, rows - 1], // corridoio nord-sud
      [mu - 4, mw - 3, mu + 4, mw + 3], // sala centrale
    ];
    // Nicchie lungo i corridoi
    const nicchie = [];
    for (let u = 3; u < cols - 3; u += 3) { if (Math.abs(u - mu) < 6) continue; stanze.push([u, mw - 2, u + 1, mw - 1], [u, mw + 1, u + 1, mw + 2]); nicchie.push([u + 0.5, mw - 1.5], [u + 0.5, mw + 1.5]); }
    for (let w = 2; w < rows - 2; w += 3) { if (Math.abs(w - mw) < 5) continue; stanze.push([mu - 2, w, mu - 1, w + 1], [mu + 1, w, mu + 2, w + 1]); nicchie.push([mu - 1.5, w + 0.5], [mu + 1.5, w + 0.5]); }
    // Due cripte di famiglia agli angoli
    const qa = r.chance(0.5) ? [2, 1, 8, mw - 3, 1] : [cols - 8, 1, cols - 2, mw - 3, 1], qb = r.chance(0.5) ? [2, mw + 3, 8, rows - 1, 2] : [cols - 8, mw + 3, cols - 2, rows - 1, 2];
    stanze.push(qa, qb);
    const porteL = [];
    [qa, qb].forEach(([a, b, c, d]) => {
      const nord = b < mw, vu = a < mu;
      // corridoietto verso il corridoio principale
      const cu = vu ? c : a - 0;
      stanze.push(nord ? [Math.round((a + c) / 2), d, Math.round((a + c) / 2) + 1, mw - 1] : [Math.round((a + c) / 2), mw + 1, Math.round((a + c) / 2) + 1, b]);
      porteL.push({ tipo: 'porta', seg: nord ? [Math.round((a + c) / 2), d, Math.round((a + c) / 2) + 1, d] : [Math.round((a + c) / 2), b, Math.round((a + c) / 2) + 1, b] });
      void cu;
    });
    const dentro = _stanze(k, stanze, porteL);
    nicchie.forEach(([u, w]) => { k.L.sotto += k.spr(r.chance(0.7) ? 'scheletro' : 'ossa', u, w, 0.95, Math.abs(w - mw) < 3 ? 90 : 0); });
    k.segna(nicchie[0][0], nicchie[0][1] - 0.8, 'Nicchie', 'Scheletri composti. Qualcuno, quando passi, gira la testa.');
    // Sala centrale: statue agli angoli, sarcofago al centro
    [[-3, -2], [3, -2], [3, 2], [-3, 2]].forEach(([du, dw]) => { k.L.sopra += k.spr(r.chance(0.5) ? 'statua-cavaliere' : 'statua-angelo', mu + du, mw + dw, 1.4, deg(Math.atan2(-dw, -du)) + 90); });
    k.L.sopra += k.spr('sarcofago', mu, mw, 2.4, 90); k.occupa(mu, mw, 1.4);
    k.L.sopra += k.spr('braciere', mu - 1.6, mw, 0.8, 0) + k.spr('braciere', mu + 1.6, mw, 0.8, 0);
    k.luce(mu - 1.6, mw, 2.4); k.luce(mu + 1.6, mw, 2.4);
    k.segna(mu, mw - 2.2, 'Sala delle statue', 'Le quattro statue guardano il sarcofago del fondatore. Mezza copertura.');
    // Le due cripte di famiglia
    [qa, qb].forEach(([a, b, c, d], i) => {
      const cu = (a + c) / 2, cw = (b + d) / 2, bassa = d - b < 4; // sui fogli piccoli la cripta e' bassa: tutto in fila
      for (let j = 0; j < 2; j++) k.L.sopra += bassa ? k.spr('sarcofago', j ? c - 1.2 : a + 1.2, cw, 1.7, 90) : k.spr('sarcofago', a + 1.5 + j * 3, cw, 2, 0);
      const dw = bassa ? 0 : (b < mw ? -1.4 : 1.4);
      if (i === 0) { k.L.sopra += k.spr('forziere', cu, cw + dw, 0.9, 0); k.segna(cu, cw, 'Cripta di famiglia', 'Due sarcofagi e un forziere con il corredo funebre.'); }
      else { k.L.sopra += k.spr('altare', cu, cw + dw, bassa ? 1.4 : 1.8, b < mw ? 180 : 0); k.luce(cu, cw, 2, '#9fd0ff', 0.4); k.segna(cu, cw, 'Cappella privata', 'Un piccolo altare con una lampada che non si spegne mai.'); }
    });
    for (let i = 0; i < 3; i++) metti(k, ['macerie', 'colonna-crollata', 'ossa'], dentro, 1.2, { raggio: 0.5 });
    k.segna(1.4, mw - 1.4, 'Corridoi', 'Larghi 3 metri, in pietra. Il buio è totale senza una luce.');
    return nome;
  };

  /* ══════════════ BOSCO: altri impianti ══════════════ */
  const _boscoBase = (k) => {
    k.L.defs += k.pattern('terreno-erba', 5) + k.pattern('terreno-terra', 6, 90) + k.pattern('terreno-fango', 4) + k.pattern('terreno-erba-secca', 5);
    k.L.terra += k.tutto('terreno-erba');
  };
  // Bivio: tre strade che si incontrano, con il cartello e un tempietto
  const bosco_bivio = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'Il bivio di ' + k.M.nomeLuogo(r, k.o.popolo);
    _boscoBase(k);
    const xu = cols * r.range(0.38, 0.62), xw = rows * r.range(0.38, 0.62);
    const lati = r.shuffle([0, 1, 2, 3]).slice(0, 3);
    const strade = lati.map((l, i) => lineaMorbida(k, [[xu, xw], fuori(k, l, r.range(0.25, 0.75))], 2, 151 + i * 4));
    const dS = via(k, 'strade', strade, 2.8, 'terreno-terra');
    const P = blob(k, xu, xw, 2.6, 2.2, 0.2);
    k.L.terra += `<path d="${P.d}" fill="url(#bm-p-terreno-terra)" filter="url(#carto-b4)"/>`;
    k.L.sopra += k.spr('cartello', xu + r.range(-0.6, 0.6), xw + r.range(-0.6, 0.6), 1.6, r.range(0, 360)); k.occupa(xu, xw, 1);
    k.segna(xu + 1.2, xw - 1.4, 'Cartello', 'Tre direzioni. Il nome di uno dei paesi è stato raschiato via.');
    // Il tempietto: una statua tra i massi, con le offerte
    const t = metti(k, k.c(['statua-angelo', 'statua-cavaliere']), (u, w) => dS(u, w) > 2.4 && dS(u, w) < 4.2, 1.7, { raggio: 1.4 });
    if (t) { for (let i = 0; i < 3; i++) { const a = r.range(0, DUE); k.L.sopra += k.spr(k.c(k.SASSI), t[0] + Math.cos(a) * 1.3, t[1] + Math.sin(a) * 1.3, 0.7, r.range(0, 360)); } k.L.sotto += k.spr('anfore', t[0] + 0.4, t[1] + 1.3, 1, 0); k.segna(t[0] + 1.4, t[1], 'Tempietto', 'Offerte fresche ai piedi della statua: monete e fiori.'); }
    metti(k, 'carro', (u, w) => dS(u, w) < 1 && Math.hypot(u - xu, w - xw) > 5, 3, { raggio: 1.5 });
    const m = metti(k, 'roccia-grande', (u, w) => dS(u, w) > 2.2 && dS(u, w) < 4, 2.6, { raggio: 1.4 });
    if (m) k.segna(m[0], m[1] - 1.6, 'Roccione', 'Tre quarti di copertura; ci si sale sopra per guardare lontano.');
    metti(k, 'tronco-caduto', (u, w) => dS(u, w) > 2.4 && dS(u, w) < 5, 4.4, { raggio: 1.6 });
    const ro = metti(k, 'rovi-1', (u, w) => dS(u, w) > 2.2 && dS(u, w) < 4.5, 2, { raggio: 1.2 });
    if (ro) k.segna(ro[0], ro[1] - 1.3, 'Rovi', 'Terreno difficile; graffiano.');
    k.sparsi(8, (u, w) => dS(u, w) > 1.8, k.CESPUGLI.concat(k.SASSI, ['ceppo', 'cespuglio-bianco']), 0.7, 1.3);
    k.bosco((u, w) => dS(u, w) > 2.6 && Math.hypot(u - xu, w - xw) > 4, 1.1, 0.5);
    return nome;
  };
  // Radura: un prato aperto in mezzo al bosco fitto, con un cerchio di pietre
  const bosco_radura = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || r.pick(['La radura di ', 'Il cerchio di pietre di ']) + k.M.nomeLuogo(r, k.o.popolo);
    _boscoBase(k);
    const R = blob(k, cols * r.range(0.4, 0.6), rows * r.range(0.42, 0.58), cols * 0.26, rows * 0.3, 0.3);
    k.L.terra += `<path d="${R.d}" fill="url(#bm-p-terreno-erba-secca)" opacity="0.6" filter="url(#carto-b12)"/>`;
    const sent = lineaMorbida(k, [fuori(k, r.int(0, 3), r.range(0.3, 0.7)), [R.cu + r.range(-2, 2), R.cw + r.range(-2, 2)]], 1.8, 161);
    const dS = via(k, 'sent', [sent.filter(([u, w]) => !R.dentro(u, w, -1))], 1.5, 'terreno-terra');
    const pietre = r.chance(0.6);
    if (pietre) {
      const n = r.int(7, 9), rr = Math.min(R.ru, R.rw) * 0.55;
      for (let i = 0; i < n; i++) { const a = i / n * DUE; if (r.chance(0.15)) continue; k.L.sopra += k.spr(k.c(k.MASSI), R.cu + Math.cos(a) * rr, R.cw + Math.sin(a) * rr, r.range(1.3, 1.7), r.range(0, 360)); k.occupa(R.cu + Math.cos(a) * rr, R.cw + Math.sin(a) * rr, 0.8); }
      k.L.sopra += k.spr('altare', R.cu, R.cw, 1.8, r.range(0, 360)); k.occupa(R.cu, R.cw, 1.2);
      k.luce(R.cu, R.cw, 3, '#a8e6ff', 0.35);
      k.segna(R.cu, R.cw - 1.6, 'Cerchio di pietre', 'Dentro il cerchio la magia è più forte: gli incantesimi hanno +1 alla CD.');
      k.segna(R.cu + rr, R.cw + 1, 'Menhir', 'Tre quarti di copertura.');
    } else {
      k.L.sotto += k.spr('cerchio-funghi', R.cu, R.cw, 3.2, r.range(0, 360)); k.occupa(R.cu, R.cw, 1.6);
      k.luce(R.cu, R.cw, 3.2, '#c7ff9a', 0.4);
      k.segna(R.cu, R.cw - 2, 'Cerchio delle fate', 'Chi ci entra di notte sente musica. Saggezza CD 13 o balla fino all\'alba.');
      const st = metti(k, 'stagno', (u, w) => R.dentro(u, w, -1) && Math.hypot(u - R.cu, w - R.cw) > 3.4, 3, { strato: 'sotto', raggio: 1.6 });
      if (st) k.segna(st[0] + 1.8, st[1], 'Stagno', 'Acqua limpida e fredda. Chi beve guarisce 1d4 PF, una volta.');
    }
    for (let i = 0; i < 3; i++) metti(k, ['cespuglio-bianco', 'cespuglio-giallo'], (u, w) => R.dentro(u, w, 0.5) && !R.dentro(u, w, -1.5), 1.3, { strato: 'sotto' });
    metti(k, 'alveare', (u, w) => !R.dentro(u, w) && R.dentro(u, w, 1.5), 1, { tent: 80 });
    const tr = metti(k, 'tronco-caduto', (u, w) => R.dentro(u, w, 0.4) && !R.dentro(u, w, -1.2), 4.2, { raggio: 1.5, rot: (u, w) => deg(Math.atan2(w - R.cw, u - R.cu)) + 90 });
    if (tr) k.segna(tr[0], tr[1] - 1.3, 'Tronco caduto', 'Mezza copertura sul bordo della radura.');
    k.sparsi(5, (u, w) => !R.dentro(u, w) && dS(u, w) > 1.2, k.CESPUGLI.concat(['rovi-1', 'rovi-2']), 1, 1.8);
    k.bosco((u, w) => !R.dentro(u, w, 0.8) && dS(u, w) > 1.6, 1.6, 0.55);
    return nome;
  };
  // Ruscello: un corso d'acqua stretto che il sentiero attraversa su un tronco
  const bosco_ruscello = (k) => {
    const { r, cols, rows } = k;
    const nome = k.o.nome || 'Il ruscello di ' + k.M.nomeLuogo(r, k.o.popolo);
    _boscoBase(k);
    k.L.defs += k.pattern('terreno-acqua-bassa', 4) + k.pattern('terreno-acqua-profonda', 5);
    const rus = lineaMorbida(k, [[cols * r.range(0.2, 0.4), -1.5], [cols * r.range(0.4, 0.6), rows * 0.5], [cols * r.range(0.6, 0.8), rows + 1.5]], 3, 171);
    k.maschera('rive', `<path d="${k.linea(rus)}" fill="none" stroke="#fff" stroke-width="${k.n1(3.4 * k.S)}" stroke-linecap="round" filter="url(#carto-b4)"/>`);
    k.maschera('rus', `<path d="${k.linea(rus)}" fill="none" stroke="#fff" stroke-width="${k.n1(2.4 * k.S)}" stroke-linecap="round" filter="url(#carto-b4)"/>`);
    k.L.terra += k.riempi('terreno-fango', 'rive') + k.riempi('terreno-acqua-bassa', 'rus');
    // Un laghetto dove il ruscello si allarga
    const li = Math.floor(rus.length * r.range(0.2, 0.35)), [lu, lw] = rus[li], lago = blob(k, lu, lw, r.range(2.6, 3.4), r.range(2, 2.6), 0.3);
    k.L.terra += `<path d="${lago.d}" fill="url(#bm-p-terreno-fango)" opacity="0.35" filter="url(#carto-b4)"/>` + `<path d="${blob(k, lu, lw, lago.ru - 0.3, lago.rw - 0.3, 0.25).d}" fill="url(#bm-p-terreno-acqua-bassa)" filter="url(#carto-b4)"/>` + `<path d="${blob(k, lu, lw, lago.ru * 0.5, lago.rw * 0.5, 0.2).d}" fill="url(#bm-p-terreno-acqua-profonda)" filter="url(#carto-b12)"/>`;
    const acqua = (u, w) => k.dist([u, w], rus) < 1.4 || lago.dentro(u, w, -0.4);
    k.segna(lu, lw, 'Laghetto', 'Profondo al centro: si nuota. Pesci argentati.');
    const ri = rus[Math.floor(rus.length * 0.75)];
    k.segna(ri[0] + 1.6, ri[1], 'Ruscello', 'Acqua alle ginocchia, sassi scivolosi: terreno difficile.');
    // Il sentiero attraversa il ruscello sul tronco caduto, piu' in basso il guado
    const pw = rows * r.range(0.55, 0.7), pi = rus.reduce((b, p, i) => Math.abs(p[1] - pw) < Math.abs(rus[b][1] - pw) ? i : b, 0), [pu] = rus[pi];
    const sent = lineaMorbida(k, [[-1.5, pw + r.range(-3, 3)], [pu - 2.2, pw], [pu + 2.2, pw], [cols + 1.5, pw + r.range(-3, 3)]], 1.6, 181);
    const dS = via(k, 'sent', [sent.filter(([u, w]) => !acqua(u, w))], 1.7, 'terreno-terra');
    k.L.sopra += k.spr('tronco-caduto', pu, pw, 5, r.range(-8, 8)); k.occupa(pu, pw, 2);
    k.segna(pu, pw - 1.3, 'Tronco-ponte', 'Si attraversa in fila. Destrezza CD 10 se si combatte sopra.');
    const gi = Math.min(rus.length - 3, pi + 8), [gu, gw] = rus[gi];
    for (let k2 = -1.2; k2 <= 1.2; k2 += 0.8) k.L.sopra += k.spr(k.c(k.SASSI), gu + k2, gw + r.range(-0.2, 0.2), 0.75, r.range(0, 360));
    k.segna(gu + 1.8, gw, 'Guado', 'Sassi piatti: si passa senza bagnarsi, uno alla volta.');
    for (let i = 0; i < 5; i++) { const p = rus[r.int(2, rus.length - 3)]; if (k.libero(p[0] + 1.4, p[1], 0.9)) { k.L.sopra += k.spr(k.c(['canneto-1', 'canneto-2']), p[0] + (r.chance(0.5) ? 1.4 : -1.4), p[1], r.range(1.4, 1.9), r.range(-20, 20)); } }
    k.L.sotto += k.spr(k.c(['ninfee-1', 'ninfee-2']), lu + r.range(-1, 1), lw + r.range(-0.8, 0.8), 1.3, r.range(0, 360));
    const ma = metti(k, k.MASSI, (u, w) => !acqua(u, w) && k.dist([u, w], rus) < 3.4 && dS(u, w) > 1.6, 1.7, { raggio: 0.9 });
    if (ma) k.segna(ma[0], ma[1] - 1.2, 'Massi', 'Mezza copertura sulla riva.');
    metti(k, 'ceppo', (u, w) => !acqua(u, w) && dS(u, w) > 1.2, 0.9);
    k.sparsi(7, (u, w) => !acqua(u, w) && k.dist([u, w], rus) > 2 && dS(u, w) > 1.3, k.CESPUGLI.concat(k.SASSI, ['cespuglio-bianco']), 0.7, 1.3);
    k.bosco((u, w) => k.dist([u, w], rus) > 2.4 && !lago.dentro(u, w, 1.2) && dS(u, w) > 2, 1.1, 0.4);
    return nome;
  };

  return {
    accampamento, accampamento_carovana, accampamento_avamposto,
    rovine, rovine_chiostro, rovine_torre,
    palude, palude_capanna,
    villaggio, villaggio_incrocio, villaggio_fattoria,
    mercato, mercato_strada, mercato_fiera,
    cimitero, cimitero_bosco,
    porto, porto_cala,
    caverna, caverna_fiume, caverna_tana,
    cripta, cripta_catacombe,
    bosco_bivio, bosco_radura, bosco_ruscello,
  };
})();

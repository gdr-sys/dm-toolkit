/* ============================================================
   CARTOGRAFO-ABITAZIONE.JS — Generatore di edifici: pianta a corpi
   uniti (non piu' un semplice rettangolo), un disegno per ogni piano
   con stanze illuminate dal centro e muri di pietra, e il tetto visto
   dall'alto, con falde, scandole e comignoli.
   ============================================================ */

const CartoAbitazione = (() => {
  const M = CartoMotore, n1 = M.n1;

  // I due stili del Cartografo: pianta incisa su carta (atlante) e pianta notturna con le finestre accese (notte)
  const TONI = {
    atlante: {
      stile: 'notte', chiaro: true, sfondo: '#ece5d3', muro: '#cdc1a6', finestra: '#c08a2e', ink: '#4a4034', luce: '#f6f2e7', mezza: '#ece4d1', ombra: '#d8ccb0', griglia: '#a3927a', testo: '#3a3128', testoInk: '#f6f2e7', titolo: '#3a3128',
      mobile: '#dccdaa', mobileInk: '#5a4c3a', scala: '#cfc09e', tegola: '#bdae90', tegolaInk: '#5a4c3a', cantina: ['#e6decb', '#d8cfb8', '#c4b897'],
    },
    colori: {
      stile: 'notte', chiaro: true, colore: true, sfondo: '#eae6d6', muro: '#c9bc9f', finestra: '#2f6680', ink: '#4a4034', luce: '#f6f0de', mezza: '#ece0c3', ombra: '#d9c69e', griglia: '#a3927a', testo: '#3a3128', testoInk: '#f6f0de', titolo: '#3a3128',
      mobile: '#d9b585', mobileInk: '#5a4c3a', scala: '#c9ad82', tegola: '#c98a6a', tegolaInk: '#5e2f20', cantina: ['#e3dbc5', '#d4cab0', '#bdb093'],
    },
    notte: {
      stile: 'notte', sfondo: '#0e1d26', muro: '#2f4856', finestra: '#e9b84f', ink: '#c3ced1', luce: '#3b5a6a', mezza: '#264151', ombra: '#132a36', griglia: '#5f7f8c', testo: '#e8e1cf', testoInk: '#0d1d26', titolo: '#e8e1cf',
      mobile: '#4a6372', mobileInk: '#0b161c', scala: '#35505e', tegola: '#2c4856', tegolaInk: '#08131a', cantina: ['#22343e', '#18282f', '#0c161b'],
    },
  };

  const abitazione = (o) => {
    const r = M.rng('abitazione:' + o.seme);
    const t = TONI[M.stileDi(o.palette)];
    const carta = { ...(t.chiaro ? (t.colore ? M.PALETTE.colori : M.PALETTE.atlante) : t.stile === 'notte' ? M.PALETTE.cartografo : t.colore ? M.PALETTE.colori : M.PALETTE.atlante), carta: t.sfondo, carta2: t.sfondo, inchiostro: t.titolo, tenue: t.griglia };
    const tipo = CartoTesti.TIPI_CASA[o.edificio] ? o.edificio : 'casa', T = CartoTesti.TIPI_CASA[tipo];
    const nPiani = Math.max(1, Math.min(3, parseInt(o.piani, 10) || 2));
    const cantina = o.cantina !== false, conLegenda = o.legenda === true, conTetto = o.tetto !== false;
    const W = 1400, H = 1000;
    const nome = o.nome || (tipo === 'taverna'
      ? r.pick(T.nomi) + ' ' + r.pick(['Cinghiale Zoppo', 'Corvo Bianco', 'Barile Rotto', 'Lupo Grigio', 'Gatto Nero', 'Viandante'])
      : tipo === 'torre' ? r.pick(T.nomi) + ' ' + M.nomeLuogo(r, o.popolo) : r.pick(T.nomi) + ' ' + (() => { const f = r.pick(['Aldighieri', 'dei Marangoni', 'Bellandi', 'dei Cordari', 'Ferrante', 'Vespri']); return o.popolo && o.popolo !== 'italiano' ? M.nomeLuogo(M.rng('casato:' + o.seme), o.popolo) : f; })());

    /* ── Corpi dell'edificio: uno principale e fino a due ali ── */
    const bw = T.dim[0] - 3 + r.int(-1, 1), bh = T.dim[1] - 2 + r.int(-1, 1);
    const corpi = [{ x: 0, y: 0, w: bw, h: bh, base: true }];
    const nAli = tipo === 'torre' ? 0 : r.int(1, 2);
    const sovrappone = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    for (let prova = 0; prova < 40 && corpi.length <= nAli; prova++) {
      // Niente ali davanti (li' c'e' l'ingresso); se l'edificio e' gia' largo si cresce in alto, cosi' sul foglio resta raccolto
      const largoOra = Math.max(...corpi.map((c) => c.x + c.w)) - Math.min(...corpi.map((c) => c.x)), altoOra = Math.max(...corpi.map((c) => c.y + c.h)) - Math.min(...corpi.map((c) => c.y));
      const a = corpi[r.int(0, corpi.length - 1)], w = r.int(4, 6), h = r.int(4, 6), lato = largoOra > altoOra * 1.2 ? 0 : r.int(0, 2);
      const al = lato === 0 ? { x: a.x + r.int(0, Math.max(0, a.w - w)), y: a.y - h, w, h } : lato === 1 ? { x: a.x - w, y: a.y + r.int(0, Math.max(0, a.h - h)), w, h } : { x: a.x + a.w, y: a.y + r.int(0, Math.max(0, a.h - h)), w, h };
      if (!corpi.some((c) => sovrappone(c, al))) corpi.push(al);
    }
    const ox0 = Math.min(...corpi.map((c) => c.x)), oy0 = Math.min(...corpi.map((c) => c.y));
    corpi.forEach((c) => { c.x -= ox0; c.y -= oy0; });
    const fw = Math.max(...corpi.map((c) => c.x + c.w)), fh = Math.max(...corpi.map((c) => c.y + c.h));
    const principale = corpi[0];

    // Vano scale nell'angolo in basso del corpo principale, identico a ogni piano
    const angoloDx = r.chance(0.5), sw = 2, sh = 3;
    const scaleR = { x: angoloDx ? principale.x + principale.w - sw : principale.x, y: principale.y + principale.h - sh, w: sw, h: sh };

    const dividi = (q, maxA, out) => {
      const area = q.w * q.h, puoW = q.w >= 6, puoH = q.h >= 6;
      if (area <= maxA * r.range(0.8, 1.3) || (!puoW && !puoH)) { out.push(q); return; }
      if (puoW && (!puoH || q.w / q.h > r.range(0.8, 1.2))) {
        const k = r.int(3, q.w - 3);
        dividi({ x: q.x, y: q.y, w: k, h: q.h }, maxA, out); dividi({ x: q.x + k, y: q.y, w: q.w - k, h: q.h }, maxA, out);
      } else {
        const k = r.int(3, q.h - 3);
        dividi({ x: q.x, y: q.y, w: q.w, h: k }, maxA, out); dividi({ x: q.x, y: q.y + k, w: q.w, h: q.h - k }, maxA, out);
      }
    };

    const costruisci = (livello) => {
      const interrato = livello < 0;
      const presenti = interrato ? [principale] : livello === 0 ? corpi : corpi.filter((c) => c.base || c.sopra !== false && (c.piani === undefined ? (c.piani = r.int(1, nPiani)) : c.piani) > livello);
      const pezzi = [];
      // Il corpo principale si taglia attorno alle scale: una striscia di lato e il resto
      const b = principale;
      const lato = angoloDx ? { x: b.x, y: b.y, w: b.w - sw, h: b.h } : { x: b.x + sw, y: b.y, w: b.w - sw, h: b.h };
      const sopra = { x: scaleR.x, y: b.y, w: sw, h: b.h - sh };
      if (lato.w > 0) pezzi.push(lato);
      if (sopra.h > 0) pezzi.push(sopra);
      presenti.filter((c) => !c.base).forEach((c) => pezzi.push({ x: c.x, y: c.y, w: c.w, h: c.h }));
      const stanze = [];
      const massimo = interrato ? 40 : livello === 0 ? (tipo === 'taverna' ? 48 : 30) : (tipo === 'taverna' ? 26 : 22);
      pezzi.forEach((q) => dividi(q, massimo, stanze));
      stanze.sort((a, c) => c.w * c.h - a.w * a.h);
      const nomi = interrato ? (tipo === 'torre' ? ['Segrete', 'Deposito', 'Stanza nascosta', 'Cantina'] : ['Cantina', 'Deposito', 'Stanza nascosta', 'Ripostiglio'])
        : (livello === 0 ? T.terra : T.sopra).filter((n) => n !== 'Soffitta' || livello === nPiani - 1);
      let iNome = 0;
      // Finiti i nomi "importanti" si passa a stanze minori: niente "Cucina 2" o "Sala comune 2"
      const MINORI = ['Sgabuzzino', 'Stanzino', 'Legnaia', 'Lavanderia', 'Anticamera', 'Stanza vuota'];
      stanze.forEach((s) => {
        if (Math.min(s.w, s.h) <= 2) { s.nome = 'Disimpegno'; s.mobili = []; s.nota = 'Passaggio di servizio.'; return; }
        const n = iNome < nomi.length ? nomi[iNome] : MINORI[(iNome - nomi.length) % MINORI.length];
        iNome++;
        s.nome = n; s.etichetta = n;
        s.mobili = (CartoTesti.MOBILI[n] || ['cassa']).slice(); s.nota = CartoTesti.NOTE_STANZA[n] || 'Una stanza di poco conto, tutta da riempire.';
      });
      const scale = { ...scaleR, nome: 'Scale', scale: true, mobili: [] };
      const tutte = stanze.concat([scale]);
      const pieno = new Set();
      tutte.forEach((s) => { for (let j = s.y; j < s.y + s.h; j++) for (let i = s.x; i < s.x + s.w; i++) pieno.add(i + ',' + j); });

      // Porte: un albero che collega tutto, piu' qualche passaggio in piu'
      const confini = [];
      tutte.forEach((a, i) => tutte.forEach((c, k) => {
        if (k <= i) return;
        if (a.x + a.w === c.x || c.x + c.w === a.x) {
          const pos = a.x + a.w === c.x ? c.x : a.x, y0 = Math.max(a.y, c.y), y1 = Math.min(a.y + a.h, c.y + c.h);
          if (y1 - y0 >= 1) confini.push({ i, k, vert: true, pos, da: y0, a: y1 });
        }
        if (a.y + a.h === c.y || c.y + c.h === a.y) {
          const pos = a.y + a.h === c.y ? c.y : a.y, x0 = Math.max(a.x, c.x), x1 = Math.min(a.x + a.w, c.x + c.w);
          if (x1 - x0 >= 1) confini.push({ i, k, vert: false, pos, da: x0, a: x1 });
        }
      }));
      const porte = [];
      const metti = (c) => porte.push({ vert: c.vert, pos: c.pos, q: c.a - c.da <= 2 ? c.da : r.int(c.da, c.a - 1) });
      const legate = new Set([0]);
      const mescolati = r.shuffle(confini);
      for (let g = 0; g < tutte.length * 2; g++) for (const c of mescolati) if (legate.has(c.i) !== legate.has(c.k)) { metti(c); legate.add(c.i); legate.add(c.k); c.usato = true; }
      mescolati.forEach((c) => { if (!c.usato && r.chance(0.14)) metti(c); });

      // Ingresso sul lato basso del corpo principale, lontano dalle scale
      let ingresso = null;
      if (livello === 0) {
        const qx = angoloDx ? b.x + r.int(1, Math.max(1, b.w - sw - 2)) : b.x + sw + r.int(1, Math.max(1, b.w - sw - 2));
        ingresso = { x: qx, y: b.y + b.h };
      }
      // Finestre: ogni due o tre celle di muro esterno
      const finestre = [];
      if (!interrato) {
        const ok = (x, y) => pieno.has(x + ',' + y);
        pieno.forEach((k) => {
          const [x, y] = k.split(',').map(Number);
          if ((x + y * 3) % 3 === 0 || (x + 1) % 2 === 0 && (y + 1) % 2 === 0) {
            if (!ok(x, y - 1) && x % 2 === 0) finestre.push({ vert: false, pos: y, q: x });
            if (!ok(x, y + 1) && x % 2 === 0 && !(ingresso && Math.abs(ingresso.x - x) < 2)) finestre.push({ vert: false, pos: y + 1, q: x });
            if (!ok(x - 1, y) && y % 2 === 0) finestre.push({ vert: true, pos: x, q: y });
            if (!ok(x + 1, y) && y % 2 === 0) finestre.push({ vert: true, pos: x + 1, q: y });
          }
        });
      }
      return { livello, interrato, stanze, scale, tutte, porte, ingresso, finestre, pieno, presenti };
    };

    const livelli = [];
    for (let l = 0; l < nPiani; l++) livelli.push(l);
    if (cantina) livelli.push(-1);
    const piani = livelli.map(costruisci);
    const NOME = (l) => (l < 0 ? 'Cantina' : l === 0 ? 'Piano terra' : l === 1 ? 'Primo piano' : 'Secondo piano');

    /* ── Impaginazione ── */
    const pannelli = piani.length + (conTetto ? 1 : 0);
    const areaW = (conLegenda ? W - 372 : W) - 60, areaH = H - 120;
    let scelta = { c: 1, s: 0 };
    for (let col = 1; col <= pannelli; col++) {
      const fila = Math.ceil(pannelli / col);
      const s = Math.min(((areaW - (col - 1) * 40) / col - 20) / (fw + 0.6), ((areaH - (fila - 1) * 34) / fila - 60) / (fh + 1.7));
      // Una fila in piu' riempie meglio il foglio: piu' colonne solo se ingrandiscono davvero
      if (s > scelta.s * 1.2) scelta = { c: col, s };
    }
    const S = Math.floor(Math.min(scelta.s, 70)), colonne = scelta.c, file = Math.ceil(pannelli / colonne);
    const blW = (fw + 0.6) * S + 20, blH = (fh + 1.7) * S + 60;
    const totW = colonne * blW + (colonne - 1) * 40, totH = file * blH + (file - 1) * 34;
    const inX = 30 + (areaW - totW) / 2, inY = 104 + (areaH - totH) / 2;
    const I = t.ink;
    const SP = Math.max(5, S * 0.22); // spessore del muro esterno
    // Posizione di un pannello; l'ultima fila, se incompleta, sta al centro invece che a sinistra
    const origine = (indice) => {
      const col = indice % colonne, fila = Math.floor(indice / colonne);
      const nellaFila = fila === file - 1 ? pannelli - fila * colonne : colonne;
      return [inX + (colonne - nellaFila) * (blW + 40) / 2 + col * (blW + 40) + 10 + S * 0.3, inY + fila * (blH + 34) + 46];
    };

    /* ── Gradienti: la luce nasce al centro di ogni stanza e muore agli angoli ── */
    let s0 = `<defs><radialGradient id="carto-stanza" cx="50%" cy="50%" r="68%"><stop offset="0%" stop-color="${t.luce}"/><stop offset="55%" stop-color="${t.mezza}"/><stop offset="100%" stop-color="${t.ombra}"/></radialGradient>` +
      `<radialGradient id="carto-cantina" cx="50%" cy="50%" r="68%"><stop offset="0%" stop-color="${t.cantina[0]}"/><stop offset="55%" stop-color="${t.cantina[1]}"/><stop offset="100%" stop-color="${t.cantina[2]}"/></radialGradient></defs>`;

    let testi = '';
    const voci = [], pin = [];
    let numero = 0;

    const mobile = (m, x, y, w, h) => {
      const X = x * S, Y = y * S, L = w * S, A = h * S, f = t.mobile, k = t.mobileInk;
      const rt = (a, b, c, d) => `<rect x="${n1(a)}" y="${n1(b)}" width="${n1(c)}" height="${n1(d)}" fill="${f}" fill-opacity="0.6" stroke="${k}" stroke-width="${n1(Math.max(1.1, S * 0.05))}"/>`;
      const rc = (a, b, q) => `<circle cx="${n1(a)}" cy="${n1(b)}" r="${n1(q)}" fill="${f}" fill-opacity="0.6" stroke="${k}" stroke-width="${n1(Math.max(1.1, S * 0.05))}"/>`;
      const q = S * 0.1;
      switch (m) {
        case 'letto': return rt(X + q, Y + q, L - q * 2, A - q * 2) + (L > A ? rt(X + q * 2, Y + q * 2, Math.min(L, A) * 0.42, A - q * 4) : rt(X + q * 2, Y + q * 2, L - q * 4, Math.min(L, A) * 0.42));
        case 'tavolo': return rt(X + q, Y + q, L - q * 2, A - q * 2) + rt(X + q * 2.2, Y + q * 2.2, L - q * 4.4, A - q * 4.4);
        case 'tavolino': return rc(X + L / 2, Y + A / 2, S * 0.3) + rc(X + L / 2, Y + A / 2, S * 0.18);
        case 'bancone': return rt(X + q * 0.5, Y + q, L - q, A - q * 2);
        case 'botte': return rc(X + L / 2, Y + A / 2, S * 0.34) + rc(X + L / 2, Y + A / 2, S * 0.2);
        case 'cassa': return rt(X + q * 1.5, Y + q * 1.5, L - q * 3, A - q * 3) + `<path d="M${n1(X + q * 1.5)} ${n1(Y + q * 1.5)}L${n1(X + L - q * 1.5)} ${n1(Y + A - q * 1.5)}" stroke="${k}" stroke-width="1"/>`;
        case 'baule': return rt(X + q * 1.2, Y + q * 2.2, L - q * 2.4, A - q * 4.4);
        case 'scaffale': return rt(X + 1, Y + 1, L - 2, A - 2);
        case 'camino': return rt(X, Y, L, A) + rc(X + L / 2, Y + A / 2, Math.min(L, A) * 0.28);
        default: return '';
      }
    };

    /* Disegna i corpi come un'unica sagoma: prima il contorno, poi il riempimento sopra */
    const sagoma = (lista) => {
      const rects = lista.map((c) => `<rect x="${n1(c.x * S - SP)}" y="${n1(c.y * S - SP)}" width="${n1(c.w * S + SP * 2)}" height="${n1(c.h * S + SP * 2)}"`);
      return rects.map((q) => `${q} fill="${I}" stroke="${I}" stroke-width="3"/>`).join('') + rects.map((q) => `${q} fill="${t.muro}"/>`).join('') + (t.stile === 'atlante' ? rects.map((q) => `${q} fill="url(#carto-tratt)"/>`).join('') : '');
    };

    /* Tetto a padiglione di un corpo: quattro falde, scandole, displuvi con i coppi */
    const tettoCorpo = (c, ombra = 0) => {
      const m = S * 0.28, x0 = c.x * S - m, y0 = c.y * S - m, x1 = (c.x + c.w) * S + m, y1 = (c.y + c.h) * S + m;
      const larg = x1 - x0, alt = y1 - y0, ins = Math.min(larg, alt) / 2;
      const a = larg >= alt ? [x0 + ins, y0 + alt / 2] : [x0 + larg / 2, y0 + ins], b = larg >= alt ? [x1 - ins, y0 + alt / 2] : [x0 + larg / 2, y1 - ins];
      const NO = [x0, y0], NE = [x1, y0], SE = [x1, y1], SO = [x0, y1];
      const nord = larg >= alt ? [NO, NE, b, a] : [NO, NE, a];
      const sud = larg >= alt ? [SO, SE, b, a] : [SO, SE, b];
      const ovest = larg >= alt ? [NO, SO, a] : [NO, SO, b, a];
      const est = larg >= alt ? [NE, SE, b] : [NE, SE, b, a];
      const passo = Math.max(5, S * 0.17);
      const falda = (poly, ang, scuro) => `<path d="${M.via(poly)}" fill="${t.tegola}"/><path d="${M.via(poly)}" fill="#000" opacity="${scuro}"/>` +
        `<path d="${M.tratteggio(poly, ang, passo, 0, r)}" fill="none" stroke="${t.tegolaInk}" stroke-width="${n1(Math.max(1, S * 0.05))}" stroke-dasharray="${n1(passo * 2)} ${n1(passo * 0.5)}" opacity="${0.85}"/>`;
      let g = `<rect x="${n1(x0 + 4)}" y="${n1(y0 + 5)}" width="${n1(larg)}" height="${n1(alt)}" fill="#000" opacity="${ombra}"/>`;
      g += falda(ovest, 0, 0) + falda(nord, Math.PI / 2, 0.06) + falda(est, 0, 0.3) + falda(sud, Math.PI / 2, 0.22);
      const coppo = (u, v) => `<path d="M${n1(u[0])} ${n1(u[1])}L${n1(v[0])} ${n1(v[1])}" stroke="${I}" stroke-width="${n1(S * 0.14 + 2)}" stroke-linecap="round"/><path d="M${n1(u[0])} ${n1(u[1])}L${n1(v[0])} ${n1(v[1])}" stroke="${t.tegola}" stroke-width="${n1(S * 0.14)}" stroke-linecap="round" stroke-dasharray="${n1(S * 0.22)} ${n1(S * 0.05)}"/>`;
      g += coppo(a, b) + coppo(NO, a) + coppo(SO, larg >= alt ? a : b) + coppo(NE, larg >= alt ? b : a) + coppo(SE, b);
      g += `<rect x="${n1(x0)}" y="${n1(y0)}" width="${n1(larg)}" height="${n1(alt)}" fill="none" stroke="${I}" stroke-width="2.4"/>`;
      return g;
    };

    const scalini = (ox, oy) => {
      const b = principale;
      const qx = piani[0].ingresso.x;
      return `<g transform="translate(${n1(ox)} ${n1(oy)})"><rect x="${n1(qx * S - S * 0.3)}" y="${n1((b.y + b.h) * S + SP * 0.6)}" width="${n1(S * 1.6)}" height="${n1(S * 0.62)}" fill="${t.scala}" stroke="${I}" stroke-width="2"/>` +
        `<path d="M${n1(qx * S - S * 0.3)} ${n1((b.y + b.h) * S + SP * 0.6 + S * 0.21)}h${n1(S * 1.6)}M${n1(qx * S - S * 0.3)} ${n1((b.y + b.h) * S + SP * 0.6 + S * 0.42)}h${n1(S * 1.6)}" stroke="${I}" stroke-width="1.5"/>` +
        `<path d="M${n1(qx * S + S * 0.5)} ${n1((b.y + b.h) * S + SP + S * 1.4)}v${n1(-S * 0.6)}m${n1(-S * 0.14)} ${n1(S * 0.18)}l${n1(S * 0.14)} ${n1(-S * 0.18)}l${n1(S * 0.14)} ${n1(S * 0.18)}" fill="none" stroke="${I}" stroke-width="2"/></g>`;
    };

    /* ── Un pannello per piano ── */
    piani.forEach((pi, indice) => {
      const [ox, oy] = origine(indice);
      const fondoStanza = pi.interrato ? 'url(#carto-cantina)' : 'url(#carto-stanza)';
      // Nome del piano appena sopra le sue stanze (la cantina puo' occupare solo una parte della pianta)
      const cima = pi.stanze.length ? Math.min(...pi.stanze.map((s) => s.y)) : 0;
      const sx = pi.stanze.length ? Math.min(...pi.stanze.map((s) => s.x)) : 0, dx = pi.stanze.length ? Math.max(...pi.stanze.map((s) => s.x + s.w)) : fw;
      testi += M.etichetta(ox + (sx + dx) * S / 2, oy + cima * S - 14, NOME(pi.livello), carta, { size: Math.max(22, Math.min(32, S * 0.64)), font: carta.fontTitolo, peso: t.stile === 'notte' ? 600 : 400, spazio: 2, colore: t.titolo, alone: t.sfondo, aloneW: 3 });
      let g = `<g transform="translate(${n1(ox)} ${n1(oy)})">`;

      // Sotto: i tetti dei corpi che a questo piano non ci sono piu'
      if (pi.livello > 0) corpi.filter((c) => !pi.presenti.includes(c)).forEach((c) => { g += tettoCorpo(c, 0.2); });
      g += sagoma(pi.presenti);

      // Stanze: piano illuminato, griglia tratteggiata, contorno
      const ri = SP * 0.3; // meta' spessore del tramezzo
      pi.tutte.forEach((s) => {
        const x = s.x * S + ri, y = s.y * S + ri, w = s.w * S - ri * 2, h = s.h * S - ri * 2;
        g += `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="2" fill="${s.scale ? t.mezza : fondoStanza}" stroke="${I}" stroke-width="${n1(Math.max(1.5, S * 0.05))}"/>`;
      });
      if (o.griglia !== false) {
        let qu = '';
        pi.tutte.forEach((s) => {
          for (let i = 1; i < s.w; i++) qu += `M${n1((s.x + i) * S)} ${n1(s.y * S + ri)}V${n1((s.y + s.h) * S - ri)}`;
          for (let j = 1; j < s.h; j++) qu += `M${n1(s.x * S + ri)} ${n1((s.y + j) * S)}H${n1((s.x + s.w) * S - ri)}`;
        });
        g += `<path d="${qu}" fill="none" stroke="${t.griglia}" stroke-width="${n1(Math.max(0.9, S * 0.035))}" stroke-dasharray="${n1(S * 0.1)} ${n1(S * 0.1)}" opacity="0.7"/>`;
      }

      // Arredi: liberi i passaggi davanti alle porte
      const occ = new Set();
      const blocca = (x, y) => occ.add(x + ',' + y);
      pi.porte.forEach((d) => { if (d.vert) { blocca(d.pos - 1, d.q); blocca(d.pos, d.q); } else { blocca(d.q, d.pos - 1); blocca(d.q, d.pos); } });
      if (pi.ingresso) { blocca(pi.ingresso.x, pi.ingresso.y - 1); blocca(pi.ingresso.x, pi.ingresso.y - 2); }
      if (o.arredi !== false) {
        const DIM = { letto: [1, 2], tavolo: [2, 1], tavolino: [1, 1], bancone: [3, 1], botte: [1, 1], cassa: [1, 1], baule: [1, 1], scaffale: [2, 1], camino: [2, 1] };
        const AL_MURO = new Set(['letto', 'bancone', 'scaffale', 'camino']);
        pi.stanze.forEach((s) => {
          // La fascia centrale resta libera per il nome della stanza: i mobili vanno attorno
          if (s.nome !== 'Disimpegno' && s.h >= 2) {
            const meta = s.y + s.h / 2, file = s.h % 2 ? [Math.floor(meta)] : [meta - 1, meta];
            file.forEach((j) => { for (let i = s.x; i < s.x + s.w; i++) blocca(i, j); });
          }
          const libero = (x, y, w, h) => {
            if (x < s.x || y < s.y || x + w > s.x + s.w || y + h > s.y + s.h) return false;
            for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (occ.has(i + ',' + j)) return false;
            return true;
          };
          (s.mobili || []).forEach((m) => {
            const [a, b] = DIM[m] || [1, 1];
            for (let k = 0; k < 40; k++) {
              const giro = r.chance(0.5);
              let w = giro ? b : a, h = giro ? a : b, x, y;
              if (AL_MURO.has(m) || r.chance(0.6)) {
                const muro = r.int(0, 3);
                if (m !== 'letto') { w = muro < 2 ? a : b; h = muro < 2 ? b : a; }
                x = muro === 2 ? s.x : muro === 3 ? s.x + s.w - w : r.int(s.x, Math.max(s.x, s.x + s.w - w));
                y = muro === 0 ? s.y : muro === 1 ? s.y + s.h - h : r.int(s.y, Math.max(s.y, s.y + s.h - h));
              } else { x = r.int(s.x, Math.max(s.x, s.x + s.w - w)); y = r.int(s.y, Math.max(s.y, s.y + s.h - h)); }
              if (!libero(x, y, w, h)) continue;
              for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) blocca(i, j);
              if (m === 'scaffale' || m === 'camino') {
                const sott = 0.55, ww = w > h ? w : sott, hh = w > h ? sott : h, xx = w > h ? x : (x === s.x ? x : x + 1 - sott), yy = w > h ? (y === s.y ? y : y + 1 - sott) : y;
                g += mobile(m, xx, yy, ww, hh);
              } else g += mobile(m, x, y, w, h);
              break;
            }
          });
        });
      }

      // Scale: gradini e le frecce di chi sale e di chi scende
      const sc = pi.scale, gr = sc.h * 3;
      let tr = '';
      for (let i = 0; i <= gr * 0.66; i++) tr += `M${n1(sc.x * S + ri)} ${n1((sc.y + sc.h) * S - ri - S * 0.35 - i * S / 3)}h${n1(sc.w * S - ri * 2)}`;
      g += `<path d="${tr}" stroke="${I}" stroke-width="${n1(Math.max(1.4, S * 0.05))}"/><path d="M${n1((sc.x + 1) * S)} ${n1(sc.y * S + S * 0.9)}V${n1((sc.y + sc.h) * S - S * 0.35)}" stroke="${I}" stroke-width="${n1(Math.max(1.3, S * 0.05))}"/>`;
      const freccia = (x, y0, y1) => `<path d="M${n1(x)} ${n1(y0)}L${n1(x)} ${n1(y1)}m${n1(-S * 0.13)} ${n1(y1 < y0 ? S * 0.16 : -S * 0.16)}l${n1(S * 0.13)} ${n1(y1 < y0 ? -S * 0.16 : S * 0.16)}l${n1(S * 0.13)} ${n1(y1 < y0 ? S * 0.16 : -S * 0.16)}" fill="none" stroke="${I}" stroke-width="${n1(Math.max(1.6, S * 0.055))}"/>`;
      const ultimo = pi.livello === nPiani - 1, primo = pi.livello === (cantina ? -1 : 0);
      if (!ultimo) g += freccia((sc.x + 1.5) * S, (sc.y + sc.h) * S - S * 0.6, sc.y * S + S * 0.55);
      if (!primo) g += freccia((sc.x + 0.5) * S, sc.y * S + S * 0.55, (sc.y + sc.h) * S - S * 0.6);

      // Porte: un varco nel tramezzo con una riga tratteggiata di soglia e i due piedritti
      const fondoV = pi.interrato ? t.cantina[1] : t.mezza;
      pi.porte.forEach((d) => {
        const m = SP * 0.42, q0 = d.q * S + S * 0.18, ll = S * 0.64;
        if (d.vert) {
          const x = d.pos * S;
          g += `<rect x="${n1(x - m)}" y="${n1(q0)}" width="${n1(m * 2)}" height="${n1(ll)}" fill="${fondoV}"/><path d="M${n1(x)} ${n1(q0)}v${n1(ll)}" stroke="${I}" stroke-width="1.2" stroke-dasharray="3 3"/><path d="M${n1(x - m)} ${n1(q0)}h${n1(m * 2)}M${n1(x - m)} ${n1(q0 + ll)}h${n1(m * 2)}" stroke="${I}" stroke-width="1.6"/>`;
        } else {
          const y = d.pos * S;
          g += `<rect x="${n1(q0)}" y="${n1(y - m)}" width="${n1(ll)}" height="${n1(m * 2)}" fill="${fondoV}"/><path d="M${n1(q0)} ${n1(y)}h${n1(ll)}" stroke="${I}" stroke-width="1.2" stroke-dasharray="3 3"/><path d="M${n1(q0)} ${n1(y - m)}v${n1(m * 2)}M${n1(q0 + ll)} ${n1(y - m)}v${n1(m * 2)}" stroke="${I}" stroke-width="1.6"/>`;
        }
      });

      // Finestre: blocchi piu' scuri nello spessore del muro
      pi.finestre.forEach((f) => {
        const lato = f.vert ? (pi.pieno.has((f.pos) + ',' + f.q) ? -1 : 1) : (pi.pieno.has(f.q + ',' + f.pos) ? -1 : 1);
        const prof = SP * 1.0, c0 = f.q * S + S * 0.2, ll = S * 0.6;
        g += f.vert
          ? `<rect x="${n1(lato < 0 ? f.pos * S - prof : f.pos * S)}" y="${n1(c0)}" width="${n1(prof)}" height="${n1(ll)}" fill="${t.finestra}" stroke="${I}" stroke-width="1"/>`
          : `<rect x="${n1(c0)}" y="${n1(lato < 0 ? f.pos * S - prof : f.pos * S)}" width="${n1(ll)}" height="${n1(prof)}" fill="${t.finestra}" stroke="${I}" stroke-width="1"/>`;
      });

      if (pi.ingresso) {
        const x = pi.ingresso.x * S, y = pi.ingresso.y * S;
        g += `<rect x="${n1(x + S * 0.18)}" y="${n1(y - SP * 0.1)}" width="${n1(S * 0.64)}" height="${n1(SP * 1.2)}" fill="${t.scala}" stroke="${I}" stroke-width="1.2"/>`;
      }
      s0 += g + '</g>';
      if (pi.ingresso) s0 += scalini(ox - S * 0.0, oy);

      // Nomi grandi al centro delle stanze
      pi.stanze.forEach((s) => {
        if (s.nome === 'Disimpegno') return;
        numero += 1;
        const cx = ox + (s.x + s.w / 2) * S, cy = oy + (s.y + s.h / 2) * S, largB = s.w * S * 0.88;
        const eti = (conLegenda ? numero + '. ' : '') + s.etichetta;
        // Il nome sta dentro la stanza: fino a tre righe, corpo ridotto finche' entra in larghezza e in altezza
        const parole = eti.split(' '), altB = s.h * S * 0.78;
        const spezza = (n) => { const out = [], per = Math.ceil(parole.length / n); for (let k = 0; k < parole.length; k += per) out.push(parole.slice(k, k + per).join(' ')); return out; };
        const misura = (rr) => Math.min(S * 0.62, largB / (Math.max(...rr.map((x) => x.length)) * 0.5), altB / (rr.length * 1.05));
        let righe = [eti], dim = misura(righe);
        for (let n = 2; n <= Math.min(3, parole.length); n++) { const rr = spezza(n), d = misura(rr); if (d > dim * 1.08) { righe = rr; dim = d; } }
        dim = Math.max(10, dim);
        righe.forEach((rg, i) => {
          testi += M.etichetta(cx, cy + dim * 0.34 + (i - (righe.length - 1) / 2) * dim * 1.02, rg, carta, { size: n1(dim), font: carta.fontCorpo || carta.font, peso: 600, colore: t.testo, alone: t.testoInk, aloneW: Math.max(2.4, dim * 0.13) });
        });
        voci.push({ n: numero, titolo: s.etichetta, testo: s.nota });
        pin.push({ x: cx, y: cy - dim * (righe.length * 0.62), label: (conLegenda ? numero + '. ' : '') + s.etichetta, note: NOME(pi.livello) + '. ' + s.nota, sottotipo: 'nota' });
      });
      voci.push({ titolo: NOME(pi.livello), testo: '', piano: true });
      // L'intestazione del piano va prima delle sue stanze
      const ultimaInt = voci.pop(), quante = pi.stanze.filter((s) => s.nome !== 'Disimpegno').length;
      voci.splice(voci.length - quante, 0, ultimaInt);
    });

    /* ── Il tetto ── */
    if (conTetto) {
      const [ox, oy] = origine(piani.length);
      testi += M.etichetta(ox + fw * S / 2, oy - 14, 'Tetto', carta, { size: Math.max(22, Math.min(32, S * 0.64)), font: carta.fontTitolo, peso: t.stile === 'notte' ? 600 : 400, spazio: 2, colore: t.titolo, alone: t.sfondo, aloneW: 3 });
      let g = `<g transform="translate(${n1(ox)} ${n1(oy)})">`;
      const ordine = corpi.slice().sort((a, b) => (a.base ? 1 : 0) - (b.base ? 1 : 0));
      ordine.forEach((c) => { g += tettoCorpo(c, 0.22); });
      corpi.forEach((c, i) => {
        if (i > 0 && r.chance(0.5)) return;
        const q = S * 0.62, x = (c.x + c.w * r.range(0.3, 0.7)) * S - q / 2, y = (c.y + c.h * r.range(0.3, 0.7)) * S - q / 2;
        g += `<rect x="${n1(x + 3)}" y="${n1(y + 4)}" width="${n1(q)}" height="${n1(q)}" fill="#000" opacity="0.3"/><rect x="${n1(x)}" y="${n1(y)}" width="${n1(q)}" height="${n1(q)}" fill="${t.muro}" stroke="${I}" stroke-width="2"/><rect x="${n1(x + q * 0.24)}" y="${n1(y + q * 0.24)}" width="${n1(q * 0.52)}" height="${n1(q * 0.52)}" rx="${n1(q * 0.1)}" fill="${I}"/>`;
      });
      s0 += g + '</g>' + scalini(ox, oy);
    }

    /* ── Composizione ── */
    let svg = M.apri(W, H, carta, o.seme) + s0;
    if (o.nomi !== false) svg += testi;
    if (conLegenda) svg += M.legenda(W - 348, 36, 316, H - 72, 'Le stanze', voci, carta);
    const cx = conLegenda ? (W - 372) / 2 : W / 2;
    if (o.titolo !== false) svg += M.etichetta(cx, 70, nome, carta, { size: 44, font: M.FONT_APP_TITOLI, peso: 400, aloneW: 6 });
    svg += M.scala(50, H - 48, S * 4, { valore: 6, nome: 'metri' }, 2, carta) + M.chiudi(W, H, carta);
    return { nome, pin, W, H, larghezzaKm: W / S * 1.5 / 1000, svg };
  };

  return { abitazione };
})();

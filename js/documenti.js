/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   DOCUMENTI.JS — Documenti di gioco illustrati: lettere sigillate,
   taglie, editti, avvisi da bacheca e mappe del tesoro. I testi si
   scrivono usando i nomi veri della campagna (PNG, Luoghi, Fazioni)
   e restano sempre modificabili. Carta, macchie e sigilli sono SVG.
   ============================================================ */

const Documenti = (() => {
  const M = CartoMotore, n1 = M.n1;
  const F = {
    corsivo: "'La Belle Aurore', 'Segoe Script', cursive",
    fretta: "'Reenie Beanie', 'Segoe Print', cursive",
    stampa: "'IM Fell English', Georgia, serif",
    titoli: "'IM Fell English SC', Georgia, serif",
    gotico: "'UnifrakturMaguntia', 'Times New Roman', serif",
  };
  const CARTE = {
    pergamena: { nome: 'Pergamena', base: '#e6d3a8', scura: '#8f6c3b', bordo: '#6f4d24', ink: '#2a1b0e' },
    avorio: { nome: 'Avorio', base: '#f2ead6', scura: '#a68f66', bordo: '#8a7350', ink: '#1f1a14' },
    sudicia: { nome: 'Sudicia', base: '#c8b48a', scura: '#574327', bordo: '#3f2d17', ink: '#1e140a' },
    grigia: { nome: 'Grigia', base: '#cfccc2', scura: '#6b675c', bordo: '#4b483f', ink: '#191815' },
  };
  const ETA = { nuova: ['Quasi nuova', 0.25, 3], vissuta: ['Vissuta', 0.65, 8], rovinata: ['Rovinata', 1, 16], bruciata: ['Bruciata', 1, 24] };

  const TIPI = {
    lettera: { nome: 'Lettera', W: 900, H: 1200 },
    taglia: { nome: 'Taglia', W: 900, H: 1200 },
    editto: { nome: 'Editto', W: 900, H: 1200 },
    avviso: { nome: 'Avviso', W: 900, H: 1000 },
    tesoro: { nome: 'Mappa del tesoro', W: 1200, H: 900 },
  };

  /* ── Testi: nomi veri se ci sono, inventati altrimenti ── */
  const NOMI_RISERVA = ['Berengario', 'Ilaria Corvi', 'Tancredi', 'Oriana', 'Fosco il Rosso', 'Madonna Vespri', 'Ugolino', 'Mirella', 'Bastiano Tre Dita', 'Sigismonda'];
  const FAZ_RISERVA = ['Gilda dei Cordari', 'Mano Grigia', 'Ordine del Pozzo', 'Consiglio dei Nove'];
  const testi = (tipo, seme, cmp = {}) => {
    const r = M.rng('testo:' + tipo + ':' + seme);
    const png = () => r.pick(cmp.png && cmp.png.length ? cmp.png : NOMI_RISERVA);
    const luogo = () => r.pick(cmp.luoghi && cmp.luoghi.length ? cmp.luoghi : [M.nomeLuogo(r), M.nomeLuogo(r)]);
    const faz = () => r.pick(cmp.fazioni && cmp.fazioni.length ? cmp.fazioni : FAZ_RISERVA);
    const a = png(), b = png(), l = luogo(), l2 = luogo(), f = faz(), monete = r.pick([100, 150, 200, 300, 500, 800, 1000]);
    const scegli = (lista) => r.pick(lista);
    switch (tipo) {
      case 'lettera': return scegli([
        { titolo: 'Per ' + a + ', nelle sue mani', corpo: `Non scrivermi più a ${l}: le lettere vengono aperte prima di arrivare. So chi le apre e so per conto di chi.\n\nQuello che hai nascosto sotto il pozzo non è più al sicuro. Portalo via prima della luna nuova, e non fidarti di ${b}, qualunque cosa ti dica.\n\nBrucia questa lettera.`, firma: 'Chi ti vuole ancora vivo' },
        { titolo: 'A ' + a + ',', corpo: `Ti scrivo con la mano che trema. Quello che abbiamo visto a ${l} non era un incidente, e ora anche ${f} lo sa.\n\nMi hanno offerto denaro per tacere. Ho accettato, che il cielo mi perdoni. Se leggi queste righe, significa che il denaro non è bastato.\n\nCerca ${b} e digli che la chiave è dove l'abbiamo lasciata.`, firma: b },
        { titolo: 'Sorella mia,', corpo: `Il viaggio verso ${l} è andato peggio del previsto, ma sono vivo. ${a} mi ha trovato un letto e non fa domande, cosa che di questi tempi vale più dell'oro.\n\nSe qualcuno chiede di me, sono morto da due inverni. Di' lo stesso anche alla mamma, se puoi farlo senza piangere.\n\nTornerò quando sarà finita.`, firma: 'Tuo fratello' },
      ]);
      case 'taglia': return {
        titolo: scegli(['Ricercato', 'Taglia', 'Vivo o morto']), soggetto: a,
        corpo: scegli([`Furto nei magazzini di ${l} e ferimento di due guardie durante la fuga. Porta armi: non avvicinatevi da soli.`, `Tradimento contro ${f}. Ultimo avvistamento sulla strada per ${l}. Non ascoltate ciò che dice.`, `Furto, incendio e falsificazione di sigilli. Chiunque offra riparo sarà ritenuto complice.`, `Fuga dalle prigioni di ${l} la notte scorsa. Segni particolari: una cicatrice sulla mano sinistra e un accento straniero.`]),
        premio: monete + ' monete d\'oro', firma: 'Per ordine di ' + f,
      };
      case 'editto': return {
        titolo: 'Editto', corpo: scegli([`Si fa sapere a tutti gli abitanti di ${l} che, da questo giorno e fino a nuovo ordine, le porte verranno chiuse al calar del sole.\n\nChiunque sia trovato fuori dalle mura dopo il coprifuoco verrà condotto ai ceppi senza processo. Le locande chiuderanno al primo rintocco.\n\nChi ha notizie su quanto accaduto a ${l2} si presenti al corpo di guardia: sarà ricompensato.`, `In considerazione dei recenti disordini, ${f} dispone che ogni carro in transito per ${l} paghi una nuova gabella di ${Math.round(monete / 20)} monete.\n\nÈ proibito portare armi entro le mura senza licenza. È altresì proibito dare asilo a chiunque non sia iscritto nei registri.\n\nChi disobbedirà ne risponderà con i propri beni.`]),
        firma: 'Dato a ' + l + ', per volontà di ' + f,
      };
      case 'avviso': return scegli([
        { titolo: 'Cercasi aiuto', corpo: `Qualcosa ammazza le bestie nella valle sotto ${l}. Già sei capre e un mulo. Non sono lupi, i lupi non aprono i recinti.\n\nPago ${monete} monete a chi lo trova.`, firma: 'Chiedere di ' + a + ' alla locanda' },
        { titolo: 'Scomparso', corpo: `Mio figlio è uscito tre sere fa verso ${l} e non è tornato. Ha dodici anni e un cappello rosso.\n\nChi l'ha visto parli, non chiedo altro. Ho poco ma è tutto suo.`, firma: a },
        { titolo: 'Guardie per carovana', corpo: `Partenza per ${l} tra tre giorni. Si cercano braccia buone e poche domande.\n\n${Math.round(monete / 10)} monete al giorno, cibo compreso. Il carico non è affar vostro.`, firma: 'Rivolgersi a ' + a },
      ]);
      case 'tesoro': return {
        titolo: scegli(['Il bottino di ' + a, 'L\'oro di ' + a, 'Qui giace il tesoro']),
        corpo: scegli(['Dal vecchio molo conta cento passi verso il monte. Dove l\'albero spezzato guarda il mare, scava sotto la sua ombra di mezzogiorno.', 'Segui l\'acqua finché non diventa sale. Tre pietre segnano la via: la quarta non la vedrai, ma ci inciamperai.', 'Non fidarti della stella che resta ferma. Chi arriva di notte trova solo ciò che lo stava aspettando.']),
        firma: 'A chi verrà dopo',
      };
      default: return { titolo: '', corpo: '', firma: '' };
    }
  };

  /* ── Testo a capo ── */
  const _aCapo = (testo, max) => {
    const out = [];
    String(testo || '').split('\n').forEach((par) => {
      if (!par.trim()) { out.push(''); return; }
      let cur = '';
      par.trim().split(/\s+/).forEach((w) => {
        if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
      });
      if (cur) out.push(cur);
    });
    return out;
  };
  // Trova il corpo piu' grande che sta nello spazio; il rapporto larghezza/altezza dipende dal font
  const _blocco = (testo, x, y, larg, alt, st) => {
    const { font, max = 40, min = 16, rapporto = 0.46, inter = 1.38, ink, corsivo = false, ancora = 'start', storto = null, peso = 400 } = st;
    let dim = max, righe = [];
    for (; dim >= min; dim -= 1) {
      righe = _aCapo(testo, Math.floor(larg / (dim * rapporto)));
      if (righe.length * dim * inter <= alt) break;
    }
    dim = Math.max(dim, min);
    const xx = ancora === 'middle' ? x + larg / 2 : x;
    let s = '', yy = y + dim;
    righe.forEach((rg) => {
      if (rg) {
        const rot = storto ? ` transform="rotate(${storto.range(-0.55, 0.55).toFixed(2)} ${n1(xx)} ${n1(yy)})"` : '';
        s += `<text x="${n1(xx)}" y="${n1(yy)}" font-family="${font}" font-size="${dim}" font-weight="${peso}"${corsivo ? ' font-style="italic"' : ''} text-anchor="${ancora}" fill="${ink}"${rot}>${M.esc(rg)}</text>`;
      }
      yy += dim * inter * (rg ? 1 : 0.62);
    });
    return { svg: s, fine: yy - dim * inter, dim };
  };
  const _riga = (x, y, testo, font, dim, ink, ancora = 'middle', extra = '') => `<text x="${n1(x)}" y="${n1(y)}" font-family="${font}" font-size="${n1(dim)}" text-anchor="${ancora}" fill="${ink}" ${extra}>${M.esc(testo)}</text>`;

  /* ── Foglio ── */
  const _foglio = (W, H, r, rn, c, o, margine = 34) => {
    const [, invecchia, strappo] = ETA[o.eta] || ETA.vissuta;
    const bruciata = o.eta === 'bruciata';
    const punti = [];
    const lati = [[margine, margine, W - margine, margine], [W - margine, margine, W - margine, H - margine], [W - margine, H - margine, margine, H - margine], [margine, H - margine, margine, margine]];
    lati.forEach(([x0, y0, x1, y1], k) => {
      const l = Math.hypot(x1 - x0, y1 - y0), n = Math.round(l / 9), nx = -(y1 - y0) / l, ny = (x1 - x0) / l;
      for (let i = 0; i < n; i++) {
        const t = i / n, q = (rn((x0 + (x1 - x0) * t) * 0.012 + k * 9, (y0 + (y1 - y0) * t) * 0.012) - 0.5) * strappo * 2.4 + (rn(i * 0.5 + k * 31, 7) - 0.5) * strappo * 0.65;
        punti.push([x0 + (x1 - x0) * t + nx * Math.abs(q), y0 + (y1 - y0) * t + ny * Math.abs(q)]);
      }
    });
    const d = M.via(punti);
    let s = `<defs><clipPath id="doc-c"><path d="${d}"/></clipPath>` +
      `<filter id="doc-t" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.0045 0.0065" numOctaves="4" seed="${r.int(1, 900)}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${(0.3 + invecchia * 0.34).toFixed(2)} ${(-0.12 - invecchia * 0.05).toFixed(2)}"/></filter>` +
      `<filter id="doc-f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.42" numOctaves="3" seed="${r.int(1, 900)}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 -0.2"/></filter>` +
      `<filter id="doc-g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="${r.int(1, 900)}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 -0.22"/></filter>` +
      `<filter id="doc-b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter><filter id="doc-b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>` +
      `<filter id="doc-i" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="${r.int(1, 900)}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter></defs>`;
    s += `<path d="${d}" fill="#000" opacity="0.5" transform="translate(7 11)" filter="url(#doc-b2)"/>`;
    s += `<path d="${d}" fill="${c.base}"/><g clip-path="url(#doc-c)">`;
    s += `<rect width="${W}" height="${H}" fill="${c.scura}" filter="url(#doc-t)"/><rect width="${W}" height="${H}" fill="${c.scura}" filter="url(#doc-g)" opacity="0.4"/><rect width="${W}" height="${H}" fill="${c.scura}" filter="url(#doc-f)" opacity="0.5"/>`;
    // Pieghe: una linea chiara e una scura affiancate
    const nP = invecchia > 0.3 ? 2 : 1;
    for (let i = 1; i <= nP; i++) {
      const y = H * i / (nP + 1) + r.range(-10, 10);
      s += `<path d="M0 ${n1(y)}L${W} ${n1(y + r.range(-6, 6))}" stroke="#000" stroke-width="1.6" opacity="${(0.1 + invecchia * 0.14).toFixed(2)}"/><path d="M0 ${n1(y + 2.5)}L${W} ${n1(y + 2.5)}" stroke="#fff" stroke-width="2" opacity="0.2"/>`;
    }
    if (W > H * 0.8 || r.chance(0.6)) { const x = W / 2 + r.range(-8, 8); s += `<path d="M${n1(x)} 0V${H}" stroke="#000" stroke-width="1.4" opacity="${(0.08 + invecchia * 0.12).toFixed(2)}"/><path d="M${n1(x + 2.5)} 0V${H}" stroke="#fff" stroke-width="1.8" opacity="0.16"/>`; }
    // Aloni: macchie e il segno tondo lasciato da un boccale
    for (let i = 0; i < invecchia * 6; i++) {
      s += `<ellipse cx="${r.int(60, W - 60)}" cy="${r.int(60, H - 60)}" rx="${r.int(30, 120)}" ry="${r.int(25, 90)}" fill="${c.scura}" opacity="${r.range(0.05, 0.13).toFixed(2)}" filter="url(#doc-b2)"/>`;
    }
    if (invecchia > 0.5 && r.chance(0.7)) {
      const x = r.int(150, W - 150), y = r.int(150, H - 150), q = r.int(52, 72);
      s += `<circle cx="${x}" cy="${y}" r="${q}" fill="none" stroke="${c.bordo}" stroke-width="${r.range(2.5, 5).toFixed(1)}" opacity="0.26" stroke-dasharray="${r.int(70, 170)} ${r.int(4, 24)}" filter="url(#doc-i)"/>`;
    }
    // Bordi scuriti e, se bruciata, carbonizzati
    s += `<path d="${d}" fill="none" stroke="${c.bordo}" stroke-width="${n1(34 + invecchia * 50)}" opacity="${(0.32 + invecchia * 0.3).toFixed(2)}" filter="url(#doc-b)"/>`;
    if (bruciata) s += `<path d="${d}" fill="none" stroke="#1a0d04" stroke-width="30" filter="url(#doc-b2)" opacity="0.95"/><path d="${d}" fill="none" stroke="#6b3209" stroke-width="58" filter="url(#doc-b)" opacity="0.8"/>`;
    s += '</g>';
    s += `<path d="${d}" fill="none" stroke="${bruciata ? '#120803' : c.bordo}" stroke-width="${bruciata ? 3 : 1.4}" opacity="0.85"/>`;
    return s;
  };

  const _sigillo = (x, y, q, stemma, r, iniziale) => {
    const col = r.pick(['#8e1b1f', '#7a1a2b', '#20405f', '#2c5038']), p = [];
    for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, m = q * (1.04 + (r.f() - 0.5) * 0.16); p.push([x + Math.cos(a) * m, y + Math.sin(a) * m]); }
    const forma = M.via(M.morbida(p, 2, true));
    let punti2 = '';
    for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283; punti2 += `<circle cx="${n1(x + Math.cos(a) * q * 0.86)}" cy="${n1(y + Math.sin(a) * q * 0.86)}" r="1.5" fill="#000" opacity="0.28"/>`; }
    const dentro = stemma ? Araldica.impronta(stemma, x, y, q * 0.62, col)
      : `<text x="${x}" y="${n1(y + q * 0.3)}" font-family="${F.gotico}" font-size="${n1(q * 0.95)}" text-anchor="middle" fill="#000" opacity="0.5">${M.esc(iniziale || '')}</text>`;
    return `<path d="${forma}" fill="#000" opacity="0.4" transform="translate(3 5)" filter="url(#doc-b2)"/><path d="${forma}" fill="${col}"/>` + punti2 +
      `<circle cx="${x}" cy="${y}" r="${n1(q * 0.74)}" fill="#000" opacity="0.2"/><circle cx="${x}" cy="${y}" r="${n1(q * 0.74)}" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="2"/>` +
      dentro +
      `<path d="M${n1(x - q * 0.7)} ${n1(y - q * 0.5)}A${n1(q * 0.9)} ${n1(q * 0.9)} 0 0 1 ${n1(x + q * 0.2)} ${n1(y - q * 0.84)}" fill="none" stroke="#fff" stroke-opacity="0.42" stroke-width="3" stroke-linecap="round"/>`;
  };
  const _chiodo = (x, y) => `<circle cx="${x + 2}" cy="${y + 3}" r="11" fill="#000" opacity="0.4"/><circle cx="${x}" cy="${y}" r="10" fill="#6d6a64" stroke="#191510" stroke-width="2"/><circle cx="${x - 3}" cy="${y - 3}" r="3" fill="#cfccc4"/>`;

  /* ── I cinque documenti ── */
  const _lettera = (o, W, H, c, r, st) => {
    const ink = c.ink;
    let s = `<g filter="url(#doc-i)">`;
    s += _riga(120, 170, o.titolo, F.corsivo, Math.min(58, (W - 240) / (Math.max(1, String(o.titolo || '').length) * 0.42)), ink, 'start');
    s += _blocco(o.corpo, 120, 210, W - 240, H - 480, { font: F.corsivo, max: 48, min: 26, rapporto: 0.4, inter: 1.42, ink, storto: r }).svg;
    s += _riga(W - 340, H - 190, o.firma, F.corsivo, 50, ink, 'middle', `transform="rotate(-2 ${W - 340} ${H - 190})"`) + '</g>';
    s += `<path d="M${W - 500} ${H - 168}Q${W - 340} ${H - 146} ${W - 190} ${H - 176}Q${W - 300} ${H - 150} ${W - 420} ${H - 150}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" opacity="0.8"/>`;
    for (let i = 0; i < 2; i++) {
      const bx = r.int(160, W - 160), by = r.int(240, H - 340);
      s += `<ellipse cx="${bx}" cy="${by}" rx="${r.int(5, 11)}" ry="${r.int(4, 9)}" fill="${ink}" opacity="0.72"/>`;
      for (let k = 0; k < 7; k++) s += `<circle cx="${bx + r.int(-24, 24)}" cy="${by + r.int(-20, 20)}" r="${r.range(0.8, 2.2).toFixed(1)}" fill="${ink}" opacity="0.65"/>`;
    }
    s += _sigillo(170, H - 180, 62, o.stemmaImg ? null : st, r, o.iniziale);
    return s;
  };
  const _taglia = (o, W, H, c, r) => {
    const ink = c.ink;
    let s = `<g filter="url(#doc-i)"><rect x="78" y="78" width="${W - 156}" height="${H - 156}" fill="none" stroke="${ink}" stroke-width="5"/><rect x="90" y="90" width="${W - 180}" height="${H - 180}" fill="none" stroke="${ink}" stroke-width="1.4"/>`;
    s += _riga(W / 2, 192, String(o.titolo).toUpperCase(), F.titoli, Math.min(118, 700 / Math.max(6, String(o.titolo || '').length) * 1.3), ink);
    s += `<path d="M120 216H${W - 120}M150 228H${W - 150}" stroke="${ink}" stroke-width="3"/>`;
    // Ritratto da incisione: una figura incappucciata, senza volto
    const x = W / 2, y = 400, fw = 300, fh = 300;
    s += `<rect x="${x - fw / 2}" y="${y - fh / 2 + 4}" width="${fw}" height="${fh}" fill="#00000012" stroke="${ink}" stroke-width="4"/><rect x="${x - fw / 2 + 9}" y="${y - fh / 2 + 13}" width="${fw - 18}" height="${fh - 18}" fill="none" stroke="${ink}" stroke-width="1.4"/>`;
    { let raggi = ''; for (let a = 0; a < 6.283; a += 0.13) raggi += `M${x} ${y - 20}L${n1(x + Math.cos(a) * 240)} ${n1(y - 20 + Math.sin(a) * 240)}`; s += `<clipPath id="doc-ritr"><rect x="${x - fw / 2 + 10}" y="${y - fh / 2 + 14}" width="${fw - 20}" height="${fh - 20}"/></clipPath><path clip-path="url(#doc-ritr)" d="${raggi}" stroke="${ink}" stroke-width="1.1" opacity="0.5"/>`; }
    const cappuccio = `M${x - 100} ${y + 142}C${x - 100} ${y + 60} ${x - 88} ${y + 40} ${x - 68} ${y + 18}C${x - 72} ${y - 60} ${x - 40} ${y - 112} ${x} ${y - 118}C${x + 40} ${y - 112} ${x + 72} ${y - 60} ${x + 68} ${y + 18}C${x + 88} ${y + 40} ${x + 100} ${y + 60} ${x + 100} ${y + 142}Z`;
    s += `<path d="${cappuccio}" fill="${ink}"/><ellipse cx="${x}" cy="${y - 22}" rx="40" ry="54" fill="#000"/><path d="M${x - 19} ${y - 30}l15 5l-15 3ZM${x + 19} ${y - 30}l-15 5l15 3Z" fill="${c.base}"/>`;
    s += `<path d="${M.tratteggio([[x - 88, y + 70], [x + 88, y + 70], [x + 92, y + 142], [x - 92, y + 142]], 0.9, 5)}" stroke="${c.base}" stroke-width="1" opacity="0.28"/>`;
    s += _riga(W / 2, 630, o.soggetto || '', F.titoli, Math.min(74, 780 / Math.max(6, String(o.soggetto || '').length) * 1.5), ink);
    s += _blocco(o.corpo, 130, 650, W - 260, 220, { font: F.stampa, max: 34, min: 20, rapporto: 0.43, inter: 1.3, ink, ancora: 'middle' }).svg;
    s += _riga(W / 2, 925, 'Ricompensa', F.stampa, 36, ink, 'middle', 'font-style="italic"') + `<path d="M170 914H${W / 2 - 104}M${W / 2 + 104} 914H${W - 170}" stroke="${ink}" stroke-width="2"/>`;
    s += _riga(W / 2, 1000, String(o.premio || ''), F.titoli, Math.min(76, 780 / Math.max(8, String(o.premio || '').length) * 1.5), '#7a1212');
    s += `<path d="M180 1030H${W - 180}" stroke="${ink}" stroke-width="2.4"/>`;
    s += _riga(W / 2, 1076, o.firma, F.stampa, 30, ink, 'middle', 'font-style="italic"') + '</g>';
    s += _chiodo(60, 60) + _chiodo(W - 60, 62);
    return s;
  };
  const _editto = (o, W, H, c, r, st) => {
    const ink = c.ink;
    let s = `<g filter="url(#doc-i)"><rect x="70" y="70" width="${W - 140}" height="${H - 140}" fill="none" stroke="${ink}" stroke-width="3.6"/><rect x="80" y="80" width="${W - 160}" height="${H - 160}" fill="none" stroke="${ink}" stroke-width="1.2"/>`;
    [[70, 70, 1, 1], [W - 70, 70, -1, 1], [70, H - 70, 1, -1], [W - 70, H - 70, -1, -1]].forEach(([a, b, u, v]) => { s += `<path d="M${a} ${b + v * 58}Q${a + u * 8} ${b + v * 8} ${a + u * 58} ${b}Q${a + u * 26} ${b + v * 26} ${a} ${b + v * 58}Z" fill="${ink}"/><circle cx="${a + u * 26}" cy="${b + v * 26}" r="4.4" fill="${ink}"/>`; });
    s += '</g>' + (o.stemmaImg ? `<image href="${o.stemmaImg}" x="${W / 2 - 80}" y="92" width="160" height="150" preserveAspectRatio="xMidYMid meet"/>` : Araldica.scudo(st, W / 2 - 62, 92, 148));
    s += `<g filter="url(#doc-i)">`;
    s += _riga(W / 2, 330, o.titolo, F.gotico, 92, ink);
    s += `<path d="M180 352H${W - 180}" stroke="${ink}" stroke-width="2.4"/><path d="M${W / 2 - 14} 352l14 -9l14 9l-14 9Z" fill="${ink}"/>`;
    const corpo = String(o.corpo || ''), iniziale = corpo.charAt(0), resto = corpo.slice(1);
    s += _riga(120, 472, iniziale, F.gotico, 118, '#7a1212', 'start');
    // Le prime righe lasciano spazio al capolettera
    const prime = _aCapo(resto, 40);
    const a2 = prime.slice(0, 3).filter(Boolean), dopo = resto.slice(a2.join(' ').length).trim();
    a2.forEach((rg, i) => { s += _riga(202, 408 + i * 44, rg, F.stampa, 33, ink, 'start'); });
    s += _blocco(dopo, 120, 406 + a2.length * 44 - 30, W - 240, H - 406 - a2.length * 44 - 250, { font: F.stampa, max: 33, min: 20, rapporto: 0.42, inter: 1.34, ink }).svg;
    s += _blocco(o.firma, 270, H - 205, W - 390, 110, { font: F.stampa, max: 31, min: 20, rapporto: 0.42, inter: 1.26, ink, corsivo: true, ancora: 'middle' }).svg + '</g>';
    s += `<path d="M150 ${H - 215}L128 ${H - 90}L162 ${H - 112}L186 ${H - 84}L190 ${H - 215}Z" fill="#7a1212" stroke="#00000066"/>` + _sigillo(166, H - 188, 62, o.stemmaImg ? null : st, r, o.iniziale);
    return s;
  };
  const _avviso = (o, W, H, c, r) => {
    const ink = c.ink;
    let s = `<g filter="url(#doc-i)" transform="rotate(${r.range(-1.1, 1.1).toFixed(2)} ${W / 2} ${H / 2})">`;
    s += _riga(W / 2, 200, o.titolo, F.fretta, Math.min(112, 860 / Math.max(6, o.titolo.length) * 1.7), ink);
    s += `<path d="M${W / 2 - 200} 222Q${W / 2} 234 ${W / 2 + 200} 218" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`;
    s += _blocco(o.corpo, 110, 256, W - 220, H - 480, { font: F.fretta, max: 60, min: 30, rapporto: 0.385, inter: 1.12, ink, storto: r }).svg;
    s += _riga(W - 120, H - 130, o.firma, F.fretta, Math.min(52, 900 / Math.max(14, String(o.firma || '').length) * 1.5), ink, 'end') + '</g>';
    s += `<path d="M${W - 34} ${H - 118}L${W - 34} ${H - 34}L${W - 118} ${H - 34}Z" fill="#000" opacity="0.5"/><path d="M${W - 34} ${H - 118}L${W - 112} ${H - 112}L${W - 118} ${H - 34}Z" fill="${c.base}" stroke="${c.bordo}" stroke-width="1.4"/><path d="M${W - 34} ${H - 118}L${W - 112} ${H - 112}L${W - 118} ${H - 34}Z" fill="#000" opacity="0.12"/>`;
    s += _chiodo(W / 2, 74);
    return s;
  };
  const _tesoro = (o, W, H, c, r, rn) => {
    const ink = c.ink, G = 12, gw = Math.ceil(W / G) + 1, gh = Math.ceil(H / G) + 1, zona = 610;
    // Isola: rumore che si spegne verso i bordi della zona disegnata
    const f = (i, j) => {
      const x = i * G, y = j * G, dx = (x - W / 2) / (W * 0.37), dy = (y - zona / 2 - 96) / (zona * 0.42);
      return rn(x * 0.0058 + 5, y * 0.0058 + 9, 5) - Math.pow(Math.hypot(dx, dy), 2.2) * 0.42 - 0.32;
    };
    const isole = M.contorni(gw, gh, f, 0, G).filter((l) => l.length > 16).map((l) => M.morbida(l, 2, true));
    const qui = (x, y) => f(Math.max(1, Math.min(gw - 2, Math.round(x / G))), Math.max(1, Math.min(gh - 2, Math.round(y / G)))) > 0;
    let s = `<g filter="url(#doc-i)"><rect x="74" y="66" width="${W - 148}" height="${H - 132}" fill="none" stroke="${ink}" stroke-width="3"/>`;
    { let rotte = ''; for (let a = 0; a < 6.283; a += 0.3927) rotte += `M${W - 150} 210L${n1(W - 150 + Math.cos(a) * 1200)} ${n1(210 + Math.sin(a) * 1200)}`; s += `<clipPath id="doc-tes"><rect x="78" y="70" width="${W - 156}" height="${zona + 8}"/></clipPath><path clip-path="url(#doc-tes)" d="${rotte}" stroke="${ink}" stroke-width="0.8" opacity="0.32"/>`; }
    for (let i = 0; i < 26; i++) {
      const x = r.int(110, W - 130), y = r.int(150, zona + 40);
      if (!qui(x, y) && !qui(x + 40, y) && !qui(x - 40, y) && !qui(x, y + 26) && !qui(x, y - 26)) s += `<path d="M${x} ${y}q7 -7 14 0t14 0" fill="none" stroke="${ink}" stroke-width="1.5" opacity="0.6"/>`;
    }
    { let nave = null; for (let i = 0; i < 60 && !nave; i++) { const x = r.int(150, 420), y = r.int(170, zona); if (!qui(x, y) && !qui(x + 60, y) && !qui(x - 60, y) && !qui(x, y + 44) && !qui(x, y - 60)) nave = [x, y]; }
      if (nave) { const [x, y] = nave; s += `<path d="M${x - 38} ${y}Q${x} ${y + 24} ${x + 38} ${y}L${x + 28} ${y + 16}H${x - 28}Z" fill="${c.bordo}" stroke="${ink}" stroke-width="2"/><path d="M${x} ${y + 4}V${y - 52}" stroke="${ink}" stroke-width="2.6"/><path d="M${x + 2} ${y - 48}Q${x + 34} ${y - 30} ${x + 2} ${y - 6}Z" fill="${c.base}" stroke="${ink}" stroke-width="2"/><path d="M${x - 2} ${y - 42}Q${x - 24} ${y - 26} ${x - 2} ${y - 8}Z" fill="${c.base}" stroke="${ink}" stroke-width="2"/><path d="M${x} ${y - 52}l14 5l-14 5Z" fill="#7a1212"/>`; } }
    s += _riga(W / 2, 128, o.titolo, F.titoli, Math.min(66, 1000 / Math.max(10, o.titolo.length) * 1.4), ink);
    isole.forEach((l) => {
      const d = M.via(l);
      s += `<path d="${d}" fill="#00000016" stroke="${ink}" stroke-width="3.4" stroke-linejoin="round"/>`;
      [1.05, 1.11].forEach((k, i) => {
        const cc = M.centro(l);
        s += `<path d="${M.via(l.map(([x, y]) => [cc[0] + (x - cc[0]) * k, cc[1] + (y - cc[1]) * k]))}" fill="none" stroke="${ink}" stroke-width="${1.2 - i * 0.3}" opacity="${0.6 - i * 0.2}" stroke-dasharray="${i ? '2 7' : '8 6'}"/>`;
      });
    });
    // Punti utili dell'isola: partenza vicino alla riva, arrivo verso l'interno
    const dentro = [];
    for (let i = 0; i < 400; i++) { const x = r.int(150, W - 150), y = r.int(150, zona + 60); if (qui(x, y) && qui(x + 30, y) && qui(x - 30, y) && qui(x, y + 30) && qui(x, y - 30)) dentro.push([x, y]); }
    if (dentro.length > 3) {
      dentro.sort((a, b) => a[0] - b[0]);
      const a = dentro[0], z = dentro[dentro.length - 1], m1 = M.lerp(a, z, 0.33), m2 = M.lerp(a, z, 0.66), piega = (z[0] - a[0]) * 0.2;
      const via = M.morbida([a, [m1[0], m1[1] - piega], [m2[0], m2[1] + piega], z], 3);
      s += `<path d="${M.via(via, false)}" fill="none" stroke="#7a1212" stroke-width="4.6" stroke-dasharray="16 11" stroke-linecap="round"/>`;
      // Tre monti e qualche albero, dove non passa il percorso
      const liberi = dentro.filter((q) => M.distLinea(q, via) > 46);
      r.shuffle(liberi).slice(0, 12).sort((p, q) => p[1] - q[1]).forEach((q, i) => {
        const [x, y] = q;
        if (i % 2) s += `<path d="M${x - 26} ${y}L${x - 2} ${y - 40}L${x + 28} ${y}" fill="${c.base}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/><path d="${M.tratteggio([[x - 2, y - 40], [x + 28, y], [x + 4, y]], 1, 4)}" stroke="${ink}" stroke-width="1.1"/>`;
        else s += `<path d="M${x} ${y}V${y - 18}" stroke="${ink}" stroke-width="2.4"/><ellipse cx="${x}" cy="${y - 26}" rx="12" ry="15" fill="${c.base}" stroke="${ink}" stroke-width="2.2"/>`;
      });
      s += `<path d="M${z[0] - 26} ${z[1] - 26}L${z[0] + 26} ${z[1] + 26}M${z[0] + 26} ${z[1] - 26}L${z[0] - 26} ${z[1] + 26}" stroke="#7a1212" stroke-width="10" stroke-linecap="round"/>`;
      s += `<circle cx="${a[0]}" cy="${a[1]}" r="8" fill="${ink}"/>`;
    }
    // Rosa dei venti disegnata a mano
    const rx = W - 150, ry = 210;
    s += `<circle cx="${rx}" cy="${ry}" r="40" fill="none" stroke="${ink}" stroke-width="2"/>`;
    [0, 90, 180, 270].forEach((g) => { s += `<path d="M${rx} ${ry - 62}L${rx - 10} ${ry}L${rx} ${ry - 8}L${rx + 10} ${ry}Z" fill="${ink}" transform="rotate(${g} ${rx} ${ry})"/>`; });
    s += _riga(rx, ry - 70, 'N', F.titoli, 30, ink);
    s += _blocco(o.corpo, 140, zona + 90, W - 280, 140, { font: F.corsivo, max: 38, min: 22, rapporto: 0.4, inter: 1.26, ink, ancora: 'middle', storto: r }).svg;
    s += _riga(W - 150, H - 62, o.firma, F.corsivo, 30, ink, 'end') + '</g>';
    return s;
  };

  const genera = (o) => {
    const T = TIPI[o.tipo] || TIPI.lettera, W = T.W, H = T.H;
    const r = M.rng('doc:' + o.tipo + ':' + o.seme), rn = M.rumore(r), c = CARTE[o.carta] || CARTE.pergamena;
    const st = o.stemma || Araldica.casuale(o.seme);
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">`;
    svg += _foglio(W, H, r, rn, c, o);
    if (o.tipo === 'taglia') svg += _taglia(o, W, H, c, r);
    else if (o.tipo === 'editto') svg += _editto(o, W, H, c, r, st);
    else if (o.tipo === 'avviso') svg += _avviso(o, W, H, c, r);
    else if (o.tipo === 'tesoro') svg += _tesoro(o, W, H, c, r, rn);
    else svg += _lettera(o, W, H, c, r, st);
    return { svg: svg + '</svg>', W, H, nome: o.soggetto || o.titolo || T.nome };
  };

  return { TIPI, CARTE, ETA, testi, genera };
})();

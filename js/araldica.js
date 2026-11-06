/* ============================================================
   ARALDICA.JS — Stemmi generati: forma dello scudo, partizione,
   smalti, simbolo e motto. Dal seme nasce sempre lo stesso stemma.
   Segue la regola araldica dei colori: un metallo (oro, argento)
   non sta mai sopra un altro metallo, ne' un colore sopra un colore.
   Tutto SVG, nessuna immagine esterna. Serve allo Scrittoio, ai
   sigilli dei documenti e ai capoluoghi sulle mappe dei regni.
   ============================================================ */

const Araldica = (() => {
  const M = CartoMotore, n1 = M.n1;
  const INK = '#17130f';

  const FORME = {
    classica: ['Classica', 'M5 5H95V65C95 90 70 108 50 116C30 108 5 90 5 65Z'],
    gotica: ['Gotica', 'M5 5Q27 14 50 5Q73 14 95 5V60C95 88 72 106 50 116C28 106 5 88 5 60Z'],
    tonda: ['Tonda', 'M8 5H92V70A42 46 0 0 1 8 70Z'],
    sagomata: ['Da torneo', 'M10 5C25 12 40 8 50 5C60 8 75 12 90 5C84 20 96 40 92 60C90 88 66 104 50 116C34 104 10 88 8 60C4 40 16 20 10 5Z'],
    losanga: ['Losanga', 'M50 3L95 60L50 117L5 60Z'],
  };
  const SMALTI = {
    oro: ['Oro', '#d9b441', true], argento: ['Argento', '#ebe9e0', true],
    rosso: ['Rosso', '#a8252b'], azzurro: ['Azzurro', '#27508f'], verde: ['Verde', '#2f6f45'], nero: ['Nero', '#231f1e'], porpora: ['Porpora', '#653a7d'],
  };
  const ORNAMENTI = { nessuno: 'Nessuno', corona: 'Corona', mantello: 'Mantello' };
  const PARTIZIONI = {
    pieno: 'Pieno', partito: 'Partito', troncato: 'Troncato', inquartato: 'Inquartato', banda: 'Banda', scaglione: 'Scaglione', palo: 'Palo', fascia: 'Fascia', croce: 'Croce', sbarre: 'Sbarre', scaccato: 'Scaccato',
  };

  const _stellaPunti = (n, R, r0) => {
    const p = [];
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r0 : R; p.push([50 + Math.cos(a) * q, 50 + Math.sin(a) * q]); }
    return M.via(p);
  };
  // Ogni simbolo disegna in un riquadro 100x100: f e' il suo smalto, c quello del fondo per i dettagli
  const P = (d, f, extra = '') => `<path d="${d}" fill="${f}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"${extra}/>`;
  const SIMBOLI = {
    torre: ['Torre', (f, c) => P('M28 90V42H22V16H33V27H44V16H56V27H67V16H78V42H72V90Z', f) + P('M42 90V68A8 8 0 0 1 58 68V90Z', c) + P('M47 40H53V52H47Z', c)],
    corona: ['Corona', (f, c) => P('M15 74L9 30L30 50L50 18L70 50L91 30L85 74Z', f) + P('M15 74H85V86H15Z', f) + `<circle cx="50" cy="80" r="3.4" fill="${c}"/><circle cx="32" cy="80" r="2.6" fill="${c}"/><circle cx="68" cy="80" r="2.6" fill="${c}"/>`],
    spada: ['Spada', (f) => P('M45 10L50 2L55 10V66H45Z', f) + P('M28 66H72V73H28Z', f) + P('M46 73H54V89H46Z', f) + `<circle cx="50" cy="93" r="5.5" fill="${f}" stroke="${INK}" stroke-width="2.4"/>`],
    chiave: ['Chiave', (f) => `<path fill-rule="evenodd" d="M50 4A18 18 0 1 0 50 40A18 18 0 1 0 50 4ZM50 14A8 8 0 1 1 50 30A8 8 0 1 1 50 14Z" fill="${f}" stroke="${INK}" stroke-width="2.4"/>` + P('M45 39H55V96H45Z', f) + P('M55 76H70V83H55Z', f) + P('M55 87H66V94H55Z', f)],
    stella: ['Stella', (f) => P(_stellaPunti(5, 46, 19), f)],
    sole: ['Sole', (f, c) => P(_stellaPunti(16, 48, 28), f) + `<circle cx="50" cy="50" r="19" fill="${f}" stroke="${INK}" stroke-width="2.4"/><circle cx="50" cy="50" r="10" fill="${c}" opacity="0.65"/>`],
    luna: ['Luna', (f) => P('M64 8A43 43 0 1 0 64 92A34 34 0 1 1 64 8Z', f)],
    croce: ['Croce', (f) => P('M41 8H59L56 41L89 38V62L56 59L59 92H41L44 59L11 62V38L44 41Z', f)],
    albero: ['Albero', (f, c) => P('M43 58H57V90H43Z', c) + `<circle cx="50" cy="32" r="24" fill="${f}" stroke="${INK}" stroke-width="2.4"/><circle cx="27" cy="48" r="17" fill="${f}" stroke="${INK}" stroke-width="2.4"/><circle cx="73" cy="48" r="17" fill="${f}" stroke="${INK}" stroke-width="2.4"/><path d="M34 42Q50 56 66 42" fill="${f}"/>` + P('M26 90H74V96H26Z', f)],
    giglio: ['Giglio', (f) => P('M50 6C64 28 60 52 50 62C40 52 36 28 50 6Z', f) + P('M43 58C18 62 8 40 22 24C24 40 32 46 43 48Z', f) + P('M57 58C82 62 92 40 78 24C76 40 68 46 57 48Z', f) + P('M43 67L37 90L50 80L63 90L57 67Z', f) + P('M32 59H68V67H32Z', f)],
    rosa: ['Rosa', (f, c) => [0, 72, 144, 216, 288].map((a) => { const t = (a - 90) * Math.PI / 180; return `<circle cx="${n1(50 + Math.cos(t) * 25)}" cy="${n1(50 + Math.sin(t) * 25)}" r="20" fill="${f}" stroke="${INK}" stroke-width="2.4"/>`; }).join('') + `<circle cx="50" cy="50" r="15" fill="${f}" stroke="${INK}" stroke-width="2.4"/><circle cx="50" cy="50" r="6.5" fill="${c}" stroke="${INK}" stroke-width="1.6"/>`],
    ascia: ['Ascia', (f, c) => P('M46 6H54V96H46Z', c) + P('M54 12C80 10 92 32 86 56C76 44 64 44 54 46Z', f) + P('M46 12C20 10 8 32 14 56C24 44 36 44 46 46Z', f)],
    monte: ['Monte', (f, c) => P('M6 86L36 30L49 54L66 16L94 86Z', f) + P('M66 16L57 37L64 33L69 41L75 32Z', c)],
    calice: ['Calice', (f) => P('M26 10H74C74 42 62 54 55 57V76H68V88H32V76H45V57C38 54 26 42 26 10Z', f)],
    occhio: ['Occhio', (f, c) => P('M4 50C26 18 74 18 96 50C74 82 26 82 4 50Z', f) + `<circle cx="50" cy="50" r="17" fill="${c}" stroke="${INK}" stroke-width="2.4"/><circle cx="50" cy="50" r="7.5" fill="${INK}"/>`],
    corvo: ['Corvo', (f) => P('M4 74L24 58L18 50L34 48C34 34 44 24 56 22C62 14 74 13 80 19L98 28L80 31C82 46 74 58 62 64L70 78L80 96L66 88L60 96L54 84L46 70C32 76 16 78 4 74Z', f) + `<circle cx="66" cy="23" r="2.6" fill="${INK}"/><path d="M34 48C42 52 50 52 58 46M38 58C44 62 50 62 56 58" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`],
    lupo: ['Lupo', (f, c) => P('M20 8L38 34H62L80 8L84 52L64 76L50 94L36 76L16 52Z', f) + P('M31 48L44 53L33 58Z', c) + P('M69 48L56 53L67 58Z', c) + P('M43 72H57L50 83Z', INK)],
  };

  const MOTTI = ['Mai in ginocchio', 'Fedeli fino alla cenere', 'Per ferro e per sale', 'La notte ci appartiene', 'Ricordiamo ogni debito', 'Saldi come la pietra', 'Dal fuoco, la luce', 'Prima gli altri', 'Il silenzio è un\'arma', 'Oltre ogni mare', 'Nessun passo indietro', 'Vigiliamo', 'Sempre la stessa strada', 'Chi semina, resta', 'Sub umbra floreo', 'Fortitudo et honor', 'Ad astra per aspera', 'Nec spe nec metu', 'Semper vigilans', 'Per aspera ad lucem'];

  // Le scelte casuali, in un oggetto piccolo: e' cio' che si salva nella Fazione
  const casuale = (seme) => {
    const r = M.rng('stemma:' + seme);
    const col = ['rosso', 'azzurro', 'verde', 'nero', 'porpora'], met = ['oro', 'argento'];
    const metalloSotto = r.chance(0.3), a = metalloSotto ? r.pick(met) : r.pick(col), b = metalloSotto ? r.pick(col) : r.pick(met);
    const partizione = r.chance(0.3) ? 'pieno' : r.pick(Object.keys(PARTIZIONI));
    // Un sole a raggi nero ricorda il "sole nero" neonazista: il caso non lo propone. A mano resta possibile.
    const simboloDalCaso = (s) => (s === 'sole' && (a === 'nero' || b === 'nero') ? 'luna' : s);
    return {
      forma: r.pick(Object.keys(FORME)), partizione, smalto1: a, smalto2: b, simbolo: simboloDalCaso(r.pick(Object.keys(SIMBOLI))), motto: r.pick(MOTTI),
      disposizione: partizione === 'pieno' && r.chance(0.3) ? 'tre' : 'uno', bordura: r.chance(0.3), ornamento: r.pick(Object.keys(ORNAMENTI)),
    };
  };

  // Le partizioni come tracciato unico: servono sia da colore sia da ritaglio per il simbolo contrapposto
  const _tracciatoPartizione = (tipo) => {
    switch (tipo) {
      case 'partito': return 'M50 -5H105V125H50Z';
      case 'troncato': return 'M-5 60H105V125H-5Z';
      case 'inquartato': return 'M50 -5H105V60H50ZM-5 60H50V125H-5Z';
      case 'banda': return 'M-5 18L18 -5L110 95L90 118Z';
      case 'scaglione': return 'M50 28L108 88V112L50 54L-8 112V88Z';
      case 'palo': return 'M34 -5H66V125H34Z';
      case 'fascia': return 'M-5 44H105V76H-5Z';
      case 'croce': return 'M40 -5H60V125H40ZM-5 44H105V64H-5Z';
      case 'sbarre': return [14, 42, 70, 98].map((y) => 'M-5 ' + y + 'H105V' + (y + 14) + 'H-5Z').join('');
      case 'scaccato': {
        let d = '';
        for (let j = 0; j < 7; j++) for (let i = 0; i < 6; i++) if ((i + j) % 2) d += 'M' + (i * 20 - 5) + ' ' + (j * 20 - 5) + 'h20v20h-20Z';
        return d;
      }
      default: return '';
    }
  };

  // Smalti con il loro volume: i metalli hanno un riflesso, i colori una luce morbida
  const TINTE = {
    oro: ['#f7e39a', '#d9ae3c', '#8d661b'], argento: ['#ffffff', '#dddcd4', '#a3a29a'],
    rosso: ['#c9403f', '#a11f27', '#6f1119'], azzurro: ['#3f70b4', '#234a86', '#142e58'], verde: ['#3f8c5b', '#2a673f', '#163f26'],
    nero: ['#4a4442', '#262221', '#100e0e'], porpora: ['#8a55a6', '#5e3575', '#3a1e4b'],
  };
  const _gradiente = (id, nome) => {
    const t = TINTE[nome] || TINTE.rosso;
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + t[0] + '"/><stop offset="0.5" stop-color="' + t[1] + '"/><stop offset="1" stop-color="' + t[2] + '"/></linearGradient>';
  };

  let _conta = 0;
  // Lo scudo in coordinate 100x120. x,y,h lo posizionano; lo si puo' usare dentro qualunque SVG.
  const scudo = (o, x = 0, y = 0, h = 120) => {
    const id = 'stm' + (++_conta), s = h / 120, ricco = h >= 100;
    const forma = (FORME[o.forma] || FORME.classica)[1], part = o.partizione || 'pieno', trac = _tracciatoPartizione(part);
    const u1 = 'url(#' + id + 'a)', u2 = 'url(#' + id + 'b)';
    const sim = SIMBOLI[o.simbolo];
    let g = '<g transform="translate(' + n1(x) + ' ' + n1(y) + ') scale(' + s.toFixed(3) + ')"><defs><clipPath id="' + id + 'c"><path d="' + forma + '"/></clipPath>' +
      (trac ? '<clipPath id="' + id + 'p"><path d="' + trac + '"/></clipPath>' : '') + _gradiente(id + 'a', o.smalto1) + _gradiente(id + 'b', o.smalto2) +
      '<linearGradient id="' + id + 'l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.3"/><stop offset="0.42" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.36"/></linearGradient>' +
      '<pattern id="' + id + 'd" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0H11V11" fill="none" stroke="#000" stroke-width="0.35" opacity="0.32"/><path d="M5.5 3.4L7.6 5.5L5.5 7.6L3.4 5.5Z" fill="#fff" opacity="0.13"/></pattern></defs>';
    g += '<g clip-path="url(#' + id + 'c)"><rect x="-5" y="-5" width="110" height="130" fill="' + u1 + '"/>';
    if (trac) g += '<path d="' + trac + '" fill="' + u2 + '" stroke="' + INK + '" stroke-width="0.9"/>';
    if (ricco) g += '<rect x="-5" y="-5" width="110" height="130" fill="url(#' + id + 'd)"/>';
    if (sim) {
      const posa = (cx, cy, scala, inner) => '<g transform="translate(' + n1(cx - 50 * scala) + ' ' + n1(cy - 50 * scala) + ') scale(' + scala + ')">' + inner + '</g>';
      if (part === 'pieno') {
        if (o.disposizione === 'tre') [[30, 36], [70, 36], [50, 76]].forEach(([a, b]) => { g += posa(a, b, 0.33, sim[1](u2, u1)); });
        else g += posa(50, 54, 0.66, sim[1](u2, u1));
      } else if (part === 'sbarre' || part === 'scaccato') {
        // Su un fondo a righe o a scacchi serve un tondo, altrimenti il simbolo si perde
        g += '<circle cx="50" cy="54" r="29" fill="' + u1 + '" stroke="' + INK + '" stroke-width="1.5"/><circle cx="50" cy="54" r="26" fill="none" stroke="' + u2 + '" stroke-width="1"/>' + posa(50, 54, 0.46, sim[1](u2, u1));
      } else {
        // Contrapposto, come nell'araldica vera: dove il fondo cambia colore, il simbolo si inverte
        g += posa(50, 54, 0.62, sim[1](u2, u1)) + '<g clip-path="url(#' + id + 'p)">' + posa(50, 54, 0.62, sim[1](u1, u2)) + '</g>';
      }
    }
    if (ricco) g += '<path d="' + M.tratteggio([[52, -5], [105, -5], [105, 125], [52, 125]], -0.8, 2.3) + '" stroke="' + INK + '" stroke-width="0.28" opacity="0.26"/>';
    g += '<rect x="-5" y="-5" width="110" height="130" fill="url(#' + id + 'l)"/>';
    if (o.bordura) {
      const interna = 'translate(50 60) scale(0.87) translate(-50 -60)';
      g += '<path d="' + forma + '" transform="' + interna + '" fill="none" stroke="' + INK + '" stroke-width="7.4"/><path d="' + forma + '" transform="' + interna + '" fill="none" stroke="' + u2 + '" stroke-width="5.8"/>';
    }
    g += '</g><path d="' + forma + '" fill="none" stroke="' + INK + '" stroke-width="1.7"/><path d="' + forma + '" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="0.6" transform="translate(50 60) scale(0.965) translate(-50 -60)"/></g>';
    return g;
  };

  // Solo il simbolo, per l'impronta di un sigillo di ceralacca
  const impronta = (o, cx, cy, r, colore) => {
    const sim = SIMBOLI[o.simbolo] || SIMBOLI.stella, s = r * 1.5 / 100;
    return '<g transform="translate(' + n1(cx - 50 * s) + ' ' + n1(cy - 50 * s) + ') scale(' + s.toFixed(3) + ')" opacity="0.8">' + sim[1](colore, colore).replace(new RegExp(INK, 'g'), '#00000080') + '</g>';
  };

  // Una foglia del mantello: goccia con la punta arricciata e la nervatura centrale
  const _foglia = (x, y, l, ang, f) => {
    const c = Math.cos(ang), s = Math.sin(ang), T = (u, v) => n1(x + u * c - v * s) + ' ' + n1(y + u * s + v * c);
    return '<path d="M' + T(0, 0) + 'C' + T(l * 0.25, -l * 0.42) + ' ' + T(l * 0.78, -l * 0.42) + ' ' + T(l, -l * 0.08) + 'C' + T(l * 1.12, l * 0.1) + ' ' + T(l * 0.98, l * 0.3) + ' ' + T(l * 0.84, l * 0.2) + 'C' + T(l * 0.6, l * 0.36) + ' ' + T(l * 0.24, l * 0.26) + ' ' + T(0, 0) + 'Z" fill="' + f + '" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M' + T(l * 0.06, 0) + 'Q' + T(l * 0.5, -l * 0.1) + ' ' + T(l * 0.86, l * 0.02) + '" fill="none" stroke="' + INK + '" stroke-width="1.1" opacity="0.65"/>';
  };
  const _mantello = (cx, cy, u1, u2) => {
    let lato = '';
    [[-0.6, 70, 130, 1], [-0.1, 92, 150, 2], [0.42, 112, 148, 1], [0.92, 128, 134, 2], [1.42, 136, 120, 1], [1.92, 126, 112, 2]].forEach(([a, d, l, q]) => {
      const x = cx + Math.cos(a - 0.35) * d * 1.05, y = cy + Math.sin(a - 0.35) * d;
      lato += _foglia(x, y, l, a, q === 1 ? u1 : u2);
    });
    return '<g>' + lato + '</g><g transform="translate(' + (cx * 2) + ' 0) scale(-1 1)">' + lato + '</g>';
  };
  const _corona = (cx, y, u) => '<g transform="translate(' + (cx - 74) + ' ' + y + ') scale(1.48)"><path d="M12 68L4 20L28 44L50 6L72 44L96 20L88 68Z" fill="' + u + '" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/><path d="M12 68H88V82H12Z" fill="' + u + '" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="4" cy="17" r="5" fill="' + u + '" stroke="' + INK + '" stroke-width="2"/><circle cx="50" cy="5" r="6" fill="' + u + '" stroke="' + INK + '" stroke-width="2"/><circle cx="96" cy="17" r="5" fill="' + u + '" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="30" cy="75" r="3.6" fill="#a11f27" stroke="' + INK + '" stroke-width="1.2"/><circle cx="50" cy="75" r="4.2" fill="#234a86" stroke="' + INK + '" stroke-width="1.2"/><circle cx="70" cy="75" r="3.6" fill="#a11f27" stroke="' + INK + '" stroke-width="1.2"/><path d="M50 26V58M38 42H62" stroke="' + INK + '" stroke-width="1.4" opacity="0.5"/></g>';

  const genera = (o) => {
    const W = 600, H = 760, con = { ...casuale(o.seme), ...o };
    const orn = ORNAMENTI[con.ornamento] ? con.ornamento : 'nessuno';
    const haMotto = o.conMotto !== false && con.motto, haNome = !!o.nome;
    const hScudo = orn === 'nessuno' ? 540 : 440, xS = (W - hScudo / 120 * 100) / 2, yS = orn === 'nessuno' ? 28 : 130;
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img">' +
      '<defs><filter id="stm-ombra" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="9"/></filter><path id="stm-arco" d="M92 632Q300 676 508 632"/>' +
      _gradiente('stm-m1', con.smalto1) + _gradiente('stm-m2', con.smalto2) + _gradiente('stm-oro', 'oro') +
      '<linearGradient id="stm-nastro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf3dc"/><stop offset="1" stop-color="#d8c79e"/></linearGradient></defs>';
    if (orn === 'mantello') svg += _mantello(300, yS + 40, 'url(#stm-m1)', 'url(#stm-m2)');
    if (orn === 'mantello' || orn === 'corona') svg += _corona(300, yS - 112, 'url(#stm-oro)');
    svg += '<path d="' + (FORME[con.forma] || FORME.classica)[1] + '" transform="translate(' + (xS + 6) + ' ' + (yS + 12) + ') scale(' + (hScudo / 120) + ')" fill="#000" opacity="0.45" filter="url(#stm-ombra)"/>';
    svg += scudo(con, xS, yS, hScudo);
    if (haMotto) {
      const testo = String(con.motto), dim = Math.min(30, 400 / Math.max(10, testo.length) * 1.9);
      svg += '<path d="M84 616L22 604L46 640L16 672L96 678Z" fill="#c2ae83" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/><path d="M516 616L578 604L554 640L584 672L504 678Z" fill="#c2ae83" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M72 602L96 616V678L72 660Z" fill="#8f7d58" stroke="' + INK + '" stroke-width="2"/><path d="M528 602L504 616V678L528 660Z" fill="#8f7d58" stroke="' + INK + '" stroke-width="2"/>' +
        '<path d="M72 602Q300 648 528 602L528 660Q300 706 72 660Z" fill="url(#stm-nastro)" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
        '<text font-family="\'IM Fell English\', ' + M.FONT_TESTO + '" font-size="' + n1(dim) + '" font-style="italic" fill="' + INK + '" text-anchor="middle"><textPath href="#stm-arco" xlink:href="#stm-arco" startOffset="50%">' + M.esc(testo) + '</textPath></text>';
    }
    if (haNome) svg += '<text x="300" y="742" font-family="' + M.FONT_TITOLO + '" font-size="' + n1(Math.min(36, 900 / Math.max(14, o.nome.length) * 1.1)) + '" font-weight="700" text-anchor="middle" fill="' + INK + '" stroke="#f3ecd9" stroke-width="9" paint-order="stroke" stroke-linejoin="round">' + M.esc(o.nome) + '</text>';
    return { svg: svg + '</svg>', W, H, nome: o.nome || 'Stemma', opzioni: { forma: con.forma, partizione: con.partizione, smalto1: con.smalto1, smalto2: con.smalto2, simbolo: con.simbolo, motto: haMotto ? con.motto : '', disposizione: con.disposizione, bordura: !!con.bordura, ornamento: orn } };
  };

  const elenco = (o) => Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]);
  return {
    casuale, scudo, impronta, genera, MOTTI, SMALTI, ORNAMENTI_ELENCO: elenco(ORNAMENTI),
    FORME_ELENCO: elenco(FORME), SMALTI_ELENCO: elenco(SMALTI), PARTIZIONI_ELENCO: elenco(PARTIZIONI), SIMBOLI_ELENCO: elenco(SIMBOLI),
  };
})();

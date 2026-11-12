/* ============================================================
   CARTOGRAFO-MOTORE.JS — Base comune dei generatori di mappe:
   numeri casuali ripetibili (stesso seme = stessa mappa), rumore,
   geometria dei poligoni e parti grafiche condivise (carta,
   palette, cornice, rosa dei venti, scala, alberi, edifici).
   Tutto e' scritto da zero per il toolkit e produce SVG puro:
   nessuna immagine, nessuna libreria, nessun servizio esterno.
   ============================================================ */

const CartoMotore = (() => {
  /* ── Numeri casuali ── */
  const _hash = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  const rng = (seme) => {
    let a = _hash(String(seme));
    const f = () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      f,
      range: (x, y) => x + (y - x) * f(),
      int: (x, y) => x + Math.floor(f() * (y - x + 1)),
      pick: (l) => l[Math.floor(f() * l.length)],
      chance: (p) => f() < p,
      shuffle: (l) => {
        const o = l.slice();
        for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
        return o;
      },
    };
  };

  /* ── Rumore ── */
  const rumore = (r) => {
    const N = 256, tab = new Float64Array(N * N);
    for (let i = 0; i < tab.length; i++) tab[i] = r.f();
    const s = (t) => t * t * (3 - 2 * t);
    const v = (x, y) => tab[(((y % N) + N) % N) * N + (((x % N) + N) % N)];
    const base = (x, y) => {
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = s(x - x0), fy = s(y - y0);
      const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * fx;
      const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * fx;
      return a + (b - a) * fy;
    };
    // Somma di ottave normalizzata in 0..1
    return (x, y, ottave = 4) => {
      let tot = 0, amp = 1, frq = 1, max = 0;
      for (let i = 0; i < ottave; i++) { tot += base(x * frq + i * 17.3, y * frq - i * 9.1) * amp; max += amp; amp *= 0.5; frq *= 2; }
      return tot / max;
    };
  };

  /* ── Geometria (i punti sono [x, y]) ── */
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  const area = (p) => {
    let s = 0;
    for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
    return s / 2;
  };
  const centro = (p) => {
    let x = 0, y = 0, s = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], c = a[0] * b[1] - b[0] * a[1];
      x += (a[0] + b[0]) * c; y += (a[1] + b[1]) * c; s += c;
    }
    if (Math.abs(s) < 1e-6) return [p.reduce((t, q) => t + q[0], 0) / p.length, p.reduce((t, q) => t + q[1], 0) / p.length];
    return [x / (3 * s), y / (3 * s)];
  };
  const dentro = (pt, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  };

  // Tiene la parte di poligono dove (p - o)·n <= 0
  const taglia = (poly, ox, oy, nx, ny) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = (a[0] - ox) * nx + (a[1] - oy) * ny, db = (b[0] - ox) * nx + (b[1] - oy) * ny;
      if (da <= 0) out.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) out.push(lerp(a, b, da / (da - db)));
    }
    return out;
  };

  // Rientro di un poligono convesso: d e' un numero o un elenco (uno per lato)
  const rientra = (poly, d) => {
    const verso = area(poly) > 0 ? 1 : -1;
    let out = poly;
    for (let i = 0; i < poly.length && out.length >= 3; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], l = dist(a, b) || 1;
      const nx = (b[1] - a[1]) / l * verso, ny = -(b[0] - a[0]) / l * verso;
      const q = Array.isArray(d) ? d[i] : d;
      // n punta verso l'esterno: si tiene cio' che sta dietro il lato spostato verso l'interno
      out = taglia(out, a[0] - nx * q, a[1] - ny * q, nx, ny);
    }
    return out;
  };

  const distSeg = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
    const t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
  };
  const distLinea = (p, l) => {
    let m = Infinity;
    for (let i = 0; i < l.length - 1; i++) { const d = distSeg(p, l[i], l[i + 1]); if (d < m) m = d; }
    return m;
  };
  const incrocio = (a, b, c, d) => {
    const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
    const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? lerp(a, b, t) : null;
  };

  // Mappa delle distanze da un gruppo di linee, calcolata una volta sola: chiedere "quanto dista
  // la strada?" diventa immediato. Serve dove lo si chiede migliaia di volte (alberi, campi, case).
  const campoDistanze = (linee, W, H, cella = 8, margine = 120) => {
    const w = Math.ceil((W + margine * 2) / cella) + 1, h = Math.ceil((H + margine * 2) / cella) + 1;
    const d = new Float32Array(w * h).fill(1e9);
    const segna = (x, y) => {
      const i = Math.round((x + margine) / cella), j = Math.round((y + margine) / cella);
      if (i >= 0 && j >= 0 && i < w && j < h) d[j * w + i] = 0;
    };
    linee.forEach((l) => {
      for (let k = 0; k < l.length - 1; k++) {
        const passi = Math.max(1, Math.ceil(dist(l[k], l[k + 1]) / (cella * 0.7)));
        for (let u = 0; u <= passi; u++) { const q = lerp(l[k], l[k + 1], u / passi); segna(q[0], q[1]); }
      }
    });
    const D = 1, E = 1.414;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i;
      if (i > 0) d[k] = Math.min(d[k], d[k - 1] + D);
      if (j > 0) { d[k] = Math.min(d[k], d[k - w] + D); if (i > 0) d[k] = Math.min(d[k], d[k - w - 1] + E); if (i < w - 1) d[k] = Math.min(d[k], d[k - w + 1] + E); }
    }
    for (let j = h - 1; j >= 0; j--) for (let i = w - 1; i >= 0; i--) {
      const k = j * w + i;
      if (i < w - 1) d[k] = Math.min(d[k], d[k + 1] + D);
      if (j < h - 1) { d[k] = Math.min(d[k], d[k + w] + D); if (i < w - 1) d[k] = Math.min(d[k], d[k + w + 1] + E); if (i > 0) d[k] = Math.min(d[k], d[k + w - 1] + E); }
    }
    return (x, y) => {
      const i = Math.round((x + margine) / cella), j = Math.round((y + margine) / cella);
      if (i < 0 || j < 0 || i >= w || j >= h) return 1e9;
      return d[j * w + i] * cella;
    };
  };

  // Celle attorno a ogni punto, per tagli successivi del rettangolo della mappa
  const celle = (punti, x0, y0, x1, y1) => punti.map((p, i) => {
    let c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const altri = punti.map((q, j) => [q, j, dist(p, q)]).filter((o) => o[1] !== i).sort((a, b) => a[2] - b[2]);
    for (const [q, , d] of altri) {
      let max = 0;
      for (const v of c) { const m = dist(v, p); if (m > max) max = m; }
      if (d / 2 > max) break;
      c = taglia(c, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, q[0] - p[0], q[1] - p[1]);
      if (c.length < 3) break;
    }
    return c;
  });

  // Arrotonda le spezzate (taglio degli angoli)
  const morbida = (pts, giri = 2, chiusa = false) => {
    let p = pts;
    for (let g = 0; g < giri; g++) {
      const o = [];
      const n = p.length;
      if (!chiusa) o.push(p[0]);
      for (let i = 0; i < (chiusa ? n : n - 1); i++) {
        const a = p[i], b = p[(i + 1) % n];
        o.push(lerp(a, b, 0.25), lerp(a, b, 0.75));
      }
      if (!chiusa) o.push(p[n - 1]);
      p = o;
    }
    return p;
  };

  // Curve di livello: f(i,j) su griglia; il bordo va trattato come "sotto soglia" per chiudere gli anelli
  const contorni = (w, h, f, soglia, cella, ox = 0, oy = 0) => {
    const v = (i, j) => (i <= 0 || j <= 0 || i >= w - 1 || j >= h - 1 ? soglia - 1 : f(i, j));
    const punti = new Map(), vicini = new Map();
    const pt = (id, x, y) => { if (!punti.has(id)) punti.set(id, [x * cella + ox, y * cella + oy]); return id; };
    const lega = (a, b) => {
      if (!vicini.has(a)) vicini.set(a, []);
      if (!vicini.has(b)) vicini.set(b, []);
      vicini.get(a).push(b); vicini.get(b).push(a);
    };
    for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) {
      const a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), d = v(i, j + 1);
      const k = (a > soglia ? 8 : 0) | (b > soglia ? 4 : 0) | (c > soglia ? 2 : 0) | (d > soglia ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const su = () => pt(`h${i},${j}`, i + (soglia - a) / (b - a), j);
      const giu = () => pt(`h${i},${j + 1}`, i + (soglia - d) / (c - d), j + 1);
      const sx = () => pt(`v${i},${j}`, i, j + (soglia - a) / (d - a));
      const dx = () => pt(`v${i + 1},${j}`, i + 1, j + (soglia - b) / (c - b));
      const casi = {
        1: [[sx, giu]], 2: [[giu, dx]], 3: [[sx, dx]], 4: [[su, dx]], 5: [[su, sx], [giu, dx]], 6: [[su, giu]], 7: [[su, sx]],
        8: [[su, sx]], 9: [[su, giu]], 10: [[su, dx], [sx, giu]], 11: [[su, dx]], 12: [[sx, dx]], 13: [[giu, dx]], 14: [[sx, giu]],
      };
      for (const [p, q] of casi[k]) lega(p(), q());
    }
    const visti = new Set(), anelli = [];
    for (const inizio of vicini.keys()) {
      if (visti.has(inizio)) continue;
      const anello = [];
      let cur = inizio, prec = null;
      while (cur && !visti.has(cur)) {
        visti.add(cur);
        anello.push(punti.get(cur));
        const prossimo = vicini.get(cur).find((n) => n !== prec && !visti.has(n));
        prec = cur; cur = prossimo;
      }
      if (anello.length > 3) anelli.push(anello);
    }
    return anelli;
  };

  /* ── SVG ── */
  const n1 = (x) => Math.round(x * 10) / 10;
  const via = (pts, chiusa = true) => {
    let s = '';
    for (let i = 0; i < pts.length; i++) s += (i ? 'L' : 'M') + n1(pts[i][0]) + ' ' + n1(pts[i][1]);
    return s + (chiusa ? 'Z' : '');
  };
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const PALETTE = {};

  /* I due stili del Cartografo: Atlante inciso (di giorno) e Notte del cartografo (scuro).
     Hanno "stile" e i propri caratteri: le parti comuni qui sotto (cornice, titolo, rosa, scala,
     edifici, alberi) cambiano disegno in base a questo campo. */
  const FONT_ATLANTE = "'IM Fell English', Georgia, serif", FONT_ATLANTE_SC = "'IM Fell English SC', Georgia, serif", FONT_NOTTE = "'Cormorant SC', Georgia, serif";
  // Carta e Colori usano lo stesso disegno di Notte (stile 'notte'): curve di livello, foreste a puntini,
  // insediamenti come punti, linee sottili. "chiaro" indica i fondi chiari, dove i bagliori non servono.
  PALETTE.atlante = {
    nome: 'Carta', stile: 'notte', chiaro: true, font: FONT_NOTTE, fontTitolo: FONT_NOTTE, fontCorpo: "'Cormorant Garamond', Georgia, serif", rosso: '#a8452a', ambra: '#a8452a',
    carta: '#ece5d3', carta2: '#e3dac4', macchia: '#4a3e30', inchiostro: '#3a3128', tenue: '#6c6252',
    acqua: '#d9ddd2', acquaInk: '#3d6c82', erba: '#e6dec8', erba2: '#dcd2b8', chioma: '#5c7f63', chioma2: '#5c7f63',
    strada: '#f5f0e3', stradaBordo: '#a3927a', terra: '#e0d6bf', tetti: ['#d6cbb4', '#cfc3aa', '#dcd2bc', '#c9bca2'], tettoNobile: '#a8452a',
    campi: ['#e3dac2', '#ddd4ba', '#e8dfc9', '#d8ceb3'], neve: '#ffffff', pavimento: '#f3eee1', roccia: '#d8ccb2', parete: '#3a3128',
  };
  PALETTE.colori = {
    ...PALETTE.atlante, nome: 'Colori',
    carta: '#eae6d6', carta2: '#e0dcc8', acqua: '#b9d2d9', acquaInk: '#2f6680', erba: '#dde3c1', erba2: '#ccd6ab', chioma: '#4d8257', chioma2: '#4d8257',
    strada: '#f4efe0', terra: '#e4dcc0', tetti: ['#c98f70', '#bf8265', '#cf9c7c', '#b5775b'], tettoNobile: '#2f6680',
    campi: ['#e2d696', '#d4d797', '#e8d69f', '#c9d199'], pavimento: '#f1eadb', roccia: '#cbc2a8',
  };
  PALETTE.cartografo = {
    nome: 'Notte', stile: 'notte', font: FONT_NOTTE, fontTitolo: FONT_NOTTE, fontCorpo: "'Cormorant Garamond', Georgia, serif", rosso: '#e9b84f', ambra: '#e9b84f',
    carta: '#0e1d26', carta2: '#132631', macchia: '#000000', inchiostro: '#e8e1cf', tenue: '#9fb0b4',
    acqua: '#0a1720', acquaInk: '#7ebad8', erba: '#12262f', erba2: '#173240', chioma: '#7eb696', chioma2: '#7eb696',
    strada: '#1f3846', stradaBordo: '#08131a', terra: '#183140', tetti: ['#2a4553', '#2f4b5a', '#263f4c', '#2c4856'], tettoNobile: '#e9b84f',
    campi: ['#152d36', '#183238', '#132a33', '#1a3439'], neve: '#dfe7ee', pavimento: '#1f3846', roccia: '#24343f', parete: '#06100a',
  };

  // Tinte di caverne, dungeon ed edifici nei due stili: fondo, pavimento, roccia tratteggiata
  const TONI_INTERNI = {
    atlante: { stile: 'notte', chiaro: true, sfondo: '#ece5d3', pavimento: '#f6f2e7', roccia: '#d9cdb3', ink: '#3a3128', tenue: '#6c6252', ombra: '#4a3e30', numero: '#a8452a', acqua: '#ccdade', acquaInk: '#3d6c82', legno: '#b89a72', pietra: '#d8d0bf', metallo: '#8d97a0' },
    colori: { stile: 'notte', chiaro: true, colore: true, sfondo: '#eae6d6', pavimento: '#f3ecd9', roccia: '#c9bea4', ink: '#3a3128', tenue: '#6c6252', ombra: '#4a3e30', numero: '#a8452a', acqua: '#a9c9d4', acquaInk: '#2f6680', legno: '#c8935f', pietra: '#d3cab6', metallo: '#8d97a0' },
    notte: { stile: 'notte', sfondo: '#0e1d26', pavimento: '#1d3543', roccia: '#122530', ink: '#e8e1cf', tenue: '#9fb0b4', ombra: '#03090b', numero: '#e9b84f', acqua: '#0f3a52', acquaInk: '#7ebad8', legno: '#6b5a44', pietra: '#3a5563', metallo: '#8a95a0' },
  };

  const stileDi = (palette) => (palette === 'notte' || palette === 'colori' ? palette : 'atlante');
  const cartaInterni = (t) => ({ ...(t.chiaro ? (t.colore ? PALETTE.colori : PALETTE.atlante) : t.stile === 'notte' ? PALETTE.cartografo : t.colore ? PALETTE.colori : PALETTE.atlante), carta: t.sfondo, carta2: t.sfondo, inchiostro: t.ink, tenue: t.tenue });

  const FONT_TITOLO = "Cinzel, 'Times New Roman', serif";
  const FONT_TESTO = "'Crimson Pro', Georgia, serif";

  const apri = (W, H, p, seme) => {
    const s = _hash(String(seme)) % 1000;
    const scuro = p.stile === 'notte' && !p.chiaro;
    const sfocature = [4, 12, 40].map((b) => `<filter id="carto-b${b}" filterUnits="userSpaceOnUse" x="-200" y="-200" width="${W + 400}" height="${H + 400}"><feGaussianBlur stdDeviation="${b}"/></filter>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">` +
      `<defs>${sfocature}<filter id="carto-carta" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.018 0.024" numOctaves="5" seed="${s}"/>` +
      `<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${scuro ? 0.7 : p.chiaro ? 0.12 : 0.42} ${scuro ? -0.26 : p.chiaro ? -0.05 : -0.17}"/></filter>` +
      `${p.stile ? `<pattern id="carto-tratt" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 1.6H3.2" stroke="${p.inchiostro}" stroke-width="0.55" opacity="${p.stile === 'notte' ? 0.3 : 0.5}"/></pattern>` : ''}<pattern id="carto-sassi" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.7" cy="2" r="0.95" fill="${p.inchiostro}" opacity="0.34"/><circle cx="5.1" cy="5.4" r="0.7" fill="${p.inchiostro}" opacity="0.26"/><circle cx="5.7" cy="1.3" r="0.45" fill="${p.inchiostro}" opacity="0.22"/></pattern><radialGradient id="carto-vignetta" cx="50%" cy="50%" r="72%"><stop offset="62%" stop-color="${p.macchia}" stop-opacity="0"/><stop offset="100%" stop-color="${p.macchia}" stop-opacity="${scuro ? 0.5 : 0.3}"/></radialGradient></defs>` +
      `<rect width="${W}" height="${H}" fill="${p.carta}"/>` + (p.senzaCornice ? '' : p.chiaro ? `<rect width="${W}" height="${H}" fill="${p.carta2}" filter="url(#carto-carta)" opacity="0.35"/>` : `<rect width="${W}" height="${H}" fill="${p.carta2}" filter="url(#carto-carta)"/>`);
  };

  const chiudi = (W, H, p) => p.senzaCornice ? '</svg>' : p.stile ? _cornice(W, H, p) + '</svg>' :
    `<rect width="${W}" height="${H}" fill="url(#carto-vignetta)" pointer-events="none"/>` +
    `<rect x="16" y="16" width="${W - 32}" height="${H - 32}" fill="none" stroke="${p.inchiostro}" stroke-width="3"/>` +
    `<rect x="23" y="23" width="${W - 46}" height="${H - 46}" fill="none" stroke="${p.inchiostro}" stroke-width="0.9"/>` +
    [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]].map(([x, y]) =>
      `<path d="M${x - 9} ${y}L${x} ${y - 9}L${x + 9} ${y}L${x} ${y + 9}Z" fill="${p.carta}" stroke="${p.inchiostro}" stroke-width="1.6"/>`).join('') +
    '</svg>';

  // Cornici dei due stili: fascia a tacche alterne (atlante), filo di gesso (notte)
  const _cornice = (W, H, p) => {
    const bordo = `<path d="M0 0H${W}V${H}H0ZM20 20V${H - 20}H${W - 20}V20Z" fill="${p.carta}" fill-rule="evenodd"/>`;
    if (p.stile === 'notte') return `<rect width="${W}" height="${H}" fill="url(#carto-vignetta)" pointer-events="none"/>` + bordo + `<rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="${p.inchiostro}" stroke-width="0.9" opacity="0.45"/>`;
    let t = '';
    for (let x = 20, k = 0; x < W - 20; x += 50, k++) if (k % 2) { const l = Math.min(50, W - 20 - x); t += `M${x} 9h${l}v5h${-l}ZM${x} ${H - 14}h${l}v5h${-l}Z`; }
    for (let y = 20, k = 0; y < H - 20; y += 50, k++) if (k % 2) { const l = Math.min(50, H - 20 - y); t += `M9 ${y}v${l}h5v${-l}ZM${W - 14} ${y}v${l}h5v${-l}Z`; }
    const r = (d, sw) => `<rect x="${d}" y="${d}" width="${W - d * 2}" height="${H - d * 2}" fill="none" stroke="${p.inchiostro}" stroke-width="${sw}"/>`;
    return `<rect width="${W}" height="${H}" fill="url(#carto-vignetta)" pointer-events="none"/>` + bordo + `<path d="${t}" fill="${p.inchiostro}"/>` + r(6, 1.4) + r(9, 0.6) + r(14, 0.6) + r(20, 1.8);
  };

  // Fuori dalla cornice non si disegna nulla (ritaglio di tutto il contenuto della mappa)
  const areaMappa = (W, H, contenuto) =>
    `<clipPath id="carto-ritaglio"><rect x="20" y="20" width="${W - 40}" height="${H - 40}"/></clipPath><g clip-path="url(#carto-ritaglio)">${contenuto}</g>`;

  // Titolo semplice, senza cartiglio, da stampa antica
  const titoloSemplice = (W, testo, p) => etichetta(W / 2, 72, testo, p, { size: 54, peso: 500, colore: p.inchiostro, alone: p.carta, aloneW: 6 });

  const etichetta = (x, y, testo, p, o = {}) => {
    const {
      size = 15, font = p.font || FONT_TESTO, peso = p.stile === 'notte' ? 500 : 400, corsivo = false, spazio = 0, ancora = 'middle', colore = p.inchiostro, alone = p.carta, aloneW = 3.5, ruota = 0,
    } = o;
    return `<text x="${n1(x)}" y="${n1(y)}" font-family="${font}" font-size="${size}" font-weight="${peso}"${corsivo ? ' font-style="italic"' : ''}` +
      `${spazio ? ` letter-spacing="${spazio}"` : ''} text-anchor="${ancora}"${ruota ? ` transform="rotate(${n1(ruota)} ${n1(x)} ${n1(y)})"` : ''}` +
      ` fill="${colore}" stroke="${alone}" stroke-width="${aloneW}" stroke-linejoin="round" paint-order="stroke">${esc(testo)}</text>`;
  };

  const titolo = (W, testo, sotto, p) => {
    if (p.stile === 'notte') {
      return etichetta(W / 2, 74, String(testo).toUpperCase(), p, { size: 34, font: p.fontTitolo, peso: 600, spazio: 8, aloneW: 5 }) +
        (sotto ? etichetta(W / 2, 100, sotto, p, { size: 17, peso: 500, spazio: 2, colore: p.ambra, aloneW: 4 }) : '');
    }
    if (p.stile === 'atlante') {
      const larg = Math.max(300, String(testo).length * 19 + 90), x = W / 2 - larg / 2, y = 34, h = sotto ? 82 : 60;
      return `<g><rect x="${x}" y="${y}" width="${larg}" height="${h}" fill="${p.carta}" stroke="${p.inchiostro}" stroke-width="1.8"/>` +
        `<rect x="${x + 6}" y="${y + 6}" width="${larg - 12}" height="${h - 12}" fill="none" stroke="${p.inchiostro}" stroke-width="0.7"/>` +
        etichetta(W / 2, y + 40, testo, p, { size: 32, font: p.fontTitolo, spazio: 2, aloneW: 0 }) +
        (sotto ? etichetta(W / 2, y + 66, sotto, p, { size: 17, corsivo: true, aloneW: 0 }) : '') + '</g>';
    }
    const larg = Math.max(300, String(testo).length * 21 + 90), x = W / 2 - larg / 2, y = 34, h = sotto ? 76 : 58;
    return `<g><path d="M${x - 26} ${y + 14}L${x + 6} ${y + 14}L${x + 6} ${y + h + 8}L${x - 26} ${y + h + 8}L${x - 12} ${y + 11 + h / 2}Z" fill="${p.carta2}" stroke="${p.inchiostro}" stroke-width="1.4"/>` +
      `<path d="M${x + larg + 26} ${y + 14}L${x + larg - 6} ${y + 14}L${x + larg - 6} ${y + h + 8}L${x + larg + 26} ${y + h + 8}L${x + larg + 12} ${y + 11 + h / 2}Z" fill="${p.carta2}" stroke="${p.inchiostro}" stroke-width="1.4"/>` +
      `<rect x="${x}" y="${y}" width="${larg}" height="${h}" fill="${p.carta}" stroke="${p.inchiostro}" stroke-width="2"/>` +
      `<rect x="${x + 5}" y="${y + 5}" width="${larg - 10}" height="${h - 10}" fill="none" stroke="${p.inchiostro}" stroke-width="0.7"/>` +
      etichetta(W / 2, y + 39, testo, p, { size: 30, font: FONT_TITOLO, peso: 700, spazio: 1.5, aloneW: 0 }) +
      (sotto ? etichetta(W / 2, y + 62, sotto, p, { size: 16, corsivo: true, colore: p.tenue, aloneW: 0 }) : '') + '</g>';
  };

  const rosa = (x, y, r, p) => {
    if (p.stile === 'notte') {
      let l = `M${n1(x - r * 1.45)} ${y}H${n1(x + r * 1.45)}M${x} ${n1(y + r * 1.45)}V${n1(y - r)}`;
      for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2, r2 = r * (k % 9 ? 1.1 : 1.2); l += `M${n1(x + Math.sin(a) * r)} ${n1(y - Math.cos(a) * r)}L${n1(x + Math.sin(a) * r2)} ${n1(y - Math.cos(a) * r2)}`; }
      return `<g opacity="0.85"><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${p.inchiostro}" stroke-width="0.9" opacity="0.6"/><path d="${l}" fill="none" stroke="${p.inchiostro}" stroke-width="0.9" opacity="0.6"/>` +
        `<path d="M${x} ${n1(y - r * 1.62)}L${n1(x + r * 0.15)} ${n1(y - r)}H${n1(x - r * 0.15)}Z" fill="${p.ambra}"/></g>` + etichetta(x, y - r * 1.8, 'N', p, { size: r * 0.42, font: p.fontTitolo, peso: 600, colore: p.ambra, aloneW: 0 });
    }
    if (p.stile === 'atlante') {
      let g = `<g><circle cx="${x}" cy="${y}" r="${n1(r * 0.78)}" fill="${p.carta}" fill-opacity="0.75" stroke="${p.inchiostro}" stroke-width="0.9"/><circle cx="${x}" cy="${y}" r="${n1(r * 0.7)}" fill="none" stroke="${p.inchiostro}" stroke-width="0.8"/>`;
      let tic = '';
      for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2, r1 = r * 0.7, r2 = r * (k % 4 ? 0.74 : 0.78); tic += `M${n1(x + Math.sin(a) * r1)} ${n1(y - Math.cos(a) * r1)}L${n1(x + Math.sin(a) * r2)} ${n1(y - Math.cos(a) * r2)}`; }
      g += `<path d="${tic}" fill="none" stroke="${p.inchiostro}" stroke-width="0.7"/>`;
      const punta = (ang, len, larg) => {
        const tx = x + Math.sin(ang) * len, ty = y - Math.cos(ang) * len;
        const lx = x + Math.sin(ang - Math.PI / 2) * larg, ly = y - Math.cos(ang - Math.PI / 2) * larg, qx = x + Math.sin(ang + Math.PI / 2) * larg, qy = y - Math.cos(ang + Math.PI / 2) * larg;
        return `<path d="M${x} ${y}L${n1(tx)} ${n1(ty)}L${n1(lx)} ${n1(ly)}Z" fill="${p.inchiostro}"/><path d="M${x} ${y}L${n1(tx)} ${n1(ty)}L${n1(qx)} ${n1(qy)}Z" fill="${p.carta}"/>` +
          `<path d="M${n1(lx)} ${n1(ly)}L${n1(tx)} ${n1(ty)}L${n1(qx)} ${n1(qy)}L${x} ${y}Z" fill="none" stroke="${p.inchiostro}" stroke-width="0.8" stroke-linejoin="round"/>`;
      };
      for (let k = 0; k < 8; k++) g += punta(Math.PI / 8 + k * Math.PI / 4, r * 0.45, r * 0.05);
      for (let k = 0; k < 4; k++) g += punta(Math.PI / 4 + k * Math.PI / 2, r * 0.62, r * 0.09);
      for (let k = 0; k < 4; k++) g += punta(k * Math.PI / 2, r, r * 0.13);
      return g + `<circle cx="${x}" cy="${y}" r="${n1(r * 0.07)}" fill="${p.rosso}" stroke="${p.inchiostro}" stroke-width="0.8"/></g>` + etichetta(x, y - r - 9, 'N', p, { size: r * 0.36, font: p.fontTitolo, aloneW: 4 });
    }
    let s = `<g><circle cx="${x}" cy="${y}" r="${r * 1.04}" fill="${p.carta}" opacity="0.82"/><circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="none" stroke="${p.inchiostro}" stroke-width="1"/><circle cx="${x}" cy="${y}" r="${r * 0.56}" fill="none" stroke="${p.inchiostro}" stroke-width="0.5"/>`;
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8, m = i % 4 === 0 ? 1 : i % 2 === 0 ? 0.66 : 0.42, l = r * m, w = r * 0.11 * (i % 4 === 0 ? 1.15 : 0.85);
      const cx = Math.sin(a), cy = -Math.cos(a), px = -cy * w, py = cx * w, tx = x + cx * l, ty = y + cy * l;
      s += `<path d="M${n1(tx)} ${n1(ty)}L${n1(x + px)} ${n1(y + py)}L${x} ${y}Z" fill="${p.inchiostro}"/><path d="M${n1(tx)} ${n1(ty)}L${n1(x - px)} ${n1(y - py)}L${x} ${y}Z" fill="${p.carta}" stroke="${p.inchiostro}" stroke-width="0.6"/>`;
    }
    return s + etichetta(x, y - r - 6, 'N', p, { size: r * 0.42, font: FONT_TITOLO, peso: 700 }) + '</g>';
  };

  const scala = (x, y, pxUnita, unita, passi, p) => {
    if (p.stile) {
      const tr = pxUnita / 2, n = passi * 2, alta = p.stile === 'notte' ? 4 : 6;
      let s = '<g>';
      for (let i = 0; i < n; i++) s += `<rect x="${n1(x + i * tr)}" y="${y}" width="${n1(tr)}" height="${alta}" fill="${i % 2 ? p.carta : p.inchiostro}"/>`;
      s += `<rect x="${x}" y="${y}" width="${n1(n * tr)}" height="${alta}" fill="none" stroke="${p.inchiostro}" stroke-width="0.9"/>`;
      for (let i = 0; i <= passi; i++) s += etichetta(x + i * pxUnita, y - 7, String(i * unita.valore), p, { size: 13, aloneW: 3 });
      return s + etichetta(x + n * tr + 10, y + 6, unita.nome, p, { size: 14, ancora: 'start', aloneW: 3 }) + '</g>';
    }
    let s = `<g><rect x="${n1(x - 16)}" y="${y - 26}" width="${n1(passi * pxUnita + 66)}" height="42" rx="3" fill="${p.carta}" opacity="0.82"/>`;
    for (let i = 0; i < passi; i++) s += `<rect x="${n1(x + i * pxUnita)}" y="${y}" width="${n1(pxUnita)}" height="7" fill="${i % 2 ? p.carta : p.inchiostro}" stroke="${p.inchiostro}" stroke-width="1"/>`;
    return s + etichetta(x, y - 6, '0', p, { size: 13, aloneW: 2.5 }) + etichetta(x + passi * pxUnita, y - 6, passi * unita.valore + ' ' + unita.nome, p, { size: 13, aloneW: 2.5 }) + '</g>';
  };

  // A capo per parole: il testo SVG non va a capo da solo
  const _righe = (testo, max) => {
    const out = [];
    let cur = '';
    String(testo).split(/\s+/).forEach((w) => {
      if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
    });
    if (cur) out.push(cur);
    return out;
  };

  // Legenda come le tessere dell'app DM Toolkit: card tonda senza cornice, titolo in Gloock, numero in un cerchio pieno,
  // titolo della voce e descrizione in Figtree. Se non ci sta, riduce il corpo del testo.
  const FONT_APP_TITOLI = "Gloock, Georgia, serif", FONT_APP_TESTO = "Figtree, 'Segoe UI', sans-serif";
  const numeroTondo = (x, y, n, p, r = 13) => `<circle cx="${n1(x)}" cy="${n1(y)}" r="${r}" fill="${p.numeroFondo || p.rosso || p.inchiostro}"/>` +
    `<text x="${n1(x)}" y="${n1(y + r * 0.36)}" font-family="${FONT_APP_TESTO}" font-size="${n1(r * 1.05)}" font-weight="700" text-anchor="middle" fill="${p.numeroTesto || '#ffffff'}">${n}</text>`;
  const legenda = (x, y, larg, altMax, intestazione, voci, p) => {
    const scuro = p.stile === 'notte' && !p.chiaro;
    const fondo = p.fondoLegenda || (scuro ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)');
    for (const size of [16, 15, 14, 13, 12, 11]) {
      const riga = size * 1.32, rientro = 46, max = Math.floor((larg - rientro - 18) / (size * 0.5));
      let h = 62, corpo = '';
      for (const v of voci) {
        const testa = _righe(v.titolo, max), resto = v.testo ? _righe(v.testo, max) : [];
        const cima = h;
        h += riga;
        if (v.n) corpo += numeroTondo(x + 26, y + cima + riga * 0.62, v.n, p, Math.max(10, size * 0.78));
        testa.forEach((t, k) => { if (k) h += riga; corpo += `<text x="${x + rientro}" y="${n1(y + h)}" font-family="${FONT_APP_TESTO}" font-size="${size}" font-weight="600" fill="${p.inchiostro}">${esc(t)}</text>`; });
        resto.forEach((t) => { h += riga; corpo += `<text x="${x + rientro}" y="${n1(y + h)}" font-family="${FONT_APP_TESTO}" font-size="${size}" fill="${p.inchiostro}" opacity="0.75">${esc(t)}</text>`; });
        h += size * 0.9;
      }
      if (h + 14 <= altMax || size === 11) {
        return `<g><rect x="${x}" y="${y}" width="${larg}" height="${n1(Math.min(altMax, h + 14))}" rx="20" fill="${fondo}"/>` +
          `<text x="${x + 20}" y="${y + 40}" font-family="${FONT_APP_TITOLI}" font-size="25" fill="${p.inchiostro}">${esc(intestazione)}</text>${corpo}</g>`;
      }
    }
    return '';
  };

  // Mette insieme la mappa finita, rispettando le opzioni "nomi" e "titolo"
  const componi = ({ W, H, p, o, nome, sotto, corpo, testi = '', sopra = '', rosa: conRosa, scala: conScala, largTitolo, semplice }) =>
    apri(W, H, p, o.seme) + (p.senzaCornice ? corpo + (o.nomi === false ? '' : testi) : areaMappa(W, H, corpo + (o.nomi === false ? '' : testi))) + sopra +
    (o.titolo === false ? '' : (semplice ? titoloSemplice(largTitolo || W, nome, p) : titolo(largTitolo || W, nome, sotto, p))) +
    (conRosa ? rosa(W - 92, H - 96, 52, p) : '') +
    (conScala ? scala(52, H - 56, conScala[0], conScala[1], conScala[2], p) : '') +
    chiudi(W, H, p);

  /* ── Alberi ed edifici: tutto raccolto in pochi tracciati, per tenere leggero il file ── */
  // Variazione legata al punto e non alla sequenza casuale: cosi' cambiare stile non cambia il resto della mappa
  const _caso = (x, y, k) => { const v = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };
  const alberi = (lista, p, r) => {
    if (p.stile === 'notte') {
      let d = '';
      for (const [x, y, s = 1] of lista) { const q = 6 * s; for (let k = 0; k < 3; k++) { const a = _caso(x, y, k) * 6.28, m = q * (0.1 + _caso(y, x, k) * 0.45), c = 1.1 * s; d += `M${n1(x + Math.cos(a) * m - c)} ${n1(y + Math.sin(a) * m)}a${n1(c)} ${n1(c)} 0 1 0 ${n1(c * 2)} 0a${n1(c)} ${n1(c)} 0 1 0 ${n1(-c * 2)} 0`; } }
      return `<path d="${d}" fill="${p.chioma}" opacity="0.7"/>`;
    }
    if (p.stile === 'atlante') {
      // Chiome viste dall'alto, una per una (le piu' in basso coprono quelle dietro): cerchio, ombra a lunetta
      let g = '';
      for (const [x, y, s = 1] of lista.slice().sort((a, b) => a[1] - b[1])) {
        const q = 5.6 * s * (0.85 + _caso(x, y, 0) * 0.25);
        g += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(q)}" fill="${p.chioma}" stroke="${p.inchiostro}" stroke-width="0.8"/>` +
          `<path d="M${n1(x + q * 0.7)} ${n1(y - q * 0.35)}A${n1(q * 0.78)} ${n1(q * 0.78)} 0 0 1 ${n1(x - q * 0.35)} ${n1(y + q * 0.7)}" fill="none" stroke="${p.inchiostro}" stroke-width="0.6"/>`;
      }
      return g;
    }
    let ombra = '', a = '', b = '', luce = '';
    for (const [x, y, s = 1] of lista) {
      const q = 6 * s, lati = 8, punti = [];
      for (let i = 0; i < lati; i++) { const t = i / lati * Math.PI * 2, m = q * r.range(0.8, 1.1); punti.push([x + Math.cos(t) * m, y + Math.sin(t) * m]); }
      const forma = morbida(punti, 1, true), d = via(forma);
      ombra += via(forma.map(([u, v]) => [u + q * 0.4, v + q * 0.5]));
      if (r.chance(0.55)) a += d; else b += d;
      luce += `M${n1(x - q * 0.5)} ${n1(y - q * 0.1)}a${n1(q * 0.5)} ${n1(q * 0.5)} 0 0 1 ${n1(q * 0.6)} ${n1(-q * 0.4)}`;
    }
    return `<path d="${ombra}" fill="#000" opacity="0.2"/><path d="${a}" fill="${p.chioma}" stroke="${p.inchiostro}" stroke-width="0.8"/>` +
      `<path d="${b}" fill="${p.chioma2}" stroke="${p.inchiostro}" stroke-width="0.8"/><path d="${luce}" fill="none" stroke="${p.carta}" stroke-width="0.8" opacity="0.5"/>`;
  };

  // Edificio con tetto a due falde: falda in ombra + linea di colmo lungo il lato piu' lungo
  const edifici = (lista, p, ombraDist = 2.2) => {
    if (p.stile) return _edificiStile(lista, p, ombraDist);
    const perColore = new Map();
    let ombre = '', falde = '', colmi = '', pareti = '';
    for (const e of lista) {
      const q = e.poly;
      if (!perColore.has(e.colore)) perColore.set(e.colore, '');
      perColore.set(e.colore, perColore.get(e.colore) + via(q));
      ombre += via(q.map(([x, y]) => [x + ombraDist * 1.7, y + ombraDist * 1.9]));
      // Pareti in vista: i lati rivolti a sud-est scendono verso il basso, e l'edificio prende volume
      const verso = area(q) > 0 ? 1 : -1;
      for (let i = 0; i < q.length; i++) {
        const a = q[i], b = q[(i + 1) % q.length], nx = (b[1] - a[1]) * verso, ny = -(b[0] - a[0]) * verso;
        if (nx * ombraDist + ny * ombraDist * 1.15 > 0) pareti += via([a, b, [b[0] + ombraDist, b[1] + ombraDist * 1.15], [a[0] + ombraDist, a[1] + ombraDist * 1.15]]);
      }
      let lung = -1, ax = 1, ay = 0;
      for (let i = 0; i < q.length; i++) {
        const a = q[i], b = q[(i + 1) % q.length], l = dist(a, b);
        if (l > lung) { lung = l; ax = (b[0] - a[0]) / (l || 1); ay = (b[1] - a[1]) / (l || 1); }
      }
      const c = centro(q);
      let nx = -ay, ny = ax;
      if (nx + ny * 1.2 < 0) { nx = -nx; ny = -ny; } // la falda in ombra e' quella verso sud-est
      const parte = taglia(q, c[0], c[1], -nx, -ny);
      if (parte.length > 2) falde += via(parte);
      const estensione = q.reduce((m, v) => Math.max(m, Math.abs((v[0] - c[0]) * ax + (v[1] - c[1]) * ay)), 0) * 0.82;
      colmi += `M${n1(c[0] - ax * estensione)} ${n1(c[1] - ay * estensione)}L${n1(c[0] + ax * estensione)} ${n1(c[1] + ay * estensione)}`;
    }
    let s = `<path d="${ombre}" fill="#000" opacity="0.2"/><path d="${pareti}" fill="${p.muroPieno ? '#4a463c' : p.inchiostro}" stroke="${p.inchiostro}" stroke-width="0.6" stroke-linejoin="round"/>`;
    perColore.forEach((d, col) => { s += `<path d="${d}" fill="${col}" stroke="${p.inchiostro}" stroke-width="0.8" stroke-linejoin="round"/>`; });
    if (p.muroPieno) return s; // incisione: tetti piatti, solo il volume delle pareti
    return s + `<path d="${falde}" fill="#000" opacity="0.17"/><path d="${colmi}" fill="none" stroke="${p.inchiostro}" stroke-width="0.6" opacity="0.75"/>`;
  };

  // Edifici dei due stili: pianta con il fianco in ombra; l'atlante tratteggia i tetti come una stampa
  const _edificiStile = (lista, p, ombraDist) => {
    const perColore = new Map();
    let pareti = '', tutti = '';
    for (const e of lista) {
      const q = e.poly, d = via(q);
      perColore.set(e.colore, (perColore.get(e.colore) || '') + d);
      tutti += d;
      const verso = area(q) > 0 ? 1 : -1;
      for (let i = 0; i < q.length; i++) {
        const a = q[i], b = q[(i + 1) % q.length], nx = (b[1] - a[1]) * verso, ny = -(b[0] - a[0]) * verso;
        if (nx * ombraDist + ny * ombraDist * 1.15 > 0) pareti += via([a, b, [b[0] + ombraDist, b[1] + ombraDist * 1.15], [a[0] + ombraDist, a[1] + ombraDist * 1.15]]);
      }
    }
    const notte = p.stile === 'notte';
    let s = `<path d="${pareti}" fill="${p.parete}" stroke="${p.parete}" stroke-width="0.6" stroke-linejoin="round"${notte ? ' opacity="0.8"' : ''}/>`;
    perColore.forEach((d, col) => { s += `<path d="${d}" fill="${col}" stroke="${notte ? (col === p.tettoNobile ? p.tettoNobile : p.tenue) : p.inchiostro}" stroke-width="${notte ? 0.7 : 0.85}" stroke-linejoin="round"/>`; });
    if (!notte) s += `<path d="${tutti}" fill="url(#carto-tratt)"/>`;
    return s;
  };

  // Rettangolo ruotato attorno a un centro
  const rettangolo = (cx, cy, l, h, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    return [[-l / 2, -h / 2], [l / 2, -h / 2], [l / 2, h / 2], [-l / 2, h / 2]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
  };

  // Campo coltivato con i solchi tracciati nella direzione di un suo lato
  const campo = (poly, colore, ang, passo, p) => {
    if (poly.length < 3) return '';
    const c = centro(poly), dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    let min = Infinity, max = -Infinity;
    for (const v of poly) { const o = (v[0] - c[0]) * nx + (v[1] - c[1]) * ny; if (o < min) min = o; if (o > max) max = o; }
    let solchi = '';
    for (let o = min + passo / 2; o < max; o += passo) {
      const a = [c[0] + nx * o - dx * 2000, c[1] + ny * o - dy * 2000], b = [c[0] + nx * o + dx * 2000, c[1] + ny * o + dy * 2000];
      const tocchi = [];
      for (let i = 0; i < poly.length; i++) { const t = incrocio(a, b, poly[i], poly[(i + 1) % poly.length]); if (t) tocchi.push(t); }
      if (tocchi.length >= 2) solchi += `M${n1(tocchi[0][0])} ${n1(tocchi[0][1])}L${n1(tocchi[1][0])} ${n1(tocchi[1][1])}`;
    }
    // Campo: colore pieno, siepe puntinata lungo il bordo e file di piantine a puntini (non righe continue)
    return `<path d="${via(poly)}" fill="${colore}"/>` +
      `<path d="${via(poly)}" fill="none" stroke="${p.chioma}" stroke-width="2.4" stroke-dasharray="0.1 3.6" stroke-linecap="round" opacity="0.7"/>` +
      `<path d="${solchi}" fill="none" stroke="${p.tenue}" stroke-width="1.3" stroke-dasharray="0.1 ${n1(passo * 0.75)}" stroke-linecap="round" opacity="0.45"/>`;
  };

  // Corso d'acqua che attraversa la mappa, con riflessi lungo la riva
  const fiumeSvg = (linea, larg, p) => {
    const d = via(linea, false);
    return `<path d="${d}" fill="none" stroke="${p.acquaInk}" stroke-width="${larg + 3}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${p.acqua}" stroke-width="${larg}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${p.acquaInk}" stroke-width="0.8" stroke-dasharray="26 34" opacity="0.5" stroke-linejoin="round"/>`;
  };

  // Linee parallele dentro un poligono qualsiasi (anche non convesso), per ombre e solchi
  const tratteggio = (poly, ang, passo, salta = 0, r = null) => {
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, c = centro(poly);
    let min = Infinity, max = -Infinity;
    for (const v of poly) { const o = (v[0] - c[0]) * nx + (v[1] - c[1]) * ny; if (o < min) min = o; if (o > max) max = o; }
    let d = '';
    for (let o = min + passo * 0.5; o < max; o += passo) {
      const ax = c[0] + nx * o, ay = c[1] + ny * o, tt = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const da = (a[0] - ax) * nx + (a[1] - ay) * ny, db = (b[0] - ax) * nx + (b[1] - ay) * ny;
        if ((da < 0) === (db < 0)) continue;
        const q = lerp(a, b, da / (da - db));
        tt.push((q[0] - ax) * dx + (q[1] - ay) * dy);
      }
      tt.sort((u, v) => u - v);
      for (let i = 0; i + 1 < tt.length; i += 2) {
        let t0 = tt[i] + salta, t1 = tt[i + 1] - salta;
        if (r) { t0 += r.range(0, passo); t1 -= r.range(0, passo); }
        if (t1 <= t0) continue;
        d += `M${n1(ax + dx * t0)} ${n1(ay + dy * t0)}L${n1(ax + dx * t1)} ${n1(ay + dy * t1)}`;
      }
    }
    return d;
  };

  // Testo che segue una curva, sempre leggibile da sinistra a destra
  let _idArco = 0;
  const testoCurvo = (punti, testo, p, o = {}) => {
    const {
      size = 22, font = p.fontTitolo || FONT_TESTO, peso = p.stile ? 500 : 600, corsivo = false, spazio = 3, colore = p.inchiostro, alone = p.carta, aloneW = 4,
    } = o;
    const pts = punti[0][0] > punti[punti.length - 1][0] ? punti.slice().reverse() : punti;
    const id = 'carto-arco-' + (++_idArco);
    return `<path id="${id}" d="${via(pts, false)}" fill="none"/><text font-family="${font}" font-size="${size}" font-weight="${peso}"${corsivo ? ' font-style="italic"' : ''} letter-spacing="${spazio}" ` +
      `fill="${colore}" stroke="${alone}" stroke-width="${aloneW}" stroke-linejoin="round" paint-order="stroke" text-anchor="middle"><textPath href="#${id}" xlink:href="#${id}" startOffset="50%">${esc(testo)}</textPath></text>`;
  };

  // Curva per un'etichetta: passa per il centro di un gruppo di punti, lungo la sua direzione principale
  const curvaSuPunti = (punti, lung, arco = 0.12) => {
    const cx = punti.reduce((s, q) => s + q[0], 0) / punti.length, cy = punti.reduce((s, q) => s + q[1], 0) / punti.length;
    let xx = 0, yy = 0, xy = 0;
    punti.forEach(([x, y]) => { xx += (x - cx) ** 2; yy += (y - cy) ** 2; xy += (x - cx) * (y - cy); });
    let ang = 0.5 * Math.atan2(2 * xy, xx - yy);
    if (Math.abs(ang) > 1.1) ang = Math.sign(ang) * 1.1; // mai troppo verticale: si deve leggere
    const dx = Math.cos(ang), dy = Math.sin(ang), out = [];
    for (let t = -1; t <= 1.001; t += 0.125) out.push([cx + dx * t * lung / 2 + dy * (1 - t * t) * lung * arco, cy + dy * t * lung / 2 - dx * (1 - t * t) * lung * arco]);
    return out;
  };

  /* ── Nomi ── */
  const NOME_A = ['Rocca', 'Porto', 'Monte', 'Val', 'Castel', 'Borgo', 'Pietra', 'Acqua', 'Torre', 'Selva', 'Fonte', 'Corte', 'Serra', 'Fiume'];
  const NOME_B = ['nera', 'vento', 'alta', 'ombra', 'ferro', 'grigia', 'lupo', 'chiara', 'fredda', 'corvo', 'sale', 'lunga', 'spina', 'argento', 'rovo', 'quercia', 'stella', 'cenere'];
  // Sillabe per popolo: due pezzi per nome, sempre due estrazioni (cambiare popolo non cambia il resto della mappa)
  const POPOLI = {
    elfico: [['Ael', 'Lor', 'Sil', 'Ith', 'Cael', 'Fae', 'Ela', 'Myr', 'Thal', 'Yl', 'Ilm', 'Nim', 'Ser', 'Aen'], ['wen', 'dor', 'lith', 'iel', 'andor', 'esse', 'thas', 'ion', 'ara', 'ethil', 'nore', 'valon', 'rien', 'lis', 'anor', 'enya', 'mir', 'ost']],
    nanico: [['Kar', 'Dur', 'Grim', 'Bar', 'Thor', 'Khaz', 'Dun', 'Mor', 'Bal', 'Gor', 'Brun', 'Hald', 'Thra', 'Kel'], ['ak', 'dum', 'grund', 'heim', 'buk', 'zar', 'dok', 'mund', 'rak', 'gol', 'thar', 'borg', 'dar', 'um', 'hold', 'drin', 'kor', 'nar']],
    orchesco: [['Gash', 'Mug', 'Ruk', 'Zug', 'Grak', 'Ugh', 'Nar', 'Bol', 'Skar', 'Lug', 'Durz', 'Krag', 'Shag', 'Gor'], ['nak', 'gul', 'tar', 'ash', 'rot', 'muk', 'gor', 'zug', 'dush', 'bur', 'krak', 'tuk', 'mag', 'ruk', 'gash', 'lok', 'zog', 'thak']],
    nordico: [['Skal', 'Hrafn', 'Ulf', 'Bjorn', 'Ey', 'Sig', 'Frost', 'Hel', 'Isa', 'Vald', 'Ran', 'Tor', 'Grim', 'Ask'], ['vik', 'heim', 'fjord', 'stad', 'by', 'holm', 'gard', 'nes', 'dal', 'vang', 'berg', 'sund', 'havn', 'rud', 'mark', 'fell', 'ey', 'vin']],
  };
  const nomeLuogo = (r, popolo) => { const P = POPOLI[popolo]; return P ? r.pick(P[0]) + r.pick(P[1]) : r.pick(NOME_A) + r.pick(NOME_B); };
  const POPOLO_OPZIONI = [['italiano', "All'italiana"], ['elfico', 'Elfici'], ['nanico', 'Nanici'], ['orchesco', 'Orcheschi'], ['nordico', 'Nordici']];

  return {
    campoDistanze, rng, rumore, dist, lerp, area, centro, dentro, taglia, rientra, distSeg, distLinea, incrocio, celle, morbida, contorni,
    n1, via, esc, PALETTE, FONT_TITOLO, FONT_TESTO, FONT_ATLANTE, FONT_ATLANTE_SC, FONT_NOTTE, apri, chiudi, areaMappa, etichetta, titolo, rosa, scala,
    alberi, edifici, rettangolo, campo, fiumeSvg, nomeLuogo, POPOLO_OPZIONI, legenda, numeroTondo, componi, cartaInterni, stileDi, tratteggio, testoCurvo, curvaSuPunti, TONI_INTERNI, righe: _righe,
  };
})();

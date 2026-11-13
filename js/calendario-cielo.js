/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   CALENDARIO-CIELO.JS — Lune, stagioni e meteo legati alla data.

   Tutto si calcola dal "giorno assoluto" (Calendario.toAbsoluteDay):
   - lune: una o piu', ognuna con il suo ciclo in giorni e uno
     sfasamento; la fase si ricava dal resto della divisione;
   - stagioni: ognuna comincia in un giorno dell'anno (mese e giorno);
   - meteo: generato giorno per giorno dal clima scelto e dalla
     stagione, con un "seme" della campagna: la stessa data da'
     sempre lo stesso tempo, e il tempo cambia in modo graduale
     (rumore continuo), non a caso da un giorno all'altro.
   Ogni parte si accende e si spegne dalle Impostazioni del calendario.
   ============================================================ */

const CalendarioCielo = (() => {
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ── Impostazioni, con i valori predefiniti ── */
  const STAGIONI_BASE = (cal) => {
    // Su un anno di 12 mesi: primavera dal 21 del 3° mese, estate dal 21 del 6°, e cosi' via.
    // Su anni diversi si usa la stessa frazione dell'anno.
    const n = (cal.mesi || []).length || 12;
    const inizio = (frazione) => {
      const giorni = Calendario.daysPerYear(cal) || 360;
      let resto = Math.round(frazione * giorni), m = 0;
      while (m < n - 1 && resto >= (cal.mesi[m]?.giorni || 30)) { resto -= (cal.mesi[m]?.giorni || 30); m++; }
      return { mese: m, giorno: resto + 1 };
    };
    return [
      { nome: 'Primavera', ...inizio(0.222) },
      { nome: 'Estate', ...inizio(0.472) },
      { nome: 'Autunno', ...inizio(0.722) },
      { nome: 'Inverno', ...inizio(0.972) },
    ];
  };
  const impost = (cal) => ({
    lune: Array.isArray(cal?.lune) ? cal.lune : [{ nome: 'Luna', ciclo: 29.5, sfasamento: 0 }],
    mostraLune: cal?.mostraLune !== false,
    stagioni: Array.isArray(cal?.stagioni) && cal.stagioni.length ? cal.stagioni : STAGIONI_BASE(cal || { mesi: [] }),
    mostraStagioni: cal?.mostraStagioni !== false,
    meteo: cal?.meteo !== false,
    clima: cal?.clima || 'temperato',
  });

  /* ── Lune ── */
  const FASI = ['Luna nuova', 'Falce crescente', 'Primo quarto', 'Gibbosa crescente', 'Luna piena', 'Gibbosa calante', 'Ultimo quarto', 'Falce calante'];
  const fase = (luna, abs) => {
    const ciclo = Math.max(2, Number(luna.ciclo) || 29.5);
    const f = ((((abs + (Number(luna.sfasamento) || 0)) % ciclo) + ciclo) % ciclo) / ciclo; // 0 = nuova, 0.5 = piena
    const indice = Math.round(f * 8) % 8;
    // Il giorno "esatto" di luna nuova o piena: quello piu' vicino al momento della fase
    const giorniDa = (centro) => Math.abs(((f - centro + 1.5) % 1) - 0.5) * ciclo;
    return { f, indice, nome: FASI[indice], piena: giorniDa(0.5) < 0.5, nuova: giorniDa(0) < 0.5, quarto: giorniDa(0.25) < 0.5 || giorniDa(0.75) < 0.5 };
  };
  // Disegno della fase: disco scuro e parte illuminata, con il terminatore ellittico
  const iconaLuna = (f, size = 14, titolo = '') => {
    const r = 6, cx = 7, cy = 7, x = r * Math.cos(2 * Math.PI * f), rx = Math.abs(x).toFixed(2);
    const crescente = f < 0.5;
    const luce = crescente
      ? `M${cx} ${cy - r}A${r} ${r} 0 0 1 ${cx} ${cy + r}A${rx} ${r} 0 0 ${x > 0 ? 0 : 1} ${cx} ${cy - r}Z`
      : `M${cx} ${cy - r}A${r} ${r} 0 0 0 ${cx} ${cy + r}A${rx} ${r} 0 0 ${x > 0 ? 1 : 0} ${cx} ${cy - r}Z`;
    return `<svg class="cielo-luna" width="${size}" height="${size}" viewBox="0 0 14 14" role="img" aria-label="${_esc(titolo)}"><title>${_esc(titolo)}</title><circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--bg-tertiary)" stroke="currentColor" stroke-width="0.9"/><path d="${luce}" fill="currentColor"/></svg>`;
  };

  /* ── Stagioni ── */
  const stagione = (cal, abs) => {
    const s = impost(cal).stagioni;
    const anno = Calendario.daysPerYear(cal) || 360;
    const giornoAnno = ((abs % anno) + anno) % anno;
    const inizioDi = (st) => (cal.mesi || []).slice(0, Math.max(0, Math.min(st.mese || 0, (cal.mesi || []).length - 1))).reduce((t, m) => t + (m.giorni || 30), 0) + ((st.giorno || 1) - 1);
    const ordinate = s.map((st, i) => ({ ...st, i, d: inizioDi(st) })).sort((a, b) => a.d - b.d);
    let attuale = ordinate[ordinate.length - 1];
    for (const st of ordinate) if (st.d <= giornoAnno) attuale = st;
    // Quanto si e' dentro la stagione (0-1): serve al meteo per passare gradualmente da una all'altra
    const pos = ordinate.indexOf(attuale), prossima = ordinate[(pos + 1) % ordinate.length];
    const durata = ((prossima.d - attuale.d + anno) % anno) || anno;
    const dentro = (((giornoAnno - attuale.d) % anno) + anno) % anno / durata;
    return { nome: attuale.nome, indice: attuale.i, dentro, chiave: _chiaveStagione(attuale.nome) };
  };
  const _chiaveStagione = (nome) => {
    const n = String(nome || '').toLowerCase();
    if (/inver|gel|fredd/.test(n)) return 'inverno';
    if (/prima|fior|disgel/.test(n)) return 'primavera';
    if (/esta|sole|cald/.test(n)) return 'estate';
    if (/autun|racc|foglie/.test(n)) return 'autunno';
    return 'primavera';
  };

  /* ── Meteo ── */
  const CLIMI = {
    temperato: { nome: 'Temperato', t: { inverno: 3, primavera: 13, estate: 25, autunno: 14 }, escursione: 8, pioggia: { inverno: 0.3, primavera: 0.3, estate: 0.14, autunno: 0.32 } },
    mediterraneo: { nome: 'Mediterraneo', t: { inverno: 10, primavera: 17, estate: 30, autunno: 20 }, escursione: 9, pioggia: { inverno: 0.38, primavera: 0.28, estate: 0.06, autunno: 0.33 } },
    freddo: { nome: 'Freddo, nordico', t: { inverno: -10, primavera: 2, estate: 14, autunno: 2 }, escursione: 7, pioggia: { inverno: 0.42, primavera: 0.35, estate: 0.3, autunno: 0.45 } },
    montano: { nome: 'Montano', t: { inverno: -5, primavera: 6, estate: 17, autunno: 7 }, escursione: 10, pioggia: { inverno: 0.4, primavera: 0.42, estate: 0.38, autunno: 0.4 } },
    desertico: { nome: 'Desertico', t: { inverno: 16, primavera: 27, estate: 38, autunno: 27 }, escursione: 18, pioggia: { inverno: 0.06, primavera: 0.04, estate: 0.02, autunno: 0.04 } },
    tropicale: { nome: 'Tropicale', t: { inverno: 26, primavera: 28, estate: 28, autunno: 27 }, escursione: 7, pioggia: { inverno: 0.2, primavera: 0.35, estate: 0.65, autunno: 0.5 } },
  };
  const ORDINE = ['inverno', 'primavera', 'estate', 'autunno'];

  // Numeri pseudo-casuali ripetibili e rumore continuo (si interpola tra punti ogni "passo" giorni)
  const _hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const _rnd = (seme, n) => { let x = (seme ^ Math.imul(n | 0, 2654435761)) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822507); x ^= x >>> 13; x = Math.imul(x, 3266489909); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  const _rumore = (seme, giorno, passo) => {
    const a = Math.floor(giorno / passo), t = giorno / passo - a, u = t * t * (3 - 2 * t);
    return _rnd(seme, a) * (1 - u) + _rnd(seme, a + 1) * u;
  };
  const _seme = (cal) => _hash(String(App.getActiveCampaign?.()?.id || 'pocket') + ':' + (cal?.nome || ''));

  const meteo = (cal, abs) => {
    const o = impost(cal), C = CLIMI[o.clima] || CLIMI.temperato, st = stagione(cal, abs), seme = _seme(cal);
    // Temperatura media che scivola verso la stagione successiva nell'ultimo terzo della stagione
    const k = ORDINE.indexOf(st.chiave), dopo = ORDINE[(k + 1) % 4];
    const mix = st.dentro > 0.66 ? (st.dentro - 0.66) / 0.34 : 0;
    const media = C.t[st.chiave] * (1 - mix) + C.t[dopo] * mix;
    const anomalia = (_rumore(seme + 11, abs, 5) - 0.5) * 10 + (_rnd(seme + 17, abs) - 0.5) * 3;
    const tMax = Math.round(media + C.escursione / 2 + anomalia), tMin = Math.round(media - C.escursione / 2 + anomalia);
    const pioggiaP = C.pioggia[st.chiave] * (1 - mix) + C.pioggia[dopo] * mix;
    const umido = _rumore(seme + 23, abs, 3) * 0.6 + _rnd(seme + 41, abs) * 0.4, nuvole = _rumore(seme + 29, abs, 2), vento = _rumore(seme + 31, abs, 2);
    let tipo;
    if (umido > 1 - pioggiaP) {
      const forte = _rnd(seme + 37, abs) > 0.72;
      tipo = (tMax <= 3 || (tMin <= -1 && tMax <= 6)) ? (forte ? 'bufera' : 'neve') : (forte && tMax > 18 ? 'temporale' : 'pioggia');
    } else if (vento > 0.86) tipo = 'vento';
    else if (nuvole > 0.72 && tMin < 12 && vento < 0.4 && st.chiave !== 'estate') tipo = 'nebbia';
    else tipo = nuvole > 0.62 ? 'nuvoloso' : nuvole > 0.36 ? 'variabile' : 'sereno';
    return { tipo, testo: TESTI[tipo], tMin, tMax, stagione: st.nome, clima: C.nome, nota: NOTE[tipo] };
  };
  const TESTI = { sereno: 'Sereno', variabile: 'Poco nuvoloso', nuvoloso: 'Coperto', pioggia: 'Pioggia', temporale: 'Temporale', neve: 'Neve', bufera: 'Bufera di neve', vento: 'Vento forte', nebbia: 'Nebbia' };
  const NOTE = {
    sereno: 'Si vede lontano; di notte il cielo è pieno di stelle.',
    variabile: 'Sole e nuvole che corrono.',
    nuvoloso: 'Luce grigia e piatta, niente ombre.',
    pioggia: 'Strade fangose, tracce che spariscono, fuochi difficili da accendere.',
    temporale: 'Tuoni che coprono i rumori, lampi che illuminano a tratti. Meglio un riparo.',
    neve: 'Passi che lasciano impronte chiare, viaggio più lento.',
    bufera: 'Si vede a pochi passi; restare fuori è pericoloso.',
    vento: 'Frecce deviate, voci che si perdono, fiamme che si spengono.',
    nebbia: 'Si vede poco oltre qualche metro: agguati facili, rotte perse.',
  };

  // Icone del tempo, disegnate a tratto come le altre dell'app
  const _P = {
    sole: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    nuvola: '<path d="M7 18h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 18Z"/>',
  };
  const iconaMeteo = (tipo, size = 14) => {
    const corpo = {
      sereno: _P.sole,
      variabile: '<path d="M8 3v1.2M3.8 4.8l.9.9M2.5 9h1.2"/><circle cx="8" cy="9" r="2.6"/>' + '<path d="M10 20h7.5a3.4 3.4 0 0 0 .5-6.8 5 5 0 0 0-9.5 1.4A2.8 2.8 0 0 0 10 20Z"/>',
      nuvoloso: _P.nuvola,
      pioggia: '<path d="M7 15h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 15Z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
      temporale: '<path d="M7 14h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 14Z"/><path d="M12 14l-2 4h3l-2 4"/>',
      neve: '<path d="M7 14h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 14Z"/><path d="M8 18h.01M12 20h.01M16 18h.01M10 22h.01M14 22h.01"/>',
      bufera: '<path d="M7 13h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 13Z"/><path d="M4 17h12M6 20h12M8 17h.01M14 20h.01"/>',
      vento: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
      nebbia: '<path d="M4 9h16M3 13h18M5 17h14"/>',
    }[tipo] || _P.sole;
    return `<svg class="cielo-meteo" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corpo}</svg>`;
  };

  /* ── Pezzi per la vista del mese ── */
  // Riga in fondo alla cella del giorno: fasi principali delle lune e tempo del giorno
  const cella = (cal, abs) => {
    const o = impost(cal);
    let h = '';
    if (o.mostraLune) o.lune.forEach((l) => {
      const ph = fase(l, abs);
      if (ph.piena || ph.nuova || ph.quarto) h += iconaLuna(ph.f, 15, l.nome + ': ' + ph.nome);
    });
    if (o.meteo) { const m = meteo(cal, abs); h += '<span class="cielo-tempo" title="' + _esc(m.testo + ', ' + m.tMin + '–' + m.tMax + ' °C') + '">' + iconaMeteo(m.tipo, 16) + '<span>' + m.tMax + '°</span></span>'; }
    return h ? '<div class="cielo-cella">' + h + '</div>' : '';
  };
  // Etichetta accanto al nome del mese: la stagione del primo e dell'ultimo giorno
  const etichettaMese = (cal, primo, giorni) => {
    const o = impost(cal);
    if (!o.mostraStagioni) return '';
    const a = stagione(cal, primo).nome, b = stagione(cal, primo + giorni - 1).nome;
    return '<span class="cielo-stagione">' + _esc(a === b ? a : a + ' → ' + b) + '</span>';
  };
  // Riquadro nel pannello del giorno
  const dettaglio = (cal, abs) => {
    const o = impost(cal);
    const righe = [];
    if (o.mostraStagioni) righe.push('<div><b>Stagione:</b> ' + _esc(stagione(cal, abs).nome) + '</div>');
    if (o.mostraLune) o.lune.forEach((l) => {
      const ph = fase(l, abs);
      // Quanti giorni alla prossima luna piena
      let tra = 0; while (tra < 400 && !fase(l, abs + tra).piena) tra++;
      righe.push('<div style="display:flex;align-items:center;gap:6px;">' + iconaLuna(ph.f, 16, l.nome + ': ' + ph.nome) + '<span><b>' + _esc(l.nome) + ':</b> ' + ph.nome.toLowerCase() + (ph.piena ? '' : ' · piena tra ' + tra + (tra === 1 ? ' giorno' : ' giorni')) + '</span></div>');
    });
    if (o.meteo) {
      const m = meteo(cal, abs);
      righe.push('<div style="display:flex;align-items:flex-start;gap:6px;">' + iconaMeteo(m.tipo, 16) + '<span><b>' + m.testo + '</b>, ' + m.tMin + '–' + m.tMax + ' °C · clima ' + m.clima.toLowerCase() + '<br><span style="color:var(--text-muted);">' + _esc(m.nota) + '</span></span></div>');
    }
    return righe.length ? '<div class="cielo-dettaglio">' + righe.join('') + '</div>' : '';
  };
  // Tempo di oggi, per lo Schermo del Master e altre viste
  const oggi = (cal) => {
    if (!cal || !cal.mesi?.length) return null;
    const abs = Calendario.toAbsoluteDay(cal, { giorno: cal.giorno, mese: cal.mese, anno: cal.anno });
    const o = impost(cal);
    return { meteo: o.meteo ? meteo(cal, abs) : null, lune: o.mostraLune ? o.lune.map((l) => { const ph = fase(l, abs); return { luna: l.nome, fase: ph.nome, f: ph.f }; }) : [], stagione: o.mostraStagioni ? stagione(cal, abs).nome : null };
  };

  /* ── Card delle Impostazioni del calendario ── */
  const cardHTML = (cal) => {
    const o = impost(cal);
    const meseOpts = (sel) => (cal.mesi || []).map((m, i) => '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + _esc(m.it || m.nome || ('Mese ' + (i + 1))) + '</option>').join('');
    const lune = o.lune.map((l, i) =>
      '<div class="cielo-riga cielo-luna-riga" style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;">' +
        '<input class="form-input cielo-l-nome" value="' + _esc(l.nome) + '" placeholder="Nome" style="flex:1;min-width:110px;font-size:0.8rem;">' +
        '<label style="font-size:0.72rem;color:var(--text-muted);display:flex;align-items:center;gap:4px;">ciclo <input class="form-input cielo-l-ciclo" type="number" min="2" max="400" step="0.5" value="' + (l.ciclo || 29.5) + '" style="width:72px;font-size:0.8rem;"> giorni</label>' +
        '<label style="font-size:0.72rem;color:var(--text-muted);display:flex;align-items:center;gap:4px;" title="Sposta le fasi in avanti di qualche giorno">sposta <input class="form-input cielo-l-sfas" type="number" min="-400" max="400" value="' + (l.sfasamento || 0) + '" style="width:64px;font-size:0.8rem;"></label>' +
        '<button type="button" class="btn btn-ghost btn-sm" onclick="CalendarioCielo.togliLuna(' + i + ')" style="min-height:32px;">Togli</button>' +
      '</div>').join('');
    const stagioni = o.stagioni.map((s) =>
      '<div class="cielo-riga cielo-stag-riga" style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;">' +
        '<input class="form-input cielo-s-nome" value="' + _esc(s.nome) + '" style="flex:1;min-width:110px;font-size:0.8rem;">' +
        '<span style="font-size:0.72rem;color:var(--text-muted);">dal</span>' +
        '<input class="form-input cielo-s-giorno" type="number" min="1" max="99" value="' + (s.giorno || 1) + '" style="width:60px;font-size:0.8rem;">' +
        '<select class="form-select cielo-s-mese" style="width:auto;font-size:0.8rem;">' + meseOpts(s.mese || 0) + '</select>' +
      '</div>').join('');
    const climi = Object.entries(CLIMI).map(([k, c]) => '<option value="' + k + '"' + (k === o.clima ? ' selected' : '') + '>' + c.nome + '</option>').join('');
    const interr = (id, on, testo) => '<label style="display:flex;gap:8px;align-items:center;min-height:36px;font-size:0.85rem;"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '> ' + testo + '</label>';
    return '<div class="card" style="padding:16px;margin-bottom:16px;">' +
      '<div style="font-size:0.68rem;font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:4px;">Lune, stagioni e meteo</div>' +
      '<p class="text-muted" style="font-size:0.8rem;margin:0 0 10px;">Si calcolano dalla data: avanzando i giorni cambiano da soli. Il meteo è sempre lo stesso per la stessa data, e cambia in modo graduale.</p>' +
      interr('cielo-on-lune', o.mostraLune, 'Mostra le fasi lunari') +
      interr('cielo-on-stagioni', o.mostraStagioni, 'Mostra le stagioni') +
      interr('cielo-on-meteo', o.meteo, 'Mostra il meteo di ogni giorno') +
      '<div style="margin:12px 0 6px;font-size:0.72rem;font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);">Lune</div>' +
      '<div id="cielo-lune">' + lune + '</div>' +
      '<button type="button" class="btn btn-ghost btn-sm" onclick="CalendarioCielo.aggiungiLuna()" style="margin:2px 0 12px;">+ Aggiungi una luna</button>' +
      '<div style="margin:4px 0 6px;font-size:0.72rem;font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);">Stagioni</div>' +
      '<div id="cielo-stagioni">' + stagioni + '</div>' +
      '<div style="margin:12px 0 0;"><label class="form-label" for="cielo-clima" style="font-size:0.68rem;">Clima della zona di gioco</label><select id="cielo-clima" class="form-select" style="width:auto;">' + climi + '</select></div>' +
      '<div style="border-top:1px solid var(--border);padding-top:12px;margin-top:14px;display:flex;justify-content:flex-end;">' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="CalendarioCielo.salva()">Salva</button>' +
      '</div>' +
    '</div>';
  };

  const _leggiForm = (cal) => {
    const lune = [...document.querySelectorAll('.cielo-luna-riga')].map((r) => ({
      nome: r.querySelector('.cielo-l-nome').value.trim() || 'Luna',
      ciclo: Math.max(2, parseFloat(r.querySelector('.cielo-l-ciclo').value) || 29.5),
      sfasamento: parseInt(r.querySelector('.cielo-l-sfas').value, 10) || 0,
    }));
    const stagioni = [...document.querySelectorAll('.cielo-stag-riga')].map((r) => ({
      nome: r.querySelector('.cielo-s-nome').value.trim() || 'Stagione',
      giorno: Math.max(1, parseInt(r.querySelector('.cielo-s-giorno').value, 10) || 1),
      mese: parseInt(r.querySelector('.cielo-s-mese').value, 10) || 0,
    }));
    return {
      ...cal, lune, stagioni,
      mostraLune: document.getElementById('cielo-on-lune').checked,
      mostraStagioni: document.getElementById('cielo-on-stagioni').checked,
      meteo: document.getElementById('cielo-on-meteo').checked,
      clima: document.getElementById('cielo-clima').value,
    };
  };
  const _ridisegna = () => { try { CalendarioConfig.render(); } catch (e) {} };
  const salva = () => {
    const cal = Calendario.get();
    if (!cal) return;
    Calendario.save(_leggiForm(cal));
    Toast.show('Lune, stagioni e meteo salvati.', 'success', 2500);
    _ridisegna();
  };
  const aggiungiLuna = () => {
    const cal = Calendario.get(); if (!cal) return;
    const c = _leggiForm(cal); c.lune = c.lune.concat([{ nome: 'Seconda luna', ciclo: 41, sfasamento: 0 }]);
    Calendario.save(c); _ridisegna();
  };
  const togliLuna = (i) => {
    const cal = Calendario.get(); if (!cal) return;
    const c = _leggiForm(cal); c.lune = c.lune.filter((_, k) => k !== i);
    Calendario.save(c); _ridisegna();
  };

  return { impost, fase, stagione, meteo, iconaLuna, iconaMeteo, cella, etichettaMese, dettaglio, oggi, cardHTML, salva, aggiungiLuna, togliLuna, CLIMI };
})();

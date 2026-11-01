/* ============================================================
   MOSTRI-MODIFICABILI.JS — Varianti dei mostri del Compendio:
   cambio del Grado di Sfida (come su 5e.tools), nuovo nome e tipo
   di danno, per riciclare un mostro senza riscriverlo.

   Il cambio di GS segue la tabella "Statistiche dei mostri per GS"
   della Guida del DM: per ogni GS ci sono CA, PF, bonus per colpire,
   danni per round e CD attesi. Ogni valore del mostro si sposta
   della stessa differenza tra il GS di partenza e quello scelto
   (CA, attacco, CD, competenza) o nella stessa proporzione (PF e
   danni, ricalcolando il numero di dadi). Le azioni sono testo: si
   aggiornano le parti riconoscibili ("+4 al tiro per colpire",
   "5 (1d6 + 2) danni", "CD 13").
   Compendio.openMonster(id, varianti) usa MostriMod.applica() e
   mostra MostriMod.barra() in cima alla scheda.
   ============================================================ */

const MostriMod = (() => {
  // GS: [competenza, CA, PF min, PF max, attacco, danni min, danni max, CD, PE]
  const TABELLA = {
    0: [2, 13, 1, 6, 3, 0, 1, 13, 10], 0.125: [2, 13, 7, 35, 3, 2, 3, 13, 25], 0.25: [2, 13, 36, 49, 3, 4, 5, 13, 50], 0.5: [2, 13, 50, 70, 3, 6, 8, 13, 100],
    1: [2, 13, 71, 85, 3, 9, 14, 13, 200], 2: [2, 13, 86, 100, 3, 15, 20, 13, 450], 3: [2, 13, 101, 115, 4, 21, 26, 13, 700], 4: [2, 14, 116, 130, 5, 27, 32, 14, 1100],
    5: [3, 15, 131, 145, 6, 33, 38, 15, 1800], 6: [3, 15, 146, 160, 6, 39, 44, 15, 2300], 7: [3, 15, 161, 175, 6, 45, 50, 15, 2900], 8: [3, 16, 176, 190, 7, 51, 56, 16, 3900],
    9: [4, 16, 191, 205, 7, 57, 62, 16, 5000], 10: [4, 17, 206, 220, 7, 63, 68, 16, 5900], 11: [4, 17, 221, 235, 8, 69, 74, 17, 7200], 12: [4, 17, 236, 250, 8, 75, 80, 17, 8400],
    13: [5, 18, 251, 265, 8, 81, 86, 18, 10000], 14: [5, 18, 266, 280, 8, 87, 92, 18, 11500], 15: [5, 18, 281, 295, 8, 93, 98, 18, 13000], 16: [5, 18, 296, 310, 9, 99, 104, 18, 15000],
    17: [6, 19, 311, 325, 10, 105, 110, 19, 18000], 18: [6, 19, 326, 340, 10, 111, 116, 19, 20000], 19: [6, 19, 341, 355, 10, 117, 122, 19, 22000], 20: [6, 19, 356, 400, 10, 123, 140, 19, 25000],
    21: [7, 19, 401, 445, 11, 141, 158, 20, 33000], 22: [7, 19, 446, 490, 11, 159, 176, 20, 41000], 23: [7, 19, 491, 535, 11, 177, 194, 20, 50000], 24: [7, 19, 536, 580, 12, 195, 212, 21, 62000],
    25: [8, 19, 581, 625, 12, 213, 230, 21, 75000], 26: [8, 19, 626, 670, 12, 231, 248, 21, 90000], 27: [8, 19, 671, 715, 13, 249, 266, 22, 105000], 28: [8, 19, 716, 760, 13, 267, 284, 22, 120000],
    29: [9, 19, 761, 805, 13, 285, 302, 22, 135000], 30: [9, 19, 806, 850, 14, 303, 320, 23, 155000],
  };
  const GS_LISTA = Object.keys(TABELLA).map(Number).sort((a, b) => a - b);
  const etichettaGS = (v) => v === 0.125 ? '1/8' : v === 0.25 ? '1/4' : v === 0.5 ? '1/2' : String(v);
  const _vicino = (v) => GS_LISTA.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a, GS_LISTA[0]);
  const _riga = (gs) => TABELLA[_vicino(gs)];
  const _midPF = (gs) => { const r = _riga(gs); return (r[2] + r[3]) / 2; };
  const _midDanni = (gs) => { const r = _riga(gs); return Math.max(0.5, (r[5] + r[6]) / 2); };

  const TIPI_DANNO = ['taglienti', 'perforanti', 'contundenti', 'da fuoco', 'da freddo', 'da fulmine', 'da tuono', 'da acido', 'da veleno', 'necrotici', 'radiosi', 'psichici', 'da forza'];
  const _RE_DANNO = /danni (taglienti|perforanti|contundenti|da fuoco|da freddo|da fulmine|da tuono|da acido|da veleno|necrotici|radiosi|psichici|da forza)/g;

  const _escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Riscrive "N (XdY + Z)" con un nuovo numero di dadi, mantenendo dado e modificatore
  const _scalaDadi = (avg, nDadi, facce, mod, ratio) => {
    const obiettivo = Math.max(1, avg * ratio);
    const n = Math.max(1, Math.round((obiettivo - mod) / ((facce + 1) / 2)));
    const media = Math.max(1, Math.floor(n * (facce + 1) / 2 + mod));
    return { n, media };
  };

  const _testo = (t, s) => {
    if (!t) return t;
    let out = String(t);
    if (s.attacco) {
      out = out.replace(/\+(\d+)( al tiro per colpire)/g, (_, n, r) => '+' + (Number(n) + s.attacco) + r);
      out = out.replace(/(Tiro per colpire[^:]*:\*?\s*)\+(\d+)/g, (_, p, n) => p + '+' + (Number(n) + s.attacco));
    }
    if (s.cd) out = out.replace(/CD (\d+)/g, (_, n) => 'CD ' + (Number(n) + s.cd));
    if (s.danni !== 1) {
      out = out.replace(/(\d+) \((\d+)d(\d+)(?:\s*([+\-−])\s*(\d+))?\)/g, (orig, avg, n, f, segno, m) => {
        const mod = m ? (segno === '+' ? 1 : -1) * Number(m) : 0;
        const r = _scalaDadi(Number(avg), Number(n), Number(f), mod, s.danni);
        return r.media + ' (' + r.n + 'd' + f + (m ? ' ' + (mod >= 0 ? '+' : '−') + ' ' + Math.abs(mod) : '') + ')';
      });
    }
    if (s.tipoDanno) out = out.replace(_RE_DANNO, 'danni ' + s.tipoDanno);
    if (s.nome && s.vecchioNome) {
      out = out.replace(new RegExp('\\b' + _escRe(s.vecchioNome) + '\\b', 'g'), s.nome)
               .replace(new RegExp('\\b' + _escRe(s.vecchioNome.toLowerCase()) + '\\b', 'g'), s.nome.toLowerCase());
    }
    return out;
  };

  // varianti: { gs, nome, tipoDanno }
  const applica = (base, varianti = {}) => {
    const m = JSON.parse(JSON.stringify(base));
    const gsDa = Number(base.grado_sfida?.valore ?? 0);
    const gsA = varianti.gs != null && varianti.gs !== '' ? Number(varianti.gs) : gsDa;
    const da = _riga(gsDa), a = _riga(gsA);
    const s = {
      attacco: gsA !== gsDa ? a[4] - da[4] : 0,
      cd: gsA !== gsDa ? a[7] - da[7] : 0,
      danni: gsA !== gsDa ? _midDanni(gsA) / _midDanni(gsDa) : 1,
      tipoDanno: varianti.tipoDanno || '',
      nome: (varianti.nome || '').trim(),
      vecchioNome: base.nome,
    };

    if (gsA !== gsDa) {
      const prof = a[0] - da[0];
      m.classe_armatura = Math.max(5, Number(base.classe_armatura || 10) + (a[1] - da[1]));
      // PF: stessa proporzione dei valori di tabella, ricalcolando il numero di dadi
      const pf = base.punti_ferita || {};
      const fm = String(pf.formula || '').match(/(\d+)d(\d+)(?:\s*([+\-−])\s*(\d+))?/);
      const obiettivo = Math.max(1, Math.round((pf.media || 1) * _midPF(gsA) / _midPF(gsDa)));
      if (fm) {
        const n0 = Number(fm[1]), f = Number(fm[2]);
        const bonusTot = fm[4] ? (fm[3] === '+' ? 1 : -1) * Number(fm[4]) : 0;
        const perDado = bonusTot / n0;
        const n = Math.max(1, Math.round(obiettivo / ((f + 1) / 2 + perDado)));
        const bonus = Math.round(perDado * n);
        m.punti_ferita = { media: Math.max(1, Math.floor(n * (f + 1) / 2 + bonus)), formula: n + 'd' + f + (bonus ? ' ' + (bonus > 0 ? '+' : '−') + ' ' + Math.abs(bonus) : '') };
      } else {
        m.punti_ferita = { media: obiettivo, formula: '' };
      }
      m.bonus_competenza = a[0];
      Object.values(m.caratteristiche || {}).forEach(c => { if (c.tiro_salvezza !== c.modificatore) c.tiro_salvezza += prof; });
      Object.keys(m.abilita || {}).forEach(k => { m.abilita[k] += prof; });
      if (m.abilita?.percezione != null && m.sensi) m.sensi.percezione_passiva = 10 + m.abilita.percezione;
      m.grado_sfida = { ...(base.grado_sfida || {}), valore: gsA, punti_esperienza: a[8], raw: etichettaGS(gsA) + ' (' + a[8].toLocaleString('it-IT') + ' PE)' };
    }

    ['tratti', 'azioni', 'azioni_bonus', 'reazioni'].forEach(k => {
      if (Array.isArray(m[k])) m[k] = m[k].map(x => ({ ...x, nome: s.nome ? _testo(x.nome, { ...s, attacco: 0, cd: 0, danni: 1, tipoDanno: '' }) : x.nome, descrizione: _testo(x.descrizione, s) }));
    });
    if (m.azioni_leggendarie?.azioni) m.azioni_leggendarie.azioni = m.azioni_leggendarie.azioni.map(x => ({ ...x, descrizione: _testo(x.descrizione, s) }));
    if (m.azioni_leggendarie?.descrizione_utilizzi) m.azioni_leggendarie.descrizione_utilizzi = _testo(m.azioni_leggendarie.descrizione_utilizzi, { ...s, attacco: 0, cd: 0, danni: 1, tipoDanno: '' });
    if (s.nome) m.nome = s.nome;
    m._variante = gsA !== gsDa || s.nome || s.tipoDanno ? { daGS: gsDa, aGS: gsA } : null;
    return m;
  };

  // Barra in cima alla scheda del mostro
  const barra = (base, varianti = {}) => {
    const gsDa = Number(base.grado_sfida?.valore ?? 0);
    const gsSel = varianti.gs != null && varianti.gs !== '' ? Number(varianti.gs) : gsDa;
    const id = String(base.id).replace(/'/g, "\\'");
    const esc = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const modificato = gsSel !== gsDa || varianti.nome || varianti.tipoDanno;
    return '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;padding:10px 12px;margin-bottom:10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-secondary);">' +
      '<label style="display:flex;flex-direction:column;gap:3px;font-size:0.74rem;color:var(--text-muted);">Grado di sfida' +
        '<select class="form-select" style="width:auto;font-size:0.85rem;" onchange="MostriMod._cambia(\'' + id + '\',\'gs\',this.value)">' +
          GS_LISTA.map(v => '<option value="' + v + '"' + (v === gsSel ? ' selected' : '') + '>GS ' + etichettaGS(v) + (v === gsDa ? ' (originale)' : '') + '</option>').join('') +
        '</select></label>' +
      '<label style="display:flex;flex-direction:column;gap:3px;font-size:0.74rem;color:var(--text-muted);flex:1;min-width:140px;">Nuovo nome' +
        '<input type="text" class="form-input" autocomplete="off" style="font-size:0.85rem;" placeholder="' + esc(base.nome) + '" value="' + esc(varianti.nome || '') + '" onchange="MostriMod._cambia(\'' + id + '\',\'nome\',this.value)"></label>' +
      '<label style="display:flex;flex-direction:column;gap:3px;font-size:0.74rem;color:var(--text-muted);">Tipo di danno' +
        '<select class="form-select" style="width:auto;font-size:0.85rem;" onchange="MostriMod._cambia(\'' + id + '\',\'tipoDanno\',this.value)">' +
          '<option value="">Originale</option>' + TIPI_DANNO.map(t => '<option value="' + t + '"' + (varianti.tipoDanno === t ? ' selected' : '') + '>' + t.replace(/^da /, '') + '</option>').join('') +
        '</select></label>' +
      (modificato ? '<button type="button" class="btn btn-ghost btn-sm" onclick="MostriMod._ripristina(\'' + id + '\')">Ripristina</button>' : '') +
      (modificato ? '<div style="flex-basis:100%;font-size:0.76rem;color:var(--accent-secondary-text);">Variante: i valori sono ricalcolati con la tabella della Guida del DM. Controlla le capacità speciali, che non vengono adattate.</div>' : '') +
    '</div>';
  };

  const _stato = {};
  const _cambia = (id, k, v) => { _stato[id] = { ...(_stato[id] || {}), [k]: v }; Compendio.openMonster(id, _stato[id]); };
  const _ripristina = (id) => { delete _stato[id]; Compendio.openMonster(id); };

  return { applica, barra, etichettaGS, GS_LISTA, _cambia, _ripristina };
})();

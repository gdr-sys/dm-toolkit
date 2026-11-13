/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   REPUTAZIONE.JS — Reputazione del party presso ogni fazione:
   una scala da -3 a +3 con la cronologia di cosa l'ha fatta
   cambiare (e quando, anche in data in-world). Tiene allineato il
   campo "Attitudine verso party" della fazione.

   Dati in faction.reputazione = { punti, storia: [{ts, data, delta, motivo}] }.
   La scheda Fazione della Wiki chiama Reputazione.blocco(id).
   ============================================================ */

const Reputazione = (() => {
  const LIVELLI = { '-3': 'Nemica giurata', '-2': 'Ostile', '-1': 'Sospettosa', '0': 'Neutrale', '1': 'Amichevole', '2': 'Alleata', '3': 'Devota' };
  // Il campo Attitudine della fazione ha valori propri: corrispondenza in entrambe le direzioni
  const DA_ATTITUDINE = { Alleata: 2, Amichevole: 1, Neutrale: 0, Sospettosa: -1, Ostile: -2, Sconosciuta: 0 };
  const A_ATTITUDINE = { '-3': 'Ostile', '-2': 'Ostile', '-1': 'Sospettosa', '0': 'Neutrale', '1': 'Amichevole', '2': 'Alleata', '3': 'Alleata' };
  const COLORI = { '-3': '#c0392b', '-2': '#e05d4f', '-1': '#e0a04f', '0': 'var(--text-muted)', '1': '#7fbf6a', '2': '#4caf7a', '3': '#2e9e6a' };

  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _fazione = (id) => (App.getActiveCampaign()?.factions || []).find(f => f.id === id);
  const _punti = (f) => f.reputazione?.punti ?? DA_ATTITUDINE[f.attitudine] ?? 0;

  const _dataInWorld = () => {
    try {
      const cal = Calendario.get();
      if (cal && cal.mesi?.length) return Calendario.formatDate(cal, { anno: cal.anno, mese: cal.mese, giorno: cal.giorno });
    } catch (e) {}
    return '';
  };

  const blocco = (id) => {
    const f = _fazione(id);
    if (!f) return '';
    const p = _punti(f);
    const storia = (f.reputazione?.storia || []).slice(-5).reverse();
    const segmenti = [-3, -2, -1, 0, 1, 2, 3].map(v =>
      '<div title="' + LIVELLI[v] + '" style="flex:1;height:10px;border-radius:2px;background:' + (v === p ? COLORI[v] : 'var(--bg-tertiary)') + ';' + (v === 0 ? 'outline:1px solid var(--border-strong);' : '') + '"></div>').join('');
    return '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:16px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px;">' +
        '<div><div style="font-family:var(--font-display);font-size:0.85rem;color:var(--text-secondary);">Reputazione del party</div>' +
          '<div style="font-size:1rem;font-weight:600;color:color-mix(in srgb, ' + COLORI[p] + ' 50%, var(--text-primary));">' + LIVELLI[p] + ' <span style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-muted);">(' + (p > 0 ? '+' : '') + p + ')</span></div></div>' +
        '<div style="display:flex;gap:6px;">' +
          '<button type="button" class="btn btn-ghost btn-sm"' + (p <= -3 ? ' disabled' : '') + ' onclick="Reputazione.cambia(\'' + id + '\',-1)">Peggiora</button>' +
          '<button type="button" class="btn btn-secondary btn-sm"' + (p >= 3 ? ' disabled' : '') + ' onclick="Reputazione.cambia(\'' + id + '\',1)">Migliora</button>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:3px;">' + segmenti + '</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--text-muted);margin-top:3px;"><span>Nemica giurata</span><span>Neutrale</span><span>Devota</span></div>' +
      (storia.length
        ? '<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:6px;">' + storia.map(s =>
            '<div style="display:flex;gap:8px;font-size:0.8rem;padding:3px 0;">' +
              '<span style="font-family:var(--font-mono);font-weight:700;color:' + (s.delta > 0 ? COLORI[2] : COLORI[-2]) + ';min-width:22px;">' + (s.delta > 0 ? '+' : '') + s.delta + '</span>' +
              '<span style="flex:1;color:var(--text-primary);">' + _esc(s.motivo || '—') + '</span>' +
              '<span style="color:var(--text-muted);white-space:nowrap;">' + _esc(s.data || new Date(s.ts).toLocaleDateString('it-IT')) + '</span>' +
            '</div>').join('') + '</div>'
        : '<div style="font-size:0.78rem;color:var(--text-muted);margin-top:8px;">Usa Migliora e Peggiora quando il party aiuta o ostacola la fazione: resta traccia di cosa è successo.</div>') +
    '</div>';
  };

  const cambia = (id, delta) => {
    const f = _fazione(id);
    if (!f) return;
    const p = Math.max(-3, Math.min(3, _punti(f) + delta));
    openInputModal(delta > 0 ? 'Cosa ha fatto il party per migliorare la reputazione?' : 'Cosa ha fatto il party per peggiorare la reputazione?', '', (motivo) => {
      const camp = App.getActiveCampaign();
      const factions = (camp.factions || []).map(x => x.id !== id ? x : {
        ...x,
        attitudine: A_ATTITUDINE[p],
        reputazione: { punti: p, storia: [...(x.reputazione?.storia || []), { ts: Date.now(), data: _dataInWorld(), delta, motivo: String(motivo || '').trim() }] },
        aggiornatoAt: Date.now(),
      });
      App.saveActiveCampaign({ factions });
      try { WikiSections.openCard('fazioni', id); } catch (e) {}
      Toast.show(f.nome + ': ' + LIVELLI[p], 'info', 2000);
    });
  };

  return { blocco, cambia, LIVELLI };
})();

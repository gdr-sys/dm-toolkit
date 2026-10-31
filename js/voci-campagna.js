/* ============================================================
   VOCI-CAMPAGNA.JS — Voci di corridoio costruite con i dati veri
   della campagna (PNG, luoghi, fazioni, quest), senza IA: modelli
   di frase riempiti con le schede esistenti. Ogni voce porta con sé
   le schede citate, da aprire con un clic. Se sia vera o falsa lo
   decide il master: l'app non puo' saperlo.

   Usata da "Entra in scena" (js/entra-in-scena.js) e aggiunta in
   coda al generatore "Voci di Corridoio" della pagina Generatori.
   ============================================================ */

const VociCampagna = (() => {
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _nome = (x) => (x?.nome || x?.name || x?.titolo || '').trim();

  const _pool = (camp) => ({
    png: (camp.npcs || []).filter(n => _nome(n) && n.stato !== 'Morto'),
    luoghi: (camp.locations || []).filter(l => _nome(l)),
    fazioni: (camp.factions || []).filter(f => _nome(f)),
    quest: (camp.quests || []).filter(q => _nome(q) && !['Completata', 'Fallita'].includes(q.stato)),
  });

  // Ogni modello dichiara di quali schede ha bisogno; {png}, {png2}, {luogo}, {fazione}, {quest}
  const MODELLI = [
    { serve: ['png', 'fazione'], t: 'Dicono che {png} sia stato visto parlare di nascosto con qualcuno di {fazione}, di notte.' },
    { serve: ['png', 'luogo'], t: 'Pare che {png} vada spesso a {luogo}, e che torni sempre prima dell\'alba.' },
    { serve: ['png', 'png2'], t: 'Si mormora che {png} e {png2} si conoscano da molto prima di quanto ammettano.' },
    { serve: ['png'], t: 'Qualcuno giura che {png} nasconda un debito con gente pericolosa.' },
    { serve: ['png'], t: 'Si dice che {png} stia cercando qualcuno disposto a fare un lavoro senza fare domande.' },
    { serve: ['luogo'], t: 'A {luogo} si sentono rumori strani da qualche notte, e nessuno vuole andare a vedere.' },
    { serve: ['luogo', 'fazione'], t: 'Pare che {fazione} voglia mettere le mani su {luogo}, a qualunque costo.' },
    { serve: ['fazione'], t: 'Gira voce che dentro {fazione} ci sia qualcuno che fa il doppio gioco.' },
    { serve: ['fazione', 'png'], t: 'Si dice che {fazione} abbia messo una taglia su {png}.' },
    { serve: ['quest', 'png'], t: 'C\'è chi dice che {png} sappia più di quanto racconta su «{quest}».' },
    { serve: ['quest', 'luogo'], t: 'La chiave di «{quest}» sarebbe nascosta da qualche parte a {luogo}.' },
    { serve: ['luogo'], t: 'Un mercante di passaggio racconta che la strada per {luogo} non è più sicura.' },
  ];

  // contesto: { luogoId } per preferire schede legate a un luogo (usato da "Entra in scena")
  const genera = (camp, contesto = {}) => {
    if (!camp) return null;
    const p = _pool(camp);
    const disponibili = MODELLI.filter(m => m.serve.every(s =>
      s === 'png2' ? p.png.length >= 2 : s === 'fazione' ? p.fazioni.length : s === 'luogo' ? p.luoghi.length : (p[s] || []).length));
    if (!disponibili.length) return null;
    const m = rnd(disponibili);
    const scelti = {};
    const luogoCtx = contesto.luogoId ? p.luoghi.find(l => l.id === contesto.luogoId) : null;
    if (m.serve.includes('png')) {
      const vicini = luogoCtx ? p.png.filter(n => String(n.sede || n.location || '').toLowerCase().includes(_nome(luogoCtx).toLowerCase())) : [];
      scelti.png = rnd(vicini.length ? vicini : p.png);
    }
    if (m.serve.includes('png2')) scelti.png2 = rnd(p.png.filter(n => n !== scelti.png));
    if (m.serve.includes('luogo')) scelti.luogo = rnd(p.luoghi.filter(l => l !== luogoCtx).length ? p.luoghi.filter(l => l !== luogoCtx) : p.luoghi);
    if (m.serve.includes('fazione')) scelti.fazione = rnd(p.fazioni);
    if (m.serve.includes('quest')) scelti.quest = rnd(p.quest);
    const tipoDi = { png: 'png', png2: 'png', luogo: 'luoghi', fazione: 'fazioni', quest: 'quest' };
    const entita = Object.entries(scelti).map(([k, v]) => ({ tipo: tipoDi[k], id: v.id, nome: _nome(v) }));
    const testo = m.t.replace(/\{(\w+)\}/g, (_, k) => _nome(scelti[k]));
    return { testo, entita };
  };

  const chipHTML = (entita) => entita.map(e =>
    '<button type="button" class="btn btn-ghost btn-sm" style="font-size:0.72rem;padding:1px 8px;border:1px solid var(--border);border-radius:var(--radius-full);" ' +
    'onclick="VociCampagna.apri(\'' + e.tipo + '\',\'' + e.id + '\')">' + _esc(e.nome) + '</button>').join(' ');

  const apri = (tipo, id) => {
    try { Modal.closeAll?.(); } catch (e) {}
    App.navigateTo('wiki');
    setTimeout(() => { try { WikiSections.goto(tipo); WikiSections.openCard(tipo, id); } catch (e) {} }, 200);
  };

  // Aggiunge al generatore "Voci di Corridoio" due voci prese dalla campagna, con le schede citate
  const _agganciaGeneratore = () => {
    if (typeof Generatori === 'undefined' || Generatori._vociCampagnaHooked) return;
    const orig = Generatori.rollRumors;
    Generatori.rollRumors = async function () {
      await orig.apply(Generatori, arguments);
      const camp = App.getActiveCampaign();
      const el = document.getElementById('gen-rumors-result');
      if (!el || !camp) return;
      const voci = [genera(camp), genera(camp)].filter(Boolean).filter((v, i, a) => a.findIndex(x => x.testo === v.testo) === i);
      if (!voci.length) return;
      el.insertAdjacentHTML('beforeend',
        '<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);">' +
          '<div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:6px;">Dalla tua campagna — vera o falsa, decidi tu</div>' +
          voci.map(v => '<div style="margin-bottom:8px;"><div class="text-sm" style="line-height:1.5;">' + _esc(v.testo) + '</div><div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:4px;">' + chipHTML(v.entita) + '</div></div>').join('') +
        '</div>');
    };
    Generatori._vociCampagnaHooked = true;
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(_agganciaGeneratore, 250));

  return { genera, chipHTML, apri };
})();

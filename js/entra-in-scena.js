/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   ENTRA-IN-SCENA.JS — Pulsante "Entra in scena" sulla scheda di un
   Luogo: compone al volo la scena usando cio' che c'e' gia' nella
   campagna — PNG che stanno li', quest in gioco, meteo coerente con
   la stagione del calendario, rumori e odori adatti al tipo di
   luogo, una voce di corridoio con schede vere, un evento in corso
   e un tiro su ogni tabella casuale collegata al luogo.
   La scena si puo' rigenerare, copiare o aggiungere alle note della
   sessione. La scheda Luogo chiama EntraInScena.pulsante(id).
   ============================================================ */

const EntraInScena = (() => {
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _nome = (x) => (x?.nome || x?.name || x?.titolo || '').trim();
  let _luogoId = null;
  let _testo = '';

  const SENSI = {
    citta:     ['il vociare del mercato e il rumore dei carri sul selciato', 'odore di pane, fumo di camino e fogna', 'campane lontane che segnano l\'ora', 'una lite tra due mercanti per il prezzo di una stoffa'],
    villaggio: ['galline che razzolano e un cane che abbaia', 'odore di fieno e di legna bruciata', 'il martello del fabbro, regolare', 'bambini che si rincorrono tra le case'],
    taverna:   ['risate, boccali che sbattono, un liuto stonato', 'odore di birra versata e stufato', 'il fuoco del camino che scoppietta', 'qualcuno che canta fuori tempo in un angolo'],
    dungeon:   ['gocce d\'acqua che cadono nel buio', 'aria stantia, odore di muffa e pietra bagnata', 'un rumore lontano di pietra che si sposta', 'un silenzio troppo profondo'],
    natura:    ['il fruscio delle foglie e il richiamo di un uccello', 'odore di terra umida e resina', 'il vento che piega l\'erba alta', 'un ramo che si spezza, poco lontano'],
    sacro:     ['un canto sommesso che viene da dentro', 'odore di incenso e cera', 'passi che rimbombano sotto le volte', 'il tintinnio di una campanella'],
  };
  const TIPO_SENSI = { 'Città': 'citta', 'Porto': 'citta', 'Castello': 'citta', 'Villaggio': 'villaggio', 'Paese': 'villaggio', 'Taverna': 'taverna', 'Dungeon': 'dungeon', 'Torre': 'dungeon', 'Tempio': 'sacro', 'Foresta': 'natura', 'Regione': 'natura' };
  const METEO = [
    ['un freddo pungente e cielo grigio', 'neve leggera che non attacca', 'un vento gelido che taglia la faccia', 'una giornata limpida e gelata'],
    ['una pioggia sottile che va e viene', 'cielo che si apre a tratti, aria fresca', 'un acquazzone improvviso', 'sole tiepido e fango ovunque'],
    ['caldo afoso, nessun filo di vento', 'un temporale estivo all\'orizzonte', 'sole a picco e polvere', 'una sera calda e piena di insetti'],
    ['nebbia al mattino che si dirada tardi', 'foglie che cadono e vento a raffiche', 'pioggia fredda e insistente', 'una giornata dorata e malinconica'],
  ];
  const EVENTI = ['qualcuno sta litigando a voce alta', 'arriva un messaggero di fretta', 'una guardia controlla i documenti di tutti', 'un bambino cerca i genitori tra la gente', 'un venditore ambulante insiste per vendere un amuleto', 'qualcuno osserva il party da troppo tempo', 'si sta preparando una festa', 'una carrozza si è rotta e blocca il passaggio', 'un animale è scappato e tutti lo inseguono', 'tutto è tranquillo, forse troppo'];

  const _stagione = () => {
    try {
      const c = Calendario.get();
      if (c && c.mesi?.length) return Math.min(3, Math.floor(((c.mese || 1) - 1) / (c.mesi.length / 4)));
    } catch (e) {}
    return Math.floor(new Date().getMonth() / 3);
  };
  const _NOMI_STAGIONI = ['inverno', 'primavera', 'estate', 'autunno'];

  const pulsante = (luogoId) =>
    '<button type="button" class="btn btn-primary btn-sm" style="margin-bottom:16px;display:inline-flex;align-items:center;gap:6px;" onclick="EntraInScena.apri(\'' + luogoId + '\')">' +
      '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
      'Entra in scena</button>';

  const _componi = () => {
    const camp = App.getActiveCampaign();
    const luogo = (camp?.locations || []).find(l => l.id === _luogoId);
    if (!luogo) return null;
    const nomeL = _nome(luogo).toLowerCase();
    const cita = (v) => String(v || '').toLowerCase().includes(nomeL);
    // PNG del luogo: chi ce l'ha come sede, o chi e' citato tra i PNG notabili del luogo
    const abitanti = String(luogo.abitanti || luogo.npcs || '').toLowerCase();
    const png = (camp.npcs || []).filter(n => _nome(n) && n.stato !== 'Morto' && (cita(n.sede) || cita(n.location) || abitanti.includes(_nome(n).toLowerCase())));
    const quest = (camp.quests || []).filter(q => !['Completata', 'Fallita'].includes(q.stato) && (cita(q.luoghi) || cita(q.obiettivo)));
    const stag = _stagione();
    const sensi = SENSI[TIPO_SENSI[luogo.tipo] || 'natura'];
    const voce = typeof VociCampagna !== 'undefined' ? VociCampagna.genera(camp, { luogoId: luogo.id }) : null;
    const tabelle = typeof TabelleCasuali !== 'undefined' ? (camp.tabelleCasuali || []).filter(t => (t.luoghi || []).includes(luogo.id)) : [];
    const tiri = tabelle.map(t => ({ nome: t.nome, testo: TabelleCasuali.tiraTesto(t.id) })).filter(t => t.testo);
    return { luogo, png, quest, meteo: rnd(METEO[stag]), stagione: _NOMI_STAGIONI[stag], sensi: rnd(sensi), evento: rnd(EVENTI), voce, tiri };
  };

  const _riga = (et, html) => '<div style="margin-top:10px;"><div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);">' + et + '</div><div style="font-size:0.92rem;line-height:1.55;margin-top:2px;">' + html + '</div></div>';

  const _disegna = () => {
    const s = _componi();
    const el = document.getElementById('eis-body');
    if (!s || !el) return;
    const chip = (tipo, x) => typeof VociCampagna !== 'undefined' ? VociCampagna.chipHTML([{ tipo, id: x.id, nome: _nome(x) }]) : _esc(_nome(x));
    el.innerHTML =
      (s.luogo.atmosfera ? '<div style="font-size:0.9rem;color:var(--text-secondary);line-height:1.6;font-style:italic;">' + _esc(s.luogo.atmosfera) + '</div>' : '') +
      _riga('Tempo (' + s.stagione + ')', _esc(s.meteo)) +
      _riga('Si sente', _esc(s.sensi)) +
      _riga('Sta succedendo', _esc(s.evento.charAt(0).toUpperCase() + s.evento.slice(1))) +
      _riga('Chi c\'è', s.png.length ? '<div style="display:flex;flex-wrap:wrap;gap:4px;">' + s.png.map(n => chip('png', n)).join('') + '</div>' : '<span style="color:var(--text-muted);">Nessun PNG collegato a questo luogo (scrivilo nel campo "Luogo / sede" del PNG).</span>') +
      (s.quest.length ? _riga('Quest in gioco qui', '<div style="display:flex;flex-wrap:wrap;gap:4px;">' + s.quest.map(q => chip('quest', q)).join('') + '</div>') : '') +
      (s.voce ? _riga('Voce che gira', _esc(s.voce.testo) + '<div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:4px;">' + VociCampagna.chipHTML(s.voce.entita) + '</div>') : '') +
      s.tiri.map(t => _riga(_esc(t.nome), _esc(t.testo))).join('') +
      (!s.tiri.length ? _riga('Tabelle casuali', '<span style="color:var(--text-muted);">Collega una tua tabella a questo luogo (Generatori → Le mie tabelle) per tirarla qui.</span>') : '');
    _testo = ['Scena: ' + _nome(s.luogo), s.luogo.atmosfera, 'Tempo: ' + s.meteo, 'Si sente: ' + s.sensi, 'Sta succedendo: ' + s.evento,
      s.png.length ? 'Chi c\'è: ' + s.png.map(_nome).join(', ') : '', s.quest.length ? 'Quest: ' + s.quest.map(_nome).join(', ') : '',
      s.voce ? 'Voce: ' + s.voce.testo : '', ...s.tiri.map(t => t.nome + ': ' + t.testo)].filter(Boolean).join('\n');
    const t = document.getElementById('eis-titolo');
    if (t) t.textContent = 'In scena: ' + _nome(s.luogo);
  };

  const _assicuraModale = () => {
    if (document.getElementById('modal-entra-in-scena')) return;
    const o = document.createElement('div');
    o.className = 'modal-overlay hidden';
    o.id = 'modal-entra-in-scena';
    o.style.display = 'none';
    o.innerHTML =
      '<div class="modal" style="max-width:640px;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title" id="eis-titolo">In scena</h3>' +
          '<button type="button" class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'entra-in-scena\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body" id="eis-body"></div>' +
        '<div class="modal-footer" style="flex-wrap:wrap;gap:8px;">' +
          '<button type="button" class="btn btn-ghost" onclick="EntraInScena.copia()">Copia</button>' +
          '<button type="button" class="btn btn-ghost" onclick="EntraInScena.aNote()">Aggiungi alle note della sessione</button>' +
          '<button type="button" class="btn btn-primary" style="margin-left:auto;" onclick="EntraInScena.rigenera()">Rigenera</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(o);
  };

  const apri = (luogoId) => { _luogoId = luogoId; _assicuraModale(); _disegna(); Modal.open('entra-in-scena'); };
  const rigenera = () => _disegna();
  const copia = async () => {
    try { await navigator.clipboard.writeText(_testo); Toast.show('Scena copiata', 'success', 1500); }
    catch (e) { Toast.show('Copia non riuscita', 'warning'); }
  };
  const aNote = () => {
    const camp = App.getActiveCampaign();
    App.saveActiveCampaign({ noteSessione: [...(camp.noteSessione || []), { tipo: '📍', testo: _testo.replace(/\n/g, ' · ') }] });
    try { NoteSessione.render(); } catch (e) {}
    Toast.show('Aggiunta alle note della sessione', 'success', 1800);
  };

  return { pulsante, apri, rigenera, copia, aNote };
})();

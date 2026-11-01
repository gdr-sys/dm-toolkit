/* ============================================================
   CAMPAGNA-HUB.JS — Pagina della campagna (o one shot): si apre
   cliccando il nome della campagna in cima al menu. Come l'indice
   della Wiki, mostra tutto a card con i conteggi: cosa serve al
   tavolo, il mondo (sezioni Wiki) e la preparazione.
   Le icone sono riprese da menu e Wiki, cosi' restano uguali.
   ============================================================ */

const CampagnaHub = (() => {
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);

  const _iconaMenu = (page) => document.querySelector('#sidebar [data-page="' + page + '"] .nav-icon svg')?.outerHTML || '';
  // Icona colorata della card Wiki corrispondente (indice Wiki)
  const _iconaWiki = (chiamata) => {
    const card = [...document.querySelectorAll('#page-wiki-hub .card[onclick]')].find(c => c.getAttribute('onclick').includes(chiamata));
    return card?.querySelector('span')?.outerHTML || '';
  };
  const _numWiki = (tipo, camp) => {
    try { return WikiSections._getCfg(tipo).getData(camp).length; } catch (e) { return null; }
  };

  const _card = (icona, nome, sotto, azione, n) =>
    '<div class="card" role="button" tabindex="0" style="cursor:pointer;padding:16px;" onclick="' + azione + '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();' + azione + '}">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;min-height:22px;">' +
        '<span style="color:var(--accent-primary);display:flex;">' + icona + '</span>' +
        (n != null ? '<span style="font-size:0.72rem;background:var(--bg-tertiary);padding:2px 8px;border-radius:var(--radius-full);color:var(--text-muted);">' + n + '</span>' : '') +
      '</div>' +
      '<div style="font-weight:600;font-size:0.9rem;">' + nome + '</div>' +
      '<div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;line-height:1.4;">' + sotto + '</div>' +
    '</div>';
  const _gruppo = (titolo, carte) =>
    '<div style="margin-top:22px;">' +
      '<div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">' + titolo + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:12px;">' + carte.join('') + '</div>' +
    '</div>';

  const render = () => {
    const el = document.getElementById('campagna-hub-body');
    const camp = _camp();
    if (!el || !camp) return;
    const tipo = camp.type === 'oneshot' ? 'One shot' : 'Campagna';
    const sessioni = _numWiki('sessioni', camp);
    const mappe = (camp.mappe || []).length;
    const playlist = (camp.playlist || []).length;
    const tabelle = (camp.tabelleCasuali || []).length;
    const vg = camp.vistaGiocatori?.attiva;
    const go = (page) => 'App.navigateTo(\'' + page + '\')';
    const wiki = (t) => 'WikiSections.goto(\'' + t + '\')';

    el.innerHTML =
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">' +
        '<div style="min-width:0;flex:1;">' +
          '<div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;">' + tipo + ' · ' + _esc(camp.system || '5e') + (sessioni ? ' · ' + sessioni + (sessioni === 1 ? ' sessione' : ' sessioni') : '') + '</div>' +
          '<h2 style="font-family:var(--font-display);font-size:1.5rem;margin:2px 0 6px;overflow-wrap:anywhere;">' + _esc(camp.name) + '</h2>' +
          (camp.description ? '<p style="font-size:0.9rem;color:var(--text-secondary);line-height:1.6;margin:0;max-width:760px;white-space:pre-line;">' + _esc(camp.description) + '</p>' : '') +
        '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm" onclick="App.editCampaign(\'' + camp.id + '\')">Modifica</button>' +
      '</div>' +
      _gruppo('Al tavolo', [
        _card(_iconaMenu('campagna'), 'Dashboard', 'Ultima sessione, scadenze, clock e quest', go('campagna')),
        _card(_iconaMenu('sessione'), 'Sessione Live', 'Iniziativa, combattimento e note', go('sessione')),
        _card(_iconaMenu('schermo'), 'Schermo DM', 'I tuoi blocchi di riferimento rapido', go('schermo')),
        _card(_iconaMenu('generatori'), 'Generatori', 'Nomi, PNG, loot, incontri al volo', go('generatori')),
        _card(_iconaMenu('compendio'), 'Compendio', 'Mostri, incantesimi, oggetti, regole', go('compendio')),
        _card(_iconaMenu('musica'), 'Musica', 'Playlist e atmosfere', go('musica'), playlist || null),
      ]) +
      _gruppo('Il mondo', [
        _card(_iconaWiki("goto('png')"), 'PNG', 'Personaggi non giocanti', wiki('png'), _numWiki('png', camp)),
        _card(_iconaWiki("goto('luoghi')"), 'Luoghi', 'Città, dungeon, regioni', wiki('luoghi'), _numWiki('luoghi', camp)),
        _card(_iconaWiki("goto('fazioni')"), 'Fazioni', 'Gruppi e organizzazioni', wiki('fazioni'), _numWiki('fazioni', camp)),
        _card(_iconaWiki("goto('lore')"), 'Lore', 'Storia, miti, documenti', wiki('lore'), _numWiki('lore', camp)),
        _card(_iconaWiki("goto('sessioni')"), 'Sessioni', 'Diario delle giocate', wiki('sessioni'), sessioni),
        _card(_iconaWiki("goto('quest')"), 'Quest', 'Missioni in corso e concluse', wiki('quest'), _numWiki('quest', camp)),
        _card(_iconaWiki("goto('pg')"), 'PG', 'I personaggi del party', wiki('pg'), _numWiki('pg', camp)),
        _card(_iconaWiki("goto('incontri')"), 'Incontri', 'Scontri preparati', wiki('incontri'), _numWiki('incontri', camp)),
        _card(_iconaWiki('gotoTrame'), 'Trame', 'Storyline in corso', 'WikiSections.gotoTrame()', (camp.trame || []).length),
      ]) +
      _gruppo('Prepara', [
        _card(_iconaMenu('mappa'), 'Mappe', 'Mappe con i luoghi segnati', go('mappa'), mappe || null),
        _card(_iconaMenu('calendario'), 'Calendario', 'Data del mondo ed eventi', go('calendario')),
        _card(_iconaMenu('generatori'), 'Le mie tabelle', 'Tabelle casuali del tuo mondo', go('generatori') + ';setTimeout(function(){GeneratoriSchede.scegli(\'le mie tabelle\')},250)', tabelle || null),
        typeof VistaGiocatori !== 'undefined' ? _card('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>', 'Vista giocatori', vg ? 'Attiva: cosa vedono i giocatori' : 'Un link con ciò che scegli tu', 'VistaGiocatori.apri()') : '',
        typeof SessioneZero !== 'undefined' ? _card('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', 'Sessione Zero', 'Tono, linee, veli e strumenti', 'SessioneZero.apri()') : '',
      ].filter(Boolean));
  };

  const apri = () => {
    if (!_camp()) { App.navigateTo('home'); return; }
    App.navigateTo('campagna-hub');
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
    if (typeof App === 'undefined') return;
    const nav = App.navigateTo;
    App.navigateTo = function (pageId) { const r = nav.apply(App, arguments); if (pageId === 'campagna-hub') setTimeout(render, 30); return r; };
    // Ricaricando da questa pagina l'app la riapre prima dell'aggancio qui sopra
    if (document.getElementById('page-campagna-hub')?.classList.contains('active')) render();
  }, 300));

  return { apri, render };
})();

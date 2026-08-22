/* ============================================================
   ONBOARDING.JS — Guida rapida per orientarsi nel tool, raggiungibile
   dalla voce "Guida rapida" nella sidebar (markup statico in
   index.html). Modulo autonomo: costruisce il proprio modale a
   runtime, senza toccare il markup statico di index.html a parte il
   tag <script>.
   ============================================================ */

const Onboarding = (() => {
  const SEEN_KEY = 'dmtk_onboarding_seen';

  const SEZIONI = [
    { titolo: 'Le basi', testo: 'Crea una campagna dalla Home, o apri una campagna esistente cliccandola. Tutto si salva da solo mentre lavori; trovi "Backup" e "Ripristina backup" in Home per una copia di sicurezza.' },
    { titolo: 'Wiki', testo: 'Qui vive il mondo: PNG, Luoghi, Fazioni, Quest, Trame, PG, Sessioni, Lore. Scrivi @Nome in un campo per collegare due voci tra loro. Nelle schede di PNG e PG puoi anche registrare i loro "Momenti" salienti, una mini-timeline della loro storia con il party.' },
    { titolo: 'Sessione Live', testo: 'La schermata da usare al tavolo: combat tracker con iniziativa, party, scene planner, clock.' },
    { titolo: 'Calendario', testo: 'Se vuoi tracciare il tempo della storia: data corrente, eventi e scadenze nella vista Mese, tutto sull’asse della Timeline. Va attivato dalle impostazioni della campagna.' },
    { titolo: 'Compendio e Generatori', testo: 'Mostri, regole e incantesimi pronti da consultare; generatori casuali per nomi, incontri, negozi quando serve improvvisare al volo.' },
    { titolo: 'Schermo DM', testo: 'Una dashboard che componi tu, con i blocchi che usi più spesso durante la sessione.' },
    { titolo: 'Scorciatoie utili', testo: 'Ctrl+K apre la ricerca su tutto quello che hai scritto. Non serve premere "Salva": ogni modifica si salva da sola.' },
  ];

  const _injectModal = () => {
    if (document.getElementById('modal-onboarding')) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay hidden';
    overlay.id = 'modal-onboarding';
    overlay.style.display = 'none';
    overlay.onclick = (e) => { if (e.target === overlay) Modal.close('onboarding'); };
    overlay.innerHTML =
      '<div class="modal" style="max-width:560px;max-height:80vh;overflow-y:auto;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title">Guida rapida</h3>' +
          '<button class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'onboarding\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body" style="display:flex;flex-direction:column;gap:16px;">' +
          SEZIONI.map(s =>
            '<div>' +
              '<div style="font-family:var(--font-display);font-weight:700;font-size:0.9rem;color:var(--accent-primary);margin-bottom:4px;">' + s.titolo + '</div>' +
              '<div style="font-size:0.85rem;line-height:1.6;color:var(--text-secondary);">' + s.testo + '</div>' +
            '</div>'
          ).join('') +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  };

  const open = () => {
    _injectModal();
    Modal.open('onboarding');
    localStorage.setItem(SEEN_KEY, '1');
  };

  // Un solo avviso discreto, una volta sola per dispositivo/browser: non un tour invasivo,
  // solo un invito a scoprire la guida da soli quando gli torna comodo.
  const _maybeNudge = () => {
    if (localStorage.getItem(SEEN_KEY)) return;
    setTimeout(() => {
      try { Toast.show('Nuovo qui? Trovi una guida rapida nella sidebar, sotto "Supporto".', 'info', 8000); } catch (e) {}
    }, 800);
  };

  const _hook = () => {
    if (typeof App === 'undefined' || App._onboardingHooked) return;
    _maybeNudge();
    App._onboardingHooked = true;
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(_hook, 200));

  return { open };
})();

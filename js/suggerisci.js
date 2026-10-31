/* ============================================================
   SUGGERISCI.JS — "Suggerisci una funzione": raccoglie le idee dei
   master con poche domande e le invia via Web3Forms, lo stesso
   canale (e la stessa Access Key) di "Segnala un bug"
   (js/bug-report.js): arrivano per email con oggetto "Idea: …".
   Modulo autonomo: modale costruito a runtime.
   ============================================================ */

const Suggerisci = (() => {
  const ACCESS_KEY = 'c022699a-f9ba-47f6-87f7-c9725aeab6b7';

  const _assicuraModale = () => {
    if (document.getElementById('modal-suggerisci')) return;
    const o = document.createElement('div');
    o.className = 'modal-overlay hidden';
    o.id = 'modal-suggerisci';
    o.style.display = 'none';
    o.innerHTML =
      '<div class="modal" style="max-width:560px;">' +
        '<div class="modal-header"><h3 class="modal-title">Suggerisci una funzione</h3>' +
          '<button type="button" class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'suggerisci\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
        '<div class="modal-body">' +
          '<div style="font-size:0.86rem;color:var(--text-secondary);line-height:1.55;margin-bottom:12px;">Cosa ti manca quando prepari o giochi? Ogni idea viene letta, e quelle che chiedono in tanti arrivano prima.</div>' +
          '<div class="form-group"><label class="form-label" for="sg-titolo">Cosa vorresti poter fare?</label>' +
            '<input id="sg-titolo" type="text" class="form-input" autocomplete="off" placeholder="es. Tirare l\'iniziativa di tutti i mostri con un clic"></div>' +
          '<div class="form-group"><label class="form-label" for="sg-uso">Come lo useresti al tavolo o nella preparazione?</label>' +
            '<textarea id="sg-uso" class="form-textarea" rows="4" placeholder="Raccontaci una situazione concreta: aiuta a capire cosa serve davvero."></textarea></div>' +
          '<div class="form-group"><label class="form-label" for="sg-quanto">Quanto ti servirebbe?</label>' +
            '<select id="sg-quanto" class="form-select"><option>Mi cambierebbe il modo di giocare</option><option selected>Lo userei spesso</option><option>Sarebbe carino averlo</option></select></div>' +
          '<div class="form-group" style="margin-bottom:0;"><label class="form-label" for="sg-contatto">Come possiamo ricontattarti? (facoltativo)</label>' +
            '<input id="sg-contatto" type="text" class="form-input" autocomplete="off" placeholder="email o nome su Discord, se vuoi una risposta"></div>' +
          '<div id="sg-stato" style="display:none;font-size:0.84rem;margin-top:10px;"></div>' +
        '</div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-ghost" onclick="Modal.close(\'suggerisci\')">Annulla</button>' +
          '<button type="button" class="btn btn-primary" id="sg-invia" style="margin-left:auto;" onclick="Suggerisci.invia()">Invia l\'idea</button></div>' +
      '</div>';
    document.body.appendChild(o);
  };

  const _stato = (testo, tipo) => {
    const el = document.getElementById('sg-stato');
    if (!el) return;
    el.style.display = testo ? '' : 'none';
    el.style.color = tipo === 'error' ? 'var(--accent-danger)' : 'var(--accent-success)';
    el.textContent = testo || '';
  };

  const open = () => {
    _assicuraModale();
    ['sg-titolo', 'sg-uso', 'sg-contatto'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
    _stato(null);
    const btn = document.getElementById('sg-invia');
    if (btn) { btn.style.display = ''; btn.disabled = false; }
    Modal.open('suggerisci');
    setTimeout(() => document.getElementById('sg-titolo')?.focus(), 50);
  };

  const invia = async () => {
    const v = (id) => (document.getElementById(id)?.value || '').trim();
    const titolo = v('sg-titolo');
    if (!titolo) { Toast.show('Scrivi in breve cosa vorresti poter fare', 'warning'); document.getElementById('sg-titolo')?.focus(); return; }
    const btn = document.getElementById('sg-invia');
    const fd = new FormData();
    fd.append('access_key', ACCESS_KEY);
    fd.append('subject', 'DM Toolkit - Idea: ' + titolo);
    fd.append('from_name', 'DM Toolkit - Suggerimento');
    fd.append('message',
      'Idea: ' + titolo +
      '\n\nCome la userebbe:\n' + (v('sg-uso') || '(non specificato)') +
      '\n\nQuanto servirebbe: ' + v('sg-quanto') +
      '\nContatto: ' + (v('sg-contatto') || '(nessuno)') +
      '\n\n---\nPagina: ' + (document.getElementById('topbar-title')?.textContent?.trim() || '') + ' · ' + navigator.userAgent);
    if (btn) { btn.disabled = true; btn.textContent = 'Invio in corso...'; }
    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        _stato('Grazie! Idea inviata.', 'success');
        if (btn) btn.style.display = 'none';
        setTimeout(() => Modal.close('suggerisci'), 1600);
      } else {
        _stato('Invio non riuscito, riprova più tardi.', 'error');
      }
    } catch (e) {
      _stato('Invio non riuscito: controlla la connessione.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Invia l\'idea'; }
    }
  };

  return { open, invia };
})();

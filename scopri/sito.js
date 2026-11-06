/* Il comportamento del sito: testata, regno disegnato dal vivo, discesa tra le mappe, schede dell'app,
   stemmi generati e vista dei giocatori. Ogni parte controlla di esistere, perche' le pagine sono diverse. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const seme = () => Math.random().toString(36).slice(2, 8);

  /* Testata: acquista il fondo appena si lascia l'apertura */
  const testata = $('.nav');
  if (testata && !testata.classList.contains('nav--piena')) {
    const aggiorna = () => testata.toggleAttribute('data-staccata', window.scrollY > 40);
    addEventListener('scroll', aggiorna, { passive: true });
    aggiorna();
  }

  /* Passi e segnaposto: il segnaposto ingrandisce il foglio fino al passo dopo. Vale per ogni funzione. */
  const tastiera = (schede, scegli) => schede.forEach((b, i) => b.addEventListener('keydown', (e) => {
    const passo = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    const fisso = { Home: 0, End: schede.length - 1 }[e.key];
    if (!passo && fisso === undefined) return;
    e.preventDefault();
    const n = fisso !== undefined ? fisso : (i + passo + schede.length) % schede.length;
    scegli(n); schede[n].focus();
  }));
  const discese = new Map();
  $$('.discesa').forEach((sez) => {
    const lastra = $('.lastra', sez), strati = $$('.lastra__strato', lastra), tappe = $$('.tappa', sez), segni = $$('.segno', lastra);
    const dati = { dopo: null };
    tappe.forEach((t, i) => { t.id = sez.id + '-passo-' + i; });
    const vai = (n, conFocus) => {
      lastra.setAttribute('aria-labelledby', tappe[n].id);
      strati.forEach((s, i) => {
        s.style.transformOrigin = i < n ? (s.dataset.fuoco || '') : '';
        s.dataset.stato = i === n ? 'attivo' : i < n ? 'sopra' : 'sotto';
      });
      tappe.forEach((t, i) => { t.setAttribute('aria-selected', String(i === n)); t.tabIndex = i === n ? 0 : -1; });
      segni.forEach((s) => { s.hidden = Number(s.dataset.da) !== n; });
      if (dati.dopo) dati.dopo(n);
      if (conFocus) tappe[n].focus({ preventScroll: true });
    };
    tappe.forEach((t, i) => t.addEventListener('click', () => vai(i)));
    segni.forEach((s) => s.addEventListener('click', () => vai(Number(s.dataset.da) + 1, true)));
    tastiera(tappe, vai);
    vai(0);
    discese.set(sez.id, { lastra, segni, vai, dati });
  });

  /* Un altro regno: lo disegna un worker e prende il posto del primo foglio */
  const altro = $('#altro-regno');
  if (altro && discese.has('mappe')) {
    const { lastra, segni, vai, dati } = discese.get('mappe'), stato = $('#stato-regno');
    let worker = null, foglio = null;
    const fine = (testo, errore = false) => { altro.disabled = false; altro.textContent = 'Disegna un altro regno'; stato.innerHTML = testo; stato.classList.toggle('errore', errore); };
    const risposta = (e) => {
      if (!e.data.ok) { fine('Il regno non si è disegnato. Riprova.', true); return; }
      if (foglio) foglio.remove();
      foglio = document.createElement('div');
      foglio.className = 'lastra__nuovo';
      foglio.innerHTML = e.data.svg;
      lastra.append(foglio);
      vai(0);
      fine('Regno di ' + e.data.nome + ', codice <code>' + e.data.seme + '</code>');
    };
    altro.addEventListener('click', () => {
      altro.disabled = true; altro.textContent = 'Sto disegnando…';
      if (!worker) {
        try {
          worker = new Worker('disegna.worker.js');
          worker.onmessage = risposta;
          worker.onerror = () => { worker = null; fine('Il regno non si è disegnato. Riprova.', true); };
        } catch (err) { fine('Questo browser non può disegnare il regno.', true); return; }
      }
      const forme = ['costa', 'isola', 'continente', 'arcipelago'];
      worker.postMessage({ seme: seme(), forma: forme[Math.floor(Math.random() * forme.length)] });
    });
    // Il segnaposto porta a Borgoalta: su un regno nuovo non c'e'. Scendendo si torna al regno collegato alla citta' e alla locanda.
    dati.dopo = (n) => {
      if (!foglio) return;
      if (n === 0) { segni.forEach((s) => { if (s.dataset.da === '0') s.hidden = true; }); return; }
      foglio.remove(); foglio = null;
      fine('Regno di Montealta, codice <code>tavolo1</code>');
    };
  }

  /* Stemmi: li fa lo stesso generatore dello Scrittoio */
  const stemma = $('#stemma');
  if (stemma && typeof Araldica !== 'undefined') {
    const disegna = () => {
      const s = seme(), o = Araldica.casuale(s);
      stemma.innerHTML = Araldica.genera({ ...o, seme: s, ornamento: o.ornamento === 'nessuno' ? 'mantello' : o.ornamento }).svg;
    };
    disegna();
    const b = $('#altro-stemma');
    if (b) b.addEventListener('click', disegna);
  }

  /* Vista dei giocatori */
  const nota = $('.nota');
  if (nota) {
    const bottoni = $$('.interruttore button', nota);
    bottoni.forEach((b) => b.addEventListener('click', () => {
      nota.dataset.vista = b.dataset.vista;
      bottoni.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
  }
})();

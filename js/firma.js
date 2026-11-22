// Fondo con i loghi dei social e la firma in ogni pagina dell'app.
// Il modello è il fondo della Home: lo copia in fondo alla pagina aperta
// (o in fondo al pannello che scorre, nelle pagine a tutta altezza).
(function () {
  'use strict';
  const modello = document.querySelector('#page-home > .app-firma');
  if (!modello) return;

  const SENZA = new Set(['page-home']); // la Home ha già il suo

  const visibile = (el) => el && el.offsetParent !== null && getComputedStyle(el).display !== 'none';

  // Dove mettere il fondo: la pagina stessa se scorre lei,
  // altrimenti il pannello figlio visibile che scorre
  function bersaglio(pagina) {
    if (!pagina.style.height) return pagina;
    for (const figlio of pagina.children) {
      if (figlio.classList.contains('app-firma') || !visibile(figlio)) continue;
      const oy = getComputedStyle(figlio).overflowY;
      if (oy === 'auto' || oy === 'scroll') return figlio;
    }
    const oy = getComputedStyle(pagina).overflowY;
    return oy === 'auto' || oy === 'scroll' ? pagina : null;
  }

  let copia = null, inAttesa = false;
  function metti() {
    inAttesa = false;
    const pagina = document.querySelector('.page.active');
    if (!pagina || SENZA.has(pagina.id)) { copia?.remove(); return; }
    const dove = bersaglio(pagina);
    if (!dove) { copia?.remove(); return; }
    if (!copia) {
      copia = modello.cloneNode(true);
      copia.classList.add('app-firma-copia');
    }
    if (copia.parentNode !== dove || dove.lastElementChild !== copia) dove.appendChild(copia);
  }
  const presto = () => { if (!inAttesa) { inAttesa = true; requestAnimationFrame(metti); } };

  // Cambio di pagina, contenuto ridisegnato, pannelli che si aprono o chiudono
  const osserva = new MutationObserver((lista) => {
    for (const m of lista) {
      if (copia && (m.target === copia || copia.contains(m.target))) continue;
      presto(); return;
    }
  });
  const contenitore = modello.closest('.page').parentElement;
  osserva.observe(contenitore, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  presto();
})();

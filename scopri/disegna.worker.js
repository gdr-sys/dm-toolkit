/* DM Toolkit — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* Disegna un regno fuori dal filo principale, cosi' la pagina resta fluida anche su un tablet.
   Sono gli stessi generatori usati dal toolkit, che non toccano la pagina e lavorano su stringhe. */
importScripts('../js/cartografo-motore.js', '../js/araldica.js', '../js/cartografo-testi.js', '../js/cartografo-insediamenti.js', '../js/cartografo-regno.js', '../js/cartografo-villaggio.js', '../js/cartografo-caverna.js', '../js/cartografo-dungeon.js', '../js/cartografo-abitazione.js', '../js/cartografo-catalogo.js');

self.onmessage = (e) => {
  const { seme, forma } = e.data;
  try {
    const m = CartoCatalogo.genera('regno', { ...CartoCatalogo.predefinite('regno'), palette: 'notte', titolo: false, seme, forma });
    self.postMessage({ ok: true, seme, nome: m.nome, svg: m.svg });
  } catch (err) {
    self.postMessage({ ok: false });
  }
};

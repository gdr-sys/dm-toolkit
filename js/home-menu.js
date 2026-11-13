/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   HOME-MENU.JS — Il menu "Importa e backup" della Home: si apre col
   pulsante, si chiude con Esc, con un clic fuori o scegliendo una voce.
   ============================================================ */

const HomeMenu = (() => {
  const _menu = () => document.getElementById('campaign-grid-actions');
  const _btn = () => document.getElementById('hn-menu-btn');
  const chiudi = () => {
    const m = _menu(), b = _btn();
    if (m) m.hidden = true;
    if (b) b.setAttribute('aria-expanded', 'false');
  };
  const apri = () => {
    const m = _menu(), b = _btn();
    if (!m || !b) return;
    if (!m.hidden) { chiudi(); return; }
    m.hidden = false;
    b.setAttribute('aria-expanded', 'true');
    m.querySelector('[role="menuitem"]')?.focus();
  };
  document.addEventListener('click', (e) => {
    const m = _menu();
    if (m && !m.hidden && !e.target.closest('#campaign-grid-actions, #hn-menu-btn')) chiudi();
  });
  document.addEventListener('keydown', (e) => {
    const m = _menu();
    if (e.key === 'Escape' && m && !m.hidden) { chiudi(); _btn()?.focus(); }
  });
  return { apri, chiudi };
})();

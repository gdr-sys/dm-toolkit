/* ============================================================
   DEBUG.JS — Sistema di debug con panel visibile
   ============================================================ */

const Debug = (() => {
  const MAX_LINES = 80;
  let lines = [];
  let enabled = false;
  let panelBodyEl = null;
  let panelEl = null;

  const timestamp = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}.${d.getMilliseconds().toString().padStart(3,'0')}`;
  };

  const addLine = (type, args) => {
    const msg = args.map(a => {
      if (typeof a === 'object') {
        try { return JSON.stringify(a); }
        catch { return String(a); }
      }
      return String(a);
    }).join(' ');

    const line = { type, msg, ts: timestamp() };
    lines.push(line);
    if (lines.length > MAX_LINES) lines.shift();

    // Console nativa
    if (type === 'error') console.error(`[DM] ${msg}`);
    else if (type === 'warn') console.warn(`[DM] ${msg}`);
    else console.log(`[DM] ${msg}`);

    // Aggiorna panel se aperto
    if (panelBodyEl && panelBodyEl.classList.contains('open')) {
      renderLine(line);
      panelBodyEl.scrollTop = panelBodyEl.scrollHeight;
    }
  };

  const renderLine = (line) => {
    if (!panelBodyEl) return;
    const el = document.createElement('div');
    el.className = `debug-line ${line.type}`;
    el.textContent = `[${line.ts}] ${line.msg}`;
    panelBodyEl.appendChild(el);
    // Limite DOM
    while (panelBodyEl.children.length > MAX_LINES) {
      panelBodyEl.removeChild(panelBodyEl.firstChild);
    }
  };

  const render = () => {
    if (!panelBodyEl) return;
    panelBodyEl.innerHTML = '';
    lines.forEach(renderLine);
    panelBodyEl.scrollTop = panelBodyEl.scrollHeight;
  };

  const init = (panelBodyElement, panelElement) => {
    panelBodyEl = panelBodyElement;
    panelEl = panelElement;
    const settings = Storage ? Storage.getSettings() : { debugEnabled: false };
    enabled = settings.debugEnabled || false;
    if (panelEl) panelEl.classList.toggle('active', enabled);
    Debug.log('Debug inizializzato', `storage: ${enabled ? 'ON' : 'OFF'}`);
    const info = Storage ? Storage.getStorageInfo() : {};
    Debug.info(`Storage: ${info.usedKB || '?'} KB usati, ${info.campaigns || 0} campagne`);
  };

  const toggle = () => {
    enabled = !enabled;
    if (panelEl) panelEl.classList.toggle('active', enabled);
    if (Storage) Storage.updateSettings({ debugEnabled: enabled });
    if (enabled) render();
    Debug.log(`Debug ${enabled ? 'abilitato' : 'disabilitato'}`);
    return enabled;
  };

  const toggleBody = () => {
    if (!panelBodyEl) return;
    const open = panelBodyEl.classList.toggle('open');
    if (open) render();
  };

  const clear = () => {
    lines = [];
    if (panelBodyEl) panelBodyEl.innerHTML = '';
  };

  const isEnabled = () => enabled;

  return {
    init,
    toggle,
    toggleBody,
    clear,
    isEnabled,
    log:   (...args) => addLine('log',   args),
    warn:  (...args) => addLine('warn',  args),
    error: (...args) => addLine('error', args),
    info:  (...args) => addLine('info',  args),
  };
})();

/* ============================================================
   STORAGE.JS — Gestione dati localStorage + debug
   ============================================================ */

const Storage = (() => {
  const PREFIX = 'dmtoolkit_';

  // ── Chiavi principali ──
  const KEYS = {
    campaigns:       PREFIX + 'campaigns',
    activeCampaign:  PREFIX + 'active_campaign',
    settings:        PREFIX + 'settings',
    diceHistory:     PREFIX + 'dice_history',
    masterScreen:    PREFIX + 'master_screen',
  };

  // ── Struttura campagna vuota ──
  const emptyCampaign = (id, name, type = 'campagna') => ({
    id,
    name,
    type,           // 'campagna' | 'oneshot'
    system: '5e2024',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastSession: '',
    color: '#8b2635',
    icon: type === 'oneshot' ? '⚡' : '📖',

    // ─ Modulo Campagna ─
    sessionRecap: '',
    quests: [],       // { id, title, status, steps, reward, notes }
    timeline: [],     // { id, day, event, type }
    factions: [],     // { id, name, power, influence, relations, notes }

    // ─ Modulo Mondo ─
    locations: [],    // { id, name, type, parentId, description, poi, encounters, loot, weather }
    npcs: [],         // { id, name, race, class, locationId, factionId, ... }

    // ─ Modulo Sessione ─
    party: [],        // { id, name, player, hp, maxHp, ac, passivePerc, passiveInv, passiveIns, level }
    combatSessions: [],// { id, name, date, initiative, combatants, status }
    activeCombat: null,
    calendar: {
      day: 1, month: 1, year: 1490,
      timeHours: 8, timeMinutes: 0,
      system: 'FR'
    },

    // ─ Generatori (cache ultimi risultati) ─
    generatorCache: {}
  });

  // ── Struttura settings default ──
  const defaultSettings = () => ({
    theme: 'dark',
    sidebarCollapsed: false,
    debugEnabled: false,
    diceSound: false,
    language: 'it',
  });

  // ── Helpers ──
  const get = (key, fallback = null) => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch (e) {
      Debug.error(`Storage.get(${key}):`, e.message);
      return fallback;
    }
  };

  const set = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      Debug.error(`Storage.set(${key}):`, e.message);
      return false;
    }
  };

  const remove = (key) => {
    try { localStorage.removeItem(key); return true; }
    catch (e) { Debug.error(`Storage.remove(${key}):`, e.message); return false; }
  };

  // ── API Campagne ──
  const getCampaigns = () => get(KEYS.campaigns, []);
  const saveCampaigns = (list) => set(KEYS.campaigns, list);

  const getCampaign = (id) => {
    const list = getCampaigns();
    return list.find(c => c.id === id) || null;
  };

  const createCampaign = (name, type = 'campagna') => {
    const id = 'camp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const campaign = emptyCampaign(id, name, type);
    const list = getCampaigns();
    list.push(campaign);
    saveCampaigns(list);
    Debug.log(`Campagna creata: ${name} (${id})`);
    return campaign;
  };

  const updateCampaign = (id, partial) => {
    const list = getCampaigns();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) { Debug.warn(`updateCampaign: id ${id} non trovato`); return false; }
    list[idx] = { ...list[idx], ...partial, updatedAt: Date.now() };
    saveCampaigns(list);
    return list[idx];
  };

  const deleteCampaign = (id) => {
    let list = getCampaigns();
    const len = list.length;
    list = list.filter(c => c.id !== id);
    if (list.length === len) { Debug.warn(`deleteCampaign: id ${id} non trovato`); return false; }
    saveCampaigns(list);
    const active = get(KEYS.activeCampaign);
    if (active === id) remove(KEYS.activeCampaign);
    Debug.log(`Campagna eliminata: ${id}`);
    return true;
  };

  const duplicateCampaign = (id, newName) => {
    const src = getCampaign(id);
    if (!src) return null;
    const newId = 'camp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = newId;
    copy.name = newName || src.name + ' (Copia)';
    copy.createdAt = Date.now();
    copy.updatedAt = Date.now();
    const list = getCampaigns();
    list.push(copy);
    saveCampaigns(list);
    Debug.log(`Campagna duplicata: ${newName}`);
    return copy;
  };

  // ── Campagna Attiva ──
  const getActiveCampaignId = () => get(KEYS.activeCampaign);
  const setActiveCampaign = (id) => { set(KEYS.activeCampaign, id); Debug.log(`Campagna attiva: ${id}`); };

  // ── Settings ──
  const getSettings = () => ({ ...defaultSettings(), ...get(KEYS.settings, {}) });
  const updateSettings = (partial) => {
    const current = getSettings();
    return set(KEYS.settings, { ...current, ...partial });
  };

  // ── Dice History ──
  const getDiceHistory = () => get(KEYS.diceHistory, []);
  const addDiceRoll = (formula, results, total) => {
    let history = getDiceHistory();
    history.unshift({ formula, results, total, ts: Date.now() });
    if (history.length > 50) history = history.slice(0, 50);
    set(KEYS.diceHistory, history);
  };

  // ── Import / Export ──
  const exportCampaign = (id) => {
    const c = getCampaign(id);
    if (!c) return null;
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${c.name.replace(/\s+/g, '_')}_dmtoolkit.json`;
    a.click();
    URL.revokeObjectURL(url);
    Debug.log(`Export campagna: ${c.name}`);
    return true;
  };

  const importCampaign = (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.id || !data.name) throw new Error('Struttura non valida');
      // Genera nuovo ID per evitare conflitti
      data.id = 'camp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      data.name = data.name + ' (Importata)';
      const list = getCampaigns();
      list.push(data);
      saveCampaigns(list);
      Debug.log(`Importata campagna: ${data.name}`);
      return data;
    } catch (e) {
      Debug.error(`importCampaign: ${e.message}`);
      return null;
    }
  };

  // ── Master Screen ──
  const getMasterScreen = () => get(KEYS.masterScreen, { blocks: [], layout: [] });
  const saveMasterScreen = (data) => set(KEYS.masterScreen, data);

  // ── Storage info ──
  const getStorageInfo = () => {
    let total = 0;
    for (let k in localStorage) {
      if (k.startsWith(PREFIX)) {
        total += (localStorage[k].length + k.length) * 2;
      }
    }
    return {
      usedKB: (total / 1024).toFixed(1),
      campaigns: getCampaigns().length
    };
  };

  return {
    KEYS,
    get, set, remove,
    getCampaigns, saveCampaigns, getCampaign,
    createCampaign, updateCampaign, deleteCampaign, duplicateCampaign,
    getActiveCampaignId, setActiveCampaign,
    getSettings, updateSettings,
    getDiceHistory, addDiceRoll,
    exportCampaign, importCampaign,
    getMasterScreen, saveMasterScreen,
    getStorageInfo,
    emptyCampaign
  };
})();

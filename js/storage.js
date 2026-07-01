/* ============================================================
   STORAGE.JS — Gestione dati localStorage + debug
   ============================================================ */

const Storage = (() => {
  const PREFIX = 'dmtoolkit_';

  const KEYS = {
    campaigns:       PREFIX + 'campaigns',
    activeCampaign:  PREFIX + 'active_campaign',
    settings:        PREFIX + 'settings',
    diceHistory:     PREFIX + 'dice_history',
    masterScreen:    PREFIX + 'master_screen',
    snapshots:       PREFIX + 'snapshots',      // ← backup versionati
  };

  const MAX_SNAPSHOTS = 10; // ultimi N snapshot conservati

  const emptyCampaign = (id, name, type = 'campagna') => ({
    id,
    name,
    type,
    system: '5e2024',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastSession: '',
    color: '#8b2635',
    icon: type === 'oneshot' ? '⚡' : '📖',
    sessionRecap: '',
    quests: [],
    timeline: [],
    factions: [],
    locations: [],
    npcs: [],
    party: [],
    combatSessions: [],
    activeCombat: null,
    calendar: {
      day: 1, month: 1, year: 1490,
      timeHours: 8, timeMinutes: 0,
      system: 'FR'
    },
    generatorCache: {},
    // Nuovi campi roadmap
    sessionLogs: [],    // #5 Log sessioni strutturato
    narrativeThreads: [], // #4 Fili narrativi
    sessionZero: null,  // #1 Session Zero
    prepChecklist: [],  // #6 Checklist preparazione
    downtimeLog: [],    // #7 Downtime
    factionClocks: [],  // #9 Clock fazione
  });

  const defaultSettings = () => ({
    theme: 'dark',
    sidebarCollapsed: false,
    debugEnabled: false,
    diceSound: false,
    language: 'it',
    autoBackupEnabled: true,
    autoBackupInterval: 'session', // 'session' | 'hourly' | 'manual'
  });

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

  // ══════════════════════════════════════════════════════
  // BACKUP VERSIONATO — #8 Roadmap
  // Snapshot = copia completa di tutte le campagne + settings
  // Conserva gli ultimi MAX_SNAPSHOTS snapshot in locale
  // ══════════════════════════════════════════════════════

  const getSnapshots = () => get(KEYS.snapshots, []);

  const createSnapshot = (label = 'Automatico') => {
    try {
      const snapshot = {
        id: 'snap_' + Date.now(),
        createdAt: Date.now(),
        label,
        campaigns: getCampaigns(),
        settings: getSettings(),
        masterScreen: getMasterScreen(),
        version: '1.0',
      };

      let snapshots = getSnapshots();
      snapshots.unshift(snapshot); // più recente in cima

      // Mantieni solo gli ultimi N
      if (snapshots.length > MAX_SNAPSHOTS) {
        snapshots = snapshots.slice(0, MAX_SNAPSHOTS);
      }

      const ok = set(KEYS.snapshots, snapshots);
      if (ok) {
        Debug.log(`Snapshot creato: "${label}" (${snapshots.length}/${MAX_SNAPSHOTS})`);
      }
      return ok ? snapshot : null;
    } catch (e) {
      Debug.error('createSnapshot:', e.message);
      return null;
    }
  };

  const restoreSnapshot = (snapshotId) => {
    const snapshots = getSnapshots();
    const snap = snapshots.find(s => s.id === snapshotId);
    if (!snap) { Debug.warn(`Snapshot ${snapshotId} non trovato`); return false; }

    // Crea uno snapshot di sicurezza prima di ripristinare
    createSnapshot('Pre-ripristino automatico');

    // Ripristina i dati
    set(KEYS.campaigns, snap.campaigns);
    if (snap.settings) set(KEYS.settings, snap.settings);
    if (snap.masterScreen) set(KEYS.masterScreen, snap.masterScreen);

    Debug.log(`Snapshot ripristinato: "${snap.label}" del ${new Date(snap.createdAt).toLocaleString('it-IT')}`);
    return true;
  };

  const deleteSnapshot = (snapshotId) => {
    let snapshots = getSnapshots();
    const before = snapshots.length;
    snapshots = snapshots.filter(s => s.id !== snapshotId);
    if (snapshots.length === before) return false;
    set(KEYS.snapshots, snapshots);
    Debug.log(`Snapshot ${snapshotId} eliminato`);
    return true;
  };

  const exportSnapshot = (snapshotId) => {
    const snapshots = getSnapshots();
    const snap = snapshotId
      ? snapshots.find(s => s.id === snapshotId)
      : { // export completo tutto
          id: 'full_' + Date.now(),
          createdAt: Date.now(),
          label: 'Export completo',
          campaigns: getCampaigns(),
          settings: getSettings(),
          masterScreen: getMasterScreen(),
          version: '1.0',
        };
    if (!snap) return false;
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date(snap.createdAt).toISOString().slice(0, 10);
    a.download = `dmtoolkit_backup_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  };

  const importSnapshot = (jsonString) => {
    try {
      const snap = JSON.parse(jsonString);
      if (!snap.campaigns || !Array.isArray(snap.campaigns)) throw new Error('Struttura non valida');

      // Crea snapshot di sicurezza prima di importare
      createSnapshot('Pre-importazione automatico');

      set(KEYS.campaigns, snap.campaigns);
      if (snap.settings) set(KEYS.settings, snap.settings);
      if (snap.masterScreen) set(KEYS.masterScreen, snap.masterScreen);

      Debug.log(`Backup importato: "${snap.label}" (${snap.campaigns.length} campagne)`);
      return snap;
    } catch (e) {
      Debug.error('importSnapshot:', e.message);
      return null;
    }
  };

  const getSnapshotInfo = () => {
    const snapshots = getSnapshots();
    return {
      count: snapshots.length,
      max: MAX_SNAPSHOTS,
      oldest: snapshots.length ? new Date(snapshots[snapshots.length - 1].createdAt).toLocaleString('it-IT') : null,
      newest: snapshots.length ? new Date(snapshots[0].createdAt).toLocaleString('it-IT') : null,
      list: snapshots.map(s => ({
        id: s.id,
        label: s.label,
        createdAt: s.createdAt,
        campagneCount: s.campaigns?.length ?? 0,
        dateStr: new Date(s.createdAt).toLocaleString('it-IT'),
      })),
    };
  };

  // Auto-backup: chiamato da App.init() e a ogni cambio campagna
  const autoBackup = () => {
    const settings = getSettings();
    if (!settings.autoBackupEnabled) return;
    const snapshots = getSnapshots();
    const lastSnap = snapshots[0];
    // Crea snapshot solo se è passato un po' di tempo dall'ultimo (5 minuti min)
    const minInterval = 5 * 60 * 1000;
    if (!lastSnap || (Date.now() - lastSnap.createdAt) > minInterval) {
      const label = `Auto — ${new Date().toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}`;
      createSnapshot(label);
    }
  };

  // ── API Campagne ──
  const getCampaigns = () => get(KEYS.campaigns, []);
  const saveCampaigns = (list) => set(KEYS.campaigns, list);

  const getCampaign = (id) => {
    const list = getCampaigns();
    const found = list.find(c => c.id === id);
    if (!found) return null;
    const defaults = emptyCampaign(found.id, found.name, found.type);
    return { ...defaults, ...found };
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

  const getActiveCampaignId = () => get(KEYS.activeCampaign);
  const setActiveCampaign = (id) => { set(KEYS.activeCampaign, id); Debug.log(`Campagna attiva: ${id}`); };

  const getSettings = () => ({ ...defaultSettings(), ...get(KEYS.settings, {}) });
  const updateSettings = (partial) => {
    const current = getSettings();
    return set(KEYS.settings, { ...current, ...partial });
  };

  const getDiceHistory = () => get(KEYS.diceHistory, []);
  const addDiceRoll = (formula, results, total) => {
    let history = getDiceHistory();
    history.unshift({ formula, results, total, ts: Date.now() });
    if (history.length > 50) history = history.slice(0, 50);
    set(KEYS.diceHistory, history);
  };

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

  const getMasterScreen = () => get(KEYS.masterScreen, { blocks: [], layout: [] });
  const saveMasterScreen = (data) => set(KEYS.masterScreen, data);

  const getStorageInfo = () => {
    let total = 0;
    for (let k in localStorage) {
      if (k.startsWith(PREFIX)) {
        total += (localStorage[k].length + k.length) * 2;
      }
    }
    const snaps = getSnapshots();
    return {
      usedKB: (total / 1024).toFixed(1),
      campaigns: getCampaigns().length,
      snapshots: snaps.length,
      oldestSnapshot: snaps.length ? new Date(snaps[snaps.length-1].createdAt).toLocaleDateString('it-IT') : null,
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
    emptyCampaign,
    // Backup versionato (#8)
    getSnapshots, createSnapshot, restoreSnapshot,
    deleteSnapshot, exportSnapshot, importSnapshot,
    getSnapshotInfo, autoBackup,
  };
})();

/* ============================================================
   MODALS.JS — Sistema modal generico + modal specifici
   ============================================================ */

// ── Toast ──
const Toast = (() => {
  const show = (msg, type = 'info', duration = 3000) => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span style="font-size:0.85rem;">${icons[type] || 'ℹ'}</span><span>${msg}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = `fadeOut ${250}ms ease forwards`;
      setTimeout(() => toast.remove(), 250);
    }, duration);
  };

  return { show };
})();

// ── Modal Base ──
const Modal = (() => {
  let stack = [];

  const open = (id) => {
    const overlay = document.getElementById(`modal-${id}`);
    if (!overlay) { Debug.warn(`Modal non trovato: modal-${id}`); return; }
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    stack.push(id);
    Debug.log(`Modal aperto: ${id}`);
  };

  const close = (id) => {
    const overlay = document.getElementById(`modal-${id}`);
    if (!overlay) return;
    overlay.style.display = 'none';
    stack = stack.filter(s => s !== id);
    Debug.log(`Modal chiuso: ${id}`);
  };

  const closeAll = () => {
    document.querySelectorAll('.modal-overlay').forEach(el => {
      el.style.display = 'none';
    });
    stack = [];
  };

  // Chiudi cliccando overlay
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      const id = e.target.id.replace('modal-', '');
      close(id);
    }
  });

  // ESC chiude ultimo modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stack.length > 0) {
      close(stack[stack.length - 1]);
    }
  });

  return { open, close, closeAll };
})();

// ── MODAL: Nuova Campagna ──
const openNewCampaignModal = () => {
  const el = document.getElementById('modal-new-campaign');
  if (!el) return;
  // Reset form
  document.getElementById('nc-name').value = '';
  document.getElementById('nc-type').value = 'campagna';
  document.getElementById('nc-system').value = '5e2024';
  Modal.open('new-campaign');
  setTimeout(() => document.getElementById('nc-name')?.focus(), 100);
};

const submitNewCampaign = () => {
  const name = document.getElementById('nc-name')?.value?.trim();
  const type = document.getElementById('nc-type')?.value || 'campagna';
  const system = document.getElementById('nc-system')?.value || '5e2024';

  if (!name) { Toast.show('Inserisci un nome', 'warning'); return; }

  const camp = Storage.createCampaign(name, type);
  Storage.updateCampaign(camp.id, { system });

  Modal.close('new-campaign');
  App.openCampaign(camp.id);
};

// ── MODAL: Modifica Campagna ──
const openEditCampaignModal = (camp) => {
  document.getElementById('ec-id').value = camp.id;
  document.getElementById('ec-name').value = camp.name;
  document.getElementById('ec-type').value = camp.type || 'campagna';
  document.getElementById('ec-system').value = camp.system || '5e2024';
  Modal.open('edit-campaign');
  setTimeout(() => document.getElementById('ec-name')?.focus(), 100);
};

const submitEditCampaign = () => {
  const id = document.getElementById('ec-id')?.value;
  const name = document.getElementById('ec-name')?.value?.trim();
  if (!id || !name) { Toast.show('Inserisci un nome', 'warning'); return; }

  Storage.updateCampaign(id, {
    name,
    type: document.getElementById('ec-type')?.value,
    system: document.getElementById('ec-system')?.value,
  });

  Modal.close('edit-campaign');
  App.renderHomePage();
  Toast.show('Campagna aggiornata', 'success');
};

// ── MODAL: Conferma ──
let _confirmCallback = null;
const openConfirmModal = (title, body, callback) => {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-body').textContent = body;
  _confirmCallback = callback;
  Modal.open('confirm');
};

const submitConfirm = () => {
  Modal.close('confirm');
  if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
};

// ── MODAL: Quest ──
let _editingQuestId = null;
const openQuestModal = (quest) => {
  _editingQuestId = quest ? quest.id : null;
  document.getElementById('quest-modal-title').textContent = quest ? 'Modifica Quest' : 'Nuova Quest';
  document.getElementById('qm-title').value = quest?.title || '';
  document.getElementById('qm-status').value = quest?.status || 'disponibile';
  document.getElementById('qm-reward').value = quest?.reward || '';
  document.getElementById('qm-notes').value = quest?.notes || '';
  Modal.open('quest');
  setTimeout(() => document.getElementById('qm-title')?.focus(), 100);
};

const submitQuest = () => {
  const title = document.getElementById('qm-title')?.value?.trim();
  if (!title) { Toast.show('Inserisci un titolo', 'warning'); return; }

  const camp = App.getActiveCampaign();
  if (!camp) return;

  const quests = [...(camp.quests || [])];
  const questData = {
    title,
    status: document.getElementById('qm-status')?.value || 'disponibile',
    reward: document.getElementById('qm-reward')?.value || '',
    notes: document.getElementById('qm-notes')?.value || '',
  };

  if (_editingQuestId) {
    const idx = quests.findIndex(q => q.id === _editingQuestId);
    if (idx !== -1) quests[idx] = { ...quests[idx], ...questData };
  } else {
    quests.push({ id: 'q_' + Date.now(), ...questData });
  }

  App.saveActiveCampaign({ quests });
  Modal.close('quest');
  App.renderQuestList();
  Toast.show(quest ? 'Quest aggiornata' : 'Quest aggiunta', 'success');
};

// ── MODAL: Timeline Event ──
const openTimelineModal = () => {
  document.getElementById('tm-day').value = '';
  document.getElementById('tm-event').value = '';
  document.getElementById('tm-type').value = '';
  Modal.open('timeline');
  setTimeout(() => document.getElementById('tm-day')?.focus(), 100);
};

const submitTimelineEvent = () => {
  const day = parseInt(document.getElementById('tm-day')?.value);
  const event = document.getElementById('tm-event')?.value?.trim();
  if (!event || isNaN(day)) { Toast.show('Compila giorno ed evento', 'warning'); return; }

  const camp = App.getActiveCampaign();
  if (!camp) return;

  const timeline = [...(camp.timeline || [])];
  timeline.push({
    id: 'ev_' + Date.now(),
    day,
    event,
    type: document.getElementById('tm-type')?.value || '',
  });

  App.saveActiveCampaign({ timeline });
  Modal.close('timeline');
  App.renderTimeline();
  Toast.show('Evento aggiunto', 'success');
};

// ── MODAL: Fazione ──
let _editingFactionId = null;
const openFactionModal = (faction) => {
  _editingFactionId = faction ? faction.id : null;
  document.getElementById('faction-modal-title').textContent = faction ? 'Modifica Fazione' : 'Nuova Fazione';
  document.getElementById('fm-name').value = faction?.name || '';
  document.getElementById('fm-power').value = faction?.power ?? 50;
  document.getElementById('fm-power-val').textContent = faction?.power ?? 50;
  document.getElementById('fm-influence').value = faction?.influence || '';
  document.getElementById('fm-notes').value = faction?.notes || '';
  Modal.open('faction');
  setTimeout(() => document.getElementById('fm-name')?.focus(), 100);
};

const submitFaction = () => {
  const name = document.getElementById('fm-name')?.value?.trim();
  if (!name) { Toast.show('Inserisci un nome', 'warning'); return; }

  const camp = App.getActiveCampaign();
  if (!camp) return;

  const factions = [...(camp.factions || [])];
  const data = {
    name,
    power: parseInt(document.getElementById('fm-power')?.value) || 50,
    influence: document.getElementById('fm-influence')?.value || '',
    notes: document.getElementById('fm-notes')?.value || '',
  };

  if (_editingFactionId) {
    const idx = factions.findIndex(f => f.id === _editingFactionId);
    if (idx !== -1) factions[idx] = { ...factions[idx], ...data };
  } else {
    factions.push({ id: 'f_' + Date.now(), ...data });
  }

  App.saveActiveCampaign({ factions });
  Modal.close('faction');
  App.renderFactionList();
  Toast.show(faction ? 'Fazione aggiornata' : 'Fazione aggiunta', 'success');
};

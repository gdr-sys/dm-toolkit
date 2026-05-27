/* ============================================================
   APP.JS — Navigazione, Campagne, Tema, Init
   ============================================================ */

const App = (() => {
  let currentPage = 'home';
  let activeCampaign = null;

  // ── Navigazione ──
  const pages = {
    home:       { label: 'Campagne',   icon: '🏠', navItem: true,  requiresCampaign: false },
    campagna:   { label: 'Campagna',   icon: '📖', navItem: true,  requiresCampaign: true  },
    mondo:      { label: 'Mondo',      icon: '🗺️', navItem: true,  requiresCampaign: true  },
    sessione:   { label: 'Sessione',   icon: '⚔️', navItem: true,  requiresCampaign: true  },
    generatori: { label: 'Generatori', icon: '✨', navItem: true,  requiresCampaign: false },
    compendio:  { label: 'Compendio',  icon: '📚', navItem: true,  requiresCampaign: false },
    schermo:    { label: 'Schermo DM', icon: '🖥️', navItem: true,  requiresCampaign: false },
  };

  const navigateTo = (pageId) => {
    Debug.log(`navigateTo: ${pageId}`);

    const page = pages[pageId];
    if (!page) { Debug.warn(`Pagina sconosciuta: ${pageId}`); return; }

    if (page.requiresCampaign && !activeCampaign) {
      Toast.show('Seleziona prima una campagna', 'warning');
      navigateTo('home');
      return;
    }

    // Nascondi tutte le pagine
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Mostra pagina corrente
    const pageEl = document.getElementById(`page-${pageId}`);
    if (pageEl) {
      pageEl.classList.add('active');
    } else {
      Debug.warn(`Elemento #page-${pageId} non trovato`);
    }

    // Aggiorna nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageId);
    });

    // Aggiorna topbar
    const topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle) {
      topbarTitle.textContent = page.label;
    }

    currentPage = pageId;

    // Hook pagina specifica
    switch (pageId) {
      case 'home':      renderHomePage(); break;
      case 'campagna':  renderCampaignPage(); break;
      case 'mondo':     if (window.NPC) NPC.init(); break;
      case 'sessione':  if (window.Sessione) Sessione.init(); break;
      case 'compendio': if (window.Compendio) Compendio.init(); break;
      case 'sessione':  if (window.Sessione) Sessione.init(); break;
      case 'generatori': if (window.Generatori) Generatori.init(); break;
      case 'compendio': if (window.Compendio) Compendio.init(); break;
      case 'schermo':   if (window.Schermo) Schermo.init(); break;
    }
  };

  // ── Tema ──
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    Storage.updateSettings({ theme });
    Debug.log(`Tema: ${theme}`);
  };

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  };

  // ── Sidebar ──
  const toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main-content');
    const collapsed = sidebar.classList.toggle('collapsed');
    main.classList.toggle('expanded', collapsed);
    Storage.updateSettings({ sidebarCollapsed: collapsed });
    Debug.log(`Sidebar: ${collapsed ? 'collapsed' : 'expanded'}`);
  };

  // ── Campagna Attiva ──
  const setActiveCampaign = (campaign) => {
    activeCampaign = campaign;
    Storage.setActiveCampaign(campaign ? campaign.id : null);

    // Aggiorna sidebar
    const nameEl = document.getElementById('sidebar-campaign-name');
    const dotEl = document.getElementById('sidebar-campaign-dot');
    if (nameEl) nameEl.textContent = campaign ? campaign.name : 'Nessuna campagna';
    if (dotEl) dotEl.style.display = campaign ? 'block' : 'none';

    // Abilita/disabilita nav items
    document.querySelectorAll('.nav-item[data-requires-campaign]').forEach(el => {
      el.classList.toggle('nav-disabled', !campaign);
      el.style.opacity = campaign ? '1' : '0.4';
    });

    Debug.log(`Campagna attiva: ${campaign ? campaign.name : 'nessuna'}`);
  };

  const getActiveCampaign = () => activeCampaign;

  const reloadActiveCampaign = () => {
    if (!activeCampaign) return;
    const fresh = Storage.getCampaign(activeCampaign.id);
    if (fresh) activeCampaign = fresh;
    return fresh;
  };

  const saveActiveCampaign = (partial) => {
    if (!activeCampaign) return;
    const updated = Storage.updateCampaign(activeCampaign.id, partial);
    if (updated) activeCampaign = updated;
    return updated;
  };

  // ── HOME PAGE — Selezione Campagna ──
  const renderHomePage = () => {
    const grid = document.getElementById('campaign-grid');
    if (!grid) return;

    const campaigns = Storage.getCampaigns();
    Debug.log(`renderHomePage: ${campaigns.length} campagne`);

    grid.innerHTML = '';

    // Card nuova campagna
    const newCard = document.createElement('div');
    newCard.className = 'campaign-card campaign-card-new';
    newCard.innerHTML = `
      <div class="campaign-card-icon">➕</div>
      <div style="font-family:var(--font-display);font-size:0.85rem;font-weight:600;">Nuova Campagna</div>
      <div class="text-xs text-muted" style="margin-top:4px;">o One Shot</div>
    `;
    newCard.onclick = () => openNewCampaignModal();
    grid.appendChild(newCard);

    // Importa
    const importCard = document.createElement('div');
    importCard.className = 'campaign-card campaign-card-new';
    importCard.innerHTML = `
      <div class="campaign-card-icon">📥</div>
      <div style="font-family:var(--font-display);font-size:0.85rem;font-weight:600;">Importa</div>
      <div class="text-xs text-muted" style="margin-top:4px;">Da file JSON</div>
    `;
    importCard.onclick = () => importCampaignFromFile();
    grid.appendChild(importCard);

    // Campagne esistenti
    campaigns.sort((a, b) => b.updatedAt - a.updatedAt).forEach(camp => {
      const card = document.createElement('div');
      card.className = 'campaign-card';
      if (activeCampaign && activeCampaign.id === camp.id) {
        card.style.borderColor = 'var(--accent-primary)';
        card.style.boxShadow = '0 0 0 2px rgba(139,38,53,0.2)';
      }

      const date = new Date(camp.updatedAt).toLocaleDateString('it-IT', {
        day: '2-digit', month: 'short', year: 'numeric'
      });

      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:1.6rem;">${camp.icon || '📖'}</span>
          <div>
            <div class="campaign-card-type">${camp.type === 'oneshot' ? '⚡ One Shot' : '📖 Campagna'} · ${camp.system || '5e'}</div>
            <div class="campaign-card-name">${camp.name}</div>
          </div>
        </div>
        <div class="campaign-card-meta">Ultima modifica: ${date}</div>
        <div class="campaign-card-actions">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();App.openCampaign('${camp.id}')">Apri</button>
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();App.editCampaign('${camp.id}')">✏️</button>
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();Storage.exportCampaign('${camp.id}')">📤</button>
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();App.confirmDeleteCampaign('${camp.id}')">🗑️</button>
        </div>
      `;
      card.onclick = () => App.openCampaign(camp.id);
      grid.appendChild(card);
    });
  };

  const openCampaign = (id) => {
    const camp = Storage.getCampaign(id);
    if (!camp) { Toast.show('Campagna non trovata', 'error'); return; }
    setActiveCampaign(camp);
    navigateTo('campagna');
    Toast.show(`Campagna aperta: ${camp.name}`, 'success');
  };

  const editCampaign = (id) => {
    const camp = Storage.getCampaign(id);
    if (!camp) return;
    openEditCampaignModal(camp);
  };

  const confirmDeleteCampaign = (id) => {
    const camp = Storage.getCampaign(id);
    if (!camp) return;
    openConfirmModal(
      `Eliminare "${camp.name}"?`,
      'Questa azione non può essere annullata. Tutti i dati della campagna verranno persi.',
      () => {
        Storage.deleteCampaign(id);
        if (activeCampaign && activeCampaign.id === id) setActiveCampaign(null);
        renderHomePage();
        Toast.show('Campagna eliminata', 'info');
      }
    );
  };

  // ── CAMPAIGN PAGE ──
  const renderCampaignPage = () => {
    if (!activeCampaign) return;
    const fresh = Storage.getCampaign(activeCampaign.id);
    if (fresh) activeCampaign = fresh;

    Debug.log(`renderCampaignPage: ${activeCampaign.name}`);

    const titleEl = document.getElementById('camp-page-title');
    if (titleEl) titleEl.textContent = activeCampaign.name;

    const recapEl = document.getElementById('camp-session-recap');
    if (recapEl) recapEl.value = activeCampaign.sessionRecap || '';

    renderQuestList();
    renderTimeline();
    renderFactionList();
  };

  const saveRecap = () => {
    const el = document.getElementById('camp-session-recap');
    if (!el || !activeCampaign) return;
    App.saveActiveCampaign({ sessionRecap: el.value });
    Toast.show('Riepilogo salvato', 'success');
    Debug.log('Riepilogo sessione salvato');
  };

  // ── QUEST ──
  const renderQuestList = () => {
    if (!activeCampaign) return;
    const quests = activeCampaign.quests || [];
    const tabs = ['disponibile', 'in_corso', 'completata', 'fallita'];
    const labels = { disponibile: 'Disponibili', in_corso: 'In Corso', completata: 'Completate', fallita: 'Fallite' };
    const colors = { disponibile: 'badge-muted', in_corso: 'badge-primary', completata: 'badge-success', fallita: 'badge-warning' };

    tabs.forEach(status => {
      const el = document.getElementById(`quest-list-${status}`);
      if (!el) return;
      const filtered = quests.filter(q => q.status === status);
      if (filtered.length === 0) {
        el.innerHTML = `<div class="empty-state" style="padding:var(--space-lg)"><div class="text-muted text-sm">Nessuna quest ${labels[status].toLowerCase()}</div></div>`;
        return;
      }
      el.innerHTML = filtered.map(q => `
        <div class="card card-accent" style="margin-bottom:var(--space-sm);padding:var(--space-md);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <div style="font-family:var(--font-display);font-size:0.9rem;">${q.title}</div>
            <div style="display:flex;gap:4px;">
              <span class="badge ${colors[q.status]}">${labels[q.status]}</span>
              <button class="btn btn-ghost btn-icon-sm" onclick="App.editQuest('${q.id}')">✏️</button>
              <button class="btn btn-ghost btn-icon-sm" onclick="App.deleteQuest('${q.id}')">🗑️</button>
            </div>
          </div>
          ${q.notes ? `<div class="text-sm text-muted">${q.notes}</div>` : ''}
          ${q.reward ? `<div class="text-xs text-gold" style="margin-top:4px;">🏆 ${q.reward}</div>` : ''}
        </div>
      `).join('');
    });
  };

  const addQuest = () => {
    openQuestModal(null);
  };

  const editQuest = (id) => {
    if (!activeCampaign) return;
    const quest = (activeCampaign.quests || []).find(q => q.id === id);
    if (quest) openQuestModal(quest);
  };

  const deleteQuest = (id) => {
    if (!activeCampaign) return;
    openConfirmModal('Eliminare questa quest?', '', () => {
      const quests = (activeCampaign.quests || []).filter(q => q.id !== id);
      App.saveActiveCampaign({ quests });
      renderQuestList();
      Toast.show('Quest eliminata', 'info');
    });
  };

  // ── TIMELINE ──
  const renderTimeline = () => {
    if (!activeCampaign) return;
    const events = (activeCampaign.timeline || []).sort((a, b) => a.day - b.day);
    const el = document.getElementById('timeline-list');
    if (!el) return;

    if (events.length === 0) {
      el.innerHTML = `<div class="empty-state" style="padding:var(--space-lg)"><div class="text-muted text-sm">Nessun evento registrato</div></div>`;
      return;
    }

    el.innerHTML = events.map(e => `
      <div style="display:flex;gap:var(--space-md);margin-bottom:var(--space-sm);align-items:flex-start;">
        <div style="flex-shrink:0;width:56px;text-align:right;">
          <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--accent-secondary);">Giorno ${e.day}</span>
        </div>
        <div style="width:2px;background:var(--border);border-radius:2px;flex-shrink:0;"></div>
        <div style="flex:1;padding-bottom:var(--space-sm);">
          <div style="font-size:0.9rem;">${e.event}</div>
          ${e.type ? `<span class="badge badge-muted" style="margin-top:4px;">${e.type}</span>` : ''}
        </div>
        <button class="btn btn-ghost btn-icon-sm" onclick="App.deleteTimelineEvent('${e.id}')">🗑️</button>
      </div>
    `).join('');
  };

  const addTimelineEvent = () => {
    openTimelineModal();
  };

  const deleteTimelineEvent = (id) => {
    if (!activeCampaign) return;
    const timeline = (activeCampaign.timeline || []).filter(e => e.id !== id);
    App.saveActiveCampaign({ timeline });
    renderTimeline();
  };

  // ── FAZIONI ──
  const renderFactionList = () => {
    if (!activeCampaign) return;
    const factions = activeCampaign.factions || [];
    const el = document.getElementById('faction-list');
    if (!el) return;

    if (factions.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="text-muted text-sm">Nessuna fazione registrata</div></div>`;
      return;
    }

    el.innerHTML = factions.map(f => {
      const pct = Math.round(f.power || 50);
      return `
        <div class="card" style="margin-bottom:var(--space-sm);padding:var(--space-md);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div>
              <div style="font-family:var(--font-display);font-size:0.95rem;">${f.name}</div>
              ${f.influence ? `<div class="text-xs text-muted">${f.influence}</div>` : ''}
            </div>
            <div style="display:flex;gap:4px;">
              <button class="btn btn-ghost btn-icon-sm" onclick="App.editFaction('${f.id}')">✏️</button>
              <button class="btn btn-ghost btn-icon-sm" onclick="App.deleteFaction('${f.id}')">🗑️</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="text-xs text-muted">Potere</span>
            <div class="progress-bar" style="flex:1;">
              <div class="progress-fill ${pct > 66 ? 'progress-ally' : pct > 33 ? 'progress-neutral' : 'progress-hostil'}" style="width:${pct}%"></div>
            </div>
            <span class="text-xs text-mono">${pct}%</span>
          </div>
          ${f.notes ? `<div class="text-xs text-muted" style="margin-top:6px;">${f.notes}</div>` : ''}
        </div>
      `;
    }).join('');
  };

  const addFaction = () => openFactionModal(null);
  const editFaction = (id) => {
    if (!activeCampaign) return;
    const f = (activeCampaign.factions || []).find(x => x.id === id);
    if (f) openFactionModal(f);
  };
  const deleteFaction = (id) => {
    openConfirmModal('Eliminare questa fazione?', '', () => {
      const factions = (activeCampaign.factions || []).filter(x => x.id !== id);
      App.saveActiveCampaign({ factions });
      renderFactionList();
      Toast.show('Fazione eliminata', 'info');
    });
  };

  // ── Import da file ──
  const importCampaignFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const camp = Storage.importCampaign(ev.target.result);
        if (camp) {
          renderHomePage();
          Toast.show(`Importata: ${camp.name}`, 'success');
        } else {
          Toast.show('File non valido', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ── Init ──
  const init = () => {
    Debug.log('App.init() start');

    // Applica settings
    const settings = Storage.getSettings();
    applyTheme(settings.theme || 'dark');

    if (settings.sidebarCollapsed) {
      document.getElementById('sidebar')?.classList.add('collapsed');
      document.getElementById('main-content')?.classList.add('expanded');
    }

    // Ripristina campagna attiva
    const savedId = Storage.getActiveCampaignId();
    if (savedId) {
      const camp = Storage.getCampaign(savedId);
      if (camp) {
        setActiveCampaign(camp);
        Debug.log(`Ripristinata campagna attiva: ${camp.name}`);
      }
    }

    // Init moduli
    Dadi.init();

    // Pagina iniziale
    navigateTo('home');

    Debug.log('App.init() completato');
    Toast.show('DM Toolkit caricato ⚔️', 'success');
  };

  return {
    init,
    navigateTo,
    toggleTheme,
    toggleSidebar,
    getActiveCampaign,
    setActiveCampaign,
    reloadActiveCampaign,
    saveActiveCampaign,
    renderHomePage,
    renderCampaignPage,
    openCampaign,
    editCampaign,
    confirmDeleteCampaign,
    saveRecap,
    addQuest, editQuest, deleteQuest,
    renderQuestList,
    addTimelineEvent, deleteTimelineEvent,
    renderTimeline,
    addFaction, editFaction, deleteFaction,
    renderFactionList,
  };
})();

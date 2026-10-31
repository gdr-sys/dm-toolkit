/* ============================================================
   IMPORTA-CAMPAGNA.JS — "Importa da un'altra campagna": copia
   luoghi, fazioni, PNG, note Lore e tabelle casuali da un'altra
   campagna di questo dispositivo nella campagna aperta. Serve per
   una one shot o un secondo gruppo nello stesso mondo, senza
   riscrivere tutto. Le voci copiate sono indipendenti dall'originale
   (nuovo id); quelle con un nome gia' presente vengono saltate.
   Voce nel menu della Wiki (accanto a "Importa da foglio") e card
   nella pagina principale della Wiki.
   ============================================================ */

const ImportaCampagna = (() => {
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _nome = (x) => (x?.nome || x?.name || x?.titolo || '').trim();
  const _nuovoId = (p) => p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

  // tipo: [etichetta, funzione che legge l'elenco dalla campagna, prefisso id]
  const TIPI = {
    locations:      ['Luoghi', c => c.locations || [], 'loc'],
    factions:       ['Fazioni', c => c.factions || [], 'fac'],
    npcs:           ['PNG', c => c.npcs || [], 'npc'],
    lore:           ['Note Lore', c => c.wiki?.lore || [], 'n'],
    tabelleCasuali: ['Tabelle casuali', c => c.tabelleCasuali || [], 'tab'],
  };

  let _sorgenteId = null;

  const _altre = () => {
    const attiva = App.getActiveCampaign();
    return (Storage.getCampaigns() || []).filter(c => c.id !== attiva?.id);
  };

  const _assicuraModale = () => {
    if (document.getElementById('modal-importa-campagna')) return;
    const o = document.createElement('div');
    o.className = 'modal-overlay hidden';
    o.id = 'modal-importa-campagna';
    o.style.display = 'none';
    o.innerHTML =
      '<div class="modal" style="max-width:680px;">' +
        '<div class="modal-header"><h3 class="modal-title">Importa da un\'altra campagna</h3>' +
          '<button type="button" class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'importa-campagna\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
        '<div class="modal-body" id="ic-body"></div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-ghost" onclick="Modal.close(\'importa-campagna\')">Annulla</button>' +
          '<button type="button" class="btn btn-primary" style="margin-left:auto;" id="ic-importa" onclick="ImportaCampagna.importa()">Importa</button></div>' +
      '</div>';
    document.body.appendChild(o);
  };

  const _disegna = () => {
    const el = document.getElementById('ic-body');
    if (!el) return;
    const altre = _altre();
    const btn = document.getElementById('ic-importa');
    if (!altre.length) {
      el.innerHTML = '<div style="font-size:0.88rem;color:var(--text-secondary);line-height:1.6;">Su questo dispositivo non ci sono altre campagne da cui copiare. Crea o apri prima la campagna di origine.</div>';
      if (btn) btn.disabled = true;
      return;
    }
    if (btn) btn.disabled = false;
    if (!altre.find(c => c.id === _sorgenteId)) _sorgenteId = altre[0].id;
    const src = altre.find(c => c.id === _sorgenteId);
    const attiva = App.getActiveCampaign();
    el.innerHTML =
      '<div style="font-size:0.84rem;color:var(--text-secondary);line-height:1.55;margin-bottom:10px;">Copia nella campagna <strong>' + _esc(attiva.name) + '</strong> le voci che ti servono. Le copie sono indipendenti: modificarle qui non cambia l\'originale. Le voci con un nome già presente vengono saltate.</div>' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;flex-wrap:wrap;">Copia da' +
        '<select class="form-select" style="width:auto;font-size:0.85rem;" onchange="ImportaCampagna._sorgente(this.value)">' +
          altre.map(c => '<option value="' + c.id + '"' + (c.id === _sorgenteId ? ' selected' : '') + '>' + _esc(c.name) + '</option>').join('') +
        '</select></label>' +
      Object.entries(TIPI).map(([k, [etichetta, leggi]]) => {
        const voci = leggi(src).filter(_nome);
        if (!voci.length) return '';
        const presenti = new Set(leggi(attiva).map(x => _nome(x).toLowerCase()));
        return '<div style="margin-top:14px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span style="font-family:var(--font-display);font-size:0.88rem;">' + etichetta + ' <span style="font-size:0.75rem;color:var(--text-muted);">(' + voci.length + ')</span></span>' +
            '<button type="button" class="btn btn-ghost btn-sm" style="font-size:0.72rem;" onclick="ImportaCampagna._tutti(\'' + k + '\')">Tutti / nessuno</button>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:4px 12px;margin-top:4px;">' +
            voci.map(v => {
              const gia = presenti.has(_nome(v).toLowerCase());
              return '<label style="display:flex;align-items:center;gap:6px;font-size:0.84rem;cursor:' + (gia ? 'default' : 'pointer') + ';' + (gia ? 'opacity:0.5;' : '') + '" title="' + (gia ? 'Già presente in questa campagna' : '') + '">' +
                '<input type="checkbox" data-ic-tipo="' + k + '" value="' + _esc(v.id) + '"' + (gia ? ' disabled' : '') + '>' + _esc(_nome(v)) + (gia ? ' (c\'è già)' : '') + '</label>';
            }).join('') +
          '</div></div>';
      }).join('');
  };

  const apri = () => {
    if (!App.getActiveCampaign()) { Toast.show('Apri prima la campagna in cui importare', 'warning'); return; }
    _assicuraModale(); _disegna(); Modal.open('importa-campagna');
  };
  const _sorgente = (id) => { _sorgenteId = id; _disegna(); };
  const _tutti = (k) => {
    const box = [...document.querySelectorAll('#ic-body input[data-ic-tipo="' + k + '"]:not(:disabled)')];
    const tutti = box.every(b => b.checked);
    box.forEach(b => { b.checked = !tutti; });
  };

  const importa = () => {
    const src = _altre().find(c => c.id === _sorgenteId);
    const camp = App.getActiveCampaign();
    if (!src || !camp) return;
    const scelti = {};
    document.querySelectorAll('#ic-body input[data-ic-tipo]:checked').forEach(b => { (scelti[b.dataset.icTipo] = scelti[b.dataset.icTipo] || new Set()).add(b.value); });
    if (!Object.keys(scelti).length) { Toast.show('Scegli almeno una voce', 'warning'); return; }

    const patch = {};
    const mappaId = {}; // id originale -> id nuovo, per le tabelle collegate ai luoghi copiati
    let totale = 0;
    Object.entries(TIPI).forEach(([k, [, leggi, pref]]) => {
      if (!scelti[k]) return;
      const copie = leggi(src).filter(v => scelti[k].has(v.id)).map(v => {
        const id = _nuovoId(pref);
        mappaId[v.id] = id;
        totale++;
        const copia = JSON.parse(JSON.stringify(v));
        return { ...copia, id, aggiornatoAt: Date.now(), importatoDa: src.name };
      });
      if (k === 'lore') patch.wiki = { ...(camp.wiki || {}), lore: [...(camp.wiki?.lore || []), ...copie.map(n => ({ ...n, mondoId: null, mondoTipo: null }))] };
      else patch[k] = [...leggi(camp), ...copie];
    });
    // Le tabelle copiate restano collegate solo ai luoghi copiati anche loro
    if (patch.tabelleCasuali) {
      patch.tabelleCasuali = patch.tabelleCasuali.map(t => t.importatoDa ? { ...t, luoghi: (t.luoghi || []).map(id => mappaId[id]).filter(Boolean) } : t);
    }
    App.saveActiveCampaign(patch);
    Modal.close('importa-campagna');
    Toast.show(totale + (totale === 1 ? ' voce importata' : ' voci importate') + ' da "' + src.name + '"', 'success', 3000);
    try { WikiSections.renderCounters?.(); } catch (e) {}
  };

  const _iniettaMenu = () => {
    const subnav = document.getElementById('wiki-subnav');
    if (!subnav || document.getElementById('importa-campagna-trigger')) return;
    const btn = document.createElement('button');
    btn.id = 'importa-campagna-trigger';
    btn.className = 'nav-item nav-subitem';
    btn.style.cssText = 'padding:5px 8px;font-size:0.78rem;';
    btn.onclick = () => { apri(); try { closeMobileMenu?.(); } catch (e) {} };
    btn.innerHTML =
      '<span style="color:var(--text-muted);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></span>' +
      '<span class="nav-label">Importa da campagna</span>';
    const dopo = document.getElementById('wiki-import-trigger');
    if (dopo) dopo.insertAdjacentElement('afterend', btn); else subnav.appendChild(btn);
  };

  const _iniettaCard = () => {
    const vicino = document.querySelector('[onclick="WikiImport.open()"]');
    if (!vicino || document.getElementById('importa-campagna-card')) return;
    const card = document.createElement('div');
    card.id = 'importa-campagna-card';
    card.className = 'card';
    card.style.cssText = 'cursor:pointer;padding:12px 16px;display:flex;align-items:center;gap:10px;border-style:dashed;';
    card.onclick = apri;
    card.innerHTML =
      '<span style="color:var(--text-muted);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></span>' +
      '<div><div style="font-weight:600;font-size:0.82rem;">Importa da un\'altra campagna</div>' +
      '<div style="font-size:0.7rem;color:var(--text-muted);">Luoghi, fazioni, PNG e tabelle dello stesso mondo</div></div>';
    vicino.insertAdjacentElement('afterend', card);
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { _iniettaMenu(); _iniettaCard(); }, 300));

  return { apri, importa, _sorgente, _tutti };
})();

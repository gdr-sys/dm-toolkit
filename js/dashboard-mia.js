/* DM Toolkit — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   DASHBOARD-MIA.JS — Seconda vista della Dashboard: "La mia dashboard",
   dove il master sceglie quali card vedere e in che ordine.
   La Panoramica resta com'e'. Non duplica nulla: nasconde e riordina
   le card gia' presenti nella griglia (anche quelle aggiunte da altri
   moduli), riconoscendole dal titolo.
   Scelta delle card: campagna.dashboardMia.carte (si sincronizza con
   la campagna). Vista aperta (Panoramica / La mia): solo su questo
   dispositivo, per campagna.
   ============================================================ */

const DashboardMia = (() => {
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);
  const _griglia = () => document.querySelector('#page-campagna .dash-grid');
  const _carte = () => _camp()?.dashboardMia?.carte || [];
  const _chiave = (card) => (card.querySelector('.card-title')?.textContent || '').trim();
  // Anche le card che la Panoramica raccoglie in colonne (js/dashboard-nuova.js)
  const _tutteLeCard = () => [...(_griglia()?.querySelectorAll(':scope > .card, :scope > .dn-col > .card, :scope > .dn-col > .dn-split > .card') || [])].filter(c => _chiave(c));

  const _chiaveVista = () => 'dm_dash_vista_' + (_camp()?.id || '');
  const _vista = () => { try { return localStorage.getItem(_chiaveVista()) === 'mia' ? 'mia' : 'tutto'; } catch (e) { return 'tutto'; } };

  const _assicuraBarra = () => {
    const g = _griglia();
    if (!g) return null;
    let barra = document.getElementById('dash-mia-barra');
    if (barra) return barra;
    barra = document.createElement('div');
    barra.id = 'dash-mia-barra';
    barra.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:14px;';
    g.parentNode.insertBefore(barra, g);
    return barra;
  };

  const _disegnaBarra = () => {
    const barra = _assicuraBarra();
    if (!barra) return;
    const v = _vista();
    const tab = (id, nome) => '<button type="button" role="tab" aria-selected="' + (v === id) + '" class="btn btn-sm ' + (v === id ? 'btn-primary' : 'btn-ghost') + '" onclick="DashboardMia.vista(\'' + id + '\')">' + nome + '</button>';
    barra.innerHTML = '<div role="tablist" aria-label="Vista della Dashboard" style="display:flex;gap:6px;flex-wrap:wrap;">' + tab('tutto', 'Panoramica') + tab('mia', 'La mia dashboard') + '</div>' +
      (v === 'mia' ? '<button type="button" class="btn btn-secondary btn-sm" style="margin-left:auto;" onclick="DashboardMia.scegli()">Scegli cosa vedere</button>' : '');
  };

  let _occupato = false;
  const applica = () => {
    const g = _griglia();
    if (!g || !_camp() || _occupato) return;
    _occupato = true;
    try {
      _disegnaBarra();
      const mia = _vista() === 'mia';
      const scelte = _carte();
      let visibili = 0;
      _tutteLeCard().forEach(c => {
        const i = scelte.indexOf(_chiave(c));
        const fuori = mia && i === -1;
        c.classList.toggle('dash-mia-fuori', fuori);
        c.style.order = mia && i >= 0 ? String(i) : '';
        if (!fuori) visibili++;
      });
      let vuoto = document.getElementById('dash-mia-vuoto');
      if (mia && !visibili) {
        if (!vuoto) {
          vuoto = document.createElement('div');
          vuoto.id = 'dash-mia-vuoto';
          vuoto.className = 'card';
          vuoto.style.cssText = 'text-align:center;padding:28px 20px;margin-bottom:14px;';
          vuoto.innerHTML = '<div style="font-family:var(--font-display);font-size:1rem;margin-bottom:6px;">La tua dashboard è vuota</div>' +
            '<div style="font-size:0.88rem;color:var(--text-secondary);line-height:1.55;max-width:520px;margin:0 auto 12px;">Scegli solo le card che ti servono davvero, nell\'ordine che preferisci. La Panoramica resta com\'è.</div>' +
            '<button type="button" class="btn btn-primary btn-sm" onclick="DashboardMia.scegli()">Scegli cosa vedere</button>';
          g.parentNode.insertBefore(vuoto, g);
        }
        vuoto.style.display = '';
      } else if (vuoto) vuoto.style.display = 'none';
    } finally { _occupato = false; }
  };

  const vista = (v) => {
    try { localStorage.setItem(_chiaveVista(), v === 'mia' ? 'mia' : 'tutto'); } catch (e) {}
    applica();
    if (v === 'mia' && !_carte().length) scegli();
  };

  // ── Scelta delle card ──

  let _bozza = [];
  const _assicuraModale = () => {
    if (document.getElementById('modal-dash-mia')) return;
    const o = document.createElement('div');
    o.className = 'modal-overlay hidden';
    o.id = 'modal-dash-mia';
    o.style.display = 'none';
    o.innerHTML = '<div class="modal" style="max-width:520px;"><div class="modal-header"><h3 class="modal-title">La mia dashboard</h3>' +
      '<button type="button" class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'dash-mia\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="modal-body"><div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.5;margin-bottom:10px;">Spunta le card da vedere e mettile in ordine con le frecce: in alto quelle che guardi più spesso.</div><div id="dash-mia-lista"></div></div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-ghost" onclick="Modal.close(\'dash-mia\')">Annulla</button>' +
      '<button type="button" class="btn btn-primary" style="margin-left:auto;" onclick="DashboardMia._salva()">Salva</button></div></div>';
    document.body.appendChild(o);
  };

  const _disegnaLista = () => {
    const el = document.getElementById('dash-mia-lista');
    if (!el) return;
    el.innerHTML = _bozza.map((x, i) =>
      '<div style="display:flex;align-items:center;gap:10px;padding:7px 4px;border-bottom:1px solid var(--border);">' +
        '<label style="flex:1;display:flex;align-items:center;gap:10px;cursor:pointer;min-width:0;">' +
          '<input type="checkbox"' + (x.on ? ' checked' : '') + ' onchange="DashboardMia._spunta(' + i + ',this.checked)">' +
          '<span style="font-size:0.92rem;' + (x.on ? 'color:var(--text-primary);' : 'color:var(--text-muted);') + '">' + _esc(x.nome) + '</span></label>' +
        '<button type="button" class="btn btn-ghost btn-icon-sm" aria-label="Sposta su" title="Sposta su"' + (i === 0 ? ' disabled' : '') + ' onclick="DashboardMia._sposta(' + i + ',-1)">↑</button>' +
        '<button type="button" class="btn btn-ghost btn-icon-sm" aria-label="Sposta giù" title="Sposta giù"' + (i === _bozza.length - 1 ? ' disabled' : '') + ' onclick="DashboardMia._sposta(' + i + ',1)">↓</button>' +
      '</div>').join('');
  };

  const scegli = () => {
    if (!_camp()) return;
    const nomi = [...new Set(_tutteLeCard().map(_chiave))];
    const scelte = _carte().filter(n => nomi.includes(n));
    _bozza = [...scelte.map(n => ({ nome: n, on: true })), ...nomi.filter(n => !scelte.includes(n)).map(n => ({ nome: n, on: false }))];
    _assicuraModale();
    _disegnaLista();
    Modal.open('dash-mia');
  };
  const _spunta = (i, on) => {
    // Le spuntate restano in cima: la card va al confine fra spuntate e non spuntate
    const x = _bozza.splice(i, 1)[0];
    x.on = on;
    _bozza.splice(_bozza.filter(y => y.on).length, 0, x);
    _disegnaLista();
  };
  const _sposta = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= _bozza.length) return;
    [_bozza[i], _bozza[j]] = [_bozza[j], _bozza[i]];
    _disegnaLista();
  };
  const _salva = () => {
    App.saveActiveCampaign({ dashboardMia: { ...(_camp()?.dashboardMia || {}), carte: _bozza.filter(x => x.on).map(x => x.nome) } });
    Modal.close('dash-mia');
    try { localStorage.setItem(_chiaveVista(), 'mia'); } catch (e) {}
    applica();
  };

  // ── Avvio ──

  let _timer = null;
  const _piu_tardi = () => { clearTimeout(_timer); _timer = setTimeout(applica, 60); };

  const _aggancia = () => {
    const st = document.createElement('style');
    st.textContent = '#page-campagna .dash-grid .dash-mia-fuori { display:none !important; }';
    document.head.appendChild(st);
    if (typeof App !== 'undefined') {
      const nav = App.navigateTo;
      App.navigateTo = function (pageId) { const r = nav.apply(App, arguments); if (pageId === 'campagna') { setTimeout(applica, 150); setTimeout(applica, 600); } return r; };
    }
    // Altri moduli aggiungono o ricreano card nella griglia: si riapplica la vista
    const g = _griglia();
    if (g) new MutationObserver(_piu_tardi).observe(g, { childList: true });
    setTimeout(applica, 800);
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(_aggancia, 300));

  return { applica, vista, scegli, _spunta, _sposta, _salva };
})();

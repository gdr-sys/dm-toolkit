/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   NEGOZI-LUOGO.JS — "Salva nel Luogo" per il generatore di negozi:
   un negozio generato resta legato a un Luogo con gli stessi oggetti
   e prezzi, cosi' tornando in citta' i PG ritrovano lo stesso
   negozio invece di uno nuovo ogni volta.
   Il pulsante compare sotto il risultato del generatore; i negozi
   salvati si vedono nella scheda del Luogo (Wiki).
   Dati in location.negozi = [{ id, nome, oggetti: [{ nome, qta, prezzo }], creatoAt }].
   ============================================================ */

const NegoziLuogo = (() => {
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);
  const _luoghi = () => _camp()?.locations || [];
  const _nomeLuogo = (l) => (l?.nome || l?.name || 'Senza nome').trim();
  let _ultimo = null;

  // Legge il negozio appena generato dal risultato del generatore
  const _leggiRisultato = () => {
    const el = document.getElementById('gen-shop-result');
    if (!el) return null;
    const righe = [...el.querySelectorAll('tbody tr')];
    if (!righe.length) return null;
    const testa = el.querySelector('div > span')?.cloneNode(true);
    testa?.querySelectorAll('.badge').forEach(b => b.remove());
    const nome = (testa?.textContent || 'Negozio').trim();
    const oggetti = righe.map(tr => {
      const c = tr.querySelectorAll('td');
      const n = c[0]?.querySelector('[data-nome]')?.dataset.nome || (c[0]?.textContent || '').replace(/🔗/g, '').trim();
      return { nome: n, qta: (c.length > 2 ? c[1]?.textContent : '').trim(), prezzo: (c[c.length - 1]?.textContent || '').trim() };
    }).filter(o => o.nome);
    return oggetti.length ? { nome, oggetti } : null;
  };

  const _aggiungiPulsante = () => {
    const el = document.getElementById('gen-shop-result');
    _ultimo = _leggiRisultato();
    if (!el || !_ultimo || el.querySelector('.nl-salva')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-ghost btn-sm nl-salva';
    b.style.marginTop = '8px';
    b.textContent = 'Salva nel Luogo…';
    b.title = 'Il negozio resta legato a un Luogo con gli stessi oggetti e prezzi';
    b.onclick = scegli;
    el.appendChild(b);
  };

  // ── Scelta del Luogo ──

  const _assicuraModale = () => {
    if (document.getElementById('modal-negozio-luogo')) return;
    const o = document.createElement('div');
    o.className = 'modal-overlay hidden';
    o.id = 'modal-negozio-luogo';
    o.style.display = 'none';
    o.innerHTML = '<div class="modal" style="max-width:460px;"><div class="modal-header"><h3 class="modal-title">Salva il negozio in un Luogo</h3>' +
      '<button type="button" class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'negozio-luogo\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label class="form-label" for="nl-nome">Nome del negozio</label><input id="nl-nome" type="text" class="form-input" autocomplete="off"></div>' +
        '<div class="form-group" style="margin-bottom:0;"><label class="form-label" for="nl-luogo">Luogo</label><select id="nl-luogo" class="form-select"></select></div>' +
      '</div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-ghost" onclick="Modal.close(\'negozio-luogo\')">Annulla</button>' +
        '<button type="button" class="btn btn-primary" style="margin-left:auto;" onclick="NegoziLuogo._salva()">Salva</button></div></div>';
    document.body.appendChild(o);
  };

  const scegli = () => {
    if (!_camp()) { Toast.show('Apri prima una campagna', 'warning'); return; }
    if (!_ultimo) return;
    const luoghi = [..._luoghi()].sort((a, b) => _nomeLuogo(a).localeCompare(_nomeLuogo(b), 'it'));
    if (!luoghi.length) { Toast.show('Non hai ancora Luoghi: creane uno nella Wiki', 'warning'); return; }
    _assicuraModale();
    document.getElementById('nl-nome').value = _ultimo.nome;
    document.getElementById('nl-luogo').innerHTML = luoghi.map(l => '<option value="' + _esc(l.id) + '">' + _esc(_nomeLuogo(l)) + '</option>').join('');
    Modal.open('negozio-luogo');
  };

  const _salva = () => {
    const id = document.getElementById('nl-luogo').value;
    const nome = document.getElementById('nl-nome').value.trim() || _ultimo.nome;
    const negozio = { id: 'neg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), nome, oggetti: _ultimo.oggetti, creatoAt: Date.now() };
    const locations = _luoghi().map(l => l.id === id ? { ...l, negozi: [...(l.negozi || []), negozio], aggiornatoAt: Date.now() } : l);
    App.saveActiveCampaign({ locations });
    Modal.close('negozio-luogo');
    const luogo = locations.find(l => l.id === id);
    Toast.show('"' + nome + '" salvato in ' + _nomeLuogo(luogo), 'success', 2500);
    const b = document.querySelector('#gen-shop-result .nl-salva');
    if (b) { b.disabled = true; b.textContent = 'Salvato in ' + _nomeLuogo(luogo); }
  };

  const rimuovi = (locId, negId) => {
    const l = _luoghi().find(x => x.id === locId);
    const n = (l?.negozi || []).find(x => x.id === negId);
    if (!n) return;
    openConfirmModal('Rimuovere il negozio?', '"' + n.nome + '" non sarà più legato a ' + _nomeLuogo(l) + '.', () => {
      App.saveActiveCampaign({ locations: _luoghi().map(x => x.id === locId ? { ...x, negozi: (x.negozi || []).filter(y => y.id !== negId) } : x) });
      try { WikiSections.openCard('luoghi', locId); } catch (e) {}
    }, 'Rimuovi');
  };

  // ── Blocco nella scheda Luogo ──

  const blocco = (locId) => {
    const negozi = _luoghi().find(l => l.id === locId)?.negozi || [];
    if (!negozi.length) return '';
    return '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:16px;">' +
      '<div style="font-family:var(--font-display);font-size:0.85rem;color:var(--text-secondary);margin-bottom:4px;">Negozi</div>' +
      negozi.map(n => '<details style="border-top:1px solid var(--border);padding:6px 0;">' +
        '<summary style="cursor:pointer;display:flex;align-items:center;gap:8px;"><span style="flex:1;font-size:0.9rem;color:var(--text-primary);">' + _esc(n.nome) + '</span>' +
          '<span style="font-size:0.75rem;color:var(--text-muted);">' + n.oggetti.length + ' oggetti</span>' +
          '<button type="button" class="btn btn-ghost btn-sm" style="font-size:0.72rem;" onclick="event.preventDefault();NegoziLuogo.rimuovi(\'' + locId + '\',\'' + n.id + '\')">Rimuovi</button></summary>' +
        '<table style="width:100%;border-collapse:collapse;font-size:0.82rem;margin-top:6px;">' +
          n.oggetti.map(o => '<tr><td style="padding:3px 0;border-bottom:1px solid var(--border);"><span style="cursor:pointer;color:var(--accent-secondary-text);" data-nome="' + _esc(o.nome) + '" onclick="CompendioCache.openItem(this.dataset.nome)" title="Apri nel Compendio">' + _esc(o.nome) + '</span></td>' +
            '<td style="padding:3px 6px;border-bottom:1px solid var(--border);text-align:center;color:var(--text-muted);font-family:var(--font-mono);">' + _esc(o.qta) + '</td>' +
            '<td style="padding:3px 0;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);color:var(--text-secondary);">' + _esc(o.prezzo) + '</td></tr>').join('') +
        '</table></details>').join('') +
    '</div>';
  };

  // ── Aggancio al generatore ──

  const _aggancia = () => {
    if (typeof Generatori === 'undefined' || !Generatori.rollShop) return;
    const orig = Generatori.rollShop;
    Generatori.rollShop = async function () {
      const r = await orig.apply(Generatori, arguments);
      _aggiungiPulsante();
      return r;
    };
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(_aggancia, 300));

  return { scegli, rimuovi, blocco, _salva };
})();

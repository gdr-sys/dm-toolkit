/* Pocket GM Screen (già DM Toolkit) — © 2026 Noemi Marcolini. Tutti i diritti riservati. Vedi LICENSE. */
/* ============================================================
   AVVIO-SESSIONE.JS — Avvio guidato della sessione, facoltativo:
   si attiva da Impostazioni (preferenza di questo dispositivo).
   Il compagno di "Chiudi la sessione": prima di iniziare, in un
   colpo d'occhio, cosa leggere e cosa ricordare, preso dai dati
   della campagna:
     1. il "Previously On…" da leggere ai giocatori
     2. la sessione pianificata: gancio d'apertura, obiettivi,
        luoghi e PNG previsti
     3. cosa preme: clock attivi e ganci rimasti aperti
     4. segreti ancora da far emergere
     5. al tavolo: linee e veli della Sessione Zero, i PG presenti
   Attivo: pulsante "Avvia la sessione" in Sessione Live e proposta
   automatica la prima volta che si apre Sessione Live nel giorno.
   Disattivo: nessun pulsante, nessuna proposta.
   ============================================================ */

const AvvioSessione = (() => {
  const KEY = 'dm_avvio_guidato';
  const KEY_GIORNO = 'dm_avvio_guidato_giorno';
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _camp = () => (typeof App !== 'undefined' ? App.getActiveCampaign() : null);
  const _leggi = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const _scrivi = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const attivo = () => _leggi(KEY) === '1';
  const _testo = (t) => _esc(String(t || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim()).replace(/\n/g, '<br>');

  // ── Impostazione (in Impostazioni, sotto "Schermo sempre acceso") ──

  const _assicuraImpostazione = () => {
    if (document.getElementById('avvio-guidato-impost')) { _aggiornaImpostazione(); return; }
    const ancora = document.getElementById('wake-lock-desc')?.parentElement?.parentElement;
    if (!ancora) return;
    const el = document.createElement('div');
    el.id = 'avvio-guidato-impost';
    el.style.marginTop = '14px';
    el.innerHTML =
      '<div style="margin-bottom:8px;"><div style="font-size:0.88rem;font-weight:600;">Avvio guidato della sessione</div>' +
        '<div style="font-size:0.72rem;color:var(--text-muted);">Prima di iniziare: "Previously On…", sessione pianificata, clock, segreti e linee della Sessione Zero</div></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
        '<button type="button" class="btn btn-ghost btn-sm avvio-guidato-btn" data-v="1" style="font-size:0.78rem;" onclick="AvvioSessione.imposta(true)">Attivo</button>' +
        '<button type="button" class="btn btn-ghost btn-sm avvio-guidato-btn" data-v="0" style="font-size:0.78rem;" onclick="AvvioSessione.imposta(false)">Disattivato</button>' +
      '</div>';
    ancora.insertAdjacentElement('afterend', el);
    _aggiornaImpostazione();
  };
  const _aggiornaImpostazione = () => {
    document.querySelectorAll('.avvio-guidato-btn').forEach(b => {
      const on = (b.dataset.v === '1') === attivo();
      b.classList.toggle('btn-primary', on);
      b.classList.toggle('btn-ghost', !on);
      b.setAttribute('aria-pressed', String(on));
    });
  };
  const imposta = (on) => {
    _scrivi(KEY, on ? '1' : '0');
    _aggiornaImpostazione();
    _assicuraPulsante();
    Toast.show(on ? 'Avvio guidato attivo: lo trovi in Sessione Live' : 'Avvio guidato disattivato', 'info', 2500);
  };

  // ── Pulsante in Sessione Live, prima di "Chiudi la sessione" ──

  const _assicuraPulsante = () => {
    let b = document.getElementById('avvio-btn');
    if (!attivo()) { b?.remove(); return; }
    if (b) return;
    const nuova = document.querySelector('#page-sessione [onclick="SessioniLog.newSession()"]');
    if (!nuova) return;
    b = document.createElement('button');
    b.id = 'avvio-btn';
    b.type = 'button';
    b.className = 'btn btn-secondary btn-sm';
    b.style.fontSize = '0.78rem';
    b.textContent = 'Avvia la sessione';
    b.title = 'Cosa leggere e cosa ricordare prima di iniziare';
    b.onclick = () => apri();
    nuova.insertAdjacentElement('afterend', b);
  };

  // ── Contenuto ──

  const _sezione = (n, titolo, corpo) =>
    '<section style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">' +
      '<label style="flex-shrink:0;padding-top:2px;" title="Fatto"><input type="checkbox" aria-label="Fatto: ' + _esc(titolo) + '"></label>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-family:var(--font-display);font-size:0.95rem;margin-bottom:6px;">' + n + '. ' + titolo + '</div>' +
        '<div style="font-size:0.88rem;line-height:1.6;color:var(--text-secondary);">' + corpo + '</div>' +
      '</div>' +
    '</section>';
  const _vuoto = (t) => '<span style="color:var(--text-muted);">' + t + '</span>';
  const _riga = (etichetta, valore) => valore ? '<div><span style="color:var(--text-muted);">' + etichetta + ':</span> ' + _testo(valore) + '</div>' : '';

  const _contenuto = () => {
    const camp = _camp();
    const sessioni = [...(camp.sessioni_log || [])].sort((a, b) => (a.numero || 0) - (b.numero || 0));
    const giocate = sessioni.filter(s => s.stato === 'giocata');
    const ultima = giocate[giocate.length - 1];
    const prossima = sessioni.find(s => s.stato !== 'giocata');

    // 1. Previously On
    const po = (camp.previouslyOnArchive || []).slice(-1)[0]?.testo || (ultima?.recap ? 'Nella sessione precedente:\n\n' + ultima.recap : '');
    const s1 = po
      ? '<div id="avvio-po" style="white-space:pre-line;background:var(--bg-secondary);border-radius:var(--radius-sm);padding:10px 12px;color:var(--text-primary);">' + _esc(po) + '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="AvvioSessione.copia()">Copia il testo</button>'
      : _vuoto('Nessun riassunto ancora: lo crea "Chiudi la sessione" alla fine di ogni giocata.');

    // 2. Sessione pianificata
    const s2 = prossima
      ? '<div style="color:var(--text-primary);margin-bottom:4px;">Sessione ' + _esc(prossima.numero || '') + (prossima.titolo ? ' — ' + _esc(prossima.titolo) : '') + '</div>' +
        (_riga('Gancio d\'apertura', prossima.ganci_entrata) + _riga('Obiettivi', prossima.obiettivi) + _riga('Luoghi previsti', prossima.luoghi_previsti) +
          _riga('PNG previsti', prossima.png_previsti) + _riga('Note di preparazione', prossima.noteprep || prossima.notePrep || prossima.beat_prep) ||
          _vuoto('La sessione non ha ancora note di preparazione.'))
      : _vuoto('Nessuna sessione pianificata.') + ' <button type="button" class="btn btn-ghost btn-sm" onclick="Modal.close(\'avvio-sessione\');SessioniLog.newSession()">Pianificala</button>';

    // 3. Cosa preme
    const clocks = (camp.clocks || []).filter(c => c.attivo !== false).map(c => {
      const pieni = c.current != null ? c.current : (c.progresso || 0), tot = c.max || c.totale || 8;
      return '<div>' + _esc(c.nome || c.name || 'Clock') + ' <span style="color:var(--text-muted);">' + pieni + '/' + tot + '</span>' + (c.nota ? ' — ' + _esc(c.nota) : '') + '</div>';
    }).join('');
    const mosse = typeof TurniFazione !== 'undefined' ? TurniFazione.ultimeMosse() : '';
    const s3 = (clocks ? '<div style="margin-bottom:6px;">' + clocks + '</div>' : '') +
      (ultima?.ganci ? _riga('Ganci rimasti aperti', ultima.ganci) : '') +
      (mosse ? '<div style="margin-top:6px;"><span style="color:var(--text-muted);">Il mondo si è mosso:</span>' + mosse + '</div>' : '') ||
      _vuoto('Nessun clock attivo e nessun gancio aperto.');

    // 4. Segreti
    const segreti = (camp.segreti || []).filter(s => !s.scoperto);
    const s4 = segreti.length
      ? segreti.map(s => {
          const ind = s.indizi || [], trovati = ind.filter(i => i.trovato).length;
          const dove = ind.filter(i => !i.trovato && i.dove?.nome).map(i => _esc(i.dove.nome)).slice(0, 4).join(', ');
          return '<div style="margin-bottom:4px;"><span style="color:var(--text-primary);">' + _esc(s.titolo) + '</span> <span style="color:var(--text-muted);">' + trovati + '/' + ind.length + ' indizi</span>' +
            (dove ? '<div style="font-size:0.82rem;color:var(--text-muted);">Indizi da trovare in: ' + dove + '</div>' : '') + '</div>';
        }).join('')
      : _vuoto('Nessun segreto da far emergere.');

    // 5. Al tavolo
    const sz = camp.sessioneZero || {};
    const pg = (camp.pg || []).map(p => _esc(p.nome || p.name)).filter(Boolean);
    const s5 = ((sz.linee || []).length ? '<div><span style="color:var(--text-muted);">Linee:</span> ' + sz.linee.map(_esc).join(', ') + '</div>' : '') +
      ((sz.veli || []).length ? '<div><span style="color:var(--text-muted);">Veli:</span> ' + sz.veli.map(_esc).join(', ') + '</div>' : '') +
      (pg.length ? '<div><span style="color:var(--text-muted);">PG:</span> ' + pg.join(', ') + ' — dai a ognuno almeno un momento.</div>' : '') ||
      _vuoto('Nessuna linea o velo: se non l\'avete fatta, la Sessione Zero aiuta a concordarli.');

    return _sezione(1, 'Leggi il "Previously On…"', s1) +
      _sezione(2, 'La sessione di oggi', s2) +
      _sezione(3, 'Cosa preme', s3) +
      _sezione(4, 'Segreti da far emergere', s4) +
      _sezione(5, 'Al tavolo', s5);
  };

  // ── Modale ──

  const _assicuraModale = () => {
    if (document.getElementById('modal-avvio-sessione')) return;
    const o = document.createElement('div');
    o.className = 'modal-overlay hidden';
    o.id = 'modal-avvio-sessione';
    o.style.display = 'none';
    o.innerHTML = '<div class="modal" style="max-width:680px;"><div class="modal-header"><h3 class="modal-title">Avvia la sessione</h3>' +
      '<button type="button" class="btn btn-ghost btn-icon-sm" onclick="Modal.close(\'avvio-sessione\')" aria-label="Chiudi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="modal-body" id="avvio-body" style="padding-top:4px;"></div>' +
      '<div class="modal-footer"><span style="font-size:0.75rem;color:var(--text-muted);">Si disattiva da Impostazioni</span>' +
        '<button type="button" class="btn btn-primary" style="margin-left:auto;" onclick="AvvioSessione.via()">Si gioca</button></div></div>';
    document.body.appendChild(o);
  };

  const apri = () => {
    if (!_camp()) return;
    _assicuraModale();
    document.getElementById('avvio-body').innerHTML = _contenuto();
    Modal.open('avvio-sessione');
  };
  const via = () => {
    Modal.close('avvio-sessione');
    Toast.show('Buona sessione!', 'success', 2000);
  };
  const copia = async () => {
    const t = document.getElementById('avvio-po')?.innerText || '';
    try { await navigator.clipboard.writeText(t); Toast.show('Testo copiato', 'success', 1500); } catch (e) { Toast.show('Copia non riuscita: selezionalo a mano', 'warning'); }
  };

  // Proposta automatica: la prima volta che si apre Sessione Live nel giorno, per campagna
  const _forseProponi = () => {
    const camp = _camp();
    if (!attivo() || !camp) return;
    const oggi = new Date().toISOString().slice(0, 10) + '|' + camp.id;
    if (_leggi(KEY_GIORNO) === oggi) return;
    _scrivi(KEY_GIORNO, oggi);
    apri();
  };

  const _aggancia = () => {
    if (typeof App !== 'undefined') {
      const nav = App.navigateTo;
      App.navigateTo = function (pageId) {
        const r = nav.apply(App, arguments);
        if (pageId === 'sessione') setTimeout(() => { _assicuraPulsante(); _forseProponi(); }, 300);
        return r;
      };
    }
    if (typeof Settings !== 'undefined' && Settings.open) {
      const so = Settings.open;
      Settings.open = function () { const r = so.apply(Settings, arguments); setTimeout(_assicuraImpostazione, 50); return r; };
    }
    _assicuraImpostazione();
    _assicuraPulsante();
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(_aggancia, 300));

  return { apri, via, copia, imposta, attivo };
})();

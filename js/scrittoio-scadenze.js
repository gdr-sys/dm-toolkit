/* Scadenze dai documenti dello Scrittoio: salvando nella Wiki una taglia, un editto,
   un avviso, un contratto o una lettera si puo' mettere la sua scadenza nel Calendario.
   La scadenza compare poi nel calendario, tra le prossime scadenze e nel viaggio.
   Usa: Scrittoio.stato() / azione / _confermaDocumento, Calendario, CalendarioUI. */
const ScrittoioScadenze = (() => {
  const CON_SCADENZA = {
    taglia:    { giorni: 14, categoria: 'sociale',  cosa: 'Taglia', ph: 'es. Il ricercato fugge oltre il confine' },
    editto:    { giorni: 30, categoria: 'politico', cosa: 'Editto', ph: 'es. L’editto entra in vigore: le porte si chiudono al tramonto' },
    avviso:    { giorni: 7,  categoria: 'sociale',  cosa: 'Avviso', ph: 'es. Nessuno risponde e il lavoro va a un’altra compagnia' },
    contratto: { giorni: 10, categoria: 'sociale',  cosa: 'Contratto', ph: 'es. Il committente ritira l’offerta e non paga' },
    lettera:   { giorni: 7,  categoria: '',         cosa: 'Lettera', ph: 'es. Chi l’ha scritta non aspetta più una risposta' },
  };
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const $ = (id) => document.getElementById(id);
  const _cal = () => (typeof Calendario !== 'undefined' ? Calendario.get() : null);
  const _attivo = (cal) => !!(cal && cal.mesi && cal.mesi.length);

  const _giorniMese = (cal, m, a) => (Calendario.giorniMese ? Calendario.giorniMese(cal, m, a) : (cal.mesi[m]?.giorni || 30));
  const _opzGiorni = (cal, m, a, scelto) => Array.from({ length: _giorniMese(cal, m, a) }, (_, i) => '<option value="' + (i + 1) + '"' + (i + 1 === scelto ? ' selected' : '') + '>' + (i + 1) + '</option>').join('');

  const _blocco = (cal, cfg) => {
    const d = Calendario.advance(cal, 'giorni', cfg.giorni);
    return '<div class="ss-blocco" style="margin:4px 0 10px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-secondary);">' +
      '<label class="carto-spunta" for="ss-attiva" style="margin:0;"><input type="checkbox" id="ss-attiva" onchange="document.getElementById(\'ss-campi\').hidden=!this.checked"><span>Aggiungi una <strong>scadenza</strong> al calendario</span></label>' +
      '<div id="ss-campi" hidden style="margin-top:10px;">' +
        '<div class="form-label" style="margin-bottom:4px;">Scade il</div>' +
        '<div style="display:flex;gap:6px;margin-bottom:8px;">' +
          '<select id="ss-giorno" class="form-select" style="width:auto;" aria-label="Giorno">' + _opzGiorni(cal, d.mese, d.anno, d.giorno) + '</select>' +
          '<select id="ss-mese" class="form-select" style="flex:1;min-width:0;" aria-label="Mese" onchange="ScrittoioScadenze._mese()">' + cal.mesi.map((m, i) => '<option value="' + i + '"' + (i === d.mese ? ' selected' : '') + '>' + esc(m.it || m.nome) + '</option>').join('') + '</select>' +
          '<input id="ss-anno" type="number" class="form-input" style="width:90px;" value="' + d.anno + '" aria-label="Anno" onchange="ScrittoioScadenze._mese()">' +
        '</div>' +
        '<div class="text-muted" style="font-size:0.78rem;margin:-2px 0 8px;">Oggi nel mondo è il ' + esc(Calendario.formatDate(cal, { giorno: cal.giorno, mese: cal.mese, anno: cal.anno })) + '</div>' +
        '<label class="form-label" for="ss-conseguenza">Se scade senza che il party intervenga, cosa succede?</label>' +
        '<input id="ss-conseguenza" type="text" class="form-input" autocomplete="off" placeholder="' + esc(cfg.ph) + '">' +
      '</div></div>';
  };

  const _mese = () => {
    const cal = _cal(); if (!_attivo(cal)) return;
    const m = parseInt($('ss-mese')?.value, 10) || 0, a = parseInt($('ss-anno')?.value, 10) || cal.anno;
    const g = Math.min(parseInt($('ss-giorno')?.value, 10) || 1, _giorniMese(cal, m, a));
    if ($('ss-giorno')) $('ss-giorno').innerHTML = _opzGiorni(cal, m, a, g);
  };

  // PNG, fazioni e luoghi nominati nel documento: diventano i collegamenti dell'evento
  const _entita = (op) => {
    const camp = App.getActiveCampaign() || {};
    const testo = [op.titolo, op.soggetto, op.corpo, op.firma, op.premio].filter(Boolean).join(' ').toLowerCase();
    const out = [];
    [['png', camp.npcs], ['fazioni', camp.factions], ['luoghi', camp.locations]].forEach(([tipo, lista]) => (lista || []).forEach(x => {
      const nome = (x.nome || x.name || '').trim();
      if (nome.length > 2 && testo.includes(nome.toLowerCase())) out.push({ tipo, id: x.id, nome });
    }));
    return out.slice(0, 6);
  };

  const _aggancia = () => {
    if (typeof Scrittoio === 'undefined' || Scrittoio._scadenzeAgganciate || !Scrittoio.stato) return;
    Scrittoio._scadenzeAgganciate = true;

    const origAzione = Scrittoio.azione;
    Scrittoio.azione = function () {
      const r = origAzione.apply(this, arguments);
      try {
        const { voce } = Scrittoio.stato(), cfg = CON_SCADENZA[voce], cal = _cal();
        const corpo = $('sc-az-corpo');
        if (cfg && _attivo(cal) && corpo && $('sc-az-nome') && !$('ss-attiva')) {
          const prima = corpo.querySelector('.carto-nota');
          if (prima) prima.insertAdjacentHTML('beforebegin', _blocco(cal, cfg)); else corpo.insertAdjacentHTML('beforeend', _blocco(cal, cfg));
        }
      } catch (e) {}
      return r;
    };

    const origConferma = Scrittoio._confermaDocumento;
    Scrittoio._confermaDocumento = async function () {
      // I valori si leggono prima: dopo il salvataggio la finestra si chiude
      const voluta = !!$('ss-attiva')?.checked;
      const data = voluta ? { giorno: parseInt($('ss-giorno')?.value, 10) || 1, mese: parseInt($('ss-mese')?.value, 10) || 0, anno: parseInt($('ss-anno')?.value, 10) || 0 } : null;
      const conseguenza = ($('ss-conseguenza')?.value || '').trim();
      const prima = Scrittoio.stato().salvato;
      const r = await origConferma.apply(this, arguments);
      const dopo = Scrittoio.stato();
      const salvato = dopo.salvato && dopo.salvato !== prima ? dopo.salvato : null;
      if (voluta && data && salvato && typeof CalendarioUI !== 'undefined' && CalendarioUI.saveEventi) {
        const cfg = CON_SCADENZA[dopo.voce] || { cosa: 'Documento', categoria: '' };
        const cal = _cal();
        const ev = {
          id: 'cev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
          titolo: cfg.cosa + ': ' + salvato.nome,
          descrizione: '<p>Dal documento «' + esc(salvato.nome) + '» dello Scrittoio (Wiki › Lore).</p>',
          tipo: 'deadline', layer: 'campagna', categoria: cfg.categoria,
          data, ripete: '', entita: _entita(dopo.opera || {}),
          promemoriaGiorni: 3, conseguenza, completata: false,
          creatoAt: Date.now(), aggiornatoAt: Date.now(),
        };
        CalendarioUI.saveEventi([...CalendarioUI._getEventi(), ev]);
        try { if (document.getElementById('calendario-tab-mese')?.offsetParent) CalendarioUI._renderMese(); } catch (e) {}
        Toast.show('Scadenza nel calendario: ' + Calendario.formatDate(cal, data), 'success', 3500);
      }
      return r;
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _aggancia); else _aggancia();

  return { _mese };
})();

/* Scrittura unica: un solo editor in stile Word per tutti i testi lunghi dell'app,
   e un solo modo di collegare (pulsante Collega o @ mentre si scrive).

   - Testo.html(v)      → HTML pulito da mostrare (accetta anche il vecchio testo semplice)
   - Testo.mostra(v)    → come html(), piu' i collegamenti attivi ([[...]], @Nome, #tag dei testi vecchi)
   - Testo.semplice(v)  → solo testo, per Gazzetta, riassunti, esportazioni, ricerche
   - EditorTesto.monta(textarea) → la textarea resta nascosta e continua a dare/ricevere .value,
     cosi' il codice che salva e carica i campi non cambia
   - EditorTesto.montaDiv(div)   → stessa barra su un contenteditable gia' esistente

   I campi da trasformare sono in CAMPI_RICCHI: quelli nuovi che compaiono dopo (schede del
   Mondo, finestre aperte al volo) vengono presi da un MutationObserver. */

const Testo = (() => {
  const TAG_OK = new Set(['B','STRONG','I','EM','U','S','STRIKE','DEL','P','DIV','BR','H1','H2','H3','H4',
    'UL','OL','LI','BLOCKQUOTE','SPAN','FONT','MARK','HR','IMG','A','TABLE','THEAD','TBODY','TR','TD','TH',
    'SUB','SUP','CODE','PRE']);
  const TAG_VIA = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','META','LINK','TITLE','HEAD','NOSCRIPT',
    'TEMPLATE','SVG','MATH','FORM','INPUT','BUTTON','SELECT','TEXTAREA','XML']);
  const STILI_OK = ['color','background-color','text-align','font-weight','font-style','text-decoration','text-decoration-line'];
  const CLASSI_OK = /^(nc-|wiki-|ws-)/;

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const haTag = (v) => /<\/?[a-z][^>]*>/i.test(String(v || ''));

  const _pulisciNodo = (nodo) => {
    [...nodo.childNodes].forEach(n => {
      if (n.nodeType === 8) { n.remove(); return; }            // commenti (Word ne mette tanti)
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toUpperCase().replace(/^[A-Z]+:/, 'XML');
      if (TAG_VIA.has(tag)) { n.remove(); return; }
      _pulisciNodo(n);
      if (!TAG_OK.has(tag)) { n.replaceWith(...n.childNodes); return; }
      [...n.attributes].forEach(a => {
        const nome = a.name.toLowerCase(), val = a.value;
        if (nome === 'style') {
          const tenuti = val.split(';').map(x => x.trim()).filter(x => {
            const k = x.split(':')[0]?.trim().toLowerCase();
            return STILI_OK.includes(k) && !/url\(|expression/i.test(x);
          });
          if (tenuti.length) n.setAttribute('style', tenuti.join('; ')); else n.removeAttribute('style');
        } else if (nome === 'class') {
          const c = val.split(/\s+/).filter(x => CLASSI_OK.test(x));
          if (c.length) n.setAttribute('class', c.join(' ')); else n.removeAttribute('class');
        } else if (/^data-(link|tipo|id|tag|name)$/.test(nome)) {
          // tenuti: servono ai collegamenti
        } else if (nome === 'color' && tag === 'FONT') {
        } else if (nome === 'src' && tag === 'IMG') {
          if (!/^(https?:|data:image\/)/i.test(val.trim())) n.remove();
        } else if (nome === 'alt' && tag === 'IMG') {
        } else if (nome === 'href' && tag === 'A') {
          if (!/^(https?:|mailto:)/i.test(val.trim())) n.removeAttribute('href');
          else { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener'); }
        } else if ((nome === 'colspan' || nome === 'rowspan') && (tag === 'TD' || tag === 'TH')) {
        } else if (!(nome === 'target' || nome === 'rel')) {
          n.removeAttribute(a.name);
        }
      });
    });
  };

  // HTML sicuro da mettere in pagina. Il testo semplice dei campi vecchi diventa HTML con gli a capo.
  const html = (v) => {
    if (v == null || v === '') return '';
    const s = String(v);
    if (!haTag(s)) return esc(s).replace(/\r?\n/g, '<br>');
    const doc = new DOMParser().parseFromString('<body>' + s + '</body>', 'text/html');
    _pulisciNodo(doc.body);
    return doc.body.innerHTML;
  };

  // Solo testo: a capo dove finiscono paragrafi e righe, "- " davanti alle voci di elenco,
  // i collegamenti diventano il nome (senza @).
  const semplice = (v) => {
    if (v == null || v === '') return '';
    const s = String(v);
    if (!haTag(s)) return s;
    const doc = new DOMParser().parseFromString('<body>' + s + '</body>', 'text/html');
    doc.querySelectorAll('script,style').forEach(n => n.remove());
    doc.querySelectorAll('br').forEach(n => n.replaceWith('\n'));
    doc.querySelectorAll('li').forEach(n => { n.prepend('- '); n.append('\n'); });
    doc.querySelectorAll('p,div,h1,h2,h3,h4,blockquote,tr,pre').forEach(n => n.append('\n'));
    doc.querySelectorAll('.nc-wikilink').forEach(n => { n.textContent = n.textContent.replace(/^@/, ''); });
    return (doc.body.textContent || '').replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  };

  const vuoto = (v) => !semplice(v).trim() && !/<img/i.test(String(v || ''));

  // Come html(), ma i testi vecchi con [[Nome]], @Nome e #tag diventano collegamenti attivi.
  // Si lavora nodo di testo per nodo di testo, cosi' un "#" dentro uno stile non viene toccato.
  const mostra = (v) => {
    const h = html(v);
    if (!h) return '';
    const parse = (typeof WikiSections !== 'undefined' && WikiSections._parseLinks) ? WikiSections._parseLinks : null;
    if (!parse || !/\[\[|@|#/.test(h)) return h;
    const box = document.createElement('div');
    box.innerHTML = h;
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    const nodi = [];
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n.parentElement?.closest('.nc-wikilink,.ws-link,.nc-tag,a,code,pre')) continue;
      if (/\[\[|@|#/.test(n.nodeValue)) nodi.push(n);
    }
    nodi.forEach(n => {
      const span = document.createElement('span');
      span.innerHTML = parse(esc(n.nodeValue));
      n.replaceWith(...span.childNodes);
    });
    return box.innerHTML;
  };

  return { html, mostra, semplice, vuoto, esc };
})();

const EditorTesto = (() => {
  // Campi di testo lungo che diventano editor. Restano fuori quelli che il programma legge
  // riga per riga (azioni homebrew, tratti del PNG, sorgenti delle tabelle, blasoni...).
  const CAMPI_RICCHI = [
    '#nc-description', '#ec-description',
    '#note-sessione-list textarea', 'textarea.schermo-nota',
    '#nm-wants', '#nm-offers', '#nm-obiettivo-segreto', '#nm-gear', '#nm-talenti', '#nm-combat-notes',
    '#pg-gear', '#pg-talenti', '#pg-note-combat',
    '#schermo-block-content', '#scratchpad-text',
    '#sl-note-prep', '#sl-recap', '#cev-descrizione', '#cev-conseguenza',
    'textarea[id^="wsf-"]', 'textarea.ws-custom-val',
    '#cs-recap', '#mappa-pin-note', '#esa-nota-testo',
  ];
  const GIA_CON_PICKER = ['ws-editor-free'];
  const DIV_RICCHI = ['#nm-trait', '#nm-secret', '#ws-editor-free', '#trama-corpo', '#trama-note'];

  const COLORI = [
    ['Rosso', '#d4574e'], ['Arancio', '#d98a1f'], ['Verde', '#3f9a6b'],
    ['Blu', '#4a86c8'], ['Viola', '#9a72d0'],
  ];
  const EVIDENZIA = [
    ['Giallo', 'rgba(240,196,40,0.38)'], ['Verde', 'rgba(80,180,110,0.32)'],
    ['Azzurro', 'rgba(80,150,230,0.32)'], ['Rosa', 'rgba(220,90,140,0.30)'],
  ];

  const ico = (d, w = 16) => `<svg aria-hidden="true" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICO = {
    puntato: ico('<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>'),
    numerato: ico('<line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/><path d="M4 5h1.5v4M4 9h3"/><path d="M4 14.5a1.5 1.5 0 0 1 3 .5c0 1-3 2-3 3.5h3"/>'),
    collega: ico('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
    giu: ico('<polyline points="6 9 12 15 18 9"/>', 12),
    togli: ico('<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/><line x1="3" y1="3" x2="21" y2="21"/>'),
  };

  const _css = () => {
    if (document.getElementById('editor-testo-css')) return;
    const st = document.createElement('style');
    st.id = 'editor-testo-css';
    st.textContent = `
      .et-wrap { position: relative; }
      .et-barra { display: none; flex-wrap: wrap; align-items: center; gap: 2px; padding: 4px;
        margin-bottom: 4px; background: var(--bg-secondary); border: 1px solid var(--border);
        border-radius: var(--radius-md); position: sticky; top: 0; z-index: 5; }
      .et-wrap:focus-within .et-barra, .et-wrap.et-aperta .et-barra { display: flex; }
      .et-barra .et-b { min-width: 36px; height: 36px; padding: 0 8px; display: inline-flex; align-items: center;
        justify-content: center; gap: 4px; border: 1px solid transparent; border-radius: var(--radius-sm);
        background: transparent; color: var(--text-primary); font: inherit; font-size: 0.9rem; cursor: pointer;
        -webkit-tap-highlight-color: transparent; }
      .et-barra .et-b:hover { background: var(--bg-tertiary); }
      .et-barra .et-b.attivo { background: var(--bg-tertiary); border-color: var(--border-strong, var(--border)); }
      .et-barra .et-sep { width: 1px; align-self: stretch; margin: 4px 3px; background: var(--border); }
      .et-barra .et-collega { margin-left: auto; color: var(--accent-text, var(--accent-primary)); font-weight: 600; font-size: 0.85rem; }
      .et-menu { position: absolute; top: 100%; left: 0; margin-top: 4px; z-index: 20; min-width: 190px;
        background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md);
        box-shadow: 0 8px 24px rgba(0,0,0,0.25); padding: 6px; display: none; }
      .et-menu.aperto { display: block; }
      .et-menu .et-voce { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px;
        border: 0; background: transparent; color: var(--text-primary); font: inherit; text-align: left;
        border-radius: var(--radius-sm); cursor: pointer; }
      .et-menu .et-voce:hover { background: var(--bg-tertiary); }
      .et-menu .et-etichetta { font-size: 0.7rem; color: var(--text-muted); padding: 6px 10px 2px; }
      .et-menu .et-tinte { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 8px 8px; }
      .et-menu .et-tinta { width: 30px; height: 30px; border-radius: 50%; border: 1px solid var(--border); cursor: pointer; padding: 0;
        display: inline-flex; align-items: center; justify-content: center; font-weight: 700; background: var(--bg-secondary); }
      .et-area { min-height: 4.8em; height: auto !important; overflow-wrap: anywhere; line-height: 1.6; cursor: text; }
      .et-area:focus { outline: none; border-color: var(--accent-primary); }
      .et-area p { margin: 0.25em 0; }
      /* Colori e misure dei titoli: in css/scena.css (variabili --titolo), uguali in tutte le tavolozze */
      .et-area ul, .et-area ol, .et-testo ul, .et-testo ol { padding-left: 1.4em; margin: 0.3em 0; }
      .et-area .nc-wikilink, .et-testo .nc-wikilink { font-weight: 600; }
      .et-testo .nc-wikilink { cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; }
      .et-testo p { margin: 0.25em 0; }
      .et-testo, .mz-sez .et-testo, .mz-segreto .et-testo { white-space: normal !important; }
      .et-testo > :first-child { margin-top: 0; }
      .et-testo > :last-child { margin-bottom: 0; }
    `;
    document.head.appendChild(st);
  };

  const _barraHTML = () => `
    <button type="button" class="et-b" data-cmd="bold" title="Grassetto" aria-label="Grassetto"><b>G</b></button>
    <button type="button" class="et-b" data-cmd="italic" title="Corsivo" aria-label="Corsivo"><i style="font-family:Georgia,serif;">C</i></button>
    <button type="button" class="et-b" data-cmd="underline" title="Sottolineato" aria-label="Sottolineato"><u>S</u></button>
    <button type="button" class="et-b" data-cmd="strikeThrough" title="Barrato" aria-label="Barrato"><s>ab</s></button>
    <span class="et-sep"></span>
    <span style="position:relative;">
      <button type="button" class="et-b" data-menu="stile" title="Stile del paragrafo" aria-label="Stile del paragrafo">Stile ${ICO.giu}</button>
      <div class="et-menu" data-per="stile">
        <button type="button" class="et-voce" data-blocco="p">Testo normale</button>
        <button type="button" class="et-voce" data-blocco="h2"><span style="font-family:var(--font-titoli);font-size:1.2rem;color:var(--titolo);">Titolo</span></button>
        <button type="button" class="et-voce" data-blocco="h3"><strong style="font-size:0.95rem;color:var(--titolo-2);">Sottotitolo</strong></button>
        <button type="button" class="et-voce" data-blocco="blockquote"><span style="border-left:3px solid var(--accent-secondary, var(--border));padding-left:8px;">Citazione</span></button>
      </div>
    </span>
    <button type="button" class="et-b" data-cmd="insertUnorderedList" title="Elenco puntato" aria-label="Elenco puntato">${ICO.puntato}</button>
    <button type="button" class="et-b" data-cmd="insertOrderedList" title="Elenco numerato" aria-label="Elenco numerato">${ICO.numerato}</button>
    <span class="et-sep"></span>
    <span style="position:relative;">
      <button type="button" class="et-b" data-menu="colore" title="Colore ed evidenziatore" aria-label="Colore ed evidenziatore"><span style="font-weight:700;border-bottom:3px solid #d4574e;line-height:1;">A</span> ${ICO.giu}</button>
      <div class="et-menu" data-per="colore">
        <div class="et-etichetta">Colore del testo</div>
        <div class="et-tinte">
          <button type="button" class="et-tinta" data-colore="" title="Colore normale" aria-label="Colore normale" style="color:var(--text-primary);">A</button>
          ${COLORI.map(([n, c]) => `<button type="button" class="et-tinta" data-colore="${c}" title="${n}" aria-label="${n}" style="color:${c};">A</button>`).join('')}
        </div>
        <div class="et-etichetta">Evidenziatore</div>
        <div class="et-tinte">
          <button type="button" class="et-tinta" data-evidenzia="transparent" title="Nessuno" aria-label="Nessun evidenziatore" style="font-weight:400;font-size:0.7rem;">no</button>
          ${EVIDENZIA.map(([n, c]) => `<button type="button" class="et-tinta" data-evidenzia="${c}" title="${n}" aria-label="Evidenzia ${n}" style="background:${c};"></button>`).join('')}
        </div>
        <button type="button" class="et-voce" data-cmd="removeFormat">${ICO.togli} Togli formattazione</button>
      </div>
    </span>
    <button type="button" class="et-b et-collega" data-collega="1" title="Collega un PNG, un PG, un luogo, una fazione, una missione o una nota" aria-label="Collega">${ICO.collega} Collega</button>
  `;

  // Collega = scrivere @: si apre lo stesso elenco di sempre, e si filtra scrivendo il nome.
  // Lo usa anche la barra delle note della Wiki.
  const collega = (area) => {
    if (!area) return;
    if (document.activeElement !== area) area.focus();
    const s = window.getSelection();
    if (!s?.rangeCount || !area.contains(s.anchorNode)) {
      const r = document.createRange(); r.selectNodeContents(area); r.collapse(false);
      s.removeAllRanges(); s.addRange(r);
    }
    let prima = '';
    try { const rr = s.getRangeAt(0).cloneRange(); rr.setStart(area, 0); prima = rr.toString(); } catch (e) {}
    document.execCommand('insertText', false, (prima && !/\s$/.test(prima) ? ' ' : '') + '@');
    if (typeof MentionPicker !== 'undefined') MentionPicker.onInput({}, area);
  };

  const _chiudiMenu = (wrap) => wrap.querySelectorAll('.et-menu.aperto').forEach(m => m.classList.remove('aperto'));

  const _aggiornaStato = (wrap) => {
    wrap.querySelectorAll('.et-b[data-cmd]').forEach(b => {
      let on = false;
      try { on = document.queryCommandState(b.dataset.cmd); } catch (e) {}
      b.classList.toggle('attivo', !!on);
    });
  };

  // Barra + area. Restituisce l'area modificabile.
  const _costruisci = (area, dopoModifica, conPicker = true) => {
    _css();
    const wrap = document.createElement('div');
    wrap.className = 'et-wrap';
    const barra = document.createElement('div');
    barra.className = 'et-barra';
    barra.setAttribute('role', 'toolbar');
    barra.setAttribute('aria-label', 'Formattazione');
    barra.innerHTML = _barraHTML();
    area.parentNode.insertBefore(wrap, area);
    wrap.appendChild(barra);
    wrap.appendChild(area);

    let selSalvata = null;
    const salvaSel = () => {
      const s = window.getSelection();
      if (s?.rangeCount && area.contains(s.anchorNode)) selSalvata = s.getRangeAt(0).cloneRange();
    };
    const ripristinaSel = () => {
      area.focus({ preventScroll: true });
      if (selSalvata) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(selSalvata); }
    };
    area.addEventListener('keyup', () => { salvaSel(); _aggiornaStato(wrap); });
    area.addEventListener('mouseup', () => { salvaSel(); _aggiornaStato(wrap); });
    area.addEventListener('touchend', () => setTimeout(() => { salvaSel(); _aggiornaStato(wrap); }, 0));
    document.addEventListener('selectionchange', () => { if (document.activeElement === area) salvaSel(); });

    // Toccare la barra non deve togliere il cursore dal testo (su iPad chiuderebbe la tastiera)
    barra.addEventListener('mousedown', e => { if (!e.target.closest('input')) e.preventDefault(); });

    barra.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.menu) {
        const m = barra.querySelector(`.et-menu[data-per="${b.dataset.menu}"]`);
        const era = m.classList.contains('aperto');
        _chiudiMenu(wrap);
        if (!era) m.classList.add('aperto');
        wrap.classList.add('et-aperta');
        return;
      }
      ripristinaSel();
      if (b.dataset.cmd) {
        document.execCommand(b.dataset.cmd, false, null);
      } else if (b.dataset.blocco) {
        const tag = b.dataset.blocco;
        let attuale = '';
        try { attuale = String(document.queryCommandValue('formatBlock') || '').toLowerCase(); } catch (e) {}
        document.execCommand('formatBlock', false, '<' + (attuale === tag && tag !== 'p' ? 'p' : tag) + '>');
      } else if (b.dataset.colore !== undefined) {
        try { document.execCommand('styleWithCSS', false, true); } catch (e) {}
        if (b.dataset.colore) document.execCommand('foreColor', false, b.dataset.colore);
        else {
          // "Colore normale": toglie solo il colore, lascia grassetti e corsivi
          const s = window.getSelection();
          if (s?.rangeCount) {
            const box = document.createElement('div');
            box.appendChild(s.getRangeAt(0).cloneContents());
            box.querySelectorAll('[style]').forEach(n => { n.style.color = ''; if (!n.getAttribute('style')) n.removeAttribute('style'); });
            box.querySelectorAll('font[color]').forEach(n => n.removeAttribute('color'));
            document.execCommand('insertHTML', false, box.innerHTML);
          }
        }
      } else if (b.dataset.evidenzia) {
        try { document.execCommand('styleWithCSS', false, true); } catch (e) {}
        if (!document.execCommand('hiliteColor', false, b.dataset.evidenzia)) document.execCommand('backColor', false, b.dataset.evidenzia);
      } else if (b.dataset.collega) {
        collega(area);
      }
      _chiudiMenu(wrap);
      wrap.classList.remove('et-aperta');
      salvaSel();
      _aggiornaStato(wrap);
      dopoModifica();
    });

    document.addEventListener('mousedown', e => { if (!wrap.contains(e.target)) { _chiudiMenu(wrap); wrap.classList.remove('et-aperta'); } });

    // Incolla da Word o da una pagina web: si tengono grassetti, elenchi e titoli, non gli stili strani
    area.addEventListener('paste', e => {
      const dt = e.clipboardData;
      if (!dt) return;
      const h = dt.getData('text/html');
      const t = dt.getData('text/plain');
      if (!h && !t) return;
      e.preventDefault();
      const pulito = h ? Testo.html(h.replace(/^[\s\S]*?<body[^>]*>|<\/body>[\s\S]*$/gi, '')) : Testo.html(t);
      document.execCommand('insertHTML', false, pulito);
    });

    area.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        const k = e.key.toLowerCase();
        if (k === 'b' || k === 'g') { e.preventDefault(); document.execCommand('bold'); dopoModifica(); }
        else if (k === 'i') { e.preventDefault(); document.execCommand('italic'); dopoModifica(); }
        else if (k === 'u') { e.preventDefault(); document.execCommand('underline'); dopoModifica(); }
      }
    });

    if (conPicker && typeof MentionPicker !== 'undefined') {
      area.addEventListener('input', e => MentionPicker.onInput(e, area));
      area.addEventListener('keydown', e => MentionPicker.onKeydown(e));
    }
    // (un input lanciato dalla barra stessa non va rilanciato: sui div sarebbe un giro infinito)
    area.addEventListener('input', e => { if (e.detail !== 'et') dopoModifica(); });
    return wrap;
  };

  const _valore = (area) => {
    const h = area.innerHTML.trim();
    if (!h || h === '<br>' || h === '<p><br></p>' || h === '<div><br></div>') return '';
    return h;
  };

  // Textarea → editor. La textarea resta nel DOM (id, label, codice che la legge) ma nascosta:
  // .value restituisce l'HTML scritto, e assegnarle .value riempie l'editor.
  const monta = (ta) => {
    if (!ta || ta._editorTesto || ta.tagName !== 'TEXTAREA') return;
    const area = document.createElement('div');
    area.contentEditable = 'true';
    area.spellcheck = true;
    // Stesso aspetto della textarea: le righe delle note della sessione restano sottili e senza bordo
    area.className = (ta.className ? ta.className + ' ' : '') + 'et-area';
    if (ta.getAttribute('style')) area.setAttribute('style', ta.getAttribute('style'));
    area.style.height = '';
    area.style.resize = '';
    const righe = parseInt(ta.getAttribute('rows'), 10) || 3;
    area.style.minHeight = righe * 1.6 + 'em';
    if (ta.placeholder) area.dataset.placeholder = ta.placeholder;
    area.setAttribute('role', 'textbox');
    area.setAttribute('aria-multiline', 'true');
    const lab = ta.id && document.querySelector(`label[for="${CSS.escape(ta.id)}"]`);
    if (lab) { if (!lab.id) lab.id = 'lbl-' + ta.id; area.setAttribute('aria-labelledby', lab.id); lab.addEventListener('click', () => area.focus()); }
    else if (ta.getAttribute('aria-label')) area.setAttribute('aria-label', ta.getAttribute('aria-label'));

    const iniziale = ta.value;
    ta.parentNode.insertBefore(area, ta);
    ta.style.display = 'none';
    ta._editorTesto = area;

    Object.defineProperty(ta, 'value', {
      configurable: true,
      get: () => _valore(area),
      set: (v) => { area.innerHTML = Testo.html(v); },
    });
    ta.focus = () => area.focus();
    area.innerHTML = Testo.html(iniziale);

    const avvisa = () => ta.dispatchEvent(new Event('input', { bubbles: true }));
    _costruisci(area, avvisa);
    area.addEventListener('blur', () => ta.dispatchEvent(new Event('change', { bubbles: true })));
    // I tasti passano anche alla textarea: es. nelle note della sessione Invio crea la nota dopo
    area.addEventListener('keydown', e => {
      if (e.defaultPrevented || e.isComposing) return;
      const copia = new KeyboardEvent('keydown', { key: e.key, code: e.code, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, bubbles: false, cancelable: true });
      if (!ta.dispatchEvent(copia)) e.preventDefault();
    });
    if (ta.disabled || ta.readOnly) area.contentEditable = 'false';
  };

  // Contenteditable gia' esistente (tratto del PNG, note libere, trame): solo la barra comune
  const montaDiv = (div) => {
    if (!div || div._editorTesto || div.isContentEditable === false) return;
    div._editorTesto = div;
    div.classList.add('et-area');
    // Le vecchie barre messe subito sopra non servono piu'
    const prima = div.previousElementSibling;
    if (prima && prima.querySelector?.('.nc-tb') && !prima.querySelector('input:not([type=color]),textarea,[contenteditable]')) prima.remove();
    // Le note libere delle schede hanno gia' i loro ascoltatori per @: non raddoppiarli
    _costruisci(div, () => {}, !GIA_CON_PICKER.includes(div.id));
    // Dopo un comando della barra si avvisa chi salva (le trame salvano all'input)
    div.closest('.et-wrap').querySelector('.et-barra').addEventListener('click', () => div.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: 'et' })));
  };

  const montaTutti = (radice = document) => {
    if (!radice.querySelectorAll) return;
    radice.querySelectorAll(CAMPI_RICCHI.join(',')).forEach(monta);
    radice.querySelectorAll(DIV_RICCHI.join(',')).forEach(montaDiv);
  };

  let _attesa = null;
  const _osserva = () => {
    montaTutti();
    new MutationObserver(() => {
      if (_attesa) return;
      _attesa = requestAnimationFrame(() => { _attesa = null; montaTutti(); });
    }).observe(document.body, { childList: true, subtree: true });
  };

  // Collegamenti nei testi mostrati (non in quelli che si stanno scrivendo)
  document.addEventListener('click', e => {
    const l = e.target.closest?.('.nc-wikilink[data-link]');
    if (!l || l.hasAttribute('onclick') || l.closest('[contenteditable="true"]')) return;
    e.preventDefault();
    apriCollegamento(l.dataset.link, l.dataset.tipo, l.dataset.id, e);
  });

  const SEZIONE = { png: 'png', luogo: 'luoghi', fazione: 'fazioni', pg: 'pg', quest: 'quest', incontro: 'incontri', sessione: 'sessioni' };
  const apriCollegamento = (key, tipo, id, ev) => {
    const sez = SEZIONE[tipo] || SEZIONE[String(key || '').split(':')[0]];
    if (sez && id && typeof WikiSections !== 'undefined') {
      if (ev && (ev.ctrlKey || ev.metaKey) && typeof QuickView !== 'undefined') { QuickView.open(sez, id); return; }
      WikiSections.goto(sez);
      setTimeout(() => WikiSections.openCard(sez, id), 150);
      return;
    }
    if (typeof wikiNavigateLink === 'function') wikiNavigateLink(key);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _osserva);
  else _osserva();

  return { monta, montaDiv, montaTutti, apriCollegamento, collega };
})();

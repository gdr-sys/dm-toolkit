/* ============================================================
   DADI.JS — Widget dadi fisso e motore di lancio
   ============================================================ */

const Dadi = (() => {
  let panelOpen = false;

  // ── Motore di lancio ──
  const rollSingle = (faces) => Math.floor(Math.random() * faces) + 1;

  /**
   * Parsea e lancia una formula tipo "2d6+3", "d20", "4d6kh3", "1d100"
   * Restituisce { formula, rolls, total, detail }
   */
  const roll = (formula) => {
    formula = formula.trim().toLowerCase().replace(/\s/g, '');
    const results = { formula, rolls: [], total: 0, detail: '', error: null };

    // Gestione formula multipla con + o -
    // Splitta per + e - mantenendo il segno
    const tokens = formula.split(/(?=[+\-])/);
    let total = 0;
    const parts = [];

    for (const token of tokens) {
      const sign = token.startsWith('-') ? -1 : 1;
      const cleanToken = token.replace(/^[+\-]/, '');

      // Costante pura (es. "+3", "-2")
      if (/^\d+$/.test(cleanToken)) {
        const val = parseInt(cleanToken) * sign;
        total += val;
        parts.push({ type: 'const', val, sign });
        continue;
      }

      // Dado (es. "2d6", "d20", "4d6kh3")
      const diceMatch = cleanToken.match(/^(\d*)d(\d+)(k[hl]\d+)?$/);
      if (diceMatch) {
        const num = parseInt(diceMatch[1] || '1');
        const faces = parseInt(diceMatch[2]);
        const keepStr = diceMatch[3] || '';

        if (faces < 2 || num < 1 || num > 100) {
          results.error = `Formula non valida: ${cleanToken}`;
          return results;
        }

        const rolled = Array.from({ length: num }, () => rollSingle(faces));
        let kept = [...rolled];

        if (keepStr) {
          const keepType = keepStr[1]; // 'h' o 'l'
          const keepN = parseInt(keepStr.slice(2));
          const sorted = [...rolled].sort((a, b) => a - b);
          if (keepType === 'h') {
            const threshold = sorted[Math.max(0, sorted.length - keepN)];
            kept = rolled.filter((v, i) => {
              // Mantieni i più alti (kh)
              return v >= threshold;
            }).slice(0, keepN);
          } else {
            const threshold = sorted[Math.min(sorted.length - 1, keepN - 1)];
            kept = rolled.filter(v => v <= threshold).slice(0, keepN);
          }
        }

        const subtotal = kept.reduce((a, b) => a + b, 0) * sign;
        total += subtotal;
        parts.push({ type: 'dice', num, faces, rolled, kept, subtotal, sign });
        results.rolls.push(...rolled);
        continue;
      }

      results.error = `Token non riconosciuto: ${cleanToken}`;
      return results;
    }

    results.total = total;
    results.parts = parts;

    // Costruisce stringa dettaglio
    results.detail = parts.map(p => {
      if (p.type === 'const') return (p.sign < 0 ? '−' : '+') + Math.abs(p.val);
      const sign = p.sign < 0 ? '−' : '';
      const rollStr = p.rolled.map(v => {
        const kept = p.kept.includes(v);
        return kept ? `[${v}]` : `(${v})`;
      }).join(', ');
      return `${sign}${p.num}d${p.faces}: ${rollStr}`;
    }).join('  ');

    Debug.log(`🎲 ${formula} → ${total} (${results.detail})`);
    Storage.addDiceRoll(formula, results.rolls, total);

    return results;
  };

  // ── UI ──
  const updateResult = (result) => {
    const el = document.getElementById('dice-result-value');
    const formula = document.getElementById('dice-result-formula');
    const detail = document.getElementById('dice-result-detail');
    const icon = document.getElementById('dice-toggle-icon');

    if (!el) return;

    if (result.error) {
      el.textContent = 'ERR';
      formula.textContent = result.error;
      detail.textContent = '';
      return;
    }

    formula.textContent = result.formula.toUpperCase();
    el.classList.remove('dice-result-appear');
    void el.offsetWidth; // reflow
    el.classList.add('dice-result-appear');
    el.textContent = result.total;
    detail.textContent = result.detail;

    // Anima icona
    if (icon) {
      icon.classList.add('dice-rolling');
      setTimeout(() => icon.classList.remove('dice-rolling'), 400);
    }

    updateHistory();
  };

  const updateHistory = () => {
    const el = document.getElementById('dice-history-list');
    if (!el) return;
    const history = Storage.getDiceHistory().slice(0, 8);
    el.innerHTML = history.map(h => `
      <div class="dice-history-item">
        <span>${h.formula.toUpperCase()}</span>
        <span class="text-accent font-bold">${h.total}</span>
      </div>
    `).join('');
  };

  const rollFormula = (formula) => {
    const result = roll(formula);
    updateResult(result);
    return result;
  };

  const rollDie = (faces, num = 1) => {
    const formula = `${num}d${faces}`;
    return rollFormula(formula);
  };

  const rollCustom = () => {
    const numEl = document.getElementById('dice-custom-num');
    const facesEl = document.getElementById('dice-custom-faces');
    const modEl = document.getElementById('dice-custom-mod');
    if (!numEl || !facesEl) return;
    const num = parseInt(numEl.value) || 1;
    const faces = parseInt(facesEl.value) || 6;
    const mod = parseInt(modEl?.value) || 0;
    let formula = `${num}d${faces}`;
    if (mod > 0) formula += `+${mod}`;
    if (mod < 0) formula += `${mod}`;
    rollFormula(formula);
  };

  const rollFormulaInput = () => {
    const el = document.getElementById('dice-formula-field');
    if (!el || !el.value.trim()) return;
    rollFormula(el.value.trim());
  };

  const togglePanel = () => {
    panelOpen = !panelOpen;
    const panel = document.getElementById('dice-panel');
    if (panel) panel.classList.toggle('open', panelOpen);
    if (panelOpen) updateHistory();
    Debug.log(`Pannello dadi: ${panelOpen ? 'aperto' : 'chiuso'}`);
  };

  const init = () => {
    Debug.log('Dadi inizializzati');
  };

  return { init, roll, rollDie, rollFormula, rollCustom, rollFormulaInput, togglePanel };
})();

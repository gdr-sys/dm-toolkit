# 🐉 DM Toolkit

Web app per Dungeon Master di **D&D 5e** (edizioni 2014 e 2024), pensata per gestire campagne e one-shot direttamente dal tavolo — desktop o mobile.

**🔗 Live:** [gdr-sys.github.io/dm-toolkit](https://gdr-sys.github.io/dm-toolkit/)

---

## ✨ Funzionalità

### 📖 Gestione Campagne
- Campagne multiple o one-shot, edizione 5e 2014 / 2024 / personalizzata per ognuna
- Note campagna stile OneNote (categorie → pagine → contenuto), responsive su mobile
- Timeline eventi, quest tracker, fazioni con reputazione verso il party
- Calendario in-game con preset (Forgotten Realms, Greyhawk, Eberron, fantasy custom)
- Backup/restore completo o per singola campagna (export/import JSON)

### 🗺️ Mondo
- PNG con scheda completa: ruolo, obiettivi (anche segreti, visibili solo al DM), morale in combattimento, statistiche di combattimento integrate
- Luoghi e fazioni con relazioni e potere
- Possibilità di portare un PNG direttamente nel Combat Tracker con un click

### ⚔️ Sessione
- Combat tracker con iniziativa, HP, CA, condizioni, concentrazione (con calcolo automatico della DC al tiro salvezza)
- Party con percezioni passive, ispirazione, statistiche rapide (CA, velocità, bonus competenza)
- Riposo Breve e Riposo Lungo con reset automatico di HP e condizioni
- Scontri salvabili e ripristinabili

### 📚 Compendio
- Mostri, oggetti magici, equipaggiamento, regole e incantesimi (SRD 5.1 e 5.2.1)
- Si adatta automaticamente all'edizione della campagna attiva
- Sezione Homebrew con form strutturati per creare mostri, oggetti e incantesimi personalizzati
- Preferiti per campagna e ricerca full-text

### 🖥️ Schermo del Master
- Layout personalizzabile a blocchi con drag & drop
- Blocchi disponibili: percezioni party, dadi rapidi, meteo, condizioni (tabella completa per edizione), combat mini, calcolatore incontri (XP Budget 2014/2024), tempo e calendario, note libere

### ✨ Generatori
13 generatori rapidi per l'improvvisazione al tavolo: PNG, meteo, sensori, rumor, accenti, negozi, eventi di viaggio, loot, biblioteca, nomi, incontri casuali, tabelle di follia.

---

## 🛠️ Stack tecnico

- **Vanilla JS** (moduli IIFE), nessun framework, nessuna build
- **HTML/CSS/JS tutto inline** in `index.html` — scelta deliberata per evitare problemi di cache aggressiva con GitHub Pages sui file JS esterni
- **localStorage** per la persistenza dei dati (nessun backend)
- [SortableJS](https://github.com/SortableJS/Sortable) per il drag & drop dello Schermo DM

## 📁 Struttura

```
dm-toolkit/
├── index.html          ← App completa (HTML + CSS + JS inline)
├── css/                 ← Stili (base, componenti, layout responsive)
└── data/                 ← Dataset SRD 5e 2014/2024 in JSON
    ├── srd_5_1_*.json    (mostri, oggetti, equip, regole, incantesimi 2014)
    ├── srd_5_2_1_*.json  (stessi dataset, edizione 2024)
    ├── sane_prices.json  (prezzi oggetti magici)
    ├── dm_screen_*.json
    └── tabelle.json      (dati per i generatori)
```

## 🚀 Sviluppo locale

Nessuna build richiesta — è un sito statico.

```bash
git clone https://github.com/gdr-sys/dm-toolkit.git
cd dm-toolkit
python3 -m http.server 8000
# apri http://localhost:8000
```

## 📝 Licenza

I dati di gioco provengono dal System Reference Document (SRD) di D&D, rilasciato sotto licenza OGL/ORC da Wizards of the Coast.

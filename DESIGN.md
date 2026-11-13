---
name: "DM Toolkit: l'app"
description: "Ogni pagina si apre come la locandina della campagna: una scena illustrata col titolo sopra, poi tessere tonde e piatte. Sette tavolozze, notte e giorno."
colors:
  notte-fondo: "oklch(13% 0.02 40)"
  notte-fondo-alto: "oklch(17% 0.024 40)"
  notte-tessera: "oklch(22% 0.03 40)"
  notte-tessera-su: "oklch(25% 0.034 40)"
  notte-campo: "oklch(15% 0.02 40)"
  notte-testo: "oklch(94% 0.02 40)"
  notte-testo-medio: "oklch(85% 0.025 40)"
  notte-testo-quieto: "oklch(74% 0.03 40)"
  notte-filo: "oklch(30% 0.03 40)"
  notte-brace: "oklch(74% 0.17 52)"
  notte-brace-testo: "oklch(78% 0.153 52)"
  notte-sul-brace: "oklch(17% 0.03 52)"
  giorno-fondo: "oklch(96.5% 0.012 40)"
  giorno-tessera: "oklch(91.5% 0.022 40)"
  giorno-tessera-su: "oklch(89.5% 0.026 40)"
  giorno-campo: "oklch(99% 0.005 40)"
  giorno-testo: "oklch(22% 0.03 40)"
  giorno-testo-quieto: "oklch(45% 0.03 40)"
  giorno-filo: "oklch(84% 0.025 40)"
  giorno-brace: "oklch(50% 0.17 52)"
  giorno-brace-testo: "oklch(44% 0.17 52)"
  sul-brace-giorno: "#ffffff"
typography:
  scena:
    fontFamily: "Gloock, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.6rem, 6.4vw, 5.2rem)"
    fontWeight: 400
    lineHeight: 0.97
    letterSpacing: "-0.02em"
  titolo-pagina:
    fontFamily: "Gloock, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.2rem, 4.4vw, 3.4rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
  fascia:
    fontFamily: "Gloock, Georgia, 'Times New Roman', serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: 1.1
  tessera:
    fontFamily: "Gloock, Georgia, 'Times New Roman', serif"
    fontSize: "1.45rem"
    fontWeight: 400
    lineHeight: 1.15
  corpo:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  lettura:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.12rem"
    fontWeight: 400
    lineHeight: 1.65
  etichetta:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.82rem"
    fontWeight: 700
    lineHeight: 1.3
  pulsante:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.1
  lettering-mappa:
    fontFamily: "'Cormorant SC', 'Cormorant Garamond', 'IM Fell English', 'IM Fell English SC', Cinzel, 'Crimson Pro', Georgia, serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  piccolo: "12px"
  medio: "16px"
  tessera: "20px"
  finestra: "24px"
  campagna: "28px"
  pillola: "999px"
spacing:
  stretto: "8px"
  tessere: "16px"
  dentro-tessera: "22px"
  fascia: "34px"
  margine: "clamp(16px, 4vw, 56px)"
components:
  pulsante-azione:
    backgroundColor: "{colors.notte-brace}"
    textColor: "{colors.notte-sul-brace}"
    typography: "{typography.pulsante}"
    rounded: "{rounded.pillola}"
    padding: "10px 20px"
    height: "44px"
  pulsante-quieto:
    backgroundColor: "{colors.notte-tessera-su}"
    textColor: "{colors.notte-testo}"
    typography: "{typography.pulsante}"
    rounded: "{rounded.pillola}"
    padding: "10px 20px"
    height: "44px"
  linguetta-attiva:
    backgroundColor: "{colors.notte-testo}"
    textColor: "{colors.notte-fondo}"
    typography: "{typography.pulsante}"
    rounded: "{rounded.pillola}"
    padding: "8px 16px"
  tessera:
    backgroundColor: "{colors.notte-tessera}"
    textColor: "{colors.notte-testo}"
    rounded: "{rounded.tessera}"
    padding: "22px"
  tessera-su:
    backgroundColor: "{colors.notte-tessera-su}"
  campo:
    backgroundColor: "{colors.notte-campo}"
    textColor: "{colors.notte-testo}"
    typography: "{typography.corpo}"
    rounded: "{rounded.piccolo}"
    padding: "10px 14px"
  scelta-attiva:
    backgroundColor: "{colors.notte-brace}"
    textColor: "{colors.notte-sul-brace}"
    rounded: "{rounded.medio}"
    padding: "14px 16px"
---

# Design System: DM Toolkit, l'app

> **Ambito:** l'app (`index.html` alla radice, `css/`, `js/`, `img/scene/`). Il sito di presentazione ha un suo sistema in `scopri/DESIGN.md`: i due non si mescolano.
> Il codice che lo realizza sta in `css/scena.css` (colori, tessere, scene), `js/scena.js` (scena disegnata, immagini di sfondo, ruote e pallini) e `js/dashboard-nuova.js` (impaginazione della Dashboard).

## Overview

**Creative North Star: "La locandina della campagna"**

Ogni pagina si apre come la locandina della serata: un paesaggio della campagna in alto, il titolo grande sopra, e subito sotto quello che serve al tavolo. Il master apre l'app e vede la sua campagna, non un pannello di controllo. Tutto il resto è ordinato in tessere tonde e piatte, raccolte in fasce con un titolo.

Il sistema nasce da una richiesta precisa dell'autrice: non doveva sembrare un'app generata con l'IA. Per questo non usa i segni tipici di quel genere: riquadri grigi con bordo sottile, card tutte uguali, sfumature lucide, bagliori, etichette maiuscole sopra i titoli. Il carattere viene dalla scena e dai titoli con le grazie; il resto resta calmo e leggibile, anche al tavolo con poca luce.

Tutti i colori nascono da tre numeri: la tinta del fondo, la tinta dell'accento e l'intensità. Scegliendo una tavolozza nelle Impostazioni cambia tutto insieme, scena compresa, di notte e di giorno.

**Key Characteristics:**
- In cima a ogni pagina una scena: illustrazione in bianco e nero tinta con la tavolozza, oppure un paesaggio disegnato dal nome.
- Tessere tonde e piatte: niente bordi, niente ombre, niente sfumature.
- Titoli in Gloock, testo in Figtree.
- Un solo colore d'accento per l'azione principale di ogni zona.
- Sette tavolozze (brace, grafite, bosco, cuoio, inchiostro, vino, nero) in notte e giorno.
- Segni del gioco al posto delle barre generiche: ruota a spicchi per i clock, pallini per fazioni e indizi, giorni in grande per le scadenze.

## Colors

I valori nel frontmatter sono quelli della tavolozza **brace**, che è la predefinita. Le altre si ottengono cambiando i tre numeri (`--h` tinta del fondo, `--ha` tinta dell'accento, `--k` intensità) in `css/scena.css`: chi scrive codice nuovo usa le variabili (`--bg-primary`, `--bg-card`, `--text-primary`, `--ac`…), mai i valori.

### Primary
- **Brace** (notte `oklch(74% 0.17 52)`, giorno `oklch(50% 0.17 52)`): l'azione principale, la tessera urgente, gli spicchi pieni dei clock, la linguetta della pagina attiva nella barra in alto.
- **Brace da leggere** (notte `oklch(78% 0.153 52)`, giorno `oklch(44% 0.17 52)`): l'accento quando è testo, per esempio il nome della campagna, la data della sessione o il numero dei giorni.

### Neutral
- **Fondo** (notte `oklch(13% 0.02 40)`, giorno `oklch(96.5% 0.012 40)`): la pagina.
- **Tessera** (notte `oklch(22% 0.03 40)`, giorno `oklch(91.5% 0.022 40)`) e **tessera sotto il mouse** (un passo più chiara).
- **Campo** (notte `oklch(15% 0.02 40)`, giorno `oklch(99% 0.005 40)`): dove si scrive.
- **Testo**, **testo medio**, **testo quieto**: tre livelli soltanto.
- **Filo** (notte `oklch(30% 0.03 40)`): l'unico bordo ammesso, nei campi e nelle righe vuote tratteggiate.

### Named Rules
**The Single Accent Rule.** In ogni zona c'è al massimo un pulsante color brace: l'azione principale. Tutto il resto è un pulsante quieto. Nei Generatori le scelte e i "Tira" sono in inchiostro (testo su fondo chiaro), non in brace.

**The Quiet Category Rule.** Con le card **sobrie** (predefinite) la categoria (quest, PNG, fazione…) si legge solo dal colore dell'etichetta piccola, mai dal fondo della tessera. Le card **colorate** sono una scelta dell'utente nelle Impostazioni, non un'impostazione da attivare nel codice.

**The Palette-Follows Rule.** Nessun colore fisso nelle pagine nuove: ogni colore deriva dalle variabili, così segue le sette tavolozze e la luce notte o giorno.

## Typography

**Titoli:** Gloock (con le grazie, peso unico 400).
**Testo:** Figtree (400, 600, 700).

Gloock dà la voce della campagna: è il carattere della locandina. Figtree fa il lavoro: etichette, pulsanti, testi lunghi. Nell'interfaccia non si usano altri caratteri.

**Dentro le mappe del Cartografo** (solo nel disegno della mappa, mai nell'interfaccia) i nomi di luoghi, mari e rioni usano il lettering cartografico: Cormorant SC e Cormorant Garamond, più IM Fell English, Cinzel e Crimson Pro per gli stili storici. Titolo della mappa e legenda restano in Gloock e Figtree, come l'app.

### Hierarchy
- **Scena** (Gloock 400, `clamp(2.6rem, 6.4vw, 5.2rem)`, interlinea 0.97): il titolo sopra la scena, per esempio il nome dell'ultima sessione o della campagna.
- **Titolo di pagina** (Gloock 400, `clamp(2.2rem, 4.4vw, 3.4rem)`): le pagine di lavoro (Cartografo, Calendario…), dove la scena è più bassa.
- **Fascia** (Gloock 400, 1.75rem): "Cosa incombe", "Quest attive"…
- **Tessera** (Gloock 400, 1.45rem; 2.1rem per la tessera principale).
- **Corpo** (Figtree 400, 1rem, interlinea 1.55) e **lettura** (1.12rem, interlinea 1.65, al massimo 62 caratteri per riga) per riassunti e schede.
- **Etichetta** (Figtree 700, 0.82rem): tipo e stato sopra il titolo della tessera, sempre in minuscolo.

### Named Rules
**The No Uppercase Rule.** Niente maiuscoletto e niente lettere spaziate: si scrive come si legge.
**The Two Voices Rule.** Gloock solo per i titoli; mai per testi lunghi, pulsanti o etichette.

## Layout

- **Margini:** `clamp(16px, 4vw, 56px)` ai lati; la scena va da bordo a bordo.
- **Fasce:** un titolo con uno o due collegamenti sottolineati a destra, poi una griglia di tessere (`repeat(auto-fill, minmax(290px, 1fr))`, spazio 16px). Una tessera importante occupa due colonne.
- **Dashboard:** tutto il quadro nel primo schermo. Nella scena, a sinistra l'ultima sessione e a destra "Cosa incombe" (scadenze, clock, segreti) in tessere compatte; sotto partono subito Quest attive, Il mondo si muove, Dalla campagna. Le card vuote diventano una sola riga tratteggiata in fondo.
- **Pagine di lavoro** (Cartografo, Scrittoio, Calendario, Schermo del DM…): scena bassa (circa 200px), così lo strumento si vede senza scorrere.
- **Telefono** (sotto 760px): tessere su una o due colonne, pulsanti in fila, niente righe che escono dallo schermo. Sopra i 900px la navigazione è una barra in alto; tra 760 e 900 resta il menu laterale; sul telefono la barra in basso.

### Named Rules
**The First Screen Rule.** La Dashboard mostra sessione, scadenze, clock e segreti senza scorrere su un computer. Un'informazione che serve al tavolo non comincia "molto sotto".

## Elevation & Depth

Il sistema è piatto. La profondità la danno la scena e il passo di luminosità tra fondo e tessera, non le ombre.

- **Tessere, campi e pulsanti:** nessuna ombra e nessun bordo.
- **Menu e finestre che galleggiano** (menu Strumenti, menu Sfondo, finestre): `0 18px 40px -16px rgba(0,0,0,.55)` più un filo interno di 1px del colore filo. Sono gli unici elementi con ombra.
- **Movimento:** le tessere cliccabili salgono di 3px al passaggio del mouse (`.2s cubic-bezier(.2,.7,.2,1)`); nient'altro si muove. Con "riduci movimento" non si muove nulla.

### Named Rules
**The Flat-Until-Floating Rule.** Ombra solo per ciò che sta sopra la pagina (menu e finestre), mai per ciò che sta nella pagina.

## Shapes

- **Tessere:** raggio 20px (16px sul telefono e per le tessere compatte).
- **Pulsanti, linguette, etichette di stato:** a pillola.
- **Campi:** 12px. **Finestre:** 24px. **Card della campagna in Home:** 28px.
- **Ruota dei clock:** cerchio diviso in spicchi uguali; gli spicchi pieni in brace, i vuoti in testo al 14%.
- **Pallini:** cerchi di 16px (12px nelle tessere compatte); pieni in brace, vuoti con un contorno di 2px.

## Components

### Scena (`.sc-hero`, `js/scena.js`)
- **Struttura:** contenitore a tutta larghezza con un'immagine sotto e una sfumatura verso il fondo che tiene leggibile il testo.
- **Immagine:** nell'ordine, quella caricata per la pagina, `img/scene/<pagina>.webp`, quella caricata per la campagna, `img/scene/<paesaggio>.webp`, il paesaggio disegnato dal nome. Le immagini sono in bianco e nero; l'app le tinge con la tavolozza (`mix-blend-mode: luminosity`).
- **Pulsante Sfondo:** in alto a destra; carica un'immagine, la toglie o sceglie il paesaggio.

### Tessera (`.sc-t`)
- **Struttura:** etichetta (tipo e stato), titolo in Gloock, eventuale riga di testo quieto, eventuale segno del gioco a destra (`.sc-cw`) o in basso (pallini).
- **Varianti:** larga (due colonne), principale (più alta, titolo 2.1rem), urgente (fondo mescolato al 22% col brace).
- **Stato:** sotto il mouse fondo un passo più chiaro e salita di 3px; si apre con un clic o con Invio.

### Pulsanti (`.btn`)
- **Azione** (`.btn-primary`): pillola brace, testo scuro di notte e bianco di giorno. Uno per zona.
- **Quieto** (`.btn-ghost`, `.btn-secondary`, `.btn`): pillola col testo all'11% sul fondo.
- **Nelle intestazioni delle card:** trasparenti, testo quieto.

### Linguette (`.tab-btn`, viste della Dashboard, sezioni della Wiki)
- Pillole quiete; quella attiva è in inchiostro pieno (fondo testo, testo fondo), non in brace.

### Scelte con icona (`.sc-scelta`: Cartografo, Scrittoio)
- Tessere da circa 120px con un'icona disegnata (tratto 1.6) e il nome; quella scelta è piena di brace.

### Wiki
- **Elenco:** locandine verticali 2:3 con l'iniziale grande in trasparenza, stato in etichetta, nome in Gloock.
- **Scheda:** ritratto o iniziale a sinistra, nome grande, stato e dettagli brevi a pillola; i testi da leggere al centro, segreto e dettagli in tessere a lato.

## Do's and Don'ts

### Do:
- **Do** apri ogni pagina nuova con un `.page-header`: la scena e il pulsante Sfondo arrivano da soli (`js/scena.js`).
- **Do** usa le variabili di colore (`--bg-card`, `--text-primary`, `--ac`, `--accent-text`…), così il componente segue le sette tavolozze e la luce.
- **Do** mostra lo stato con i segni del gioco: `Scena.ruota(k, n)` per i clock, `Scena.pallini(k, n)` per avanzamenti e indizi.
- **Do** raccogli le card vuote in una riga sola invece di mostrare riquadri con "Nessun…".
- **Do** controlla ogni pagina nei due temi e a 390px di larghezza prima di considerarla finita.

### Don't:
- **Don't** usare riquadri con bordo grigio sottile, card tutte uguali, sfumature o bagliori: è l'estetica "fatta con l'IA" che l'autrice ha chiesto di evitare.
- **Don't** mettere una riga colorata su un lato di card, note o avvisi: lo stato si legge dal fondo.
- **Don't** scrivere etichette in maiuscolo o con lettere spaziate, né mettere un'etichetta sopra un titolo per decorarlo.
- **Don't** usare più di un pulsante brace per zona.
- **Don't** mettere colori fissi nelle pagine nuove, né illustrazioni a colori in `img/scene/`: devono essere in bianco e nero per seguire la tavolozza.
- **Don't** spingere le informazioni del tavolo sotto la piega della Dashboard.
- **Don't** usare emoji nell'interfaccia: le icone sono disegnate con lo stesso tratto.

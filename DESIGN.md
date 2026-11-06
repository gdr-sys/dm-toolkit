---
name: "DM Toolkit: sito di presentazione (solo scopri/)"
description: "Vale solo per il sito in scopri/. Non descrive e non governa l'app (index.html alla radice, css/, js/), che ha un proprio sistema visivo."
colors:
  ambra: "#e9b84f"
  ambra-forte: "#f6cd6e"
  cinabro: "#e0523f"
  cinabro-chiaro: "#ffb4a6"
  stanza: "#122a35"
  fondo: "#0c1f28"
  petrolio: "#123a4a"
  foglio: "#18343f"
  carta: "#f2ecd8"
  nebbia: "#c0d0d5"
  inchiostro: "#0f2029"
  filo: "#f2ecd82e"
  filo-forte: "#f2ecd84d"
  filo-bottone: "#f2ecd880"
  velo: "#0c1f28d9"
typography:
  display:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "clamp(2.5rem, 4.1vw, 4rem)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: "-0.015em"
  closing:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "clamp(2.25rem, 4vw, 3.75rem)"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "clamp(2rem, 3.2vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "clamp(1.25rem, 1.6vw, 1.5rem)"
    fontWeight: 500
    lineHeight: 1.2
  item-title:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "1.3125rem"
    fontWeight: 500
    lineHeight: 1.25
  lead:
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
  support:
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.15
  small:
    fontFamily: "Alegreya Sans, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  sm: "5px"
  md: "6px"
  lg: "8px"
  xl: "10px"
spacing:
  xs: "4px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  gutter: "clamp(24px, 5.6vw, 80px)"
  section-top: "clamp(96px, 13.3svh, 120px)"
  section-bottom: "clamp(48px, 8svh, 72px)"
components:
  button-primary:
    backgroundColor: "{colors.ambra}"
    textColor: "{colors.inchiostro}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.55em 1.35em"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.ambra-forte}"
  button-outline:
    backgroundColor: "{colors.velo}"
    textColor: "{colors.carta}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.55em 1.35em"
    height: "48px"
  step-selected:
    backgroundColor: "{colors.foglio}"
    textColor: "{colors.ambra-forte}"
    typography: "{typography.item-title}"
    rounded: "{rounded.md}"
    padding: "12px 14px 12px 44px"
  sheet:
    backgroundColor: "{colors.stanza}"
    rounded: "{rounded.lg}"
  hero-screenshot:
    rounded: "{rounded.xl}"
  note:
    backgroundColor: "{colors.foglio}"
    textColor: "{colors.carta}"
    rounded: "{rounded.xl}"
    padding: "clamp(20px, 2.6vw, 32px)"
  toggle-on:
    backgroundColor: "{colors.ambra}"
    textColor: "{colors.inchiostro}"
    rounded: "{rounded.sm}"
    height: "44px"
  pin-label:
    backgroundColor: "{colors.ambra}"
    textColor: "{colors.inchiostro}"
    rounded: "{rounded.sm}"
    padding: "0.32em 0.75em"
---

# Design System: DM Toolkit, sito di presentazione

> **Ambito: solo `scopri/`** (`index.html`, `funzioni.html`, `domande.html`, `sito.css`, `sito.js`). Questo documento non descrive e non governa l'app DM Toolkit (`index.html` alla radice, `css/`, `js/`), che ha un proprio sistema visivo: non applicarlo lì e non usare l'app come fonte per il sito. Le schermate dell'app e i generatori che il sito mostra sono contenuto, non stile del sito.

## Overview

**Creative North Star: "Il tavolo luminoso"**

Il sito è il tavolo del Dungeon Master in una stanza buia, e il foglio acceso sul tavolo è l'app. La stanza è un blu petrolio profondo, fatta delle mappe stesse: nell'apertura un regno sta dietro a tutto, scurito da una velatura, e davanti c'è la schermata vera del combattimento. La luce viene dai fogli, e tutto il resto si ritira. Schermate, mappe e documenti generati portano quasi tutto il colore e il carattere; l'interfaccia resta sobria per lasciarli parlare.

La densità è bassa sulla home, con una sezione per schermo a partire da 1024px, e media nelle pagine interne, dove la lunghezza è libera e le sezioni alternano due tinte. Ogni funzione della home si presenta allo stesso modo: passi a sinistra, foglio a destra, e un segnaposto che ingrandisce il foglio fino al passo dopo. Il sito rifiuta il titolo centrato sopra una griglia di card e il fantasy dorato con ornamenti nell'interfaccia.

**Key Characteristics:**
- L'app in primo piano, le mappe come ambiente e come una funzione tra le altre.
- Un solo componente per tutte le funzioni: passi, foglio e segnaposto.
- Un segno ricorrente: il segnaposto cinabro indica il passo attivo e il luogo in cui sei.
- Fogli illuminati da una luce calda che sta sotto di loro.
- Tinte a tutta sezione al posto di divisori e riquadri.
- Solo tema scuro, senza variante chiara.
- Prova vera: schermate, mappe e stemmi reali al posto di illustrazioni.

## Colors

Una stanza di blu-verdi molto scuri, testo color carta e due accenti caldi con compiti diversi.

### Primary
- **Ambra di lampada** (#e9b84f): azione principale, etichetta del segnaposto, spunte e voce attiva dell'interruttore. Passa ad **Ambra accesa** (#f6cd6e) al passaggio del mouse, sul titolo del passo attivo e nell'anello di focus.

### Secondary
- **Cinabro da segnaposto** (#e0523f): il segnaposto, e la tinta del riquadro Segreto DM. Il contrasto con i fondi va da 3.1:1 a 4.4:1: basta per un segno grafico, non per il testo.
- **Cinabro chiaro** (#ffb4a6): la versione del cinabro che si può leggere, da 7.1:1 a 9.9:1 sui fondi. Solo per l'etichetta del Segreto DM e per i messaggi di errore.

### Neutral
- **Stanza** (#122a35): fondo di pagina, apertura e prima tinta delle sezioni con i passi.
- **Fondo** (#0c1f28): la tinta più scura, per le sezioni alterne, il piede e la testata staccata.
- **Petrolio** (#123a4a): la tinta più aperta, per la sezione che deve staccare, lo Scrittoio.
- **Foglio** (#18343f): superficie delle note e del passo attivo.
- **Carta** (#f2ecd8): titoli e testo principale, da 10.3:1 a 14.3:1 su tutti i fondi.
- **Nebbia** (#c0d0d5): testo di supporto, da 7.6:1 a 10.6:1 su tutti i fondi.
- **Inchiostro** (#0f2029): testo sulle superfici ambra (9.1:1).
- **Filo** (#f2ecd82e): bordi e divisori dei fogli. **Filo forte** (#f2ecd84d) per le schermate fuori dal componente a passi, **Filo da bottone** (#f2ecd880) per il pulsante a filo.
- **Velo** (#0c1f28d9): fondo semitrasparente del pulsante a filo, che lo tiene leggibile su ogni tinta e sopra la mappa dell'apertura.

### Named Rules
**The Segnaposto Rule.** Il segnaposto cinabro indica sempre il passo attivo o il luogo corrente, cioè il punto del foglio da cui si scende. Non è decorazione.

**The Due Accenti Rule.** L'ambra agisce, il cinabro segna. Un pulsante non è mai cinabro e la goccia del segnaposto non è mai ambra; la sua etichetta è ambra perché è l'azione.

## Typography

**Display Font:** Alegreya, peso 500 (con Georgia, serif)
**Body Font:** Alegreya Sans, 400 e 500 (con Segoe UI, sans-serif)

**Character:** Un serif umanistico da atlante per le voci che si leggono come nomi su una mappa, e il suo sans gemello per il testo, leggibile al tavolo con poca luce.

### Hierarchy
- **Display** (500, clamp(2.5rem, 4.1vw, 4rem), 1.04): un solo h1 per pagina. Riduzioni dedicate: fino a 3.25rem sotto 1180px, poi su una colonna fino a 3.75rem sotto 1024px, e 2.375rem sotto 640px.
- **Closing** (500, clamp(2.25rem, 4vw, 3.75rem), 1.05): la frase di chiusura nel piede della home.
- **Headline** (500, clamp(2rem, 3.2vw, 3rem), 1.08): titolo di sezione.
- **Title** (500, clamp(1.25rem, 1.6vw, 1.5rem), 1.2): h3 generico. La nota di esempio lo ingrandisce fino a 2.25rem.
- **Item title** (500, 1.3125rem, 1.25): passi, domande e garanzie, sempre in Alegreya. Nei passi l'interlinea scende a 1.2.
- **Lead** (400, 1.1875rem, 1.55): frase sotto un titolo, in Nebbia, larga al massimo 34rem. Nell'apertura sale a 1.3125rem sotto 1024px e scende a 1.0625rem sotto 640px.
- **Body** (400, 1.125rem, 1.55): testo corrente. Sotto 640px scende a 1.0625rem.
- **Support** (400, 1rem, 1.4): riga di testo dei passi, fatti dell'apertura e stato del generatore, in Nebbia.
- **Label** (500, 1.0625rem, 1.15): pulsanti.
- **Small** (400, 0.9375rem, 1.55): la nota legale del piede e, su telefono, i fatti dell'apertura.

### Named Rules
**The Lettura al Tavolo Rule.** Il testo corrente non scende sotto 1.0625rem, le righe brevi di supporto non scendono sotto 0.9375rem e il testo di supporto resta in Nebbia, mai più tenue: il sito si legge anche su iPad con poca luce.

**The Niente Maiuscoletto Rule.** I titoli restano in maiuscole e minuscole normali, in Alegreya 500. Cinzel, Crimson Pro e IM Fell caricati dalla home servono solo a stemmi e mappe generati dal vivo, e restano dentro i loro SVG.

## Layout

La griglia è a moduli interi dentro un contenitore largo al massimo 1280px, con margine laterale fluido (clamp(24px, 5.6vw, 80px)). La composizione delle funzioni sulla home è una colonna da 4 parti con titolo e passi accanto a un foglio da 8. L'apertura e le pagine interne usano 5 e 7, la chiusura 7 e 5, le testate di sezione 1 e 1, documenti e garanzie tre parti uguali con 24px di intervallo. Sono divisioni a colonne piene, e i blocchi non si accavallano: l'unica sovrapposizione è la mappa velata dietro all'apertura.

Sulla home, da 1024px, ogni sezione occupa almeno uno schermo (100svh), con un'intestazione fissa di 72px e padding verticale fluido. L'apertura ha il testo a sinistra e la schermata vera a destra, centrati in verticale, con i due pulsanti impilati a tutta colonna e sotto una riga di fatti con la spunta ambra. Dietro, a tutto schermo, c'è il regno sotto una velatura di Stanza che va dal 96% a sinistra, dove sta il testo, al 40% a destra, e che in basso si scioglie nella tinta della pagina.

Sotto 1024px tutto va su una colonna. L'apertura resta alta uno schermo, con il testo sopra e la schermata sotto, e la velatura diventa verticale e più fitta (dal 96% all'80%). Le altre sezioni perdono l'altezza minima e passano a 72px di padding (56px sotto 640px). I passi stanno su tre colonne fino a 640px, poi su una.

Il ritmo usa passi di 4, 8, 12, 16, 20, 24, 28 e 32px dentro i blocchi, e 48, 56 e 72px tra i blocchi.

### Named Rules
**The Una Sezione per Schermo Rule.** Sulla home ogni sezione dice una cosa sola e riempie lo schermo a partire da 1024px. Le pagine interne non seguono questa regola: la loro altezza dipende dal contenuto.

## Elevation & Depth

Il sistema è stratificato con una sola luce. La profondità viene dal cambio di tinta tra le sezioni e dalla luce sotto i fogli: un alone caldo di ambra che esce dal basso, accompagnato da un'ombra scura e stretta che appoggia il foglio. Dietro al foglio delle sezioni con i passi c'è anche una pozza di luce ambra molto tenue (gradiente radiale di #e9b84f12 a 66% 62%). Le sezioni restano piatte, e la testata prende un fondo solo quando si stacca.

### Shadow Vocabulary
- **Luce del foglio** (`box-shadow: 0 30px 80px -24px #e9b84f66, 0 12px 28px -12px #000c`, token `--luce-foglio`): sotto la schermata dell'apertura, i fogli con i passi, la nota, la mappa della chiusura e le schermate delle pagine interne.
- **Segnaposto** (`filter: drop-shadow(0 3px 4px #000a)`): stacca il segnaposto dal foglio sotto.
- **Etichetta del segnaposto** (`box-shadow: 0 4px 10px #0008`): stacca l'etichetta ambra dal foglio sotto.

### Named Rules
**The Foglio Acceso Rule.** Ogni foglio che mostra una cosa vera prende la stessa luce sotto, e nessun'altra ombra. Sta fermo: al passaggio del mouse non si solleva. Stemmi e documenti dello Scrittoio stanno senza foglio e senza luce, perché hanno già la propria sagoma.

## Shapes

Angoli appena smussati e in crescita con la misura: 5px per etichette e controlli interni, 6px per pulsanti e passi, 8px per i fogli e le immagini, 10px per le due superfici più importanti, cioè la schermata dell'apertura e la nota. I bordi sono linee da 1px color carta traslucido. L'unica sagoma propria è la goccia del segnaposto, disegnata in SVG inline; icone e segni di interfaccia sono sempre SVG a tratto. Il marchio è l'icona dell'app (`icons/icon-192.png`) a 32px, su fondo trasparente e senza riquadro.

## Components

### Buttons
Pari per misura e peso, diversi solo per il riempimento.
- **Shape:** curvatura media (6px), altezza minima 48px, testo sempre centrato.
- **Primary:** pieno, Ambra di lampada con testo Inchiostro. Si usa per "Prova la campagna di esempio".
- **Outline:** Velo con bordo Filo da bottone e testo Carta. Si usa per "Apri il toolkit" e per i generatori dal vivo, come "Disegna un altro regno".
- **Hover / Focus:** il pieno passa ad Ambra accesa; il filo prende bordo Carta e fondo #f2ecd814. Alla pressione scendono di 1px e scalano a .985. Il focus è un anello da 3px in Ambra accesa con 3px di distacco, uguale per ogni elemento.
- **Disabled:** opacità .65 e cursore di attesa, con il testo che racconta cosa accade ("Sto disegnando…").

### Passi, foglio e segnaposto
La firma del sito (`.discesa`, `.tappa`, `.lastra`, `.segno`), uguale in Wiki, tavolo, mappe e generatori. Una funzione nuova della home si costruisce con questo componente.
- **Passi:** tre righe a tutta larghezza senza bordo a riposo, con titolo e una riga di testo e 44px di rientro a sinistra per il segnaposto. Il passo attivo ha fondo Foglio, bordo Filo, segnaposto da 22px e titolo in Ambra accesa; al passaggio del mouse il fondo è #f2ecd80f. Semantica di tablist, con frecce e Home/End da tastiera.
- **Foglio:** rapporto 1.44:1 per le schermate e 1.4:1 per le mappe, 8px di curvatura, bordo Filo, fondo Stanza e Luce del foglio. Le immagini stanno impilate, a filo del bordo.
- **Segnaposto:** una goccia cinabro da 44px con etichetta ambra in Alegreya Sans, posata sul punto vero del foglio da cui si scende e con l'etichetta che dice dove porta ("Apri il Monte Ardegna"). L'ultimo passo non ha segnaposto sul foglio, perché non c'è un livello sotto. Su telefono si riduce a 32px, con etichetta a .875rem; l'area di tocco resta di 44px grazie a un margine invisibile.
- **Movimento:** il segnaposto ingrandisce il foglio verso il proprio punto (.8s, scala fino a 5) mentre il passo dopo arriva da .94 con una dissolvenza (.5s).
- **Generatore dal vivo:** nella sezione delle mappe, sotto i passi, un pulsante a filo disegna un altro regno in un worker e sostituisce il primo foglio, con una riga di stato che porta il codice della mappa. Il segnaposto si nasconde, perché il luogo a cui portava non esiste sul regno nuovo.

### Apertura
Il testo e la schermata del combattimento, sulle cinque e sette colonne descritte in Layout. La schermata ha 10px di curvatura, bordo Filo forte e Luce del foglio, e si accende una sola volta al caricamento salendo di 14px con una dissolvenza (.9s). La mappa dietro è solo ambiente: nascosta ai lettori di schermo, non animata e senza segnaposto.

### Schermate dell'app
Tutte catturate dall'app vera con la campagna di esempio, tema scuro, sfondo Grigio chiaro e testo al 125%, a 1800 per 1250px. Così la finestra si stacca dalla stanza e si legge anche dentro un foglio.

### Cards / Containers
Fogli, non card: si usano per mostrare una cosa vera, non per ripetere griglie di testo. Il foglio con i passi, la schermata dell'apertura e la nota hanno le regole già viste. Nelle pagine interne le schermate hanno 8px di curvatura e bordo Filo forte, e la mappa della chiusura 8px e bordo Filo, con un segnaposto fisso sul luogo. La Luce del foglio vale per tutti.

### Navigation
Testata fissa da 72px con marchio, due collegamenti e il pulsante a filo "Apri il toolkit". Sulla home parte trasparente su una sfumatura e diventa Fondo pieno con bordo Filo dopo 40px di scorrimento; nelle pagine interne è piena da subito. Il collegamento attivo o sotto il mouse prende una sottolineatura ambra da 2px che cresce da sinistra. Sotto 640px il nome "DM Toolkit" resta solo per i lettori di schermo e si vede l'icona, mentre collegamenti e pulsante restano al loro posto.

### Nota con vista giocatori
La nota mostra una scheda vera; un interruttore a due posizioni (selezionata in Ambra con testo Inchiostro) nasconde il riquadro Segreto DM, che si chiude in altezza (.4s). Il riquadro usa un fondo cinabro al 12% (#e0523f1f), un bordo cinabro al 50% (#e0523f80) e l'etichetta in Cinabro chiaro, perché il cinabro pieno non basta per il testo. Padding da 20 a 32px, fino a 40px nella sezione Segreti su schermi ampi.

### Domande
Elenco a due colonne di voci espandibili separate da un Filo in alto, con titolo Item title e un più in SVG ambra che ruota di 45 gradi all'apertura (.25s). Altezza minima 60px.

## Do's and Don'ts

### Do:
- **Do** mostrare cose vere e provabili: schermate reali da `scopri/img/`, mappe generate, stemmi disegnati dal vivo.
- **Do** catturare le schermate nuove come le altre: campagna di esempio, tema scuro, sfondo Grigio chiaro, testo al 125%.
- **Do** presentare ogni funzione della home con passi, foglio e segnaposto.
- **Do** tenere le due azioni con la stessa misura (altezza 48px, stesso peso), una piena e una a filo.
- **Do** usare per il movimento la curva `cubic-bezier(.16, 1, .3, 1)` e tempi di .18s per gli stati, e rispettare `prefers-reduced-motion`.
- **Do** garantire aree di tocco di almeno 44px, come in testata, passi, piede e interruttore.
- **Do** separare le sezioni con il cambio di tinta tra Stanza, Fondo e Petrolio.

### Don't:
- **Don't** applicare questo sistema all'app alla radice, né portare qui i temi e i colori dell'app.
- **Don't** usare il titolo centrato sopra una griglia di card.
- **Don't** rimettere la mappa in primo piano nell'apertura: lì il soggetto è l'app, e la mappa resta velata dietro.
- **Don't** aggiungere ornamenti dorati, cornici o pergamena all'interfaccia del sito. Il limite vale per l'interfaccia: bussole dorate, pergamene e sigilli restano ammessi dentro mappe e documenti generati, che sono il prodotto.
- **Don't** aggiungere illustrazioni dipinte: se servono, si chiedono all'utente, che le fa generare.
- **Don't** usare emoji, loghi o personaggi ufficiali di D&D.
- **Don't** usare il cinabro pieno per il testo o per i pulsanti.
- **Don't** ripetere l'animazione di apertura a ogni scorrimento: la schermata si accende una volta sola.

---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["css/base.css","css/layout.css","css/components.css"]
---

# App DM Toolkit (index.html + css/ + js/)

Scope: l'applicazione, non il sito scopri/. Modalità: Operate. Chi la usa: Dungeon Master italiani, alla scrivania per preparare e al tavolo (tablet, telefono, poca luce) per giocare. Compiti: preparare la sessione, consultare la Wiki, gestire la sessione dal vivo. Vincolo dell'utente: le card piacciono e restano, ma non tutte uguali; niente "troppo carico"; deve sembrare un prodotto professionale e non fatto con l'IA (commento Reddit: "estetica default vibe code"). Contenuti invariati: si riorganizza ciò che c'è.

## Direction contract

THESIS: un'app di lavoro sobria e precisa, dove la gerarchia la fanno peso, dimensione e posizione; rifiuta la griglia di riquadri tutti uguali con titoli in maiuscoletto fantasy.

OWN-WORLD: neutri caldi grafite (#111214, #191a1d, #202226) e carta chiara nel tema chiaro; un solo accento, il vino del logo (#9e2b3a), solo sulle azioni; stati: ambra scadenze, verde acqua attivo, viola personale. Un carattere, Atkinson Hyperlegible Next, scelto per la leggibilità con poca luce. Card a bordo sottile, raggio 14, nessun bordo colorato a sinistra, vuoti raccolti in una riga tratteggiata.

STORY: chi apre la Dashboard vede subito l'ultima sessione e cosa arriva; trova il resto senza cercare; al telefono usa la barra in basso.

FIRST VIEWPORT: barra in alto (logo, campagna, Dashboard/Wiki/Mappe/Sessione/Strumenti, ricerca Ctrl K, dadi); titolo campagna con azioni a destra; due colonne: a sinistra l'ultima sessione grande con azioni, sotto scadenze e clock affiancati; a destra segreti, fazioni, Sessione Zero, vista giocatori.

FORM: struttura derivata dai contenuti esistenti della Dashboard dopo che l'utente ha chiesto di non inventare contenuti; nessun sorteggio applicato a questa versione. seed: d6a73a35177ce8a2 (giro iniziale, superato).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment

La Dashboard che si legge in un colpo d'occhio: ultima sessione, cosa arriva, cosa è segreto.

## Unresolved

- Barra in alto su computer: richiede di riorganizzare la navigazione laterale esistente.
- Tema chiaro da derivare.

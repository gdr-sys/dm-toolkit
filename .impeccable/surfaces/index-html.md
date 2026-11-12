---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["css/base.css","css/layout.css","css/components.css"]
---

# App DM Toolkit (index.html + css/ + js/)

Scope: l'applicazione, non il sito scopri/. Modalità: Operate. Chi la usa: Dungeon Master italiani, alla scrivania per preparare e al tavolo (tablet, telefono, poca luce) per giocare. Compiti: preparare la sessione, consultare la Wiki, gestire la sessione dal vivo. Vincolo dell'utente: le card piacciono e restano, ma non tutte uguali; niente "troppo carico"; deve sembrare un prodotto professionale e non fatto con l'IA (commento Reddit: "estetica default vibe code"). Contenuti invariati: si riorganizza ciò che c'è.

## Direction contract

THESIS: ogni pagina si apre come la locandina della campagna: una scena disegnata dal nome e il titolo sopra; sotto, fasce di tessere tonde e piatte. Scelta dall'utente tra tre prototipi (2026-11-12), dopo aver scartato una versione "sobria" e una a "semi".

OWN-WORLD: tutti i colori nascono da tre numeri (tinta di fondo, tinta d'accento, intensita') in oklch: sette tavolozze (brace, grafite, bosco, cuoio, inchiostro, vino, nero), ognuna in notte e giorno. Titoli in Gloock, testo in Figtree. Tessere con raggio 20, senza bordo, ombra o sfumatura. Card "sobrie" predefinite (colore di categoria solo nell'etichetta), "colorate" a scelta.

STORY: chi apre la Dashboard vede l'ultima sessione sulla scena, poi cosa incombe, le quest, il mondo che si muove.

FIRST VIEWPORT: barra in alto; scena a tutta larghezza con nome della campagna, sessione, titolo grande, riassunto, tre pulsanti a pillola.

FORM: mossa propria: i segni del gioco al posto delle barre generiche (ruota a spicchi per i clock, pallini per fazioni e indizi, giorni in grande per le scadenze); la scena e' generata, non servono illustrazioni.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment

La Dashboard che si legge in un colpo d'occhio: ultima sessione, cosa arriva, cosa è segreto.

## Unresolved

- Barra in alto su computer: richiede di riorganizzare la navigazione laterale esistente.
- Tema chiaro da derivare.

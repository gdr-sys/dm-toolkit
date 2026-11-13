# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dungeon Master di D&D 5e (2014 e 2024) che preparano e conducono una campagna, spesso al tavolo con un tablet o un portatile. Parlano italiano. Chi arriva sul sito di presentazione non conosce ancora il prodotto e vuole capire in pochi secondi cos'e', se e' gratis e come provarlo.

## Product Purpose

DM Toolkit tiene un'intera campagna nello stesso posto: preparazione, mondo, mappe, combattimento al tavolo e diario delle sessioni. Si usa nel browser, senza installare nulla, da qualsiasi dispositivo. Successo: il DM smette di tenere la campagna tra fogli, cartelle e app diverse.

## Positioning

Gratuito e destinato a restarlo. Genera da solo mappe di regni, citta', villaggi, caverne, dungeon ed edifici, con il mondo della campagna gia' collegato: dal segnaposto di un regno si scende alla citta' e alla locanda. L'autore l'ha creato per il proprio tavolo.

## Operating Context

Si usa prima della sessione alla scrivania e durante la sessione al tavolo, anche su iPad e anche senza internet. App installabile (PWA) su GitHub Pages. La campagna vive sul Google Drive del DM oppure solo sul dispositivo; Firebase fa solo da segnale in tempo reale.

## Capabilities and Constraints

- Wiki collegata, PNG, luoghi, fazioni, quest, grafo, segreti e indizi.
- Mappe interattive annidate, Cartografo (sei tipi di mappa), misura distanze.
- Scrittoio: stemmi e documenti per i giocatori.
- Combat tracker, scene planner, diario, clock, turni di fazione.
- 22 generatori e tabelle personali; Compendio SRD 5.1 e 5.2.1; homebrew.
- Schermo del DM, Sessione Zero, calendario del mondo.
- Vista giocatori in sola lettura che esclude i segreti; co-autori con codice invito.
- Funziona offline. Nessuna app da installare e nessun account obbligatorio.
- Ancora da fare, da non promettere: nebbia sulle mappe per i giocatori.

## Brand Commitments

- Nome: DM Toolkit. Icona esistente in `favicon.png` e `icons/`.
- Lingua: italiano, tono semplice e diretto.
- Gratuito, e lo restera': si puo' dire. Non si scrivono prezzi futuri.
- Copyright: © 2026 Noemi Marcolini, tutti i diritti riservati (LICENSE). Il nome compare solo negli avvisi di copyright (Impostazioni, piede del sito, README); nei testi del sito resta la voce in prima persona "l'ho creato per il mio tavolo".
- Progetto indipendente, non affiliato a Wizards of the Coast. Dati di gioco da SRD 5.1 (OGL 1.0a e CC-BY-4.0) e 5.2.1 (CC-BY-4.0), con attribuzione. Nessun logo o personaggio ufficiale di D&D.
- Niente emoji nell'interfaccia.

## Evidence on Hand

- Schermate reali in `docs/img/`; mappe, stemmi e documenti generabili dal vivo con `js/cartografo-*.js`, `js/araldica.js`, `js/documenti.js`.
- Campagna di esempio "Le Ceneri di Valmora", apribile con `?demo=1`.
- Non esistono recensioni, citazioni, numeri di utenti o stampa: non vanno inventati.

## Product Principles

1. Mostrare il prodotto vero invece di descriverlo.
2. Il DM resta padrone dei propri dati e dei propri segreti.
3. Ogni funzione deve servire davvero al tavolo.
4. Provare deve costare zero: niente registrazione per iniziare.

## Accessibility & Inclusion

Leggibile su iPad al tavolo con poca luce; testo grande, contrasto alto e tocchi comodi.

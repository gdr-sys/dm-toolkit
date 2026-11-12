# Immagini di sfondo delle scene

Metti qui le immagini che l'app usa al posto del paesaggio disegnato in cima alle pagine.
Il nome del file decide dove compare: basta salvarlo qui con il nome giusto, senza toccare il codice.
Se un file manca, l'app continua a usare il disegno.

## Formato

- **Larghe:** 21:9, per esempio 2560 × 1100 pixel.
- **Soggetto a destra:** a sinistra e in basso ci vanno titolo e testo, quindi lì serve una zona calma.
- **Bianco e nero:** il colore lo aggiunge l'app, prendendolo dalla tavolozza scelta nelle Impostazioni
  (brace, grigio, verde, marrone, blu, vino, nero), sia di notte sia di giorno.
  Un'immagine a colori funziona lo stesso, ma l'app la porta comunque in bianco e nero.
- **Formato `.webp`**, nomi tutti minuscoli e senza accenti (per esempio `vulcano.webp`).
- **Peso:** meglio sotto i 400 KB l'una; l'app si scarica sui telefoni.

## Paesaggi della campagna (Home, Dashboard, pagina della campagna)

L'app sceglie il paesaggio dalle parole del nome e della descrizione della campagna
(per esempio "Ceneri" → vulcano). Chi usa l'app può anche sceglierlo a mano dal pulsante **Sfondo**.

| File | Paesaggio |
|---|---|
| `vulcano.webp` | Vulcano |
| `montagne.webp` | Montagne |
| `colline.webp` | Colline, valli, villaggi |
| `foresta.webp` | Foresta |
| `costa.webp` | Costa e mare |
| `citta.webp` | Città e castelli |
| `deserto.webp` | Deserto |
| `palude.webp` | Palude |
| `gelo.webp` | Nord gelido |
| `rovine.webp` | Rovine |

## Pagine

| File | Pagina |
|---|---|
| `wiki.webp` | Wiki (tutte le sezioni e le schede) |
| `sessione.webp` | Sessione |
| `mappa.webp` | Mappe |
| `cartografo.webp` | Cartografo |
| `scrittoio.webp` | Scrittoio |
| `schermo.webp` | Schermo del DM |
| `compendio.webp` | Compendio |
| `musica.webp` | Musica e atmosfere |
| `calendario.webp` | Calendario |
| `generatori.webp` | Generatori |

## Ordine di scelta

Per ogni pagina l'app usa la prima che trova:

1. l'immagine caricata da chi usa l'app con il pulsante **Sfondo** su quella pagina;
2. l'immagine della pagina in questa cartella;
3. l'immagine caricata per la campagna;
4. l'immagine del paesaggio della campagna in questa cartella;
5. il paesaggio disegnato.

Le immagini caricate col pulsante **Sfondo** restano nella campagna (e su Google Drive, se è collegato);
quelle in questa cartella valgono per tutti.

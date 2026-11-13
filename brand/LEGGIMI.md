# Pocket GM Screen: file dell'identità

Identità decisa il 2026-11-13. Brand book completo: vedi la pagina pubblicata (link nelle note del progetto).

- **Nome:** Pocket GM Screen ("GM", non "DM"). Sotto l'icona del telefono: "Pocket GM".
- **Slogan:** «Tutta la campagna, in tasca.» / «Your whole campaign, in your pocket.»
- **Segno:** lo schermo del master a tre pannelli che spunta da una tasca cucita.
- **Colore di marca (cuoio):** `#a8662e` (logo e icone). Testo sul chiaro `#8a4f1f`, testo sullo scuro `#e0a26b`. Inchiostro `#1a1612`, carta `#f6efe8`. Pulsanti pieni: fondo `#8a4f1f`, testo bianco.
- **Caratteri:** Gloock (titoli, logo; "GM" in maiuscoletto al 62%), Figtree (testo).

## File

| File | Uso |
|---|---|
| `simbolo.svg` | Simbolo con cucitura, da 32 px in su |
| `simbolo-piccolo.svg` | Simbolo senza cucitura, 16-24 px |
| `simbolo-bianco.svg`, `simbolo-nero.svg` | Una tinta |
| `logo-orizzontale-chiaro.svg` / `-scuro.svg` | Simbolo + scritta, su fondo chiaro / scuro |
| `logo-verticale-chiaro.svg` / `-scuro.svg` | Simbolo sopra, scritta sotto |
| `logo-nero.svg`, `logo-bianco.svg` | Orizzontale, una tinta |
| `icone/favicon.svg`, `favicon-32.png`, `favicon-48.png` | Scheda del browser |
| `icone/icon-192.png`, `icon-512.png` | App installata (purpose "any") |
| `icone/icon-maskable-512.png` | App installata Android (purpose "maskable", simbolo nell'80% centrale) |
| `icone/apple-touch-icon.png` | iPhone e iPad, 180 px |

Le scritte dei loghi usano Gloock incorporato nel file (solo le lettere del nome, licenza SIL Open Font License): si vedono uguali ovunque. I tagli tra schermo e tasca sono maschere, non colori di sfondo: il segno funziona su qualsiasi fondo.

## Regole

- Spazio libero intorno al logo: almeno l'altezza dello schermo che spunta.
- Non deformare, ruotare, ricolorare con altri colori, aggiungere ombre o bagliori, né mettere su fondi senza contrasto.
- Nell'app restano le sette tavolozze: il colore di marca vive in logo, icone, avvio e sito.
- La cartella di Google Drive resta "DM Toolkit" (`FOLDER_NAME` in `index.html`): rinominarla farebbe sparire i backup esistenti.

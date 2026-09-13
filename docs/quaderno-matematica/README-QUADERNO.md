# Quaderno «Matematica Facile» — sorgenti (PDF/UA-1, 66 pagine)

Sorgenti completi del quaderno inclusivo **«Matematica Facile — Il quaderno di
matematica e geometria (liceo linguistico, obiettivi minimi)»**, il PDF di
5 anni scaricabile dall'app con il pulsante nella seconda pagina
(`/quaderno-matematica-facile-v4.pdf`, punto di integrazione:
`client/src/pages/BiquadraticExercises.tsx`).

## Ricostruzione (REBUILD)

```bash
pip install weasyprint pymupdf          # dipendenze
python3 build.py                        # → quaderno-matematica-facile.pdf (A4, PDF/UA-1)
python3 fix_fill.py                     # opzionale: ribilancia le pagine di continuazione
```

`build.py` concatena le 8 sezioni HTML (00-copertina → 07-anno5) con `styles.css`
e genera il PDF con WeasyPrint. Font OpenDyslexic: installarlo di sistema
(`~/.fonts`) o adattare il `@font-face` in `styles.css`.

## Struttura

| File | Contenuto |
|---|---|
| `00-copertina.html` | Copertina (nessun numero di pagina) |
| `01-indice.html` | Indice con numeri di pagina automatici (`target-counter`) |
| `02-anno1a.html` … `07-anno5.html` | Un file per anno (anno 1 in due parti) |
| `styles.css` | Impaginazione: `@page`, box, accessibilità |
| `build.py` | Assemblaggio + generazione PDF/UA-1 |
| `autobalance.py` | Bilanciamento per caratteri (versione semplice) |
| `fix_fill.py` | Bilanciamento per riempimento reale (PyMuPDF, versione forte) |

## Regole di impaginazione (v4) — NON arretrare

1. **Nessun box spezzato tra due pagine**: tutti i box hanno
   `break-inside: avoid` (`.box, .trucco, .attenzione, .formula-box, .esempio,
   .insintesi, .mettiti, .domanda, .soluzioni, .inquesta, figure.diagramma,
   table, .mappa-q, .page-head, .legenda`). Un tema non finisce MAI con un box
   troncato a metà.
2. **Numero di pagina più in alto**: `@bottom-center` con
   `padding-bottom: 6mm` → il numero sta nel margine bianco, sollevato dal
   fondo, mai nel flusso del contenuto. Copertina senza numero (`@page :first`).
3. **Layout arioso**: interlinea e spaziature rilassate; nessuna pagina
   «soffocata». Riempimento medio ~75%.
4. **Pagine di continuazione mai spoglie**: ogni pagina che continua un tema
   deve riempire almeno il ~45% (misura con PyMuPDF su content-bottom 842−57 pt).
   `fix_fill.py` sposta il salto di pagina di 1 box prima quando la
   continuazione è <45% e l'origine >60%.
5. **Salti di pagina**: classe `.salto` (`break-before: page`) sugli elementi;
   `.ristretta` (page: stretta, margini 13/15/17 mm) e `.compact` solo dove
   serve.

## ⚠️ Lezione appresa (bug «salto in catena»)

Nelle versioni precedenti `fix_fill.py`, rieseguito su pagine ancora spoglie,
aggiungeva un `.salto` a un elemento che ne aveva già uno ricevuto in passata
precedente → **catena di salti** → 2 pagine di continuazione quasi vuote invece
di una. La versione attuale include la guardia **anti-catena**: quando aggiunge
un nuovo salto all'elemento *t*, rimuove i salti ridondanti sugli elementi
successivi della stessa sezione (rimozione da destra per mantenere validi gli
offset). Se si modifica il bilanciatore, verificare SEMPRE dopo ogni passata
che il numero di pagine non aumenti e che nessuna continuazione scenda sotto
il 42%.

## Adattamenti (ADATTARE)

- **Contenuto/anno**: ogni anno è un file HTML autonomo con struttura fissa:
  `header.page-head` (h2 + filo), box `CHE COSA…`, tabelle, `trucco`,
  `attenzione`, `esempio`, `mettiti alla prova`. Testi semplici, frasi brevi,
  lessico trasparente per obiettivi minimi.
- **Altro indirizzo/lingua**: cambiare solo i testi degli HTML; la CSS non va
  toccata.
- **Nuovo tema**: aggiungere una `<section class="page" id="...">` con lo stesso
  schema di blocchi; l'indice usa `target-counter` quindi i numeri di pagina si
  aggiornano da soli.

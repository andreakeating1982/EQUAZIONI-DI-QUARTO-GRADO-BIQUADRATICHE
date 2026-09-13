# Quaderno «Matematica Facile» — sorgenti (PDF/UA-1, 53 pagine, flusso continuo)

Sorgenti completi del quaderno inclusivo **«Matematica Facile — Il quaderno di
matematica e geometria (liceo linguistico, obiettivi minimi)»**, il PDF di
5 anni scaricabile dall'app con il pulsante nella seconda pagina
(`/quaderno-matematica-facile-v4.pdf`, punto di integrazione:
`client/src/pages/BiquadraticExercises.tsx`).

## Ricostruzione (REBUILD)

```bash
pip install weasyprint pymupdf          # dipendenze
python3 build.py                        # → quaderno-matematica-facile.pdf (A4, PDF/UA-1)
```

`build.py` concatena le 8 sezioni HTML (00-copertina → 07-anno5) con `styles.css`
e genera il PDF con WeasyPrint. Font OpenDyslexic: installarlo di sistema
(`~/.fonts`) o adattare il `@font-face` in `styles.css` (gli URL puntano a
`client/public/fonts/` dell'app).

## Struttura

| File | Contenuto |
|---|---|
| `00-copertina.html` | Copertina (nessun numero di pagina) |
| `01-indice.html` | Indice con numeri di pagina automatici (`target-counter`) |
| `02-anno1a.html` … `07-anno5.html` | Un file per anno (anno 1 in due parti) |
| `styles.css` | Impaginazione: `@page`, box, accessibilità, flusso continuo |
| `build.py` | Assemblaggio + generazione PDF/UA-1 |
| `autobalance.py`, `fix_fill.py`, `collapse.py` | DEPRECATI (hanno una guardia: escono subito) |

## Paradigma di impaginazione: FLUSSO CONTINUO (v5)

I temi **non** forzano più una nuova pagina: scorrono uno dopo l'altro e la
banner colorata del tema (`.page-head`) è il separatore visivo. Nuove pagine solo
per copertina, indice e divisori d'anno (`.divider { break-before/after: page }`).
Risultato: 53 pagine, riempimento medio 87%, 32 pagine oltre il 90%, nessuna
pagina di coda spoglia (solo i naturali fini d'anno e l'ultima).

Regole NON negoziabili:

1. **Nessun box spezzato tra due pagine**: `break-inside: avoid` su tutti i box
   (`.box, .trucco, .attenzione, .formula-box, .esempio, .insintesi, .mettiti,
   .domanda, .soluzioni, .inquesta, figure.diagramma, table, .mappa-q,
   .mappa-griglia, .mappa-box, .page-head, .legenda`). Attenzione a
   `.mappa-griglia`/`.mappa-box`: sono `display:table/table-cell`, il selettore
   `table` NON li copre — vanno elencati esplicitamente.
2. **Banner mai orfane a fondo pagina**: `.page-head { break-after: avoid;
   break-inside: avoid }` — se il primo box del tema non entra, la banner scende
   alla pagina successiva insieme a esso.
3. **Titoli mai orfani**: `h3.titoletto { break-after: avoid }`.
4. **Numero di pagina** nel margine, sollevato (`@bottom-center` +
   `padding-bottom: 6mm`); assente in copertina (`@page :first`).
5. **Spaziatura tra temi**: `.page { margin-top: 3.5mm }` — i margini adiacenti
   a un'interruzione di pagina naturale sono troncati da WeasyPrint, quindi la
   spaziatura compare solo quando un tema inizia a metà pagina.
6. **NIENTE salti forzati nei temi**: la classe `.salto` resta definita nel CSS
   ma non va usata; i bilanciatori (`fix_fill.py`, `autobalance.py`,
   `collapse.py`) sono DEPRECATI e hanno una guardia che impedisce l'uso (i
   `ristretta` creerebbero pagine nominate = interruzioni forzate).
7. **NIENTE `display:flex`** nel quaderno: il testo dei flex item non va a capo e
   viene tagliato a destra — usare `display:table/table-cell` o `inline-block`.
8. **Font ×1.4 (corpo 14 pt)** per la leggibilità DSA: la densità si regola con
   interlinea (1.29), padding e margini, mai con il corpo del testo.

## Adattamenti (ADATTARE)

- **Contenuto/anno**: ogni anno è un file HTML autonomo; struttura dei temi:
  `header.page-head` (h2 + filo), box `CHE COSA…`, tabelle, `trucco`,
  `attenzione`, `esempio`, `mettiti alla prova`. Testi semplici, frasi brevi,
  lessico trasparente per obiettivi minimi.
- **Nuovo tema**: aggiungere una `<section class="page" id="...">` con lo stesso
  schema di blocchi — si inserisce da sola nel flusso; l'indice usa
  `target-counter` quindi i numeri di pagina si aggiornano da soli.
- **Tema troppo lungo**: se un tema supera ~2,5 pagine valutare di spezzarlo in
  due sezioni con due banner; NON aggiungere `.salto`.
- **Altro indirizzo/lingua**: cambiare solo i testi degli HTML; la CSS non va
  toccata.

## ⚠️ Lezioni apprese

- **«Salto in catena»**: nell'era del bilanciamento, rieseguire `fix_fill.py` su
  pagine spoglie aggiungeva salti in catena → 2 pagine quasi vuote invece di 1.
  La guardia anti-catena è nel codice, ma l'intera strategia è stata superata
  dal flusso continuo.
- **La compattazione da sola non riempie le code**: ridurre interlinea e padding
  accorcia i temi ma le code restano mezze vuote finché «un tema = una pagina».
  Con temi da 1,1–1,6 pagine la sola via d'uscita è il flusso continuo.
- **Verificare sempre con montaggi**: `pdftoppm -r 40` + griglia di miniature
  (5×3) permette di controllare tutte le pagine in 4 immagini; i controlli
  automatici (riempimento, banner orfane) vanno comunque confermati a vista su
  un campione ad alta risoluzione.

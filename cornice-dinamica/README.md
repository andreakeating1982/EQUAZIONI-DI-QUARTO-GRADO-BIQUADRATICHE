# CORNICE DINAMICA — EQUAZIONI BIQUADRATICHE (embed per Blogger)

Questa cartella contiene la **cornice dinamica** dell'app EQUAZIONI BIQUADRATICHE:
un blocco HTML autonomo da incollare su Blogger (o su qualsiasi sito) che mostra
l'app dentro un iframe con **altezza automatica** e **font OpenDyslexic**.

## File contenuti

| File | Descrizione |
|---|---|
| `embed-equazioni-biquadratiche-lite.html` | ⭐ **Versione leggera (~3 KB)**: font OpenDyslexic caricati dall'app via CORS. Codice piccolo e leggibile, ideale da incollare nel post. Richiede che l'app sia online. |
| `embed-equazioni-biquadratiche.html` | **Versione autosufficiente (~110 KB)**: font incorporati in base64. Funziona anche se l'app è offline (i font restano) ed è robusta su qualsiasi piattaforma. |
| `fonts/OpenDyslexic-Regular-v2.woff2` | Font OpenDyslexic Regular (copia locale per riferimento) |
| `fonts/OpenDyslexic-Bold-v2.woff2` | Font OpenDyslexic Bold (copia locale per riferimento) |
| `README.md` | Questo file |

## Come si usa

1. Apri il post in Blogger e passa alla **vista HTML**.
2. Incolla l'intero contenuto di `embed-equazioni-biquadratiche-lite.html`
   (consigliata) oppure di `embed-equazioni-biquadratiche.html` (autosufficiente).
3. Pubblica. L'iframe mostra l'app e si adatta da solo all'altezza del contenuto
   (desktop, tablet, cellulare).

## Le due versioni a confronto

| Caratteristica | `...-lite.html` | `embed-equazioni-biquadratiche.html` |
|---|---|---|
| Dimensione | ~3 KB | ~110 KB |
| Font OpenDyslexic | caricati da `/fonts/*` dell'app (CORS) | incorporati in base64 |
| App online richiesta | sì (font + contenuto) | solo per il contenuto |
| Vantaggio | codice leggibile, font sempre aggiornati | funziona ovunque, zero dipendenze |

## Come funziona l'altezza automatica

L'app (quando è dentro un iframe) e la cornice comunicano con il protocollo
**`labvisivo:height`** via `postMessage`:

1. L'app aggiunge la classe `lf-embedded` a `<html>` (in `heightSync.ts`) così
   i `min-h-screen` / `min-h-[calc(100dvh-*)]` vengono disattivati: la pagina
   segue l'altezza del **contenuto**, non del viewport (evitando il loop
   infinito iframe → contenuto → iframe).
2. L'app invia al parent `{ type: "labvisivo:height", height: <px> }` ogni volta
   che l'altezza cambia (ResizeObserver, load, resize, retry).
3. La cornice ascolta il messaggio e imposta `iframe.style.height`.
4. La cornice può richiedere l'altezza in qualsiasi momento inviando
   `{ type: "labvisivo:ping" }`.

## Nota sui font e CORS

La versione **lite** carica i font OpenDyslexic cross-origin dall'app
(`https://equazioni-biquadratiche.easy-peasy.site/fonts/*`). Il server dell'app
espone l'header `Access-Control-Allow-Origin: *` su `/fonts/*`, quindi il
caricamento funziona anche da Blogger. Se in futuro si sposta l'app su un host
senza CORS, usare la versione autosufficiente (font in base64).

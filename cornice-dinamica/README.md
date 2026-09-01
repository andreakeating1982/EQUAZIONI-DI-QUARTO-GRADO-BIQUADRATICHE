# CORNICE DINAMICA — EQUAZIONI DI QUARTO GRADO BIQUADRATICHE (embed per Blogger)

Questa cartella contiene la **cornice dinamica** dell'app EQUAZIONI DI QUARTO GRADO
BIQUADRATICHE: un blocco HTML autonomo da incollare su Blogger (o su qualsiasi sito)
che mostra l'app dentro un iframe con **altezza automatica** e **font OpenDyslexic**.

## File contenuti

| File | Descrizione |
|---|---|
| `embed-equazioni-biquadratiche-dedicata.html` | ⭐ **Versione DEDICATA (~19 KB, v3 impermeabile + anti-loop)**: serve **solo** «Equazioni di quarto grado biquadratiche» (URL fisso). 🛡️ **IMPERMEABILE**: funziona anche se il blog ha altre cornici simili nella stessa pagina — ogni istanza è un'isola (id univoci con token, scoping DOM, filtro `e.source`, nessuna app può apparire dentro l'iframe di un'altra). Layout: **titolo e pulsanti sulla stessa riga, tutti centrati** (su schermi stretti vanno a capo). Pulsanti **Schermo intero** e **Ricarica**, **spinner**, **stato online/errore** con Riprova (timeout 15 s), ping periodico + altezza al resize, **anti-loop mobile** (debounce + clamp + conferma salti sospetti + congelamento). Font OpenDyslexic via CORS. **La versione consigliata per questo blog.** |
| `test-impermeabile.html` | **Pagina di test**: simula il blog con 2 cornici + una cornice «estranea» che tenta il furto dell'iframe e posta altezze false. Apri il file in un browser per verificare che ogni cornice mostri solo la propria app. |
| `test-dedicata.html` | Pagina di test semplice: un singolo post che carica la cornice dedicata. |
| `embed-equazioni-biquadratiche-lite.html` | **Versione leggera (~5 KB)**: font OpenDyslexic caricati dall'app via CORS. Codice piccolo e leggibile, ideale da incollare nel post. **Riutilizzabile**: per un'altra app basta cambiare la riga `APP_URL` (o passare `?app=URL` nella pagina). Richiede che l'app sia online. |
| `embed-universale.html` | **Template universale per altre app**: identico alla versione lite ma con URL segnaposto (`https://LA-TUA-APP.example.com/`). Copia il file, cambia `APP_URL` e `APP_TITLE` e incollalo dove vuoi. |
| `embed-equazioni-biquadratiche.html` | **Versione autosufficiente (~110 KB)**: font incorporati in base64. Funziona anche se l'app è offline (i font restano) ed è robusta su qualsiasi piattaforma. |
| `fonts/OpenDyslexic-Regular-v2.woff2` | Font OpenDyslexic Regular servito dall'app (URL usato dalla versione lite/dedicata) |
| `fonts/OpenDyslexic-Bold-v2.woff2` | Font OpenDyslexic Bold servito dall'app (URL usato dalla versione lite/dedicata) |
| `generate_embed.py` | Script che rigenera la versione autosufficiente (font in base64) |
| `generate_test_impermeabile.py` | Script che rigenera `test-impermeabile.html` dalla cornice dedicata |
| `README.md` | Questo file |

## Come si usa

1. Apri il post in Blogger e passa alla **vista HTML**.
2. Incolla l'intero contenuto di `embed-equazioni-biquadratiche-dedicata.html` (⭐ consigliata)
   oppure di `embed-equazioni-biquadratiche-lite.html` (minima) o di
   `embed-equazioni-biquadratiche.html` (autosufficiente).
3. Pubblica. L'iframe mostra l'app e si adatta da solo all'altezza del contenuto
   (desktop, tablet, cellulare).

## Riutilizzare la cornice per un'altra app

La cornice è **universale** (versioni lite e universale): per usarla con un'altra
app basta cambiare la riga `APP_URL` nella sezione `⚙️ CONFIGURAZIONE` (e,
facoltativamente, `APP_TITLE`). Tutto il resto — iframe, font OpenDyslexic, altezza
dinamica — si adatta da solo.

**Bonus (zero modifiche):** se l'URL è passato come parametro della pagina, ha la
precedenza su `APP_URL`:

```
https://tuosito.it/post?app=https://mia-altra-app.example.com/&title=LA MIA APP
```

- `app` (o `url`): l'URL dell'app da mostrare nella cornice
- `title`: (facoltativo) il titolo mostrato nella barra della cornice

Nota sui font: la cornice carica gli OpenDyslexic da `APP_URL/fonts/*`. Le app
della famiglia LabVisivo li servono con CORS abilitato; se l'app target non li
serve, si usano i font di riserva (Cambria/Georgia) senza alcun errore bloccante.

## Le versioni a confronto

| Caratteristica | `...-dedicata.html` | `...-lite.html` | `embed-equazioni-biquadratiche.html` |
|---|---|---|---|
| Dimensione | ~15 KB (v3 impermeabile) | ~5 KB | ~110 KB |
| Dedicata a questa app | ✅ sì (URL fisso) | riutilizzabile (`?app=`) | riutilizzabile |
| Schermo intero / Ricarica | ✅ sì | solo «Apri ↗» | solo «Apri ↗» |
| Stato online/errore + Riprova | ✅ sì (timeout 15 s) | no | no |
| Spinner di caricamento | ✅ sì (con `prefers-reduced-motion`) | no | no |
| Multi-embed sicuro (impermeabile) | ✅ sì (v3) | no (id globali) | no (id globali) |
| Font OpenDyslexic | via `/fonts/*` (CORS) | via `/fonts/*` (CORS) | incorporati in base64 |
| App online richiesta | sì (font + contenuto) | sì (font + contenuto) | solo per il contenuto |
| Vantaggio | completa, dedicata, impermeabile (multi-embed sicuro), stato incluso | codice minimo e leggibile | funziona ovunque, zero dipendenze |

## 🛡️ Impermeabilità: perché ora ogni cornice vede solo la propria app

Prima (v1/v2) le cornici usavano **id fissi** (`lfIframe`, `lfCornice`) e
`document.getElementById` globale: se il blog aveva **più cornici simili nella
stessa pagina** (es. più post con app della stessa famiglia LabVisivo), gli
script si agganciavano al **primo** iframe trovato — e dentro una cornice
compariva l'app dell'altra. In più ogni cornice ascoltava **tutti** i messaggi
`postMessage` della pagina e applicava altezze arrivate da altre app.

La v3 rende ogni cornice **impermeabile e non comunicante**:

1. **Scoping DOM per istanza**: lo script trova il PROPRIO `<div class="lf-cornice">`
   risalendo da `document.currentScript` (non più per id globale).
2. **Id univoci con token**: a runtime gli id vengono rinominati con un suffisso
   casuale (`lfIframe-lf5ebjz6da`…). Nessun'altra cornice che cerchi `lfIframe`
   può più agganciare i nostri elementi (e viceversa).
3. **Filtro `e.source`**: il listener accetta messaggi **solo** se arrivano dal
   PROPRIO iframe (`e.source === iframe.contentWindow`). I messaggi di altezza
   delle altre app vengono ignorati.
4. **Token `cornice`**: l'URL dell'iframe porta `?cornice=<token>`; l'app lo
   rispecchia nei messaggi (`heightSync.ts`) e la cornice rifiuta token altrui.
5. **Ping sicuro**: in uscita usa `'*'` (destinatario = nostro iframe, sicuro)
   e in ricezione filtra per `e.source` + token.
6. **CSS scoped**: tutte le regole usano la classe `.lf-cornice` — nessun
   selettore globale che possa toccare il layout del blog o di altre cornici.

Puoi incollare la stessa cornice in **più post della stessa pagina**: ogni
istanza resta indipendente.

## Come funziona l'altezza dinamica

- L'app (dentro l'iframe) misura la propria altezza reale e la invia al genitore
  con un messaggio: `{ type: "labvisivo:height", height: <numero> }`.
- Il codice dell'app che fa questo è in `../client/src/lib/heightSync.ts`
  (inizializzato da `../client/src/main.tsx`).
- La cornice ascolta i messaggi e imposta `iframe.style.height`.
- La cornice invia anche un "ping" (`{ type: "labvisivo:ping", cornice: <token> }`)
  dopo il caricamento per richiedere l'altezza: l'app risponde con la sua
  altezza **rispecchiando il token** (gestore in `heightSync.ts`).
- **Fix anti-loop**: quando l'app è dentro un iframe aggiunge la classe
  `lf-embedded` a `<html>` e disattiva `min-h-screen`/`min-h-dvh`
  (vedi `../client/src/index.css`), così l'altezza misurata non dipende più
  dall'altezza dell'iframe (niente crescita infinita).
- **Anti-loop (lato cornice, dedicata)**: nessuna transizione CSS sull'altezza;
  debounce di ~200 ms (applica solo a layout stabilizzato); clamp di sanità
  100–15000 px; conferma dei salti sospetti (crescita > 2×); congelamento di
  5 s dopo 3 crescite consecutive. Così l'iframe non si allunga a dismisura su
  mobile.

## CORS sui font

Per la versione lite e dedicata il server dell'app risponde a `/fonts/*` con
`Access-Control-Allow-Origin: *` (aggiunto in `../server/index.ts`).
Senza questo header il browser bloccherebbe il `@font-face` cross-origin quando
la cornice è su un dominio diverso (Blogger).

## Come ricostruire la cornice (per l'IA o a mano)

0. **Nuova app, zero modifiche al codice**: parti da `embed-universale.html`
   (template con URL segnaposto), imposta `APP_URL` (e, facoltativo, `APP_TITLE`)
   nella sezione `⚙️ CONFIGURAZIONE` e incolla il file dove vuoi. L'iframe, i
   font OpenDyslexic e l'altezza dinamica derivano tutti da `APP_URL`: non c'è
   altro da cambiare. In alternativa, puoi passare `?app=URL&title=NOME` come
   parametri della pagina senza toccare il file.

1. **Nuova app con la versione DEDICATA (Schermo intero + Ricarica + stato +
   impermeabile)**: parti da `embed-equazioni-biquadratiche-dedicata.html`, cambia:
   - la `APP_URL` nella sezione `⚙️ CONFIGURAZIONE` (riga `var APP_URL = ...`);
   - i due URL dei font nel blocco `@font-face` in cima al file
     (`https://equazioni-biquadratiche.easy-peasy.site/fonts/...` → l'URL della tua app);
   - (facoltativo) il testo del titolo `EQUAZIONI DI QUARTO GRADO BIQUADRATICHE`.
   Tutto il resto (Schermo intero, Ricarica, spinner, stato, impermeabilità) è già pronto.

2. **URL dell'app (file esistenti)**: nei file HTML cerca
   `https://equazioni-biquadratiche.easy-peasy.site` e sostituiscilo con l'URL di
   produzione aggiornato (stessa cosa per eventuali altri domini).

3. **Font (versione autosufficiente)**: i WOFF2 incorporati provengono dai font in
   `../client/public/fonts/`. Per rigenerare il file autosufficiente esegui:
   `python3 generate_embed.py`.

4. **Perché base64 (versione autosufficiente)?** Incorporando i font la cornice
   funziona ovunque anche senza CORS o con l'app momentaneamente offline.
   La versione lite e dedicata invece sfruttano il CORS di `/fonts/*` per restare
   minime.

## Accessibilità dell'embed

La cornice preserva l'accessibilità dell'app anche dentro un post: font
**OpenDyslexic** anche nella cornice (via CORS nella versione lite/dedicata, in
base64 in quella autosufficiente), **altezza automatica** dell'iframe (protocollo
`labvisivo:height`, nessun contenuto tagliato), **spinner con
`prefers-reduced-motion`** e **pulsanti con `focus-visible`** e `aria-label`
nella versione dedicata, e pagina interna senza `min-h-screen` quando è in embed
(classe `lf-embedded`). Il recap completo delle misure di accessibilità dell'app è
in [`../ACCESSIBILITA.md`](../ACCESSIBILITA.md).

## Note di stile

- La cornice riprende i colori dell'app: sfondo carta `#f8f1e4` **uniforme**
  (stesso colore di pagina e header; la barra di accessibilità interna
  all'app è bianco caldo `#fdfbf8` con capsule crema `#f5f0e6`, bordi
  `#dedbd6`, testo `#2e2118`), bordo morbido `rgba(46,32,24,.15)` + ombra
  leggera, titolo inchiostro `#2e2018`.
- Nella versione dedicata il titolo è **centrato** e i pulsanti stanno **sotto
  il titolo, centrati**.
- Il titolo "EQUAZIONI DI QUARTO GRADO BIQUADRATICHE" è in **OpenDyslexic Bold**
  (17px, letter-spacing 2px), lo stesso font usato in tutta l'app
  (vedi `../client/src/index.css`).
- Nella versione dedicata, su schermi stretti (mobile) le etichette dei pulsanti
  si nascondono (`.lf-lbl { display: none }`) e restano solo le icone.

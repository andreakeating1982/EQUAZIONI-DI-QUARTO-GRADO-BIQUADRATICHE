# 🤖 GUIDA-IA — Ricostruzione e variazione del "Widget Matematico Sorgente"

> **Documento operativo per un'Intelligenza Artificiale** (MARKY su Easy-Peasy.AI,
> GitHub Copilot, Claude, ChatGPT, ecc.) o per uno sviluppatore, per **ricostruire**,
> **clonare** e **variare** questa app partendo dalla repository GitHub.
>
> **App**: WIDGET MATEMATICO SORGENTE (già "Equazioni Biquadratiche")
> **Stack**: Vite + React 19 + TypeScript + TailwindCSS 4 + shadcn/ui + KaTeX + ONNX (ink-on)
> **Nessun backend, nessun database**: tutta la logica (generazione equazione, passi,
> verifica, PDF) è lato client. Il server Express serve solo i file statici.
>
> **Documenti canonici** (lettura rapida): [`AGENTS.md`](AGENTS.md) (indice),
> [`REBUILD.md`](REBUILD.md) (ricostruire identica), [`ADATTARE.md`](ADATTARE.md)
> (creare varianti), [`RENDER.md`](RENDER.md) (deploy Render),
> [`ACCESSIBILITA.md`](ACCESSIBILITA.md) (accessibilità). Questo documento è
> l'approfondimento completo.

---

## INDICE

1. [Che cos'è l'app](#1-che-cosè-lapp)
2. [Architettura e file critici](#2-architettura-e-file-critici)
3. [Ricostruire l'app da GitHub](#3-ricostruire-lapp-da-github)
4. [Variante A — cambiare il grado dell'equazione](#4-variante-a--cambiare-il-grado-dellequazione)
5. [Variante B — disequazioni di qualsiasi grado](#5-variante-b--disequazioni-di-qualsiasi-grado)
6. [Variante C — equazioni/disequazioni fratte](#6-variante-c--equazionidisequazioni-fratte)
7. [Variante D — cambiare la lingua (inglese, spagnolo, francese)](#7-variante-d--cambiare-la-lingua-inglese-spagnolo-francese)
8. [Variante E — quiz con set di domande](#8-variante-e--quiz-con-set-di-domande)
9. [Build, verifica e deploy](#9-build-verifica-e-deploy)
10. [Trasferimento su Render (via GitHub)](#10-trasferimento-su-render-via-github)
11. [ACCESSIBILITÀ (sezione portabile)](#11-accessibilità-sezione-portabile)
12. [Regole d'oro](#12-regole-doro)
13. [Cornice dinamica (embed per il blog)](#13-cornice-dinamica-embed-per-il-blog)
14. [Sezione IA dedicata — foto, mappe concettuali, tremolio](#14-sezione-ia-dedicata--foto-mappe-concettuali-tremolio)
15. [Quaderno «Matematica Facile» (PDF 5 anni)](#15-quaderno-matematica-facile-pdf-5-anni)

---

## 1. Che cos'è l'app

L'app guida uno studente nella risoluzione di un'**equazione trinomia** della forma

```
a · x^(2k) + b · x^k + c = 0
```

con sostituzione **`t = x^k`**, che riduce tutto a una quadratica `a·t² + b·t + c = 0`.

Il **grado** dell'equazione in `x` è **2k**. La sorgente attuale è **k = 2 → grado 4**
(biquadratica: `ax⁴ + bx² + c = 0`).

Il flusso didattico è in **7 passi**, con input tramite **canvas di scrittura a mano**
(riconoscimento ONNX via ink-on) e un box **"RICOPIA SUL QUADERNO"** per ogni passo, più
un **PDF scaricabile** al termine:

1. Forma canonica e coefficienti (a, b, c)
2. Variabile ausiliaria `t = x²` e delta (Δ = b² − 4ac)
3. Calcolo di t₁ (prima soluzione in t)
4. Calcolo di t₂ (seconda soluzione in t)
5. Calcolo di x₁ (da t₁: x = ±√t₁)
6. Calcolo di x₂ (da t₂: x = ±√t₂)
7. Verifica finale e insieme delle soluzioni

Tutto è pensato per studenti con **BES/DSA**: pochi passi chiari, colori, box da copiare,
feedback immediato CORRETTO/SBAGLIATO, PDF finale.

---

## 2. Architettura e file critici

| File | Ruolo |
|------|-------|
| `client/src/pages/BiquadraticExercises.tsx` | **Tutta l'app**: generazione equazione, 7 passi, NotebookGuide, PDF, verifica |
| `client/src/components/NumberInputCanvas.tsx` | Canvas input con riconoscimento ONNX, elaborazione LaTeX, display frazioni |
| `client/src/components/MathDrawCanvas.tsx` | Canvas disegno puro (penna, gomma), ResizeObserver, rendering stroke |
| `client/src/hooks/useMathRecognition.ts` | Hook gestione modello ONNX (COMER), init engine, recognize, repairLatex |
| `client/src/components/FractionDisplay.tsx` | Badge visualizzazione frazione riconosciuta |
| `client/src/contexts/AccessibilityContext.tsx` | Accessibilità: provider font/interlinea/righello/contrasto, localStorage `wms_access` |
| `client/src/components/AccessibilityToolbar.tsx` | Accessibilità: barra UI (Font A−/A+, Interlinea, Righello, Modalità, Ascolto) |
| `client/src/hooks/useReadAloud.ts` | **Lettura ad alta voce** (TTS italiano, converte formule KaTeX e MAIUSCOLE) |
| `client/src/lib/heightSync.ts` | Cornice dinamica: sincronizzazione altezza iframe (`labvisivo:height`) |
| `client/src/main.tsx` | Chiama `initHeightSync()` PRIMA del render |
| `client/public/fonts/` | **Font OpenDyslexic** (TTF/OTF/WOFF2) per dislessia/ipovedenti |
| `client/public/models/comer/` | Modelli ONNX (encoder/decoder int8) + `vocab.json` |
| `client/src/index.css` | Tema Tailwind, `@font-face` OpenDyslexic, stili accessibilità |
| `server/index.ts` | Server Express: serving statico + header COOP/COEP + CORS `/fonts` |
| `ACCESSIBILITA.md` | Documentazione completa delle misure di accessibilità |
| `docs/grado.md` | Riferimento: **cambiare il grado** (mappa del codice) |
| `docs/disequazioni.md` | Riferimento: **adattare alle disequazioni** |
| `docs/fratte.md` | Riferimento: **adattare alle fratte** (C.E. + verifica) |
| `docs/lingua.md` | Riferimento: **cambiare la lingua** (inglese, spagnolo, francese) |
| `docs/quiz.md` | Riferimento: **adattare a quiz** (set di domande, VERO/FALSO, 3/4 opzioni) |
| `scripts/clone_app.py` | Script di clonazione meccanica con grado diverso |

### Pipeline del riconoscimento scrittura (ONNX)

```
User scrive sul canvas → MathDrawCanvas (stroke)
  → NumberInputCanvas.handleManualRecognize
    → useMathRecognition.recognize() → ink-on preprocessStrokes()
      → ONNX COMER (encoder_int8.onnx + decoder_int8.onnx)
        → token IDs → decodeToTokenArray() → repairLatex() → LaTeX
          → cleanLatex → evaluateLatex() → valore numerico
            → display frazione + decimale
```

---

## 3. Ricostruire l'app da GitHub

### 3.1 Localmente (qualsiasi macchina)

```bash
git clone https://github.com/<utente>/<repo>.git
cd <repo>            # se l'app è in una subfolder: cd <subfolder>
pnpm install
pnpm check           # type-check TypeScript — MAI saltare
pnpm dev             # avvia il dev server (http://localhost:5173)
```

### 3.2 Su Easy-Peasy.AI (MARKY)

Caricare la cartella nel sandbox e chiedere a MARKY di fare build, preview e deploy.
Oppure inizializzare un nuovo progetto `web-static` e copiare dentro i file `client/`,
`server/`, `shared/`, `package.json`, `tsconfig*.json`, `vite.config.ts`, `patches/`.

> **Nota**: lo scaffold è **`web-static`** (NON `web-db-user`). Non c'è database né
> autenticazione: non serve alcuna chiave API.

---

## 4. Variante A — cambiare il grado dell'equazione

La sorgente risolve `a·x^(2k) + b·x^k + c = 0` con `t = x^k`. Cambiare il grado significa
cambiare **k**:

| grado | k | sostituzione | radici x |
|-------|---|--------------|----------|
| 2  | 1 | nessuna (t = x) | x = t |
| 4  | 2 | t = x² | x = ±√t |
| 6  | 3 | t = x³ | x = ∛t |
| 8  | 4 | t = x⁴ | x = ±∜t |
| 2k | k | t = x^k | vedi sotto |

**Regola radici (passo 6):**
- k **pari**: `x = ±(t)^(1/k)` (due radici opposte, serve `t ≥ 0`).
- k **dispari**: `x = (t)^(1/k)` (una sola radice reale, `t` qualsiasi).
- k = 1: nessun passo di estrazione (x = t), i passi diventano 5.

### Clonazione meccanica con lo script

```bash
python3 scripts/clone_app.py --name "equazioni-sesto-grado" --degree 6
# da repository GitHub invece della cartella locale:
python3 scripts/clone_app.py --source https://github.com/<utente>/<repo>.git \
    --name "equazioni-sesto-grado" --degree 6
```

Lo script copia la cartella e applica le sostituzioni meccaniche (potenze, titoli,
placeholder, testo della sostituzione). **Poi stampa una CHECKLIST dei passi manuali**:
leggerla e completarla (in particolare la logica del passo 6: `Math.sqrt` → `Math.pow(t, 1/k)`,
`\sqrt{t}` → `\sqrt[k]{t}`, `±` solo per k pari).

Per la **mappa esatta** di dove è codificato il grado (parser, builder, titoli, testi,
passo 6) leggere **[`docs/grado.md`](docs/grado.md)**.

> ⚠️ **Regola**: MAI fare replace globale delle cifre `4`/`2` — romperebbe `4ac`, `2a`,
> ecc. Sostituire solo i **token di grado** (vedi `clone_app.py` e `docs/grado.md`).

---

## 5. Variante B — disequazioni di qualsiasi grado

Stessa filosofia dell'app, ma la soluzione è un **intervallo** (o unione di intervalli)
con **studio del segno**. Forma: `a·x^(2k) + b·x^k + c ≷ 0` con `≷ ∈ {>, <, ≥, ≤}`.

Restano identici: input a mano ONNX, sostituzione `t = x^k`, delta, radici t₁/t₂,
NotebookGuide, PDF, divulgazione progressiva.

Va aggiunto:
1. **Parser del verso** (`>`, `<`, `≥`, `≤` → campo `verso`).
2. **Passo "studio del segno"** (parabola `y = at² + bt + c`, segno `+`/`−` con colori).
3. **Traduzione in x e intervallo finale** (`x < -2 ∨ x > 2`, notazione italiana).
4. **Input della risposta** come intervallo (o selettore strutturato per BES).

Per la **struttura passi completa**, la tabella dei segni e le linee guida BES leggere
**[`docs/disequazioni.md`](docs/disequazioni.md)**.

---

## 6. Variante C — equazioni/disequazioni fratte

Per le **fratte (razionali)** si aggiungono le **Condizioni di Esistenza (C.E.)**
(denominatore ≠ 0) e la verifica che le soluzioni non annullino i denominatori.

Forme trattate:
1. **Frazione unica = 0**: `N(x)/D(x) = 0` → `N(x) = 0` con `D(x) ≠ 0`.
2. **Somma/differenza di frazioni** → denominatore comune → `numeratore = 0`.
3. **Fratte che si riducono a una trinomia di grado qualsiasi** → il numeratore è
   `a·x^(2k) + b·x^k + c`, quindi si **riusa TUTTA la logica trinomie** (sostituzione
   `t = x^k`, delta, radici, estrazione x). Il grado può essere qualsiasi.

Passi aggiuntivi: **C.E.**, **numeratore = 0**, **verifica contro le C.E.** (badge
ACCETTABILE / NON ACCETTABILE), **insieme soluzione finale**.

Per la **struttura passi completa** e le linee guida BES leggere
**[`docs/fratte.md`](docs/fratte.md)**. La combinazione "fratte + disequazione" si ottiene
sommando i due riferimenti (C.E. + studio del segno).

---

## 7. Variante D — cambiare la lingua (inglese, spagnolo, francese)

La logica matematica **non dipende dalla lingua**: per ottenere un'app per lo studio
dell'**inglese**, dello **spagnolo** o del **francese** cambiano solo i **testi**
dell'interfaccia, la **voce della lettura ad alta voce** (TTS) e i **formati** di
numeri/date.

In sintesi:

1. `client/index.html`: `lang="it"` → `en` / `es` / `fr` + `<title>` tradotto.
2. `WelcomePage.tsx` e `BiquadraticExercises.tsx`: traduci le **stringhe** (titoli,
   consegne, box "RICOPIA SUL QUADERNO", pulsanti, testi del PDF). **Non** rinominare
   variabili, chiavi di stato o ID.
3. `useReadAloud.ts`: imposta la voce TTS della lingua (`it-IT` → `en-US`/`en-GB`,
   `es-ES`, `fr-FR`) e traduci le etichette lette ad alta voce.
4. `AccessibilityToolbar.tsx`: traduci le etichette della barra e le `aria-label`.

> Le formule KaTeX (`x⁴`, `Δ`, `√`, `±`, frazioni) **NON si traducono**: sono universali.
> Cambiano solo le parole attorno alle formule ("discriminante" → "discriminant" /
> "discriminante" / "discriminant", ecc.).

Riferimento completo (tabella testi, simboli, formati numeri/date, voci TTS per
it/en/es/fr, accessibilità e lingua, checklist di verifica):
**[`docs/lingua.md`](docs/lingua.md)**.

---

## 8. Variante E — quiz con set di domande

Per ricostruire un **quiz** (con dashboard docente, codici classe, sessioni, contatore
studenti e report PDF con punteggio) si parte dalle app quiz della stessa famiglia e si
cambia **solo il set di domande** tramite un **JSON**: contenuto, numero di domande,
tipologia **VERO/FALSO** (2 opzioni) oppure a **3 o 4 opzioni**.

| Obiettivo | Cosa fare |
|---|---|
| Contenuto diverso | modifica `testo` e `opzioni` di ogni domanda |
| Numero diverso | aggiungi/rimuovi oggetti nell'array `domande` |
| Tipologia diversa | `vero_falso` (2 opzioni), `multipla_3` (3), `multipla_4` (4) |
| Tema/lingua diverso | traduci `testo`/`opzioni` (vedi `docs/lingua.md`) |

Riferimento completo (JSON di esempio, skill di clonazione): **[`docs/quiz.md`](docs/quiz.md)**.

---

## 9. Build, verifica e deploy

```bash
pnpm install                 # dipendenze (usa pnpm-lock.yaml)
pnpm check                   # type-check — MAI saltare prima del deploy
pnpm build                   # vite build + esbuild del server → dist/
pnpm dev                     # dev server locale
pnpm start                   # server di produzione (NODE_ENV=production node dist/index.js)
```

Su Easy-Peasy.AI:
- **Preview**: `webdev_deploy mode="preview" project_dir="<cartella>"`
- **Produzione**: prima `webdev_save_checkpoint`, poi (solo dopo conferma esplicita
  dell'utente) `webdev_deploy mode="production"`.

Verifica residui del grado (dopo una clonazione):

```bash
grep -rn "x^{4}\|x^{2}\|x⁴\|x²" client/src
```

---

## 10. Trasferimento su Render (via GitHub)

Il progetto include già:
- **`render.yaml`** — Blueprint Render: crea il Web Service con un clic (Node 22,
  `pnpm install --frozen-lockfile && pnpm build`, `pnpm start`).
- **`.github/workflows/ci.yml`** — CI su ogni push (install → check → test → build).

Procedura completa passo-passo: **[`RENDER.md`](RENDER.md)**.

In sintesi:
1. Carica questa cartella su un repository GitHub (root del repo).
2. Su [render.com](https://render.com) → **New → Blueprint** → collega il repo.
3. Render legge `render.yaml` e crea il Web Service automaticamente.

> L'app NON ha database né chiavi API: il server Express serve solo i file statici +
> gli header COOP/COEP (richiesti da ONNX Runtime Web) + CORS su `/fonts` (per l'embed
> cross-origin). Non serve configurare nulla oltre a `NODE_VERSION`.

---

## 11. ACCESSIBILITÀ (sezione portabile)

> ⚠️ **SEZIONE ACCESSIBILITÀ** — questa è la sezione che riassume TUTTE le misure di
> accessibilità dell'app. Le stesse misure possono essere **portate su altre app simili**
> copiando i file indicati. Il dettaglio completo è in **[`ACCESSIBILITA.md`](ACCESSIBILITA.md)**.

### Misure implementate (riepilogo)

| # | Misura | File da copiare su altre app |
|---|--------|------------------------------|
| 1 | **Font OpenDyslexic** auto-ospitato | `client/public/fonts/` + `@font-face` in `client/src/index.css` |
| 2 | **Barra di accessibilità** (Font, Interlinea, Righello, Modalità, Ascolto) | `client/src/components/AccessibilityToolbar.tsx` |
| 3 | **Dimensione testo regolabile** 80%–160% | `client/src/contexts/AccessibilityContext.tsx` → `--lf-scale` |
| 4 | **Interlinea regolabile** 1.65 / 1.9 / 2.2 / 2.6 | `AccessibilityContext.tsx` → `--lf-lh` |
| 5 | **Righello di lettura** | `index.css` (`.lf-ruler-band`) |
| 6 | **Modalità ad alto contrasto** | `index.css` (`html.lf-hc`) |
| 7 | **Focus visibile** (`:focus-visible`) | `index.css` |
| 8 | **`prefers-reduced-motion`** rispettato | `index.css` |
| 9 | **Testo base 18px + selezione ad alto contrasto** | `index.css` |
| 10 | **ARIA / tastiera** (`role="toolbar"`, `aria-live`, `aria-label`) | `AccessibilityToolbar.tsx`, `WelcomePage.tsx` |
| 11 | **PDF esportato in OpenDyslexic** | `client/src/pages/BiquadraticExercises.tsx` (`handleScaricaPdf`) |
| 12 | **Preferenze persistenti** (`localStorage` `wms_access`) | `AccessibilityContext.tsx` |
| 13 | **CORS sui font** (embed cross-origin) | `server/index.ts` |
| 14 | **Lettura ad alta voce** (TTS italiano) | `client/src/hooks/useReadAloud.ts` + pulsante "Ascolto" |

### Come portare l'accessibilità su un'altra app

1. Copiare `client/public/fonts/` (OpenDyslexic).
2. Copiare in `index.css`: i 4 `@font-face`, le classi `.lf-ruler-band`, `html.lf-hc`,
   `:focus-visible`, `::selection`, `@media (prefers-reduced-motion: reduce)`, e le
   variabili `--lf-scale` / `--lf-lh`.
3. Copiare `AccessibilityContext.tsx` + `AccessibilityToolbar.tsx` e montarli in `App.tsx`
   dentro un `<AccessibilityProvider>`, **prima** del router.
4. Copiare `useReadAloud.ts` per la lettura ad alta voce (voce italiana, converte formule
   ed esponenti in linguaggio naturale).
5. Aggiungere `aria-label` ai campi di input e `role="toolbar"` / `aria-live` alla barra.
6. Nel PDF: usare OpenDyslexic con `@font-face` inline nel documento di stampa.

**Dettaglio completo**: **[`ACCESSIBILITA.md`](ACCESSIBILITA.md)** (con checklist di
verifica rapida).

---

## 12. Regole d'oro

1. **MAI saltare `pnpm check`** prima del deploy — gli errori TypeScript bloccano la build.
2. **Non fare replace globale delle cifre** `4`/`2` quando si cambia grado: sostituire solo
   i **token di grado** (vedi `clone_app.py` / `docs/grado.md`).
3. **Il calcolo di delta, t₁, t₂ è identico per ogni grado** — cambia solo il passo di
   estrazione x (`Math.sqrt` → `Math.pow(t, 1/k)`, `±` solo per k pari).
4. **`buildTEquationLatex` non cambia con k** — produce sempre `at² + bt + c = 0`.
5. **Il canale postMessage è `'labvisivo:height'`** (condiviso): NON cambiarlo negli embed.
6. **Il NotebookGuide DEVE mostrare la derivazione completa** (non versioni abbreviate).
7. **Le frazioni nei badge usano la freccia `→`** (non `=`): `⁴/₂ → 2`.
8. **Decimali con virgola `,`** (formato italiano), interi senza decimali.
9. **Font OpenDyslexic su `html, body, #root` e `.font-sans/.font-serif/.font-mono`**, ma
   **NON** su `.katex` (le formule restano in KaTeX).
10. **Prima del deploy produzione**: sempre `webdev_save_checkpoint` con descrizione.
11. **`currentHeight()` (heightSync.ts) usa l'altezza REALE del contenuto**: `Math.max(body.scrollHeight, body.offsetHeight, documentElement.offsetHeight)` + `documentElement.scrollHeight` SOLO se supera `window.innerHeight`. **NON** usare `documentElement.scrollHeight` come riferimento assoluto: dentro l'iframe resta gonfiato all'altezza del viewport e la cornice non si restringe MAI, lasciando un grande vuoto sotto la card (bug corretto in produzione).
12. **Anti-tremolio**: l'invio dell'altezza è stabilizzato (ceil su misura frazionaria, isteresi 3 px, silenzio post-invio 400 ms con salto libero ≥ 30 px, coalescenza rAF, ping sempre risposto) e le cornici NON devono avere `transition: height` né applicare l'altezza senza debounce. MAI rimuovere queste protezioni: senza, l'app vibra nel blog (58 messaggi/82 s misurati). Diagnosi e strumento di misura: [`IMPLEMENTAZIONE-IA.md`](IMPLEMENTAZIONE-IA.md), Area 3.

## 13. Cornice dinamica (embed per il blog)

Il pacchetto include la **cornice dinamica** in `cornice-dinamica/`: un blocco HTML
autonomo da incollare su Blogger (o qualsiasi sito) che mostra l'app in un iframe con
**altezza automatica**, **font OpenDyslexic**, **Schermo intero**, **Ricarica** e
**isolamento multi-embed (impermeabile, v3)**.

| File | Uso |
|------|-----|
| `cornice-dinamica/embed-equazioni-biquadratiche-dedicata.html` | ⭐ **Versione dedicata (v3 impermeabile)**: titolo **e pulsanti sulla stessa riga, tutti centrati**; Schermo intero, Ricarica, spinner, stato online/errore con **Riprova** (timeout 15 s), ping periodico (3 s), altezza al resize e **isolamento multi-embed** (scoping DOM, id con token, filtro `e.source`) e **anti-loop mobile** (debounce + clamp + conferma salti + congelamento). **Da incollare nel post.** |
| `cornice-dinamica/embed-equazioni-biquadratiche-lite.html` | Versione minima (~5 KB) riutilizzabile: cambia `APP_URL` (o passa `?app=URL`) |
| `cornice-dinamica/embed-universale.html` | Template universale con URL segnaposto, per altre app |
| `cornice-dinamica/embed-equazioni-biquadratiche.html` | Versione autosufficiente (~110 KB, font in base64) |
| `cornice-dinamica/test-dedicata.html` | Pagina di test locale (simula un post Blogger) |
| `cornice-dinamica/test-impermeabile.html` | Pagina di test multi-embed: 2 cornici + un «intruso» che tenta il furto dell'iframe |
| `cornice-dinamica/README.md` | Documentazione completa della cornice |

### Protocollo altezza dinamica

- L'app (in `client/src/lib/heightSync.ts`, inizializzato da `client/src/main.tsx`)
  misura la propria altezza e la invia al genitore con
  `{ type: "labvisivo:height", height }`.
- La cornice ascolta i messaggi `message` e imposta `iframe.style.height`.
- La cornice invia `{ type: "labvisivo:ping", cornice: <token> }`; l'app risponde con la sua altezza **rispecchiando il token** (`heightSync.ts` legge `?cornice=<token>` dall'URL).
- **Fix anti-loop**: quando l'app è dentro un iframe aggiunge la classe `lf-embedded` a
  `<html>` e il CSS disattiva `min-h-screen`/`min-h-dvh` (vedi `client/src/index.css`),
  così l'altezza misurata non dipende dall'altezza dell'iframe.
- **Fix `currentHeight()` (vuoto sotto la card)**: `currentHeight()` NON deve usare
  `documentElement.scrollHeight` come riferimento assoluto. Quando il contenuto è più
  corto dell'iframe, `documentElement.scrollHeight` resta gonfiato all'altezza del
  viewport (mai meno) e la cornice non può MAI restringersi: la prima pagina mostra un
  grande vuoto sotto la card. Usa invece
  `Math.max(body.scrollHeight, body.offsetHeight, documentElement.offsetHeight)` e
  aggiungi `documentElement.scrollHeight` SOLO se supera `window.innerHeight`
  (vedi `client/src/lib/heightSync.ts`).
- **Anti-tremolio (Settembre 2026)**: l'app stabilizza l'invio dell'altezza (ceil su
  misura frazionaria + isteresi 3 px + silenzio post-invio 400 ms con salto libero
  ≥ 30 px + coalescenza rAF + ping sempre risposto) e le cornici applicano l'altezza
  SOLO con debounce, senza `transition: height` (lite/base64/universale corrette;
  dedicata con silenzio post-applicazione 300 ms). Test riproducibile:
  `client/public/test-tremolio.html?mode=bad` (cornice vecchia) o `?mode=v3`, report
  con `window.__report()`. Prima del fix: 58 messaggi/82 s con crescendo continuo;
  dopo: silenzio a pagina ferma e cambiamenti veri seguiti subito. Dettagli completi:
  [`IMPLEMENTAZIONE-IA.md`](IMPLEMENTAZIONE-IA.md), Area 3.

### Adattare la cornice a un'altra app

1. **Versione universale/lite**: cambia la riga `APP_URL` nella sezione `⚙️ CONFIGURAZIONE`;
   oppure passa `?app=URL&title=NOME` come parametri della pagina.
2. **Versione dedicata**: cambia `APP_URL` + i due URL `@font-face` + il testo del titolo.
3. Le app devono servire i font su `/fonts/*` con CORS (`server/index.ts`).

Per i dettagli completi (Schermo intero, stato, ping, mobile, accessibilità) leggi
`cornice-dinamica/README.md`.

---

## 14. Sezione IA dedicata — foto, mappe concettuali, tremolio

> 🧭 **SEZIONE APPOSITA PER IMPLEMENTARE MEDIANTE IA** — le tre aree chiave richieste
> sono documentate in dettaglio operativo in **[`IMPLEMENTAZIONE-IA.md`](IMPLEMENTAZIONE-IA.md)**:
>
> 1. **Scattare foto / ritaglio foto / riconoscimento / trascrizione** — la pipeline
>    completa (SCATTA UNA FOTO / CARICA / drag&drop / Ctrl+V → `normalizePhoto` →
>    `CropDialog` → `enhanceForOcr` → `ocrImage` (Tesseract self-hosted) →
>    `normalizeEquationOcrDetailed` → campo equazione), i dettagli critici (PNG
>    lossless, upscale a passi, COOP/COEP, ricostruzione trinomia v3) e la checklist
>    per estenderla.
> 2. **Produzione di mappe concettuali specifiche** — `MappaPdfData`, `buildMappaHtml`,
>    `openMappaPdf`: come generare la mappa PDF di QUALSIASI trinomia (con esempio
>    completo), la struttura Parte A/Parte B, le formule letterarie sopra quelle
>    numeriche nei passi 3-4-5 e la paginazione a misurazione DOM.
> 3. **Debug del "tremolio"** — sintomo, cause misurate, strumento
>    `client/public/test-tremolio.html?mode=bad|v3` con `window.__report()`, le 5
>    contromisure lato app + quelle lato cornice, la procedura diagnostica passo-passo
>    e come portare l'anti-tremolio su altre app.
>
> Le **regole non negoziabili** di queste tre aree sono in coda allo stesso documento.

---

## 15. Quaderno «Matematica Facile» (PDF 5 anni)

Il pulsante nella seconda pagina scarica il quaderno inclusivo **«Matematica
Facile — Il quaderno di matematica e geometria (liceo linguistico, obiettivi
minimi)»**: 53 pagine A4 PDF/UA-1 in **flusso continuo** (i temi scorrono senza
forzare nuove pagine; la banner colorata è il separatore), riempimento medio 87%,
32 pagine oltre il 90%. Copertina, indice con numeri di pagina automatici, un
capitolo per anno con box TRUCCO/ATTENZIONE/ESEMPIO e mappa finale. File:
`client/public/quaderno-matematica-facile-v4.pdf`; integrazione in
`BiquadraticExercises.tsx` (riga con `href="/quaderno-matematica-facile-v4.pdf"`).

I **sorgenti completi** (8 sezioni HTML + `styles.css` + `build.py`;
bilanciatori DEPRECATI con guardia) sono in
**[`docs/quaderno-matematica/`](docs/quaderno-matematica/README-QUADERNO.md)**
con il manuale di ricostruzione, le regole di impaginazione e l'adattamento a
nuovi contenuti:

```bash
cd docs/quaderno-matematica && pip install weasyprint pymupdf && python3 build.py
```

**Regole non negoziabili del quaderno (flusso continuo):** nessun box spezzato
tra due pagine (`break-inside: avoid` su tutti i box, INCLUSI `.mappa-griglia` e
`.mappa-box` che sono `display:table` e non sono coperti dal selettore `table`);
banner di tema mai orfane a fondo pagina (`.page-head { break-after: avoid }`);
numero di pagina nel margine, sollevato con `padding-bottom: 6mm` (assente in
copertina); nuove pagine solo per copertina, indice e divisori d'anno
(`.divider`); MAI `.salto` nei temi e MAI `ristretta` (pagine nominate =
interruzioni forzate): i bilanciatori `fix_fill.py`/`autobalance.py`/
`collapse.py` sono deprecati e si bloccano da soli; MAI `display:flex` (testo
tagliato a destra) — usare `display:table/table-cell` o `inline-block`;
riempimento medio ≥85%: se una pagina resta spoglia è un fine-sezione naturale,
non va «riempita» a forza.

---

*Documento generato per il pacchetto esportabile del "Widget Matematico Sorgente" — Settembre 2026.*

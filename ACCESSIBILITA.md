# ♿ ACCESSIBILITÀ — Widget Matematico Sorgente

> Misure di accessibilità/inclusione aggiunte all'app **WIDGET MATEMATICO SORGENTE**
> (già "Equazioni Biquadratiche"), portate dall'app di riferimento **LATINO FACILE**
> (https://github.com/andreakeating1982/LATINO-FACILE).
> Pensate per studenti con **BES**, **DSA (dislessia, disortografia)** e **ipovisione**.

**Principio guida**: *ogni comando raggiungibile da tastiera; preferenze persistenti;
testo grande e ad alta leggibilità; contrasto regolabile; rispetto di `prefers-reduced-motion`.*

---

## Panoramica delle misure

| # | Misura | Dove vive nel codice |
|---|--------|----------------------|
| 1 | **Font OpenDyslexic** (auto-ospitato) su tutta l'app | `client/public/fonts/` + `@font-face` in `client/src/index.css` |
| 2 | **Barra di accessibilità** (Font, Interlinea, Righello, Modalità) | `client/src/components/AccessibilityToolbar.tsx` |
| 3 | **Dimensione testo regolabile** 80%–160% | `client/src/contexts/AccessibilityContext.tsx` → `--lf-scale` |
| 4 | **Interlinea regolabile** 1.65 / 1.9 / 2.2 / 2.6 | `AccessibilityContext.tsx` → `--lf-lh` |
| 5 | **Righello di lettura** (banda che segue il mouse) | `index.css` (`.lf-ruler-band`) + context |
| 6 | **Modalità ad alto contrasto** | `index.css` (`html.lf-hc`) |
| 7 | **Focus visibile** (tastiera / ipovedenti) | `index.css` (`:focus-visible`) |
| 8 | **`prefers-reduced-motion`** rispettato | `index.css` (`@media (prefers-reduced-motion)`) |
| 9 | **Testo base 18 px + selezione ad alto contrasto** | `index.css` (`body`, `::selection`) |
| 10 | **ARIA e accessibilità da tastiera** | `AccessibilityToolbar.tsx`, `WelcomePage.tsx` |
| 11 | **PDF esportato in OpenDyslexic** | `client/src/pages/BiquadraticExercises.tsx` (`handleScaricaPdf`) |
| 12 | **Preferenze persistenti** (`localStorage`) | `AccessibilityContext.tsx` (chiave `wms_access`) |
| 13 | **CORS sui font** (per embed Blogger cross-origin) | `server/index.ts` (`app.use("/fonts", ...)`) |
| 14 | **Lettura ad alta voce** (text-to-speech in italiano) | `client/src/hooks/useReadAloud.ts` + pulsante "Ascolto" nella barra |

---

## Dettaglio

### Font OpenDyslexic
- Quattro `@font-face` (Regular 400, Bold 700, Italic 400, Bold Italic 700) con
  `font-display: swap` in `client/src/index.css`.
- File auto-ospitati in `client/public/fonts/` (TTF, OTF, WOFF2). Nessun CDN esterno.
- Applicato a `html, body, #root` e alle classi `.font-sans/.font-serif/.font-mono`
  (con fallback `'Cambria Math', Cambria, serif`).
- **La notazione matematica (KaTeX) conserva il proprio font** (KaTeX_Main ecc.), non
  sovrascritto: le formule restano perfettamente allineate.

### Barra di accessibilità
Barra fissa in alto, visibile su **tutte** le pagine (`App.tsx`), con:
- **Font** (`A−` / `A+`): scala 80%–160%, passo 10%, percentuale annunciata con `aria-live`.
- **Interlinea**: cicla 1.65 → 1.9 → 2.2 → 2.6.
- **Righello**: banda gialla di lettura che segue il mouse (`pointer-events: none`).
- **Modalità**: alterna Normale ↔ Alto contrasto.
- **Ascolto**: pulsante **Leggi** / **Stop** che legge ad alta voce il contenuto della
  pagina in italiano (Web Speech API `speechSynthesis`, voce italiana).

Usa le variabili semantiche del tema (plum/gold), quindi si adatta automaticamente a
chiaro/scuro e resta coerente con la palette dell'app.

### Dimensione testo e interlinea
Il provider imposta su `<html>`: `font-size: 16px × scala` (scala le unità `rem`) e le
variabili `--lf-scale` / `--lf-lh`. Il `body` usa `font-size: calc(18px * var(--lf-scale))`
e `line-height: var(--lf-lh)`. Tutto scala in modo proporzionale.

### Alto contrasto
`html.lf-hc` applica `filter: contrast(1.3) saturate(1.15)` e sfondo bianco
(+ override dello sfondo `.paper-grain`).

### Lettura ad alta voce (text-to-speech)
Il pulsante **Ascolto → Leggi** nella barra legge in italiano il testo della pagina
(consegne degli esercizi) usando l'API Web Speech (`speechSynthesis`, `lang="it-IT"`).
**Stop** interrompe la lettura. Esclude toolbar, pulsanti e campi di input; preferisce
il landmark `<main>` come sorgente del testo. Aggiunta come misura di inclusione
aggiuntiva per gli studenti con dislessia che preferiscono ascoltare.

### Focus e riduzione movimento
- `:focus-visible { outline: 3px solid var(--ring); outline-offset: 2px }` — anello
  visibile solo alla navigazione da tastiera.
- `::selection { background: var(--primary); color: var(--primary-foreground) }`.
- `@media (prefers-reduced-motion: reduce)` azzera animazioni e transizioni.

### ARIA e struttura
- Le pagine usano il landmark `<main>` (WelcomePage e BiquadraticExercises) per la
  navigazione con screen reader e come sorgente per la lettura ad alta voce.
- `html { scroll-behavior: smooth }` per uno scorrimento morbido.
- Barra: `role="toolbar"`, `aria-label`, `aria-pressed` sui toggle, `aria-live` sulla
  percentuale.
- Campi di ingresso `Cognome` / `Nome` / `Data` / `Classe`: `aria-label` (`WelcomePage.tsx`).
- Il canvas di scrittura a mano è affiancato dal pulsante **✎ digita l'equazione**
  (input da tastiera), alternativa per chi non può usare il tratto.

### PDF
Il PDF del quaderno (`handleScaricaPdf`) ora usa **OpenDyslexic** (con `<base>` e
`@font-face` inline nel documento di stampa), mantenendo il fallback Cambria Math per
le formule KaTeX.

### Persistenza
Le impostazioni sono salvate in `localStorage` (chiave `wms_access`) e ricaricate
all'avvio, su tutte le pagine.

---

## Verifica rapida

- [ ] Il font OpenDyslexic si carica (DevTools → Network → `/fonts/OpenDyslexic-Regular.ttf` → 200).
- [ ] `Tab` sposta il focus con anello visibile; la barra si annuncia come "toolbar".
- [ ] `A−`/`A+` scala il testo (80%–160%) e la percentuale si aggiorna.
- [ ] Interlinea cicla 1,6 → 1,9 → 2,2 → 2,6.
- [ ] Righello ON/OFF mostra/nasconde la banda gialla senza bloccare i clic.
- [ ] Modalità Contrasto schiarisce lo sfondo e aumenta il contrasto.
- [ ] Le preferenze restano dopo il riavvio del browser (`localStorage` → `wms_access`).
- [ ] Il PDF usa OpenDyslexic.
- [ ] Il pulsante "Ascolto → Leggi" avvia la lettura ad alta voce in italiano; "Stop" la ferma.

---

## Riferimenti

- **OpenDyslexic** — font libero (licenza OFL) per la dislessia.
- **WCAG 2.1/2.2** (W3C): contrasto (1.4.3), ridimensionamento testo (1.4.4), focus
  visibile (2.4.7), tastiera (2.1), `prefers-reduced-motion` (2.3.3).
- **L. 170/2010 e Linee Guida MIUR (DSA)** — contesto normativo della didattica inclusiva.

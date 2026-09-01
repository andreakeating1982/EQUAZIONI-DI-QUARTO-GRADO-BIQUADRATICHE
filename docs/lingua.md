# Cambiare la lingua dell'app (inglese, spagnolo, francese) — riferimento

L'app sorgente è scritta in **italiano**. La logica matematica (generazione
dell'equazione, sostituzione `t = x^k`, delta, radici, verifica) **non dipende dalla
lingua**: per tradurre l'app in **inglese**, **spagnolo** o **francese** cambiano solo
i testi dell'interfaccia, la voce della lettura ad alta voce (TTS) e i formati di
numeri/date.

## Dove vivono i testi

| Elemento | File | Note |
|---|---|---|
| Attributo `lang` e `<title>` della pagina | `client/index.html` | `lang="it"` → `lang="en"` / `"es"` / `"fr"` |
| Dati studente: "Cognome", "Nome", "Data", "Classe", pulsante "ENTRA" | `client/src/pages/WelcomePage.tsx` | anche le `aria-label` dei campi |
| Titoli e testi dei 7 passi, "RICOPIA SUL QUADERNO", "Riconosci", "Conferma", "Digita l'equazione", "Scarica il quaderno" | `client/src/pages/BiquadraticExercises.tsx` | la parte più corposa |
| Testi del PDF (intestazione, consegna, "Nome", "Classe", "Data", "PUNTEGGIO") | `client/src/pages/BiquadraticExercises.tsx` (`handleScaricaPdf`) | testi nel documento di stampa |
| Voce TTS (codice BCP-47) | `client/src/hooks/useReadAloud.ts` | `it-IT` → lingua della voce |
| Etichette barra accessibilità ("Font", "Interlinea", "Righello", "Modalità", "Ascolto") | `client/src/components/AccessibilityToolbar.tsx` | + `aria-label` / `title` |

## Passi per tradurre

1. **`client/index.html`**: cambia `lang="it"` e il `<title>` (es. "Biquadratic
   Equations — Interactive App" / "Ecuaciones Bicuadráticas" / "Équations
   Biquadratiques").
2. **`WelcomePage.tsx`**: traduci etichette, placeholder e pulsante "ENTRA"
   → "ENTER" / "ENTRAR" / "ENTRER" (o "COMMENCER").
3. **`BiquadraticExercises.tsx`**: traduci i titoli dei 7 passi, le consegne, il box
   "RICOPIA SUL QUADERNO" e i pulsanti. Mantieni le **stesse chiavi di stato** (non
   rinominare variabili/funzioni: cambia SOLO le stringhe visibili).
4. **`useReadAloud.ts`**: imposta la voce della lingua (vedi tabella sotto) e traduci
   le etichette lette ad alta voce.
5. **`AccessibilityToolbar.tsx`**: traduci le etichette della barra.
6. **PDF**: traduci i testi del documento scaricabile.

> ⚠️ **Regola d'oro**: cambia solo le **stringhe**, non i nomi di variabili, le chiavi
> di stato, gli ID o la logica. Così la build (`pnpm check`) resta valida.

## Simboli matematici: NON si traducono

Le formule **KaTeX sono universali** (`x^4`, `\Delta`, `\sqrt`, `\pm`, frazioni). Non
vanno tradotte. Cambiano solo le **parole** attorno alle formule:

| Italiano | Inglese | Spagnolo | Francese |
|---|---|---|---|
| discriminante | discriminant | discriminante | discriminant |
| soluzione / soluzioni | solution(s) | solución / soluciones | solution(s) |
| verifica | check / verify | verificación | vérification |
| impossibile | no real solutions | sin solución | aucune solution |
| insieme delle soluzioni | solution set | conjunto de soluciones | ensemble des solutions |
| passo 1…7 | step 1…7 | paso 1…7 | étape 1…7 |

## Formati di numeri e date

| Lingua | Decimale | Data |
|---|---|---|
| Italiano | virgola `3,5` | `gg/mm/aaaa` |
| Inglese | punto `3.5` | `mm/gg/aaaa` |
| Spagnolo | virgola `3,5` | `gg/mm/aaaa` |
| Francese | virgola `3,5` | `gg/mm/aaaa` |

Le **date lette ad alta voce** ("01/09/2026" → "primo settembre duemilaventisei")
seguono la lingua della voce: aggiornare il convertitore in `useReadAloud.ts`.

## Voce TTS per lingua (BCP-47)

| Lingua | `lang` documento | BCP-47 TTS |
|---|---|---|
| Italiano | `it` | `it-IT` |
| Inglese | `en` | `en-US` (o `en-GB`) |
| Spagnolo | `es` | `es-ES` |
| Francese | `fr` | `fr-FR` |

In `useReadAloud.ts` si usa `speechSynthesis` con la voce migliore disponibile per
quel BCP-47 (es. `voices.find(v => v.lang.startsWith('it'))` → `'en'`/`'es'`/`'fr'`).

## Accessibilità e lingua

- Il font **OpenDyslexic** copre tutti i caratteri latini: funziona per it/en/es/fr
  senza modifiche.
- La **lettura ad alta voce** deve usare la voce della lingua scelta (altrimenti legge
  con accento/pronuncia sbagliata).
- Le **`aria-label`** e i `title` vanno tradotti insieme ai testi visibili.
- Il **convertitore MAIUSCOLE → minuscole** della TTS (per gli accenti corretti) è
  indipendente dalla lingua: non serve toccarlo.

## Verifica rapida

- [ ] `lang` di `index.html` corretto e `<title>` tradotto.
- [ ] Nessun testo italiano rimasto nei componenti (grep `grep -rn "Cognome\|Passo\|RICOPIA\|Riconosci" client/src`).
- [ ] Voce TTS nella lingua scelta (prova il pulsante "Ascolto").
- [ ] PDF con testi e data nella lingua corretta.
- [ ] `pnpm check` senza errori.

# 🔀 ADATTARE — Creare varianti dell'app

Scopo: ricostruire una **NUOVA app identica** alla sorgente ma con contenuto diverso.

## Varianti supportate

| Variante | Cosa cambia | Riferimento |
|----------|-------------|-------------|
| **A — Grado diverso** (2, 4, 6, 8…) | sostituzione `t = x^k` e passo di estrazione `x` | `docs/grado.md` + `scripts/clone_app.py` |
| **B — Disequazioni** (qualsiasi grado) | verso (`>`, `<`, `≥`, `≤`) + studio del segno + intervalli | `docs/disequazioni.md` |
| **C — Equazioni/disequazioni fratte** (qualsiasi grado) | C.E. + numeratore = 0 (+ studio del segno per le disequazioni) | `docs/fratte.md` |
| **D — Lingua** (inglese, spagnolo, francese) | testi + voce TTS + formati numeri/date | `docs/lingua.md` |
| **E — Quiz** | set di domande JSON (VERO/FALSO, 3 o 4 opzioni) | `docs/quiz.md` |

## Workflow rapido

1. **Clona** (per il grado): `python3 scripts/clone_app.py --name <nome> --degree N`
   (oppure `--source https://github.com/<utente>/<repo>.git`). Per le altre varianti
   parti dal sorgente e segui il riferimento.
2. **Completa la CHECKLIST** stampata dallo script (logica del passo di estrazione x).
3. `pnpm check` + `pnpm build`.
4. Deploy preview → verifica → conferma esplicita dell'utente → produzione.

## Regole d'oro

- **NON** fare replace globale delle cifre `4`/`2` (rompe `4ac`, `2a`): sostituire solo i
  **token di grado**.
- Il calcolo di Δ, t₁, t₂ è **identico per ogni grado**: cambia solo l'estrazione di `x`
  (`Math.sqrt` → `Math.pow(t, 1/k)`, `±` solo per k pari).
- La logica matematica **non dipende dalla lingua**: si traducono solo testi, voce TTS e
  formati numeri/date (le formule KaTeX sono universali).

Approfondimenti: **`GUIDA-IA.md`** (sezioni "Variante A–E") e **`docs/*.md`**.

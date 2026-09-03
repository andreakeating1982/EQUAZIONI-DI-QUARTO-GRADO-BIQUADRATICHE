# AGENTS.md — Guida rapida per agenti IA

Questa repository è il **WIDGET MATEMATICO SORGENTE** (già "Equazioni Biquadratiche"):
app didattica interattiva **Vite + React + TypeScript + TailwindCSS 4** (scaffold
`web-static`). **Nessun backend, nessun database, nessuna chiave API**: tutta la logica
(equazione, passi, verifica, PDF) gira nel browser; il server Express serve solo i file
statici + header COOP/COEP + CORS sui font.

## Documenti chiave (leggere in questo ordine)

| Documento | Scopo |
|-----------|-------|
| **`REBUILD.md`** | Ricostruire l'app **identica** dal repository (clone → install → check → build → deploy). |
| **`ADATTARE.md`** | Creare **varianti**: grado, disequazioni, equazioni/disequazioni fratte, lingua, quiz. |
| **`RENDER.md`** | Trasferire l'app su **Render** via GitHub (Blueprint `render.yaml`). |
| **`ACCESSIBILITA.md`** | ♿ **Sezione ACCESSIBILITÀ** — misure BES/DSA portabili su altre app. |
| **`GUIDA-IA.md`** | Guida operativa completa (architettura, file critici, regole d'oro). |
| **`docs/`** | Riferimenti: `grado.md`, `disequazioni.md`, `fratte.md`, `lingua.md`, `quiz.md`. |
| **`cornice-dinamica/`** | Cornice embed per blog (iframe ad altezza automatica, anti-loop). |
| **`scripts/clone_app.py`** | Clonazione meccanica con grado diverso. |

## Comandi essenziali

```bash
pnpm install   # dipendenze (usa pnpm-lock.yaml)
pnpm check     # type-check TypeScript — MAI saltare prima di build/deploy
pnpm dev       # dev server (http://localhost:5173)
pnpm build     # build produzione (Vite + esbuild server → dist/)
pnpm start     # server produzione (NODE_ENV=production node dist/index.js)
```

## Regole non negoziabili

1. **MAI fare replace globale delle cifre `4`/`2`** per cambiare grado: romperebbe `4ac`,
   `2a`. Sostituire solo i **token di grado** (vedi `scripts/clone_app.py` e `docs/grado.md`).
2. Il canale `postMessage` è **`labvisivo:height`** (condiviso con gli embed) — NON cambiarlo.
3. Font **OpenDyslexic** su `html, body, #root` e `.font-sans/.font-serif/.font-mono`, MA
   **NON** su `.katex` (le formule restano in KaTeX).
4. Prima del deploy produzione: `pnpm check` + `pnpm build` + checkpoint.
5. Lo scaffold è **`web-static`** (NON `web-db-user`): niente DB, niente auth.

# 🔨 REBUILD — Ricostruire l'app identica dal repository GitHub

Scopo: ricostruire **esattamente la stessa app** partendo da questa repository.

## 1. Clona

```bash
git clone https://github.com/<utente>/<repo>.git
cd <repo>              # se l'app è in una subfolder: cd <subfolder>
```

## 2. Installa e verifica

```bash
pnpm install           # usa pnpm-lock.yaml (lockfile incluso)
pnpm check             # type-check TypeScript — MAI saltare
```

## 3. Avvia in locale

```bash
pnpm dev               # http://localhost:5173
```

## 4. Build di produzione

```bash
pnpm build             # Vite build + esbuild server → dist/
pnpm start             # server Express (statici + COOP/COEP + CORS /fonts)
```

## 5. Deploy

- **Easy-Peasy.AI**: `webdev_deploy` (preview → conferma → produzione), scaffold `web-static`.
- **Render**: vedi `RENDER.md` (`render.yaml` + `.github/workflows/ci.yml` già inclusi).

## Checklist: la ricostruzione è identica?

- [ ] Schermata iniziale (Cognome/Nome/Data/Classe) con card compatta.
- [ ] Riconoscimento scrittura a mano ONNX (modelli in `client/public/models/comer/`).
- [ ] Font OpenDyslexic su tutta l'app (`client/public/fonts/`).
- [ ] 7 passi guidati + box "RICOPIA SUL QUADERNO" + quaderno PDF in OpenDyslexic.
- [ ] Barra accessibilità (Font, Interlinea, Righello, Modalità, Ascolto).
- [ ] Lettura ad alta voce (TTS italiano).

Approfondimenti (architettura e file critici): **`GUIDA-IA.md`**.

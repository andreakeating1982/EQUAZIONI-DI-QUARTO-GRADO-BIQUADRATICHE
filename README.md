# 📐 Widget Matematico Sorgente — App Interattiva

> Già **"Equazioni Biquadratiche"** — ora **WIDGET MATEMATICO SORGENTE**.

Un'app didattica interattiva che guida gli studenti passo-passo nella risoluzione delle
**equazioni trinomie** `a·x^(2k) + b·x^k + c = 0` tramite la sostituzione `t = x^k`, con
input a **scrittura a mano** (riconoscimento ONNX), box **"RICOPIA SUL QUADERNO"** e
**quaderno PDF scaricabile**.

La sorgente attuale risolve le **equazioni biquadratiche** (grado 4, `k = 2`), ma è
progettata per essere **clonata e variata** facilmente: grado 2/4/6/8…, disequazioni di
qualsiasi grado, equazioni/disequazioni fratte (vedi [Varianti](#-varianti)).

---

## 🚀 L'app è già online

```
https://equazioni-biquadratiche.easy-peasy.site
```

---

## 📚 Documentazione chiave (leggi prima di modificare)

| Documento | A cosa serve |
|-----------|--------------|
| **[`GUIDA-IA.md`](GUIDA-IA.md)** | **Guida per l'IA**: ricostruire e variare l'app (grado, disequazioni, fratte, **lingua**, quiz) |
| **[`DEPLOY-RENDER.md`](DEPLOY-RENDER.md)** | Trasferire l'app su **Render** via GitHub |
| **[`ACCESSIBILITA.md`](ACCESSIBILITA.md)** | ♿ **Sezione ACCESSIBILITÀ** — tutte le misure BES/DSA, portabili su altre app |
| [`docs/grado.md`](docs/grado.md) | Mappa del codice per **cambiare il grado** |
| [`docs/disequazioni.md`](docs/disequazioni.md) | Come adattare l'app alle **disequazioni** |
| [`docs/fratte.md`](docs/fratte.md) | Come adattare l'app alle **fratte** (C.E. + verifica) |
| [`docs/lingua.md`](docs/lingua.md) | Come **cambiare la lingua** (inglese, spagnolo, francese) |
| [`docs/quiz.md`](docs/quiz.md) | Come adattare l'app a un **quiz** con set di domande |
| [`scripts/clone_app.py`](scripts/clone_app.py) | Script di **clonazione** con grado diverso |

---

## 📱 Come si usa

### Per lo studente

1. Apri l'app e compila la schermata iniziale con **Cognome, Nome, Data, Classe**
2. Clicca **ENTRA**
3. Scrivi a mano l'equazione nel riquadro (es. `2x⁴ − 3x² + 1 = 0`) oppure usa
   **✎ digita l'equazione**
4. Clicca **RICONOSCI** — l'app interpreta la scrittura
5. Se il riconoscimento è corretto, clicca **CONFERMA**
6. L'app mostra **7 passi guidati** (equazione → sostituzione `t = x²` → Δ → t₁ → t₂ → x₁ → x₂ → verifica)
7. Per ogni passo, scrivi il valore a mano, clicca **RICONOSCI**, e il sistema verifica
8. Alla fine, scarica il **quaderno PDF** con tutti i passaggi

### Per il docente

- L'app è **autoguidata**: lo studente segue i passi da solo
- Il PDF scaricabile contiene **Cognome, Nome, Classe e Data** in testa — perfetto per la valutazione
- Nessun account, nessuna configurazione: l'app è pronta all'uso

---

## 🖼️ Embed nel blog (Blogger / qualsiasi sito)

> ⭐ **Consigliata — cornice dinamica dedicata**: copia l'intero contenuto del file
> [`cornice-dinamica/embed-equazioni-biquadratiche-dedicata.html`](cornice-dinamica/embed-equazioni-biquadratiche-dedicata.html)
> nella vista HTML del post. Include pulsanti **Schermo intero** e **Ricarica**, spinner
> di caricamento, stato online/errore con **Riprova** e altezza automatica. Per un'altra
> app usa [`cornice-dinamica/embed-universale.html`](cornice-dinamica/embed-universale.html)
> (cambia `APP_URL` o passa `?app=URL`). Dettagli: [`cornice-dinamica/README.md`](cornice-dinamica/README.md).

In alternativa, incolla questo codice minimale in modalità HTML:

```html
<!--WIDGET MATEMATICO SORGENTE-->
<div style="background: rgb(250, 248, 245); border-radius: 16px; box-shadow: rgba(0, 0, 0, 0.08) 0px 4px 20px; font-family: system-ui, -apple-system, sans-serif; margin: 0px auto; max-width: 800px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #C69C7C 0%, #E0C8B0 100%); padding: 16px 20px; text-align: center;">
    <span style="color: #3d2b1f; font-family: 'Cambria','Hoefler Text','Times New Roman',serif; font-size: 15px; font-weight: 600; letter-spacing: 1px;">EQUAZIONI DI QUARTO GRADO</span>
    <br />
    <span style="color: #5a3d2b; font-family: 'Cambria','Hoefler Text','Times New Roman',serif; font-size: 12px; font-weight: 400; letter-spacing: 0.5px;">TRINOMIE BIQUADRATICHE &nbsp;·&nbsp; RISOLVI IN 7 PASSI</span>
  </div>
  <iframe id="widgetMatematicoIframe" loading="lazy" src="https://equazioni-biquadratiche.easy-peasy.site/" style="border: none; display: block; height: 600px; min-width: 100%; transition: height 0.2s ease; width: 1px;" title="Widget Matematico Sorgente">
  </iframe>
</div>

<script>
(function() {
  var iframe = document.getElementById('widgetMatematicoIframe');
  if (!iframe) return;
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'labvisivo:height' && typeof e.data.height === 'number') {
      if (e.data.height > 100) iframe.style.height = e.data.height + 'px';
    }
  });
})();
</script><br /><br />
```

Il codice embed è disponibile anche come **file pronti** in `cornice-dinamica/`:
`embed-equazioni-biquadratiche-dedicata.html` (⭐ dedicata), `embed-equazioni-biquadratiche-lite.html`
(leggera), `embed-universale.html` (template per altre app) e
`embed-equazioni-biquadratiche.html` (autosufficiente con font in base64).

**L'iframe si auto-ridimensiona** grazie ai messaggi `postMessage` (`labvisivo:height` + `ping`)
integrati nell'app.

---

## 🔀 Varianti

L'app è un **sorgente** pensato per essere variato. L'**IA** (MARKY su Easy-Peasy.AI,
Copilot, Claude, ecc.) può ricostruire la stessa app cambiando:

1. **Il grado dell'equazione** — `t = x^k` con k = 1, 2, 3, 4… (grado 2, 4, 6, 8…).
   Usa `scripts/clone_app.py` + `docs/grado.md`.
2. **Le disequazioni** di qualsiasi grado — studio del segno + intervalli. Vedi
   `docs/disequazioni.md`.
3. **Le equazioni/disequazioni fratte** — Condizioni di Esistenza + verifica. Vedi
   `docs/fratte.md`.
4. **La lingua** — inglese, spagnolo, francese (traduzione testi + voce TTS + formati
   di numeri/date). Vedi `docs/lingua.md`.
5. **Un quiz** con set di domande — contenuto, numero, VERO/FALSO o 3/4 opzioni.
   Vedi `docs/quiz.md`.

La guida operativa completa è in **[`GUIDA-IA.md`](GUIDA-IA.md)**.

---

## ☁️ Trasferire su Render (via GitHub)

Il pacchetto include già tutto il necessario: `render.yaml` (Blueprint), la CI di GitHub
(`.github/workflows/ci.yml`) e la guida **[`DEPLOY-RENDER.md`](DEPLOY-RENDER.md)**.

In sintesi: carica la cartella su un repository GitHub → su [render.com](https://render.com)
→ **New → Blueprint** → collega il repo → Render crea il Web Service automaticamente.

---

## ♿ Accessibilità (BES/DSA)

L'app include misure di inclusione per studenti con **BES/DSA** e **ipovisione**:
**font OpenDyslexic**, barra di accessibilità (dimensione testo, interlinea, righello,
alto contrasto), **lettura ad alta voce** in italiano, focus visibile, ARIA,
`prefers-reduced-motion`, PDF in OpenDyslexic.

Tutte le misure sono documentate e **portabili** su altre app nella
**[`ACCESSIBILITA.md`](ACCESSIBILITA.md)** (sezione ACCESSIBILITÀ).

---

## 🏗️ Tecnologie

| Tecnologia | Uso |
|-----------|-----|
| React 19 + TypeScript | Frontend |
| Vite 7 | Build tool |
| TailwindCSS 4 | Styling |
| Wouter | Routing lato client (hash) |
| KaTeX | Rendering formule matematiche |
| ONNX Runtime Web + Ink-ON | Riconoscimento scrittura a mano |
| Express | Server di produzione (serving statico + COOP/COEP + CORS) |

---

## 🗂️ Struttura del progetto

```
├── client/                     # Frontend React + Vite + Tailwind
│   ├── index.html
│   ├── public/
│   │   ├── models/comer/       # Modelli ONNX (riconoscimento scrittura)
│   │   └── fonts/              # Font OpenDyslexic
│   └── src/
│       ├── pages/
│       │   ├── WelcomePage.tsx          # Home (dati studente)
│       │   └── BiquadraticExercises.tsx # App principale (7 passi)
│       ├── components/
│       │   ├── MathDrawCanvas.tsx       # Canvas disegno
│       │   ├── NumberInputCanvas.tsx    # Canvas input valori
│       │   ├── FractionDisplay.tsx      # Badge frazioni
│       │   ├── AccessibilityToolbar.tsx # Barra accessibilità
│       │   └── ui/                      # Componenti shadcn/ui
│       ├── contexts/AccessibilityContext.tsx
│       ├── hooks/
│       │   ├── useMathRecognition.ts    # Riconoscimento ONNX
│       │   └── useReadAloud.ts          # Lettura ad alta voce (TTS)
│       ├── App.tsx
│       ├── main.tsx
│       └── index.css                    # Stili globali + tema + accessibilità
├── server/index.ts             # Server Express (serving statico)
├── shared/const.ts             # Costanti condivise
├── docs/                       # Riferimenti per le varianti (grado, disequazioni, fratte)
├── scripts/clone_app.py        # Script di clonazione con grado diverso
├── cornice-dinamica/           # Cornice dinamica embed (dedicata, lite, universale, autosufficiente + test)
├── GUIDA-IA.md                 # Guida per l'IA
├── DEPLOY-RENDER.md            # Guida deploy Render
├── ACCESSIBILITA.md            # Sezione ACCESSIBILITÀ
├── render.yaml                 # Blueprint Render
├── package.json                # Dipendenze e script
└── vite.config.ts              # Configurazione Vite
```

---

## 📦 Sviluppo locale

```bash
pnpm install     # dipendenze
pnpm dev         # dev server
pnpm check       # type-check TypeScript
pnpm build       # build di produzione (client + server)
pnpm start       # server di produzione
```

---

## 📄 Licenza

MIT — libero di usare, modificare e condividere.

---

*App creata con ❤️ da MARKY su Easy-Peasy.AI · Settembre 2026*

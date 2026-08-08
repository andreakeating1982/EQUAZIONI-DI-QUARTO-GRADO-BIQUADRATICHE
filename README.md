# 📐 Equazioni Biquadratiche — App Interattiva

Un'app didattica interattiva che guida gli studenti passo-passo nella risoluzione delle equazioni biquadratiche (trinomie di quarto grado), con input tramite **scrittura a mano** (riconoscimento ONNX) e **quaderno PDF scaricabile**.

L'app riconosce l'equazione scritta a mano dallo studente (`ax⁴ + bx² + c = 0`), la trasforma in un'equazione di secondo grado tramite la sostituzione `t = x²`, calcola discriminante, radici `t₁, t₂` e infine le quattro soluzioni `x₁, x₂, x₃, x₄`. Ogni passaggio è accompagnato da spiegazioni, formule e badge colorati che mostrano le frazioni semplificate.

---

## 🚀 L'app è già online!

L'app è deployata e funzionante qui:

```
https://equazioni-biquadratiche.easy-peasy.site
```

Non devi fare nulla per pubblicarla — è già live! Puoi:

- **Usarla subito** dal link qui sopra
- **Incorporarla nel tuo blog** con il codice embed (vedi sezione 📱 Embed)
- **Modificare il codice** e ri-deployare con Easy-Peasy.AI

---

## 📱 Come si usa

### Per lo studente

1. Apri l'app e compila la schermata iniziale con **Cognome, Nome, Data, Classe**
2. Clicca **ENTRA**
3. Scrivi a mano l'equazione nel riquadro (es. `2x⁴ − 3x² + 1 = 0`)
4. Clicca **RICONOSCI** — l'app interpreta la scrittura
5. Se il riconoscimento è corretto, clicca **CONFERMA**
6. L'app mostra **7 passi guidati**:
   - Passo 1: Scrittura dell'equazione originale
   - Passo 2: Sostituzione `t = x²`
   - Passo 3: Calcolo del discriminante Δ
   - Passo 4: Calcolo di t₁ = (−b + √Δ) / 2a
   - Passo 5: Calcolo di t₂ = (−b − √Δ) / 2a
   - Passo 6: Soluzioni ±√t₁ e ±√t₂
   - Passo 7: Riepilogo con le quattro radici
7. Per ogni passo, scrivi il valore a mano, clicca **RICONOSCI**, e il sistema verifica
8. Alla fine, scarica il **quaderno PDF** con tutti i passaggi

### Per il docente

- L'app è **autoguidata**: lo studente segue i passi da solo
- Il PDF scaricabile contiene **Cognome, Nome, Classe e Data** in testa — perfetto per la valutazione
- Nessun account, nessuna configurazione: l'app è pronta all'uso

---

## 🖼️ Embed nel blog (Blogger / qualsiasi sito)

Incolla questo codice in modalità HTML nel tuo post o pagina:

```html
<!--EQUAZIONI BIQUADRATICHE-->
<div style="background: rgb(250, 248, 245); border-radius: 16px; box-shadow: rgba(0, 0, 0, 0.08) 0px 4px 20px; font-family: system-ui, -apple-system, sans-serif; margin: 0px auto; max-width: 800px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #C69C7C 0%, #E0C8B0 100%); padding: 16px 20px; text-align: center;">
    <span style="color: #3d2b1f; font-family: 'Cambria','Hoefler Text','Times New Roman',serif; font-size: 15px; font-weight: 600; letter-spacing: 1px;">EQUAZIONI DI QUARTO GRADO</span>
    <br />
    <span style="color: #5a3d2b; font-family: 'Cambria','Hoefler Text','Times New Roman',serif; font-size: 12px; font-weight: 400; letter-spacing: 0.5px;">TRINOMIE BIQUADRATICHE &nbsp;·&nbsp; RISOLVI IN 7 PASSI</span>
  </div>
  <iframe id="equazioniBiquadraticheIframe" loading="lazy" src="https://equazioni-biquadratiche.easy-peasy.site/" style="border: none; display: block; height: 600px; min-width: 100%; transition: height 0.2s ease; width: 1px;" title="Equazioni Biquadratiche Interattive">
  </iframe>
</div>

<script>
(function() {
  var iframe = document.getElementById('equazioniBiquadraticheIframe');
  if (!iframe) return;
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'labvisivo:height' && typeof e.data.height === 'number') {
      if (e.data.height > 100) iframe.style.height = e.data.height + 'px';
    }
  });
})();
</script><br /><br />
```

Il codice embed è anche disponibile nel file `embed-blogger.html` incluso nel pacchetto.

**L'iframe si auto-ridimensiona** grazie ai messaggi `postMessage` integrati nell'app.

---

## 🔧 Come modificare e ri-deployare

L'app è costruita con lo scaffold **web-static** di Easy-Peasy.AI. Per modificarla:

1. Apri il progetto su **Easy-Peasy.AI** (piattaforma MARKY)
2. Chiedi a MARKY le modifiche che vuoi (es. "cambia il colore del bottone", "aggiungi un nuovo passo")
3. MARKY applica le modifiche, fa build, preview e deploy
4. Il deploy su Cloud Run è automatico — l'URL rimane lo stesso

**Non serve configurare server, database o Docker.** Easy-Peasy.AI gestisce tutto.

### Struttura dei file principali

```
client/src/
  pages/
    WelcomePage.tsx              # Schermata iniziale (dati studente)
    BiquadraticExercises.tsx     # Pagina principale con i 7 passi
  components/
    MathDrawCanvas.tsx           # Canvas per input scrittura a mano
    NumberInputCanvas.tsx        # Canvas per input valori numerici
    FractionDisplay.tsx          # Componente visualizzazione frazioni
  hooks/
    useMathRecognition.ts        # Riconoscimento ONNX scrittura
  App.tsx                        # Router e layout
server/
  index.ts                       # Server Express (solo serving statico)
```

---

## 🏗️ Tecnologie

| Tecnologia | Uso |
|-----------|-----|
| React 19 + TypeScript | Frontend |
| Vite 7 | Build tool |
| TailwindCSS 4 | Styling |
| Wouter | Routing lato client |
| KaTeX | Rendering formule matematiche |
| ONNX Runtime Web | Riconoscimento scrittura a mano |
| Ink-ON | Modello ONNX per handwriting recognition |
| Express | Server di produzione |

---

## 🗂️ Struttura completa del progetto

```
├── client/                     # Frontend React + Vite + Tailwind
│   ├── index.html              # Entry HTML
│   ├── public/
│   │   ├── models/             # Modelli ONNX per riconoscimento
│   │   └── wasm/               # WASM per ONNX runtime
│   └── src/
│       ├── pages/
│       │   ├── WelcomePage.tsx          # Home con dati studente
│       │   └── BiquadraticExercises.tsx # App principale (7 passi)
│       ├── components/
│       │   ├── MathDrawCanvas.tsx       # Canvas disegno equazioni
│       │   ├── NumberInputCanvas.tsx    # Canvas input valori
│       │   ├── FractionDisplay.tsx      # Visualizzazione frazioni
│       │   └── ui/                      # Componenti shadcn/ui
│       ├── hooks/
│       │   └── useMathRecognition.ts    # Riconoscimento ONNX
│       ├── App.tsx                      # Router e layout
│       ├── main.tsx                     # Entry React
│       └── index.css                    # Stili globali + tema
├── server/
│   └── index.ts                # Server Express (serving statico)
├── shared/
│   └── const.ts                # Costanti condivise
├── embed-blogger.html          # Codice embed per Blogger
├── package.json                # Dipendenze e script
├── tsconfig.json               # Configurazione TypeScript
└── vite.config.ts              # Configurazione Vite
```

---

## 📦 Sviluppo locale

```bash
# Installa dipendenze
pnpm install

# Avvia server di sviluppo
pnpm dev

# Build di produzione
pnpm build

# Type check
pnpm check
```

---

## 📄 Licenza

MIT — libero di usare, modificare e condividere.

---

*App creata con ❤️ da MARKY su Easy-Peasy.AI · Agosto 2026*

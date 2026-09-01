# Cambiare il grado dell'equazione — riferimento completo

L'app sorgente risolve equazioni **trinomie** della forma

```
a · x^(2k) + b · x^k + c = 0
```

con sostituzione **`t = x^k`**, che riduce tutto a una quadratica `a·t² + b·t + c = 0`.
Il **grado** dell'equazione in `x` è `2k`. Il sorgente attuale è **k = 2 → grado 4**
(biquadratica: `ax⁴ + bx² + c = 0`).

## Mappa grado → k

| grado | k | sostituzione | tipo | radici x |
|-------|---|--------------|------|----------|
| 2  | 1 | nessuna (t = x) | quadratica | x = t |
| 4  | 2 | t = x² | biquadratica | x = ±√t |
| 6  | 3 | t = x³ | bicubica | x = ∛t |
| 8  | 4 | t = x⁴ | — | x = ±∜t |
| 2k | k | t = x^k | trinomia | vedi sotto |

**Regola radici (passo 6):**
- k **pari**: `x = ±(t)^(1/k)` — due radici opposte, serve `t ≥ 0`.
- k **dispari**: `x = (t)^(1/k)` — una sola radice reale, `t` può essere qualsiasi reale.

## Dove è codificato il grado (code map)

File principale: `client/src/pages/BiquadraticExercises.tsx` (~1592 righe).
Righe indicative — possono slittare dopo modifiche, usare `grep` per conferma.

### 1) Parser dell'espressione scritta — `parseBiquadraticLaTeX` (riga ~185)
Riconosce le potenze e assegna i coefficienti:
- `x^{4}` / `x^4` / `x⁴` → coefficiente **a** (potenza 2k)
- `x^{2}` / `x^2` / `x²` → coefficiente **b** (potenza k)
- costante → coefficiente **c**

Righe chiave: i blocchi `if (content.includes('x^{4}') ...)` e `else if (content.includes('x^{2}') ...)` (~239–249), le assegnazioni `power = 4` / `power = 2`, i flag `foundX4` / `foundX2`, e le regex di pulizia `.replace(/[xX]\^\{4\}/g, ...)`.

### 2) Builder dell'equazione — `buildEquationLatex` (riga ~782)
- `result += sign + coeffLatex + "x^{4}"` (~794) → potenza 2k
- `result += sign + coeffLatex + "x^{2}"` (~802) → potenza k

### 3) Builder dell'equazione in t — `buildTEquationLatex` (riga ~820)
Usa `"t^{2}"` e `"t"`. **NON cambia con k** (la sostituzione produce sempre `at² + bt + c = 0`).

### 4) Titoli e testi visibili
- `<h1>` header: `EQUAZIONI DI QUARTO GRADO · TRINOMIE BIQUADRATICHE` (~857)
- Passo 2: `VARIABILE AUSILIARIA t = x²`, `SOSTITUENDO x² = t E x⁴ = t²` (~1167–1175)
- Hint input: `SCRIVI L'EQUAZIONE ... 2x⁴−3x²+1=0` (~883)
- placeholder: `es. 2x^4-3x^2+1=0` (~945)
- `WelcomePage.tsx`: titolo `EQUAZIONI DI QUARTO GRADO TRINOMIE BIQUADRATICHE` + `7 PASSI`

### 5) Calcolo matematico (NON cambia con k — resta quadratica in t)
- `delta = b*b - 4*a*c` (~478)
- `t1 = (-b + sqrt(delta)) / (2a)` e `t2` (~486–487)
- `positiveRootEntries` e i radicali t₁/t₂ (~528–580)

### 6) Passo 6 — estrazione x da t (~1362–1410) — **cambia la logica**
- k=2 (attuale): `x = ±√t` → `\pm\sqrt{t}` e `Math.sqrt(t)`.
- k pari ≥4: `±` + radice k-esima → `\pm\sqrt[k]{t}` e `Math.pow(t, 1/k)`.
- k dispari: solo radice k-esima → `\sqrt[k]{t}` (senza `±`) e `Math.pow(t, 1/k)`.
- k=1: nessun passo di estrazione (x = t).

## Workflow di clonazione (riassunto)

1. **Clona** con lo script (sostituzioni meccaniche):
   ```bash
   python3 /home/user/skills/widget-matematico-sorgente/scripts/clone_app.py \
       --name "equazioni-sesto-grado" --degree 6
   ```
   Lo script copia la cartella, rinomina potenze/titoli/placeholder/testo sostituzione.

2. **Completa la logica del passo 6** secondo la tabella radici qui sopra (lo script
   NON la tocca): `Math.sqrt` → `Math.pow(t, 1/k)`, `\pm\sqrt{` → `\sqrt[k]{`, ecc.

3. **Caso speciale k=1** (grado 2): rimuovere il passo 2 (sostituzione) e il passo 6
   (estrazione), x = t direttamente; i passi diventano 5. Aggiornare `7 PASSI` → `5 PASSI`.

4. **Verifica**:
   ```bash
   cd /home/user/<name> && pnpm install && pnpm check && pnpm dev
   grep -rn "x^{4}\|x^{2}\|x⁴\|x²" client/src   # residui da sistemare
   ```

5. **Deploy** (stesso pattern dell'app sorgente):
   ```bash
   webdev_deploy mode="preview" project_dir="/home/user/<name>"
   # dopo conferma utente:
   webdev_save_checkpoint description="..." project_dir="/home/user/<name>"
   webdev_deploy mode="production" project_dir="/home/user/<name>"
   ```

## Coerenza dei nomi (facoltativo ma consigliato)

Per chiarezza interna, rinominare i simboli specifici del grado:
- `BiquadraticExercises` → `Esercizi` / `TrinomieExercises`
- `BiquadraticComputed` → `EquazioneComputed`
- `ParsedBiquadratic` → `ParsedEquazione`
- `parseBiquadraticLaTeX` → `parseEquazioneLaTeX`

Questi sono solo nomi interni (nessun impatto funzionale), ma riducono la confusione
quando si mantengono più cloni con gradi diversi.

## PostMessage e embed

Il canale postMessage è `'labvisivo:height'` (condiviso da tutte le app didattiche):
NON cambiarlo. L'embed Blogger (`embed.html`) va rigenerato per la nuova app ma il
tipo messaggio resta `labvisivo:height`.

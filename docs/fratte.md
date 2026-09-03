# Adattare l'app alle equazioni fratte (razionali) — riferimento

Stessa filosofia dell'app sorgente: accompagnare lo studente passo-passo,
lasciandogli solo i conti finali più semplici. Per un'**equazione fratta**
(razionale) si aggiungono le **Condizioni di Esistenza (C.E.)** (denominatore ≠ 0)
e la verifica che le soluzioni non annullino i denominatori.

## Forme trattate

1. **Frazione unica = 0**: `N(x) / D(x) = 0` → basta `N(x) = 0` con `D(x) ≠ 0`.
2. **Somma/differenza di frazioni**: `A(x)/B(x) ± C(x)/D(x) = E(x)` → denominatore
   comune e poi `numeratore = 0`.
3. **Fratte che si riducono a una trinomia di grado qualsiasi**: dopo il denominatore
   comune il numeratore è `a·x^(2k) + b·x^k + c`, quindi si riusa TUTTA la logica
   dell'app trinomie (sostituzione `t = x^k`, delta, radici, estrazione x).

## Cosa resta identico all'app equazioni

- Input a mano (ONNX/ink-on), `NumberInputCanvas`, `MathDrawCanvas`.
- Sostituzione `t = x^k`, calcolo del discriminante `Δ = b² − 4ac`, radici `t₁`, `t₂`.
- Estrazione di `x` da `t` (regola radici per k pari/dispari, vedi `grado.md`).
- `positiveRootEntries`, radicali, NotebookGuide "RICOPIA SUL QUADERNO", PDF.
- Divulgazione progressiva, accessibilità (font OpenDyslexic, barra, ecc.).

## Cosa cambia / va aggiunto

### 1) Parser delle frazioni
`parseBiquadraticLaTeX` oggi riconosce polinomi; per le fratte occorre:
- riconoscere il simbolo di frazione `\frac{num}{den}` (e, in input a mano, la
  frazione scritta su due righe);
- salvare separatamente `numerator` e `denominator` (polinomi);
- se ci sono più frazioni, individuare i singoli denominatori per le C.E.

### 2) Nuovo passo: Condizioni di Esistenza (C.E.)
Prima di risolvere, mostrare **C.E.: denominatore ≠ 0**. Per ogni fattore del
denominatore: `D(x) ≠ 0` → escludere i valori che lo annullano.
Esempio: `(x² − 4)/(x − 1) = 0` → `x − 1 ≠ 0` → `x ≠ 1`.

### 3) Nuovo passo: denominatore comune / numeratore = 0
- Caso frazione unica: passare direttamente a `N(x) = 0`.
- Caso più frazioni: moltiplicare ambo i membri per il m.c.m. dei denominatori,
  poi `N(x) = 0` (mostrare il passaggio, non farlo calcolare allo studente).

### 4) Risoluzione del numeratore (grado qualsiasi)
Il numeratore è ora un'equazione polinomiale: se è una trinomia
`a·x^(2k) + b·x^k + c = 0`, riusare la logica dell'app (sostituzione `t = x^k`,
delta, radici `t`, estrazione `x`). **Il grado può essere qualsiasi** (2, 4, 6, 8…).

### 5) Verifica delle soluzioni contro le C.E.
Confrontare ogni radice trovata con i valori esclusi dalle C.E.: scartare le radici
che annullano un denominatore (soluzioni "non accettabili"). Mostrare il passo con
badge ACCETTABILE / NON ACCETTABILE.

### 6) Insieme soluzione finale
Mostrare l'insieme delle soluzioni accettabili (oppure "nessuna soluzione").

## Struttura passi per una fratta (es. `(x² − 4)/(x − 1) = 0`)

1. Equazione fratta inserita
2. Condizioni di Esistenza (C.E.): `x ≠ 1`
3. Numeratore = 0: `x² − 4 = 0`
4. Risoluzione (eventuale sostituzione `t = x^k`, delta, radici)
5. Radici x: `x = ±2`
6. Verifica C.E.: `x = 2` accettabile, `x = −2` accettabile
7. Insieme soluzione: `S = { −2, 2 }`

Se una soluzione cadesse su un valore escluso (es. `(x² − 1)/(x − 1) = 0` → `x = 1`
ma `x ≠ 1`), il passo 6 la scarta: la soluzione diventa `S = ∅` (o solo l'altra radice).

## Linee guida BES per le fratte

- **Evidenziare le C.E.** con un riquadro colorato "prima di tutto".
- **Rendere visivo lo scarto**: badge verde ACCETTABILE / rosso NON ACCETTABILE.
- Fare scrivere allo studente **solo** i numeri essenziali (C.E., radici, verifica),
  mostrando i passaggi algebrici già svolti.
- Tenere il box "RICOPIA SUL QUADERNO" con la derivazione completa da copiare.

---

## Disequazioni fratte (combinazione fratte + studio del segno)

Una **disequazione fratta** ha forma `N(x) / D(x) ≷ 0` (oppure una somma di frazioni
`≷ 0`), con `≷ ∈ {>, <, ≥, ≤}`. Si risolve **combinando** le C.E. (delle equazioni
fratte) e lo **studio del segno** (delle disequazioni):

1. **C.E.**: ogni denominatore ≠ 0 (stesso passo delle equazioni fratte).
2. **Forma canonica**: portare tutto a sinistra e ridurre a **una frazione unica**
   `N(x)/D(x) ≷ 0` (denominatore comune).
3. **Zeri di numeratore e denominatore**: trovare le radici di `N(x) = 0` e di `D(x) = 0`.
4. **Studio del segno**: tabella dei segni con i fattori di numeratore e denominatore
   (righe separate per `N(x)` e `D(x)`, riga finale per `N/D`). Nei punti in cui
   `D(x) = 0` la frazione **non esiste** (buco nella linea dei segni, non un "=").
5. **Soluzione finale**: selezionare gli intervalli con il segno richiesto dal verso
   (`> 0` → `+`, `< 0` → `−`), escludendo sempre i valori esclusi dalle C.E. Per `≥ 0` /
   `≤ 0` includere gli zeri del numeratore MA **mai** quelli del denominatore.

### Struttura passi per una disequazione fratta (es. `(x² − 1)/(x − 2) ≥ 0`)

1. Disequazione fratta inserita (con verso)
2. C.E.: `x − 2 ≠ 0` → `x ≠ 2`
3. Zeri del numeratore: `x² − 1 = 0` → `x = ±1`
4. Zeri del denominatore: `x − 2 = 0` → `x = 2` (escluso dalle C.E.)
5. Studio del segno (tabella dei segni di N e D)
6. Soluzione: `[-1, 1] ∪ ]2, +∞[` (intervalli con segno `+`, escluso `x = 2`)

Se il numeratore è una trinomia `a·x^(2k) + b·x^k + c`, si riusa TUTTA la logica trinomie
(sostituzione `t = x^k`, delta, radici, estrazione x) per gli zeri del numeratore: **il
grado può essere qualsiasi**.

### Linee guida BES per le disequazioni fratte

- **Tabella dei segni visiva** con colori (`+` verde, `−` rosso) e il **"buco"** del
  denominatore ben evidenziato (pallino vuoto vs pallino pieno).
- **C.E. in riquadro colorato** "prima di tutto", come nelle equazioni fratte.
- Fare scrivere allo studente **solo** C.E., zeri e intervallo finale: la tabella dei
  segni è mostrata e ragionata, non calcolata a mano.

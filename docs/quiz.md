# Adattare l'app a un quiz con set di domande — riferimento

Questa app ("Widget Matematico Sorgente") è una **guida passo-passo**. La stessa
famiglia di app **LabVisivo** include anche app **quiz** con dashboard docente, codici
classe a 4 cifre, sessioni, contatore studenti e report PDF con punteggio
(es. **Shakespeare Quiz**, **Bécquer Quiz**). Per ricostruire un quiz con un **set di
domande diverso** si lavora su un **JSON di domande** + il motore del quiz già pronto.

## Cosa si può cambiare in un quiz

1. **Contenuto** delle domande → cambia `testo` e `opzioni`.
2. **Numero di domande** → aggiungi/rimuovi elementi nell'array `domande`.
3. **Tipologia di domanda** → cambia il campo `tipo`:
   - `vero_falso` — VERO/FALSO (2 opzioni);
   - `multipla_3` — risposta multipla a **3** opzioni;
   - `multipla_4` — risposta multipla a **4** opzioni.

## Esempio di set di domande (JSON)

```json
{
  "titolo": "Quiz di ripasso",
  "domande": [
    {
      "id": 1,
      "tipo": "vero_falso",
      "testo": "L'equazione x² + 1 = 0 ha soluzioni reali.",
      "opzioni": ["Vero", "Falso"],
      "risposta": 1
    },
    {
      "id": 2,
      "tipo": "multipla_4",
      "testo": "Quali sono le soluzioni di x² − 4 = 0?",
      "opzioni": ["±2", "2", "4", "nessuna"],
      "risposta": 0
    },
    {
      "id": 3,
      "tipo": "multipla_3",
      "testo": "Quanto vale il discriminante di x² − 4 = 0?",
      "opzioni": ["16", "4", "0"],
      "risposta": 0
    }
  ]
}
```

- `risposta` è l'indice (0-based) dell'opzione corretta.
- `opzioni` ha **2** elementi per VERO/FALSO, **3** per `multipla_3`, **4** per
  `multipla_4`.

## Come cambiare il set

| Obiettivo | Cosa fare |
|---|---|
| Contenuto diverso | modifica `testo` e `opzioni` di ogni domanda |
| Numero diverso | aggiungi/rimuovi oggetti nell'array `domande` |
| Tipologia diversa | cambia `tipo` e adatta `opzioni`/`risposta` (2, 3 o 4 opzioni) |
| Tema/lingua diverso | traduci `testo` e `opzioni` (vedi `docs/lingua.md`) |

## App sorgente e skill di riferimento

| Risorsa | Uso |
|---|---|
| **`shakespeare-quiz`** (in `/home/user/shakespeare-quiz`) | quiz sorgente: MAPA 1/2, codici classe, sessioni, report PDF voto /10 |
| **`quiz-interattivo-sorgente`** (skill) | clona il quiz sorgente con un set di domande diverso (costruisce il JSON anche da testo libero) |
| **`quiz-interattivo-con-audio-sorgente`** (skill) | quiz sorgente con audio (Bécquer Quiz): stesse pause di lettura e segmenti audio |
| **`schema-quiz-builder`** (skill) | costruire/adattare app quiz/schema con dashboard docente |
| **`quiz-adapter`** (skill) | cambia le domande di Shakespeare Quiz (script Python automatico) |

### Clonazione rapida di un quiz

```bash
# quiz senza audio (Shakespeare Quiz sorgente)
python3 /home/user/skills/quiz-interattivo-sorgente/scripts/clone_app.py \
  --source /home/user/shakespeare-quiz --name "mio-quiz" --dump

# quiz con audio (Bécquer Quiz sorgente)
python3 /home/user/skills/quiz-interattivo-con-audio-sorgente/scripts/clone_app.py \
  --source /home/user/becquer-quiz --name "mio-quiz-audio"
```

La skill clona l'app e costruisce il **JSON domande** (anche da testo libero fornito
dall'utente), poi esegue la verifica automatica (`tsc`).

## Verifica rapida

- [ ] JSON `domande` valido (array non vuoto, `id` univoci).
- [ ] Ogni `risposta` è un indice valido dentro `opzioni`.
- [ ] Coerenza `tipo` ↔ numero di opzioni (2 / 3 / 4).
- [ ] Report PDF con punteggio corretto su 10.
- [ ] `pnpm check` (o `tsc`) senza errori.

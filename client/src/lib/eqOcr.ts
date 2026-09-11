/**
 * Normalizza il testo riconosciuto dall'OCR in un'equazione biquadratica
 * comprensibile al parser dell'app (parseBiquadraticLaTeX).
 *
 * Problema: Tesseract legge MALISSIMO gli esponenti in apice — x⁴ diventa
 * «*», «t», «X44» o sparisce — mentre coefficienti e segni li legge bene.
 * Il risultato tipico («xt-5x2+4=0») veniva interpretato come una trinomia
 * di SECONDO grado (a=0). Per questo la normalizzazione è in due passaggi:
 *
 * 1. RICOSTRUZIONE TRINOMIA — l'app tratta SOLO trinomie biquadratiche
 *    ax⁴ + bx² + c = 0: se nel testo ci sono esattamente DUE termini in x,
 *    il primo è a (x⁴) e il secondo è b (x²) PER POSIZIONE; l'esponente non
 *    si legge, si assegna. I coefficenti (cifre prima della x) e i segni
 *    arrivano dall'OCR; tutto ciò che sta DOPO la x (l'esponente illeggibile)
 *    viene scartato. La costante è l'ultimo numero fuori dalle x.
 *
 * 2. FALLBACK — per forme inatteste si applica la normalizzazione classica
 *    (cifre attaccate alla x, simboli confusi…). La pagina mostra un avviso
 *    (`fuzzy: true`) quando il risultato è incerto o senza x⁴.
 */

const SUP_DIGITS: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};

/** Selezione della/e riga/e utile/i + unificazione dei simboli equivalenti. */
function preprocess(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  /* L'equazione sta nelle righe con la «x»; un eventuale pezzo che inizia con
     un segno (+ o −) fa parte dell'equazione (riga spezzata su due righe). */
  let keep = lines.filter((l) => /[xX]/.test(l) || /^[+\-−–—]/.test(l));
  if (keep.length === 0) keep = lines.slice(0, 3);

  return keep
    .join("")
    .replace(/\s+/g, "")
    .replace(/[−–—―‒]/g, "-")
    .replace(/[，,]/g, ".")
    .replace(/＝/g, "=")
    .replace(/X/g, "x");
}

/** Coefficiente valido: numero, frazione semplice, con o senza segno. */
const COEFF_RE = /^[+-]?(\d+(\.\d+)?|\.\d+)(\/\d+(\.\d+)?)?$/;

/**
 * Ricostruisce la trinomia se nel testo ci sono ESATTAMENTE due termini in x
 * (più un'eventuale costante). Restituisce null quando la struttura non è
 * ricostruibile con certezza (troppi termini in x, RHS ≠ 0, niente «=»…).
 */
function tryRebuildTrinomial(pre: string): { equation: string; fuzzy: boolean } | null {
  const eqIdx = pre.lastIndexOf("=");
  if (eqIdx < 0) return null;
  const lhs = pre.slice(0, eqIdx).replace(/=/g, "");
  const rhs = pre.slice(eqIdx + 1);
  /* La foto di un trinomio si presenta come «… = 0»: una RHS diversa non è
     ricostruibile con la struttura fissa → fallback. */
  if (rhs && !/^0+(\.0+)?$/.test(rhs)) return null;
  if (!lhs) return null;

  const tokens = lhs.split(/(?=[+-])/).filter((t) => t && !/^[+=]+$/.test(t));
  const parts: (string | null)[] = [null, null];
  let xCount = 0;
  let fuzzy = false;
  let constant: string | null = null;

  for (const tok of tokens) {
    const xi = tok.indexOf("x");
    if (xi >= 0) {
      /* Terzo termine in x: la struttura posizionale non regge più → fallback */
      if (xCount >= 2) return null;
      const coeff = tok.slice(0, xi).replace(/,/g, ".");
      /* Il coefficiente vuoto è legittimo (x⁴, x²…): esponente implicito 1 */
      const valid = coeff === "" || coeff === "+" || coeff === "-" || COEFF_RE.test(coeff);
      if (!valid) fuzzy = true;
      parts[xCount] = valid
        ? coeff === "" || coeff === "+"
          ? "1"
          : coeff === "-"
            ? "-1"
            : coeff
        : coeff.startsWith("-")
          ? "-1"
          : "1";
      xCount++;
    } else {
      const body = tok.replace(/^[+-]/, "");
      const digits = body.replace(/[^0-9.]/g, "");
      if (body && digits && /^[0-9.]+$/.test(digits)) {
        /* L'ultimo numero fuori dalle x è la costante c (i falsi «+4+1»
           generati dall'OCR vengono scavalcati) */
        constant = digits;
      } else if (body.replace(/[0-9.]/g, "") !== "") {
        fuzzy = true;
      }
    }
  }

  if (xCount !== 2) return null;

  const aStr = parts[0] ?? "1";
  const bStr = parts[1] ?? "1";
  const aPart = aStr === "1" ? "" : aStr === "-1" ? "-" : aStr;
  const bPart =
    bStr === "1" ? "+x^2" : bStr === "-1" ? "-x^2" : (bStr.startsWith("-") ? "" : "+") + bStr + "x^2";
  let out = aPart + "x^4" + bPart;
  if (constant && constant !== "0") {
    out += constant.startsWith("-") ? constant : "+" + constant;
  }
  return { equation: out + "=0", fuzzy };
}

/** Normalizzazione classica (fallback): casi non ricostruibili come trinomia. */
function legacyNormalize(pre: string): string {
  let s = pre;
  s = s
    /* errori tipici di Tesseract in contesto matematico: O/Q al posto di 0,
       l/I/| al posto di 1 (solo tra cifre o simboli, per non rovinare le x) */
    .replace(/([0-9+=\-]|^)[OoQ]([0-9+=\-]|$)/g, (_m, a: string, b: string) => `${a}0${b}`)
    .replace(/([0-9]|^)[lI|]([0-9+=\-]|$)/g, (_m, a: string, b: string) => `${a}1${b}`)
    /* il pedice letto come * / ' / ° è quasi sempre l'esponente ² */
    .replace(/x[*'’`´°]/g, "x^2")
    /* punto usato come separatore dopo una lettera (es. «Es. 2x4-3x2+1=0») */
    .replace(/[a-zA-Z]\.(?=\d)/g, (m) => m[0])
    /* cifra attaccata alla x = esponente (Tesseract legge x⁴ come «x4»);
       i pedici unicode (x⁴, x²) restano intatti: il parser li accetta */
    .replace(/x(\d)(?=\D|$)/g, "x^$1");

  /* assicura la forma «…=0» */
  s = s.replace(/=+$/, "=0");
  if (!s.includes("=")) s = s + "=0";
  /* RHS con cifre di troppo («=06», «=00»): la foto di un trinomio è sempre …=0 */
  s = s.replace(/=0\d+$/, "=0");

  /* togli tutto ciò che non può stare in un'equazione biquadratica
     (etichette, lettere residue, punteggiatura, parentesi spurie ai bordi) */
  s = s.replace(/[^x^0-9+\-=.⁰¹²³⁴⁵⁶⁷⁸⁹]/g, "");
  s = s.replace(/^\./, "");

  /* Senza x non c'è equazione biquadratica: meglio vuoto (la pagina segnala
     il fallimento) che una stringa senza senso */
  if (!s.includes("x")) return "";
  return s;
}

export function normalizeEquationOcrDetailed(raw: string): { equation: string; fuzzy: boolean } {
  const pre = preprocess(raw);
  if (!pre) return { equation: "", fuzzy: true };
  const rebuilt = tryRebuildTrinomial(pre);
  if (rebuilt) return rebuilt;
  const eq = legacyNormalize(pre);
  /* SECONDA CHANCE: se il fallback non mostra una vera x di quarto grado
     (es. «=0» tagliato dal ritaglio o letto male, così la prima ricostruzione
     non scatta e la x⁴ resta confusa con la x²), si riprova la ricostruzione
     posizionale sul testo già normalizzato. */
  if (!/x\^4|x⁴/.test(eq)) {
    const retry = tryRebuildTrinomial(eq);
    if (retry) return retry;
  }
  return { equation: eq, fuzzy: !/x\^4|x⁴/.test(eq) };
}

export function normalizeEquationOcr(raw: string): string {
  return normalizeEquationOcrDetailed(raw).equation;
}

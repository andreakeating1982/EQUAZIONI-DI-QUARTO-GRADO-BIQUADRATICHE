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
    .replace(/X/g, "x")
    /* O/Q spurie tra cifra e x («5Ox2» letto al posto di «5x2») */
    .replace(/([0-9.])[OoQ](?=x)/g, "$1");
}

/** Coefficiente valido: numero, frazione semplice, con o senza segno. */
const COEFF_RE = /^[+-]?(\d+(\.\d+)?|\.\d+)(\/\d+(\.\d+)?)?$/;

/**
 * Ricostruisce la trinomia se nel testo ci sono ESATTAMENTE due «x»
 * (più un'eventuale costante). SCAN-BASED: non conto i token separati da
 * +/− (l'OCR li fonde in un blocco unico, es. «2x243x»), ma cerco ogni
 * «x»: il coefficiente è l'eventuale numero con segno attaccato PRIMA,
 * tutto ciò che segue la x fino al prossimo segno/x è l'esponente
 * illeggibile e viene scartato, i numeri rimanenti sono le costanti.
 * Restituisce null quando la struttura non è ricostruibile (≠ 2 x,
 * RHS ≠ 0, niente «=»…).
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

  /* O/Q spurie tra cifra e x («5Ox2» per «5x2»), se il pre non l'ha già fatto */
  const clean = lhs.replace(/([0-9.])[OoQ](?=x)/g, "$1");

  const xRe = /([+-]?(?:\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?)?)x/g;
  const coeffs: string[] = [];
  const chunks: string[] = [];
  const beforeX: string[] = [];
  let prevEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = xRe.exec(clean)) !== null) {
    const before = clean.slice(prevEnd, m.index);
    chunks.push(before);
    beforeX.push(before);
    coeffs.push(m[1]);
    /* Spazzatura d'esponente: tutto fino al prossimo segno o x
       (cifre, lettere, *, ?, ", ^, pedici unicode…) */
    let end = xRe.lastIndex;
    while (end < clean.length && !/[+\-x×]/.test(clean[end])) end++;
    prevEnd = end;
    xRe.lastIndex = end;
  }
  chunks.push(clean.slice(prevEnd));

  /* La trinomia biquadratica ha ESATTAMENTE due termini in x */
  if (coeffs.length !== 2) return null;

  let fuzzy = false;
  let constant: string | null = null;
  for (const chunk of chunks) {
    if (/[a-zA-Z]/.test(chunk)) fuzzy = true; // coefficiente illeggibile («Dbx2»)
    /* L'ultimo numero fuori dalle x è la costante c (i falsi «+4+1»
       generati dall'OCR vengono scavalcati) */
    const runRe = /([+-]?)(\d+(?:\.\d+)?)/g;
    let r: RegExpExecArray | null;
    while ((r = runRe.exec(chunk)) !== null) {
      constant = (r[1] === "-" ? "-" : "") + r[2];
    }
  }

  /* Se il coefficiente non è stato catturato (lettere spazzina tra segno e x,
     es. «-Dbx2») il segno si recupera dal blocco subito prima della x */
  const norm = (c: string, before: string): string => {
    if (c === "" || c === "+") return before.includes("-") ? "-1" : "1";
    if (c === "-") return "-1";
    return c;
  };
  const aStr = norm(coeffs[0], beforeX[0] ?? "");
  const bStr = norm(coeffs[1], beforeX[1] ?? "");
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

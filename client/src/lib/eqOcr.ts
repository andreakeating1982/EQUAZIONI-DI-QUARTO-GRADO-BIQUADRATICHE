/**
 * Normalizza il testo riconosciuto dall'OCR in un'equazione biquadratica
 * comprensibile al parser dell'app (parseBiquadraticLaTeX).
 *
 * Problema: Tesseract legge MALISSIMO gli esponenti in apice — x⁴ diventa
 * «*», «t», «X44» o sparisce — mentre coefficienti e segni li legge bene.
 * Il risultato tipico («xt-5x2+4=0») veniva interpretato come una trinomia
 * di SECONDO grado (a=0). Per questo la normalizzazione è in due passaggi:
 *
 * 1. RICOSTRUZIONE TRINOMIA (v3) — l'app tratta SOLO trinomie biquadratiche
 *    ax⁴ + bx² + c = 0. Si scansionano ENTRAMBI i lati del «=»:
 *    · ogni «x» trovata è un termine; il coefficiente è l'eventuale numero
 *      (con segno) attaccato PRIMA; tutto ciò che segue la x fino al
 *      prossimo segno/x è l'esponente illeggibile e viene scartato;
 *    · la potenza (x⁴ o x²) si legge dalla cifra attaccata alla x quando
 *      è riconoscibile («x4», «x²», «x⁴»), altrimenti si assegna per
 *      POSIZIONE (prima x = x⁴, seconda = x²);
 *    · la RHS viene SPOSTATA a sinistra con i segni invertiti: sono così
 *      gestite «x⁴ = 5x² − 4», «x⁴ − 5x² = −4», «5x² − 4 = x⁴»;
 *    · se manca il termine in x² ma ci sono due costanti (l'OCR ha mangiato
 *      la x di «5x²»), la prima costante ne diventa il coefficiente:
 *      «x⁴ − 5 + 4 = 0» → «x⁴ − 5x² + 4 = 0» (recupero x² persa; vale anche
 *      quando la x⁴ era stata letta come x²);
 *    · se il coefficiente guida risulta negativo si moltiplica tutto per −1
 *      (forma canonica con a > 0).
 *
 * 2. FALLBACK — per forme inatteste si applica la normalizzazione classica;
 *    se questa non basta si riprova la ricostruzione sul testo già
 *    normalizzato (seconda chance: utile quando il «=0» è stato tagliato
 *    dal ritaglio o letto male).
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
void SUP_DIGITS;

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

/* ── Aritmetica razionale esatta (interi, frazioni «3/4», decimali «0.5») ── */
type Rat = { n: number; d: number };
const ZERO: Rat = { n: 0, d: 1 };
const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : Math.abs(x));
function reduce(r: Rat): Rat {
  const g = gcd(Math.abs(r.n), r.d) || 1;
  return { n: r.n / g, d: r.d / g };
}
function rat(str: string): Rat {
  const neg = str.startsWith("-");
  const s = neg ? str.slice(1) : str.replace(/^\+/, "");
  let n: number;
  let d: number;
  if (s.includes("/")) {
    const [p, q] = s.split("/");
    n = parseFloat(p);
    d = parseFloat(q);
  } else if (s.includes(".")) {
    const dec = s.split(".")[1]?.length ?? 0;
    n = parseFloat(s.replace(".", ""));
    d = 10 ** dec;
  } else {
    n = parseInt(s, 10);
    d = 1;
  }
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return ZERO;
  return reduce({ n: neg ? -n : n, d });
}
const rNeg = (r: Rat): Rat => ({ n: -r.n, d: r.d });
const rAdd = (x: Rat, y: Rat): Rat => reduce({ n: x.n * y.d + y.n * x.d, d: x.d * y.d });
const rSub = (x: Rat, y: Rat): Rat => reduce({ n: x.n * y.d - y.n * x.d, d: x.d * y.d });
const rStr = (r: Rat): string => (r.d === 1 ? String(r.n) : `${r.n}/${r.d}`);

/* ── Scansione di un lato dell'uguaglianza ── */
interface XTerm {
  coeff: string; // «», «+», «-», «5», «-5», «3/4», «0.5»…
  power: 2 | 4 | null; // nota se c'è una cifra/apice leggibile subito dopo la x
  before: string; // blocco tra il termine precedente e questo (segno recuperabile)
}
interface SideScan {
  terms: XTerm[];
  consts: Rat[]; // numeri fuori dalle x, con segno, in ordine
  fuzzy: boolean;
}

function scanSide(raw: string): SideScan {
  /* O/Q spurie tra cifra e x («5Ox2» per «5x2»), se il pre non l'ha già fatto */
  const clean = raw.replace(/([0-9.])[OoQ](?=x)/g, "$1");
  const xRe = /([+-]?(?:\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?)?)x/g;
  const terms: XTerm[] = [];
  const chunks: string[] = [];
  let prevEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = xRe.exec(clean)) !== null) {
    const before = clean.slice(prevEnd, m.index);
    chunks.push(before);
    /* Potenza leggibile? cifra (o apice unicode) subito dopo la x */
    const nx = clean[xRe.lastIndex];
    let power: 2 | 4 | null = null;
    if (nx === "2" || nx === "²") power = 2;
    else if (nx === "4" || nx === "⁴") power = 4;
    /* Spazzatura d'esponente: tutto fino al prossimo segno o x
       (cifre, lettere, *, ?, ", ^, apici unicode…) */
    let end = xRe.lastIndex;
    while (end < clean.length && !/[+\-x×]/.test(clean[end])) end++;
    terms.push({ coeff: m[1], power, before });
    prevEnd = end;
    xRe.lastIndex = end;
  }
  chunks.push(clean.slice(prevEnd));

  let fuzzy = false;
  const consts: Rat[] = [];
  for (const chunk of chunks) {
    if (/[a-zA-Z]/.test(chunk)) fuzzy = true; // coefficiente illeggibile («Dbx2»)
    const runRe = /([+-]?)(\d+(?:\.\d+)?)/g;
    let r: RegExpExecArray | null;
    while ((r = runRe.exec(chunk)) !== null) {
      /* «=06», «=05»… sono sporcature dell'OCR dopo lo zero */
      const num = /^0\d+$/.test(r[2]) ? "0" : r[2];
      consts.push(rat((r[1] === "-" ? "-" : "") + num));
    }
  }
  return { terms, consts, fuzzy };
}

/**
 * Ricostruisce la trinomia biquadratica dai DUE lati dell'uguaglianza.
 * `singleAsX4`: come interpretare un'unico termine in x senza potenza
 * leggibile — x⁴ al primo passaggio (è il termine guida della foto),
 * x² nella seconda chance (il fallback ha già normalizzato gli apici).
 * Restituisce null quando la struttura non è ricostruibile con certezza.
 */
function tryRebuildTrinomial(
  pre: string,
  singleAsX4: boolean
): { equation: string; fuzzy: boolean } | null {
  const eqIdx = pre.lastIndexOf("=");
  if (eqIdx < 0) return null;
  const lhsRaw = pre.slice(0, eqIdx).replace(/=/g, "");
  const rhsRaw = pre.slice(eqIdx + 1);
  const L = scanSide(lhsRaw);
  const R = scanSide(rhsRaw);

  /* Più di due termini in x su un lato: la struttura non regge → fallback */
  if (L.terms.length > 2 || R.terms.length > 2) return null;

  /* Se il coefficiente non è stato catturato (lettere spazzina tra segno e x,
     es. «-Dbx2») il segno si recupera dal blocco subito prima della x */
  const normT = (t: XTerm): string => {
    if (t.coeff === "" || t.coeff === "+") return t.before.includes("-") ? "-1" : "1";
    if (t.coeff === "-") return "-1";
    return t.coeff;
  };

  /* Potenza di ogni termine: dalla cifra attaccata alla x se leggibile
     (anche con ordine invertito «5x² = x⁴»), altrimenti per posizione */
  const assign = (side: SideScan, defaultX4: boolean): { p4: Rat | null; p2: Rat | null } => {
    if (side.terms.length === 0) return { p4: null, p2: null };
    if (side.terms.length === 1) {
      const t = side.terms[0];
      const c = rat(normT(t));
      if (t.power === 2) return { p4: null, p2: c };
      if (t.power === 4) return { p4: c, p2: null };
      return defaultX4 ? { p4: c, p2: null } : { p4: null, p2: c };
    }
    const [t1, t2] = side.terms;
    if (t1.power === 4 && t2.power === 2) return { p4: rat(normT(t1)), p2: rat(normT(t2)) };
    if (t1.power === 2 && t2.power === 4) return { p4: rat(normT(t2)), p2: rat(normT(t1)) };
    return { p4: rat(normT(t1)), p2: rat(normT(t2)) };
  };

  let l = assign(L, singleAsX4);
  let r = assign(R, false);

  /* Costanti numeriche rilevanti: quelle della RHS entrano con il segno
     invertito (spostamento); gli ZERI si scartano — lo «0» della forma
     «… = 0» non è mai un coefficiente né la c di una trinomia fotografata */
  const allConsts = [...L.consts, ...R.consts.map(rNeg)].filter((v) => v.n !== 0);

  /* x⁴ letta come x² («x² − 5 + 4 = 0»): con due costanti il libro può essere
     solo una biquadratica → promuovi il termine a x⁴ */
  if (!l.p4 && !r.p4 && (l.p2 || r.p2) && allConsts.length >= 2) {
    if (l.p2) l = { p4: l.p2, p2: null };
    else r = { p4: r.p2, p2: null };
  }

  let a = rSub(l.p4 ?? ZERO, r.p4 ?? ZERO);
  if (a.n === 0) return null; // senza x⁴ non è una biquadratica
  const x2Count = (l.p2 ? 1 : 0) + (r.p2 ? 1 : 0);
  let fuzzy = L.fuzzy || R.fuzzy;
  let b: Rat;
  let c: Rat;
  if (x2Count === 0 && allConsts.length >= 2) {
    /* x² PERSA: l'OCR ha mangiato la x del termine centrale («x⁴ − 5 + 4»):
       la prima costante era il suo coefficiente, l'ultima è la c */
    b = allConsts[0];
    c = allConsts[allConsts.length - 1];
    if (allConsts.length > 2) fuzzy = true;
  } else {
    b = rSub(l.p2 ?? ZERO, r.p2 ?? ZERO);
    const cL = L.consts.length ? L.consts[L.consts.length - 1] : ZERO;
    const cR = R.consts.reduce((acc, v) => rAdd(acc, v), ZERO);
    c = rSub(cL, cR);
  }

  /* Forma canonica: coefficiente guida positivo */
  if (a.n < 0) {
    a = rNeg(a);
    b = rNeg(b);
    c = rNeg(c);
  }

  const aS = rStr(a);
  const bS = rStr(b);
  const cS = rStr(c);
  const aPart = aS === "1" ? "" : aS === "-1" ? "-" : aS;
  const bPart =
    b.n === 0 ? "" : bS === "1" ? "+x^2" : bS === "-1" ? "-x^2" : (b.n < 0 ? "" : "+") + bS + "x^2";
  let out = aPart + "x^4" + bPart;
  if (c.n !== 0) out += c.n < 0 ? cS : "+" + cS;
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
  const rebuilt = tryRebuildTrinomial(pre, true);
  if (rebuilt) return rebuilt;
  const eq = legacyNormalize(pre);
  /* SECONDA CHANCE: si riprova la ricostruzione sul testo già normalizzato
     (il «=0» mancante/sporco o gli apici normalizzati dal fallback spesso
     rendono la struttura leggibile al secondo tentativo). */
  const retry = tryRebuildTrinomial(eq, false);
  if (retry) return retry;
  return { equation: eq, fuzzy: !/x\^4|x⁴/.test(eq) };
}

export function normalizeEquationOcr(raw: string): string {
  return normalizeEquationOcrDetailed(raw).equation;
}

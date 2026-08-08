import { useCallback, useRef, useState } from "react";
import { MathDrawCanvas, type Stroke } from "@/components/MathDrawCanvas";
import { FractionDisplay } from "@/components/FractionDisplay";
import { useMathRecognition } from "@/hooks/useMathRecognition";
import { cn } from "@/lib/utils";
import katex from "katex";

// ─── Helpers ──────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
  if (b === 0) return a;
  return gcd(b, a % b);
}

function numberToFractionDisplay(value: number): string {
  if (isNaN(value)) return "?";
  if (Math.abs(value) < 1e-10) return "0";
  const sign = value < 0 ? "-" : "";
  const absValue = Math.abs(value);
  for (let denominator = 1; denominator <= 1000; denominator++) {
    const numerator = Math.round(absValue * denominator);
    if (Math.abs(absValue - numerator / denominator) < 1e-6) {
      const g = gcd(numerator, denominator);
      const fn = numerator / g;
      const fd = denominator / g;
      if (fd === 1) return `${sign}${fn}`;
      return `${sign}${fn}/${fd}`;
    }
  }
  return `${sign}${absValue.toFixed(2)}`;
}

/** Scomponi un numero in {num, den} per FractionDisplay (null se non trovata) */
function numberToFractionParts(value: number): { num: number; den: number } | null {
  if (isNaN(value)) return null;
  if (Math.abs(value) < 1e-10) return { num: 0, den: 1 };
  const sign = value < 0 ? -1 : 1;
  const absValue = Math.abs(value);
  for (let denominator = 1; denominator <= 1000; denominator++) {
    const numerator = Math.round(absValue * denominator);
    if (Math.abs(absValue - numerator / denominator) < 1e-6) {
      const g = gcd(numerator, denominator);
      return { num: sign * (numerator / g), den: denominator / g };
    }
  }
  return null;
}

/** Converte un numero in stringa decimale con virgola, arrotondato a 2 cifre */
/** Quick KaTeX render — default displayMode:true per una resa corretta delle frazioni */
function renderKatex(latex: string, displayMode: boolean = true): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false, strict: false });
  } catch { return latex; }
}

function toDecimalString(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  // Se il valore arrotondato è un intero esatto, niente virgola né decimali
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) {
    return Math.round(rounded).toString();
  }
  const str = rounded.toFixed(2);
  return str.replace(".", ",");
}

/** Verifica se un numero è razionale (decimale finito o periodico).
 *  Cerca una frazione con denominatore ≤ 100 che approssimi il valore entro 1e-9.
 *  Per valori irrazionali (es. √2≈1,4142...) nessuna frazione piccola corrisponde. */
function isRationalCheck(value: number): boolean {
  if (isNaN(value)) return false;
  if (Math.abs(value) < 1e-10) return true; // 0 è razionale
  const absValue = Math.abs(value);
  for (let den = 1; den <= 100; den++) {
    const num = Math.round(absValue * den);
    if (Math.abs(absValue - num / den) < 1e-9) {
      return true;
    }
  }
  return false;
}

/** Frazione generatrice del decimale ARROTONDATO a 2 cifre.
 *  Es. √2≈1,41 → 141/100;  7/4=1,75 → 7/4. Sempre esatta. */
function numberToFractionFromRounded(value: number): { num: number; den: number } | null {
  if (isNaN(value)) return null;
  const rounded = Math.round(value * 100) / 100;
  if (Math.abs(rounded) < 1e-10) return { num: 0, den: 1 };
  const sign = rounded < 0 ? -1 : 1;
  const absValue = Math.abs(rounded);
  const numerator = Math.round(absValue * 100);
  const denominator = 100;
  const g = gcd(numerator, denominator);
  return { num: sign * (numerator / g), den: denominator / g };
}

// ─── LaTeX expression evaluator ───────────────────────────────────
// Valuta espressioni LaTeX con \frac, \sqrt, divisioni e numeri.

/** Estrai il contenuto tra graffe bilanciate a partire da pos */
function extractBraced(s: string, pos: number): { inner: string; end: number } | null {
  if (pos >= s.length || s[pos] !== '{') return null;
  let depth = 0;
  let i = pos;
  while (i < s.length) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) return { inner: s.slice(pos + 1, i), end: i + 1 };
    }
    i++;
  }
  return null;
}

/** Valuta ricorsivamente una stringa LaTeX → numero */
function evaluateLatex(latex: string): number | null {
  // Normalizza moltiplicatori, decimali, e comandi decorativi
  let s = latex.trim().replace(/\s+/g, '')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\\,/g, '.')
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/\\displaystyle/g, '');
  // Converti \dfrac e \tfrac in \frac
  s = s.replace(/\\(?:dfrac|tfrac)\{/g, '\\frac{');
  // Converti {num} \over {den} → \frac{num}{den} (TeX primitiva, ancora usata da alcuni recognizer)
  s = s.replace(/\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\s*\\over\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '\\frac{$1}{$2}');
  if (!s) return null;

  // ── 1. Outermost \frac{num}{den} ──────────────────────────────
  if (s.startsWith('\\frac{')) {
    const numBrace = extractBraced(s, 5); // after \frac
    if (!numBrace) return null;
    const denBrace = extractBraced(s, numBrace.end);
    if (!denBrace) return null;
    // Ensure nothing follows the second brace (or only whitespace)
    const rest = s.slice(denBrace.end).trim();
    if (rest && !rest.startsWith('/')) {
      // Extra stuff after \frac{}{} — not a pure fraction
    }
    const num = evaluateLatex(numBrace.inner);
    const den = evaluateLatex(denBrace.inner);
    if (num !== null && den !== null && den !== 0) {
      const val = num / den;
      // If there's trailing /something, continue
      if (rest.startsWith('/')) {
        const restVal = evaluateLatex(rest.slice(1));
        if (restVal !== null && restVal !== 0) return val / restVal;
        return null;
      }
      return val;
    }
    return null;
  }

  // ── 3. Outermost \sqrt{expr} ──────────────────────────────────
  if (s.startsWith('\\sqrt{')) {
    const br = extractBraced(s, 5);
    if (!br) return null;
    const rest = s.slice(br.end).trim();
    const inner = evaluateLatex(br.inner);
    if (inner !== null && inner >= 0) {
      const val = Math.sqrt(inner);
      if (rest.startsWith('/')) {
        const restVal = evaluateLatex(rest.slice(1));
        if (restVal !== null && restVal !== 0) return val / restVal;
        return null;
      }
      return val;
    }
    return null;
  }

  // ── 3. Addition / subtraction at top level (outside braces) ────
  // MUST come BEFORE leading-minus so that -4+√24 = (-4)+(√24) not -(4+√24)
  let braceDepth2 = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === '}') braceDepth2++;
    else if (s[i] === '{') braceDepth2--;
    else if (braceDepth2 === 0 && (s[i] === '+' || s[i] === '-') && i > 0) {
      const left = evaluateLatex(s.slice(0, i));
      const right = evaluateLatex(s.slice(i + 1));
      if (left !== null && right !== null) {
        return s[i] === '+' ? left + right : left - right;
      }
    }
  }

  // ── 4. Leading minus (safe: only if no top-level + or - operator) ──
  if (s.startsWith('-')) {
    const inner = evaluateLatex(s.slice(1));
    return inner !== null ? -inner : null;
  }

  // ── 5. Implicit multiplication: X\sqrt{Y} at top level ─────────
  let braceDepth2b = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') braceDepth2b++;
    else if (s[i] === '}') braceDepth2b--;
    else if (braceDepth2b === 0 && s.slice(i).startsWith('\\sqrt{') && i > 0) {
      const charBefore = s[i - 1];
      if (/^[0-9a-zA-Z.\)}]$/.test(charBefore)) {
        const leftPart = s.slice(0, i);
        const rightPart = s.slice(i);
        const left = evaluateLatex(leftPart);
        const right = evaluateLatex(rightPart);
        if (left !== null && right !== null) return left * right;
        break;
      }
    }
  }

  // ── 5. Inline division a/b (only at top level, NOT inside braces) ─
  // Cerca '/' non racchiuso tra graffe
  let braceDepth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') braceDepth++;
    else if (s[i] === '}') braceDepth--;
    else if (s[i] === '/' && braceDepth === 0 && i > 0 && i < s.length - 1) {
      const a = evaluateLatex(s.slice(0, i));
      const b = evaluateLatex(s.slice(i + 1));
      if (a !== null && b !== null && b !== 0) return a / b;
      // If division fails, fall through to try plain number
      break;
    }
  }

  // ── 6. sqrt(…) — plain text format ──────────────────────────────
  if (s.startsWith('sqrt(')) {
    let depth2 = 0;
    for (let i = 4; i < s.length; i++) {
      if (s[i] === '(') depth2++;
      else if (s[i] === ')') {
        if (depth2 === 0) {
          const inner = evaluateLatex(s.slice(5, i));
          if (inner !== null && inner >= 0) {
            const val = Math.sqrt(inner);
            const rest = s.slice(i + 1).trim();
            if (rest.startsWith('/')) {
              const restVal = evaluateLatex(rest.slice(1));
              if (restVal !== null && restVal !== 0) return val / restVal;
              return null;
            }
            return val;
          }
          return null;
        }
        depth2--;
      }
    }
    return null;
  }

  // ── 7. Plain number ────────────────────────────────────────────
  s = s.replace(/,/g, '.');
  const num = parseFloat(s);
  if (!isNaN(num)) return num;

  return null;
}

/** Estrai la forma radicale visiva dal LaTeX riconosciuto.
 *  Restituisce una stringa leggibile e pulita (senza parentesi inutili). */
function extractRadicalForm(latex: string): string | null {
  const s = latex.trim().replace(/\s+/g, '');
  if (!s.includes('\\sqrt')) return null;
  // Sostituisci \frac{a}{b} → a/b (SENZA parentesi esterne)
  let out = s.replace(/\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '$1/$2');
  // Sostituisci \sqrt{x} → √x (solo se x è semplice), altrimenti √(x)
  out = out.replace(/\\sqrt\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, (_m, inner: string) => {
    if (/^[0-9a-zA-Z.]+$/.test(inner)) return `√${inner}`;
    return `√(${inner})`;
  });
  // Pulisci graffe residue
  out = out.replace(/[{}]/g, '');
  return out;
}

// ─── Fraction from LaTeX ──────────────────────────────────────────
// Extract a \frac{num}{den} from LaTeX and return numerator/denominator.
// Returns null if the LaTeX does not represent a simple fraction.

interface ExtractedFraction {
  numerator: number;
  denominator: number;
  isNegative: boolean;
}

function extractFractionFromLatex(latex: string): ExtractedFraction | null {
  let s = latex.replace(/\s+/g, "");
  s = s.replace(/,/g, ".");

  // Rileva il segno meno FUORI dalla frazione (es. -\frac{7}{4})
  let globalNegative = false;
  if (s.startsWith("-")) {
    globalNegative = true;
    s = s.slice(1);
  }

  // Match \frac, \dfrac, \tfrac{num}{den}
  const fracMatch = s.match(/\\(?:frac|dfrac|tfrac)\{([^{}]+)\}\{([^{}]+)\}/);
  if (!fracMatch) return null;

  const numStr = fracMatch[1].replace(/[{}]/g, "").trim();
  const denStr = fracMatch[2].replace(/[{}]/g, "").trim();

  // Rileva eventuali meno interni a numeratore e denominatore
  const numNegative = numStr.startsWith("-");
  const denNegative = denStr.startsWith("-");
  const numClean = numNegative ? numStr.slice(1) : numStr;
  const denClean = denNegative ? denStr.slice(1) : denStr;

  const num = parseFloat(numClean);
  const den = parseFloat(denClean);
  if (isNaN(num) || isNaN(den) || den === 0) return null;

  // XOR a tre: la frazione è negativa se c'è un numero dispari di segni meno
  const isNegative = (globalNegative !== numNegative) !== denNegative;

  return { numerator: num, denominator: den, isNegative };
}

// ─── Props ────────────────────────────────────────────────────────

interface NumberInputCanvasProps {
  value: number | null;
  onChange: (value: number | null) => void;
  label: React.ReactNode;
  hint?: string;
  colorClass?: string;
  className?: string;
  allowNegative?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// NumberInputCanvas — handwriting canvas → fraction-aware number
// ═══════════════════════════════════════════════════════════════════

export function NumberInputCanvas({
  value,
  onChange,
  label,
  hint: _hint,
  colorClass = "text-foreground",
  className,
  allowNegative = true,
}: NumberInputCanvasProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [recognizedText, setRecognizedText] = useState<string>("");
  const [isRecognizing, setIsRecognizing] = useState(false);

  // Fraction state — preserved even after canvas clears
  const [fracNum, setFracNum] = useState<number | null>(null);
  const [fracDen, setFracDen] = useState<number | null>(null);
  const [fracNeg, setFracNeg] = useState(false);
  const [decimalStr, setDecimalStr] = useState<string | null>(null);
  const [radicalLatex, setRadicalLatex] = useState<string | null>(null);
  const [eraserMode, setEraserMode] = useState(false);
  const [hasPlusMinusSign, setHasPlusMinusSign] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editLatex, setEditLatex] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  // Frazione generatrice del decimale arrotondato (terza forma)
  const [roundFracNum, setRoundFracNum] = useState<number | null>(null);
  const [roundFracDen, setRoundFracDen] = useState<number | null>(null);
  const [roundFracNeg, setRoundFracNeg] = useState(false);
  // Flag: il valore riconosciuto è razionale? (solo se sì mostriamo la frazione generatrice)
  const [isValueRational, setIsValueRational] = useState(false);
  // Flag: l'input è un decimale puro (nessun \frac né \sqrt)? → mostra solo il decimale
  const [isPlainDecimalInput, setIsPlainDecimalInput] = useState(false);

  const { recognize, isModelReady, isLoading } = useMathRecognition();

  const handleStrokesChange = useCallback(
    (newStrokes: Stroke[]) => {
      setStrokes(newStrokes);
      if (newStrokes.length === 0) {
        setRecognizedText("");
        // Se l'utente ha cancellato tutto con la gomma, esci automaticamente dalla modalità gomma
        setEraserMode(false);
      }
    },
    [],
  );

  const handleManualRecognize = useCallback(async () => {
    if (strokes.length === 0 || !isModelReady) return;
    setIsRecognizing(true);

    // Try "expression" FIRST — better at capturing fraction structure
    let result = await recognize(strokes, "expression");
    // Fallback: "number" mode for pure digits
    if (!result) {
      result = await recognize(strokes, "number");
    }

    if (result) {
      // ── Correggi errori comuni di riconoscimento dei digit (es. 9 → g, q, 4) ──
      const DIGIT_FIXES: Record<string, string> = {
        'g': '9',
        'q': '9',
        'G': '9',
        'Q': '9',
        '\\gamma': '9',
        '\\Gamma': '9',
        '\\operatorname{g}': '9',
      };
      const trimmedLatex = result.latex.trim();
      if (DIGIT_FIXES[trimmedLatex]) {
        result.latex = DIGIT_FIXES[trimmedLatex];
      }

      // L'utente ha scritto il simbolo ±?
      const hasPM = result.latex.includes('\\pm') || result.latex.includes('\\mp') || result.latex.includes('±');
      setHasPlusMinusSign(hasPM);

      // Rimuovi \pm / \mp / ± (Unicode) — non sono operazioni numeriche
      const cleanLatex = result.latex
        .replace(/\\pm\s*/g, '')
        .replace(/\\mp\s*/g, '')
        .replace(/±/g, '')
        .replace(/^\+/, '')
        .replace(/\\(?:dfrac|tfrac)/g, '\\frac') // normalizza \dfrac e \tfrac
        .trim();

      // ── 1. Valuta l'espressione LaTeX pulita (supporta √, \frac, /) ──
      const evaluated = evaluateLatex(cleanLatex);

      if (evaluated !== null && isFinite(evaluated)) {
        // Controlla se c'è una frazione LaTeX pura (per il display preferito)
        const frac = extractFractionFromLatex(cleanLatex);
        if (frac && !cleanLatex.includes('\\sqrt')) {
          // Frazione semplice senza radice: usa num/den estratti
          setFracNum(frac.numerator);
          setFracDen(frac.denominator);
          setFracNeg(frac.isNegative);
        } else {
          // Calcola la frazione dal valore numerico
          const fp = numberToFractionParts(evaluated);
          if (fp) {
            setFracNum(Math.abs(fp.num));
            setFracDen(fp.den);
            setFracNeg(evaluated < 0);
          } else {
            resetFraction();
          }
        }

        // Forma decimale
        setDecimalStr(toDecimalString(evaluated));

        // Forma radicale: salva il LaTeX originale per il rendering KaTeX
        setRadicalLatex(result.latex.includes('\\sqrt') ? result.latex.trim().replace(/\s+/g, '') : null);

        // Input decimale puro? (nessun \frac né \sqrt → mostra solo il decimale)
        setIsPlainDecimalInput(!cleanLatex.includes('\\frac') && !cleanLatex.includes('\\sqrt'));

        // Frazione generatrice del decimale arrotondato (terza forma)
        const rfp = numberToFractionFromRounded(evaluated);
        if (rfp) {
          setRoundFracNum(Math.abs(rfp.num));
          setRoundFracDen(rfp.den);
          setRoundFracNeg(rfp.num < 0);
        } else {
          setRoundFracNum(null);
          setRoundFracDen(null);
          setRoundFracNeg(false);
        }

        setRecognizedText("");
        onChange(evaluated);
        setTimeout(() => setStrokes([]), 1400);
        setIsRecognizing(false);
        return;
      }

      // ── 2. Fallback avanzato: converti LaTeX in espressione JS valutabile ──
      let fallbackStr = cleanLatex.replace(/\s+/g, "");
      fallbackStr = fallbackStr.replace(/,/g, ".");

      // Converti \sqrt{x} → Math.sqrt(x)
      fallbackStr = fallbackStr.replace(
        /\\sqrt\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
        'Math.sqrt($1)',
      );
      // Converti \frac{a}{b} → (a)/(b) (parentesi per sicurezza)
      fallbackStr = fallbackStr.replace(
        /\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
        '($1)/($2)',
      );
      // Rimuovi \left, \right, \displaystyle, \mathrm, e comandi decorativi
      fallbackStr = fallbackStr
        .replace(/\\left/g, '')
        .replace(/\\right/g, '')
        .replace(/\\displaystyle/g, '')
        .replace(/\\mathrm\{([^{}]*)\}/g, '$1')
        .replace(/\\[a-zA-Z]+/g, ''); // altri comandi LaTeX residui
      // Pulisci graffe rimaste
      fallbackStr = fallbackStr.replace(/[{}]/g, '');

      if (!fallbackStr || fallbackStr === "-" || fallbackStr === ".") {
        setRecognizedText(result.latex || "?");
        resetFraction();
        setIsRecognizing(false);
        return;
      }

      // Prova a valutare come espressione JS (con Math.sqrt, +, -, *, /, parentesi)
      let parsed: number = NaN;
      try {
        // Sanitizza: permetti solo caratteri matematici sicuri
        const sanitized = fallbackStr.replace(/[^0-9.+\-*/()Math.sqrt]/g, '');
        // eslint-disable-next-line no-new-func
        const val = new Function('Math', `return ${sanitized}`)(Math);
        if (typeof val === 'number' && isFinite(val)) {
          parsed = val;
        }
      } catch {
        // Fallback evaluation failed
      }

      if (!isNaN(parsed)) {
        const fp = numberToFractionParts(parsed);
        if (fp) {
          setFracNum(Math.abs(fp.num));
          setFracDen(fp.den);
          setFracNeg(parsed < 0);
        } else {
          resetFraction();
        }
        setDecimalStr(toDecimalString(parsed));
        setRadicalLatex(null);
        setRecognizedText("");
        onChange(parsed);
        setTimeout(() => setStrokes([]), 1400);
      } else {
        resetFraction();
        // Mostra il LaTeX grezzo riconosciuto così l'utente può capire cosa è andato storto
        setRecognizedText(result.latex || "?");
      }
    } else {
      // ONNX recognition completamente fallita: dai un feedback chiaro
      resetFraction();
      setRecognizedText("Non riconosco. Riprova più grande e chiaro");
    }
    setIsRecognizing(false);
  }, [strokes, recognize, isModelReady, onChange, allowNegative]);

  const resetFraction = useCallback(() => {
    setFracNum(null);
    setFracDen(null);
    setFracNeg(false);
    setDecimalStr(null);
    setRadicalLatex(null);
    setRecognizedText("");
    setRoundFracNum(null);
    setRoundFracDen(null);
    setRoundFracNeg(false);
    setIsPlainDecimalInput(false);
    setHasPlusMinusSign(false);
  }, []);

  /** Valuta LaTeX inserito manualmente via tastiera (stessa pipeline del riconoscimento) */
  const handleEditSubmit = useCallback(() => {
    if (!editLatex.trim()) { setIsEditing(false); return; }
    const clean = editLatex
      .replace(/\\pm\s*/g, '')
      .replace(/\\mp\s*/g, '')
      .replace(/±/g, '')
      .replace(/^\+/, '')
      .replace(/\\(?:dfrac|tfrac)/g, '\\frac')
      .trim();
    const ev = evaluateLatex(clean);
    if (ev !== null && isFinite(ev)) {
      const frac = extractFractionFromLatex(clean);
      if (frac && !clean.includes('\\sqrt')) {
        setFracNum(frac.numerator);
        setFracDen(frac.denominator);
        setFracNeg(frac.isNegative);
      } else {
        const fp = numberToFractionParts(ev);
        if (fp) { setFracNum(Math.abs(fp.num)); setFracDen(fp.den); setFracNeg(ev < 0); }
        else resetFraction();
      }
      setDecimalStr(toDecimalString(ev));
      setRadicalLatex(clean.includes('\\sqrt') ? clean : null);
      setIsPlainDecimalInput(!clean.includes('\\frac') && !clean.includes('\\sqrt'));
      const rfp = numberToFractionFromRounded(ev);
      if (rfp) { setRoundFracNum(Math.abs(rfp.num)); setRoundFracDen(rfp.den); setRoundFracNeg(rfp.num < 0); }
      else { setRoundFracNum(null); setRoundFracDen(null); setRoundFracNeg(false); }
      setRecognizedText('');
      onChange(ev);
    }
    setIsEditing(false);
    setEditLatex('');
  }, [editLatex, onChange]);

  const handleClear = () => {
    setStrokes([]);
    setRecognizedText("");
    resetFraction();
    onChange(null);
  };

  const hasContent = strokes.length > 0;
  const showFraction = fracNum !== null && fracDen !== null;
  const showRoundFraction = roundFracNum !== null && roundFracDen !== null;
  /** Il valore è razionale (decimale finito/periodico)? Se no, niente frazione generatrice */
  const valueIsRational = value !== null && isRationalCheck(value);
  /** Se il valore è un intero esatto, mostriamo solo il badge intero senza decimali */
  const valueIsInteger = value !== null && Math.abs(value - Math.round(value)) < 1e-9;

  // Frazione semplificata (solo se riducibile)
  const simplificationGcd = showFraction && fracDen && fracDen > 1 ? gcd(fracNum!, fracDen!) : 1;
  const isSimplifiable = simplificationGcd > 1;
  const simplifiedFracLatex = isSimplifiable
    ? `${fracNeg ? '-' : ''}\\frac{${fracNum! / simplificationGcd}}{${fracDen! / simplificationGcd}}`
    : null;

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {/* Label (sopra il canvas) */}
      <span className={cn(
        "text-sm sm:text-base tracking-widest font-normal",
        colorClass,
      )}>
        {label}
      </span>

      {/* Canvas a tutta larghezza */}
      <div className="w-full h-[170px] sm:h-[200px] rounded-xl border-2 border-border bg-card shadow-sm overflow-hidden">
        <MathDrawCanvas
          strokes={strokes}
          onStrokesChange={handleStrokesChange}
          tool={eraserMode ? "erase" : "write"}
          className="border-0 rounded-none shadow-none ring-0"
          disabled={isLoading || isRecognizing}
          hideWatermark
        />
      </div>

      {/* Barra dei pulsanti */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {/* Riconosci */}
        <button
          onClick={handleManualRecognize}
          disabled={!hasContent || !isModelReady || isRecognizing}
          className="h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-base font-bold tracking-widest transition-all shadow-sm"
        >
          {isRecognizing ? "..." : "RICONOSCI"}
        </button>

        {/* GOMMA — sempre visibile in modalità gomma anche dopo aver cancellato tutto */}
        {(hasContent || eraserMode) && (
          <button
            onClick={() => setEraserMode(!eraserMode)}
            className={`h-11 px-4 rounded-xl font-bold text-sm sm:text-base tracking-widest transition-all shadow-sm ${
              eraserMode
                ? "bg-destructive text-destructive-foreground"
                : "bg-secondary hover:bg-secondary/80 text-foreground"
            }`}
            title={eraserMode ? "Gomma attiva — clicca per uscire" : "Attiva la gomma per cancellare"}
          >
            {eraserMode ? "✕ ESCI GOMMA" : "GOMMA"}
          </button>
        )}

        {/* CANCELLA */}
        {hasContent && (
          <button
            onClick={() => { handleClear(); setEraserMode(false); }}
            className="h-11 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-sm sm:text-base tracking-widest transition-all shadow-sm"
          >
            CANCELLA
          </button>
        )}
      </div>

      {/* Display del valore riconosciuto */}
      <div className="flex flex-wrap items-center justify-center gap-3 min-h-[40px]">
        {isPlainDecimalInput ? (
          /* ── Input decimale puro (nessun \frac né \sqrt): mostra SOLO il decimale ── */
          decimalStr && (
            <span className="inline-block px-3 py-1 rounded-xl bg-blue-50 text-blue-800 font-mono text-base sm:text-lg font-bold">
              {hasPlusMinusSign && !valueIsInteger ? `± ${decimalStr}` : decimalStr}
            </span>
          )
        ) : (
          /* ── Input con frazione o radicale: mostra tutte le forme pertinenti ── */
          <>
            {/* 1. FORMA ESATTA */}
            {radicalLatex ? (
              <span
                className="inline-flex items-center px-4 py-1.5 rounded-xl bg-amber-100 text-amber-900 text-lg sm:text-xl font-bold [&_.katex]:text-amber-900 [&_.katex-display]:!m-0 [&_.katex-display]:!inline"
                dangerouslySetInnerHTML={{ __html: renderKatex(radicalLatex) }}
              />
            ) : showFraction ? (
              fracDen === 1 ? (
                <span className="inline-block px-4 py-1.5 rounded-xl bg-secondary text-lg sm:text-xl font-bold">
                  {fracNeg ? `−${fracNum}` : fracNum}
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-secondary text-lg sm:text-xl font-bold">
                    {fracNeg && <span className="mr-0.5">−</span>}
                    <FractionDisplay numerator={fracNum!} denominator={fracDen!} size="md" />
                  </span>
                  {/* Se la frazione si semplifica a intero, mostra il valore semplificato */}
                  {valueIsInteger && decimalStr && (
                    <>
                      <span className="text-muted-foreground text-lg">→</span>
                      <span className="inline-block px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-mono text-base sm:text-lg font-bold">
                        {fracNeg ? `−${decimalStr}` : decimalStr}
                      </span>
                    </>
                  )}
                </>
              )
            ) : recognizedText ? (
              <span className="inline-block px-4 py-1.5 rounded-xl bg-secondary text-base sm:text-lg font-bold">
                {recognizedText}
              </span>
            ) : null}

            {/* 2. DECIMALE */}
            {decimalStr && !valueIsInteger && (
              <>
                <span className="text-muted-foreground text-lg">→</span>
                <span className="inline-block px-3 py-1 rounded-xl bg-blue-50 text-blue-800 font-mono text-base sm:text-lg font-bold">
                  {decimalStr}
                </span>
              </>
            )}

            {/* 3. FRAZIONE SEMPLIFICATA (solo se la frazione è riducibile) */}
            {showFraction && fracDen && fracDen > 1 && isSimplifiable && simplifiedFracLatex && !valueIsInteger && (
              <>
                <span className="text-muted-foreground text-lg">→</span>
                <span
                  className="inline-flex items-center px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-lg sm:text-xl font-bold [&_.katex]:text-emerald-800 [&_.katex-display]:!m-0 [&_.katex-display]:!inline"
                  dangerouslySetInnerHTML={{ __html: renderKatex(simplifiedFracLatex) }}
                />
              </>
            )}


          </>
        )}
      </div>

      {/* ── Correzione manuale via tastiera ── */}
      {isEditing ? (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <input
            ref={editInputRef}
            type="text"
            value={editLatex}
            onChange={(e) => setEditLatex(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleEditSubmit(); if (e.key === 'Escape') { setIsEditing(false); setEditLatex(''); } }}
            placeholder="es. 8/8 o \frac{8}{8}"
            className="h-9 px-3 rounded-lg border-2 border-primary bg-background text-foreground text-sm font-mono w-48 text-center focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleEditSubmit}
            className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-colors"
          >
            OK
          </button>
          <button
            onClick={() => { setIsEditing(false); setEditLatex(''); }}
            className="h-9 w-9 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-sm font-bold transition-colors flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setIsEditing(true); setEditLatex(recognizedText && recognizedText !== '?' && !recognizedText.startsWith('Non riconosco') ? recognizedText : ''); }}
          className="text-muted-foreground hover:text-primary transition-colors text-xs tracking-wide"
          title="Inserisci manualmente il valore"
        >
          ✎ digita il valore
        </button>
      )}

      {/* Caricamento AI */}
      {isLoading && (
        <span className="text-base text-muted-foreground text-center">
          CARICAMENTO MODELLO AI...
        </span>
      )}
    </div>
  );
}

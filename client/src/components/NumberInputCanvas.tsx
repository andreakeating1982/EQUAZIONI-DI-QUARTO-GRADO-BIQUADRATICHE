import { useCallback, useState } from "react";
import { MathDrawCanvas, type Stroke } from "@/components/MathDrawCanvas";
import { FractionDisplay } from "@/components/FractionDisplay";
import { useMathRecognition } from "@/hooks/useMathRecognition";
import { cn } from "@/lib/utils";

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
function toDecimalString(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const str = rounded.toFixed(2);
  return str.replace(".", ",");
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
  let s = latex.trim().replace(/\s+/g, '');
  if (!s) return null;

  // ── 1. Leading minus ───────────────────────────────────────────
  if (s.startsWith('-')) {
    const inner = evaluateLatex(s.slice(1));
    return inner !== null ? -inner : null;
  }

  // ── 2. Outermost \frac{num}{den} ──────────────────────────────
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

  // ── 4. Inline division a/b (only at top level, NOT inside braces) ─
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

  // ── 5. sqrt(…) — plain text format ──────────────────────────────
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

  // ── 6. Plain number ────────────────────────────────────────────
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

  // Match \frac{num}{den}
  const fracMatch = s.match(/\\frac\{([^{}]+)\}\{([^{}]+)\}/);
  if (!fracMatch) return null;

  const numStr = fracMatch[1].replace(/[{}]/g, "").trim();
  const denStr = fracMatch[2].replace(/[{}]/g, "").trim();

  // Check for negative sign
  let isNegative = false;
  let numClean = numStr;
  let denClean = denStr;
  if (numClean.startsWith("-")) { isNegative = true; numClean = numClean.slice(1); }
  if (!isNegative && denClean.startsWith("-")) { isNegative = true; denClean = denClean.slice(1); }

  const num = parseFloat(numClean);
  const den = parseFloat(denClean);
  if (isNaN(num) || isNaN(den) || den === 0) return null;

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
  const [radicalForm, setRadicalForm] = useState<string | null>(null);

  const { recognize, isModelReady, isLoading } = useMathRecognition();

  const handleStrokesChange = useCallback(
    (newStrokes: Stroke[]) => {
      setStrokes(newStrokes);
      if (newStrokes.length === 0) {
        setRecognizedText("");
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
      // ── 1. Valuta l'espressione LaTeX completa (supporta √, \frac, /) ──
      const evaluated = evaluateLatex(result.latex);

      if (evaluated !== null && isFinite(evaluated)) {
        // Controlla se c'è una frazione LaTeX pura (per il display preferito)
        const frac = extractFractionFromLatex(result.latex);
        if (frac && !result.latex.includes('\\sqrt')) {
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

        // Forma radicale (se presente nel LaTeX originale)
        const rad = extractRadicalForm(result.latex);
        setRadicalForm(rad);

        setRecognizedText("");
        onChange(evaluated);
        setTimeout(() => setStrokes([]), 1400);
        setIsRecognizing(false);
        return;
      }

      // ── 2. Fallback: plain number parsing (come prima) ──
      let numStr = result.latex.replace(/\s+/g, "");
      numStr = numStr.replace(/,/g, ".");

      // Convert \frac{num}{den} → num/den
      numStr = numStr.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2");

      // Strip remaining LaTeX commands and braces
      numStr = numStr
        .replace(/\\mathrm\{([^{}]*)\}/g, "$1")
        .replace(/\\[a-zA-Z]+(\{[^{}]*\})?/g, "")
        .replace(/[{}]/g, "");

      // Clean to digits, dot, minus, slash
      if (allowNegative) {
        numStr = numStr.replace(/[^0-9.\-\/]/g, "");
        const minusCount = (numStr.match(/-/g) || []).length;
        if (minusCount > 1) {
          numStr = "-" + numStr.replace(/-/g, "");
        }
      } else {
        numStr = numStr.replace(/[^0-9.\/]/g, "");
      }

      if (!numStr || numStr === "-" || numStr === ".") {
        setRecognizedText("?");
        resetFraction();
        setIsRecognizing(false);
        return;
      }

      let parsed: number;
      if (numStr.includes("/")) {
        const parts = numStr.split("/");
        if (parts.length === 2) {
          const n = parseFloat(parts[0]);
          const d = parseFloat(parts[1]);
          if (!isNaN(n) && !isNaN(d) && d !== 0) {
            parsed = n / d;
          } else {
            parsed = NaN;
          }
        } else {
          parsed = NaN;
        }
      } else {
        parsed = parseFloat(numStr);
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
        setRadicalForm(null);
        setRecognizedText("");
        onChange(parsed);
        setTimeout(() => setStrokes([]), 1400);
      } else {
        resetFraction();
        setRecognizedText(numStr || "?");
      }
    }
    setIsRecognizing(false);
  }, [strokes, recognize, isModelReady, onChange, allowNegative]);

  const resetFraction = useCallback(() => {
    setFracNum(null);
    setFracDen(null);
    setFracNeg(false);
    setDecimalStr(null);
    setRadicalForm(null);
  }, []);

  const handleClear = () => {
    setStrokes([]);
    setRecognizedText("");
    resetFraction();
    onChange(null);
  };

  const hasContent = strokes.length > 0;
  const showFraction = fracNum !== null && fracDen !== null;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Canvas quadratino */}
      <div className="flex-shrink-0 w-[120px] sm:w-[135px] h-[75px] sm:h-[85px] rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <MathDrawCanvas
          strokes={strokes}
          onStrokesChange={handleStrokesChange}
          tool="write"
          className="border-0 rounded-none shadow-none ring-0"
          disabled={isLoading || isRecognizing}
          hideWatermark
        />
      </div>

      {/* Colonna destra */}
      <div className="flex flex-col items-center gap-1.5 flex-1">
        {/* Label */}
        <span className={cn(
          "text-base tracking-widest text-amber-900",
          colorClass,
        )}>
          {label}
        </span>

        {/* Riconosci */}
        <button
          onClick={handleManualRecognize}
          disabled={!hasContent || !isModelReady || isRecognizing}
          className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-base font-bold tracking-widest transition-all shadow-sm"
        >
          {isRecognizing ? "..." : "RICONOSCI"}
        </button>

        {/* Display del valore riconosciuto */}
        <div className="flex flex-wrap items-center gap-2 min-h-[32px]">
          {/* Risultato INTERO: solo il numero */}
          {showFraction && fracDen === 1 && (
            <span className="inline-block px-2.5 py-1 rounded-lg bg-secondary text-base font-bold">
              {fracNeg ? `−${fracNum}` : fracNum}
            </span>
          )}

          {/* Risultato FRAZIONARIO senza radice: frazione + decimale */}
          {showFraction && fracDen !== 1 && !radicalForm && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-base font-bold">
              {fracNeg && <span className="mr-0.5">−</span>}
              <FractionDisplay
                numerator={fracNum!}
                denominator={fracDen!}
                size="sm"
              />
              {decimalStr && (
                <>
                  <span className="mx-0.5 opacity-60">→</span>
                  <span className="font-mono">{decimalStr}</span>
                </>
              )}
            </span>
          )}

          {/* Risultato con RADICE: frazione + radicale, NO decimale */}
          {showFraction && fracDen !== 1 && radicalForm && (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-base font-bold">
                {fracNeg && <span className="mr-0.5">−</span>}
                <FractionDisplay
                  numerator={fracNum!}
                  denominator={fracDen!}
                  size="sm"
                />
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-base font-bold font-mono">
                {radicalForm}
              </span>
            </>
          )}

          {/* Text fallback */}
          {!showFraction && recognizedText && (
            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-secondary text-base font-bold">
              {recognizedText}
            </span>
          )}

          {/* CANCELLA */}
          {hasContent && (
            <button
              onClick={handleClear}
              className="text-base text-muted-foreground hover:text-destructive transition-colors font-bold tracking-widest"
            >
              CANCELLA
            </button>
          )}
        </div>

        {/* Caricamento AI */}
        {isLoading && (
          <span className="text-base text-muted-foreground">
            CARICAMENTO...
          </span>
        )}
      </div>
    </div>
  );
}

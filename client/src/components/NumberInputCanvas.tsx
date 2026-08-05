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
      // ── Attempt fraction extraction directly from LaTeX ──
      const frac = extractFractionFromLatex(result.latex);
      if (frac) {
        const numericValue = frac.isNegative
          ? -(frac.numerator / frac.denominator)
          : frac.numerator / frac.denominator;

        setFracNum(frac.numerator);
        setFracDen(frac.denominator);
        setFracNeg(frac.isNegative);
        setDecimalStr(toDecimalString(numericValue));
        setRecognizedText("");
        onChange(numericValue);
        setTimeout(() => setStrokes([]), 1400);
        setIsRecognizing(false);
        return;
      }

      // ── Fallback: plain number parsing ──
      let numStr = result.latex.replace(/\s+/g, "");
      numStr = numStr.replace(/,/g, ".");

      // Convert \frac{num}{den} → num/den  (belt-and-suspenders)
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
        setDecimalStr(null);
        setIsRecognizing(false);
        return;
      }

      // Parse: detect fraction pattern "num/den"
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
        // Compute fraction parts from the numeric value
        const fp = numberToFractionParts(parsed);
        if (fp) {
          setFracNum(Math.abs(fp.num));
          setFracDen(fp.den);
          setFracNeg(parsed < 0);
        } else {
          resetFraction();
        }
        setDecimalStr(toDecimalString(parsed));
        setRecognizedText("");
        onChange(parsed);
        setTimeout(() => setStrokes([]), 1400);
      } else {
        resetFraction();
        setDecimalStr(null);
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

        {/* Display del valore riconosciuto — frazione + decimale */}
        <div className="flex items-center gap-2 min-h-[32px]">
          {/* Fraction + decimal display */}
          {showFraction && decimalStr && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-secondary text-base font-bold">
              {fracNeg && <span className="mr-0.5">−</span>}
              <FractionDisplay
                numerator={fracNum!}
                denominator={fracDen!}
                size="sm"
              />
              <span className="mx-0.5 opacity-60">→</span>
              <span>{decimalStr}</span>
            </span>
          )}

          {/* Text fallback (when no fraction/decimal computed) */}
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

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { NumberInputCanvas } from "@/components/NumberInputCanvas";
import { FractionDisplay } from "@/components/FractionDisplay";
import { MathDrawCanvas, type Stroke } from "@/components/MathDrawCanvas";
import { useMathRecognition } from "@/hooks/useMathRecognition";
import { cn } from "@/lib/utils";
import katex from "katex";

// ─── Math utilities ───────────────────────────────────────────────
function gcd(a: number, b: number): number {
  if (b === 0) return a;
  return gcd(b, a % b);
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

function semplificaFrazione(num: number, den: number): { num: number; den: number } {
  if (den === 0) return { num, den: 0 };
  if (num === 0) return { num: 0, den: 1 };
  const c = gcd(Math.abs(num), Math.abs(den));
  let sn = round2(num / c);
  let sd = round2(den / c);
  if (sd < 0) { sn = -sn; sd = -sd; }
  return { num: sn, den: sd };
}

// Converte un numero in apice Unicode (es. 2 → ², 12 → ¹²)
function toSuperscript(n: number): string {
  const superscriptMap: Record<string, string> = {
    "0": "\u2070", "1": "\u00B9", "2": "\u00B2", "3": "\u00B3",
    "4": "\u2074", "5": "\u2075", "6": "\u2076", "7": "\u2077",
    "8": "\u2078", "9": "\u2079",
  };
  return String(n).split("").map(c => superscriptMap[c] || c).join("");
}

const CALCULATION_PRECISION = 9;
const DISPLAY_PRECISION = 2;
const EPSILON = 1e-9;

function roundToPrecision(num: number, precision: number): number {
  if (isNaN(num)) return NaN;
  const factor = Math.pow(10, precision);
  return Math.round(num * factor) / factor;
}

function areNumbersApproximatelyEqual(num1: number, num2: number, epsilon = EPSILON): boolean {
  if (isNaN(num1) || isNaN(num2)) return false;
  return Math.abs(num1 - num2) < epsilon;
}

/** Convert a number to its LaTeX representation (fraction or decimal, max 2 digits) */
function numberToLatex(value: number): string {
  if (isNaN(value)) return "?";
  if (areNumbersApproximatelyEqual(value, 0, 1e-10)) return "0";
  const f = formatFraction(value);
  if (f.includes("/")) {
    const parts = f.replace(/^-/, "").split("/");
    const sign = f.startsWith("-") ? "-" : "";
    return `${sign}\\frac{${parts[0]}}{${parts[1]}}`;
  }
  return f;
}

/** Format a positive number (no sign) for LaTeX inline use */
function numberToLatexAbs(value: number): string {
  if (isNaN(value)) return "?";
  const v = Math.abs(value);
  if (areNumbersApproximatelyEqual(v, 0, 1e-10)) return "0";
  const f = formatFraction(v);
  if (f.includes("/")) {
    const parts = f.split("/");
    return `\\frac{${parts[0]}}{${parts[1]}}`;
  }
  return f;
}

/** Quick KaTeX render for inline display-mode formulas */
function renderKatex(latex: string): string {
  try {
    return katex.renderToString(latex, { displayMode: true, throwOnError: false, strict: false });
  } catch { return latex; }
}

function formatFraction(value: number): string {
  if (isNaN(value)) return "?";
  if (areNumbersApproximatelyEqual(value, 0, 1e-10)) return "0";

  const roundedValue = roundToPrecision(value, DISPLAY_PRECISION);
  let sign = roundedValue < 0 ? "-" : "";
  let absValue = Math.abs(roundedValue);

  for (let denominator = 1; denominator <= 1000; denominator++) {
    let numerator = Math.round(absValue * denominator);
    if (Math.abs(absValue - numerator / denominator) < 1.0E-6) {
      const commonDivisor = gcd(numerator, denominator);
      const finalNumerator = numerator / commonDivisor;
      const finalDenominator = denominator / commonDivisor;
      if (finalDenominator === 1) {
        return `${sign}${finalNumerator}`;
      } else {
        return `${sign}${finalNumerator}/${finalDenominator}`;
      }
    }
  }
  return `${sign}${absValue.toFixed(DISPLAY_PRECISION)}`;
}

function formatFractionDecimal(value: number): string {
  if (isNaN(value)) return "?";
  return roundToPrecision(value, DISPLAY_PRECISION).toString();
}

// ─── LaTeX parser for biquadratic expressions ────────────────────

interface ParsedCoefficient { num: number; den: number; }

interface ParsedBiquadratic {
  a: ParsedCoefficient;
  b: ParsedCoefficient;
  c: ParsedCoefficient;
  rawLatex: string;
}

function decimalToFraction(value: number, maxDen: number = 10000): ParsedCoefficient {
  if (isNaN(value)) return { num: 0, den: 1 };
  if (value === 0) return { num: 0, den: 1 };
  const sign = value < 0 ? -1 : 1;
  const absV = Math.abs(value);
  // Try to find exact fraction
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(absV * d);
    if (Math.abs(absV - n / d) < 1e-9) {
      return { num: sign * n, den: d };
    }
  }
  // Fallback: use large denominator
  const d = 1000000;
  const n = Math.round(absV * d);
  const c = gcd(n, d);
  return { num: sign * (n / c), den: d / c };
}

function parseBiquadraticLaTeX(latex: string): ParsedBiquadratic | null {
  try {
    // Normalize
    let s = latex
      .replace(/\\displaystyle/g, '')
      .replace(/\\,/g, '.')
      .replace(/\s+/g, '')
      .replace(/=0$/, '')
      .trim();

    if (!s || s === '0') return null;

    // Ensure starts with sign
    if (!s.startsWith('-') && !s.startsWith('+')) s = '+' + s;

    // Replace \frac{num}{den} with [FRAC:num/den]
    const fracs: { num: number; den: number }[] = [];
    s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_, num, den) => {
      const n = parseFloat(num.replace(/,/g, '.'));
      const d = parseFloat(den.replace(/,/g, '.'));
      if (isNaN(n) || isNaN(d) || d === 0) return _;
      fracs.push({ num: n, den: d });
      return `[FRAC:${fracs.length - 1}]`;
    });

    // Also replace inline fractions like "3/4" that appear as coefficients
    // E.g. "3/4x^{4}" → "[FRAC:N]x^{4}"
    s = s.replace(/(\d+)\/(\d+)/g, (_, num, den) => {
      const n = parseInt(num, 10);
      const d = parseInt(den, 10);
      if (isNaN(n) || isNaN(d) || d === 0) return _;
      fracs.push({ num: n, den: d });
      return `[FRAC:${fracs.length - 1}]`;
    });

    // Split into terms (keep signs)
    const termParts = s.split(/(?=[+-])/).filter(t => t.length > 0);

    let aNum = 0, aDen = 1;
    let bNum = 0, bDen = 1;
    let cNum = 0, cDen = 1;
    let foundX4 = false, foundX2 = false, foundConst = false;

    for (const term of termParts) {
      const sign = term.startsWith('-') ? -1 : 1;
      let content = term.replace(/^[+-]/, '');

      if (!content || content === '0') continue;

      // Determine power: x⁴/x^4/x^{4}, x²/x^2/x^{2}, or constant
      let power = 0;
      let coeffStr = content;

      if (content.includes('x^{4}') || content.includes('x^4') || content.includes('x⁴')) {
        power = 4;
        coeffStr = content
          .replace(/x\^\{4\}/g, '')
          .replace(/x\^4/g, '')
          .replace(/x⁴/g, '');
      } else if (content.includes('x^{2}') || content.includes('x^2') || content.includes('x²')) {
        power = 2;
        coeffStr = content
          .replace(/x\^\{2\}/g, '')
          .replace(/x\^2/g, '')
          .replace(/x²/g, '');
      }

      // Parse coefficient
      let num: number, den: number;
      coeffStr = coeffStr.trim();

      if (coeffStr === '' || coeffStr === '+') {
        num = 1; den = 1;
      } else if (coeffStr === '-') {
        num = -1; den = 1;
      } else {
        const fracMatch = coeffStr.match(/\[FRAC:(\d+)\]/);
        if (fracMatch) {
          const f = fracs[parseInt(fracMatch[1])];
          num = f.num; den = f.den;
        } else {
          // Parse as decimal
          coeffStr = coeffStr.replace(/,/g, '.');
          const val = parseFloat(coeffStr);
          if (isNaN(val)) continue;
          const frac = decimalToFraction(val);
          num = frac.num; den = frac.den;
        }
      }

      // Apply sign
      num = sign * num;

      // Place coefficient in the right slot
      if (power === 4) {
        if (foundX4) return null; // duplicate
        aNum = num; aDen = den;
        foundX4 = true;
      } else if (power === 2) {
        if (foundX2) return null; // duplicate
        bNum = num; bDen = den;
        foundX2 = true;
      } else {
        if (foundConst) return null; // duplicate
        cNum = num; cDen = den;
        foundConst = true;
      }
    }

    // At least one coefficient must be non-zero
    if (!foundX4 && !foundX2 && !foundConst) return null;

    return { a: { num: aNum, den: aDen }, b: { num: bNum, den: bDen }, c: { num: cNum, den: cDen }, rawLatex: latex };
  } catch {
    return null;
  }
}

// ─── Type definitions ────────────────────────────────────────────

interface BiquadraticComputed {
  a: number; b: number; c: number;
  aNum: number; aDen: number;
  bNum: number; bDen: number;
  cNum: number; cDen: number;
  delta: number;
  t1: number | null;
  t2: number | null;
  xValues: number[];
  positiveRoots: number[];
  hasRealSolutions: boolean;
  hasOneDoubleSolution: boolean;
  solutionType: string;
  nda: number; ndb: number; ndc: number;
}

// ─── Main component ───────────────────────────────────────────────

export default function BiquadraticExercises() {
  // ─── Auto-resize postMessage for embed ──────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sendHeight = () => {
      const height = document.body.scrollHeight;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'labvisivo:height', height }, '*');
      }
    };
    sendHeight();
    const observer = new ResizeObserver(() => sendHeight());
    observer.observe(document.body);
    const mutationObserver = new MutationObserver(() => sendHeight());
    mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  // ─── PDF generation ─────────────────────────────────────────────
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // ─── Expression input (NEW: single canvas for full expression) ──
  const { recognize, isModelReady, isLoading: modelLoading } = useMathRecognition();
  const [exprStrokes, setExprStrokes] = useState<Stroke[]>([]);
  const [recognizedLatex, setRecognizedLatex] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);

  // Parsed coefficients extracted from the full expression
  const parsedEq = useMemo((): ParsedBiquadratic | null => {
    if (!recognizedLatex) return null;
    try {
      const result = parseBiquadraticLaTeX(recognizedLatex);
      if (!result) { setParseError("Impossibile interpretare l'espressione. Riprova."); return null; }
      setParseError(null);
      return result;
    } catch {
      setParseError("Errore nel parsing. Riprova.");
      return null;
    }
  }, [recognizedLatex]);

  // ─── Coefficient inputs (extracted from parsed expression) ──────
  const [aNum, setANum] = useState<number | null>(null);
  const [aDen, setADen] = useState<number | null>(null);
  const [bNum, setBNum] = useState<number | null>(null);
  const [bDen, setBDen] = useState<number | null>(null);
  const [cNum, setCNum] = useState<number | null>(null);
  const [cDen, setCDen] = useState<number | null>(null);

  // ─── Phase tracking ─────────────────────────────────────────────
  const [phase, setPhase] = useState<"input" | "exercise">("input");
  const [submitted, setSubmitted] = useState(false);

  // ─── Exercise state ─────────────────────────────────────────────
  const [deltaUtente, setDeltaUtente] = useState<number | null>(null);
  const [t1Utente, setT1Utente] = useState<number | null>(null);
  const [t2Utente, setT2Utente] = useState<number | null>(null);
  const [x1Utente, setX1Utente] = useState<number | null>(null);
  const [x2Utente, setX2Utente] = useState<number | null>(null);
  const [feedbackFinale, setFeedbackFinale] = useState<{ testo: string; corretto: boolean } | null>(null);
  const [showStep4Guide, setShowStep4Guide] = useState(false);
  const [showStep5Guide, setShowStep5Guide] = useState(false);
  const [showStep6Guide, setShowStep6Guide] = useState(false);

  // ─── Reset exercise ─────────────────────────────────────────────
  const resetExercise = useCallback(() => {
    setDeltaUtente(null);
    setT1Utente(null);
    setT2Utente(null);
    setX1Utente(null);
    setX2Utente(null);
    setFeedbackFinale(null);
    setShowStep4Guide(false);
    setShowStep5Guide(false);
    setShowStep6Guide(false);
  }, []);

  // ─── Derived calculations ───────────────────────────────────────
  const computed = useMemo((): BiquadraticComputed | null => {
    if (aNum === null || bNum === null || cNum === null) return null;

    const da = aDen ?? 1;
    const db = bDen ?? 1;
    const dc = cDen ?? 1;
    if (da < 1 || db < 1 || dc < 1) return null;

    const a = aNum / da;
    const b = bNum / db;
    const c = cNum / dc;

    // Compute delta
    const delta = (b * b) - (4 * a * c);

    let t1: number | null = null;
    let t2: number | null = null;
    let xValues: number[] = [];
    let hasRealSolutions = false;
    let hasOneDoubleSolution = false;
    let solutionType: string = "";

    if (delta >= -EPSILON) {
      const sqrtDelta = Math.sqrt(Math.max(0, delta));
      t1 = (-b + sqrtDelta) / (2 * a);
      t2 = (-b - sqrtDelta) / (2 * a);

      // Extract x values from t values
      const tempXValues: number[] = [];
      const addXValues = (t: number) => {
        if (t >= -EPSILON) {
          const sqrtT = Math.sqrt(Math.max(0, t));
          if (areNumbersApproximatelyEqual(sqrtT, 0)) {
            if (!tempXValues.some(v => areNumbersApproximatelyEqual(v, 0))) {
              tempXValues.push(0);
            }
          } else {
            const pos = roundToPrecision(sqrtT, DISPLAY_PRECISION);
            const neg = roundToPrecision(-sqrtT, DISPLAY_PRECISION);
            if (!tempXValues.some(v => areNumbersApproximatelyEqual(v, pos, 1e-6))) tempXValues.push(pos);
            if (!tempXValues.some(v => areNumbersApproximatelyEqual(v, neg, 1e-6))) tempXValues.push(neg);
          }
        }
      };

      if (t1 !== null) addXValues(t1);
      if (t2 !== null) addXValues(t2);

      xValues = [...new Set(tempXValues.map(v => roundToPrecision(v, DISPLAY_PRECISION)))].sort((a, b) => a - b);
      hasRealSolutions = xValues.length > 0;

      if (areNumbersApproximatelyEqual(delta, 0, EPSILON * 100)) {
        hasOneDoubleSolution = true;
        solutionType = "delta_zero";
      } else {
        solutionType = "delta_positive";
      }
    } else {
      solutionType = "delta_negative";
    }

    // Get unique positive roots for display
    const positiveRoots = [...new Set(
      xValues
        .map(Math.abs)
        .map(v => roundToPrecision(v, DISPLAY_PRECISION))
        .filter(v => v > -EPSILON)
    )].sort((a, b) => a - b);

    return {
      a, b, c,
      aNum: aNum!, aDen: Math.abs(da),
      bNum: bNum!, bDen: Math.abs(db),
      cNum: cNum!, cDen: Math.abs(dc),
      delta,
      t1, t2,
      xValues,
      positiveRoots,
      hasRealSolutions,
      hasOneDoubleSolution,
      solutionType,
      nda: Math.abs(da),
      ndb: Math.abs(db),
      ndc: Math.abs(dc),
    };
  }, [aNum, aDen, bNum, bDen, cNum, cDen]);

  // ─── Handlers ───────────────────────────────────────────────────
  const handleRecognize = useCallback(async () => {
    if (exprStrokes.length === 0 || !isModelReady) return;
    setIsRecognizing(true);
    setParseError(null);
    const result = await recognize(exprStrokes, "expression");
    setIsRecognizing(false);
    if (result && result.latex) {
      setRecognizedLatex(result.latex);
    } else {
      setParseError("Nessuna espressione riconosciuta. Riprova a scrivere.");
    }
  }, [exprStrokes, isModelReady, recognize]);

  const handleConfirmExpression = useCallback(() => {
    if (!parsedEq) return;
    setANum(parsedEq.a.num);
    setADen(parsedEq.a.den);
    setBNum(parsedEq.b.num);
    setBDen(parsedEq.b.den);
    setCNum(parsedEq.c.num);
    setCDen(parsedEq.c.den);
  }, [parsedEq]);

  // Trigger calculate after coefficients are set
  useEffect(() => {
    if (aNum !== null && bNum !== null && cNum !== null && phase === "input") {
      setSubmitted(true);
      setPhase("exercise");
      resetExercise();
    }
  }, [aNum, bNum, cNum]);

  const handleNewExercise = () => {
    setANum(null); setADen(null);
    setBNum(null); setBDen(null);
    setCNum(null); setCDen(null);
    setExprStrokes([]);
    setRecognizedLatex(null);
    setParseError(null);
    setPhase("input");
    setSubmitted(false);
    resetExercise();
  };

  // ─── PDF download ───────────────────────────────────────────────
  const handleScaricaPdf = useCallback(() => {
    setGeneratingPdf(true);
    setTimeout(() => {
      const notebookContents = document.querySelectorAll('.notebook-content');
      if (notebookContents.length === 0) { setGeneratingPdf(false); return; }

      let bodyHtml = '';
      notebookContents.forEach((el) => {
        bodyHtml += `<div style="margin-bottom:48px;text-align:center">${el.innerHTML}</div>`;
      });

      const printHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Quaderno — Equazioni Biquadratiche</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Cambria Math',Cambria,serif;color:#1a1a1a;padding:36px 24px;max-width:800px;margin:0 auto;text-align:center;line-height:2.3}
.text-primary,.text-primary *{color:#92400e!important;font-weight:bold!important}
.text-success{color:#16a34a!important}
.text-destructive,.text-destructive *{color:#dc2626!important}
.text-amber-900,.text-amber-900 *{color:#78350f!important}
.font-bold{font-weight:bold!important}
.font-mono{font-family:'Cambria Math',Cambria,serif!important}
.font-serif{font-family:'Cambria Math',Cambria,serif!important}
.font-semibold{font-weight:600!important}
.bg-muted{background:#f1f5f9!important;padding:8px 14px!important;border-radius:8px!important;display:inline-block!important}
.rounded-lg{border-radius:8px!important}
.flex{display:flex!important;justify-content:center!important}
.inline-flex{display:inline-flex!important}
.items-center{align-items:center!important}
.justify-center{justify-content:center!important}
.flex-col{flex-direction:column!important}
.gap-2{gap:8px!important}.gap-3{gap:12px!important}.gap-4{gap:16px!important}
.border-t{border-top:1px solid #000!important}
.border-black{border-color:#000!important}
.text-center{text-align:center!important}
.block{display:block!important}
.inline-block{display:inline-block!important}
.mt-1{margin-top:8px!important}.mt-2{margin-top:14px!important}.mt-3{margin-top:20px!important}.mt-4{margin-top:24px!important}
.pt-1{padding-top:8px!important}
.px-3{padding-left:12px!important;padding-right:12px!important}
.px-4{padding-left:16px!important;padding-right:16px!important}
.py-1{padding-top:8px!important;padding-bottom:8px!important}
.py-2{padding-top:14px!important;padding-bottom:14px!important}
.my-2{margin-top:14px!important;margin-bottom:14px!important}
.mb-2{margin-bottom:14px!important}.mb-3{margin-bottom:20px!important}
.space-y-1>*+*{margin-top:8px!important}
.space-y-2>*+*{margin-top:16px!important}
.space-y-3>*+*{margin-top:20px!important}
.space-y-4>*+*{margin-top:24px!important}
.leading-loose{line-height:2.5!important}
.text-sm{font-size:14px!important}
.text-base{font-size:16px!important}
.text-lg{font-size:18px!important}
.text-xl{font-size:20px!important}
.text-2xl{font-size:24px!important}
.w-full{width:100%!important}
.h-\\[2px\\]{height:2px!important}
.bg-black{background:#000!important}
.bg-foreground\\/70{background:rgba(0,0,0,.7)!important}
.opacity-80{opacity:.8!important}
@media print{body{padding:10px}@page{margin:1.2cm}}
</style></head>
<body>${bodyHtml}<script>window.onload=function(){window.print()}</script></body></html>`;

      const w = window.open('', '_blank');
      if (w) { w.document.write(printHtml); w.document.close(); }
      setGeneratingPdf(false);
    }, 300);
  }, []);

  // ─── Verification checks ────────────────────────────────────────
  const deltaCorrect = computed && deltaUtente !== null &&
    areNumbersApproximatelyEqual(deltaUtente, computed.delta, EPSILON * 100);

  const t1Correct = computed && computed.t1 !== null && t1Utente !== null &&
    areNumbersApproximatelyEqual(t1Utente, computed.t1, 1e-3);

  const t2Correct = computed && computed.t2 !== null && t2Utente !== null &&
    areNumbersApproximatelyEqual(t2Utente, computed.t2, 1e-3);

  // ─── Render ─────────────────────────────────────────────────────
  const allFilled = aNum !== null && bNum !== null && cNum !== null;

  // ─── KaTeX-safe HTML render helper ─────────────────────────────
  function katexHtml(latex: string, displayMode = true): string {
    try {
      return katex.renderToString(latex, { displayMode, throwOnError: false, strict: false });
    } catch { return latex; }
  }

  // Format a single coefficient as LaTeX (e.g. "\frac{3}{4}" or "2")
  function formatCoefficientLatex(num: number, den: number): string {
    const absNum = Math.abs(num);
    const absDen = Math.abs(den);
    if (absDen === 1) return `${absNum}`;
    return `\\frac{${absNum}}{${absDen}}`;
  }

  // Build equation display as KaTeX LaTeX string
  function buildEquationLatex(): string {
    if (!computed) return "";
    const { aNum: an, aDen: ad, bNum: bn, bDen: bd, cNum: cn, cDen: cd, nda, ndb, ndc } = computed;
    const effA = an / nda;
    const effB = bn / ndb;
    const effC = cn / ndc;

    let result = "";
    let isFirst = true;

    if (!areNumbersApproximatelyEqual(effA, 0, 1e-10)) {
      const sign = effA < 0 ? "-" : (isFirst ? "" : "+");
      const absVal = Math.abs(round2(effA));
      const coeffLatex = absVal === 1 ? "" : formatCoefficientLatex(an, nda);
      result += sign + coeffLatex + "x^{4}";
      isFirst = false;
    }

    if (!areNumbersApproximatelyEqual(effB, 0, 1e-10)) {
      const sign = effB < 0 ? "-" : (isFirst ? "" : "+");
      const absVal = Math.abs(round2(effB));
      const coeffLatex = absVal === 1 ? "" : formatCoefficientLatex(bn, ndb);
      result += sign + coeffLatex + "x^{2}";
      isFirst = false;
    }

    if (!areNumbersApproximatelyEqual(effC, 0, 1e-10)) {
      const sign = effC < 0 ? "-" : (isFirst ? "" : "+");
      result += sign + formatCoefficientLatex(cn, ndc);
    }

    if (result === "") return "0=0";
    // Fix leading "+"
    if (result.startsWith("+")) result = result.slice(1);
    return result + "=0";
  }

  // Build t-equation display as KaTeX LaTeX string
  function buildTEquationLatex(): string {
    if (!computed) return "";
    const { aNum: an, aDen: nda, bNum: bn, bDen: ndb, cNum: cn, cDen: ndc } = computed;
    const effA = an / nda;
    const effB = bn / ndb;
    const effC = cn / ndc;

    let result = "";
    let isFirst = true;

    if (!areNumbersApproximatelyEqual(effA, 0, 1e-10)) {
      const sign = effA < 0 ? "-" : (isFirst ? "" : "+");
      const absVal = Math.abs(round2(effA));
      const coeffLatex = absVal === 1 ? "" : formatCoefficientLatex(an, nda);
      result += sign + coeffLatex + "t^{2}";
      isFirst = false;
    }

    if (!areNumbersApproximatelyEqual(effB, 0, 1e-10)) {
      const sign = effB < 0 ? "-" : (isFirst ? "" : "+");
      const absVal = Math.abs(round2(effB));
      const coeffLatex = absVal === 1 ? "" : formatCoefficientLatex(bn, ndb);
      result += sign + coeffLatex + "t";
      isFirst = false;
    }

    if (!areNumbersApproximatelyEqual(effC, 0, 1e-10)) {
      const sign = effC < 0 ? "-" : (isFirst ? "" : "+");
      result += sign + formatCoefficientLatex(cn, ndc);
    }

    if (result === "") return "0=0";
    if (result.startsWith("+")) result = result.slice(1);
    return result + "=0";
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-background paper-grain flex flex-col">
      {/* Header */}
      <header className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground text-center">
          EQUAZIONI DI QUARTO GRADO<br />TRINOMIE BIQUADRATICHE
        </h1>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-3 sm:px-4 pb-4">
        {/* Formula display */}
        <div className="text-center mb-4">
          <div className="inline-block px-5 py-2 rounded-xl bg-primary/10 border border-primary/25">
            <span className="text-lg font-bold font-mono">± ax⁴ ± bx² ± c = 0</span>
          </div>
        </div>

        {/* Input phase — single expression canvas */}
        {phase === "input" && (
          <div className="space-y-4">
            {/* Suggerimento */}
            <div className="text-center">
              <span className="text-base text-muted-foreground tracking-widest font-semibold">
                SCRIVI L'EQUAZIONE NEL RIQUADRO (ES. 2x⁴−3x²+1=0)
              </span>
            </div>

            {/* Large expression canvas */}
            <div className="rounded-xl border-2 border-primary/30 bg-card overflow-hidden animate-pop-in max-w-md mx-auto w-full shadow-md">
              <div className="px-2 py-2">
                <div className="w-full h-[120px] sm:h-[140px] rounded-lg border border-border overflow-hidden bg-white">
                  <MathDrawCanvas
                    strokes={exprStrokes}
                    onStrokesChange={setExprStrokes}
                    tool="write"
                    hideWatermark
                    className="border-0 rounded-none"
                  />
                </div>
              </div>
              <div className="px-3 pb-3 flex items-center justify-between gap-3">
                <button
                  onClick={handleRecognize}
                  disabled={exprStrokes.length === 0 || !isModelReady || isRecognizing}
                  className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-bold text-base tracking-widest transition-all shadow-sm"
                >
                  {isRecognizing ? "RICONOSCIMENTO..." : modelLoading ? "CARICAMENTO..." : "RICONOSCI"}
                </button>
                <button
                  onClick={() => { setExprStrokes([]); setRecognizedLatex(null); setParseError(null); }}
                  disabled={exprStrokes.length === 0}
                  className="py-3 px-4 rounded-xl bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed text-foreground font-bold text-base tracking-widest transition-all"
                >
                  CANCELLA
                </button>
              </div>
            </div>

            {/* Recognized LaTeX display — rendered with KaTeX */}
            {recognizedLatex && (
              <div className="rounded-xl border border-border bg-card p-4 animate-pop-in max-w-md mx-auto w-full">
                <span className="text-sm font-semibold text-muted-foreground tracking-widest">
                  ESPRESSIONE RICONOSCIUTA:
                </span>
                <div
                  className="mt-2 p-4 rounded-lg bg-muted text-center katex-display overflow-x-auto"
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      try {
                        return katex.renderToString(recognizedLatex, {
                          displayMode: true,
                          throwOnError: false,
                          strict: false,
                        });
                      } catch {
                        return recognizedLatex;
                      }
                    })(),
                  }}
                />
              </div>
            )}

            {/* Parsing error */}
            {parseError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 animate-pop-in max-w-md mx-auto w-full text-center">
                <span className="text-base font-semibold text-destructive">{parseError}</span>
              </div>
            )}

            {/* Confirm button — shown when expression was parsed successfully */}
            {parsedEq && !parseError && (
              <button
                onClick={handleConfirmExpression}
                className="max-w-md mx-auto w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-base tracking-widest transition-all duration-200 shadow-md animate-pop-in"
              >
                ✅ CONFERMA E CALCOLA
              </button>
            )}
          </div>
        )}

        {/* Exercise phase */}
        {phase === "exercise" && submitted && computed && (
          <BiquadraticExercise
            computed={computed}
            deltaUtente={deltaUtente}
            setDeltaUtente={setDeltaUtente}
            t1Utente={t1Utente}
            setT1Utente={setT1Utente}
            t2Utente={t2Utente}
            setT2Utente={setT2Utente}
            x1Utente={x1Utente}
            setX1Utente={setX1Utente}
            x2Utente={x2Utente}
            setX2Utente={setX2Utente}
            feedbackFinale={feedbackFinale}
            setFeedbackFinale={setFeedbackFinale}
            onNew={handleNewExercise}
            generatingPdf={generatingPdf}
            equationDisplay={katexHtml(buildEquationLatex())}
            tEquationDisplay={katexHtml(buildTEquationLatex())}
          />
        )}

        {/* SCARICA PDF button */}
        {phase === "exercise" && (
          <div className="flex justify-center pt-4 pb-2">
            <button
              onClick={handleScaricaPdf}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-bold text-base tracking-widest transition-all shadow-sm"
            >
              📄 SCARICA PDF
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        Realizzato da Andrea Centinaro
      </footer>
    </div>
  );
}

// ─── NOTEBOOK GUIDE COMPONENT ──────────────────────────────────────

function NotebookGuide({
  title,
  defaultOpen = false,
  forceOpen = false,
  visible = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  visible?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!visible) return null;

  const open = forceOpen || isOpen;

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center px-4 py-2.5 hover:bg-primary/10 transition-colors relative"
      >
        <span className="text-base font-bold text-primary text-center">{title}</span>
        <span className={cn(
          "text-primary/60 text-base transition-transform duration-300 absolute right-4",
          open && "rotate-180",
        )}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1">
          <div className="notebook-content rounded-lg bg-card border border-border p-3.5 space-y-2 text-base leading-loose text-foreground text-center">
            <div
              className="relative"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(transparent, transparent 1.55rem, rgba(139,92,62,0.06) 1.55rem, rgba(139,92,62,0.06) 1.6rem)",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BIQUADRATIC EXERCISE SUB-COMPONENT ───────────────────────────

interface BiquadraticExerciseProps {
  computed: BiquadraticComputed;
  deltaUtente: number | null;
  setDeltaUtente: (v: number | null) => void;
  t1Utente: number | null;
  setT1Utente: (v: number | null) => void;
  t2Utente: number | null;
  setT2Utente: (v: number | null) => void;
  x1Utente: number | null;
  setX1Utente: (v: number | null) => void;
  x2Utente: number | null;
  setX2Utente: (v: number | null) => void;
  feedbackFinale: { testo: string; corretto: boolean } | null;
  setFeedbackFinale: (v: { testo: string; corretto: boolean } | null) => void;
  onNew: () => void;
  generatingPdf: boolean;
  equationDisplay: string;
  tEquationDisplay: string;
}

function BiquadraticExercise({
  computed,
  deltaUtente, setDeltaUtente,
  t1Utente, setT1Utente,
  t2Utente, setT2Utente,
  x1Utente, setX1Utente,
  x2Utente, setX2Utente,
  feedbackFinale, setFeedbackFinale,
  onNew, generatingPdf,
  equationDisplay, tEquationDisplay,
}: BiquadraticExerciseProps) {
  return (
    <div className="space-y-5">
      {/* Step 1: Equation inserted */}
      <div className="p-4 rounded-xl bg-card/40 border border-border space-y-4 leading-loose">
        <p className="text-base font-bold text-primary">1. Equazione inserita:</p>
        <div className="flex justify-center">
          <div className="inline-block px-4 py-2 rounded-lg bg-muted font-mono text-base" dangerouslySetInnerHTML={{ __html: equationDisplay }} />
        </div>
        <NotebookGuide title="RICOPIA SUL QUADERNO:" forceOpen={generatingPdf}>
          <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: equationDisplay }} />
        </NotebookGuide>
      </div>

      {/* Step 2: Variable substitution t = x² */}
      <div className="p-4 rounded-xl bg-card/40 border border-border space-y-4 leading-loose">
        <p className="text-base font-bold text-primary">2. Variabile ausiliaria t = x²:</p>
        <div className="flex justify-center">
          <div className="inline-block px-4 py-2 rounded-lg bg-muted font-mono text-base" dangerouslySetInnerHTML={{ __html: tEquationDisplay }} />
        </div>
        <p className="text-base text-center opacity-80">Sostituendo x² = t e x⁴ = t²</p>
        <NotebookGuide title="RICOPIA SUL QUADERNO:" forceOpen={generatingPdf}>
          <p className="font-mono text-base">t = x²</p>
          <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: tEquationDisplay }} />
        </NotebookGuide>
      </div>

      {/* Step 3: Calculate Delta */}
      <div className="p-4 rounded-xl bg-card/40 border border-border space-y-4 leading-loose">
        <p className="text-base font-bold text-primary">3. Calcolo delta Δ:</p>
        <div className="space-y-3">
          <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: renderKatex(`\\Delta = b^{2} - 4ac`) }} />
          <p className="font-mono text-base opacity-80" dangerouslySetInnerHTML={{ __html: renderKatex(`\\Delta = (${numberToLatex(computed.b)})^{2} - 4 \\cdot (${numberToLatex(computed.a)}) \\cdot (${numberToLatex(computed.c)})`) }} />
          {computed.solutionType === "delta_negative" && (
            <p className="text-destructive font-semibold text-base">Δ &lt; 0 → nessuna soluzione reale</p>
          )}
        </div>

        {computed.solutionType !== "delta_negative" && (
          <>
            <NumberInputCanvas
              value={deltaUtente}
              onChange={(v) => { setDeltaUtente(v); }}
              label="Inserisci il tuo Δ:"
              colorClass="text-primary"
            />
            {deltaUtente !== null && (
              <p className={cn(
                "text-base font-bold text-center mt-2",
                areNumbersApproximatelyEqual(deltaUtente, computed.delta, EPSILON * 100) ? "text-success" : "text-destructive",
              )}>
                {areNumbersApproximatelyEqual(deltaUtente, computed.delta, EPSILON * 100)
                  ? "CORRETTO"
                  : "RISULTATO SBAGLIATO. CALCOLA DI NUOVO"}
              </p>
            )}
            <NotebookGuide
              title="RICOPIA SUL QUADERNO:"
              visible={deltaUtente !== null && areNumbersApproximatelyEqual(deltaUtente, computed.delta, EPSILON * 100)}
              forceOpen={generatingPdf}
            >
              <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: renderKatex(`\\Delta = (${numberToLatex(computed.b)})^{2} - 4 \\cdot (${numberToLatex(computed.a)}) \\cdot (${numberToLatex(computed.c)})`) }} />
              <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: renderKatex(`\\Delta = ${numberToLatex(computed.delta)}`) }} />
              {computed.hasOneDoubleSolution
                ? <p className="font-mono text-base">Δ = 0 → due soluzioni reali e coincidenti per t</p>
                : <p className="font-mono text-base">Δ &gt; 0 → due soluzioni reali e distinte per t</p>
              }
            </NotebookGuide>
          </>
        )}
      </div>

      {/* Step 4: Calculate t₁ */}
      {computed.solutionType !== "delta_negative" && computed.t1 !== null && (
        <div className="p-4 rounded-xl bg-card/40 border border-border space-y-4 leading-loose">
          <p className="text-base font-bold text-primary">4. Calcolo t₁:</p>
          <div className="space-y-3">
            <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: renderKatex(`t_{1} = \\frac{-b + \\sqrt{\\Delta}}{2a}`) }} />
            <p className="font-mono text-base opacity-80" dangerouslySetInnerHTML={{ __html: renderKatex(`t_{1} = \\frac{-(${numberToLatexAbs(computed.b)}) + \\sqrt{${numberToLatex(computed.delta)}}}{2 \\cdot (${numberToLatexAbs(computed.a)})}`) }} />
          </div>
          <NumberInputCanvas
            value={t1Utente}
            onChange={(v) => setT1Utente(v)}
            label="Inserisci il tuo t₁:"
            colorClass="text-primary"
            allowNegative
          />
          {t1Utente !== null && (
            <p className={cn(
              "text-base font-bold text-center mt-2",
              areNumbersApproximatelyEqual(t1Utente, computed.t1!, 1e-3) ? "text-success" : "text-destructive",
            )}>
              {areNumbersApproximatelyEqual(t1Utente, computed.t1!, 1e-3)
                ? "CORRETTO"
                : "RISULTATO SBAGLIATO. CALCOLA DI NUOVO"}
            </p>
          )}
          <NotebookGuide
            title="RICOPIA SUL QUADERNO:"
            visible={t1Utente !== null && areNumbersApproximatelyEqual(t1Utente, computed.t1!, 1e-3)}
            forceOpen={generatingPdf}
          >
            <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: renderKatex(`t_{1} = \\frac{-(${numberToLatexAbs(computed.b)}) + \\sqrt{${numberToLatex(computed.delta)}}}{2 \\cdot (${numberToLatexAbs(computed.a)})}`) }} />
            <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: renderKatex(`t_{1} = \\frac{${numberToLatex(-computed.b)} + ${numberToLatexAbs(Math.sqrt(Math.max(0, computed.delta)))}}{${numberToLatexAbs(2 * computed.a)}}`) }} />
            <p className="font-mono text-base font-bold text-primary" dangerouslySetInnerHTML={{ __html: renderKatex(`t_{1} = ${numberToLatex(computed.t1!)}`) }} />
            {computed.t1! >= -EPSILON
              ? <p className="font-mono text-base">t₁ ≥ 0 → si può estrarre la radice quadrata ✓</p>
              : <p className="font-mono text-base text-destructive">t₁ &lt; 0 → impossibile nei reali ✗</p>
            }
          </NotebookGuide>
        </div>
      )}

      {/* Step 5: Calculate t₂ */}
      {computed.solutionType !== "delta_negative" && computed.t2 !== null && (
        <div className="p-4 rounded-xl bg-card/40 border border-border space-y-4 leading-loose">
          <p className="text-base font-bold text-primary">5. Calcolo t₂:</p>
          <div className="space-y-3">
            <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: renderKatex(`t_{2} = \\frac{-b - \\sqrt{\\Delta}}{2a}`) }} />
            <p className="font-mono text-base opacity-80" dangerouslySetInnerHTML={{ __html: renderKatex(`t_{2} = \\frac{-(${numberToLatexAbs(computed.b)}) - \\sqrt{${numberToLatex(computed.delta)}}}{2 \\cdot (${numberToLatexAbs(computed.a)})}`) }} />
          </div>
          <NumberInputCanvas
            value={t2Utente}
            onChange={(v) => setT2Utente(v)}
            label="Inserisci il tuo t₂:"
            colorClass="text-primary"
            allowNegative
          />
          {t2Utente !== null && (
            <p className={cn(
              "text-base font-bold text-center mt-2",
              areNumbersApproximatelyEqual(t2Utente, computed.t2!, 1e-3) ? "text-success" : "text-destructive",
            )}>
              {areNumbersApproximatelyEqual(t2Utente, computed.t2!, 1e-3)
                ? "CORRETTO"
                : "RISULTATO SBAGLIATO. CALCOLA DI NUOVO"}
            </p>
          )}
          <NotebookGuide
            title="RICOPIA SUL QUADERNO:"
            visible={t2Utente !== null && areNumbersApproximatelyEqual(t2Utente, computed.t2!, 1e-3)}
            forceOpen={generatingPdf}
          >
            <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: renderKatex(`t_{2} = \\frac{-(${numberToLatexAbs(computed.b)}) - \\sqrt{${numberToLatex(computed.delta)}}}{2 \\cdot (${numberToLatexAbs(computed.a)})}`) }} />
            <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: renderKatex(`t_{2} = \\frac{${numberToLatex(-computed.b)} - ${numberToLatexAbs(Math.sqrt(Math.max(0, computed.delta)))}}{${numberToLatexAbs(2 * computed.a)}}`) }} />
            <p className="font-mono text-base font-bold text-primary" dangerouslySetInnerHTML={{ __html: renderKatex(`t_{2} = ${numberToLatex(computed.t2!)}`) }} />
            {computed.t2! >= -EPSILON
              ? <p className="font-mono text-base">t₂ ≥ 0 → si può estrarre la radice quadrata ✓</p>
              : <p className="font-mono text-base text-destructive">t₂ &lt; 0 → impossibile nei reali ✗</p>
            }
          </NotebookGuide>
        </div>
      )}

      {/* Step 6: Extract x from t */}
      <div className="p-4 rounded-xl bg-card/40 border border-border space-y-4 leading-loose">
        <p className="text-base font-bold text-primary">6. Calcolo di x₁ e x₂:</p>
        <div className="space-y-2">
          {computed.t1 !== null && computed.t1 >= -EPSILON && (
            <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: renderKatex(`x_{1} = \\pm\\sqrt{t_{1}} = \\pm\\sqrt{${numberToLatex(computed.t1)}}`) }} />
          )}
          {computed.t2 !== null && computed.t2 >= -EPSILON && (
            <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: renderKatex(`x_{2} = \\pm\\sqrt{t_{2}} = \\pm\\sqrt{${numberToLatex(computed.t2)}}`) }} />
          )}
          {!computed.hasRealSolutions && (
            <p className="text-destructive font-semibold text-base">
              NESSUNA SOLUZIONE REALE: t₁ e t₂ sono negativi
            </p>
          )}
          {computed.hasRealSolutions && (
            <div className="text-base space-y-1 mt-3">
              <p className="font-semibold">
                Soluzioni reali:
                {computed.positiveRoots.map((root, i) => (
                  <span key={i} className="font-mono ml-1">
                    {areNumbersApproximatelyEqual(root, 0, 1e-10)
                      ? "0"
                      : `±${formatFractionDecimal(root)}`}
                    {i < computed.positiveRoots.length - 1 ? "," : ""}
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
        <NotebookGuide title="RICOPIA SUL QUADERNO:" forceOpen={generatingPdf}>
          {computed.t1 !== null && computed.t1 >= -EPSILON && (
            <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: renderKatex(`x_{1} = \\pm\\sqrt{${numberToLatex(computed.t1)}} = \\pm${numberToLatexAbs(Math.sqrt(computed.t1))}`) }} />
          )}
          {computed.t2 !== null && computed.t2 >= -EPSILON && (
            <p className="font-mono text-base" dangerouslySetInnerHTML={{ __html: renderKatex(`x_{2} = \\pm\\sqrt{${numberToLatex(computed.t2)}} = \\pm${numberToLatexAbs(Math.sqrt(computed.t2))}`) }} />
          )}
          {computed.hasRealSolutions && (
            <p className="font-mono text-base font-bold text-primary">
              Soluzioni: {computed.positiveRoots.map(r =>
                areNumbersApproximatelyEqual(r, 0, 1e-10)
                  ? "0"
                  : `±${formatFractionDecimal(r)}`
              ).join(", ")}
            </p>
          )}
        </NotebookGuide>
      </div>

      {/* Step 7: Verification */}
      {computed.hasRealSolutions && (
        <div className="p-4 rounded-xl bg-card/40 border border-border space-y-4 leading-loose">
          <p className="text-base font-bold text-primary">7. Verifica del risultato:</p>
          <div className="space-y-3">
            <p className="text-base font-semibold">INSERISCI I VALORI ASSOLUTI DI X:</p>

            <NumberInputCanvas
              value={x1Utente}
              onChange={(v) => setX1Utente(v)}
              label="VALORE ASSOLUTO x₁:"
              colorClass="text-primary"
            />
            <NumberInputCanvas
              value={x2Utente}
              onChange={(v) => setX2Utente(v)}
              label="VALORE ASSOLUTO x₂:"
              colorClass="text-primary"
            />

            {/* Verify button */}
            <button
              onClick={() => {
                if (x1Utente === null && x2Utente === null) return;
                const userAbsVals = [...new Set(
                  [x1Utente, x2Utente]
                    .filter(v => v !== null)
                    .map(v => roundToPrecision(Math.abs(v!), DISPLAY_PRECISION))
                )].sort((a, b) => a - b);

                const correctAbsVals = [...new Set(
                  computed.positiveRoots
                )].sort((a, b) => a - b);

                const match = userAbsVals.length === correctAbsVals.length &&
                  userAbsVals.every((v, i) => areNumbersApproximatelyEqual(v, correctAbsVals[i], 1e-3));

                if (match) {
                  setFeedbackFinale({
                    testo: `Corretto! ✅ Le soluzioni sono: ${computed.positiveRoots.map(r =>
                      areNumbersApproximatelyEqual(r, 0, 1e-10) ? "0" : `±${formatFractionDecimal(r)}`
                    ).join(", ")}`,
                    corretto: true,
                  });
                } else {
                  setFeedbackFinale({
                    testo: `RISULTATO SBAGLIATO. Le soluzioni corrette sono: ${computed.positiveRoots.map(r =>
                      areNumbersApproximatelyEqual(r, 0, 1e-10) ? "0" : `±${formatFractionDecimal(r)}`
                    ).join(", ")}`,
                    corretto: false,
                  });
                }
              }}
              disabled={x1Utente === null && x2Utente === null}
              className="max-w-xs mx-auto w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground font-bold text-base tracking-widest transition-all duration-200 shadow-md"
            >
              VERIFICA IL RISULTATO
            </button>

            {feedbackFinale && (
              <div className={cn(
                "p-3 rounded-lg text-base font-semibold text-center mt-3",
                feedbackFinale.corretto
                  ? "bg-success/10 text-success border border-success/30"
                  : "bg-destructive/10 text-destructive border border-destructive/20",
              )}>
                <span>{feedbackFinale.testo}</span>
              </div>
            )}
          </div>
          <NotebookGuide
            title="RICOPIA SUL QUADERNO:"
            visible={feedbackFinale?.corretto === true}
            forceOpen={feedbackFinale?.corretto === true || generatingPdf}
          >
            <p className="font-mono text-base font-bold text-primary">
              Soluzioni finali: {computed.positiveRoots.map(r =>
                areNumbersApproximatelyEqual(r, 0, 1e-10)
                  ? "0"
                  : `±${formatFractionDecimal(r)}`
              ).join(", ")}
            </p>
          </NotebookGuide>
        </div>
      )}

      {/* Negative delta: no real solutions */}
      {computed.solutionType === "delta_negative" && (
        <div className="p-4 rounded-xl bg-card/40 border border-destructive/30 space-y-3 leading-loose">
          <p className="text-base font-bold text-destructive">
            Δ &lt; 0: NESSUNA SOLUZIONE REALE
          </p>
          <p className="text-base opacity-80">
            Il delta è negativo, quindi l&apos;equazione non ha soluzioni nell&apos;insieme dei numeri reali.
          </p>
        </div>
      )}

      {/* New exercise */}
      <button
        onClick={onNew}
        className="max-w-xs mx-auto w-full py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-base font-bold tracking-widest transition-all duration-200"
      >
        NUOVO ESERCIZIO
      </button>
    </div>
  );
}

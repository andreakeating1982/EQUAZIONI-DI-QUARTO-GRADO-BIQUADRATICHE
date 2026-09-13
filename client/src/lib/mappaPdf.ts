/**
 * MAPPA CONCETTUALE — PDF dinamico per l'app Equazioni Biquadratiche.
 *
 * Genera un documento di stampa (stesso flusso di handleScaricaPdf:
 * window.open + document.write + print) con la mappa concettuale
 * rielaborata OGNI VOLA sull'equazione effettiva inserita dallo studente
 * nella seconda pagina (coefficienti a, b, c, Δ, t₁, t₂ e radici).
 *
 * Struttura (come nella mappa allegata di riferimento):
 *  - PARTE A — mappa SVOLTA: box colorati a flusso verticale (passi 1-7)
 *  - PARTE B — mappa DA COMPLETARE ("LIVELLO 3 – Supporto minimo") con
 *    gli stessi passi dell'equazione dello studente ma i valori in bianco.
 *
 * Convenzioni della famiglia (repo MAPPE-CONCETTUALI-MATEMATICHE /
 * Widget Matematico): OpenDyslexic, regole per BES/DSA, interi senza
 * decimali, decimali con virgola, x = ±√t solo se t ≥ 0.
 */
import katex from "katex";

const EPS = 1e-9;

// ─── Tipi pubblici ────────────────────────────────────────────────

export interface MappaRootEntry {
  /** Valore numerico della radice positiva (arrotondato) */
  value: number;
  /** LaTeX della forma radicale (es. "\\sqrt{4}", "\\sqrt{\\,\\dfrac{-5+\\sqrt{7}}{2}\\,}") */
  radicalLatex: string;
  /** Il valore esatto sqrt(t) è razionale? */
  isRational: boolean;
  /** Il valore esatto sqrt(t) è un intero? */
  isInteger: boolean;
}

export interface MappaPdfData {
  /** "Rossi Mario — Classe 3B — 12/05/2025" (già formattata; può essere vuota) */
  studentLabel: string;
  /** Equazione completa in LaTeX (builder dell'app) */
  eqLatex: string;
  /** Equazione in t in LaTeX (builder dell'app) */
  tEqLatex: string;
  a: number; b: number; c: number;
  delta: number;
  /** Δ è un quadrato perfetto (razionale)? → t₁/t₂ esatti, √Δ numerico */
  isDeltaPerfectSquare: boolean;
  /** Δ ≈ 0 → t₁ = t₂ */
  hasDoubleRoot: boolean;
  /** Δ < 0 → nessuna soluzione reale */
  deltaNegative: boolean;
  t1: number | null;
  t2: number | null;
  /** Soluzioni x (ordinate, con segno) */
  xValues: number[];
  hasRealSolutions: boolean;
  rootEntries: MappaRootEntry[];
}

// ─── Formattazione numeri (stesse regole dell'app) ────────────────

function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function gcd(x: number, y: number): number {
  return y === 0 ? Math.abs(x) : gcd(y, x % y);
}

/** Frazione esatta "p/q" se esiste (den ≤ 1000), altrimenti decimale fisso */
function formatFraction(value: number): string {
  if (isNaN(value)) return "?";
  if (Math.abs(value) < EPS) return "0";
  const rounded = roundToPrecision(value, 6);
  const sign = rounded < 0 ? "-" : "";
  const absV = Math.abs(rounded);
  for (let d = 1; d <= 1000; d++) {
    const n = Math.round(absV * d);
    if (Math.abs(absV - n / d) < 1e-6) {
      const g = gcd(n, d);
      const num = n / g;
      const den = d / g;
      return den === 1 ? `${sign}${num}` : `${sign}${num}/${den}`;
    }
  }
  return `${sign}${roundToPrecision(absV, 2).toFixed(2)}`;
}

/** Numero → LaTeX: frazioni \\dfrac, altrimenti testo (interi senza decimali) */
function numberToLatex(value: number): string {
  if (isNaN(value)) return "?";
  if (Math.abs(value) < EPS) return "0";
  const f = formatFraction(value);
  if (f.includes("/")) {
    const parts = f.replace(/^-/, "").split("/");
    const sign = f.startsWith("-") ? "-" : "";
    return `${sign}\\dfrac{${parts[0]}}{${parts[1]}}`;
  }
  return f;
}

function numberToLatexAbs(value: number): string {
  if (isNaN(value)) return "?";
  return numberToLatex(Math.abs(value));
}

/** −b nel numeratore: "-2" per b=2, "+3" per b=−3, "0" per b=0 */
function formatNegatedCoeff(value: number): string {
  if (Math.abs(value) < EPS) return "0";
  const abs = numberToLatexAbs(value);
  return value >= 0 ? `-${abs}` : `+${abs}`;
}

/** Coefficiente tra parentesi solo se negativo o frazione */
function formatCoeffWithParens(value: number): string {
  const latex = numberToLatex(value);
  if (latex.startsWith("-") || latex.includes("frac")) return `(${latex})`;
  return latex;
}

/** Decimale in formato italiano (virgola), interi senza decimali */
function decimalComma(value: number): string {
  const r = roundToPrecision(value, 2);
  if (Number.isInteger(r)) return String(r);
  return r.toFixed(2).replace(".", ",");
}

// ─── KaTeX ────────────────────────────────────────────────────────

function katexBlock(latex: string): string {
  try {
    return katex.renderToString(latex, { displayMode: true, throwOnError: false, strict: false });
  } catch { return latex; }
}

function katexInline(latex: string): string {
  try {
    return katex.renderToString(latex, { displayMode: false, throwOnError: false, strict: false });
  } catch { return latex; }
}

// ─── Formule dinamiche ────────────────────────────────────────────

/** √Δ numerico (se quadrato perfetto) oppure simbolico \\sqrt{Δ} */
function sqrtDeltaLatex(d: MappaPdfData): string {
  if (d.isDeltaPerfectSquare) return numberToLatex(Math.sqrt(Math.max(0, d.delta)));
  return `\\sqrt{${numberToLatex(d.delta)}}`;
}

/** Catena di sostituzione di t₁ (sign "+") o t₂ (sign "-") con i numeri veri */
function tChainLatex(d: MappaPdfData, sign: "+" | "-"): string {
  const den = `2\\cdot ${formatCoeffWithParens(d.a)}`;
  if (d.isDeltaPerfectSquare) {
    const sq = Math.sqrt(Math.max(0, d.delta));
    const num = sign === "+" ? -d.b + sq : -d.b - sq;
    return `\\dfrac{${formatNegatedCoeff(d.b)} ${sign} ${numberToLatex(sq)}}{${den}} = \\dfrac{${numberToLatex(num)}}{${numberToLatex(2 * d.a)}}`;
  }
  const num = sign === "+"
    ? `${formatNegatedCoeff(d.b)}+\\sqrt{${numberToLatex(d.delta)}}`
    : `${formatNegatedCoeff(d.b)}-\\sqrt{${numberToLatex(d.delta)}}`;
  return `\\dfrac{${num}}{${den}}`;
}

/** Valore di t: esatto se Δ è quadrato perfetto, altrimenti approssimato (virgola) */
function tValueLatex(d: MappaPdfData, t: number): string {
  if (d.isDeltaPerfectSquare) return numberToLatex(t);
  return `\\approx ${decimalComma(t)}`;
}

/** Δ = b² − 4·a·c con la catena numerica completa (se coefficienti interi) */
function deltaChainLatex(d: MappaPdfData): string {
  const { a, b, c, delta } = d;
  const allInt = Number.isInteger(a) && Number.isInteger(b) && Number.isInteger(c);
  const gen = `\\Delta = b^{2}-4\\cdot a\\cdot c = ${formatCoeffWithParens(b)}^{2}-4\\cdot ${formatCoeffWithParens(a)}\\cdot ${formatCoeffWithParens(c)}`;
  if (allInt) {
    const q = 4 * a * c;
    const mid = q >= 0 ? `${b * b} - ${q}` : `${b * b} - (-${Math.abs(q)})`;
    return `${gen} = ${mid} = ${numberToLatex(delta)}`;
  }
  return `${gen} = ${numberToLatex(delta)}`;
}

/** Riga del PASSO 6 per una t: "da t₁ = 4 → x = ±√4 = ±2" / salto se negativa */
function rootLineForT(d: MappaPdfData, t: number, label: string): string {
  if (t < -EPS) {
    return `<p class="root-line">■ da <b>${label}</b> = ${katexInline(tValueLatex(d, t))} <span class="skip">→ t è NEGATIVO → salto questa soluzione</span></p>`;
  }
  if (Math.abs(t) < EPS) {
    return `<p class="root-line">■ da <b>${label}</b> = 0 → ${katexInline("x = 0")}</p>`;
  }
  const sq = Math.sqrt(t);
  const entry = d.rootEntries.find((e) => Math.abs(e.value - roundToPrecision(sq, 2)) < 1e-6);
  let line: string;
  if (d.isDeltaPerfectSquare) {
    line = `■ da <b>${label}</b> = ${katexInline(numberToLatex(t))} → ${katexInline(`x = \\pm\\sqrt{${numberToLatex(t)}} = \\pm ${numberToLatex(sq)}`)}`;
  } else if (entry && !entry.isRational) {
    const approx = entry.isRational ? "" : ` ${katexInline(`\\approx \\pm ${decimalComma(sq)}`)}`;
    line = `■ da <b>${label}</b> → ${katexInline(`x = \\pm ${entry.radicalLatex}`)}${approx}`;
  } else {
    line = `■ da <b>${label}</b> → ${katexInline(`x = \\pm ${entry ? numberToLatex(entry.value) : `\\sqrt{${numberToLatex(t)}}`}`)}`;
  }
  return `<p class="root-line">${line}</p>`;
}

/** Elenco soluzioni: radicali esatti per gli irrazionali, "+" davanti ai positivi */
function solutionsLatex(d: MappaPdfData): string {
  return d.xValues
    .map((x) => {
      const entry = d.rootEntries.find((e) => Math.abs(e.value - Math.abs(x)) < 1e-6);
      if (entry && !entry.isRational) {
        return x >= 0 ? `+${entry.radicalLatex}` : `-${entry.radicalLatex}`;
      }
      return x > 0 ? `+${numberToLatex(x)}` : numberToLatex(x);
    })
    .join(",\\; ");
}

// ─── Box della mappa ──────────────────────────────────────────────

const C = {
  title: "#5C35A6",      // viola (titolo, Passo 3, risultato)
  passo1: "#1F65C1",     // blu
  passo2: "#328236",     // verde
  passo3: "#5C35A6",     // viola
  passo4: "#D97706",     // arancio
  passo5: "#A75D2A",     // marrone
  passo6: "#B91C1C",     // rosso
  passo7: "#1E40AF",     // blu scuro
  ricorda: "#1E3A8A",    // blu notte
  formule: "#0E7490",    // celeste scuro
  attenzione: "#DC2626", // rosso attenzione
  controllo: "#16A34A",  // verde controllo
};

function stepBox(title: string, body: string, color: string): string {
  return `<div class="box"><div class="step-title" style="background:${color}">${title}</div><div class="step-body" style="border-color:${color}">${body}</div></div>`;
}

function solidBox(text: string, color: string, extraClass = ""): string {
  return `<div class="solid ${extraClass}" style="background:${color}">${text}</div>`;
}

// ─── PARTE A: mappa svolta (dinamica) ─────────────────────────────

function buildSvolta(d: MappaPdfData): string {
  let html = "";

  // Titolo
  html += solidBox(
    `MAPPA · LE REGOLE PER RISOLVERE UN'EQUAZIONE BIQUADRATICA`,
    C.title,
    "title-box"
  );
  html += `<div class="eq-banner">La mappa è costruita sulla TUA equazione:${katexBlock(d.eqLatex)}</div>`;

  // Definizione
  html += stepBox(
    "CHE COS'È UN'EQUAZIONE BIQUADRATICA?",
    `${katexBlock("a\\cdot x^{4}+b\\cdot x^{2}+c = 0")}
     <p class="note">Ha <b>TRE TERMINI</b> con la x: <b>x⁴</b>, <b>x²</b> e il numero da solo.</p>`,
    C.passo1
  );

  // RICORDA
  html += solidBox(
    `RICORDA: metto <b>t</b> al posto di <b>x²</b> (così x⁴ diventa t²), poi uso le formule di t.`,
    C.ricorda
  );

  // PASSO 1
  html += stepBox(
    "📎 PASSO 1 · RICONOSCO L'EQUAZIONE",
    `<p>Trovo i tre numeri:</p>
     ${katexBlock(`a = ${numberToLatex(d.a)} \\qquad b = ${numberToLatex(d.b)} \\qquad c = ${numberToLatex(d.c)}`)}`,
    C.passo1
  );

  // PASSO 2
  html += stepBox(
    "↔ PASSO 2 · SOSTITUISCO: t = x²",
    `${katexBlock("x^{2} = t \\qquad x^{4} = t^{2}")}
     <p>→ l'equazione diventa:</p>
     ${katexBlock(d.tEqLatex)}`,
    C.passo2
  );

  // PASSO 3
  html += stepBox(
    "Δ PASSO 3 · CALCOLO Δ (DELTA)",
    katexBlock(deltaChainLatex(d)),
    C.passo3
  );

  if (d.deltaNegative) {
    // Δ < 0 → niente passi 4-7: attenzione + risultato
    html += `<div class="attenzione">
      <p class="attenzione-title">⚠ ATTENZIONE!</p>
      ${katexBlock(`\\Delta = ${numberToLatex(d.delta)} \\; < \\; 0`)}
      <p>Δ è <b>NEGATIVO</b> → l'equazione <b>NON ha soluzioni reali</b>.</p>
    </div>`;
  } else {
    const t1 = d.t1;
    const t2 = d.t2;

    // PASSO 4
    if (t1 !== null) {
      let t1Body = katexBlock(`t_{1} = \\dfrac{-b+\\sqrt{\\Delta}}{2\\cdot a} = ${tChainLatex(d, "+")}`);
      t1Body += katexBlock(`t_{1} = ${tValueLatex(d, t1)}`);
      if (d.hasDoubleRoot) t1Body += `<p class="note">(t₁ e t₂ sono uguali perché Δ = 0)</p>`;
      if (t1 < -EPS) t1Body += `<p class="skip">t₁ è NEGATIVO → salto questa soluzione</p>`;
      html += stepBox("＋ PASSO 4 · TROVO t₁", t1Body, C.passo4);
    }

    // PASSO 5
    if (t2 !== null && !(d.hasDoubleRoot)) {
      let t2Body = katexBlock(`t_{2} = \\dfrac{-b-\\sqrt{\\Delta}}{2\\cdot a} = ${tChainLatex(d, "-")}`);
      t2Body += katexBlock(`t_{2} = ${tValueLatex(d, t2)}`);
      if (t2 < -EPS) t2Body += `<p class="skip">t₂ è NEGATIVO → salto questa soluzione</p>`;
      html += stepBox("－ PASSO 5 · TROVO t₂", t2Body, C.passo5);
    }

    // PASSO 6
    const rootLines: string[] = [];
    if (t1 !== null) rootLines.push(rootLineForT(d, t1, "t₁"));
    if (t2 !== null && !d.hasDoubleRoot && Math.abs(t2 - (t1 ?? 0)) > 1e-9) {
      rootLines.push(rootLineForT(d, t2, "t₂"));
    }
    html += stepBox(
      "√ PASSO 6 · TORNO A x",
      rootLines.length > 0 ? rootLines.join("") : `<p>Nessuna t da riportare a x.</p>`,
      C.passo6
    );

    // PASSO 7
    if (d.hasRealSolutions) {
      html += stepBox(
        "✓ PASSO 7 · SCRIVO LE SOLUZIONI",
        `${katexBlock(`x = ${solutionsLatex(d)}`)}
         <p class="note">(conto bene: sono <b>${d.xValues.length}</b>!)</p>`,
        C.passo7
      );
    } else {
      html += stepBox(
        "✓ PASSO 7 · SCRIVO LE SOLUZIONI",
        `<p class="skip">Nessuna t da riportare a x → <b>NESSUNA SOLUZIONE REALE</b></p>`,
        C.passo7
      );
    }
  }

  // Formule di servizio
  html += `<div class="formule">
    <p class="formule-title">RICORDA LE FORMULE</p>
    ${katexBlock("\\Delta = b^{2}-4\\cdot a\\cdot c \\qquad t = \\dfrac{-b \\pm \\sqrt{\\Delta}}{2\\cdot a} \\qquad x = \\pm\\sqrt{t}")}
    <p class="note">(x = ±√t solo se t ≥ 0; se t è negativo salto)</p>
  </div>`;

  // ATTENZIONE (regole, con nota dinamica)
  let attenzioneBody = "";
  if (d.deltaNegative) {
    attenzioneBody = `<p>In questa equazione Δ = ${katexInline(numberToLatex(d.delta))} è negativo → nessuna soluzione reale.</p>`;
  } else if (!d.hasRealSolutions) {
    attenzioneBody = `<p>In questa equazione Δ è positivo ma tutte le t sono negative → nessuna soluzione reale.</p>`;
  }
  html += `<div class="attenzione">
    <p class="attenzione-title">⚠ ATTENZIONE!</p>
    ${attenzioneBody}
    <p>Se <b>t è NEGATIVO</b> → salto quella soluzione. Se <b>Δ è NEGATIVO</b> → nessuna soluzione reale.</p>
    <p>Prima di scrivere le soluzioni guarda sempre il <b>segno</b> di Δ e delle t!</p>
  </div>`;

  // RISULTATO
  html += d.hasRealSolutions
    ? solidBox(`<span class="risultato-label">RISULTATO:</span> ${katexInline(`x = ${solutionsLatex(d)}`)}`, C.title)
    : solidBox(`<span class="risultato-label">RISULTATO:</span> NESSUNA SOLUZIONE REALE`, C.title);

  // Controllo
  html += solidBox(`✓ HO CONTROLLATO — ho rifatto i calcoli in ordine: Δ → t₁ e t₂ → √t → soluzioni.`, C.controllo);

  return html;
}

// ─── PARTE B: mappa da completare (supporto minimo) ───────────────

function buildDaCompletare(d: MappaPdfData): string {
  let html = "";

  html += solidBox(
    `MAPPA CONCETTUALE · <span class="livello">MAPPA LIVELLO 3 – Supporto minimo</span>`,
    C.title,
    "title-box"
  );
  html += `<div class="eq-banner">L'equazione da risolvere:${katexBlock(d.eqLatex)}</div>`;

  // RICORDA (formule visibili come riferimento)
  html += solidBox(
    `RICORDA: metto <b>t</b> al posto di <b>x²</b> (così x⁴ diventa t²), poi uso le formule di t.`,
    C.ricorda
  );

  html += stepBox(
    "📎 PASSO 1 · RICONOSCO L'EQUAZIONE",
    katexBlock(`a = \\dots \\qquad b = \\dots \\qquad c = \\dots`),
    C.passo1
  );

  html += stepBox(
    "↔ PASSO 2 · SOSTITUISCO: t = x²",
    `${katexBlock("x^{2} = t \\qquad x^{4} = t^{2} \\;\\rightarrow\\; \\dots t^{2} + \\dots t + \\dots = 0")}`,
    C.passo2
  );

  html += stepBox(
    "Δ PASSO 3 · CALCOLO Δ (DELTA)",
    katexBlock("\\Delta = (\\dots)^{2} - 4\\cdot(\\dots)\\cdot(\\dots) = \\dots"),
    C.passo3
  );

  html += stepBox(
    "＋ PASSO 4 · TROVO t₁",
    katexBlock("t_{1} = \\dfrac{\\dots + \\sqrt{\\dots}}{2\\cdot \\dots} = \\dots"),
    C.passo4
  );

  html += stepBox(
    "－ PASSO 5 · TROVO t₂",
    katexBlock("t_{2} = \\dfrac{\\dots - \\sqrt{\\dots}}{2\\cdot \\dots} = \\dots"),
    C.passo5
  );

  html += stepBox(
    "√ PASSO 6 · TORNO A x",
    `<p class="root-line"><b>ORA RISCRIVO QUI T₁</b> → ${katexInline("x_{1} = \\pm\\sqrt{\\dots} = \\pm\\dots")}</p>
     <p class="root-line"><b>ORA RISCRIVO QUI T₂</b> → ${katexInline("x_{2} = \\pm\\sqrt{\\dots} = \\pm\\dots")}</p>`,
    C.passo6
  );

  html += stepBox(
    "✓ PASSO 7 · SCRIVO LE SOLUZIONI",
    katexBlock("x = \\dots, \\; \\dots, \\; \\dots, \\; \\dots"),
    C.passo7
  );

  // Formule di riferimento (visibili)
  html += `<div class="formule">
    <p class="formule-title">RICORDA LE FORMULE</p>
    ${katexBlock("\\Delta = b^{2}-4\\cdot a\\cdot c \\qquad t = \\dfrac{-b \\pm \\sqrt{\\Delta}}{2\\cdot a} \\qquad x = \\pm\\sqrt{t}")}
    <p class="note">(x = ±√t solo se t ≥ 0; se t è negativo salto)</p>
  </div>`;

  html += `<div class="attenzione">
    <p class="attenzione-title">⚠ ATTENZIONE!</p>
    <p>Se <b>t è NEGATIVO</b> → salto quella soluzione. Se <b>Δ è NEGATIVO</b> → nessuna soluzione reale.</p>
  </div>`;

  html += `<div class="risultato-blank"></div>`;

  return html;
}

// ─── Documento completo ───────────────────────────────────────────

export function buildMappaHtml(d: MappaPdfData): string {
  // Header studente (come nel quaderno)
  let studentHeader = "";
  if (d.studentLabel) {
    studentHeader = `<div class="student">Studente: <b>${d.studentLabel}</b></div>`;
  }

  const parteA = buildSvolta(d);
  const parteB = buildDaCompletare(d);

  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><base href="${typeof window !== "undefined" ? window.location.origin : ""}/">
<title>Mappa Concettuale — Equazioni Biquadratiche</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<style>
@font-face{font-family:'OpenDyslexic';src:url('fonts/OpenDyslexic-Regular.ttf') format('truetype');font-weight:400;font-style:normal}
@font-face{font-family:'OpenDyslexic';src:url('fonts/OpenDyslexic-Bold.ttf') format('truetype');font-weight:700;font-style:normal}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'OpenDyslexic','Cambria Math',Cambria,serif;color:#1a1a1a;background:#fff;padding:14px 16px;max-width:780px;margin:0 auto;text-align:center;line-height:1.55;font-size:13.5px}
.solid{color:#fff;font-weight:bold;padding:10px 14px;border-radius:12px;font-size:14.5px;letter-spacing:.4px;margin:0 auto 10px;max-width:720px;line-height:1.5}
.title-box{font-size:15.5px;padding:12px 14px}
.livello{font-weight:normal;font-size:12.5px;opacity:.92}
.student{max-width:720px;margin:0 auto 10px;padding:7px 10px;border-bottom:1px solid #e5e0d8;color:#2B2421;font-size:13px;text-align:center}
.eq-banner{max-width:720px;margin:0 auto 10px;padding:8px 10px;border:2px dashed #5C35A6;border-radius:12px;background:#faf7ff}
.box{max-width:720px;margin:0 auto 10px;page-break-inside:avoid;break-inside:avoid}
.step-title{color:#fff;font-weight:bold;font-size:13.5px;padding:7px 12px;border-radius:12px 12px 0 0;letter-spacing:.4px;text-align:left}
.step-body{border:2.5px solid;border-top:none;border-radius:0 0 12px 12px;padding:8px 12px;background:#fff;text-align:center}
.note{font-size:12.5px;color:#444;margin-top:2px}
.skip{color:#B91C1C;font-weight:bold}
.root-line{margin:5px 0;font-size:13.5px}
.attenzione{max-width:720px;margin:0 auto 10px;border:2.5px solid #DC2626;border-radius:12px;padding:8px 12px;background:#fef2f2;page-break-inside:avoid;break-inside:avoid}
.attenzione-title{color:#DC2626;font-weight:bold;font-size:14px;margin-bottom:3px}
.attenzione p{margin:3px 0}
.formule{max-width:720px;margin:0 auto 10px;border:2.5px solid #0E7490;border-radius:12px;overflow:hidden;page-break-inside:avoid;break-inside:avoid}
.formule-title{background:#0E7490;color:#fff;font-weight:bold;padding:7px 12px;font-size:13.5px;letter-spacing:.4px}
.formule .katex-display{margin:8px 0 4px}
.formule .note{padding-bottom:8px}
.risultato-label{letter-spacing:.5px}
.risultato-blank{max-width:720px;margin:0 auto 10px;border:2.5px dashed #5C35A6;border-radius:12px;height:56px;page-break-inside:avoid;break-inside:avoid}
.katex-display{margin:6px 0}
.katex{font-size:1.06em}
.part-label{max-width:720px;margin:14px auto 8px;color:#6b7280;font-size:11.5px;text-align:left;letter-spacing:1px;font-weight:bold}
.pagebreak{page-break-before:always;break-before:page}
@media print{body{padding:0;zoom:0.95}@page{size:A4;margin:1.1cm}}
</style></head>
<body>
${studentHeader}
<div class="part-label">PARTE A · MAPPA SVOLTA</div>
${parteA}
<div class="pagebreak"></div>
<div class="part-label">PARTE B · MAPPA DA COMPLETARE</div>
${parteB}
<script>window.onload=function(){window.print()}</script>
</body></html>`;
}

/** Apre la finestra di stampa con la mappa (stesso flusso del quaderno PDF) */
export function openMappaPdf(d: MappaPdfData): void {
  const html = buildMappaHtml(d);
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

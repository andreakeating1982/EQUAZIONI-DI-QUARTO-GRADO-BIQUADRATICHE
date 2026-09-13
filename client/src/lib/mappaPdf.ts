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
 *  - PARTE B — mappa DA COMPLETARE: stessa equazione dell'utente, titoli
 *    «MAPPA CONCETTUALE» centrato, valori in bianco da compilare.
 *
 * NUMERI DI PAGINA: ogni parte è una sequenza di pagine A4 esplicite
 * (`.page` con piè di pagina «Pagina N di M» POSIZIONATO NEL MARGINE
 * INFERIORE, sotto la linea dei 2,5 cm standard: @page margin 2,5 cm ai
 * lati e in alto, 1 cm in basso per lasciare spazio al numero, che resta
 * così ~1,2-1,5 cm dal bordo pagina come nei documenti Word). I numeri
 * RIPARTONO DA 1 all'inizio di ogni mappa diversa per tipologia
 * (Parte A = 1..n, Parte B = 1..m), perché i browser non permettono di
 * gestire il contatore di pagina via CSS @page.
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

/** Formula LETTERARIA di Δ (riga sopra, fissa) */
function deltaFormulaLatex(): string {
  return "\\Delta = b^{2} - 4\\cdot a\\cdot c";
}

/** Sostituzione NUMERICA di Δ con i numeri veri (riga sotto) */
function deltaNumericLatex(d: MappaPdfData): string {
  const { a, b, c, delta } = d;
  const allInt = Number.isInteger(a) && Number.isInteger(b) && Number.isInteger(c);
  const sub = `${formatCoeffWithParens(b)}^{2} - 4\\cdot ${formatCoeffWithParens(a)}\\cdot ${formatCoeffWithParens(c)}`;
  if (allInt) {
    const q = 4 * a * c;
    const mid = q >= 0 ? `${b * b} - ${q}` : `${b * b} - (-${Math.abs(q)})`;
    return `\\Delta = ${sub} = ${mid} = ${numberToLatex(delta)}`;
  }
  return `\\Delta = ${sub} = ${numberToLatex(delta)}`;
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

/** Box «RICORDA LE FORMULE» (condiviso tra le due parti della mappa) */
function formuleBox(): string {
  return `<div class="formule">
    <p class="formule-title">RICORDA LE FORMULE</p>
    ${katexBlock("\\Delta = b^{2}-4\\cdot a\\cdot c \\qquad t = \\dfrac{-b \\pm \\sqrt{\\Delta}}{2\\cdot a} \\qquad x = \\pm\\sqrt{t}")}
    <p class="note">(x = ±√t solo se t ≥ 0; se t è negativo salto)</p>
  </div>`;
}

// ─── CSS della mappa (condiviso tra documento stampato e misurazione) ──
const MAPPA_CSS = `@font-face{font-family:'OpenDyslexic';src:url('fonts/OpenDyslexic-Regular.ttf') format('truetype');font-weight:400;font-style:normal}
@font-face{font-family:'OpenDyslexic';src:url('fonts/OpenDyslexic-Bold.ttf') format('truetype');font-weight:700;font-style:normal}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'OpenDyslexic','Cambria Math',Cambria,serif;color:#1a1a1a;background:#fff;padding:0;max-width:780px;margin:0 auto;text-align:center;line-height:1.55;font-size:13.5px}
.page{position:relative;height:27cm;padding-bottom:1.5cm;page-break-after:always;break-after:page}
.page--last{page-break-after:auto;break-after:auto}
.page-foot{position:absolute;left:0;right:0;bottom:0.15cm;color:#6b7280;font-size:11.5px;letter-spacing:.5px;text-align:center}
@media screen{body{padding:14px 16px}.page{outline:1px dashed #ddd;margin-bottom:14px}}
.solid{color:#fff;font-weight:bold;padding:10px 14px;border-radius:12px;font-size:14.5px;letter-spacing:.4px;margin:0 auto 10px;max-width:720px;line-height:1.5}
.title-box{font-size:15.5px;padding:12px 14px}
.student{max-width:720px;margin:0 auto 10px;padding:7px 10px;border-bottom:1px solid #e5e0d8;color:#2B2421;font-size:13px;text-align:center}
.eq-banner{max-width:720px;margin:0 auto 10px;padding:8px 10px;border:2px dashed #5C35A6;border-radius:12px;background:#faf7ff}
.part-label{max-width:720px;margin:14px auto 8px;color:#6b7280;font-size:11.5px;text-align:left;letter-spacing:1px;font-weight:bold}
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
@media print{body{zoom:0.95}@page{size:A4;margin:2.5cm 2.5cm 1cm 2.5cm}}`;

// ─── Paginazione esplicita (numeri di pagina per tipologia) ───────
// I browser non supportano i margin-box CSS @page, quindi ogni parte
// della mappa viene spezzata in pagine A4 esplicite: il piè di pagina
// «Pagina N di M» è dentro ogni pagina e RIPARTE DA 1 per ogni parte
// (mappa diversa per tipologia). PAGE_BUDGET è l'altezza massima (px
// VISUALI, cioè come appariranno in stampa) dei box assegnati a una
// pagina. Le altezze sono MISURATE REALMENTE nel DOM (vedi «Misurazione
// reale» sotto) con fallback alla stima prudenziale. L'area box di una
// pagina è 25,65 cm visuali − 1,43 cm di padding ≈ 915,6 px: il budget
// 900 la riempie al ~98% lasciando ~15 px di sicurezza.

const PAGE_BUDGET = 900;

/** Stima prudenziale dell'altezza di un box dal suo HTML */
function estimateHeight(html: string): number {
  const displays = (html.match(/class="katex-display"/g) || []).length;
  const fracs = (html.match(/class="mfrac"/g) || []).length;
  const paras = (html.match(/<p[\s>]/g) || []).length;
  return 60 + displays * 60 + Math.min(fracs, 8) * 16 + paras * 22;
}

// ─── Misurazione reale dei box (pagine piene) ─────────────────
// La stima prudenziale sopravvaluta i box (~30-35%): le pagine restavano
// mezza vuote. Qui ogni box viene renderizzato in un contenitore nascosto
// con le STESSE condizioni proporzionali della stampa (larghezza 636,5 px
// specificata = 604,7 px visuali con zoom 0.95, font OpenDyslexic, KaTeX)
// e ne leggiamo l'altezza VISUALE reale con getBoundingClientRect (unica
// API non ambigua rispetto alla semantica di zoom). Il CSS della mappa
// (MAPPA_CSS) viene iniettato SOLO durante la misura — creato e rimosso
// nella stessa operazione sincrona, quindi senza nessun repaint — con i
// selettori body/* ristretti al contenitore, così l'app non subisce effetti.
const MEASURE_W = 636.5; // larghezza specificata → 604,7 px visuali (area 16 cm)
const MARGIN_ITEM = 10;  // margin-bottom di ogni box (margin:0 auto 10px)
const heightCache = new Map<string, number>();
let measureWrap: HTMLDivElement | null = null;

/** CSS della mappa ristretto al solo contenitore di misura */
const MAPPA_CSS_MEASURE = MAPPA_CSS
  .replace(/\bbody\{/g, "#mappa-measure-wrap{")
  .replace(/\*\{/g, "#mappa-measure-wrap *{");

function getMeasureWrap(): HTMLDivElement {
  if (measureWrap) return measureWrap;
  const wrap = document.createElement("div");
  wrap.id = "mappa-measure-wrap";
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.cssText =
    `position:absolute;left:-99999px;top:0;width:${MEASURE_W}px;zoom:0.95;` +
    "padding:0;margin:0;max-width:none;visibility:hidden";
  document.body.appendChild(wrap);
  measureWrap = wrap;
  return wrap;
}

/** Altezza VISUALE reale di un box (px come in stampa) + suo margine */
function measureItem(html: string): number {
  const cached = heightCache.get(html);
  if (cached !== undefined) return cached;
  const host = document.createElement("div");
  host.innerHTML = html.trim();
  const el = host.firstElementChild as HTMLElement | null;
  if (!el) {
    heightCache.set(html, 0);
    return 0;
  }
  const wrap = getMeasureWrap();
  wrap.appendChild(el);
  const h = el.getBoundingClientRect().height + MARGIN_ITEM;
  wrap.removeChild(el);
  heightCache.set(html, h);
  return h;
}

/** Carica i font usati dalla mappa PRIMA di misurare (fallback: timeout) */
async function ensureMeasureFonts(): Promise<void> {
  const f = (document as any).fonts;
  if (!f) return;
  const specs = [
    "13.5px OpenDyslexic",
    "700 13.5px OpenDyslexic",
    "20px KaTeX_Main",
    "italic 20px KaTeX_Math",
    "20px KaTeX_Size2",
  ];
  const jobs = specs.map((s) => f.load(s).catch(() => undefined));
  await Promise.race([
    Promise.allSettled(jobs),
    new Promise((r) => setTimeout(r, 1500)),
  ]);
  try {
    await Promise.race([f.ready, new Promise((r) => setTimeout(r, 800))]);
  } catch {
    /* font non disponibili: si misura con i fallback */
  }
}

/** Esegue fn con il CSS della mappa attivo solo per la durata della chiamata */
function withMeasureStyles<T>(fn: () => T): T {
  const style = document.createElement("style");
  style.textContent = MAPPA_CSS_MEASURE;
  document.head.appendChild(style);
  try {
    return fn();
  } finally {
    style.remove();
  }
}

/** Raggruppa i box in pagine da non superare PAGE_BUDGET (ordine invariato) */
function paginate(items: string[], hFn: (html: string) => number): string[][] {
  const pages: string[][] = [];
  let cur: string[] = [];
  let curH = 0;
  for (const it of items) {
    const h = hFn(it);
    if (cur.length > 0 && curH + h > PAGE_BUDGET) {
      pages.push(cur);
      cur = [];
      curH = 0;
    }
    cur.push(it);
    curH += h;
  }
  if (cur.length > 0) pages.push(cur);
  // Se l'ultima pagina resta quasi vuota, sposta in avanti gli ultimi box
  // della pagina precedente finché non contiene contenuti dignitosi
  // (l'ordine resta invariato e le pagine precedenti restano piene).
  while (pages.length >= 2) {
    const lastPg = pages[pages.length - 1];
    const prevPg = pages[pages.length - 2];
    const lastH = lastPg.reduce((s, it) => s + hFn(it), 0);
    if (lastH >= 320 || prevPg.length <= 1) break;
    lastPg.unshift(prevPg.pop() as string);
  }
  return pages;
}

/** Renderizza le pagine di una mappa: «Pagina N di M» riparte da 1 */
function renderPages(pages: string[][], isLastPart: boolean): string {
  return pages
    .map((items, i) => {
      const isLast = isLastPart && i === pages.length - 1;
      return `<div class="page${isLast ? " page--last" : ""}">${items.join("")}<div class="page-foot">Pagina ${i + 1} di ${pages.length}</div></div>`;
    })
    .join("");
}

// ─── PARTE A: mappa svolta (dinamica) → lista di box ──────────────

function buildSvolta(d: MappaPdfData): string[] {
  const items: string[] = [];

  // Titolo
  items.push(solidBox(
    `MAPPA · LE REGOLE PER RISOLVERE UN'EQUAZIONE BIQUADRATICA`,
    C.title,
    "title-box"
  ));
  items.push(`<div class="eq-banner">La mappa è costruita sulla TUA equazione:${katexBlock(d.eqLatex)}</div>`);

  // Definizione
  items.push(stepBox(
    "CHE COS'È UN'EQUAZIONE BIQUADRATICA?",
    `${katexBlock("a\\cdot x^{4}+b\\cdot x^{2}+c = 0")}
     <p class="note">Ha <b>TRE TERMINI</b> con la x: <b>x⁴</b>, <b>x²</b> e il numero da solo.</p>`,
    C.passo1
  ));

  // RICORDA
  items.push(solidBox(
    `RICORDA: metto <b>t</b> al posto di <b>x²</b> (così x⁴ diventa t²), poi uso le formule di t.`,
    C.ricorda
  ));

  // PASSO 1
  items.push(stepBox(
    "📎 PASSO 1 · RICONOSCO L'EQUAZIONE",
    `<p>Trovo i tre numeri:</p>
     ${katexBlock(`a = ${numberToLatex(d.a)} \\qquad b = ${numberToLatex(d.b)} \\qquad c = ${numberToLatex(d.c)}`)}`,
    C.passo1
  ));

  // PASSO 2
  items.push(stepBox(
    "↔ PASSO 2 · SOSTITUISCO: t = x²",
    `${katexBlock("x^{2} = t \\qquad x^{4} = t^{2}")}
     <p>→ l'equazione diventa:</p>
     ${katexBlock(d.tEqLatex)}`,
    C.passo2
  ));

  // PASSO 3 — formula letteraria sopra, sostituzione numerica sotto
  items.push(stepBox(
    "Δ PASSO 3 · CALCOLO Δ (DELTA)",
    `${katexBlock(deltaFormulaLatex())}
     ${katexBlock(deltaNumericLatex(d))}`,
    C.passo3
  ));

  if (d.deltaNegative) {
    // Δ < 0 → niente passi 4-7: attenzione + risultato
    items.push(`<div class="attenzione">
      <p class="attenzione-title">⚠ ATTENZIONE!</p>
      ${katexBlock(`\\Delta = ${numberToLatex(d.delta)} \\; < \\; 0`)}
      <p>Δ è <b>NEGATIVO</b> → l'equazione <b>NON ha soluzioni reali</b>.</p>
    </div>`);
  } else {
    const t1 = d.t1;
    const t2 = d.t2;

    // PASSO 4
    if (t1 !== null) {
      let t1Body = katexBlock(`t_{1} = \\dfrac{-b+\\sqrt{\\Delta}}{2\\cdot a} = ${tChainLatex(d, "+")}`);
      t1Body += katexBlock(`t_{1} = ${tValueLatex(d, t1)}`);
      if (d.hasDoubleRoot) t1Body += `<p class="note">(t₁ e t₂ sono uguali perché Δ = 0)</p>`;
      if (t1 < -EPS) t1Body += `<p class="skip">t₁ è NEGATIVO → salto questa soluzione</p>`;
      items.push(stepBox("＋ PASSO 4 · TROVO t₁", t1Body, C.passo4));
    }

    // PASSO 5
    if (t2 !== null && !(d.hasDoubleRoot)) {
      let t2Body = katexBlock(`t_{2} = \\dfrac{-b-\\sqrt{\\Delta}}{2\\cdot a} = ${tChainLatex(d, "-")}`);
      t2Body += katexBlock(`t_{2} = ${tValueLatex(d, t2)}`);
      if (t2 < -EPS) t2Body += `<p class="skip">t₂ è NEGATIVO → salto questa soluzione</p>`;
      items.push(stepBox("－ PASSO 5 · TROVO t₂", t2Body, C.passo5));
    }

    // PASSO 6
    const rootLines: string[] = [];
    if (t1 !== null) rootLines.push(rootLineForT(d, t1, "t₁"));
    if (t2 !== null && !d.hasDoubleRoot && Math.abs(t2 - (t1 ?? 0)) > 1e-9) {
      rootLines.push(rootLineForT(d, t2, "t₂"));
    }
    items.push(stepBox(
      "√ PASSO 6 · TORNO A x",
      rootLines.length > 0 ? rootLines.join("") : `<p>Nessuna t da riportare a x.</p>`,
      C.passo6
    ));

    // PASSO 7
    if (d.hasRealSolutions) {
      items.push(stepBox(
        "✓ PASSO 7 · SCRIVO LE SOLUZIONI",
        `${katexBlock(`x = ${solutionsLatex(d)}`)}
         <p class="note">(conto bene: sono <b>${d.xValues.length}</b>!)</p>`,
        C.passo7
      ));
    } else {
      items.push(stepBox(
        "✓ PASSO 7 · SCRIVO LE SOLUZIONI",
        `<p class="skip">Nessuna t da riportare a x → <b>NESSUNA SOLUZIONE REALE</b></p>`,
        C.passo7
      ));
    }
  }

  // Formule di servizio
  items.push(formuleBox());

  // ATTENZIONE (regole, con nota dinamica)
  let attenzioneBody = "";
  if (d.deltaNegative) {
    attenzioneBody = `<p>In questa equazione Δ = ${katexInline(numberToLatex(d.delta))} è negativo → nessuna soluzione reale.</p>`;
  } else if (!d.hasRealSolutions) {
    attenzioneBody = `<p>In questa equazione Δ è positivo ma tutte le t sono negative → nessuna soluzione reale.</p>`;
  }
  items.push(`<div class="attenzione">
    <p class="attenzione-title">⚠ ATTENZIONE!</p>
    ${attenzioneBody}
    <p>Se <b>t è NEGATIVO</b> → salto quella soluzione. Se <b>Δ è NEGATIVO</b> → nessuna soluzione reale.</p>
    <p>Prima di scrivere le soluzioni guarda sempre il <b>segno</b> di Δ e delle t!</p>
  </div>`);

  // RISULTATO
  items.push(d.hasRealSolutions
    ? solidBox(`<span class="risultato-label">RISULTATO:</span> ${katexInline(`x = ${solutionsLatex(d)}`)}`, C.title)
    : solidBox(`<span class="risultato-label">RISULTATO:</span> NESSUNA SOLUZIONE REALE`, C.title));

  // Controllo
  items.push(solidBox(`✓ HO CONTROLLATO — ho rifatto i calcoli in ordine: Δ → t₁ e t₂ → √t → soluzioni.`, C.controllo));

  return items;
}

// ─── PARTE B: mappa da completare (solo i passi effettivi) ────────

function buildDaCompletare(d: MappaPdfData): string[] {
  const items: string[] = [];

  // Titolo: solo «MAPPA CONCETTUALE», centrato
  items.push(solidBox(`MAPPA CONCETTUALE`, C.title, "title-box"));
  items.push(`<div class="eq-banner">L'equazione da risolvere:${katexBlock(d.eqLatex)}</div>`);

  // RICORDA (formule visibili come riferimento)
  items.push(solidBox(
    `RICORDA: metto <b>t</b> al posto di <b>x²</b> (così x⁴ diventa t²), poi uso le formule di t.`,
    C.ricorda
  ));

  items.push(stepBox(
    "📎 PASSO 1 · RICONOSCO L'EQUAZIONE",
    katexBlock(`a = \\dots \\qquad b = \\dots \\qquad c = \\dots`),
    C.passo1
  ));

  items.push(stepBox(
    "↔ PASSO 2 · SOSTITUISCO: t = x²",
    `${katexBlock("x^{2} = t \\qquad x^{4} = t^{2} \\;\\rightarrow\\; \\dots t^{2} + \\dots t + \\dots = 0")}`,
    C.passo2
  ));

  // PASSO 3 — come nella mappa svolta: formula letteraria (visibile) sopra,
  // sostituzione numerica da completare sotto
  items.push(stepBox(
    "Δ PASSO 3 · CALCOLO Δ (DELTA)",
    `${katexBlock(deltaFormulaLatex())}
     ${katexBlock("\\Delta = (\\dots)^{2} - 4\\cdot(\\dots)\\cdot(\\dots) = \\dots")}`,
    C.passo3
  ));

  if (d.deltaNegative) {
    // Δ < 0 → l'equazione si sviluppa SOLO su 3 passi: nessuna soluzione reale
    items.push(`<div class="attenzione">
      <p class="attenzione-title">⚠ ATTENZIONE!</p>
      ${katexBlock(`\\Delta = ${numberToLatex(d.delta)} \\; < \\; 0`)}
      <p>Δ è <b>NEGATIVO</b> → l'equazione <b>NON ha soluzioni reali</b>: i passi si fermano qui.</p>
    </div>`);
    items.push(formuleBox());
    items.push(`<div class="risultato-blank"></div>`);
    return items;
  }

  items.push(stepBox(
    "＋ PASSO 4 · TROVO t₁",
    katexBlock("t_{1} = \\dfrac{\\dots + \\sqrt{\\dots}}{2\\cdot \\dots} = \\dots") +
      (d.hasDoubleRoot ? `<p class="note">(t₁ e t₂ sono uguali perché Δ = 0)</p>` : ""),
    C.passo4
  ));

  if (!d.hasDoubleRoot) {
    items.push(stepBox(
      "－ PASSO 5 · TROVO t₂",
      katexBlock("t_{2} = \\dfrac{\\dots - \\sqrt{\\dots}}{2\\cdot \\dots} = \\dots"),
      C.passo5
    ));
  }

  // PASSO 6 — una sola riga se Δ = 0 (t₁ = t₂)
  items.push(stepBox(
    "√ PASSO 6 · TORNO A x",
    `<p class="root-line"><b>ORA RISCRIVO QUI T₁</b> → ${katexInline("x_{1} = \\pm\\sqrt{\\dots} = \\pm\\dots")}</p>` +
      (d.hasDoubleRoot
        ? ""
        : `<p class="root-line"><b>ORA RISCRIVO QUI T₂</b> → ${katexInline("x_{2} = \\pm\\sqrt{\\dots} = \\pm\\dots")}</p>`),
    C.passo6
  ));

  items.push(stepBox(
    "✓ PASSO 7 · SCRIVO LE SOLUZIONI",
    katexBlock("x = \\dots, \\; \\dots, \\; \\dots, \\; \\dots"),
    C.passo7
  ));

  // Formule di riferimento (visibili)
  items.push(formuleBox());

  items.push(`<div class="attenzione">
    <p class="attenzione-title">⚠ ATTENZIONE!</p>
    <p>Se <b>t è NEGATIVO</b> → salto quella soluzione. Se <b>Δ è NEGATIVO</b> → nessuna soluzione reale.</p>
  </div>`);

  items.push(`<div class="risultato-blank"></div>`);

  return items;
}

// ─── Documento completo ───────────────────────────────────────────

export function buildMappaHtml(
  d: MappaPdfData,
  mode?: "estimate" | "measure"
): string {
  // Header studente (come nel quaderno) — prima pagina della PARTE A
  const itemsA: string[] = [];
  if (d.studentLabel) {
    itemsA.push(`<div class="student">Studente: <b>${d.studentLabel}</b></div>`);
  }
  itemsA.push(`<div class="part-label">PARTE A · MAPPA SVOLTA</div>`);
  itemsA.push(...buildSvolta(d));

  const itemsB: string[] = [];
  itemsB.push(`<div class="part-label">PARTE B · MAPPA DA COMPLETARE</div>`);
  itemsB.push(...buildDaCompletare(d));

  // Ogni mappa ha la sua numerazione: «Pagina N di M» riparte da 1
  // mode="measure": altezze reali misurate nel DOM (pagine piene);
  // altrimenti stima prudenziale convertita in px visuali (×0.95).
  const hFn =
    mode === "measure" && typeof document !== "undefined"
      ? (html: string): number => {
          try {
            const m = measureItem(html);
            if (m > 0) return m;
          } catch {
            /* misura non disponibile: resta la stima */
          }
          return estimateHeight(html) * 0.95;
        }
      : (html: string): number => estimateHeight(html) * 0.95;
  const pagesA = paginate(itemsA, hFn);
  const pagesB = paginate(itemsB, hFn);
  const htmlA = renderPages(pagesA, false);
  const htmlB = renderPages(pagesB, true);

  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><base href="${typeof window !== "undefined" ? window.location.origin : ""}/">
<title>Mappa Concettuale — Equazioni Biquadratiche</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<style>
${MAPPA_CSS}
</style></head>
<body>
${htmlA}
${htmlB}
<script>window.onload=function(){window.print()}</script>
</body></html>`;
}

/** Apre la finestra di stampa con la mappa (stesso flusso del quaderno PDF).
 * La finestra vuota viene aperta SUBITO nel gesto utente (niente popup-blocker);
 * poi i box vengono MISURATI realmente nel DOM e il documento viene scritto
 * con le pagine PIENE. Se la misura fallisce si ricade sulla stima prudenziale. */
export function openMappaPdf(d: MappaPdfData): void {
  let w: Window | null = null;
  try {
    w = window.open("", "_blank");
  } catch {
    w = null;
  }
  const write = (html: string) => {
    let target = w && !w.closed ? w : null;
    if (!target) {
      try {
        target = window.open("", "_blank");
      } catch {
        target = null;
      }
    }
    if (target) {
      target.document.write(html);
      target.document.close();
    }
  };
  const go = async () => {
    let html: string;
    try {
      await ensureMeasureFonts();
      html = withMeasureStyles(() => buildMappaHtml(d, "measure"));
    } catch {
      html = buildMappaHtml(d);
    }
    write(html);
  };
  void go();
}

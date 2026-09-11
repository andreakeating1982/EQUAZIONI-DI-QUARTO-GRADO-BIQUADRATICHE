/**
 * Normalizza il testo riconosciuto dall'OCR in un'equazione biquadratica
 * comprensibile al parser dell'app (parseBiquadraticLaTeX), che accetta
 * forme come «2x^4-3x^2+1=0», «2x⁴−3x²+1=0» o «x^{4}».
 *
 * Tesseract spesso legge i pedici come cifre attaccate («x4 - 5x2 + 4 = 0»)
 * e confonde qualche simbolo: qui sistemiamo i casi più comuni senza
 * inventare nulla — lo studente vede comunque la trascrizione nel campo di
 * correzione e può modificarla prima di premere OK.
 */
export function normalizeEquationOcr(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  /* L'equazione sta nelle righe con la «x»; un eventuale pezzo che inizia con
     un segno (+ o −) fa parte dell'equazione (riga spezzata su due righe). */
  let keep = lines.filter((l) => /[xX]/.test(l) || /^[+\-−–—]/.test(l));
  if (keep.length === 0) keep = lines.slice(0, 3);
  let s = keep.join("");

  s = s
    /* spazi via e simboli simili unificati */
    .replace(/\s+/g, "")
    .replace(/[−–—―‒]/g, "-")
    .replace(/[∙·⋅•*]/g, "")
    .replace(/＝/g, "=")
    .replace(/X/g, "x")
    /* errori tipici di Tesseract in contesto matematico: O/Q al posto di 0,
       l/I/| al posto di 1 (solo tra cifre o simboli, per non rovinare le x) */
    .replace(/([0-9+=\-]|^)[OoQ]([0-9+=\-]|$)/g, (_m, a: string, b: string) => `${a}0${b}`)
    .replace(/([0-9]|^)[lI|]([0-9+=\-]|$)/g, (_m, a: string, b: string) => `${a}1${b}`)
    /* il pedice letto come * / ' / ° è quasi sempre l'esponente ² */
    .replace(/x[*'’`´°]/g, "x^2")
    /* punto usato come separatore dopo una lettera (es. «Es. 2x4-3x2+1=0») */
    .replace(/[a-zA-Z]\.(?=\d)/g, (m) => m[0])
    /* cifra attaccata alla x = esponente (Tesseract legge x⁴ come «x4»);
       le forme con pedice unicode (x⁴, x²) restano intatte: il parser
       dell'app le accetta già da sole */
    .replace(/x(\d)/g, "x^$1");

  /* assicura la forma «…=0» */
  s = s.replace(/=+$/, "=0");
  if (!s.includes("=")) s = s + "=0";

  /* togli tutto ciò che non può stare in un'equazione biquadratica
     (etichette, lettere residue, punteggiatura) */
  s = s.replace(/[^x^0-9+\-=.()⁰¹²³⁴⁵⁶⁷⁸⁹]/g, "");
  s = s.replace(/^\./, "");

  return s;
}

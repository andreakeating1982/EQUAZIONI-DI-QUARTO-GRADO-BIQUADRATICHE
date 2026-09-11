/**
 * Preparazione delle foto prima del ritaglio e dell'OCR.
 *
 * 1. `normalizePhoto` — corregge l'orientamento EXIF (le foto scattate dal
 *    telefono arrivano spesso ruotate di 90°) e restituisce un JPEG "dritto".
 * 2. `enhanceForOcr` — ridimensiona, passa in scala di grigi e stira il
 *    contrasto, così Tesseract legge meglio testo stampato su libro/quaderno
 *    (luci irregolari, pagina gialla, ombre). L'ingrandimento avviene A PASSI
 *    (max ×2 per passo) con una leggera maschera di nitidezza: un singolo
 *    drawImage anche solo ×3–5 sfuma gli esponenti in apice e Tesseract
 *    li massacra (x⁴ → «2x243x»).
 */

const MAX_EDGE = 2200;
/* 1100 px sul lato corto: gli esponenti in apice restano leggibili
   anche nelle foto fatte da lontano */
const MIN_EDGE = 1100;

export async function bitmapFromBlob(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(blob);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("impossibile generare l'immagine"))), type, quality);
  });
}

/** Foto "dritta" in JPEG, pronta da mostrare nel ritaglio. */
export async function normalizePhoto(file: File): Promise<File> {
  const bmp = await bitmapFromBlob(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas non disponibile");
    ctx.drawImage(bmp, 0, 0);
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    return new File([blob], "foto.jpg", { type: "image/jpeg" });
  } finally {
    bmp.close();
  }
}

/**
 * Stira il contrasto in scala di grigi (percentili 2–98) per testo scuro su
 * carta chiara. Non usa una soglia dura: conserva l'antialias delle lettere.
 */
function contrastStretchGray(img: ImageData): void {
  const { data } = img;
  const n = data.length / 4;
  if (n === 0) return;
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    hist[y]++;
    data[i] = y;
    data[i + 1] = y;
    data[i + 2] = y;
  }
  const loCount = Math.max(1, Math.floor(n * 0.02));
  const hiCount = Math.max(1, Math.floor(n * 0.02));
  let acc = 0;
  let lo = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= loCount) {
      lo = v;
      break;
    }
  }
  acc = 0;
  let hi = 255;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= hiCount) {
      hi = v;
      break;
    }
  }
  if (hi <= lo) return;
  const scale = 255 / (hi - lo);
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.max(0, Math.min(255, Math.round((data[i] - lo) * scale)));
    data[i] = y;
    data[i + 1] = y;
    data[i + 2] = y;
  }
}

/**
 * Maschera di nitidezza leggera (unsharp 3×3) sull'immagine già in grigio:
 * recupera i bordi sfumati dall'ingrandimento senza amplificare troppo il
 * rumore della foto.
 */
function unsharpMask(img: ImageData, amount: number): void {
  const w = img.width;
  const h = img.height;
  const { data } = img;
  const n = w * h;
  const gray = new Float32Array(n);
  for (let p = 0, i = 0; p < n; p++, i += 4) gray[p] = data[i];
  const blur = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    const y0 = y > 0 ? y - 1 : 0;
    const y1 = y < h - 1 ? y + 1 : h - 1;
    for (let x = 0; x < w; x++) {
      const x0 = x > 0 ? x - 1 : 0;
      const x1 = x < w - 1 ? x + 1 : w - 1;
      const acc =
        gray[y0 * w + x0] + gray[y0 * w + x] + gray[y0 * w + x1] +
        gray[y * w + x0] + gray[y * w + x] + gray[y * w + x1] +
        gray[y1 * w + x0] + gray[y1 * w + x] + gray[y1 * w + x1];
      blur[y * w + x] = acc / 9;
    }
  }
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const v = Math.max(0, Math.min(255, Math.round(gray[p] + amount * (gray[p] - blur[p]))));
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
}

/**
 * Ridisegna la sorgente a (dw, dh). Se sta INGRANDENDO usa passi successivi
 * di massimo ×2 (tecnica standard di upscaling: preserva i dettagli fini
 * come gli apici ⁴ ² molto meglio di un unico drawImage) e ogni passaggio
 * usa smoothing di altissima qualità.
 */
function drawScaled(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  dw: number,
  dh: number
): HTMLCanvasElement {
  const draw = (w: number, h: number, src: CanvasImageSource): HTMLCanvasElement => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const c = cv.getContext("2d");
    if (!c) throw new Error("canvas non disponibile");
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(src, 0, 0, w, h);
    return cv;
  };
  if (dw <= sw) return draw(dw, dh, source); // downscale: un passaggio basta
  let curW = sw;
  let curH = sh;
  let cur: CanvasImageSource = source;
  while (curW * 2 <= dw) {
    cur = draw(curW * 2, curH * 2, cur);
    curW = curW * 2;
    curH = curH * 2;
  }
  if (curW < dw) cur = draw(dw, dh, cur);
  return cur as HTMLCanvasElement;
}

/** Immagine ottimizzata per Tesseract (PNG lossless, grigio, contrasto). */
export async function enhanceForOcr(file: Blob): Promise<Blob> {
  const bmp = await bitmapFromBlob(file);
  try {
    let scale = 1;
    const maxEdge = Math.max(bmp.width, bmp.height);
    const minEdge = Math.min(bmp.width, bmp.height);
    if (maxEdge > MAX_EDGE) scale = MAX_EDGE / maxEdge;
    else if (minEdge < MIN_EDGE) scale = MIN_EDGE / minEdge;
    const cw = Math.max(1, Math.round(bmp.width * scale));
    const ch = Math.max(1, Math.round(bmp.height * scale));
    const upscaled = scale > 1.05;
    const canvas = drawScaled(bmp, bmp.width, bmp.height, cw, ch);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas non disponibile");
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    contrastStretchGray(img);
    if (upscaled) unsharpMask(img, 0.4);
    ctx.putImageData(img, 0, 0);
    return await canvasToBlob(canvas, "image/png");
  } finally {
    bmp.close();
  }
}

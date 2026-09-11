import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Crop, Loader2, Move, RotateCcw, RotateCw } from "lucide-react";
import { toast } from "sonner";
import {
  MIN_BOX,
  moveBox,
  resizeBox,
  resizeCorner,
  type Box,
  type Corner,
  type Edge,
} from "@/lib/cropBox";

/** Spessore della zona di presa per il trascinamento (px), tutta DENTRO la foto */
const HANDLE_SIZE = 44;
const CORNER_SIZE = 44;

type DragState =
  | { mode: "resize"; edge: Edge; start: number; startBox: Box }
  | { mode: "corner"; corner: Corner; startX: number; startY: number; startBox: Box }
  | { mode: "move"; startX: number; startY: number; startBox: Box };

/**
 * Modale di ritaglio della foto: la finestra chiara (bordo tratteggiato) è un
 * box libero. Maniglie (4 bordi + 4 angoli) posizionate TUTTE DENTRO la foto,
 * così non vengono mai tagliate da overflow-hidden — in particolare il lato
 * DESTRO, che prima restava a filo e non si poteva restringere.
 * Il trascinamento usa listener sulla window (non solo sulla maniglia), così
 * il gesto continua anche se il puntatore esce dalla barretta.
 *
 * (Componente portato dall'app «Latino Facile», con testi adattati
 * all'equazione biquadratica.)
 */
export function CropDialog({
  open,
  imageUrl,
  onConfirm,
  onClose,
}: {
  open: boolean;
  imageUrl: string | null;
  onConfirm: (croppedFile: File) => void;
  onClose: () => void;
}) {
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 100, h: 100 });
  const [busy, setBusy] = useState(false);
  const [src, setSrc] = useState<string | null>(imageUrl);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const extraUrls = useRef<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setBox({ x: 0, y: 0, w: 100, h: 100 });
    setSrc(imageUrl);
    extraUrls.current.forEach((u) => URL.revokeObjectURL(u));
    extraUrls.current = [];
    dragRef.current = null;
  }, [open, imageUrl]);

  useEffect(() => {
    return () => {
      extraUrls.current.forEach((u) => URL.revokeObjectURL(u));
      extraUrls.current = [];
    };
  }, []);

  /* Listener globali: il trascinamento non si interrompe se il dito/mouse esce dalla maniglia */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      const wrap = wrapRef.current;
      if (!d || !wrap) return;
      const rect = wrap.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      if (d.mode === "resize") {
        const size = d.edge === "top" || d.edge === "bottom" ? rect.height : rect.width;
        if (size <= 0) return;
        const delta = (d.edge === "top" || d.edge === "bottom" ? e.clientY : e.clientX) - d.start;
        setBox(resizeBox(d.startBox, d.edge, (delta / size) * 100));
      } else if (d.mode === "corner") {
        const dxPct = ((e.clientX - d.startX) / rect.width) * 100;
        const dyPct = ((e.clientY - d.startY) / rect.height) * 100;
        setBox(resizeCorner(d.startBox, d.corner, dxPct, dyPct));
      } else {
        const dxPct = ((e.clientX - d.startX) / rect.width) * 100;
        const dyPct = ((e.clientY - d.startY) / rect.height) * 100;
        setBox(moveBox(d.startBox, dxPct, dyPct));
      }
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const resetBox = useCallback(() => {
    setBox({ x: 0, y: 0, w: 100, h: 100 });
  }, []);

  const startDrag = (e: React.PointerEvent, state: DragState) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = state;
  };

  const onMoveKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;
    else return;
    e.preventDefault();
    setBox((prev) => moveBox(prev, dx, dy));
  };

  const rotate90 = async (dir: 1 | -1) => {
    if (!src || busy) return;
    setBusy(true);
    try {
      const img = new Image();
      img.src = src;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("immagine non caricabile"));
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas non disponibile");
      if (dir === 1) {
        ctx.translate(canvas.width, 0);
        ctx.rotate(Math.PI / 2);
      } else {
        ctx.translate(0, canvas.height);
        ctx.rotate(-Math.PI / 2);
      }
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("impossibile ruotare");
      const url = URL.createObjectURL(blob);
      extraUrls.current.push(url);
      setSrc(url);
      setBox({ x: 0, y: 0, w: 100, h: 100 });
    } catch {
      toast.error("Non sono riuscito a ruotare la foto. Riprova.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!src) return;
    setBusy(true);
    try {
      const img = new Image();
      img.src = src;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("immagine non caricabile"));
      });
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const sx = (nw * box.x) / 100;
      const sy = (nh * box.y) / 100;
      const sw = (nw * box.w) / 100;
      const sh = (nh * box.h) / 100;
      if (sw < 8 || sh < 8) throw new Error("ritaglio troppo piccolo");
      /* Il ritaglio va all'OCR in PNG lossless: il JPEG (blocchi DCT), dopo
         l'ingrandimento per l'OCR, si trasforma in rumore che affoga
         Tesseract (verificato con sonde A/B). Lato massimo 2200 px:
         abbastanza per gli apici, file leggero. */
      const MAX_CROP_EDGE = 2200;
      let cw = Math.max(1, Math.round(sw));
      let ch = Math.max(1, Math.round(sh));
      const cropMax = Math.max(cw, ch);
      if (cropMax > MAX_CROP_EDGE) {
        const s = MAX_CROP_EDGE / cropMax;
        cw = Math.max(1, Math.round(cw * s));
        ch = Math.max(1, Math.round(ch * s));
      }
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas non disponibile");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("impossibile generare il file");
      extraUrls.current.forEach((u) => URL.revokeObjectURL(u));
      extraUrls.current = [];
      onConfirm(new File([blob], "foto_ritagliata.png", { type: "image/png" }));
    } catch {
      toast.error("Non sono riuscito a ritagliare la foto: allarga un po' la finestra e riprova.");
    } finally {
      setBusy(false);
    }
  };

  const rx = 100 - box.x - box.w;
  const by = 100 - box.y - box.h;
  const cropActive = box.w < 100 || box.h < 100;

  /** Maniglie interamente DENTRO il box (mai a cavallo del bordo → mai tagliate). */
  const handleStyle = (edge: Edge): React.CSSProperties => {
    switch (edge) {
      case "top":
        return {
          left: `${box.x}%`,
          top: `${box.y}%`,
          width: `${box.w}%`,
          height: HANDLE_SIZE,
        };
      case "bottom":
        return {
          left: `${box.x}%`,
          top: `calc(${box.y + box.h}% - ${HANDLE_SIZE}px)`,
          width: `${box.w}%`,
          height: HANDLE_SIZE,
        };
      case "left":
        return {
          left: `${box.x}%`,
          top: `${box.y}%`,
          width: HANDLE_SIZE,
          height: `${box.h}%`,
        };
      case "right":
        return {
          left: `calc(${box.x + box.w}% - ${HANDLE_SIZE}px)`,
          top: `${box.y}%`,
          width: HANDLE_SIZE,
          height: `${box.h}%`,
        };
    }
  };

  const cornerStyle = (corner: Corner): React.CSSProperties => {
    switch (corner) {
      case "nw":
        return { top: `${box.y}%`, left: `${box.x}%` };
      case "ne":
        return { top: `${box.y}%`, left: `calc(${box.x + box.w}% - ${CORNER_SIZE}px)` };
      case "sw":
        return { top: `calc(${box.y + box.h}% - ${CORNER_SIZE}px)`, left: `${box.x}%` };
      case "se":
        return {
          top: `calc(${box.y + box.h}% - ${CORNER_SIZE}px)`,
          left: `calc(${box.x + box.w}% - ${CORNER_SIZE}px)`,
        };
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-3 text-center sm:px-12">
          <DialogTitle className="text-xl font-black tracking-tight uppercase text-foreground">
            Taglia i margini della foto
          </DialogTitle>
          <DialogDescription className="mt-1 text-[0.85rem] leading-snug text-muted-foreground">
            Lascia solo l'equazione: trascina i bordi o gli angoli bianchi.
            Se la foto è storta, usa i pulsanti di rotazione.
          </DialogDescription>
        </DialogHeader>

        {src && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
              <div className="flex justify-center">
                <div
                  ref={wrapRef}
                  className="relative inline-block max-w-full touch-none select-none overflow-hidden rounded-xl border-2 border-border bg-black/90"
                >
                  <img
                    src={src}
                    alt="Foto da ritagliare: trascina i bordi bianchi per lasciare solo l'equazione"
                    draggable={false}
                    className="block max-h-[46dvh] w-auto max-w-full select-none sm:max-h-[58dvh]"
                  />

                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-0 right-0 bg-black/55" style={{ top: 0, height: `${box.y}%` }} />
                    <div className="absolute left-0 right-0 bg-black/55" style={{ bottom: 0, height: `${by}%` }} />
                    <div
                      className="absolute bg-black/55"
                      style={{ top: `${box.y}%`, height: `${box.h}%`, left: 0, width: `${box.x}%` }}
                    />
                    <div
                      className="absolute bg-black/55"
                      style={{ top: `${box.y}%`, height: `${box.h}%`, right: 0, width: `${rx}%` }}
                    />
                    <div
                      className="absolute border-2 border-dashed border-white/90"
                      style={{ top: `${box.y}%`, left: `${box.x}%`, width: `${box.w}%`, height: `${box.h}%` }}
                    />
                  </div>

                  <div className="absolute inset-0">
                    {cropActive && (
                      <div
                        role="group"
                        aria-label="Sposta la finestra di ritaglio sulla foto"
                        title="Trascina per spostare la finestra di ritaglio"
                        tabIndex={0}
                        className="absolute z-[1] cursor-move touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
                        style={{
                          top: `${box.y}%`,
                          left: `${box.x}%`,
                          width: `${box.w}%`,
                          height: `${box.h}%`,
                        }}
                        onPointerDown={(e) =>
                          startDrag(e, { mode: "move", startX: e.clientX, startY: e.clientY, startBox: { ...box } })
                        }
                        onKeyDown={onMoveKeyDown}
                      >
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 m-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/75 text-foreground/70 shadow-md ring-1 ring-black/10"
                        >
                          <Move className="h-5 w-5" aria-hidden="true" />
                        </span>
                      </div>
                    )}
                    {(
                      [
                        ["top", "Ridimensiona il lato superiore della finestra di ritaglio", "h-1.5 w-12", "cursor-ns-resize"],
                        ["bottom", "Ridimensiona il lato inferiore della finestra di ritaglio", "h-1.5 w-12", "cursor-ns-resize"],
                        ["left", "Ridimensiona il lato sinistro della finestra di ritaglio", "h-12 w-1.5", "cursor-ew-resize"],
                        ["right", "Ridimensiona il lato destro della finestra di ritaglio", "h-12 w-1.5", "cursor-ew-resize"],
                      ] as const
                    ).map(([edge, label, bar, cursor]) => (
                      <div
                        key={edge}
                        role="slider"
                        aria-label={label}
                        aria-valuemin={MIN_BOX}
                        aria-valuemax={100}
                        aria-valuenow={edge === "left" || edge === "right" ? Math.round(box.w) : Math.round(box.h)}
                        className={`absolute z-[2] flex items-center justify-center touch-none ${cursor}`}
                        style={handleStyle(edge)}
                        onPointerDown={(e) =>
                          startDrag(e, {
                            mode: "resize",
                            edge,
                            start: edge === "top" || edge === "bottom" ? e.clientY : e.clientX,
                            startBox: { ...box },
                          })
                        }
                      >
                        <span className={`${bar} rounded-full bg-white shadow-md ring-1 ring-black/20`} />
                      </div>
                    ))}
                    {(
                      [
                        ["nw", "Angolo in alto a sinistra", "cursor-nwse-resize"],
                        ["ne", "Angolo in alto a destra", "cursor-nesw-resize"],
                        ["sw", "Angolo in basso a sinistra", "cursor-nesw-resize"],
                        ["se", "Angolo in basso a destra", "cursor-nwse-resize"],
                      ] as const
                    ).map(([corner, label, cursor]) => (
                      <div
                        key={corner}
                        role="slider"
                        aria-label={`Ridimensiona dal ${label.toLowerCase()}`}
                        className={`absolute z-[3] flex items-center justify-center touch-none ${cursor}`}
                        style={{ ...cornerStyle(corner), width: CORNER_SIZE, height: CORNER_SIZE }}
                        onPointerDown={(e) =>
                          startDrag(e, {
                            mode: "corner",
                            corner,
                            startX: e.clientX,
                            startY: e.clientY,
                            startBox: { ...box },
                          })
                        }
                      >
                        <span className="h-3.5 w-3.5 rounded-[3px] bg-white shadow-md ring-1 ring-black/25" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-border bg-background/80 px-3 py-3 sm:gap-3 sm:px-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void rotate90(-1)}
                disabled={busy}
                aria-label="Ruota la foto di 90 gradi a sinistra"
                className="h-9 gap-1 px-3 text-[0.75rem] font-bold uppercase text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                90°
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void rotate90(1)}
                disabled={busy}
                aria-label="Ruota la foto di 90 gradi a destra"
                className="h-9 gap-1 px-3 text-[0.75rem] font-bold uppercase text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                90°
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetBox}
                disabled={busy || !cropActive}
                className="h-9 gap-1 px-3 text-[0.75rem] font-bold uppercase text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                Azzera
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={busy}
                className="h-9 px-4 uppercase"
              >
                Annulla
              </Button>
              <Button
                onClick={() => void confirm()}
                disabled={busy}
                className="h-9 bg-primary px-4 uppercase text-primary-foreground hover:bg-primary/90"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crop className="mr-2 h-4 w-4" />}
                {busy ? "Attendi…" : "Conferma taglio"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

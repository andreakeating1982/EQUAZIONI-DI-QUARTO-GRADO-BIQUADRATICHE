import { useCallback, useState } from "react";
import { MathDrawCanvas, type Stroke } from "@/components/MathDrawCanvas";
import { useMathRecognition } from "@/hooks/useMathRecognition";
import { cn } from "@/lib/utils";

interface NumberInputCanvasProps {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  hint?: string;
  colorClass?: string;
  className?: string;
  allowNegative?: boolean;
}

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
    // Prima prova la modalità "number" (ottimizzata per cifre 0-9, include il 9)
    let result = await recognize(strokes, "number");
    // Fallback: se "number" non produce risultati, prova "expression"
    if (!result) {
      result = await recognize(strokes, "expression");
    }
    if (result) {
      // 1. Rimuovi spazi bianchi (causa principale del bug multi-cifra)
      let numStr = result.latex.replace(/\s+/g, "");
      // 2. Sostituisci virgole decimali con punti
      numStr = numStr.replace(/,/g, ".");
      // 3. Rimuovi comandi LaTeX e parentesi
      numStr = numStr
        .replace(/\\mathrm\{([^}]*)\}/g, "$1")
        .replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, "")
        .replace(/[{}]/g, "");
      // 4. Tieni solo cifre, punto decimale e segno meno (se consentito)
      if (allowNegative) {
        numStr = numStr.replace(/[^0-9.\-]/g, "");
        // Gestisci eventuali meno multipli: tieni solo il primo
        const minusCount = (numStr.match(/-/g) || []).length;
        if (minusCount > 1) {
          numStr = "-" + numStr.replace(/-/g, "");
        }
      } else {
        numStr = numStr.replace(/[^0-9.]/g, "");
      }
      // 5. Gestisci edge case: stringa vuota o solo un meno
      if (!numStr || numStr === "-" || numStr === ".") {
        setRecognizedText("?");
        setIsRecognizing(false);
        return;
      }

      const parsed = parseFloat(numStr);
      if (!isNaN(parsed)) {
        setRecognizedText(parsed.toString());
        onChange(parsed);
        setTimeout(() => setStrokes([]), 1200);
      } else {
        setRecognizedText(numStr || "?");
      }
    }
    setIsRecognizing(false);
  }, [strokes, recognize, isModelReady, onChange, allowNegative]);

  const handleClear = () => {
    setStrokes([]);
    setRecognizedText("");
    onChange(null);
  };

  const displayValue =
    value !== null && !isNaN(value)
      ? value.toString()
      : recognizedText || "";

  const hasContent = strokes.length > 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Quadratino del canvas */}
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

      {/* Colonna destra: label + Riconosci + valore */}
      <div className="flex flex-col items-center gap-1.5 flex-1">
        {/* Label sopra il pulsante */}
        <span className={cn(
          "text-base tracking-widest text-amber-900",
          colorClass,
        )}>
          {label}
        </span>

        {/* Pulsante Riconosci — compatto */}
        <button
          onClick={handleManualRecognize}
          disabled={!hasContent || !isModelReady || isRecognizing}
          className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-base font-bold tracking-widest transition-all shadow-sm"
        >
          {isRecognizing ? "..." : "RICONOSCI"}
        </button>

        {/* Valore riconosciuto + cancella */}
        <div className="flex items-center gap-2">
          {displayValue && (
            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-secondary text-base font-serif font-bold">
              {displayValue}
            </span>
          )}
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

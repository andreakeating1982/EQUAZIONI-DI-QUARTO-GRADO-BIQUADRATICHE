import { useCallback, useEffect, useRef, useState } from "react";
import type { Stroke } from "@/components/MathDrawCanvas";

export interface RecognitionResult {
  latex: string;
  tokenIds: number[];
  encoderMs: number;
  decoderMs: number;
  totalMs: number;
}

export type RecognitionMode = "auto" | "number" | "expression";

// Dynamic imports for ink-on — it loads ONNX Runtime Web
let InferenceEngine: any = null;
let preprocessStrokesFn: any = null;
let isStrokeMeaningfulFn: any = null;
let loadVocabFn: any = null;
let VocabType: any = null;
let repairLatexFn: any = null;
let decodeToTokenArrayFn: any = null;

async function ensureInkOn() {
  if (!InferenceEngine) {
    const mod = await import("ink-on/core");
    InferenceEngine = mod.InferenceEngine;
    preprocessStrokesFn = mod.preprocessStrokes;
    isStrokeMeaningfulFn = mod.isStrokeMeaningful;
    loadVocabFn = mod.loadVocab;
    repairLatexFn = mod.repairLatex;
    decodeToTokenArrayFn = mod.decodeToTokenArray;
  }
  return { InferenceEngine, preprocessStrokesFn, isStrokeMeaningfulFn, loadVocabFn, repairLatexFn, decodeToTokenArrayFn };
}

export function useMathRecognition() {
  const engineRef = useRef<any>(null);
  const vocabRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const recognizingRef = useRef(false);

  // Initialize engine
  useEffect(() => {
    let disposed = false;

    async function init() {
      try {
        setIsLoading(true);
        setLoadError(null);

        const { InferenceEngine: Eng, loadVocabFn: loadV } = await ensureInkOn();

        if (disposed) return;

        // Load vocab
        vocabRef.current = await loadV("/models/comer/vocab.json");

        if (disposed) return;

        // Create and init engine
        const engine = new Eng({
          encoderUrl: "/models/comer/encoder_int8.onnx",
          decoderUrl: "/models/comer/decoder_int8.onnx",
          beamWidth: 5,
          executionProvider: "wasm",
        });

        await engine.init();

        if (disposed) return;

        engineRef.current = engine;
        setIsModelReady(true);
        setIsLoading(false);
      } catch (err: any) {
        if (!disposed) {
          console.error("Failed to initialize math recognition:", err);
          setLoadError(
            err.message || "Impossibile caricare il modello di riconoscimento",
          );
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      disposed = true;
      if (engineRef.current) {
        try {
          engineRef.current.dispose();
        } catch (e) {
          // ignore
        }
        engineRef.current = null;
      }
    };
  }, []);

  const recognize = useCallback(
    async (
      strokes: Stroke[],
      mode: RecognitionMode = "auto",
    ): Promise<RecognitionResult | null> => {
      if (!engineRef.current || !vocabRef.current || !preprocessStrokesFn || !isStrokeMeaningfulFn) {
        return null;
      }

      if (recognizingRef.current) return null;

      try {
        recognizingRef.current = true;

        // Convert our Stroke format to ink-on's expected format
        const inkOnStrokes = strokes.map((s) => ({
          points: s.points.map((p) => ({ x: p.x, y: p.y })),
          lineWidth: s.lineWidth,
        }));

        if (!isStrokeMeaningfulFn(inkOnStrokes)) {
          recognizingRef.current = false;
          return null;
        }

        const input = preprocessStrokesFn(inkOnStrokes);
        const result = await engineRef.current.recognize(
          input,
          vocabRef.current,
          mode,
        );

        // Apply LaTeX repair to fix common recognition errors (e.g., digit 9)
        if (result && result.tokenIds && vocabRef.current && repairLatexFn && decodeToTokenArrayFn) {
          const tokens = decodeToTokenArrayFn(result.tokenIds, vocabRef.current);
          const repairedTokens = repairLatexFn(tokens);
          result.latex = repairedTokens.join('');
        }

        recognizingRef.current = false;
        return result as RecognitionResult;
      } catch (err) {
        console.error("Recognition error:", err);
        recognizingRef.current = false;
        return null;
      }
    },
    [],
  );

  return {
    recognize,
    isLoading,
    loadError,
    isModelReady,
  };
}

// Utility to render LaTeX with KaTeX in the browser
let katexInstance: any = null;

export async function renderLatex(latex: string): Promise<string> {
  if (!katexInstance) {
    katexInstance = await import("katex");
  }
  try {
    return katexInstance.default.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
      trust: true,
    });
  } catch {
    return latex;
  }
}

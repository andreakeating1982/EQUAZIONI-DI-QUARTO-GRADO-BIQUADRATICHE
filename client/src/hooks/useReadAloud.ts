import { useCallback, useEffect, useState } from "react";

/**
 * Lettura ad alta voce (Text-to-Speech) per l'inclusione (DSA/BES).
 *
 * Legge in italiano il contenuto testuale della pagina usando l'API Web Speech
 * (`speechSynthesis`). Il pulsante "Ascolto → Leggi" nella barra di accessibilità
 * avvia/interrompe la lettura.
 *
 * Accorgimenti per una lettura naturale e completa:
 *  - seleziona la migliore voce italiana disponibile (neurale/naturale se c'è);
 *  - legge TUTTA la pagina (header + contenuto), non solo il <main>;
 *  - rimuove la copia MathML nascosta di ogni formula KaTeX: è questa che faceva
 *    leggere ogni equazione DUE volte e con un ritmo spezzato/robotico;
 *  - ignora toolbar, pulsanti, campi e canvas (niente rumore).
 */

// Cache della voce migliore (caricata una sola volta).
let cachedVoice: SpeechSynthesisVoice | null = null;

/** Punteggio per scegliere la voce italiana meno "robotica" possibile. */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = (v.name || "").toLowerCase();
  let score = 0;
  if (/\b(google|microsoft|apple)\b/.test(name)) score += 4;
  if (/natural|neural|premium|enhanced|online|multilingual|expressive/.test(name)) score += 5;
  if (/elsa|diego|isabella|federica|luca|bianca|giorgio|paola|carla|francesca|alice|emma|elena|marco|giulia|alessio|stefano|giovanni|ilaria/.test(name)) score += 2;
  if (v.localService) score += 1;
  return score;
}

function pickBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const italian = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("it"));
  const pool = italian.length ? italian : voices;
  return [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null;
}

/**
 * Estrae il testo leggibile della pagina.
 * Lavora su un CLONE del DOM: possiamo rimuovere elementi senza toccare la UI.
 */
function getReadableText(): string {
  const clone = document.body.cloneNode(true) as HTMLElement;

  // Rumore: toolbar, pulsanti, campi, canvas/svg, script/stili.
  clone
    .querySelectorAll(
      '[role="toolbar"], button, input, textarea, select, script, style, noscript, canvas, svg, iframe'
    )
    .forEach((el) => el.remove());

  // Copia MathML nascosta di KaTeX: duplicava ogni equazione (lettura doppia
  // e spezzata). Teniamo solo la forma resa visivamente (.katex-html).
  clone.querySelectorAll(".katex-mathml").forEach((el) => el.remove());

  return (clone.innerText || "").replace(/\s+/g, " ").trim();
}

/** Divide il testo in frasi (per pause naturali e robustezza sui browser). */
function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?;:])\s+/);
  const chunks: string[] = [];
  let buffer = "";
  const MAX = 220;
  for (const part of parts) {
    if ((buffer + " " + part).trim().length > MAX && buffer) {
      chunks.push(buffer.trim());
      buffer = part;
    } else {
      buffer = (buffer + " " + part).trim();
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks.length ? chunks : [text];
}

export interface UseReadAloudResult {
  speaking: boolean;
  supported: boolean;
  toggle: () => void;
  stop: () => void;
}

export function useReadAloud(): UseReadAloudResult {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  // Carica le voci (su alcuni browser arrivano in modo asincrono).
  useEffect(() => {
    if (!supported) return;
    const load = () => {
      if (!cachedVoice) cachedVoice = pickBestVoice();
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, [supported]);

  // Interrompe la lettura quando il componente si smonta.
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const toggle = useCallback(() => {
    if (!supported) return;
    if (window.speechSynthesis.speaking) {
      stop();
      return;
    }

    const text = getReadableText();
    if (!text) return;

    if (!cachedVoice) cachedVoice = pickBestVoice();

    const chunks = splitSentences(text);
    const total = chunks.length;

    window.speechSynthesis.cancel(); // evita sovrapposizioni

    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = "it-IT";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      if (cachedVoice) utterance.voice = cachedVoice;

      if (index === 0) utterance.onstart = () => setSpeaking(true);
      if (index === total - 1) {
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
      } else {
        // Se una frase intermedia fallisce, prosegue con le successive.
        utterance.onerror = () => undefined;
      }

      window.speechSynthesis.speak(utterance);
    });
  }, [supported, stop]);

  return { speaking, supported, toggle, stop };
}

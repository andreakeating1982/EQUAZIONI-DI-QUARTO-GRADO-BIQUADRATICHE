import { useCallback, useEffect, useState } from "react";

/**
 * Lettura ad alta voce (Text-to-Speech) per l'inclusione (DSA/BES).
 *
 * Legge in italiano il contenuto testuale della pagina usando l'API Web Speech
 * (`speechSynthesis`). Il pulsante "Ascolto → Leggi" nella barra di accessibilità
 * avvia/interrompe la lettura.
 *
 * Aggiunto come misura di inclusione aggiuntiva: uno studente con dislessia può
 * ascoltare le consegne degli esercizi invece di leggerle.
 */

/** Estrae il testo leggibile della pagina (esclude toolbar, pulsanti e form). */
function getReadableText(): string {
  // Preferisce il landmark <main>; altrimenti usa l'intero body.
  const main = document.querySelector("main");
  const source = (main ?? document.body) as HTMLElement;
  const clone = source.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll(
      '[role="toolbar"], button, input, textarea, select, script, style, noscript'
    )
    .forEach((el) => el.remove());
  return (clone.innerText || "").replace(/\s+/g, " ").trim();
}

export interface UseReadAloudResult {
  speaking: boolean;
  supported: boolean;
  toggle: () => void;
  stop: () => void;
}

export function useReadAloud(): UseReadAloudResult {
  const [speaking, setSpeaking] = useState(false);
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "it-IT";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel(); // evita sovrapposizioni di letture
    window.speechSynthesis.speak(utterance);
  }, [supported, stop]);

  return { speaking, supported, toggle, stop };
}

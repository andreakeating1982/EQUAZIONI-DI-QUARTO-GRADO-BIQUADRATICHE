import { AlignJustify, Contrast, Ruler, Type, Volume2 } from "lucide-react";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useReadAloud } from "@/hooks/useReadAloud";

/**
 * Barra di accessibilità (stile Cornice Universale, adattata alla palette
 * plum/gold dell'app WIDGET MATEMATICO SORGENTE).
 *
 * Ogni gruppo (etichetta + comandi) è un blocco unico "whitespace-nowrap":
 * l'etichetta NON scende mai sotto i propri pulsanti, anche quando la barra
 * si restringe (i gruppi vanno a capo come blocchi interi).
 *
 * Usa le variabili semantiche del tema (border, card, foreground, primary)
 * così si adatta automaticamente al tema chiaro/scuro dell'app.
 */
export function AccessibilityToolbar() {
  const acc = useAccessibility();
  const readAloud = useReadAloud();

  const groupCls =
    "flex items-center gap-1 whitespace-nowrap rounded-lg border border-border bg-background/90 px-2 py-1";
  const labelCls =
    "flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground";
  const btnCls =
    "grid h-6 min-w-6 place-items-center rounded-md border border-border px-1 text-[11px] font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-3 focus-visible:outline-ring";
  const activeBtnCls =
    "grid h-6 min-w-6 place-items-center rounded-md border border-primary bg-primary px-1 text-[11px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-3 focus-visible:outline-ring";

  return (
    <div
      role="toolbar"
      aria-label="Barra di accessibilità: font, interlinea, righello e modalità"
      className="relative z-10 mx-auto mb-1 mt-2 flex w-fit max-w-[calc(100vw-1rem)] flex-wrap items-center justify-center gap-1.5 rounded-2xl border-2 border-border bg-card/95 px-2.5 py-2 shadow-lg backdrop-blur-sm"
    >
      {/* FONT: dimensione del testo */}
      <div className={groupCls}>
        <span className={labelCls}>
          <Type className="h-3 w-3" />
          Font
        </span>
        <button
          type="button"
          onClick={() => acc.setFontScale(acc.fontScale - 0.1)}
          className={btnCls}
          aria-label="Riduci la dimensione del testo"
          title="Riduci il testo"
        >
          A−
        </button>
        <span
          className="min-w-[2.6rem] text-center text-[11px] font-bold text-foreground"
          aria-live="polite"
        >
          {Math.round(acc.fontScale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => acc.setFontScale(acc.fontScale + 0.1)}
          className={btnCls}
          aria-label="Aumenta la dimensione del testo"
          title="Ingrandisci il testo"
        >
          A+
        </button>
      </div>

      {/* INTERLINEA */}
      <div className={groupCls}>
        <span className={labelCls}>
          <AlignJustify className="h-3 w-3" />
          Interlinea
        </span>
        <button
          type="button"
          onClick={acc.cycleLineHeight}
          className={btnCls}
          aria-label="Cambia l'interlinea del testo"
          title="Cambia l'interlinea"
        >
          {acc.lineHeight.toFixed(1).replace(".", ",")}
        </button>
      </div>

      {/* RIGHELLO: banda di lettura che segue il mouse */}
      <div className={groupCls}>
        <span className={labelCls}>
          <Ruler className="h-3 w-3" />
          Righello
        </span>
        <button
          type="button"
          onClick={acc.toggleRuler}
          className={acc.ruler ? activeBtnCls : btnCls}
          aria-pressed={acc.ruler}
          aria-label="Attiva o disattiva il righello di lettura"
          title="Righello di lettura"
        >
          {acc.ruler ? "ON" : "OFF"}
        </button>
      </div>

      {/* MODALITÀ: normale / alto contrasto */}
      <div className={groupCls}>
        <span className={labelCls}>
          <Contrast className="h-3 w-3" />
          Modalità
        </span>
        <button
          type="button"
          onClick={acc.cycleMode}
          className={acc.mode === "contrasto" ? activeBtnCls : btnCls}
          aria-pressed={acc.mode === "contrasto"}
          aria-label="Cambia la modalità di lettura"
          title="Modalità di lettura"
        >
          {acc.mode === "contrasto" ? "Contrasto" : "Normale"}
        </button>
      </div>

      {/* ASCOLTO: lettura ad alta voce (text-to-speech) per DSA */}
      <div className={groupCls}>
        <span className={labelCls}>
          <Volume2 className="h-3 w-3" />
          Ascolto
        </span>
        <button
          type="button"
          onClick={readAloud.toggle}
          className={readAloud.speaking ? activeBtnCls : btnCls}
          aria-pressed={readAloud.speaking}
          aria-label={readAloud.speaking ? "Interrompi la lettura ad alta voce" : "Leggi il testo ad alta voce"}
          title={readAloud.speaking ? "Interrompi la lettura" : "Leggi ad alta voce"}
        >
          {readAloud.speaking ? "Stop" : "Leggi"}
        </button>
      </div>
    </div>
  );
}

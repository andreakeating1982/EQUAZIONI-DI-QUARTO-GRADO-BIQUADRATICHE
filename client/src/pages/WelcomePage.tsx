import { BookOpen, Shuffle } from "lucide-react";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";

/** Genera coefficienti casuali validi per un'equazione biquadratica */
function generaCoefficientiCasuali(): { a: number; b: number; c: number } {
  for (let attempt = 0; attempt < 500; attempt++) {
    // a: intero tra 1 e 5 (non zero, evitiamo frazioni per semplicità)
    const a = [1, 1, 2, 2, 3, 4, 5][Math.floor(Math.random() * 7)];
    // b: intero tra -12 e 12
    const b = Math.floor(Math.random() * 25) - 12;
    // c: intero tra -20 e 20
    const c = Math.floor(Math.random() * 41) - 20;

    if (a === 0) continue;

    const delta = b * b - 4 * a * c;

    // Δ >= 0 (soluzioni reali per t)
    if (delta < 0) continue;

    const sqrtDelta = Math.sqrt(delta);
    const t1 = (-b + sqrtDelta) / (2 * a);
    const t2 = (-b - sqrtDelta) / (2 * a);

    // Almeno un t > 0 (per avere radici reali in x)
    if (t1 <= 0 && t2 <= 0) continue;

    return { a, b, c };
  }

  // Fallback sicuro
  return { a: 1, b: -5, c: 4 };
}

export default function WelcomePage() {
  const [, navigate] = useLocation();

  const [coeffA, setCoeffA] = useState("");
  const [coeffB, setCoeffB] = useState("");
  const [coeffC, setCoeffC] = useState("");
  const [nome, setNome] = useState("");

  const handleInizia = useCallback(() => {
    const a = parseInt(coeffA);
    const b = parseInt(coeffB);
    const c = parseInt(coeffC);

    if (isNaN(a) || isNaN(b) || isNaN(c) || a === 0) {
      // Se campi vuoti o a==0, genera casuale
      const rand = generaCoefficientiCasuali();
      const params = new URLSearchParams({
        a: String(rand.a),
        b: String(rand.b),
        c: String(rand.c),
      });
      if (nome.trim()) params.set("nome", nome.trim());
      navigate(`/esercizio?${params.toString()}`);
      return;
    }

    // Verifica che l'equazione abbia soluzioni reali
    const delta = b * b - 4 * a * c;
    const params = new URLSearchParams({
      a: String(a),
      b: String(b),
      c: String(c),
    });
    if (nome.trim()) params.set("nome", nome.trim());
    navigate(`/esercizio?${params.toString()}`);
  }, [coeffA, coeffB, coeffC, nome, navigate]);

  const handleGeneraCasuale = useCallback(() => {
    const rand = generaCoefficientiCasuali();
    setCoeffA(String(rand.a));
    setCoeffB(String(rand.b));
    setCoeffC(String(rand.c));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleInizia();
    },
    [handleInizia],
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-stone-200 overflow-hidden">
        {/* Header con icona libro */}
        <div className="flex flex-col items-center pt-10 pb-6 px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen className="w-9 h-9 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-wide text-foreground text-center">
            EQUAZIONI BIQUADRATICHE
          </h1>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            INSERISCI I COEFFICIENTI DELL'EQUAZIONE
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1 text-center font-mono">
            ax⁴ + bx² + c = 0
          </p>
        </div>

        {/* Griglia input 2×2 */}
        <div className="px-6 pb-2">
          <div className="grid grid-cols-2 gap-3">
            {/* a (x⁴) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                a (x⁴)
              </label>
              <input
                type="number"
                value={coeffA}
                onChange={(e) => setCoeffA(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="es. 2"
                className="h-11 px-3 rounded-xl border border-stone-300 bg-stone-50 text-foreground text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {/* b (x²) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                b (x²)
              </label>
              <input
                type="number"
                value={coeffB}
                onChange={(e) => setCoeffB(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="es. -3"
                className="h-11 px-3 rounded-xl border border-stone-300 bg-stone-50 text-foreground text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {/* c (costante) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                c (costante)
              </label>
              <input
                type="number"
                value={coeffC}
                onChange={(e) => setCoeffC(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="es. 1"
                className="h-11 px-3 rounded-xl border border-stone-300 bg-stone-50 text-foreground text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {/* Nome */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nome
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="(opzionale)"
                className="h-11 px-3 rounded-xl border border-stone-300 bg-stone-50 text-foreground text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {/* Pulsanti */}
        <div className="px-6 pt-4 pb-8 flex flex-col gap-3">
          <button
            onClick={handleInizia}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base tracking-widest transition-all shadow-sm"
          >
            INIZIA ESERCIZIO
          </button>

          <button
            onClick={handleGeneraCasuale}
            className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-sm tracking-wide transition-all flex items-center justify-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            GENERA EQUAZIONE CASUALE
          </button>
        </div>
      </div>
    </div>
  );
}

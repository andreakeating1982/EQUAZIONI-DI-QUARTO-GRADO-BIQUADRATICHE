import { BookOpen } from "lucide-react";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";

/** Formatta la data di oggi in formato italiano gg/mm/aaaa */
function getOggi(): string {
  const oggi = new Date();
  const gg = String(oggi.getDate()).padStart(2, "0");
  const mm = String(oggi.getMonth() + 1).padStart(2, "0");
  const aaaa = oggi.getFullYear();
  return `${gg}/${mm}/${aaaa}`;
}

export default function WelcomePage() {
  const [, navigate] = useLocation();

  const [cognome, setCognome] = useState("");
  const [nome, setNome] = useState("");
  const [data, setData] = useState(getOggi());
  const [classe, setClasse] = useState("");

  const handleEntra = useCallback(() => {
    const params = new URLSearchParams();
    if (cognome.trim()) params.set("cognome", cognome.trim());
    if (nome.trim()) params.set("nome", nome.trim());
    if (data.trim()) params.set("data", data.trim());
    if (classe.trim()) params.set("classe", classe.trim());
    navigate(`/esercizio?${params.toString()}`);
  }, [cognome, nome, data, classe, navigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleEntra();
    },
    [handleEntra],
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F2EC] p-4">
      <div className="w-full max-w-md bg-[#FAF8F5] rounded-[20px] shadow-lg px-10 pt-12 pb-8">
        {/* Icona libro */}
        <div className="flex justify-center mb-5">
          <div className="w-[60px] h-[60px] rounded-xl bg-[#EEDDD6] flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-[#7A3E2A]" strokeWidth={1.8} />
          </div>
        </div>

        {/* Titolo */}
        <h1 className="text-center font-serif text-[26px] font-bold tracking-[0.08em] text-[#2C221E] mb-1.5">
          EQUAZIONI<br />BIQUADRATICHE
        </h1>

        {/* Sottotitolo */}
        <p className="text-center text-[13px] tracking-[0.05em] text-[#2C221E] mb-8">
          RISOLVI LE EQUAZIONI IN{" "}
          <span className="text-[#A04830] font-semibold">7 PASSI</span>
        </p>

        {/* Griglia input 2×2 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Cognome */}
          <input
            type="text"
            value={cognome}
            onChange={(e) => setCognome(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cognome"
            className="h-[46px] px-3.5 rounded-lg border border-[#D3C7BD] bg-white text-[#2C221E] text-sm font-medium placeholder:text-[#7A7570] focus:outline-none focus:ring-2 focus:ring-[#D5B5A3]/40 focus:border-[#D5B5A3] transition-all"
          />
          {/* Nome */}
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nome"
            className="h-[46px] px-3.5 rounded-lg border border-[#D3C7BD] bg-white text-[#2C221E] text-sm font-medium placeholder:text-[#7A7570] focus:outline-none focus:ring-2 focus:ring-[#D5B5A3]/40 focus:border-[#D5B5A3] transition-all"
          />
          {/* Data */}
          <input
            type="text"
            value={data}
            onChange={(e) => setData(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-[46px] px-3.5 rounded-lg border border-[#D3C7BD] bg-white text-[#2C221E] text-sm font-medium placeholder:text-[#7A7570] focus:outline-none focus:ring-2 focus:ring-[#D5B5A3]/40 focus:border-[#D5B5A3] transition-all"
          />
          {/* Classe */}
          <input
            type="text"
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Classe (es. 2A)"
            className="h-[46px] px-3.5 rounded-lg border border-[#D3C7BD] bg-white text-[#2C221E] text-sm font-medium placeholder:text-[#7A7570] focus:outline-none focus:ring-2 focus:ring-[#D5B5A3]/40 focus:border-[#D5B5A3] transition-all"
          />
        </div>

        {/* Pulsante ENTRA */}
        <button
          onClick={handleEntra}
          className="w-full h-[46px] rounded-lg bg-[#D5B5A3] hover:bg-[#C9A591] text-white font-bold text-sm tracking-[0.1em] transition-all shadow-sm"
        >
          ENTRA
        </button>
      </div>
    </div>
  );
}

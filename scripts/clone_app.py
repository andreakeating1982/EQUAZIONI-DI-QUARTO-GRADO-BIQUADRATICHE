#!/usr/bin/env python3
"""
clone_app.py — Clona l'app WIDGET MATEMATICO SORGENTE (equazioni-biquadratiche)
in una NUOVA app identica cambiando SOLO il grado dell'equazione.

L'app sorgente risolve equazioni della forma  a·x^(2k) + b·x^k + c = 0
con sostituzione t = x^k. Il sorgente attuale è k=2 (grado 4, biquadratica).

Grado → k:  2→1 (quadratica), 4→2 (biquadratica), 6→3 (bicubica), 8→4, ...

USO:
  python3 clone_app.py --name "equazioni-secondo-grado" --degree 2
  python3 clone_app.py --name "equazioni-sesto-grado" --degree 6
  python3 clone_app.py --source /home/user/equazioni-biquadratiche \
                       --name "mio-widget" --degree 4
  python3 clone_app.py --source https://github.com/utente/repo.git \
                       --name "mio-widget" --degree 6

ATTENZIONE: questo script esegue le sostituzioni MECCANICHE (potenze, titoli,
placeholder, testo della sostituzione). NON modifica la logica matematica della
radice (passo 6: Math.sqrt / \\sqrt). Al termine stampa una CHECKLIST dei passi
manuali rimasti — leggerla e completarli prima del build. Per i dettagli vedere
references/grado.md.
"""

import argparse
import os
import re
import shutil
import subprocess
import sys

SORGENTE_DEFAULT = "/home/user/equazioni-biquadratiche"

# Nome italiano del grado per i titoli
GRADO_NOME = {
    2: "SECONDO",
    4: "QUARTO",
    6: "SESTO",
    8: "OTTAVO",
    10: "DECIMO",
    12: "DODICESIMO",
}

# Nome della "trinomia" per il grado (solo per gradi ≥ 4 pari)
TRINOMIA_NOME = {
    4: "TRINOMIE BIQUADRATICHE",
    6: "TRINOMIE BICUBICHE",
    8: "TRINOMIE BIOCTICHE",
}

SUPERSCRIPT = {
    "0": "\u2070", "1": "\u00B9", "2": "\u00B2", "3": "\u00B3", "4": "\u2074",
    "5": "\u2075", "6": "\u2076", "7": "\u2077", "8": "\u2078", "9": "\u2079",
}


def sup(n: int) -> str:
    return "".join(SUPERSCRIPT[d] for d in str(n))


def copia_sorgente(source: str, dest: str) -> None:
    """Copia la sorgente (cartella locale o repo git) in dest."""
    if os.path.isdir(source):
        if os.path.exists(dest):
            print(f"[ERRORE] La destinazione esiste già: {dest}")
            sys.exit(1)
        shutil.copytree(
            source, dest,
            ignore=shutil.ignore_patterns(
                "node_modules", "dist", ".git", "dev-server.log",
                "__pycache__", "*.zip",
            ),
        )
        print(f"[OK] Cartella copiata da {source} → {dest}")
    else:
        # Assumiamo sia un URL git
        subprocess.run(
            ["git", "clone", source, dest], check=True,
        )
        print(f"[OK] Repo clonato da {source} → {dest}")


def trova_root_app(base: str) -> str:
    """Trova la cartella contenente package.json (a base o un livello sotto).

    Utile quando il repo GitHub ha l'app in una subfolder invece della root.
    """
    if os.path.isfile(os.path.join(base, "package.json")):
        return base
    try:
        entries = os.listdir(base)
    except OSError:
        return base
    for d in sorted(entries):
        full = os.path.join(base, d)
        if os.path.isdir(full) and os.path.isfile(os.path.join(full, "package.json")):
            return full
    return base


def build_replacements(k: int) -> list[tuple[str, str]]:
    """Restituisce le coppie (vecchio, nuovo) ordinate dalla più specifica.

    L'ordine conta: i token lunghi (x^{4}, x^{2}) vanno prima dei token più
    corti, e MAI fare replace di cifre singole '4'/'2' (romperebbe 4ac, ecc.).
    """
    deg = 2 * k
    d2 = str(deg)          # es. "6" per k=3
    kstr = str(k)          # es. "3" per k=3
    sup_deg = sup(deg)     # es. "⁶"
    sup_k = sup(k)         # es. "³"

    r = []

    # 1) Parser — include() sulle potenze (case x e X, con/ senza braccia, unicode)
    for base in ("x", "X"):
        r.append((f"{base}^{{4}}", f"{base}^{{{d2}}}"))
        r.append((f"{base}^{{2}}", f"{base}^{{{kstr}}}"))
        r.append((f"{base}^4", f"{base}^{{{d2}}}"))
        r.append((f"{base}^2", f"{base}^{{{kstr}}}"))
        r.append((f"{base}\u2074", f"{base}{sup_deg}"))
        r.append((f"{base}\u00B2", f"{base}{sup_k}"))

    # 2) Parser — power = 4 / power = 2 (assegnazione esplicita)
    r.append(("power = 4", f"power = {deg}"))
    r.append(("power = 2", f"power = {k}"))

    # 3) Parser — flag foundX4 / foundX2
    r.append(("foundX4", f"foundX{deg}"))
    r.append(("foundX2", f"foundX{k}"))

    # 4) Parser — regex di pulizia coefficiente
    r.append((r"[xX]\^\{4\}", rf"[xX]\^{{{d2}}}"))
    r.append((r"[xX]\^\{2\}", rf"[xX]\^{{{kstr}}}"))
    r.append((r"[xX]\^4", rf"[xX]\^{{{d2}}}"))
    r.append((r"[xX]\^2", rf"[xX]\^{{{kstr}}}"))
    r.append(("[xX]\u2074", f"[xX]{sup_deg}"))
    r.append(("[xX]\u00B2", f"[xX]{sup_k}"))

    # 5) builder equazione — "x^{4}" / "x^{2}"
    r.append(('"x^{4}"', f'"x^{{{d2}}}"'))
    r.append(('"x^{2}"', f'"x^{{{kstr}}}"'))

    # 6) Testo della sostituzione (passo 2)
    r.append(("t = x\u00B2", f"t = x{sup_k}"))
    r.append(("x\u00B2 = t", f"x{sup_k} = t"))
    r.append(("x\u2074 = t\u00B2", f"x{sup_deg} = t\u00B2"))
    r.append(("t = x^{2}", f"t = x^{{{kstr}}}"))
    r.append(("x^{2} = t", f"x^{{{kstr}}} = t"))
    r.append(("x^{4} = t^{2}", f"x^{{{d2}}} = t^{{2}}"))

    # 7) Titoli (header, WelcomePage)
    nome_grado = GRADO_NOME.get(deg, f"DI GRADO {deg}")
    r.append(("EQUAZIONI DI QUARTO GRADO &nbsp;·&nbsp; TRINOMIE BIQUADRATICHE",
              f"EQUAZIONI DI {nome_grado} GRADO"))
    r.append(("EQUAZIONI DI QUARTO GRADO<br />TRINOMIE BIQUADRATICHE",
              f"EQUAZIONI DI {nome_grado} GRADO"))
    r.append(("EQUAZIONI DI QUARTO GRADO", f"EQUAZIONI DI {nome_grado} GRADO"))
    if deg in TRINOMIA_NOME:
        r.append(("TRINOMIE BIQUADRATICHE", TRINOMIA_NOME[deg]))

    # 8) Hint e placeholder (esempio di equazione)
    r.append(("2x\u2074\u22123x\u00B2+1=0", f"2x{sup_deg}\u22123x{sup_k}+1=0"))
    r.append(("es. 2x^4-3x^2+1=0", f"es. 2x^{{{d2}}}-3x^{{{kstr}}}+1=0"))

    return r


def applica_sostituzioni(root: str, k: int) -> int:
    """Applica le sostituzioni ai file sorgente. Ritorna il numero di file toccati."""
    sost = build_replacements(k)
    target_ext = (".tsx", ".ts", ".html", ".md")
    count = 0

    for dirpath, _dirs, files in os.walk(root):
        if "node_modules" in dirpath or "dist" in dirpath or ".git" in dirpath:
            continue
        for fname in files:
            if not fname.endswith(target_ext):
                continue
            path = os.path.join(dirpath, fname)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    testo = f.read()
            except UnicodeDecodeError:
                continue
            originale = testo
            for vecchio, nuovo in sost:
                testo = testo.replace(vecchio, nuovo)
            if testo != originale:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(testo)
                count += 1
    return count


def checklist_manuale(k: int, deg: int) -> str:
    """Restituisce la checklist dei passi manuali che lo script NON esegue."""
    righe = []

    if k == 1:
        righe += [
            "SPECIALE k=1 (grado 2, quadratica): NON esiste sostituzione.",
            "  - Rimuovere/aggirare il PASSO 2 'VARIABILE AUSILIARIA t = x' (t coincide con x).",
            "  - Rimuovere il PASSO 6 di estrazione radice: x = t direttamente.",
            "  - I passi diventano: equazione → delta → t₁=x₁ → t₂=x₂ → verifica (5 passi).",
            "  - Aggiornare '7 PASSI' → '5 PASSI' in WelcomePage.tsx.",
        ]

    # Estrazione radice (passo 6)
    if k == 2:
        righe += [
            "Estrazione radice (k=2): x = ±√t → NESSUNA modifica necessaria (già corretto).",
        ]
    elif k % 2 == 0:
        righe += [
            f"Estrazione radice (k={k} pari): x = ±√[k]t.",
            "  - Sostituire '\\\\pm\\\\sqrt{t' con '\\\\pm\\\\sqrt[k]{{t' in BiquadraticExercises.tsx.",
            "  - Sostituire 'Math.sqrt(' con 'Math.pow(..., 1/k)' dove calcola x da t.",
        ]
    else:
        righe += [
            f"Estrazione radice (k={k} dispari): x = ∛t (radice k-esima, SENZA ±).",
            "  - Rimuovere '\\\\pm' davanti alla radice k-esima.",
            "  - Sostituire '\\\\sqrt{t' con '\\\\sqrt[k]{{t'.",
            "  - Sostituire 'Math.sqrt(' con 'Math.pow(..., 1/k)' (una sola radice reale).",
            "  - Per k dispari t può essere qualsiasi reale (non serve t ≥ 0).",
        ]

    righe += [
        "",
        "VERIFICA GENERALE:",
        "  - pnpm check  (TypeScript deve passare)",
        "  - Cercare residui '4'/'2' come potenze: grep -rn 'x^{4}\\|x^{2}\\|x⁴\\|x²' client/src",
        "  - Aggiornare il titolo <h1> e WelcomePage se il nome 'TRINOMIA' non è corretto.",
        "  - Rinominare componenti/interface se serve coerenza (BiquadraticExercises → Esercizi, ecc.).",
    ]
    return "\n".join(righe)


def main() -> None:
    p = argparse.ArgumentParser(description="Clona WIDGET MATEMATICO SORGENTE con grado diverso")
    p.add_argument("--source", default=SORGENTE_DEFAULT,
                   help="Cartella locale o URL git della sorgente (default: %(default)s)")
    p.add_argument("--name", required=True,
                   help="Nome della nuova cartella/app (senza spazi, es. equazioni-sesto-grado)")
    p.add_argument("--degree", required=True, type=int,
                   help="Grado dell'equazione (pari, >= 2): 2, 4, 6, 8...")
    p.add_argument("--dest", default=None,
                   help="Percorso destinazione (default: /home/user/<name>)")
    args = p.parse_args()

    if args.degree < 2 or args.degree % 2 != 0:
        print("[ERRORE] Il grado deve essere un numero pari >= 2 (2, 4, 6, 8...).")
        sys.exit(1)

    k = args.degree // 2
    dest = args.dest or f"/home/user/{args.name}"

    print(f"[INFO] Clono con grado {args.degree} → k = {k} (t = x^{k})")
    copia_sorgente(args.source, dest)

    root = trova_root_app(dest)
    if root != dest:
        print(f"[INFO] App trovata in subfolder: {os.path.relpath(root, dest)}")
    else:
        print(f"[INFO] App trovata alla root del repository/percorso.")

    n = applica_sostituzioni(root, k)
    print(f"[OK] Sostituzioni applicate a {n} file.")

    print("\n" + "=" * 70)
    print("CHECKLIST PASSI MANUALI (leggerla e completarla PRIMA del build)")
    print("=" * 70)
    print(checklist_manuale(k, args.degree))
    print("=" * 70)
    print(f"\n[FATTO] App clonata in {dest}")
    print("Prossimi comandi:")
    print(f"  cd {dest} && pnpm install && pnpm check && pnpm dev")


if __name__ == "__main__":
    main()

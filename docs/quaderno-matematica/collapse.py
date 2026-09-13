#!/usr/bin/env python3
"""Collassa i temi da 2 pagine con totale 106-120% su UNA pagina:
aggiunge 'ristretta compact' (o upgrade 'tight' se già presenti) alla sezione.
Uso: python3 collapse.py  → applica la lista TEMI e ricostruisce."""
import re, subprocess, sys

# ── GUARDIA: il quaderno usa il FLUSSO CONTINUO (nessun salto forzato tra temi) ──
import os as _os, sys as _sys
_css_path = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "styles.css")
if _os.path.exists(_css_path) and "break-after: auto" in open(_css_path, encoding="utf-8").read():
    print("DEPRECATO: il quaderno ora usa il FLUSSO CONTINUO (i temi scorrono, banner break-after: avoid).")
    print("Questo script serve solo per la vecchia impaginazione 'un tema = una pagina': NON eseguirlo,")
    print("i salti/ristrette che aggiunge romperebbero il flusso (pagine nominate = interruzioni forzate).")
    _sys.exit(0)


D = "/home/user/quaderno-matematica/"
FILES = ["00-copertina.html", "01-indice.html", "02-anno1a.html", "03-anno1b.html",
         "04-anno2.html", "05-anno3.html", "06-anno4.html", "07-anno5.html"]

# (frammento h2, classe da garantire)
TEMI = [
    ("NUMERI DECIMALI E POTENZE", "tight"),        # già ristretta compact → upgrade
    ("LE FUNZIONI E I LORO GRAFICI", "tight"),     # già ristretta compact → upgrade
    ("LE AREE DELLE FIGURE PIANE", "ristretta compact"),
    ("IL TEOREMA DI PITAGORA", "ristretta compact"),
    ("LE PROPORZIONI", "ristretta compact"),
    ("LA RETTA E LA PARABOLA", "ristretta compact"),
    ("LA PROBABILITÀ", "ristretta compact"),
    ("INTERESSI E MATEMATICA FINANZIARIA", "ristretta compact"),
    ("RIEPILOGO E VERIFICA · ANNO 5", "ristretta compact"),
]

def find_section(head_text):
    frag = head_text.strip()[:24]
    pat = "(?:&[a-zA-Z#0-9]+;)?".join(re.escape(c) for c in frag)
    rx = re.compile(r"<h2[^>]*>\s*" + pat, re.IGNORECASE)
    for f in FILES:
        s = open(D + f, encoding="utf-8").read()
        m = rx.search(s)
        if not m: continue
        openers = list(re.finditer(r'<section class="page[^"]*"', s[:m.start()]))
        if openers:
            o = openers[-1]
            return f, (o.start(), o.group(0)), s
    return None

def ensure_classes(f, opener, wanted, s):
    tag_start, raw = opener  # raw = '<section class="page ..."' completo
    m2 = re.search(r'class="([^"]*)"', raw)
    cls = m2.group(1)
    add = [w for w in wanted.split() if w not in cls.split()]
    if not add: return None
    ins = tag_start + m2.start(1) + len(cls)
    return s[:ins] + " " + " ".join(add) + s[ins:]

changed = 0
for head, wanted in TEMI:
    r = find_section(head)
    if not r:
        print("!! sezione non trovata:", head); continue
    f, opener, s = r
    tag_start, _raw = opener
    s2 = ensure_classes(f, opener, wanted, s)
    if s2:
        open(D + f, "w", encoding="utf-8").write(s2)
        changed += 1
        cur = re.search(r'class="page([^"]*)"', s2[tag_start:tag_start+120])
        print(f"  {head[:38]:40} → class=\"page{cur.group(1)}\"")
    else:
        print(f"  {head[:38]:40} → già a posto")
print("modificate:", changed, "sezioni")
if changed:
    subprocess.run(["python3", D + "build.py"])

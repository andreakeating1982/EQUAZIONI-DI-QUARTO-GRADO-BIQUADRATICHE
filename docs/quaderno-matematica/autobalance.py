#!/usr/bin/env python3
"""Bilancia i temi che occupano due pagine: se la pagina di continuazione è spoglia
(<550 caratteri), sposta il salto di pagina 1-2 box prima, così entrambe le pagine
del tema risultano piene al ~60%. I box restano sempre interi (break-inside: avoid)."""
import re, subprocess

D = "/home/user/quaderno-matematica/"
FILES = ["00-copertina.html", "01-indice.html", "02-anno1a.html", "03-anno1b.html",
         "04-anno2.html", "05-anno3.html", "06-anno4.html", "07-anno5.html"]

def build():
    subprocess.run(["python3", D + "build.py"], capture_output=True)

def page_texts():
    out = subprocess.run(["pdftotext", "-layout", D + "quaderno-matematica-facile.pdf", "-"],
                         capture_output=True, text=True).stdout
    return out.split(chr(12))[:-1]

def norm(s):
    return re.sub(r"\s+", " ", s.strip().upper())

def first_line(p):
    for l in p.strip().split("\n"):
        if l.strip():
            return norm(l)
    return ""

def expected_heads():
    heads = set()
    for f in FILES:
        s = open(D + f, encoding="utf-8").read()
        for m in re.finditer(r"<h2[^>]*>(.*?)</h2>", s, re.S):
            t = norm(re.sub(r"<[^>]+>", "", m.group(1)))
            if t:
                heads.add(t[:22])
        for m in re.finditer(r'class="anno-titolo[^"]*">(.*?)</span>', s, re.S):
            heads.add(norm(re.sub(r"<[^>]+>", "", m.group(1)))[:6])
        heads.add("MATEMATICA"); heads.add("INDICE")
    return heads

HEADS = expected_heads()

def starts_head(p):
    fl = first_line(p)
    return any(fl.startswith(h) for h in HEADS) or bool(re.search(r"\d+$", fl))

def find_section(head_text):
    frag = head_text.strip()[:24]
    pat = "(?:&[a-zA-Z#0-9]+;)?".join(re.escape(c) for c in frag)
    for rx in (re.compile(r"<h2[^>]*>\s*" + pat, re.IGNORECASE),
               re.compile(r'class="anno-titolo[^"]*">\s*' + re.escape(frag[:6]), re.IGNORECASE)):
        for f in FILES:
            s = open(D + f, encoding="utf-8").read()
            m = rx.search(s)
            if not m:
                continue
            openers = list(re.finditer(r'<(?:div|section) class="page([^"]*)"', s[:m.start()]))
            if openers:
                return f, openers[-1], s
    return None

TOPLEVEL = re.compile(r'(?m)^  <(div|table|figure|header|ul|ol)\b[^>]*')

def section_children(s, sec_start, sec_end):
    """Aperture degli elementi figli diretti (indentazione 2 spazi) della sezione."""
    body = s[sec_start:sec_end]
    return [(m.start() + sec_start, m.group(0)) for m in TOPLEVEL.finditer(body)]

def add_salto(s, opener):
    """Inserisce la classe salto nell'elemento indicato."""
    tag_start, raw = opener
    mcls = re.search(r'class="([^"]*)"', raw)
    if mcls:
        ins = tag_start + mcls.start(1) + len(mcls.group(1))
        if "salto" in mcls.group(1):
            return None
        return s[:ins] + " salto" + s[ins:]
    # nessun attributo class: aggiungilo dopo il nome del tag
    mt = re.search(r'<[a-z]+', raw)
    ins = tag_start + mt.end()
    return s[:ins] + ' class="salto"' + s[ins:]

build()
for it in range(1, 5):
    pages = page_texts()
    # continuazioni spoglie: pagina che non inizia con una testa e ha poco contenuto
    sparse = [i for i, p in enumerate(pages, 1)
              if not starts_head(p) and len(p.strip()) < 550]
    if not sparse:
        print(f"passata {it}: tutte le continuazioni sono piene — OK ({len(pages)} pagine)")
        break
    print(f"passata {it}: {len(pages)} pagine · continuazioni spoglie: {sparse}")
    changed = 0
    for num in sparse:
        j = num - 1
        while j > 1 and not starts_head(pages[j - 1]):
            j -= 1
        head_txt = first_line(pages[j - 1])
        r = find_section(head_txt)
        if not r:
            print(f"  !! sezione non trovata per p.{num}")
            continue
        f, secm, s = r
        # fine della sezione: apertura della sezione successiva
        nxt = re.search(r'<(?:div|section) class="page', s[secm.end():])
        sec_end = secm.end() + (nxt.start() if nxt else len(s) - secm.end())
        children = section_children(s, secm.start(), sec_end)
        if len(children) < 4:
            print(f"  p.{num}: sezione troppo corta per bilanciare, salto")
            continue
        # individua l'elemento che apre la pagina di continuazione
        cont_fl = first_line(pages[num - 1])[:28]
        frag = "(?:&[a-zA-Z#0-9]+;)?".join(re.escape(c) for c in cont_fl)
        k = None
        for idx, (pos, raw) in enumerate(children):
            seg_end = children[idx + 1][0] if idx + 1 < len(children) else sec_end
            if re.search(frag, s[pos:seg_end], re.IGNORECASE):
                k = idx
                break
        if k is None:
            print(f"  !! elemento di continuazione non trovato per p.{num}: {cont_fl[:30]!r}")
            continue
        t = max(2, k - 1)                     # sposta il salto 1 box prima (minimo: dopo header+2 box)
        if t >= k:
            print(f"  p.{num}: impossibile bilanciare ulteriormente (k={k})")
            continue
        s2 = add_salto(s, children[t])
        if s2 is None:
            print(f"  p.{num}: salto già presente")
            continue
        open(D + f, "w", encoding="utf-8").write(s2)
        changed += 1
        print(f"  p.{num} ← {f}: salto spostato all'elemento {t} (continuazione apriva al {k}) · {cont_fl[:30]}")
    if not changed:
        print("nessuna modifica — esco")
        break
    build()

pages = page_texts()
sparse = [i for i, p in enumerate(pages, 1) if not starts_head(p) and len(p.strip()) < 550]
print(f"FINALE: {len(pages)} pagine · continuazioni spoglie: {sparse or 'nessuna'}")

# ── misura oggettiva del riempimento (PyMuPDF) per le coppie origine→continuazione ──
import pymupdf
USEFUL = 842 - 57          # A4 in pt meno il margine inferiore (20 mm)
doc = pymupdf.open(D + "quaderno-matematica-facile.pdf")
fills = {}
for pno, page in enumerate(doc, 1):
    maxy = 0
    for b in page.get_text("dict")["blocks"]:
        maxy = max(maxy, b["bbox"][3])
    for d in page.get_drawings():
        maxy = max(maxy, d["rect"].y1)
    fills[pno] = round(min(maxy, USEFUL) / USEFUL * 100)
conts = [i for i, p in enumerate(pages, 1) if not starts_head(p)]
print("riempimento pagine di continuazione (%):", {i: fills[i] for i in conts})
low = [i for i in conts if fills[i] < 40]
print("continuazioni sotto il 40%:", low or "nessuna")

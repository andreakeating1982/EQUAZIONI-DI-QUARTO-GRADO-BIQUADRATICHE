#!/usr/bin/env python3
"""Correttore basato sul riempimento reale (PyMuPDF):
- continuazione <45% e origine >75%  → salto spostato 1 box prima (origine cede un box);
- origine <45% (un elemento grande è passato intero oltre) → pagina .ristretta
  (margini geometrici più stretti: l'elemento grande può rientrare)."""
import re, subprocess, pymupdf

D = "/home/user/quaderno-matematica/"
FILES = ["00-copertina.html", "01-indice.html", "02-anno1a.html", "03-anno1b.html",
         "04-anno2.html", "05-anno3.html", "06-anno4.html", "07-anno5.html"]
CONTENT_BOTTOM = 842.0 - 57.0

def build():
    subprocess.run(["python3", D + "build.py"], capture_output=True)

def page_texts():
    out = subprocess.run(["pdftotext", "-layout", D + "quaderno-matematica-facile.pdf", "-"],
                         capture_output=True, text=True).stdout
    return out.split(chr(12))[:-1]

def norm(s): return re.sub(r"\s+", " ", s.strip().upper())
def first_line(p):
    for l in p.strip().split("\n"):
        if l.strip(): return norm(l)
    return ""

HEADS = set()
for f in FILES:
    s = open(D + f, encoding="utf-8").read()
    for m in re.finditer(r"<h2[^>]*>(.*?)</h2>", s, re.S):
        t = norm(re.sub(r"<[^>]+>", "", m.group(1)))
        if t: HEADS.add(t[:22])
    for m in re.finditer(r'class="anno-titolo[^"]*">(.*?)</span>', s, re.S):
        HEADS.add(norm(re.sub(r"<[^>]+>", "", m.group(1)))[:6])
HEADS |= {"MATEMATICA", "INDICE"}

def is_head(p, idx=None, first_div=None):
    fl = first_line(p)
    if any(fl.startswith(h) for h in HEADS):
        return True
    # le voci dell'indice finiscono con il numero di pagina: valide solo nel front-matter
    if idx is not None and first_div is not None and idx < first_div and re.search(r"\d+$", fl):
        return True
    return False

def get_first_div(pages):
    return next((i for i, p in enumerate(pages, 1) if first_line(p).startswith("ANNO 1")), len(pages) + 1)

def fills():
    doc = pymupdf.open(D + "quaderno-matematica-facile.pdf")
    out = {}
    for pno, page in enumerate(doc, 1):
        maxy = 0
        for b in page.get_text("dict")["blocks"]:
            if b["bbox"][1] < CONTENT_BOTTOM:
                maxy = max(maxy, b["bbox"][3])
        for d in page.get_drawings():
            r = d["rect"]
            if r.width * r.height > 0.8 * 595 * 842: continue
            if r.width > 460 and r.height > 650: continue
            maxy = max(maxy, r.y1)
        out[pno] = round(min(maxy, CONTENT_BOTTOM) / CONTENT_BOTTOM * 100)
    return out

def find_section(head_text):
    frag = head_text.strip()[:24]
    pat = "(?:&[a-zA-Z#0-9]+;)?".join(re.escape(c) for c in frag)
    for rx in (re.compile(r"<h2[^>]*>\s*" + pat, re.IGNORECASE),
               re.compile(r'class="anno-titolo[^"]*">\s*' + re.escape(frag[:6]), re.IGNORECASE)):
        for f in FILES:
            s = open(D + f, encoding="utf-8").read()
            m = rx.search(s)
            if not m: continue
            openers = list(re.finditer(r'<(?:div|section) class="page([^"]*)"', s[:m.start()]))
            if openers: return f, openers[-1], s
    return None

TOPLEVEL = re.compile(r'(?m)^  <(div|table|figure|header|ul|ol)\b[^>]*')

def add_class(f, opener, cls, s):
    tag_start, raw = opener
    mcls = re.search(r'class="([^"]*)"', raw)
    if mcls:
        if cls in mcls.group(1): return None
        ins = tag_start + mcls.start(1) + len(mcls.group(1))
    else:
        mt = re.search(r'<[a-z]+', raw)
        ins = tag_start + mt.end()
        return s[:ins] + f' class="{cls}"' + s[ins:]
    return s[:ins] + " " + cls + s[ins:]

for it in range(1, 4):
    pages = page_texts()
    fl = fills()
    fd = get_first_div(pages)
    acts = []
    for i in range(2, len(pages) + 1):
        if is_head(pages[i - 1], i, fd):
            continue
        # i è continuazione → origine = ultima testa prima di i
        j = i - 1
        while j > 1 and not is_head(pages[j - 1], j, fd):
            j -= 1
        fo, fc = fl[j], fl[i]
        if fc < 45 and fo > 60:
            acts.append(("salto", i, j, fo, fc))
        elif fo < 45:
            acts.append(("ristretta", i, j, fo, fc))
    if not acts:
        print(f"passata {it}: bilanciamento OK")
        break
    print(f"passata {it}: {len(acts)} interventi")
    touched = set()
    changed = 0
    for kind, i, j, fo, fc in acts:
        if j in touched: continue
        touched.add(j)
        r = find_section(first_line(pages[j - 1]))
        if not r:
            print(f"  !! sezione non trovata p.{j}")
            continue
        f, secm, s = r
        if kind == "ristretta":
            s2 = add_class(f, (secm.start(), secm.group(0)), "ristretta", s)
            if s2:
                open(D + f, "w", encoding="utf-8").write(s2)
                changed += 1
                print(f"  p.{j} (origine {fo}%) ← {f}: ristretta")
            continue
        # salto: trova l'elemento che apre la continuazione e sposta 1 box prima
        nxt = re.search(r'<(?:div|section) class="page', s[secm.end():])
        sec_end = secm.end() + (nxt.start() if nxt else len(s) - secm.end())
        children = [(m.start() + secm.start(), m.group(0)) for m in TOPLEVEL.finditer(s[secm.start():sec_end])]
        if len(children) < 4: continue
        cont_fl = first_line(pages[i - 1])[:28]
        frag = "(?:&[a-zA-Z#0-9]+;)?".join(re.escape(c) for c in cont_fl)
        k = None
        for idx, (pos, raw) in enumerate(children):
            seg_end = children[idx + 1][0] if idx + 1 < len(children) else sec_end
            if re.search(frag, s[pos:seg_end], re.IGNORECASE):
                k = idx; break
        if k is None: continue
        t = max(2, k - 1)
        if t >= k: continue
        # ANTI-CATENA: rimuovi i salti aggiunti in passate precedenti su elementi DOPO t
        # (salti in catena creano pagine di continuazione multiple quasi vuote)
        for pos2, raw2 in reversed(children[t + 1:]):   # da destra: gli offset restano validi
            mcls2 = re.search(r'class="([^"]*)\bsalto\b([^"]*)"', raw2)
            if mcls2:
                g = mcls2.group(1) + mcls2.group(2)
                g = re.sub(r'\s+', ' ', g).strip()
                a2 = pos2 + mcls2.start(1)
                b2 = pos2 + mcls2.end(2)
                s = s[:a2] + g + s[b2:]
                print(f"  anti-catena: rimosso salto ridondante a offset {pos2}")
        s2 = add_class(f, children[t], "salto", s)
        if s2:
            open(D + f, "w", encoding="utf-8").write(s2)
            changed += 1
            print(f"  p.{i} (cont {fc}%, origine {fo}%) ← {f}: salto all'elemento {t} (continuazione apriva al {k})")
    if not changed:
        print("nessuna modifica possibile — esco")
        break
    build()

pages = page_texts()
fl = fills()
fd = get_first_div(pages)
conts = {i: fl[i] for i in sorted(fl) if i > 1 and not is_head(pages[i - 1], i, fd)}
print("riempimento continuazioni:", conts)
print("sotto il 42%:", [i for i, v in conts.items() if v < 42] or "nessuna")

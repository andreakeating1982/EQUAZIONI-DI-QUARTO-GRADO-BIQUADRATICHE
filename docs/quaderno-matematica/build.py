#!/usr/bin/env python3
"""Assembla le sezioni HTML e genera il quaderno PDF/UA-1 con WeasyPrint."""
import os, sys

BASE = os.path.dirname(os.path.abspath(__file__))
SEZIONI = [
    "00-copertina.html",
    "01-indice.html",
    "02-anno1a.html",
    "03-anno1b.html",
    "04-anno2.html",
    "05-anno3.html",
    "06-anno4.html",
    "07-anno5.html",
]

def build_html() -> str:
    parti = []
    for f in SEZIONI:
        with open(os.path.join(BASE, f), encoding="utf-8") as fh:
            parti.append(fh.read())
    css = open(os.path.join(BASE, "styles.css"), encoding="utf-8").read()
    return (
        "<!DOCTYPE html><html lang='it'><head><meta charset='utf-8'>"
        "<title>Matematica Facile — Il quaderno di matematica e geometria (liceo linguistico, obiettivi minimi)</title>"
        f"<style>{css}</style></head><body>{''.join(parti)}</body></html>"
    )

def main() -> None:
    from weasyprint import HTML
    html = build_html()
    out = os.path.join(BASE, "quaderno-matematica-facile.pdf")
    HTML(string=html, base_url=BASE).write_pdf(
        out,
        pdf_variant="pdf/ua-1",
        uncompress_pdf=False,
    )
    print("generato:", out, os.path.getsize(out) // 1024, "KB")

if __name__ == "__main__":
    main()

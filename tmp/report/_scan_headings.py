# -*- coding: utf-8 -*-
import io, re

OUT = io.open(r"C:\Downloads\Download\Code\Git\CNPM\tmp\report\_outline.txt", "w", encoding="utf-8")
PAT = re.compile(r'.\ beneficiation')  # placeholder, replaced below
VAR = '("h'
PAT = re.compile(r'\("h[1-3]",\s*"[^"]*"')

FILES = ["content_part1.py", "content_part2.py", "content_part3.py", "content_part4.py"]
BASE = r"C:\Downloads\Download\Code\Git\CNPM\tmp\report\\"
for p in FILES:
    src = io.open(BASE + p, encoding="utf-8", errors="replace").read()
    OUT.write("=" * 20 + " " + p + "\n")
    for i, l in enumerate(src.splitlines(), 1):
        if l.strip().startswith('("h1') or l.strip().startswith('("h2') or l.strip().startswith('("h3') or l.strip().startswith('("lead'):
            OUT.write(f"{i} | {l.strip()[:130]}\n")
OUT.close()
print("ok")

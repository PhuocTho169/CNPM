# -*- coding: utf-8 -*-
import io, re, sys
s = io.open(r"tmp/report/content_part2.py", encoding="utf-8").read()
pats = ["thay vi", "dung nguoi", "experi", "Dane", "nav luot mo", "thu phuc", "time luot xem", "co y tuong"]
for p in pats:
    i = s.find(p)
    while i != -1:
        st = max(0, i - 60)
        seg = s[st:i + 110].replace("\n", " | ")
        sys.stdout.write("--- " + p + " :: " + seg.encode("ascii", "replace").decode("ascii") + "\n")
        i = s.find(p, i + 1)
